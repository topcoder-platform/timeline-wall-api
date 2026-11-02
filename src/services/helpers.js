const config = require("../../config");
const { S3Client } = require('@aws-sdk/client-s3')
const { Upload } = require('@aws-sdk/lib-storage')
const _ = require('lodash')
const axios = require('axios')
const sharp = require('sharp')
const busApi = require('tc-core-library-js').createBusApiClient
const m2mAuth = require('tc-core-library-js').createM2MClient
const m2m = m2mAuth(_.pick(config, ['AUTH0_URL', 'AUTH0_AUDIENCE', 'TOKEN_CACHE_TIME', 'AUTH0_PROXY_SERVER_URL']))


const constants = require('../../constants')

const awsConfig = {
    region: config.AMAZON.AWS_REGION
}

if (config.AMAZON.IS_LOCAL) {
    awsConfig.endpoint = config.AMAZON.ENDPOINT
    awsConfig.forcePathStyle = true
}

if (config.AMAZON.AWS_ACCESS_KEY_ID && config.AMAZON.AWS_SECRET_ACCESS_KEY) {
    awsConfig.credentials = {
        accessKeyId: config.AMAZON.AWS_ACCESS_KEY_ID,
        secretAccessKey: config.AMAZON.AWS_SECRET_ACCESS_KEY,
        sessionToken: config.AMAZON.AWS_SESSION_TOKEN
    }
}
const s3 = new S3Client(awsConfig)
let busApiClient

/**
 * Get Bus API Client, instantiate it if it doesn't exist
 * @return {Object} Bus API Client Instance
 */
function getBusApiClient() {
    try {
        // if there is no bus API client instance, then create a new instance
        if (!busApiClient) {
            busApiClient = busApi(_.pick(config,
                ['AUTH0_URL', 'AUTH0_AUDIENCE', 'TOKEN_CACHE_TIME',
                    'AUTH0_CLIENT_ID', 'AUTH0_CLIENT_SECRET', 'BUSAPI_URL',
                    'KAFKA_ERROR_TOPIC', 'AUTH0_PROXY_SERVER_URL']))
        }
        return busApiClient
    } catch (e) {
        e.message = `ERROR: Failed to construct BUS Api Client. Error message: ${e.message}`
        throw e
    }
}

/**
 * Get M2M token.
 * @returns {Promise<String>} the M2M token
 */
async function getM2MToken() {
    try {
        const res = await m2m.getMachineToken(config.AUTH0_CLIENT_ID, config.AUTH0_CLIENT_SECRET)
        return res
    } catch (e) {
        e.message = `ERROR: Failed to retrieve M2M token. Error message: ${e.message}`
        throw e
    }
}


async function uploadToBucket(data, fileName, mimetype) {
    const params = {
        Bucket: config.AMAZON.BUCKET_NAME,
        Key: fileName,
        Body: data,
        ContentType: mimetype,
        // ACL: 'public-read',
        Metadata: {
            fileName
        }
    }

    try {
        console.log(`INFO: Uploading ${fileName} to S3 Bucket`)
        // Upload to S3
        await new Upload({ client: s3, params }).done()
    } catch (e) {
        e.message = `ERROR: Failed to upload file '${fileName}' to S3 Bucket. Error message: ${e.message}`
        throw e
    }

    return config.PHOTO_URL_TEMPLATE.replace('<key>', fileName)
}

async function createPreviewImage(fileData, numOfFiles, fileName) {
    const width = config.PREVIEW_MAX_WIDTH / numOfFiles
    console.log(`INFO: Creating preview for '${fileName}'. Width: ${width}, Height: ${config.PREVIEW_MAX_HEIGHT}`)

    try {
        // create Preview image
        return await sharp(fileData).resize(width, config.PREVIEW_MAX_HEIGHT, { fit: 'outside' }).toBuffer()
    } catch (e) {
        e.message = `ERROR: Failed to create preview image for '${fileName}'. Error message: ${e.message}`
        console.log(`ERRR: ${e.message}`)
        throw e
    }
}

