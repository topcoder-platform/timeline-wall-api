const express = require('express')
const bodyParser = require('body-parser')
const config = require('./config')
const setUpRoutes = require('./routes-bootstrap')
const fileUpload = require("express-fileupload");
var cors = require('cors')

const app = express()

app.use(cors())

app.use(bodyParser.json())
app.use(
    bodyParser.urlencoded({
        extended: true,
    })
)
app.use(fileUpload({
    limits: {
        fileSize: config.MEDIA_SIZE_LIMIT
    },
    abortOnLimit: true
}))

setUpRoutes(app)

app.listen(config.SERVER_PORT, () => {
    console.log(`Listening on port ${config.SERVER_PORT}...`)
})
