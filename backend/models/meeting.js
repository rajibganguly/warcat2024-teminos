const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema({
    meetingId: {
        type: String,
        required: true
    },
    departmentIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department'
    }],
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
    imageUrl: {
        type: String,
        default: null
    }
});

module.exports = mongoose.model('Meeting', meetingSchema);
