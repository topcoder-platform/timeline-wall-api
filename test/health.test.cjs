const { test } = require('node:test')
const assert = require('node:assert/strict')
const { once } = require('node:events')
const { spawn, execFileSync } = require('node:child_process')

Object.assign(process.env, {
  AUTH_SECRET: 'a-fixture-secret-with-at-least-32-bytes',
  VALID_ISSUERS: 'https://issuer.test.invalid/',
  AUTH0_URL: 'https://auth.test.invalid/oauth/token',
  AUTH0_AUDIENCE: 'fixture-machine',
  AUTH0_CLIENT_ID: 'fixture', AUTH0_CLIENT_SECRET: 'fixture',
  DB_SCHEMA_NAME: 'timeline_fixture', PREVIEW_WIDTH: '320', PREVIEW_HEIGHT: '240'
})
for (const key of ['API_PREFIX', 'DB_SCHEMA', 'PREVIEW_MAX_WIDTH', 'PREVIEW_MAX_HEIGHT']) delete process.env[key]

test('deployed health probes reach the database-backed route with existing environment names', async t => {
  const config = require('../config')
  const pool = require('../src/repositories/db-helper').getPool()
  assert.equal(pool.options.options, '-c search_path=timeline_fixture')
  assert.equal(config.PREVIEW_MAX_WIDTH, 320)
  assert.equal(config.PREVIEW_MAX_HEIGHT, 240)
  let available = true
  let queries = 0
  pool.query = async (sql, parameters) => {
    queries++
    assert.equal(sql, 'SELECT * FROM events WHERE status = $1')
    assert.deepEqual(parameters, ['Approved'])
    if (!available) throw new Error('fixture database unavailable')
    return { rows: [] }
  }
  const app = require('express')()
  require('../routes-bootstrap')(app)
  const server = app.listen(3001, '127.0.0.1')
  await once(server, 'listening')
  t.after(() => new Promise(resolve => server.close(resolve)))
  t.after(() => pool.end())

  for (const environment of ['dev', 'prod']) {
    const { command } = require(`../deploy/${environment}-healthcheck.json`)['timeline-wall-api']
    assert.equal(command[0], 'CMD')
    async function probe () {
      const child = spawn(process.execPath, command.slice(2), { stdio: 'ignore' })
      const [code] = await once(child, 'exit')
      return code
    }
    available = true
    assert.equal(await probe(), 0, `${environment} probe must reach the healthy database route`)
    available = false
    assert.equal(await probe(), 1, `${environment} probe must reject database failures`)
  }
  assert.equal(queries, 4)
})

test('explicit route and schema settings override compatibility defaults', () => {
  const result = execFileSync(process.execPath, ['-e', `
    const c = require('./config')
    console.log(JSON.stringify([c.API_PREFIX, c.DATABASE.SCHEMA, c.PREVIEW_MAX_WIDTH, c.PREVIEW_MAX_HEIGHT]))
  `], {
    cwd: require('node:path').resolve(__dirname, '..'),
    env: { ...process.env, API_PREFIX: '', DB_SCHEMA: 'override_fixture', PREVIEW_MAX_WIDTH: '640', PREVIEW_MAX_HEIGHT: '480' },
    encoding: 'utf8'
  })
  assert.deepEqual(JSON.parse(result), ['', 'override_fixture', 640, 480])
})
