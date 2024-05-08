const mongoose = require('mongoose');
const yup = require('yup');

// Define Yup validation schema
const taskSchemaValidation = yup.object().shape({
    task_id: yup.string(),
    department: yup.array().of(
        yup.object().shape({
            dep_id: yup.string(),
            dep_name: yup.string(),
            tag: yup.array().of(yup.string())
        })
    ),
    task_title: yup.string(),
    task_image: yup.string(),
    target_date: yup.date(),
    sub_task: yup.array().of(
        yup.object().shape({
            subtask_title: yup.string(),
            subtask_image: yup.string(),
            subtask_target_date: yup.date()
        })
    ),
    status: yup.boolean(),
    admin_verified: yup.boolean(),
    add_note: yup.boolean(),
    role_type: yup.string().oneOf(['admin']),
    timestamp: yup.date()
});

const taskSchema = new mongoose.Schema({
    task_id: String,
    department: [{
        dep_id: String,
        dep_name: String,
        tag: [String]
    }],
    task_title: String,
    task_image: String,
    target_date: Date,
    sub_task: [{
        subtask_title: String,
        subtask_image: String,
        subtask_target_date: Date
    }],
    status: Boolean,
    admin_verified: { type: Boolean, default: false },
    add_note: Boolean,
    role_type: { type: String, enum: ['admin', 'user'] },
    timestamp: Date
});

// Apply pre-validation hook using Yup
taskSchema.pre('validate', async function (next) {
    try {
        await taskSchemaValidation.validate(this.toObject(), { abortEarly: false });
        next();
    } catch (error) {
        next(error);
    }
});

module.exports = mongoose.model('Task', taskSchema);
