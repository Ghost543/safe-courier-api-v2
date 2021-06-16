const mongoose = require("./model")
const Joi = require("joi")

const schema = new mongoose.Schema({
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    pickUp: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Location"
    },
    parcelType: {
        type: String,
        required: true
    },
    parcelWeight: {
        type: Number,
        required: true
    },
    destination: {
        recieverName: {
            type: String,
            required: true
        },
        reciverEmail: {
            type: String,
        },
        reciverTel: {
            type: String,
            required: true
        },
        region: {
            type: String,
            required: true
        },
        coordinates: {
            lat: Number,
            lng: Number
        }
    },
    presentLocation: {
        region: {
            type: String,
        },
        coordinates: {
            lat: Number,
            lng: Number
        }
    },
    status: {
        type: String,
        required: true,
        default: "pending"
    },
    date: {
        type: Date,
        required: true,
        default: Date.now()
    }
},{timestamps: true})

schema.methods.isOrderOwner = function (id) {
    if (this.owner._id == id) {
        return true;
    } else {
        return false;
    }
};

exports.validation = (data) => {
    const schema = Joi.object({
        parcelType: Joi.string().required(),
        parcelWeight: Joi.number().required(),
        receiverName: Joi.string().required(),
        receiverEmail: Joi.string().email(),
        receiverTel: Joi.string().min(10).max(13).required(),
        destinationRegion: Joi.string().required(),
        destinationLat: Joi.number(),
        destinationLng: Joi.number()
    })
    return schema.validate(data);
};
exports.OrderModel = mongoose.model("Order",schema)