const Task = require('../models/task'); // Import Task model
const yup = require('yup');
const User = require('../models/user');
const { v4: uuidv4 } = require('uuid');
const { sendTaskAddedEmail } = require('../service/emailService');
const ObjectId = require('mongodb').ObjectId;
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
            dep.tasks.map(taskData => {
                let target_date = new Date(taskData.targetDate); 
                let current_time = new Date();
                target_date.setHours(current_time.getHours());
                target_date.setMinutes(current_time.getMinutes());
               // target_date.setSeconds(current_time.getSeconds());
        
                return {
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
                    target_date: target_date 
                };
            })
        );
        

        // Create and save all tasks concurrently
        const newTasks = await Task.insertMany(allTasks);
        // Find users based on the dep_id
        const depId = department.map(dep => dep.dep_id);
        const tagValues = department.map(dep => dep.tag);
        const flattenedTagValues = tagValues.flat();
        const users = await User.find({ 'departments.dep_id': { $in: depId } });
        const userEmails = [];
        // Filter users based on their role types matching any of the tags specified in the tag array
        users?.forEach(user => {
            const matches = flattenedTagValues?.some(role => new RegExp(`^${role}$`, 'i').test(user.role_type));
            if (matches) {
                userEmails.push(user.email);
            }
        });

        if (userEmails?.length > 0) {
            sendTaskAddedEmail(userEmails, newTasks, 'add')
        }
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
    const { userId, role_type } = req.query; // Extract userId and role_type from request body

    try {
        if (role_type === 'admin') {
            // If role_type is 'admin', fetch all tasks
            const tasks = await Task.find().sort({ timestamp: -1});
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

        // Find tasks associated with the user's departments where tag contains specific elements
        const tasks = await Task.find({
            'department.dep_id': { $in: depIds },
            'department.tag': { $regex: new RegExp(role_type, 'i') }
        }).sort({ timestamp: -1});


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
        if (target_date) {
            let current_time = new Date(); // Get the current time
        
            // Set the hours, minutes, and seconds of the target_date object to match the current time
            target_date.setHours(current_time.getHours());
            target_date.setMinutes(current_time.getMinutes());
            //target_date.setSeconds(current_time.getSeconds());
        
            updateFields.target_date = target_date;
        }
        // Extract dep_id into an array
        const depIds = updateFields?.department.map(department => department.dep_id);

        // Extract tags into a flat array (assuming tags need to be unique)
        const tags = [...new Set(updateFields?.department.flatMap(department => department.tag))];

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
        const users = await User.find({ 'departments.dep_id': { $in: depIds } });
        const userEmails = [];
        // Filter users based on their role types matching any of the tags specified in the tag array
        users?.forEach(user => {
            const matches = tags?.some(role => new RegExp(`^${role}$`, 'i').test(user.role_type));
            if (matches) {
                userEmails.push(user.email);
            }
        });
        if (userEmails?.length > 0) {
            sendTaskAddedEmail(userEmails, [updatedTask], 'update')
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

        const target_date = subtask_target_date;
        // Construct subtask object
        const subTask = {
            sub_task_id: uuidv4(), // Generate unique ID for subtask
            parent_task_id: parent_task_id,
            subtask_title,
            target_date,
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

        const target_date = subtask_target_date;
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
        if (subtask_target_date) subTask.target_date = subtask_target_date;

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
        const isAllowed = await Task.findOne({
            task_id: taskId,
            'department.tag': { $in:  new RegExp(role_type, 'i') }
        });

        if (!isAllowed) {
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
        const taskData = await Task.findOne({ task_id: taskId });
        if (!taskData) {
            return res.status(404).json({ error: 'Task not found' });
        }

        // Check if the user role is allowed to add notes based on department tags
        const isAllowed = await Task.findOne({
            task_id: taskId,
            'department.tag': { $in: new RegExp(role_type, 'i') }
        });

        if (!isAllowed) {
            return res.status(403).json({ error: 'User role not allowed to add notes' });
        }

        // If the task is in 'Initiated' status, change it to 'InProgress'
        if (taskData.status === 'inProgress') {
            taskData.status = 'completed';
        }

        // Add the completion details to the task's complate_upload_task_details array
        taskData.complate_upload_task_details.push({ upload_report, description });

        // Save the updated task
        await taskData.save();

        return res.status(201).json({ message: 'Completion details uploaded successfully', taskData });
    } catch (error) {
        // Check if the error is a Yup validation error
        if (error.name === 'ValidationError') {
            return res.status(400).json({ error: error.message });
        }

        console.error('Error uploading completion details:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};




exports.getTaskStatusPercentages = async (req, res) => {
    const { userId, role_type } = req.query; // Extract userId and role_type from request body

    try {
        if (role_type === 'admin') {
            const tasks = await Task.find();

            // If role_type is 'admin', proceed with calculating task status percentages
            return calculateTaskStatusPercentages(res, tasks);
        }

        // Find the user by userId
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Get the department IDs of the user
        const depIds = user.departments.map(department => department.dep_id);

        // Find tasks associated with the user's departments where tag contains specific elements
        const tasks = await Task.find({
            'department.dep_id': { $in: depIds },
            'department.tag': { $regex: new RegExp(role_type, 'i') }
        });

        if (!tasks || tasks.length === 0) {
            return res.status(404).json({ message: 'No tasks found for the user' });
        }

        // Check if the user role_type is 'head_of_office' or 'secretary'
        if (user.role_type !== role_type && user.role_type !== role_type) {
            return res.status(403).json({ error: 'User is not authorized to access task status percentages' });
        }

        // Continue with calculating task status percentages
        return calculateTaskStatusPercentages(res, tasks);
    } catch (error) {
        console.error('Error fetching task status percentages:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// Function to calculate task status percentages
async function calculateTaskStatusPercentages(res, tasks) {
    try {
        const keywords = ["completed", "initiated", "inProgress"]; // Specify the keywords you want to check
        let totalTasks;

        // Check if tasks is a mongoose query or array
        if (tasks.countDocuments) {
            // Get total assigned tasks using countDocuments method
            totalTasks = await tasks.countDocuments();
        } else {
            // Get total assigned tasks by getting the length of the array
            totalTasks = tasks.length;
        }

        // Initialize an object to store percentages for each keyword
        const keywordData = {};
        const monthWiseCounts = {};

        // Loop through each keyword and calculate its percentage
        for (const keyword of keywords) {
            let keywordTasksCount;

            // Count the number of tasks with the current keyword in the "status" field
            if (keyword === "completed") {
                keywordTasksCount = tasks.filter(task => task.status === keyword && task.admin_verified === 1).length;
            } else {
                keywordTasksCount = tasks.filter(task => task.status === keyword).length;
            }

            // Calculate the percentage of tasks with the current keyword
            const keywordPercentage = (keywordTasksCount / totalTasks) * 100;

            // Store the percentage in the object
            keywordData[keyword] = {
                count: keywordTasksCount,
                percentage: keywordPercentage ? keywordPercentage.toFixed(2) : ''
            };
        }

        // Add the totalAssigned to the response object
        keywordData.totalAssigned = totalTasks;

        // Loop through each task to count tasks per month
        tasks.forEach(task => {
            const date = new Date(task.timestamp);
            const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;

            if (!monthWiseCounts[monthYear]) {
                monthWiseCounts[monthYear] = {
                    completed: 0,
                    initiated: 0,
                    inProgress: 0,
                    total: 0
                };
            }

            // Increment the total count for the month
            monthWiseCounts[monthYear].total++;

            // Increment the count for the respective status
            if (task.status === 'completed' && task.admin_verified === 1) {
                monthWiseCounts[monthYear].completed++;
            } else if (task.status === 'initiated') {
                monthWiseCounts[monthYear].initiated++;
            } else if (task.status === 'inProgress') {
                monthWiseCounts[monthYear].inProgress++;
            }
        });

        // Add the month-wise counts to the response object
        keywordData.monthWiseCounts = monthWiseCounts;

        // Return the percentages and month-wise counts in JSON response
        return res.status(200).json(keywordData);
    } catch (error) {
        console.error('Error fetching task status percentages:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}





exports.setAdminVerified = async (req, res) => {
    const { task_id, userId, flag } = req.body;

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
            task.admin_verified = flag;
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
