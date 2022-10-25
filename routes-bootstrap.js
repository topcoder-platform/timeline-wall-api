const routes = require('./src/routes')
const _ = require('lodash')
const config = require("./config")
const authenticator = require('tc-core-library-js').middleware.jwtAuthenticator


module.exports = (app) => {
    _.each(routes, (verbs, path) => {
        _.each(verbs, (route, verb) => {

            if(route.auth){
                app[verb](path, authenticator({ AUTH_SECRET: config.AUTH_SECRET, VALID_ISSUERS: config.VALID_ISSUERS }))
                app[verb](path, (req, res, next) => {
                    req.authUser.isAdmin = config.ADMIN_USERS.includes(req.authUser.handle)
                    next()
                })
            }
            app[verb](path, route.method)
        })
    })
}