/** Environment-only runtime configuration used by routes, auth and integrations.
 * Load local .env values when present; shared core rejects incomplete Keycloak
 * settings at startup. Secrets have no hardcoded defaults.
 */
require('dotenv').config()
const env = process.env
module.exports = {
  SERVER_PORT: Number(env.SERVER_PORT || 3001),
  API_PREFIX: env.API_PREFIX || '',
  AUTH_SECRET: env.AUTH_SECRET,
  VALID_ISSUERS: env.VALID_ISSUERS || '[]',
  ADMIN_USERS: (env.ADMIN_USERS || '').split(/\s+/).filter(Boolean),
  M2M_PROVIDER: env.M2M_PROVIDER,
  KEYCLOAK_ISSUER: env.KEYCLOAK_ISSUER,
  KEYCLOAK_AUDIENCE: env.KEYCLOAK_AUDIENCE,
  KEYCLOAK_TOKEN_URL: env.KEYCLOAK_TOKEN_URL,
  KEYCLOAK_CLIENT_ID: env.KEYCLOAK_CLIENT_ID,
  KEYCLOAK_CLIENT_SECRET: env.KEYCLOAK_CLIENT_SECRET,
  KEYCLOAK_SCOPE: env.KEYCLOAK_SCOPE,

  BUSAPI_URL: env.BUSAPI_URL || 'https://api.topcoder-dev.com/v5',
  KAFKA_ERROR_TOPIC: env.KAFKA_ERROR_TOPIC || 'common.error.reporting',
  PHOTO_URL_TEMPLATE: env.PHOTO_URL_TEMPLATE,
  PREVIEW_MAX_WIDTH: Number(env.PREVIEW_MAX_WIDTH || 600),
  PREVIEW_MAX_HEIGHT: Number(env.PREVIEW_MAX_HEIGHT || 400),
  RESIZED_IMAGE_MAX_WIDTH: Number(env.RESIZED_IMAGE_MAX_WIDTH || 1920),
  RESIZED_IMAGE_MAX_HEIGHT: Number(env.RESIZED_IMAGE_MAX_HEIGHT || 1080),
  MEDIA_SIZE_LIMIT: env.MEDIA_SIZE_LIMIT ? Number(env.MEDIA_SIZE_LIMIT) : Infinity,
  HEALTH_CHECK_TIMEOUT: Number(env.HEALTH_CHECK_TIMEOUT || 3000),
  AMAZON: {
    S3_API_VERSION: env.S3_API_VERSION || '2006-03-01',
    AWS_REGION: env.AWS_REGION || 'us-east-1',
    AWS_ACCESS_KEY_ID: env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: env.AWS_SECRET_ACCESS_KEY,
    BUCKET_NAME: env.BUCKET_NAME,
    IS_LOCAL: env.IS_LOCAL === 'true',
    ENDPOINT: env.S3_ENDPOINT
  },
  DATABASE: {
    USER: env.DB_USER, PASSWORD: env.DB_PASSWORD, HOST: env.DB_HOST || 'localhost',
    NAME: env.DB_NAME || 'topcoder-timeline', PORT: Number(env.DB_PORT || 5432),
    SCHEMA: env.DB_SCHEMA || 'public'
  },
  EMAIL: {
    EMAIL_FROM: env.EMAIL_FROM,
    MEMBER_API_BASE_URL: env.MEMBER_API_BASE_URL || 'https://api.topcoder-dev.com/v5',
    SENDGRID_TEMPLATES: { EVENT_APPROVED: env.EVENT_APPROVED_TEMPLATE_ID, EVENT_REJECTED: env.EVENT_REJECTED_TEMPLATE_ID }
  }
}
