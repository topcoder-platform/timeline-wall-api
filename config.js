require('dotenv').config()

module.exports = {
    IS_DEV: true,
    SERVER_PORT: process.env.SERVER_PORT || 3001,
    API_PREFIX: '/v5/timeline-wall',

    AUTH_SECRET: process.env.AUTH_SECRET || 'mysecret',
    VALID_ISSUERS: process.env.VALID_ISSUERS || '["https://api.topcoder-dev.com", "https://api.topcoder.com", "https://topcoder-dev.auth0.com/", "https://auth.topcoder-dev.com/"]',

    ADMIN_USERS: (process.env.ADMIN_USERS || 'TCConnCopilot').split(' ') || [],

    PHOTO_URL_TEMPLATE: process.env.PHOTO_URL_TEMPLATE || 'https://tc-timelline-wall-bucket.s3.amazonaws.com/<key>' || 'http://localhost:9000/fileuploads/<key>',

    AMAZON: {
        IS_LOCAL: process.env.IS_LOCAL_DB,
        ENDPOINT: process.env.AWS_ENDPOINT, // only for local deployment
        S3_API_VERSION: process.env.S3_API_VERSION || '2006-03-01',
        AWS_REGION: process.env.AWS_REGION || 'us-east-1',
        BUCKET_NAME: process.env.BUCKET_NAME || 'tc-timelline-wall-bucket',
    },

    DATABASE: {
        USER: process.env.DB_USER || 'postgres',
        PASSWORD: process.env.DB_PASSWORD || 'postgres',
        HOST: process.env.DB_HOST || 'localhost',
        NAME: process.env.DB_NAME || 'topcoder-timeline',
        PORT: parseInt(process.env.DB_PORT) || 5432,
    },

    EMAIL: {
        EMAIL_FROM: process.env.EMAIL_FROM || 'no-reply@topcoder.com',
        MEMBER_API_BASE_URL: process.env.MEMBER_API_BASE_URL || 'https://api.topcoder-dev.com/v5',
        SENDGRID_TEMPLATES: {
            EVENT_CREATED: process.env.EVENT_CREATED_TEMPLATE_ID || 'd-7d28f33a3eb24c239e8b23e10c15f995',
            EVENT_APPROVED: process.env.EVENT_APPROVED_TEMPLATE_ID || 'd-849951f61262499fbc74f8498c2535a8',
            EVENT_REJECTED: process.env.EVENT_REJECTED_TEMPLATE_ID || 'd-4228b04a65594a66b15a436537e777f9'
        }
    },

    AUTH0_URL: process.env.AUTH0_URL || 'https://topcoder-dev.auth0.com/oauth/token',
    AUTH0_AUDIENCE: process.env.AUTH0_AUDIENCE || 'https://www.topcoder-dev.com',
    TOKEN_CACHE_TIME: process.env.TOKEN_CACHE_TIME || 500000,
    AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID,
    AUTH0_CLIENT_SECRET: process.env.AUTH0_CLIENT_SECRET,

    // bus API config params
    BUSAPI_URL: process.env.BUSAPI_URL || 'https://api.topcoder-dev.com/v5',
    KAFKA_ERROR_TOPIC: process.env.KAFKA_ERROR_TOPIC || 'common.error.reporting',

    RESIZED_IMAGE_MAX_WIDTH: parseInt(process.env.RESIZED_IMAGE_MAX_WIDTH) || 1920,
    RESIZED_IMAGE_MAX_HEIGHT: parseInt(process.env.RESIZED_IMAGE_MAX_HEIGHT) || 1080,
    PREVIEW_MAX_WIDTH: parseInt(process.env.PREVIEW_WIDTH) || 600,
    PREVIEW_MAX_HEIGHT: parseInt(process.env.PREVIEW_HEIGHT) || 200,
    MEDIA_SIZE_LIMIT: parseInt(process.env.MEDIA_SIZE_LIMIT) || 150 * 1024 * 1024, // 100 MB by default
    HEALTH_CHECK_TIMEOUT: parseInt(process.env.HEALTH_CHECK_TIMEOUT) || 3000,
}
