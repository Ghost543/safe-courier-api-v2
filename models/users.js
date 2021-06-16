const mongoose = require("./model");
const Joi = require("joi");
const jwt = require("jsonwebtoken")

const schema = new mongoose.Schema({
    name: {
        type: String,
        unique: true,
        required: true,
    },
    email: {
        type: String,
        unique: true,
        required: true,
    },
    telephonNumber: {
      type: String,
      required: true
    },
    isAdmin: {
        type: Boolean,
        required: true,
        default: false
    },
    password: {
        type: String,
        required: true,
    },
    date: {
        type: Date,
        required: true,
        default: Date.now()
    }
});
schema.methods.generateAuthToken = function () {
    const token = jwt.sign({_id: this._id,isAdmin: this.isAdmin,name: this.name,email: this.email}, "privateKey")
    return token
}
exports.validation = (data) => {
    const schema = Joi.object({
        name: Joi.string().required().min(3).max(250),
        email: Joi.string()
            .email()
            .required(),
        telephoneNumber: Joi.string().min(10).max(13).required(),
        password: Joi.string().required().min(8),
    });
    return schema.validate(data);
};

exports.UserModel = mongoose.model("User", schema);
