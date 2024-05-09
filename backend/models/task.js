const mongoose = require('mongoose');

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
    status: { type: String, default: 'initiated' },
    admin_verified: { type: Number, default: 0 },
    add_note: { type: Boolean, default: false },
    task_add_by: { type: String, enum: ['admin'], default: 'admin' },
    timestamp: { type: Date, default: Date.now }
});

// Compile the schema into a model
const Task = mongoose.model('Task', taskSchema);

module.exports = Task;
