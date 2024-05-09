const Task = require('../models/task'); // Import Task model
const yup = require('yup');
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

// API endpoint for adding tasks
exports.addTask = async function(req, res) {
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
exports.getTask = async function(req, res) {
    const { role_type } = req.body; // Assuming role_type is provided in the request body

    try {
        let tasks = [];

        if (role_type === 'admin') {
            // Fetch all tasks
            tasks = await Task.find();
        } else if (role_type === 'secretary') {
            // Fetch tasks based on 'secretary' tag within the department
            tasks = await Task.find({ 'department.tag': 'secretary' });
        }
        else if (role_type === 'head_of_office') {
            // Fetch tasks based on 'secretary' tag within the department
            tasks = await Task.find({ 'department.tag': 'head_of_office' });
        } else {
            return res.status(400).json({ message: 'Invalid role type' });
        }

        // Check if tasks were found
        if (!tasks || tasks.length === 0) {
            return res.status(404).json({ message: 'No tasks found' });
        }

        // Return the fetched tasks
        res.status(200).json({ message: 'Tasks retrieved successfully', tasks });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
