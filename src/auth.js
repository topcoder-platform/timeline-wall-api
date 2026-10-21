const { auth } = require('tc-core-library-js')
const config = require('../config')
const validator = auth.createValidator(config)

/** Authenticate a member for Timeline mutations/current-user routes.
 * @param {Object} req Express request containing a bearer token.
 * @param {Object} res Express response used for sanitized 401/403 failures.
 * @param {Function} next Continue with a normalized member and configured admin flag.
 * @returns {Promise<void>} Completes validation or writes a denial response.
 * @throws Configuration errors occur at startup; token errors are sanitized.
 * Services validate through shared core then receive 403: Timeline has no
 * service-authorized routes and must not assign a member handle to a machine.
 */
async function authenticateMember (req, res, next) {
  let principal
  try {
    const header = req.headers.authorization
    const match = typeof header === 'string' ? /^Bearer ([^\s]+)$/i.exec(header) : null
    if (!match) throw new Error('Missing token')
    principal = await validator.verify(match[1])
  } catch {
    delete req.authUser
    res.status(401).json({ message: 'Invalid or expired token' })
    return
  }
  if (principal.kind !== 'user') {
    delete req.authUser
    res.status(403).json({ message: 'Member authentication required' })
    return
  }
  req.authUser = { ...principal, isAdmin: config.ADMIN_USERS.includes(principal.handle) }
  next()
}
module.exports = { authenticateMember }
