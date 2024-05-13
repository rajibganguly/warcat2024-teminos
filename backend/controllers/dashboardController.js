const User = require('../models/user');
const Department = require('../models/department');
const Meeting = require('../models/meeting');
const Task = require('../models/task'); 

exports.getStatistics = async (req, res) => {
    const { userId, role_type } = req.body; // Extract userId and role_type from request body

    try {
        if (role_type === 'admin') {
            // If role_type is 'admin', retrieve all statistics
            const totalDepartments = await Department.countDocuments();
            const completedTasks = await Task.countDocuments({ status: 'completed' });
            const totalMeetings = await Meeting.countDocuments();
            const assignedTasks = await Task.countDocuments();

            return res.status(200).json({
                totalDepartments,
                completedTasks,
                totalMeetings,
                assignedTasks
            });
        }

        // Find the user by userId
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ statusTxt: "error", message: 'User not found' });
        }

        // Check if the user role_type is 'head_of_office' or 'secretary'
        if (user.role_type !== role_type && user.role_type !== role_type) {
            return res.status(403).json({ statusTxt: "error", message: 'User is not authorized to access statistics' });
        }

        // Get the department IDs of the user
        const depIds = user.departments.map(department => department.dep_id);

        // Find total departments associated with the user's departments
        const totalDepartments = await Department.countDocuments({ _id: { $in: depIds } });

        // Find completed tasks associated with the user's departments
        const completedTasks = await Task.countDocuments({ 'department.dep_id': { $in: depIds }, status: 'completed' });

        // Find total meetings associated with the user's departments
        const totalMeetings = await Meeting.countDocuments({ departmentIds: { $in: depIds } });

        // Find assigned tasks associated with the user's departments
        const assignedTasks = await Task.countDocuments({ 'department.dep_id': { $in: depIds } });

        return res.status(200).json({
            totalDepartments,
            completedTasks,
            totalMeetings,
            assignedTasks
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ statusTxt: "error", message: 'An error occurred while processing your request' });
    }
};
