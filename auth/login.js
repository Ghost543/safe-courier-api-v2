const router = require("express").Router();
const Joi = require("joi");
const bcrypt = require("bcrypt");
const {exception} = require("../middleware/exceptionHandler");

const { UserModel } = require("../models/users");

router.post("/login", exception(async (req, res) => {
    const { error } = validation(req.body);
    if (error) {
        return res.status(400).send(error.details[0].message);
    }
    const { email, password } = req.body;

    const user = await UserModel.findOne({ email: email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(400).send(`Invalid email or password`);
    }
    const token = user.generateAuthToken();
    res.send(token);

}));

function validation(data) {
    const schema = Joi.object({
        email: Joi.string().required().email(),
        password: Joi.string().required(),
    });
    return schema.validate(data);
}

module.exports = router;