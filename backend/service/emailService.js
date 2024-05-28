const nodemailer = require('nodemailer');
const cron = require('node-cron');
const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../models/user');
const Task = require('../models/task');

// Create a transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.NOTIFICATION_EMAIL, // Your Gmail email address
        pass: process.env.NOTIFICATION_EMAIL_PASSWORD // Your Gmail password
    }
});

// Function to send registration email
exports.sendRegistrationEmail = async (email, password, department_name, role_type) => {
    try {
        let info = await transporter.sendMail({
            from: '"Warcat" <admin@warcat.com>',
            to: email,
            subject: 'Registration Successful',
            text: `Welcome to our platform! 
            You are added under ${department_name} department. Your role type is : ${role_type},
            Your registration was successful. Your email: ${email}, Your password: ${password}`
        });

        console.log('Email sent: ', info.messageId);
    } catch (error) {
        console.error('Error sending email: ', error);
        throw new Error('Error sending email');
    }
};

// Function to send meeting added email
exports.sendMeetingAddedEmail = async (emails, meetingDetails, flag) => {
    try {
        if (emails && emails.length > 0) {
            const updateText = flag === 'update' ? 'Updated' : 'Added';
            let info = await transporter.sendMail({
                from: '"Warcat" <admin@warcat.com>',
                to: emails.join(','),
                subject: `Meeting ${updateText} Successfully`,
                text: `Dear User,
                Your meeting has been ${updateText} successfully.
                Meeting Details:
                Topic: ${meetingDetails.meetingTopic}
                Date: ${meetingDetails.selectDate}
                Time: ${meetingDetails.selectTime}`
            });

            console.log('Email sent: ', info.messageId);
        } else {
            console.error('No emails provided');
        }
    } catch (error) {
        console.error('Error sending email: ', error);
        throw new Error('Error sending email');
    }
};

// Function to send task added email
exports.sendTaskAddedEmail = async (emails, taskDetails, flag) => {
    try {
        const updateText = flag === 'update' ? 'Updated' : 'Added';
        let emailBody = `Dear User,\n\nYour task has been ${updateText} successfully.\n\nTask Details:\n`;

        taskDetails.forEach((task, index) => {
            emailBody += `Task ${index + 1}:\n`;
            emailBody += `Title: ${task.task_title}\n`;
            emailBody += `Target Date: ${task.target_date}\n\n`;
        });

        let info = await transporter.sendMail({
            from: '"Warcat" <admin@warcat.com>',
            to: emails.join(', '),
            subject: `Task ${updateText} Successfully`,
            text: emailBody
        });

        console.log('Email sent: ', info.messageId);
    } catch (error) {
        console.error('Error sending email: ', error);
        throw new Error('Error sending email');
    }
};

// Function to send reminder emails for tasks due within the next day
// Function to fetch meetings
const fetchMeetings = async (depIds, roleType, targetDate) => {
    return Meeting.find({
        departmentIds: { $in: depIds },
        tag: { $regex: new RegExp(roleType, 'i') },
        timestamp: { $gt: targetDate } // Filter meetings based on timestamp
    });
};

// Function to send reminder emails for tasks and meetings
const sendReminderEmails = async () => {
    try {
        const users = await User.find();

        for (const user of users) {
            const depIds = user.departments.map(department => department.dep_id);

            // Calculate the date one day before the target_date
            const targetDate = new Date();
            targetDate.setDate(targetDate.getDate() - 1);

            // Find incomplete tasks
            const incompleteTasks = await Task.find({
                'department.dep_id': { $in: depIds },
                'department.tag': { $regex: new RegExp(user.role_type, 'i') },
                status: { $in: ['in progress', 'initiated'] }, // Filter for desired statuses
                target_date: targetDate
            });

            // Fetch meetings
            const meetings = await fetchMeetings(depIds, user.role_type, targetDate);

            // Check if there are incomplete tasks or meetings scheduled
            if (incompleteTasks.length > 0 || meetings.length > 0) {
                let emailBody = `Dear ${user.name},\n\n`;

                // Add tasks to email body
                if (incompleteTasks.length > 0) {
                    emailBody += `You have the following tasks that are due one day before ${targetDate}:\n\n`;
                    incompleteTasks.forEach((task, index) => {
                        emailBody += `Task ${index + 1}:\n`;
                        emailBody += `Title: ${task.task_title}\n`;
                        emailBody += `Target Date: ${task.target_date}\n\n`;
                    });
                    emailBody += '\n';
                }

                // Add meetings to email body
                if (meetings.length > 0) {
                    emailBody += `You have the following meetings scheduled after ${targetDate}:\n\n`;
                    meetings.forEach((meeting, index) => {
                        emailBody += `Meeting ${index + 1}:\n`;
                        emailBody += `Topic: ${meeting.topic}\n`;
                        emailBody += `Target Date: ${meeting.timestamp}\n\n`;
                    });
                }

                console.log(user.email);
                let info = await transporter.sendMail({
                    from: '"Warcat" <admin@warcat.com>',
                    to: user.email,
                    subject: 'Task and Meeting Reminder',
                    text: emailBody
                });

                console.log('Reminder email sent: ', info.messageId);
            }
        }
    } catch (error) {
        console.error('Error sending reminder emails: ', error);
        throw new Error('Error sending reminder emails');
    }
};



// Schedule the sendReminderEmails function to run daily at midnight
cron.schedule('0 0 * * *', sendReminderEmails);
