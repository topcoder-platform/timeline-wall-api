const express = require('express')
const bodyParser = require('body-parser')
const config = require('./config')
const setUpRoutes = require('./routes-bootstrap')
const fileUpload = require("express-fileupload")
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
    limitHandler: (req, res) => {
        const errorMessage = `File size exceeded limit of ${config.MEDIA_SIZE_LIMIT / 1024 / 1024} MB.`
        res.status(400).json({ message: errorMessage })
        // the below line is used to check this property in controller.
        // The reason is that lib doesn't stop execution after custom limitHandler
        // see more details: https://github.com/richardgirges/express-fileupload/issues/238
        req.shouldAbort = true
    }
}))

setUpRoutes(app)

app.listen(config.SERVER_PORT, () => {
    console.log(`Listening on port ${config.SERVER_PORT}...`)
})
