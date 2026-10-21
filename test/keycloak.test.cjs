const assert = require('node:assert/strict')
const { generateKeyPairSync, sign, createHmac } = require('node:crypto')
const { test } = require('node:test')
const nock = require('nock')
const issuer = 'https://timeline.test/realms/m2m'
Object.assign(process.env, {
  M2M_PROVIDER: 'keycloak', KEYCLOAK_ISSUER: issuer,
  KEYCLOAK_AUDIENCE: 'https://api.test', KEYCLOAK_TOKEN_URL: 'https://timeline.test/m2m/token',
  KEYCLOAK_CLIENT_ID: 'timeline-test', KEYCLOAK_CLIENT_SECRET: 'synthetic-secret',
  KEYCLOAK_SCOPE: 'read:members write:bus_api', AUTH_SECRET: 'synthetic-member-secret',
  VALID_ISSUERS: '["https://member.test"]', AUTH_USER_AUDIENCES: '["member-api"]', ADMIN_USERS: 'fixture',
  AWS_EC2_METADATA_DISABLED: 'true'
})
const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
/** Sign synthetic member/service claims with optional changes; returns a fixture JWT. */
function token (changes = {}, member = false) {
  const now = Math.floor(Date.now() / 1000)
  const header = Buffer.from(JSON.stringify(member ? { alg: 'HS256' } : { alg: 'RS256', kid: 'timeline' })).toString('base64url')
  const claims = member ? { iss: 'https://member.test', aud: 'member-api', userId: 123, roles: ['Topcoder User'], handle: 'fixture' }
    : { iss: issuer, aud: 'https://api.test', sub: 'service-timeline', azp: 'timeline-test', gty: 'client-credentials', scope: 'read:members write:bus_api' }
  const payload = Buffer.from(JSON.stringify({ ...claims, iat: now, exp: now + 900, ...changes })).toString('base64url')
  const input = `${header}.${payload}`
  const signature = member ? createHmac('sha256', 'synthetic-member-secret').update(input).digest('base64url') : sign('RSA-SHA256', Buffer.from(input), privateKey).toString('base64url')
  return `${input}.${signature}`
}
nock(issuer).persist().get('/protocol/openid-connect/certs').reply(200, {
  keys: [{ ...publicKey.export({ format: 'jwk' }), kid: 'timeline', alg: 'RS256', use: 'sig' }]
})
test('actual current-user route accepts members, derives admin flag and rejects services', async () => {
  const express = require('express')
  const app = express()
  require('../routes-bootstrap')(app)
  const server = app.listen(0, '127.0.0.1')
  await new Promise(resolve => server.once('listening', resolve))
  const url = `http://127.0.0.1:${server.address().port}/auth/currentUser`
  try {
    let response = await fetch(url, { headers: { authorization: 'Bearer ' + token({}, true) } })
    assert.equal(response.status, 200); assert.deepEqual(await response.json(), { handle: 'fixture', isAdmin: true })
    response = await fetch(url, { headers: { authorization: 'Bearer ' + token({ handle: 'outsider', isAdmin: true }, true) } })
    assert.equal(response.status, 200); assert.equal((await response.json()).isAdmin, false)
    response = await fetch(url, { headers: { authorization: 'Bearer ' + token() } }); assert.equal(response.status, 403)
    response = await fetch(url, { headers: { authorization: 'Bearer ' + token({ aud: 'wrong' }) } }); assert.equal(response.status, 401)
    response = await fetch(url, { headers: { authorization: 'Bearer ' + token({ roles: ['administrator'] }) } }); assert.equal(response.status, 401)
    response = await fetch(url); assert.equal(response.status, 401)
  } finally { await new Promise(resolve => server.close(resolve)) }
})
test('Member lookup verifies returned credentials and caches successful tokens', async () => {
  const { getEmail } = require('../src/services/helpers')
  const bad = nock('https://timeline.test').post('/m2m/token').reply(200, { access_token: token({ azp: 'other' }), expires_in: 900 })
  await assert.rejects(getEmail('fixture'), /^Error: Keycloak M2M token request failed$/); assert.equal(bad.isDone(), true)
  const jwt = token(); const endpoint = nock('https://timeline.test').post('/m2m/token').reply(200, { access_token: jwt, expires_in: 900 })
  const api = nock('https://api.topcoder-dev.com', { reqheaders: { authorization: `Bearer ${jwt}` } }).get('/v5/members/fixture').query({ fields: 'email' }).twice().reply(200, { email: 'fixture@example.test' })
  assert.equal(await getEmail('fixture'), 'fixture@example.test'); assert.equal(await getEmail('fixture'), 'fixture@example.test')
  assert.equal(endpoint.isDone(), true); assert.equal(api.isDone(), true)
})
test('Bus wrapper uses the pinned shared provider and never falls back to Auth0', async () => {
  const { createRequire } = require('node:module')
  const wrapperRequire = createRequire(require.resolve('topcoder-bus-api-wrapper'))
  assert.equal(wrapperRequire('tc-core-library-js/package.json').version, '4.0.0-keycloak.0')
  const { sendEmail } = require('../src/services/helpers')
  const { NotificationTypes } = require('../constants')
  const jwt = token(); const endpoint = nock('https://timeline.test').post('/m2m/token').reply(200, { access_token: jwt, expires_in: 900 })
  const bus = nock('https://api.topcoder-dev.com', { reqheaders: { authorization: `Bearer ${jwt}` } }).post('/v5/bus/events').twice().reply(204)
  await sendEmail(NotificationTypes.EVENT_APPROVED, [], {}); await sendEmail(NotificationTypes.EVENT_APPROVED, [], {})
  assert.equal(endpoint.isDone(), true); assert.equal(bus.isDone(), true)
})
