const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    name: {
        type: String
       // required: true
    },
    role_type: {
        type: String,
        required: true
    },
    departments: [{
        dep_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Department'
        },
        dep_name: String
    }],
    phone_number: String,
    designation: String
});

const User = mongoose.model('User', userSchema);

module.exports = User;
