class NotFoundError extends Error {
    constructor(message) {
        super(message)
        this.name = 'Not Found'
    }
}

class ForbiddenError extends Error {
    constructor(message) {
        super(message)
        this.name = 'Forbidden'
    }
}

module.exports = {
    NotFoundError,
    ForbiddenError,
}
