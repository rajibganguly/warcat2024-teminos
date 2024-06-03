const nodemailer = require('nodemailer');
const cron = require('node-cron');
const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../models/user');
const Task = require('../models/task');
const Meeting = require('../models/meeting');
const moment = require('moment-timezone');

mongoose.connect(process.env.MONGODB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 30000, // 30 seconds
    socketTimeoutMS: 45000, // 45 seconds
});


// Create a transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.NOTIFICATION_EMAIL, // Your Gmail email address
        pass: process.env.NOTIFICATION_EMAIL_PASSWORD // Your Gmail password
    }
});


const sendReminderEmailsForMeeting = async () => {
    try {
        const now = moment().tz('Asia/Kolkata').seconds(0).milliseconds(0).toDate();

        // Fetch all meetings
        const meetings = await Meeting?.find()?.maxTimeMS(60000);

        for (const meeting of meetings) {
            const meetingDate = moment(meeting.selectDate).tz('Asia/Kolkata');
            const [hours, minutes] = meeting.selectTime.split(':').map(Number);
            meetingDate.set({ hour: hours, minute: minutes, second: 0, millisecond: 0 });

            // Calculate one hour before the meeting time
            const oneHourBeforeMeeting = meetingDate.clone().subtract(1, 'hour').seconds(0).milliseconds(0).toDate();

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
                    const htmlContent = `
                    <!DOCTYPE html>
                    <html lang="en">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Warcat Mail</title>
                        <link rel="preconnect" href="https://fonts.googleapis.com">
                        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                        <link href="https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,100;0,300;0,400;0,500;0,700;0,900;1,100;1,300;1,400;1,500;1,700;1,900&display=swap" rel="stylesheet">
                    </head>
                    <body style="margin: 0;padding: 0;font-family: 'Roboto', sans-serif; color: #2d2d2d;">
                        <section style="background-color: #F4F5FF; display: flex; justify-content: center;">
                            <div style="width: 100%;">
                                <div style="background-color: #fff; padding: 32px; height: fit-content; border-radius: 4px;box-shadow: rgba(99, 99, 99, 0.2) 0px 2px 8px 0px; margin-top: 20px;">
                                    <div style="margin-bottom: 30px;">
                                        <div style="display: flex; align-items: center; column-gap: 2px; margin-left: -6px;">
                                            <img src="https://develop.d1g0aga5817ond.amplifyapp.com/static/media/logo-dark-sm-removebg-preview.028e6f8b4a37ccf919cc.png" alt="" height="54px">
                                            <h1 style="color: rgb(10, 0, 119);">WARCAT</h1>
                                        </div>
                                    </div>
                                    <div>
                                        <p style="margin: 0 0 8px;">Dear ${meetingUser.name},</p>
                                        <h2 style="margin-top: 0px;">You have the following meeting scheduled in one hour:</h2>
                                        <hr>
                                        <p>Meeting Details:</p>
                                        <b>
                                            <p>Meeting Topic: ${meeting.meetingTopic}</p>
                                            <p>Meeting Date: ${meeting.selectDate}</p>
                                            <p>Time: ${meeting.selectTime}</p>
                                        </b>
                                    </div>
                                </div>
                                <div style="background-color: transparent; padding: 10px 32px 48px; height: fit-content;">
                                    
                                    <p style="font-size: 11px;margin-top: 0;">You have received this email because you are registered at WARCAT, to ensure the implementation of our Terms of Service and (or) for other legitimate matters.</p>
                                    <a style="font-size: 11px;color: rgb(103, 103, 103);" href="#">Privacy Policy</a>
                                    <p style="font-size: 11px;">© 2024 WARCAT - War-room Assistant for Report Compilation & Task tracking. 2024.</p>
                                </div>
                            </div>
                        </section>
                    </body>
                    </html>
                    `;

                    let info = await transporter.sendMail({
                        from: '"Warcat" <admin@warcat.com>',
                        to: meetingUser.email,
                        subject: 'Meeting Reminder Mail',
                        text: htmlContent
                    });
                }

                // Mark the reminder email as sent
                await Meeting.findByIdAndUpdate(meeting._id, {
                    $set: { reminder_mail: true }
                });
            }
        }
    } catch (error) {
        console.error('Error sending meeting reminder emails: ', error);
        throw new Error('Error sending meeting reminder emails');
    }
};

