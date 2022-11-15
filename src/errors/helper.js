const { NotFoundError, ForbiddenError } = require("./custom-errors");

function handleErrors(res, error) {
    if (error instanceof NotFoundError) {
        res.status(404).json({ message: error.message })
    } else if (error instanceof ForbiddenError) {
        res.status(403).json({ message: error.message })
    } else {
        res.status(500).json({ message: `Unexpected error, see details: ${error.message}` })
    }
    console.log(error.message)
}

module.exports = {
    handleErrors
}