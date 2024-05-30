const nodemailer = require('nodemailer');
const cron = require('node-cron');
const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../models/user');
const Task = require('../models/task');
const Meeting = require('../models/meeting');

// Create a transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.NOTIFICATION_EMAIL, // Your Gmail email address
        pass: process.env.NOTIFICATION_EMAIL_PASSWORD // Your Gmail password
    }
});




// Schedule the functions to run every 2 minutes



cron.schedule('* * * * *', async () => {
    try {

        await sendReminderEmailsForMeeting();
        await sendReminderEmailsForTask();
    } catch (error) {
        console.error('Error in cron job:', error);
    }
});


