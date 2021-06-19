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

/**
 * @swagger
 * components:
 *   responses:
 *     UnauthorizedError:
 *       description: Access token is missing or invalid
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   schemas:
 *     users:
 *        type: object
 *        required:
 *          - _id
 *          - name
 *          - email
 *          - telephonNumber
 *          - isAdmin
 *        properties:
 *          _id:
 *            type: string
 *          name:
 *            type: string
 *          email:
 *            type: string
 *            format: email
 *          telephoneNumber:
 *            type: string
 *            minimum: 10
 *            maximum: 13
 *          isAdmin:
 *            type: boolean
 *     login:
 *        type: object
 *        required:
 *          - email
 *          - password
 *        properties:
 *          email:
 *            type: string
 *            format: email
 *          password:
 *            type: string
 *            format: password
 *            minLength: 8
 *     signup:
 *        type: object
 *        required:
 *          - name
 *          - email
 *          - telephoneNumber
 *          - password
 *        properties:
 *          name:
 *            type: string
 *          email:
 *            type: string
 *            format: email
 *          telephoneNumber:
 *            type: string
 *          password:
 *            type: string
 *            format: password
 *            minLength: 8
 *        example:
 *          name: Jon Doe
 *          email: jondoe@mail.com
 *          telephoneNumber: +234000000000
 *          password: 12345678
 *     parcels:
 *       type: object
 *       required:  
 *         - parcelType
 *         - parcelWeight
 *         - receiverName
 *         - receiverEmail
 *         - receiverTel
 *         - destinationRegion
 *         - destinationLat
 *         - destinationLng
 *       properties:
 *         parcelType:
 *           type: string
 *         parcelWeight:
 *           type: integer
 *         receiverName:
 *           type: string
 *         receiverEmail:
 *           type: string
 *           format: email
 *         receiverTel:
 *           type: string
 *         destinationRegion:
 *           type: string
 *         destinationLat:
 *           type: integer
 *         destinationLng:
 *           type: integer
 *       example:
 *         parcelType: Box
 *         parcelWeight: 23
 *         receiverName: Jon Doe
 *         receiverEmail: jondoe@mail.com
 *         receiverTel: +234000000000
 *         destinationRegion: Gulu
 *         destinationLat: 3456
 *         destinationLng: 6543
 */

/**
 * @swagger
 * tags:
 *   name: Parcels
 *   description: A parcel delivery managing collection endpoints
 */



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
/** 
 * @swagger
 * /api/v2/parcels/all:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     summary: Returns all parcel delivery orders but only accessible by the platiform admin
 *     tags: [Parcels]
 *     headers:
 *       x-auth-token: token
 *     responses:
 *       200:
 *         description: Successfull return of the list of all parcel delivery orders
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'       
*/
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
/** 
 * @swagger
 * /api/v2/parcels/{id}:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     summary: Returns a specific parcel delivery order but only accessible by the platiform admin and the sender
 *     tags: [Parcels]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: This is the parcel delivery number
 *     responses:
 *       200:
 *         description: Successfull return of the parcel delivery order
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'    
 *       404:
 *         description: Parcel not found     
*/
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
/** 
 * @swagger
 * /api/v2/parcels/:
 *   post:
 *     security:
 *       - bearerAuth: []
 *     summary: Creates a parcel delivery order but only accessible by both the platiform admin and a registered user
 *     tags: [Parcels]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/parcels'             
 *     responses:
 *       201:
 *         description: Successfull creation of the parcel delivery order
 *       400:
 *         description: Invalid inputs
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'         
*/
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
/** 
 * @swagger
 * /api/v2/parcels/{id}/pick:
 *   post:
 *     security:
 *       - bearerAuth: []
 *     summary: This end point is used to add a pick up location for the parcel delivery order only accessible by parcel owner
 *     tags: [Parcels]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: This is the parcel delivery number
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               pickRegion: 
 *                 type: string
 *               pickLat:
 *                 type: integer
 *               pickLng:
 *                 type: integer
 *             example:
 *               pickRegion: Kampala
 *               pickLat: 3453
 *               pickLng: 9023        
 *     responses:
 *       201:
 *         description: Successfull cancel of a parcel order
 *       400:
 *         description: Invalid input  
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Parcel not found         
*/
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
/** 
 * @swagger
 * /api/v2/parcels/{id}/cancel:
 *   put:
 *     security:
 *       - bearerAuth: []
 *     summary: This end point is used to cancel a parcel delivery order only accessible by both admin and parcel owner
 *     tags: [Parcels]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: This is the parcel delivery number
 *     responses:
 *       201:
 *         description: Successfull cancel of a parcel order
 *       400:
 *         description: Can not cancel already delivered parcel  
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Parcel not found         
*/
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
/** 
 * @swagger
 * /api/v2/parcels/{id}/destination:
 *   put:
 *     security:
 *       - bearerAuth: []
 *     summary: This end point is used to update the a parcel delivery order's destination only accessible by both admin and parcel owner
 *     tags: [Parcels]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: This is the parcel delivery number
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               receiverName:
 *                 type: string
 *               receiverEmail:
 *                 type: string
 *                 format: email
 *               receiverTel:
 *                 type: string
 *               destinationRegion: 
 *                 type: string
 *               destinationLat:
 *                 type: integer
 *               destinationLng:
 *                 type: integer
 *             example:
 *               receiverName: Jon Doe
 *               receiverEmail: jondoe@mail.com
 *               receiverTel: +256779345
 *               destinationRegion: Arua
 *               destinationLat: 3453
 *               destinationLng: 9023
 *     responses:
 *       201:
 *         description: Successfull cancel of a parcel order
 *       400:
 *         description: Invalid inputs  
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Parcel not found         
*/
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
/** 
 * @swagger
 * /api/v2/parcels/{id}/status:
 *   put:
 *     security:
 *       - bearerAuth: []
 *     summary: This end point is used to update the a parcel delivery order's status only accessible by both admin and parcel owner
 *     tags: [Parcels]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: This is the parcel delivery number
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status: 
 *                 type: string
 *                 enum: [inprocess, pending, delivered, canceled]
 *           examples:
 *             pending:
 *               summary: pending --> The parcel is either yet to be picked or still at the station
 *             inprocess:
 *               summary: inprocess --> The parcel is in transit from one point to another
 *             delivered:
 *               summary: delivered --> The parcel is already delivered to the destination location
 *             canceled:
 *               summary: canceled --> The parcel is canceled by either the sender or the admin                   
 *     responses:
 *       201:
 *         description: Successfull cancel of a parcel order
 *       400:
 *         description: Invalid inputs  
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Parcel not found         
*/
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
/** 
 * @swagger
 * /api/v2/parcels/{id}/presentLocation:
 *   put:
 *     security:
 *       - bearerAuth: []
 *     summary: This end point is used to update the a parcel delivery order's present location only accessible by both admin and parcel owner
 *     tags: [Parcels]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: This is the parcel delivery number
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               presentRegion: 
 *                 type: string
 *               presentLat:
 *                 type: integer
 *               presentLng:
 *                 type: integer
 *             example:
 *               presentRegion: Kampala
 *               presentLat: 3453
 *               presentLng: 9023 
 *     responses:
 *       201:
 *         description: Successfull cancel of a parcel order
 *       400:
 *         description: Invalid inputs  
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Parcel not found         
*/
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
