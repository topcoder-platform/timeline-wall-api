const { BadRequestError, ForbiddenError, NotFoundError } = require("./custom-errors");

function handleErrors(res, error, customErrorMessage) {
    const errorMessage = customErrorMessage ?? `Unexpected error, see details: ${error.message}`
    if (error instanceof BadRequestError) {
        res.status(400).json({ message: error.message })
    } else if (error instanceof ForbiddenError) {
        res.status(403).json({ message: error.message })
    } else if (error instanceof NotFoundError) {
        res.status(404).json({ message: error.message })
    } else {
        res.status(500).json({ message: errorMessage })
    }
    console.log(errorMessage + `. More details: ${JSON.stringify(error)}`)
}

module.exports = {
    handleErrors
}