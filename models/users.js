const mongoose = require('mongoose');
const { Schema } = mongoose;
const passportlocalmongoose = require('passport-local-mongoose');
const UserSchema = new Schema({
    // username: {
    //     type: String,
    //     required: true,
    //     unique: true
    // },
    email: {
        type: String,
        required: true,
        unique: true
    },
    // password: {
    //     type: String,
    //     required: true
    // },
    orders: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Order'
        }
    ]
});

UserSchema.plugin(passportlocalmongoose);
module.exports = mongoose.model('User', UserSchema);