module.exports = class AuthController {
    getCurrentUserDetails(req, res) {
        res.json({
            handle: req.authUser.handle,
            isAdmin: req.authUser.isAdmin
        })
    }
}