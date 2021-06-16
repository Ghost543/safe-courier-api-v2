const router = require("express").Router()
const Joi = require("joi")

const auth = require("../middleware/auth")
const { exception } = require("../middleware/exceptionHandler")
const Fawn = require("fawn")
const mongoose = require("../models/model")
Fawn.init(mongoose)

const { OrderModel,validation } = require("../models/parcel")
const { UserModel } = require("../models/users")
const {PickLocationModel,locationValidation} = require("../models/location");
const { mailSender } = require("../mail/mailer")

router.get("/",auth,exception((req,res) => {
    if (req.user.isAdmin){
        let parcels = OrderModel.find({status: {$ne: "canceled"}}).populate("user","name email telephonNumber").populate("location")
        return res.status(200).json({
            parcel: parcels
        })
    }
    res.status(401).json({
        message: `Not authorized to access this data`
    })
}))
router.get("/all",auth,exception(async (req,res) => {
    if (req.user.isAdmin){
        const orders = await OrderModel.find().populate("owner ").populate("pickUp").sort("date")
        return res.status(200).json({
            parcel: orders
        })  
    }
    res.status(401).json({
        message: `Not authorized to access this data`
    })
}))

router.get("/:id", auth,exception(async (req,res) => {
    let order = await OrderModel.findById(req.params.id).populate("owner","-password").populate("pickUp","-_id")
    if (order){
        const parcelOwner = await UserModel.findById(order.owner._id).select("-password")
        if (req.user.isAdmin || order.isOrderOwner(req.user._id)){
            const data = {
		_id: order._id,
		ownerId : parcelOwner._id,
                ownerName: parcelOwner.name,
                ownerEmail: parcelOwner.email,
                ownerTelephoneNumber: parcelOwner.telephonNumber,
                parcelType: order.parcelType,
                parcelWeight: order.parcelWeight,
                from: order.pickUp,
                to: order.destination,
		presentLocation: order.presentLocation,
                status: order.status,
            }
            console.log(order)
            return res.status(200).json(data)
        }else {
            return res.status(401).json({
                message: `Not authorized to access this data`
            })
        }
    }else{
        return res.status(404).json({message: `No parcel with id: ${req.params.id}`})
    }
}))

router.put("/:id/cancel", auth, exception(async(req,res) => {
    const { params,user } = req
    let order = await OrderModel.findById(params.id).populate("owner","-password")

    if (!order){
        return res.status(404).json({
            message: `No parcel with id: ${params.id}`
        })
    }
    
    if (user.isAdmin || order.isOrderOwner(user._id)){
        if (order.status === "delivered"){
            return res.status(400).json({
                message: `Can not cancel this order its already delivered`
            })
        }
        order.set({
            status: "canceled"
        })
        await order.save()
        return res.status(201).json({
            data: order
        })
    }
    res.status(401).json({
        message: `Not authorized to perform this action`
    })
}))

router.post("/",auth,exception(async (req,res) => {

    let { error } = validation(req.body)
    if (error){
        return res.status(400).json({
            message: error.details[0].message
        })
    }
    const parselOwner = await UserModel.findById(req.user._id).select("-password")
    const { parcelType,parcelWeight,receiverName,receiverEmail,receiverTel,destinationRegion,destinationLat,destinationLng } = req.body
    const data = {
        owner: parselOwner._id,
        parcelType: parcelType,
        parcelWeight: parcelWeight,
        destination: {
            recieverName: receiverName,
            reciverEmail: receiverEmail,
            reciverTel: receiverTel,
            region: destinationRegion,
            coordinates: {
                lat: destinationLat,
                lng: destinationLng
            }
        }
    }
    let order = await OrderModel.create(data)
    res.status(201).json(order)
}))
router.post("/:id/pick", auth, exception(async(req,res) => {
    const { params,user } = req
    let order = await OrderModel.findById(params.id).populate("owner", "-password");

    if (!order){
        return res.status(404).json({
            message: `No parcel with id: ${req.params.id}`
        })
    }
   
    if (user.isAdmin || order.isOrderOwner(user._id)){
        const { error } = locationValidation(req.body)
        if (error){
            return res.status(400).json({
                message: error.details[0].message
            })
        }
        const { pickRegion,pickLat,pickLng } = req.body
        const data = {
            userId: user._id,
            region: pickRegion,
            cordinates: {
                lat: pickLat,
                lng: pickLng
            }
        }
        let pickLocation = new PickLocationModel(data)
    
        new Fawn.Task()
            .save("locations",pickLocation)
            .update("orders",{_id: order._id},{ pickUp: pickLocation._id })
            .run()
        return res.status(201).json({
            data: pickLocation
        })
    }
    res.status(401).json({
        message: `Not authorized to perform this action`
    })
}))

