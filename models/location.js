const mongoose = require("./model")
const Joi = require("joi")

const schema = new mongoose.Schema({
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    region: {
        type: String,
        required: true
    },
    cordinates: {
        lat: Number,
        lng: Number
    },
    date: {
        type: Date,
        required: true,
        default: Date.now()
    }
})

exports.locationValidation = (data) => {
    const schema = Joi.object({
        pickRegion: Joi.string().required(),
        pickLat: Joi.number(),
        pickLng: Joi.number()
    })
    return schema.validate(data)
}

exports.PickLocationModel = mongoose.model("Location",schema)