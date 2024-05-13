const Task = require('../models/task'); // Import Task model
const yup = require('yup');
const User = require('../models/user');
const { v4: uuidv4 } = require('uuid');
// Define Yup validation schema for a single task
const taskSchema = yup.object().shape({
    taskTitle: yup.string().required(),
    uploadImage: yup.string().required(), // Changed to required
    targetDate: yup.date().required()
});

// Define Yup validation schema for the entire request body
const departmentSchema = yup.array().of(
    yup.object().shape({
        dep_id: yup.string().required(),
        dep_name: yup.string().required(),
        tag: yup.array().of(yup.string()).required(),
        tasks: yup.array().of(taskSchema).required() // Added tasks validation schema and marked as required
    })
);

const addTaskSchema = yup.object().shape({
    meetingId: yup.string().optional(),
    meetingTopic: yup.string().optional(),
    department: departmentSchema.required() // Department is now required
});

const editTaskSchema = yup.object().shape({
    task_id: yup.string().required(),
    department: yup.array().of(
        yup.object().shape({
            dep_id: yup.string().required(),
            dep_name: yup.string().required(),
            tag: yup.array().of(yup.string()).required()
        })
    ).optional(),
    task_title: yup.string().required(),
    task_image: yup.string().required(),
    target_date: yup.date().required()
});


const addSubTaskSchema = yup.object().shape({
    parent_task_id: yup.string().required(),
    subtask_title: yup.string().required(),
    subtask_target_date: yup.date().required(),
    subtask_image: yup.string().required()
});

const editSubTaskSchema = yup.object().shape({
    sub_task_id: yup.string().required(),
    subtask_title: yup.string().optional(), // Making these fields optional
    subtask_image: yup.string().optional(),
    subtask_target_date: yup.date().optional()
});


const noteSchema = yup.object().shape({
    note_description: yup.string().required(),
    note_written_by: yup.string().required()
});


// Define Yup schema for completion details validation
const completionDetailsSchema = yup.object().shape({
    upload_report: yup.string().required(),
    description: yup.string().required()
});

