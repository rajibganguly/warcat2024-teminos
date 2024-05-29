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

// Helper function to combine date and time
const combineDateAndTime = (date, time) => {
    const [hours, minutes] = time.split(':').map(Number);
    const combinedDate = new Date(date);
    combinedDate.setHours(hours, minutes, 0, 0);
    return combinedDate;
};

// Updated fetchMeetings function to accept a time range and combine date and time
// Updated fetchMeetings function to accept a time range and combine date and time
const fetchMeetings = async (depIds, roleType, now, oneHourBefore) => {
    const meetings = await Meeting.find({
        departmentIds: { $in: depIds },
        tag: { $regex: new RegExp(roleType, 'i') }
    });

    // Iterate over meetings and filter based on conditions
    for (const meeting of meetings) {
        const meetingDate = new Date(meeting.selectDate);
        const [hours, minutes] = meeting.selectTime.split(':').map(Number);
        meetingDate.setHours(hours, minutes);

        // Check if the meetingDate is after oneHourBefore and if reminder_mail is false
        const isInPreviousHour = meetingDate >= oneHourBefore;

        if (isInPreviousHour && !meeting.reminder_mail) {
            // Update the meeting document in the database to indicate that a reminder email has been sent
            await Meeting.findByIdAndUpdate(meeting._id, { reminder_mail: true });
        }
    }

    // Filter meetings where reminder_mail is still false
    const filteredMeetings = meetings.filter(meeting => !meeting.reminder_mail);

    return filteredMeetings;
};



const sendReminderEmails = async () => {

    try {
        const users = await User.find();

        const now = new Date();
        const oneHourBefore = new Date(now.getTime() - 60 * 60 * 1000); // Calculate one hour before

        for (const user of users) {
            const depIds = user.departments.map(department => department.dep_id);

            // Find tasks scheduled within the previous hour
            const incompleteTasks = await Task.find({
                'department.dep_id': { $in: depIds },
                'department.tag': { $regex: new RegExp(user.role_type, 'i') },
                status: { $in: ['in progress', 'initiated'] }, // Filter for desired statuses
                target_date: { $gte: oneHourBefore, $lt: now }, // Use oneHourBefore and now
                reminder_mail: false
            });

            // Fetch meetings scheduled within the previous hour
            const meetings = await fetchMeetings(depIds, user.role_type, now, oneHourBefore);
            console.log(meetings + 'meetings');
            // Check if there are incomplete tasks or meetings scheduled
            if (incompleteTasks && incompleteTasks?.length > 0 || meetings && meetings?.length > 0) {
                let emailBody = `Dear ${user.name},\n\n`;

                // Add tasks to email body
                if (incompleteTasks.length > 0) {
                    emailBody += `You have the following tasks scheduled within the previous hour:\n\n`;
                    incompleteTasks.forEach((task, index) => {
                        emailBody += `Task ${index + 1}:\n`;
                        emailBody += `Title: ${task.task_title}\n`;
                        emailBody += `Target Date: ${task.target_date}\n\n`;
                        task.reminder_mail = true;
                        task.save();
                    });
                    emailBody += '\n';
                }

                // Add meetings to email body
                if (meetings.length > 0) {
                    console.log('Sending reminder emails...');
                    emailBody += `You have the following meetings scheduled within the previous hour:\n\n`;
                    meetings.forEach((meeting, index) => {
                        emailBody += `Meeting ${index + 1}:\n`;
                        emailBody += `Topic: ${meeting.topic}\n`;
                        emailBody += `Time: ${meeting.selectTime}\n\n`;
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

// Run the sendReminderEmails function every 3 seconds for testing
cron.schedule('0 * * * *', sendReminderEmails);



