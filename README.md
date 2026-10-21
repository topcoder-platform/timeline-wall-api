# Topcoder Timeline Wall Backend

This project contains the backend for Topcoder Timeline Wall.

## Environment Variables
To set the environment variables, create a .env file with the following variables (to be filled):
```bash
# The port used by the server
SERVER_PORT=

# Configuration for token verification
AUTH_SECRET=
VALID_ISSUERS=

# List of admins (handles, space-separated)
ADMIN_USERS=

# Template of AWS bucket url
PHOTO_URL_TEMPLATE=

# AWS S3 bucket info
S3_API_VERSION=
AWS_REGION=
AWS_SECRET_ACCESS_KEY=
AWS_ACCESS_KEY_ID=
BUCKET_NAME=

# PostgreSQL info
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_NAME=topcoder-timeline
DB_PORT=

# Bus API (used to send emails)
BUSAPI_URL=
EVENT_APPROVED_TEMPLATE_ID=
EVENT_REJECTED_TEMPLATE_ID=
MEMBER_API_BASE_URL=
EMAIL_FROM=

# Keycloak outbound service credentials
M2M_PROVIDER=
KEYCLOAK_ISSUER=
KEYCLOAK_AUDIENCE=
KEYCLOAK_TOKEN_URL=
KEYCLOAK_CLIENT_ID=
KEYCLOAK_CLIENT_SECRET=
KEYCLOAK_SCOPE=

# Kafka error topic for bus API
KAFKA_ERROR_TOPIC=

# max dimensions of preview photos
PREVIEW_MAX_WIDTH=
PREVIEW_MAX_HEIGHT=

# Maximum size for a single media file (infinity if undefined)
MEDIA_SIZE_LIMIT=
```
- SERVER_PORT the port used by the server
- AUTH_SECRET the authentication secret for token verification
- VALID_ISSUERS the JSON array of trusted member issuers for the auth token
- ADMIN_USERS the (space separated) list of handles of admin users
- PHOTO_URL_TEMPLATE the url template for media uploaded to AWS. the file name will replace <key>
- S3_API_VERSION api version for S3 bucket
- AWS_REGION aws region of s3 bucket
- AWS_SECRET_ACCESS_KEY the secret access key for s3 bucket
- AWS_ACCESS_KEY_ID the access key for s3 bucket
- BUCKET_NAME the bucket name
- DB_USER the database user name (do not set if using docker database)
- DB_PASSWORD the database password (do not set if using docker database)
- DB_HOST the database host (do not set if using docker database)
- DB_NAME the database name (do not set if using docker database)
- DB_PORT the database port (default is 5432, do not set if using docker database)
- BUSAPI_URL the url of the BUS API
- EVENT_APPROVED_TEMPLATE_ID the sendgrid template id for approved event email
- EVENT_REJECTED_TEMPLATE_ID the sendgrid template id for rejected event email
- MEMBER_API_BASE_URL the base url for the member api
- EMAIL_FROM the email use as sender
- KAFKA_ERROR_TOPIC used by the bus api
- PREVIEW_MAX_WIDTH the max width of preview images
- PREVIEW_MAX_HEIGHT the max height of preview images
- MEDIA_SIZE_LIMIT the maximum size of media files that can be uploaded

## Execute
You can start the server by running `npm start`, or in developer mode by running `npm run dev`.

## Run in Docker
When using docker, you can run the Dockerfile located in the root folder to run only the server. Alternatively, you can use the 
docker-compose file (`docker-compose up`) to run both the server and the postgres database in Docker. In this case the postgres database will also execute the SQL scripts
located at /docs.

## Run aws bucket locally
To run the aws bucket locally in docker (using minio), you can run the docker-compose file located in /local.
In this case, you need to add the following lines to the .env file:

```bash
IS_LOCAL_DB=true
AWS_ENDPOINT=http://localhost:9000
```

Note that if you want to connect to the local AWS bucket from within a docker container, you should change AWS_ENDPOINT to 'http://host.docker.internal:9000'

After starting the minio server, you must open the console on localhost:9091. The username and password are:
- username: FAKE_ACCESS_KEY
- password: FAKE_ACCESS_SECRET_KEY

Then, create a new bucket with the name that was specified in the .env file of the server and set its visibility to public.

## Sending Emails with Bus API
The templates for the emails are located at /email_templates.

Once the templates are loaded into sendgrid, you must set the templates ID in .env:
```bash
EVENT_APPROVED_TEMPLATE_ID=
EVENT_REJECTED_TEMPLATE_ID=
```

You can also set up the notification types strings from /constants.js.

## Setup Admin users
The admin users can be defined as a string of space-separated handles, in the .env file:
```bash
ADMIN_USERS=
```

## Postman Testing
You can import the Postman environment and collection from /docs.
Remember to set the bearer_token to the token used for authentication. 
The base url is by default localhost:3000. You can change it also in the postman environment.




## Keycloak migration branch

`keycloak_m2M` pins shared core 4.0.0-keycloak.0 at
`c262f4aca971904f308085bdeaaed35cdf3cfa7d`, including the Bus wrapper. Run
`nvm use` (Node 22.23.2). Configure `M2M_PROVIDER=keycloak`, the HTTPS realm
issuer, audience, managed HTTPS token URL, and dedicated client ID/secret.
`KEYCLOAK_SCOPE` optionally requests granted scopes. Outbound Member reads and
Bus notifications require `read:members` and `write:bus_api` respectively.
Shared core verifies and caches service tokens; Auth0 issuance/proxy fallback
and the old DEV client-secret console logging are removed.

Timeline's protected routes are member-only: a verified service token receives
403. Public reads remain public. Member claims are normalized by shared core;
`ADMIN_USERS` still determines the administrator flag. Configure `AUTH_SECRET`,
`VALID_ISSUERS` as a JSON array and `AUTH_USER_AUDIENCES` as a JSON array (or
explicit `ALLOW_LEGACY_USER_AUDIENCE=true`) for member session compatibility.

The original branch omitted the required `config` module. This branch supplies
`config.js` using environment settings only. Defaults are port 3001, empty API
prefix, PostgreSQL schema `public`, preview 600×400 and resized images 1920×1080.
Set `API_PREFIX`, `DB_SCHEMA`, `PREVIEW_MAX_WIDTH/HEIGHT`,
`RESIZED_IMAGE_MAX_WIDTH/HEIGHT` to the workload's current values before rollout.
AWS credentials use the normal SDK chain when explicit keys are absent; local
S3 can use `IS_LOCAL=true` and `S3_ENDPOINT`. No secrets have embedded defaults.

`npm run lint`, `npm run build` (JavaScript syntax checks) and `npm test`
validate this branch. CI excludes the migration branch; no service is deployed.
