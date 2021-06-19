const router = require("express").Router();
const Joi = require("joi");
const bcrypt = require("bcrypt");
const {exception} = require("../middleware/exceptionHandler");

const { UserModel } = require("../models/users");

/**
 * @swagger
 * tags:
 *   name: User Auth
 *   description: A parcel delivery managing collection endpoints
 */

/**
 * @swagger
 * /api/v2/auth/login:
 *   post:
 *     summary: It enables a user and admin to login into the platiform
 *     tags: [User Auth]
 *     requestBody:
 *       description: Login feilds
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/login'
 *             
 *     responses:
 *       200:
 *         description: Succefully logged in
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *               required:
 *                 - token
 *       400:
 *         description: Some Invalide input or missing input
 *         content:
 *           application/json:
 *             schema:
 *               type: string
 *               
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'    
 *       404:
 *         description: User has no parcel order yet
 */
router.post("/login", exception(async (req, res) => {
    const { error } = validation(req.body);
    if (error) {
        return res.status(400).json({message: error.details[0].message});
    }
    const { email, password } = req.body;

    const user = await UserModel.findOne({ email: email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(400).json({message: `Invalid email or password`});
    }
    const token = user.generateAuthToken();
    res.status(200).send(token);

}));

function validation(data) {
    const schema = Joi.object({
        email: Joi.string().required().email(),
        password: Joi.string().required(),
    });
    return schema.validate(data);
}

module.exports = router;