const sendReminderEmailsForTask = async () => {
    try {
        const now = moment().tz('Asia/Kolkata').seconds(0).milliseconds(0).toDate();
        console.log(now, 'now');

        // Fetch tasks that need reminder emails
        const tasks = await Task.find({
            status: { $in: ['inProgress', 'initiated'] },
            reminder_mail: false
        });

        for (const task of tasks) {
            const targetDate = moment(task.target_date).tz('Asia/Kolkata').seconds(0).milliseconds(0).toDate();

            // Calculate one hour before the target date
            const oneHourBefore = moment(targetDate).tz('Asia/Kolkata').subtract(1, 'hour').seconds(0).milliseconds(0).toDate();
            console.log(oneHourBefore, 'oneHourBefore');

            // Check if the current time is exactly one hour before the target date
            if (now.getTime() === oneHourBefore.getTime()) {
                for (const department of task.department) {  // Iterate over the array of departments
                    const depId = department.dep_id;
                    console.log(depId, 'depId');

                    // Fetch users associated with the task's department ID
                    const users = await User.find({
                        'departments.dep_id': depId,
                        role_type: { $regex: new RegExp(department.tag.join('|'), 'i') }  // Handle multiple tags
                    });

                    console.log(users, 'users');
                    for (const user of users) {
                        const htmlContent = `
                        <!DOCTYPE html>
                        <html lang="en">
                        <head>
                            <meta charset="UTF-8">
                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                            <title>Warcat Mail</title>
                            <link rel="preconnect" href="https://fonts.googleapis.com">
                            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                            <link href="https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,100;0,300;0,400;0,500;0,700;0,900;1,100;1,300;1,400;1,500;1,700;1,900&display=swap" rel="stylesheet">
                        </head>
                        <body style="margin: 0;padding: 0;font-family: 'Roboto', sans-serif; color: #2d2d2d;">
                            <section style="background-color: #F4F5FF; display: flex; justify-content: center;">
                                <div style="width: 100%;">
                                    <div style="background-color: #fff; padding: 32px; height: fit-content; border-radius: 4px;box-shadow: rgba(99, 99, 99, 0.2) 0px 2px 8px 0px; margin-top: 20px;">
                                        <div style="margin-bottom: 30px;">
                                            <div style="display: flex; align-items: center; column-gap: 2px; margin-left: -6px;">
                                                <img src="https://develop.d1g0aga5817ond.amplifyapp.com/static/media/logo-dark-sm-removebg-preview.028e6f8b4a37ccf919cc.png" alt="" height="54px">
                                                <h1 style="color: rgb(10, 0, 119);">WARCAT</h1>
                                            </div>
                                        </div>
                                        <div>
                                            <p style="margin: 0 0 8px;">Dear ${user.name},</p>
                                            <h2 style="margin-top: 0px;">You have the following task scheduled within the previous hour:</h2>
                                            <hr>
                                            <p>Task Details:</p>
                                            <b>
                                                <p>Task Title: ${task.task_title}</p>
                                                <p>Target Date: ${task.target_date}</p>
                                            </b>
                                        </div>
                                    </div>
                                    <div style="background-color: transparent; padding: 10px 32px 48px; height: fit-content;">
                                        
                                        <p style="font-size: 11px;margin-top: 0;">You have received this email because you are registered at WARCAT, to ensure the implementation of our Terms of Service and (or) for other legitimate matters.</p>
                                        <a style="font-size: 11px;color: rgb(103, 103, 103);" href="#">Privacy Policy</a>
                                        <p style="font-size: 11px;">© 2024 WARCAT - War-room Assistant for Report Compilation & Task tracking. 2024.</p>
                                    </div>
                                </div>
                            </section>
                        </body>
                        </html>
                        `;

                        let info = await transporter.sendMail({
                            from: '"Warcat" <admin@warcat.com>',
                            to: user.email,
                            subject: 'Task Reminder Mail',
                            text: htmlContent
                        });
                    }
                    await Meeting.findByIdAndUpdate(task._id, {
                        $set: { reminder_mail: true }
                    });
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




