const router = require("express").Router()
const Joi = require("joi")

const { UserModel } = require("../models/users")
const { OrderModel } = require("../models/parcel")

const auth = require("../middleware/auth")
const { exception } = require("../middleware/exceptionHandler")

/**
 *  * @swagger
 * components:
 *   responses:
 *     UnauthorizedError:
 *       description: Access token is missing or invalid
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *    schemas:
 */

/**
 * @swagger
 * tags:
 *   name: User
 *   description: A user defined endpoints to control the parcels and user by the admin
 */

/**
 * @swagger
 * /api/v2/users/{id}/parcels:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     summary: Returns a specific users parcel delivery orders but only accessible by the platiform admin and the user
 *     tags: [User]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: This is the id of the user in the database
 *     responses:
 *       200:
 *         description: Successfull return of a list of parcel delivery orders of a user
 *       400:
 *         description: No user with given id
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'    
 *       404:
 *         description: User has no parcel order yet  
 */
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
/**
 * @swagger
 * /api/v2/users/{id}:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     summary: Returns a specific user's profile but only accessible by the platiform admin and the user
 *     tags: [User]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: This is the id of the user in the database
 *     responses:
 *       200:
 *         description: Successfull return of the user's profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/users'
 *       400:
 *         description: No user with given id
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'    
 */
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
/**
 * @swagger
 * /api/v2/users/:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     summary: Returns a list of users on the platiform but only accessible by the platiform admin
 *     tags: [User]
 *     responses:
 *       200:
 *         description: Successfull return of the a list of user
 *       400:
 *         description: No users on the system
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'    
 */
router.get("/",auth, exception(async (req,res) => {
    if (req.user.isAdmin){
         const user = await UserModel.find({isAdmin: {$ne: true}}).select("-password")
	    if (!user){
		return res.status(400).json({
		    message: `No users with on the system yet`
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