// API endpoint for adding tasks
exports.addTask = async function (req, res) {
    try {

        // Validate request body
        const { meetingId, meetingTopic, department } = await addTaskSchema.validate(req.body);

        // Flatten the nested array of tasks within each department
        const allTasks = department.flatMap(dep =>
            dep.tasks.map(taskData => ({
                task_id: uuidv4(), // Generate unique UUID
                meetingId,
                meetingTopic,
                department: {
                    dep_id: dep.dep_id,
                    dep_name: dep.dep_name,
                    tag: dep.tag
                },
                task_title: taskData.taskTitle,
                task_image: taskData.uploadImage,
                target_date: taskData.targetDate
            }))
        );

        // Create and save all tasks concurrently
        const newTasks = await Task.insertMany(allTasks);

        res.status(201).json({ message: 'Tasks added successfully', tasks: newTasks });
    } catch (error) {
        // Handle Yup validation errors
        if (error.name === 'ValidationError') {
            return res.status(400).json({ error: error.errors.join(', ') });
        }
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};


// API endpoint for fetching tasks
exports.getTask = async function (req, res) {
    const { userId, role_type } = req.body; // Extract userId and role_type from request body

    try {
        if (role_type === 'admin') {
            // If role_type is 'admin', fetch all tasks
            const tasks = await Task.find();
            return res.status(200).json({ message: 'All tasks retrieved successfully', tasks });
        }

        // Find the user by userId
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if the user role_type is 'head_of_office' or 'secretary'
        if (user.role_type !== role_type && user.role_type !== role_type) {
            return res.status(403).json({ message: 'User is not authorized to access tasks' });
        }

        // Get the department IDs of the user
        const depIds = user.departments.map(department => department.dep_id);

        // Find tasks associated with the user's departments
        const tasks = await Task.find({ 'department.dep_id': { $in: depIds } });

        if (!tasks || tasks.length === 0) {
            return res.status(404).json({ message: 'No tasks found for the user' });
        }

        return res.status(200).json({ message: 'Tasks retrieved successfully', tasks });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};


exports.editTask = async function (req, res) {
    try {
        // Validate request body
        const { task_id, department, tag, task_title, task_image, target_date } = await editTaskSchema.validate(req.body);

        // Construct the update object with provided fields
        const updateFields = {};
        if (department) updateFields.department = department;
        if (tag) updateFields.tag = tag;
        if (task_title) updateFields.task_title = task_title;
        if (task_image) updateFields.task_image = task_image;
        if (target_date) updateFields.target_date = target_date;

        // Find and update the task
        const updatedTask = await Task.findOneAndUpdate(
            { task_id }, // Find by _id or task_id
            { $set: updateFields },
            { new: true } // Return the updated document
        );

        // Check if the task exists
        if (!updatedTask) {
            return res.status(404).json({ message: 'Task not found' });
        }

        res.status(200).json({ message: 'Task updated successfully', task: updatedTask });
    } catch (error) {
        // Handle Yup validation errors
        if (error.name === 'ValidationError') {
            return res.status(400).json({ error: error.errors.join(', ') });
        }
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};


// API endpoint for adding a single subtask to a parent task
exports.addSubTask = async function (req, res) {
    try {
        // Validate request body
        const { parent_task_id, subtask_title, subtask_target_date, subtask_image } = await addSubTaskSchema.validate(req.body);

        // Construct subtask object
        const subTask = {
            sub_task_id: uuidv4(), // Generate unique ID for subtask
            parent_task_id: parent_task_id,
            subtask_title,
            subtask_target_date,
            subtask_image
        };

        // Find the parent task by task_id
        const parentTask = await Task.findOne({ task_id: parent_task_id });

        // Check if the parent task exists
        if (!parentTask) {
            return res.status(404).json({ message: 'Parent task not found' });
        }

        // Add the new subtask to the existing sub_task array
        parentTask.sub_task.push(subTask);

        // Save the updated parent task
        await parentTask.save();

        res.status(201).json({ message: 'Subtask added successfully', subTask });
    } catch (error) {
        // Handle Yup validation errors
        if (error.name === 'ValidationError') {
            return res.status(400).json({ error: error.errors.join(', ') });
        }
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};


exports.editSubTask = async function (req, res) {
    try {
        // Validate request body
        const { sub_task_id, subtask_title, subtask_image, subtask_target_date } = await editSubTaskSchema.validate(req.body);

        // Find the task containing the subtask
        const task = await Task.findOne({ 'sub_task.sub_task_id': sub_task_id });

        // Check if the task exists
        if (!task) {
            return res.status(404).json({ message: 'Task containing the subtask not found' });
        }

        // Find the subtask by its ID
        const subTask = task.sub_task.find(subTask => subTask.sub_task_id === sub_task_id);

        // Check if the subtask exists
        if (!subTask) {
            return res.status(404).json({ message: 'Subtask not found' });
        }

        // Update the subtask details
        if (subtask_title) subTask.subtask_title = subtask_title;
        if (subtask_image) subTask.subtask_image = subtask_image;
        if (subtask_target_date) subTask.subtask_target_date = subtask_target_date;

        // Save the updated task
        await task.save();

        res.status(200).json({ message: 'Subtask updated successfully', task });
    } catch (error) {
        // Handle Yup validation errors
        if (error.name === 'ValidationError') {
            return res.status(400).json({ error: error.errors.join(', ') });
        }
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};


// Controller function to add a note to a task
exports.addNoteToTask = async (req, res) => {
    const taskId = req.params.taskId;
    const { note_description, note_written_by, role_type } = req.body;

    try {
        // Validate the note data
        await noteSchema.validate({ note_description, note_written_by });

        // Find the task by ID
        const task = await Task.findOne({ task_id: taskId });

        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        // Check if the user role is allowed to add notes based on department tags
        const tasks = await Task.find({ 'department.tag': role_type });
        if (!tasks.includes(task)) {
            return res.status(403).json({ error: 'User role not allowed to add notes' });
        }

        // If the task is in 'Initiated' status, change it to 'InProgress'
        if (task.status === 'initiated') {
            task.status = 'inProgress';
        }

        // Add the note to the task's note_details array
        task.note_details.push({ note_description, note_written_by });

        // Save the updated task
        await task.save();

        return res.status(201).json({ message: 'Note added successfully', task });
    } catch (error) {
        // Check if the error is a Yup validation error
        if (error.name === 'ValidationError') {
            return res.status(400).json({ error: error.message });
        }

        console.error('Error adding note:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};




// Controller function to upload completion details for a task
exports.uploadCompletionDetails = async (req, res) => {
    const taskId = req.params.taskId;
    const { upload_report, description, role_type } = req.body;

    try {
        // Validate the completion details
        await completionDetailsSchema.validate({ upload_report, description });

        // Check if the user role is allowed to add notes based on department tags
        const tasks = await Task.find({ 'department.tag': role_type });
        if (!tasks.includes(task)) {
            return res.status(403).json({ error: 'User role not allowed to add report' });
        }
        // Find the task by ID
        const task = await Task.findOne({ task_id: taskId });

        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }


        // If the task is in 'Initiated' status, change it to 'InProgress'
        if (task.status === 'inProgress') {
            task.status = 'completed';
        }

        // Add the completion details to the task's complate_upload_task_details array
        task.complate_upload_task_details.push({ upload_report, description });

        // Save the updated task
        await task.save();

        return res.status(201).json({ message: 'Completion details uploaded successfully', task });
    } catch (error) {
        // Check if the error is a Yup validation error
        if (error.name === 'ValidationError') {
            return res.status(400).json({ error: error.message });
        }

        console.error('Error uploading completion details:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};




// Controller function to get task status percentages
exports.getTaskStatusPercentages = async (req, res) => {
    const { userId, role_type } = req.body; // Extract userId and role_type from request body

    try {
        if (role_type === 'admin') {
            // If role_type is 'admin', proceed with calculating task status percentages
            return calculateTaskStatusPercentages(res);
        }

        // Find the user by userId
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check if the user role_type is 'head_of_office' or 'secretary'
        if (user.role_type !== role_type && user.role_type !== role_type) {
            return res.status(403).json({ error: 'User is not authorized to access task status percentages' });
        }

        // Continue with calculating task status percentages
        return calculateTaskStatusPercentages(res);
    } catch (error) {
        console.error('Error fetching task status percentages:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// Function to calculate task status percentages
async function calculateTaskStatusPercentages(res) {
    try {
        const keywords = ["completed", "initiated", "inProgress"]; // Specify the keywords you want to check

        // Get total assigned tasks
        const totalTasks = await Task.countDocuments();

        // Initialize an object to store percentages for each keyword
        const keywordPercentages = {};

        // Loop through each keyword and calculate its percentage
        for (const keyword of keywords) {
            // Count the number of tasks with the current keyword in the "status" field
            const keywordTasksCount = await Task.countDocuments({ status: keyword });

            // Calculate the percentage of tasks with the current keyword
            const keywordPercentage = (keywordTasksCount / totalTasks) * 100;

            // Store the percentage in the object
            keywordPercentages[keyword] = keywordPercentage.toFixed(2) + '%';
        }
        // Add the totalAssigned to the response object
        keywordPercentages.totalAssigned = totalTasks;
        // Return the percentages in JSON response
        return res.status(200).json(keywordPercentages);
    } catch (error) {
        console.error('Error fetching task status percentages:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}


exports.setAdminVerified = async (req, res) => {
    const { task_id, userId } = req.body;

    try {
        // Find the user by userId
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check if the user's role_type is "admin"
        if (user.role_type === "admin") {
            // Find the task by taskId
            const task = await Task.findOne({ task_id });

            if (!task) {
                return res.status(404).json({ error: 'Task not found' });
            }

            // Update the task's admin_verified status to true
            task.admin_verified = true;
            await task.save();

            return res.status(200).json({ message: 'Admin verification successful', taskId: task._id });
        } else {
            return res.status(403).json({ error: 'User is not an admin' });
        }
    } catch (error) {
        console.error('Error updating admin verification status:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
