const { Pool } = require("pg");
const config = require('../../config')
let pool

function getPool() {
    let options = "-c search_path=" + config.DB_SCHEMA_NAME
    if (!pool) {
        pool = new Pool({
            user: config.DATABASE.USER,
            host: config.DATABASE.HOST,
            database: config.DATABASE.NAME,
            password: config.DATABASE.PASSWORD,
            port: config.DATABASE.PORT,
            options: options
        })
    }
    return pool
}

module.exports = {
    getPool: getPool
}