async function shouldResizeImage(fileData) {
    const maxWidth = config.RESIZED_IMAGE_MAX_WIDTH
    const maxHeight = config.RESIZED_IMAGE_MAX_HEIGHT

    const metadata = await sharp(fileData).metadata()
    const needResize = metadata.width > maxWidth || metadata.height > maxHeight;
    // console.log(`INFO: Max size - ${maxWidth}x${maxHeight}, image size - ${metadata.width}x${metadata.height}. Need resize - ${needResize}`)

    return needResize;
}

async function createResizedImage(fileData, fileName) {
    const width = config.RESIZED_IMAGE_MAX_WIDTH
    const height = config.RESIZED_IMAGE_MAX_HEIGHT
    console.log(`INFO: Creating resized image for '${fileName}'. Width: ${width}, Height: ${height}`)

    try {
        // create Preview image
        return await sharp(fileData).resize(width, height, { fit: 'inside' }).toBuffer()
    } catch (e) {
        e.message = `ERROR: Failed to create resized image for '${fileName}'. Error message: ${e.message}`
        throw e
    }
}

async function uploadMedia(file, numOfFiles) {
    const fileExt = file.name.substr(file.name.lastIndexOf('.'))
    const fileName = file.name + '-' + new Date().getTime()
    let isVideo = false

    // upload original file
    let url = await uploadToBucket(file.data, fileName + fileExt, file.mimetype)

    let previewUrl = url
    if (file.mimetype.includes('image')) {
        const shouldResize = await shouldResizeImage(file.data)
        if (shouldResize) {
            // create & upload resized image
            const resizedData = await createResizedImage(file.data, file.name)
            url = await uploadToBucket(resizedData, fileName + '-resized.jpg', 'image/jpeg')
        }

        // create & upload preview image
        const previewData = await createPreviewImage(file.data, numOfFiles, file.name)
        previewUrl = await uploadToBucket(previewData, fileName + '-preview.jpg', 'image/jpeg')
    } else if (file.mimetype.includes('video')) {
        isVideo = true
    }
    else {
        throw new Error(`Unsupported mime type '${file.mimetype}'. File name: '${file.name}'.`)
    }

    return {
        url: url,
        previewUrl: previewUrl,
        isVideo
    }
}

/**
 * Post event to bus API.
 * @param {String} topic the event topic
 * @param {Object} payload the event payload
 * @param {Object} options the extra options to the message
 */
async function postBusEvent(topic, payload, options = {}) {
    const client = getBusApiClient()
    const message = {
        topic,
        originator: constants.EVENT_ORIGINATOR,
        timestamp: new Date().toISOString(),
        'mime-type': constants.EVENT_MIME_TYPE,
        payload
    }
    if (options.key) {
        message.key = options.key
    }

    try {
        console.log(`INFO: Posting Event using Bus API client. Event message/payload: ${JSON.stringify(message)}`)
        await client.postEvent(message)
    } catch (e) {
        console.log(`ERROR: Failed to post Event using Bus API client. Event message/payload: ${JSON.stringify(message)}`)
        throw e
    }
}

/**
 * Send email using bus API
 * @param {String} type the notification type
 * @param {Array} recipients the array of recipients in { userId || email || handle } format
 * @param {Object} data the data
 */
async function sendEmail(type, recipients, data) {
    try {
        const res = await postBusEvent(constants.NOTIFICATIONS_TOPIC, {
            notifications: [
                {
                    serviceId: 'email',
                    type,
                    details: {
                        from: config.EMAIL.EMAIL_FROM,
                        recipients: [...recipients],
                        cc: [...constants.NotificationSettings[type].cc],
                        data: data,
                        sendgridTemplateId: constants.NotificationSettings[type].sendgridTemplateId,
                        version: 'v3'
                    }
                }
            ]
        })
        return res
    } catch (e) {
        e.message = `ERROR: Failed to post '${type}' event to BUS API. Error message: ${e.message}`
        throw e
    }
}

async function getEmail(handle) {
    const token = await getM2MToken()

    try {
        const response = await axios.get(config.EMAIL.MEMBER_API_BASE_URL + `/members/${handle}?fields=email`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        })
        console.log(`Received email from Member API for '${handle}' member: ${response.data.email}`)
        return response.data.email
    } catch (e) {
        e.message = `ERROR: Failed to retrieve '${handle}' member details from Member API. Error message: ${e.message}`
        throw e
    }
}

module.exports = {
    uploadMedia,
    sendEmail,
    getEmail,
}
