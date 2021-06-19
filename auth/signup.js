const router = require("express").Router();
const bcrypt = require("bcrypt");

const { UserModel, validation } = require("../models/users");
const { exception } = require("../middleware/exceptionHandler")


/**
 * @swagger
 * /api/v2/auth/signup:
 *   post:
 *     summary: It enables a user and admin to login into the platiform
 *     tags: [User Auth]
 *     requestBody:
 *       description: Login feilds
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/signup'
 *             
 *     responses:
 *       200:
 *         description: Succefully created an account
 *       400:
 *         description: Some Invalide input or missing input
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *               required:
 *                 - message
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'    
 *       404:
 *         description: User has no parcel order yet
 */

router.post("/signup", exception(async (req, res) => {
    const { error } = validation(req.body);
    if (error) {
        return res.status(400).send(error.details[0].message);
    }


    const { name, email, password,telephoneNumber } = req.body;
    let user = await UserModel.findOne({ email: email });
    if (user){
        return res.status(400).send(`User with email: ${email} already exists`);
    }

    const salt = await bcrypt.genSalt(10);
    user = new UserModel({
        name: name,
        email: email,
        telephonNumber: telephoneNumber,
        password: await bcrypt.hash(password, salt),
    });

    await user.save()
    const token = user.generateAuthToken()
    res.header('x-auth-token',token).header("access-control-expose-headers","x-auth-token").status(201).send(user)
}));

module.exports = router;
