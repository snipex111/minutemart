const mongoose = require('mongoose');
const { Schema } = mongoose;

const ReviewSchema = new Schema({
    // username: {
    //     type: Schema.Types.ObjectId,
    //     ref: 'User'
    // },
    product: {
        type: Schema.Types.ObjectId,
        ref: 'Product'
    },
    rating: {
        type: Number,
        enum: [1, 2, 3, 4, 5]
    },
    reviewbody: {
        type: String
    }
});


module.exports = mongoose.model('Review', ReviewSchema);