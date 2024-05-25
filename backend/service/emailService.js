const nodemailer = require('nodemailer');
require('dotenv').config();
// Create a transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.NOTIFICATION_EMAIL, // Your Gmail email address
        pass: process.env.NOTIFICATION_EMAIL_PASSWORD // Your Gmail password
    }
});

// Function to send registration email
exports.sendRegistrationEmail = async (email, password, dpartment_name, role_type) => {
    try {
        // Send mail with defined transport object
        let info = await transporter.sendMail({
            from: '"Warcat" <admin@warcat.com>',
            to: email, // Receiver's email address
            subject: 'Registration Successful',
            text: `Welcome to our platform! 
            You are added under ${dpartment_name} department. Your role type is : ${role_type},
            Your registration was successful. Your email: ${email}, Your password: ${password}`
        });

        console.log('Email sent: ', info.messageId);
    } catch (error) {
        console.error('Error sending email: ', error);
        throw new Error('Error sending email');
    }
};

exports.sendMeetingAddedEmail = async (emails, meetingDetails) => {
    try {
        // Send mail with defined transport object
        if (emails) {
            let info = await transporter.sendMail({
                from: 'Warcat',
                to: emails, // Array of receiver's email addresses
                subject: 'Meeting Added Successfully',
                text: `Dear User, 
                Your meeting has been added successfully. 
                Meeting Details:
                Topic: ${meetingDetails.meetingTopic}
                Date: ${meetingDetails.selectDate}
                Time: ${meetingDetails.selectTime}`
                // Department IDs: ${meetingDetails.departmentIds.join(', ')}
                // Tags: ${meetingDetails.tag.join(', ')}
                // Image URL: ${meetingDetails.imageUrl}`
            });
        }
        console.log('Email sent: ', info.messageId);
    } catch (error) {
        console.error('Error sending email: ', error);
        throw new Error('Error sending email');
    }
};

exports.sendTaskAddedEmail = async (emails) => {
    try {
        // Send mail with defined transport object
        if (emails && emails.length > 0) {
            let info = await transporter.sendMail({
                from: 'Warcat',
                to: emails.join(', '), // Join the array of receiver's email addresses
                subject: 'Task Added Successfully',
                text: `Dear User, 
                Your task has been added successfully.`
                // Task Image: ${taskDetails.task_image}`
            });
        } else {
            console.log('No email addresses provided to send task added email.');
        }
    } catch (error) {
        console.error('Error sending email: ', error);
        throw new Error('Error sending email');
    }
};