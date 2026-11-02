const { test } = require('node:test')
const assert = require('node:assert/strict')
const { createHmac } = require('node:crypto')
const { once } = require('node:events')
Object.assign(process.env, {
  AUTH_SECRET: 'a-fixture-secret-with-at-least-32-bytes',
  VALID_ISSUERS: 'https://issuer.test.invalid/ https://another.test.invalid/',
  JWT_AUDIENCE: 'fixture-browser', AUTH0_AUDIENCE: 'fixture-machine',
  AUTH0_URL: 'https://auth.test.invalid/oauth/token',
  AUTH0_CLIENT_ID: 'fixture', AUTH0_CLIENT_SECRET: 'fixture', ADMIN_USERS: 'trusted-admin second-admin'
})

function token (claims, secret = process.env.AUTH_SECRET) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({ iss: 'https://issuer.test.invalid/', exp: Math.floor(Date.now() / 1000) + 60, userId: '123', ...claims })).toString('base64url')
  const data = `${header}.${payload}`
  return `${data}.${createHmac('sha256', secret).update(data).digest('base64url')}`
}

test('actual current-user route verifies tokens and derives admin status from configured handles', async t => {
  const app = require('express')()
  require('../routes-bootstrap')(app)
  const server = app.listen(0, '127.0.0.1')
  await once(server, 'listening')
  t.after(() => new Promise(resolve => server.close(resolve)))
  async function request (claims, secret) {
    const headers = claims ? { authorization: `Bearer ${token(claims, secret)}` } : {}
    const response = await fetch(`http://127.0.0.1:${server.address().port}/auth/currentUser`, { headers })
    return { status: response.status, body: await response.json() }
  }
  assert.equal((await request()).status, 401)
  assert.deepEqual(await request({ handle: 'trusted-admin' }), { status: 200, body: { handle: 'trusted-admin', isAdmin: true } })
  assert.deepEqual(await request({ handle: 'member', isAdmin: true }), { status: 200, body: { handle: 'member', isAdmin: false } })
  assert.equal((await request({ handle: 'trusted-admin' }, 'wrong-secret')).status, 401)
  assert.equal((await request({ handle: 'trusted-admin', iss: 'https://untrusted.invalid/' })).status, 401)
  assert.equal((await request({ handle: 'trusted-admin', exp: 1 })).status, 401)
  assert.equal((await request({ handle: 'trusted-admin', nbf: Math.floor(Date.now() / 1000) + 3600 })).status, 401)
  assert.equal((await request({ handle: 'trusted-admin', isMachine: true })).status, 401)
})
