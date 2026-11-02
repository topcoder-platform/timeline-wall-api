const { test } = require('node:test')
const assert = require('node:assert/strict')
const http = require('node:http')
const { once } = require('node:events')
const sharp = require('sharp')

test('media and notification integrations use AWS v3 and the authenticated BUS client', async t => {
  const requests = []
  let rejectUpload = false
  let rejectBus = false
  const server = http.createServer(async (req, res) => {
    const chunks = []
    for await (const chunk of req) chunks.push(chunk)
    const body = Buffer.concat(chunks)
    requests.push({ url: req.url, method: req.method, headers: req.headers, body })
    const url = new URL(req.url, 'http://localhost')
    if (url.pathname === '/oauth/token') {
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ access_token: 'fixture-token', token_type: 'Bearer', expires_in: 3600 }))
    } else if (url.pathname.startsWith('/v5/members/')) {
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ email: 'fixture@example.invalid' }))
    } else if (url.pathname === '/v5/bus/events') {
      res.setHeader('Content-Type', 'application/json')
      res.statusCode = rejectBus ? 503 : 200
      res.end(JSON.stringify(rejectBus ? { message: 'private-upstream-detail' } : {}))
    } else if (rejectUpload) {
      res.statusCode = 403
      res.end('<Error><Code>AccessDenied</Code><Message>Denied</Message></Error>')
    } else if (req.method === 'POST' && url.searchParams.has('uploads')) {
      res.end('<InitiateMultipartUploadResult><Bucket>fixture</Bucket><Key>video</Key><UploadId>fixture-upload</UploadId></InitiateMultipartUploadResult>')
    } else if (req.method === 'POST' && url.searchParams.has('uploadId')) {
      res.end('<CompleteMultipartUploadResult><Location>http://localhost/video</Location><Bucket>fixture</Bucket><Key>video</Key><ETag>"complete"</ETag></CompleteMultipartUploadResult>')
    } else {
      res.setHeader('ETag', '"fixture-etag"')
      res.end('')
    }
  })
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  t.after(() => new Promise(resolve => server.close(resolve)))
  const endpoint = `http://127.0.0.1:${server.address().port}`
  Object.assign(process.env, {
    AUTH0_URL: `${endpoint}/oauth/token`, AUTH0_AUDIENCE: 'fixture-audience',
    AUTH0_CLIENT_ID: 'fixture-client', AUTH0_CLIENT_SECRET: 'fixture-secret',
    BUSAPI_URL: `${endpoint}/v5`, MEMBER_API_BASE_URL: `${endpoint}/v5`,
    IS_LOCAL_DB: 'true', AWS_ENDPOINT: endpoint, AWS_ACCESS_KEY_ID: 'fixture-access',
    AWS_SECRET_ACCESS_KEY: 'fixture-secret', AWS_SESSION_TOKEN: 'fixture-session',
    AWS_REGION: 'us-east-1', BUCKET_NAME: 'fixture', PHOTO_URL_TEMPLATE: 'https://media.invalid/<key>',
    EMAIL_FROM: 'sender@example.invalid', EVENT_APPROVED_TEMPLATE_ID: 'fixture-template'
  })
  const helper = require('../src/services/helpers')
  const { NotificationTypes } = require('../constants')

  await t.test('single-part image uploads retain metadata and generate previews with Sharp', async () => {
    const data = await sharp({ create: { width: 2400, height: 1000, channels: 3, background: '#369' } }).jpeg().toBuffer()
    const result = await helper.uploadMedia({ name: 'image.jpg', mimetype: 'image/jpeg', data }, 2)
    assert.equal(result.isVideo, false)
    assert.match(result.url, /-resized.jpg$/)
    assert.match(result.previewUrl, /-preview.jpg$/)
    const uploads = requests.filter(r => r.method === 'PUT')
    assert.equal(uploads.length, 3)
    for (const upload of uploads) {
      assert.equal(upload.headers['content-type'], 'image/jpeg')
      assert.ok(upload.headers['x-amz-meta-filename'])
      assert.equal(upload.headers['x-amz-security-token'], 'fixture-session')
      assert.match(upload.headers.authorization, /^AWS4-HMAC-SHA256 /)
    }
    const resized = await sharp(uploads[1].body).metadata()
    assert.equal(resized.width, 1920)
    assert.equal(resized.height, 800)
    const preview = await sharp(uploads[2].body).metadata()
    assert.equal(preview.height, 400)
  })

  await t.test('large videos use multipart uploads and preserve original preview behavior', async () => {
    const data = Buffer.alloc(7 * 1024 * 1024, 42)
    const result = await helper.uploadMedia({ name: 'video.mp4', mimetype: 'video/mp4', data }, 1)
    assert.equal(result.isVideo, true)
    assert.equal(result.previewUrl, result.url)
    const parts = requests.filter(r => r.method === 'PUT' && r.url.includes('partNumber='))
    assert.equal(parts.length, 2)
    assert.equal(parts.reduce((total, r) => total + r.body.length, 0), data.length)
    assert.ok(requests.some(r => r.method === 'POST' && r.url.includes('uploadId=')))
  })

  await t.test('S3 failures preserve the original error rather than referencing an undefined extension', async () => {
    rejectUpload = true
    await assert.rejects(helper.uploadMedia({ name: 'failed.mp4', mimetype: 'video/mp4', data: Buffer.from('fixture') }, 1), e => {
      assert.equal(e.name, 'AccessDenied')
      assert.match(e.message, /failed.mp4/)
      return true
    })
    rejectUpload = false
  })

  await t.test('member lookup caches tokens and email delivery preserves BUS envelopes', async () => {
    assert.equal(await helper.getEmail('fixture'), 'fixture@example.invalid')
    assert.equal(await helper.getEmail('fixture'), 'fixture@example.invalid')
    assert.equal(requests.filter(r => r.url === '/oauth/token').length, 1)
    await helper.sendEmail(NotificationTypes.EVENT_APPROVED, [{ userId: 123 }], { eventId: 7 })
    const request = requests.find(r => r.url === '/v5/bus/events')
    assert.equal(request.headers.authorization, 'Bearer fixture-token')
    const message = JSON.parse(request.body)
    assert.equal(message.topic, 'notifications.action.create')
    assert.equal(message.originator, 'topcoder-timeline-api')
    assert.equal(message['mime-type'], 'application/json')
    assert.deepEqual(message.payload.notifications[0].details.recipients, [{ userId: 123 }])
    assert.deepEqual(message.payload.notifications[0].details.data, { eventId: 7 })
    rejectBus = true
    await assert.rejects(helper.sendEmail(NotificationTypes.EVENT_APPROVED, [], {}), e => {
      assert.equal(e.status, 503)
      assert.doesNotMatch(e.message, /fixture-secret|fixture-token|private-upstream-detail/)
      return true
    })
    assert.equal(requests.filter(r => r.url === '/v5/bus/events').length, 2)
  })
})
