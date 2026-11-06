/** Environment-only runtime configuration used by routes, auth and integrations.
 * Load local .env values when present. Authentication settings and credentials
 * must be supplied by the deployment environment.
 */
require('dotenv').config()
const env = process.env
module.exports = {
  SERVER_PORT: Number(env.SERVER_PORT || 3001),
  API_PREFIX: env.API_PREFIX ?? '/v5/timeline-wall',
  AUTH_SECRET: env.AUTH_SECRET,
  VALID_ISSUERS: env.VALID_ISSUERS?.trim().startsWith('[') ? JSON.parse(env.VALID_ISSUERS) : (env.VALID_ISSUERS || '').split(/[\s,]+/).filter(Boolean),
  ADMIN_USERS: (env.ADMIN_USERS || '').split(/\s+/).filter(Boolean),
  JWT_AUDIENCE: env.JWT_AUDIENCE,
  AUTH0_URL: env.AUTH0_URL,
  AUTH0_AUDIENCE: env.AUTH0_AUDIENCE,
  AUTH0_CLIENT_ID: env.AUTH0_CLIENT_ID,
  AUTH0_CLIENT_SECRET: env.AUTH0_CLIENT_SECRET,
  AUTH0_PROXY_SERVER_URL: env.AUTH0_PROXY_SERVER_URL,
  TOKEN_CACHE_TIME: Number(env.TOKEN_CACHE_TIME || 120),

  BUSAPI_URL: env.BUSAPI_URL || 'https://api.topcoder-dev.com/v5',
  KAFKA_ERROR_TOPIC: env.KAFKA_ERROR_TOPIC || 'common.error.reporting',
  PHOTO_URL_TEMPLATE: env.PHOTO_URL_TEMPLATE,
  PREVIEW_MAX_WIDTH: Number(env.PREVIEW_MAX_WIDTH || env.PREVIEW_WIDTH || 600),
  PREVIEW_MAX_HEIGHT: Number(env.PREVIEW_MAX_HEIGHT || env.PREVIEW_HEIGHT || 400),
  RESIZED_IMAGE_MAX_WIDTH: Number(env.RESIZED_IMAGE_MAX_WIDTH || 1920),
  RESIZED_IMAGE_MAX_HEIGHT: Number(env.RESIZED_IMAGE_MAX_HEIGHT || 1080),
  MEDIA_SIZE_LIMIT: env.MEDIA_SIZE_LIMIT ? Number(env.MEDIA_SIZE_LIMIT) : Infinity,
  HEALTH_CHECK_TIMEOUT: Number(env.HEALTH_CHECK_TIMEOUT || 3000),
  AMAZON: {
    AWS_REGION: env.AWS_REGION || 'us-east-1',
    AWS_ACCESS_KEY_ID: env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: env.AWS_SECRET_ACCESS_KEY,
    AWS_SESSION_TOKEN: env.AWS_SESSION_TOKEN,
    BUCKET_NAME: env.BUCKET_NAME,
    IS_LOCAL: env.IS_LOCAL === 'true' || env.IS_LOCAL_DB === 'true',
    ENDPOINT: env.S3_ENDPOINT || env.AWS_ENDPOINT
  },
  DATABASE: {
    USER: env.DB_USER, PASSWORD: env.DB_PASSWORD, HOST: env.DB_HOST || 'localhost',
    NAME: env.DB_NAME || 'topcoder-timeline', PORT: Number(env.DB_PORT || 5432),
    SCHEMA: env.DB_SCHEMA || env.DB_SCHEMA_NAME || 'public'
  },
  EMAIL: {
    EMAIL_FROM: env.EMAIL_FROM,
    MEMBER_API_BASE_URL: env.MEMBER_API_BASE_URL || 'https://api.topcoder-dev.com/v5',
    SENDGRID_TEMPLATES: { EVENT_APPROVED: env.EVENT_APPROVED_TEMPLATE_ID, EVENT_REJECTED: env.EVENT_REJECTED_TEMPLATE_ID }
  }
}
