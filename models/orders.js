const { type } = require('express/lib/response');
const mongoose = require('mongoose');
const { Schema } = mongoose;

const OrderSchema = new Schema({
    username: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    deliverystatus: {
        type: String,
        required: true,
        enum: ['Delivered', 'Shipping', 'Processing']
    },
    paymentstatus: {
        type: String,
        required: true,
        enum: ['Paid', 'COD']
    },
    items: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Product'
        }
    ],
    paymentamount: {
        type: Number,
        required: true
    }
});


module.exports = mongoose.model('Order', OrderSchema);