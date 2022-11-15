const { Pool } = require("pg");
const config = require('../../config')
let pool

function getPool() {
    if (!pool) {
        pool = new Pool({
            user: config.DATABASE.USER,
            host: config.DATABASE.HOST,
            database: config.DATABASE.NAME,
            password: config.DATABASE.PASSWORD,
            port: config.DATABASE.PORT,
        })
    }
    return pool
}

module.exports = {
    getPool: getPool
}