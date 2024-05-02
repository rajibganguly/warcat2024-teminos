const nodemailer = require('nodemailer');
require('dotenv').config();
// Create a transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'rakshitsoumen4@gmail.com', // Your Gmail email address
        pass: 'suya ywtk avkg caox' // Your Gmail password
    }
});

// Function to send registration email
exports.sendRegistrationEmail = async (email, password,dpartment_name,role_type) => {
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

