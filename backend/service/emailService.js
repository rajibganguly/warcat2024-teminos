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

exports.sendMeetingAddedEmail = async (emails, meetingDetails, flag) => {
    try {
        if (emails && emails.length > 0) {
            const updateText = flag === 'update' ? 'Updated' : 'added';
            let info = await transporter.sendMail({
                from: '"Warcat" <admin@warcat.com>',
                to: emails.join(','), // Convert array of emails to a comma-separated string
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

exports.sendTaskAddedEmail = async (emails, taskDetails, flag) => {
    try {
        const updateText = flag === 'update' ? 'Updated' : 'Added';
        
        // Construct the email body dynamically
        let emailBody = `Dear User,\n\nYour task has been ${updateText} successfully.\n\nTask Details:\n`;
        
        taskDetails.forEach((task, index) => {
            emailBody += `Task ${index + 1}:\n`;
            emailBody += `Title: ${task.task_title}\n`;
            emailBody += `Target Date: ${task.target_date}\n\n`;
        });

        let info = await transporter.sendMail({
            from: '"Warcat" <admin@warcat.com>', // Specify the sender's email
            to: emails.join(', '), // Join the array of receiver's email addresses
            subject: `Task ${updateText} Successfully`,
            text: emailBody
        });

        console.log('Email sent: ', info.messageId);
    } catch (error) {
        console.error('Error sending email: ', error);
        throw new Error('Error sending email');
    }
};