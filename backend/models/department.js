const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
    department_name: {
        type: String,
        required: true,
        unique: true
    }
}, {
    timestamps: true // Enable timestamps
});

const Department = mongoose.model('Department', departmentSchema);

module.exports = Department;
