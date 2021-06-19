const jwt = require("jsonwebtoken")

module.exports = function (req,res,next) {
    // console.log(req)
    let token = req.header("x-auth-token")
    let swagger = req.header("authorization")
    if(swagger){
        swagger = swagger.split(" ")[1]
    }
    console.log(swagger)
    if (!token && !swagger) {
        return res.status(401).send(`Access denied no token provided`)
    }
    try {
        if (!token && swagger) {
            const key = swagger
            const decoded = jwt.verify(key,"privateKey")
            req.user = decoded
            return next()
        }
        const decoded = jwt.verify(token,"privateKey")
        req.user = decoded
        next()
    } catch (error) {
        res.status(400).send(`Invalid token`)
    }

}