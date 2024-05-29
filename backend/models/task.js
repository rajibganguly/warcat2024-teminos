const mongoose = require('mongoose');
const { string } = require('yup');

const taskSchema = new mongoose.Schema({
    task_id: String,
    department: [{
        dep_id: String,
        dep_name: String,
        tag: [String]
    }],
    task_title: String,
    task_image: String,
    meetingId: String,
    target_date: Date,
    sub_task: [{
        sub_task_id :String,
        parent_task_id: String,
        subtask_title: String,
        subtask_image: String,
        target_date: Date,
        timestamp: { type: Date, default: Date.now }
    }],
    status: { type: String, default: 'initiated' },
    admin_verified: { type: Number, default: 0 },
    reminder_mail: { type: Boolean, default: false },
    note_details :[{ 
        note_description :String,
        note_written_by: String,
        timestamp: { type: Date, default: Date.now }
    }],
    complate_upload_task_details :[{
        upload_report :String,
        description : String,
    }],
    task_add_by: { type: String, enum: ['admin'], default: 'admin' },
    timestamp: { type: Date, default: Date.now }
});

// Compile the schema into a model
const Task = mongoose.model('Task', taskSchema);

module.exports = Task;
