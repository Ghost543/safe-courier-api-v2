const router = require("express").Router();
const bcrypt = require("bcrypt");

const { UserModel, validation } = require("../models/users");
const { exception } = require("../middleware/exceptionHandler")

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