router.put("/:id/destination",auth,exception(async (req,res) => {
    let order = await OrderModel.findById(req.params.id)
    if (order.isOrderOwner(req.user._id)){
        if (order.status === "delivered") {
            return res.status(400).json({
                message: `Can not change destination for this parcel order because its already delivered`
            })
        }
        const schema = Joi.object({
            receiverName: Joi.string().required(),
            receiverEmail: Joi.string().email(),
            receiverTel: Joi.string().min(10).max(13).required(),
            destinationRegion: Joi.string().required(),
            destinationLat: Joi.number(),
            destinationLng: Joi.number()
        })
        const { error } = schema.validate(req.body);
        if (error){
            return res.status(400).json({
                message: error.details[0].message
            })
        }
        const { receiverName,receiverEmail,receiverTel,destinationRegion,destinationLat,destinationLng } = req.body
        order.set({
            destination: {
                recieverName: receiverName,
                reciverEmail: receiverEmail,
                reciverTel: receiverTel,
                region: destinationRegion,
                coordinates: {
                    lat: destinationLat,
                    lng: destinationLng
                }
            }
        })
        const result = await order.save()
        return res.status(201).json(result)
    }
    res.status(401).json({
        message: `Not authorized to perform this action`
    })
}))

router.put("/:id/status",auth,exception(async (req,res) => {
    /*
            **** Status ****
            - pending
            - inprocess
            - delivered
            - canceled    

    */
    if (!req.user.isAdmin){
        return res.status(401).json({
            message: `Access denied only accessible to admins`
        })
    }
    const order = await OrderModel.findById(req.params.id).populate("owner", "-password")
    const schema = Joi.object({
        status: Joi.string().required()
    })
    const { error } = schema.validate(req.body)
    if(error){
        return res.status(400).json({
            message: error.details[0].message
        })
    }
    const result = await order.set({
        status: req.body.status
    }).save()
    const to = order.owner.email
    const from = req.user.email
    const subject = `Status Update for parcel ${order._id}`
    const message = `${order.owner.name} your parcel status has been updated to ${req.body.status}`
    mailSender(to,from,subject,message)
    res.status(201).json(result)
}))

router.put("/:id/presentLocation",auth,exception(async (req,res) => {
    if (!req.user.isAdmin){
        return res.status(401).json({
            message: `Access denied only accessible to admins`
        })
    }
    const order = await OrderModel.findById(req.params.id).populate("owner", "-password")
    const schema = Joi.object({
        presentRegion: Joi.string().required(),
        presentLat: Joi.number(),
        presentLng: Joi.number()
    })
    const { error } = schema.validate(req.body)
    if(error){
        return res.status(400).json({
            message: error.details[0].message
        })
    }
    const result = await order.set({
        presentLocation:{
            region: req.body.presentRegion,
            coordinates: {
                lat: req.body.presentLat,
                lng: req.body.presentLng
            }
        }
    }).save()

    const to = order.owner.email
    const from = req.user.email
    const subject = `Present Location Update for parcel ${order._id}`
    const message = `${order.owner.name} your parcel order is currently in the region ${req.body.presentRegion}`
    mailSender(to,from,subject,message)
    res.status(201).json(result)
}))

module.exports = router
