const routes = require('./src/routes')
const { authenticateMember } = require('./src/auth')

/** Register public reads and member-only Timeline operations.
 * @param {Object} app Express app to receive the routes.
 * @returns {void} Installs route handlers; authentication responds with 401/403.
 * @throws Express errors for invalid route definitions.
 */
module.exports = (app) => {
  for (const [path, verbs] of Object.entries(routes)) {
    for (const [verb, route] of Object.entries(verbs)) {
      if (route.auth) app[verb](path, authenticateMember)
      app[verb](path, route.method)
    }
  }
}
