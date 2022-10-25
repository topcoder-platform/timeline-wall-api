const config = require("../../config");
const AWS = require("aws-sdk");
const _ = require('lodash')
const axios = require('axios')
const ffmpegPath = require('ffmpeg-static')
const fs = require('fs')
const genThumbnail = require('simple-thumbnail')
const sharp = require('sharp')
const busApi = require('topcoder-bus-api-wrapper')
const m2mAuth = require('tc-core-library-js').auth.m2m
const m2m = m2mAuth(_.pick(config, ['AUTH0_URL', 'AUTH0_AUDIENCE', 'TOKEN_CACHE_TIME']))


const constants = require('../../constants')

const awsConfig = {
    s3: config.AMAZON.S3_API_VERSION,
    region: config.AMAZON.AWS_REGION
}

if(config.AMAZON.IS_LOCAL){
    awsConfig.endpoint = config.AMAZON.ENDPOINT
    awsConfig.s3ForcePathStyle = true
}

if (config.AMAZON.AWS_ACCESS_KEY_ID && config.AMAZON.AWS_SECRET_ACCESS_KEY) {
    awsConfig.accessKeyId = config.AMAZON.AWS_ACCESS_KEY_ID
    awsConfig.secretAccessKey = config.AMAZON.AWS_SECRET_ACCESS_KEY
}
AWS.config.update(awsConfig)

const s3 = new AWS.S3()
let busApiClient

/**
 * Get Bus API Client, instantiate it if it doesn't exist
 * @return {Object} Bus API Client Instance
 */
function getBusApiClient () {
    // if there is no bus API client instance, then create a new instance
    if (!busApiClient) {
        busApiClient = busApi(_.pick(config,
            ['AUTH0_URL', 'AUTH0_AUDIENCE', 'TOKEN_CACHE_TIME',
                'AUTH0_CLIENT_ID', 'AUTH0_CLIENT_SECRET', 'BUSAPI_URL',
                'KAFKA_ERROR_TOPIC', 'AUTH0_PROXY_SERVER_URL']))
    }
    return busApiClient
}

/**
 * Get M2M token.
 * @returns {Promise<String>} the M2M token
 */
async function getM2MToken () {
    const res = await m2m.getMachineToken(config.AUTH0_CLIENT_ID, config.AUTH0_CLIENT_SECRET)
    return res
}


async function uploadToBucket(data, fileName, mimetype) {
    const params = {
        Bucket: config.AMAZON.BUCKET_NAME,
        Key: fileName,
        Body: data,
        ContentType: mimetype,
        ACL: 'public-read',
        Metadata: {
            fileName
        }
    }
    // Upload to S3
    await s3.upload(params).promise()

    return config.PHOTO_URL_TEMPLATE.replace('<key>', fileName)
}

async function createPreviewImage(data, numOfFiles = 1) {
    const width = config.PREVIEW_MAX_WIDTH / numOfFiles
    return await sharp(data).resize(width, config.PREVIEW_MAX_HEIGHT, {fit: 'inside'}).toBuffer()
}

async function createThumbnail(data, numOfFiles) {
    await genThumbnail(data, '.\\tempThumb.jpg', '100%', {
        path: ffmpegPath
    })
    const res = fs.readFileSync('.\\tempThumb.jpg')
    return await createPreviewImage(res, numOfFiles)
}

async function uploadMedia(file, handle, numOfFiles) {
    const fileExt = file.name.substr(file.name.lastIndexOf('.'))
    const fileName = handle + '-' + new Date().getTime()

    const url = await uploadToBucket(file.data, fileName+fileExt, file.mimetype)

    let previewUrl = url
    if(file.mimetype.includes('image')){
        const previewData = await createPreviewImage(file.data, numOfFiles)
        previewUrl = await uploadToBucket(previewData, fileName+'-preview.jpg', 'image/jpeg')
    }else if(file.mimetype.includes('video')){
        const previewData = await createThumbnail(url, numOfFiles)
        previewUrl = await uploadToBucket(previewData, fileName+'-preview.jpg', 'image/jpeg')
    }

    return {
        url: url,
        previewUrl: previewUrl
    }
}

/**
 * Post event to bus API.
 * @param {String} topic the event topic
 * @param {Object} payload the event payload
 * @param {Object} options the extra options to the message
 */
async function postBusEvent (topic, payload, options = {}) {
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
    await client.postEvent(message)
}

/**
 * Send email using bus API
 * @param {String} type the notification type
 * @param {Array} recipients the array of recipients in { userId || email || handle } format
 * @param {Object} data the data
 */
async function sendEmail (type, recipients, data) {
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
        console.log(`Failed to post notification ${type}: ${e.message}`)
    }
}

async function getEmail(handle){
    const token = await getM2MToken()

    const response = await axios.get(config.EMAIL.MEMBER_API_BASE_URL+`/members/${handle}`,{
        headers: {
            Authorization: `Bearer ${token}`
        }
    })
    return response.data.email
}

module.exports = {
    uploadMedia,
    sendEmail,
    getEmail,
}
