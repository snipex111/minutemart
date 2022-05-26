const mongoose = require('mongoose');
const { Schema } = mongoose;

const ProductSchema = new Schema({
    name: {
        type: String,
        required: true

    },
    price: {
        type: Number,
        required: true
    },
    image: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true

    },
    avgrating: {
        type: Number
    },
    category: {
        type: String,
        required: true
    },
    author:
    {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    reviews: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Review'
        }
    ],
    available: {
        type: Number
    },
    quantity: {
        type: Number,
        default: 0
    },
    orders: [
        {
            orderid: {
                type: Schema.Types.ObjectId,
                ref: 'Order'
            },
            quantity: Number
        }
    ]
});


module.exports = mongoose.model('Product', ProductSchema);