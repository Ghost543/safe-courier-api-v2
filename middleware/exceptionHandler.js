exports.error = function (err,req,res,next) {
    res.status(500).json({
        message: `Something went wrong`
    })
    console.error(err)
}


exports.exception = function (handler) {
    return async (req,res,next)=>{
        try {
            await handler(req,res)
        } catch (error) {
            next(error)
        }
    }
}