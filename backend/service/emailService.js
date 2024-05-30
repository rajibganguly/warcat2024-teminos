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

        // console.log('Email sent: ', info.messageId);
    } catch (error) {
        console.error('Error sending email: ', error);
        throw new Error('Error sending email');
    }
};

// Function to send meeting added email
exports.sendMeetingAddedEmail = async (emails, meetingDetails, flag) => {
    console.log('meetingUser.emailmeetingUser.emailmeetingUser.email')
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

            // console.log('Email sent: ', info.messageId);
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

        //console.log('Email sent: ', info.messageId);
    } catch (error) {
        console.error('Error sending email: ', error);
        throw new Error('Error sending email');
    }
};


const sendReminderEmailsForMeeting = async () => {
    try {
        const now = new Date();
        now.setSeconds(0, 0); // Set seconds and milliseconds to 0
        // Fetch all meetings
        const meetings = await Meeting.find().maxTimeMS(60000);

        for (const meeting of meetings) {
            const meetingDate = new Date(meeting.selectDate);
            const [hours, minutes] = meeting.selectTime.split(':').map(Number);
            meetingDate.setHours(hours, minutes, 0, 0);

            // Calculate one hour before the meeting time
            const oneHourBeforeMeeting = new Date(meetingDate.getTime() - 60 * 60 * 1000);
            oneHourBeforeMeeting.setSeconds(0, 0); // Set seconds and milliseconds to 0

            // Check if the current time is exactly one hour before the meeting time
            const isOneHourBefore = now.getTime() === oneHourBeforeMeeting.getTime();

            if (isOneHourBefore && !meeting.reminder_mail) {
                const meetingDepIds = meeting.departmentIds;
                console.log(meetingDepIds, 'meetingDepIds');
                const meetingTags = meeting.tag;
                const meetingUsers = await User.find({
                    'departments.dep_id': { $in: meetingDepIds },
                    role_type: { $in: meetingTags.map(tag => new RegExp(tag, 'i')) } // Match any tag in meetingTags
                });
                console.log(meetingUsers, 'meetingUsersmeetingUsers');
                for (const meetingUser of meetingUsers) {
                    console.log(meetingUser.email, 'meetingUser.email')
                    let emailBody = `Dear ${meetingUser.name},\n\n`;
                    emailBody += `You have the following meeting scheduled in one hour:\n\n`;
                    emailBody += `Meeting Topic: ${meeting.meetingTopic}\n`;
                    emailBody += `Meeting Date: ${meeting.selectDate}\n`;
                    emailBody += `Time: ${meeting.selectTime}\n\n`;

                    let info = await transporter.sendMail({
                        from: '"Warcat" <admin@warcat.com>',
                        to: meetingUser.email,
                        subject: 'Meeting Reminder Mail',
                        text: emailBody
                    });
                }

                // Mark the reminder email as sent
                await Meeting.findByIdAndUpdate(meeting._id, { reminder_mail: true });
            }
        }
    } catch (error) {
        console.error('Error sending meeting reminder emails: ', error);
        throw new Error('Error sending meeting reminder emails');
    }
};


const sendReminderEmailsForTask = async () => {
    try {
        const now = new Date();
        now.setSeconds(0, 0); // Set seconds and milliseconds to 0
console.log(now,'now')
        // Fetch tasks that need reminder emails
        const tasks = await Task.find({
            status: { $in: ['inProgress', 'initiated'] },
            reminder_mail: false
        });

        for (const task of tasks) {
            const targetDate = new Date(task.target_date);
            targetDate.setSeconds(0, 0); 

            // Calculate one hour before the target date
            const oneHourBefore = new Date(targetDate.getTime() - 60 * 60 * 1000);
            oneHourBefore.setSeconds(0, 0); 
            console.log(tasks,'oneHourBefore')
            // Check if the current time is exactly one hour before the target date
            if (now === oneHourBefore) {
                const depId = task.department.dep_id;
                console.log(depId, 'depId');

                // Fetch users associated with the task's department ID
                const users = await User.find({
                    'departments.dep_id': depId,
                    role_type: { $regex: new RegExp(task.department.tag, 'i') }
                });

                console.log(users, 'users');
                for (const user of users) {
                    let emailBody = `Dear ${user.name},\n\n`;
                    emailBody += `You have the following task scheduled within the previous hour:\n\n`;
                    emailBody += `Task Title: ${task.task_title}\n`;
                    emailBody += `Target Date: ${task.target_date}\n\n`;

                    let info = await transporter.sendMail({
                        from: '"Warcat" <admin@warcat.com>',
                        to: user.email,
                        subject: 'Task Reminder Mail',
                        text: emailBody
                    });

                    // Mark the reminder email as sent
                    //await Task.findByIdAndUpdate(task._id, { reminder_mail: true });
                }
            }
        }
    } catch (error) {
        console.error('Error sending task reminder emails: ', error);
        throw new Error('Error sending task reminder emails');
    }
};





// Schedule the functions to run every 2 minutes



cron.schedule('* * * * *', async () => {
    try {

        await sendReminderEmailsForMeeting();
        await sendReminderEmailsForTask();
    } catch (error) {
        console.error('Error in cron job:', error);
    }
});


