const assert = require('node:assert/strict')
const { realpathSync } = require('node:fs')
const { join } = require('node:path')
const { test, afterEach } = require('node:test')
const nock = require('nock')

const saved = { ...process.env }
const root = join(__dirname, '..')
const fresh = [join(root, 'config.js'), join(root, 'src') + '/',
  realpathSync(join(root, 'node_modules', 'topcoder-bus-api-wrapper')) + '/']
const keycloakEnv = {
  KEYCLOAK_ISSUER: 'https://keycloak.test/realms/m2m',
  KEYCLOAK_AUDIENCE: 'https://api.test',
  KEYCLOAK_TOKEN_URL: 'https://keycloak.test/m2m/token',
  KEYCLOAK_CLIENT_ID: 'm2m-timeline',
  KEYCLOAK_CLIENT_SECRET: 'keycloak-secret'
}
const auth0Env = {
  AUTH0_URL: 'https://tenant.test/oauth/token',
  AUTH0_AUDIENCE: 'https://m2m.test/',
  AUTH0_PROXY_SERVER_URL: 'https://proxy.test/token',
  AUTH0_CLIENT_ID: 'auth0-timeline',
  AUTH0_CLIENT_SECRET: 'auth0-secret'
}
const auth0Body = {
  grant_type: 'client_credentials',
  client_id: 'auth0-timeline',
  client_secret: 'auth0-secret',
  auth0_url: 'https://tenant.test/oauth/token',
  audience: 'https://m2m.test/'
}

/**
 * Load config, src modules and the Bus wrapper afresh with `env` as the only USE_KEYCLOAK,
 * AUTH0_* and KEYCLOAK_* settings. Returns the helpers module.
 */
function load (env) {
  process.env = { ...saved, AWS_EC2_METADATA_DISABLED: 'true' }
  for (const name of Object.keys(saved)) {
    if (name === 'USE_KEYCLOAK' || name.startsWith('AUTH0_') || name.startsWith('KEYCLOAK_')) delete process.env[name]
  }
  Object.assign(process.env, env)
  for (const file of Object.keys(require.cache)) {
    if (fresh.some(prefix => file.startsWith(prefix))) delete require.cache[file]
  }
  return require('../src/services/helpers')
}

afterEach(() => {
  nock.cleanAll()
  nock.enableNetConnect()
  process.env = { ...saved }
})

for (const [name, flag] of [['unset', {}], ['false', { USE_KEYCLOAK: 'false' }]]) {
  test(`USE_KEYCLOAK ${name} gets Member tokens from AUTH0_URL and Bus tokens through the proxy`, async () => {
    const { getEmail, sendEmail } = load({ ...flag, ...auth0Env, ...keycloakEnv })
    const { NotificationTypes } = require('../constants')
    nock.disableNetConnect()
    const member = nock('https://tenant.test').post('/oauth/token', auth0Body).reply(200, { access_token: `member-${name}` })
    const busToken = nock('https://proxy.test').post('/token', auth0Body).reply(200, { access_token: `bus-${name}` })
    const api = nock('https://api.topcoder-dev.com', { reqheaders: { authorization: `Bearer member-${name}` } })
      .get('/v5/members/fixture').query({ fields: 'email' }).reply(200, { email: 'fixture@example.test' })
    const bus = nock('https://api.topcoder-dev.com', { reqheaders: { authorization: `Bearer bus-${name}` } })
      .post('/v5/bus/events').reply(204)
    assert.equal(await getEmail('fixture'), 'fixture@example.test')
    await sendEmail(NotificationTypes.EVENT_APPROVED, [], {})
    assert.equal(member.isDone(), true)
    assert.equal(busToken.isDone(), true)
    assert.equal(api.isDone(), true)
    assert.equal(bus.isDone(), true)
  })
}

test('USE_KEYCLOAK unset starts member authentication without any KEYCLOAK_* setting', () => {
  load(auth0Env)
  assert.equal(typeof require('../src/auth').authenticateMember, 'function')
})

test('USE_KEYCLOAK=true gets Member and Bus tokens from Keycloak', async () => {
  const { getEmail, sendEmail } = load({ USE_KEYCLOAK: 'true', ...auth0Env, ...keycloakEnv })
  const { NotificationTypes } = require('../constants')
  nock.disableNetConnect()
  const tokens = nock('https://keycloak.test').post('/m2m/token', {
    grant_type: 'client_credentials',
    client_id: 'm2m-timeline',
    client_secret: 'keycloak-secret',
    audience: 'https://api.test'
  }).twice().reply(503)
  await assert.rejects(getEmail('fixture'), /^Error: Keycloak M2M token request failed$/)
  await assert.rejects(sendEmail(NotificationTypes.EVENT_APPROVED, [], {}), /Keycloak M2M token request failed$/)
  assert.equal(tokens.isDone(), true)
})

test('an invalid USE_KEYCLOAK value fails when the helpers load', () => {
  assert.throws(() => load({ USE_KEYCLOAK: 'maybe', ...auth0Env, ...keycloakEnv }), /USE_KEYCLOAK must be true or false/)
})
