const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema({
    departmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department', // Assuming you have a Department model
        required: true
    },
    tag: {
        type: String,
        required: true
    },
    meetingTopic: {
        type: String,
        required: true
    },
    selectDate: {
        type: Date,
        required: true
    },
    selectTime: {
        type: String,
        required: true
    },
    imageUrl: String // Optional field for storing image URL
});

const Meeting = mongoose.model('Meeting', meetingSchema);

module.exports = Meeting;
