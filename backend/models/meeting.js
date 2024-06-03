const mongoose = require('mongoose');
const yup = require('yup');

// Define Yup validation schema
const meetingSchemaValidation = yup.object().shape({
    meetingId: yup.string().required(),
    departmentIds: yup.array().of(yup.string().required()),
    tag: yup.array().of(yup.string().required()).required(),
    meetingTopic: yup.string().required(),
    selectDate: yup.date().required(),
    selectTime: yup.string().required(),
    imageUrl: yup.string().nullable()
});

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
        type: [String], // Updated to define tag as an array of strings
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
    },
    reminder_mail: { type: Boolean, default: false },
    timestamp: { type: Date, default: Date.now },
});

// Apply pre-validation hook using Yup
meetingSchema.pre('validate', async function (next) {
    try {
        await meetingSchemaValidation.validate(this.toObject(), { abortEarly: false });
        next();
    } catch (error) {
        next(error);
    }
});
meetingSchema.index({ selectDate: 1 });
meetingSchema.index({ meetingTopic: 1 });
module.exports = mongoose.model('Meeting', meetingSchema);
