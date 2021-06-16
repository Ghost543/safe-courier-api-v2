const router = require("express").Router()
const Joi = require("joi")

const { UserModel,validation } = require("../models/users")
const { OrderModel } = require("../models/parcel")

const auth = require("../middleware/auth")
const { exception } = require("../middleware/exceptionHandler")


router.get("/:id/parcels",auth, exception(async (req,res) => {
    console.log((req.params.id === req.user._id) || (req.user.isAdmin))
    if ((req.params.id === req.user._id) || (req.user.isAdmin)){
         const user = await UserModel.findById(req.params.id ).select("-password")
	    if (!user){
		return res.status(400).json({
		    message: `No user with id: ${req.params.id}`
		})
	    }
	    const userOrders = await OrderModel.find({owner: user._id}).populate("owner","-password").sort("date")
	    if (userOrders.length === 0){
		return res.status(404).json({
		    message: `user: ${user.name} with id: ${user._id} has no parcel delivery orders yet`
		})
	    }
	    return res.status(200).json({
		"orders": userOrders
	    })
    }
   
    res.status(401).json({
            message: `Not authorized to access this data`
        })
}))

router.get("/:id",auth, exception(async (req,res) => {
    if ((req.params.id === req.user._id) || (req.user.isAdmin)){
         const user = await UserModel.findById(req.params.id).select("-password")
	    if (!user){
		return res.status(400).json({
		    message: `No user with id: ${req.params.id}`
		})
	    }
	    return res.status(200).json({
		"user": user
	    })
    }
   
    res.status(401).json({
            message: `Not authorized to access this data`
        })
}))

router.get("/",auth, exception(async (req,res) => {
    if (req.user.isAdmin){
         const user = await UserModel.find({isAdmin: {$ne: true}}).select("-password")
	    if (!user){
		return res.status(400).json({
		    message: `No user with id: ${req.params.id}`
		})
	    }
	    return res.status(200).json({
		"users": user
	    })
    }
   
    res.status(401).json({
            message: `Not authorized to access this data`
        })
}))


module.exports = router
