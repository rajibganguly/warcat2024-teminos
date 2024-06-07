const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const User = require('../models/user');
const bcrypt = require('bcrypt');
const Department = require('../models/department');
const yup = require('yup');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// User Login
exports.loginUser = async function (req, res, next) {
    try {
        // Define schema for request body validation using Yup
        const schema = yup.object().shape({
            email: yup.string().email().required(),
            password: yup.string().required(),
            role_type: yup.string().required()
        });

        // Validate request body against the schema
        await schema.validate(req.body);

        const { email, password, role_type } = req.body;
        const user = await User.findOne({ email }).exec();
        if (user) {
            if (user.role_type !== role_type) {
                return res.status(400).json({ statusTxt: "error", message: "User role does not match the expected role type!" });
            }
            
            const passwordMatch = await bcrypt.compare(password, user.password);
            if (passwordMatch) {
                user.last_login = new Date();
                await user.save();

                const tokenPayload = {
                    _id: user._id,
                    email: user.email,
                    name: user.name,
                    role_type: user.role_type
                };

                const token = jwt.sign(tokenPayload, 'your_secret_key', { expiresIn: '1h' });
                
                return res.status(200).json({ statusTxt: "success", message: "Login successful!", token });
            } else {
                return res.status(401).json({ statusTxt: "error", message: "Wrong password!" }); // 401 for Unauthorized
            }
        } else {
            return res.status(404).json({ statusTxt: "error", message: "This Email Is not registered!" }); // 404 for Not Found
        }
    } catch (err) {
        // Yup validation error
        if (err.name === 'ValidationError') {
            return res.status(422).json({ statusTxt: "error", message: err.errors.join(', ') }); // 422 for Unprocessable Entity
        }
        console.error(err);
        return res.status(500).json({ statusTxt: "error", message: "An error occurred while processing your request." });
    }
};






// User Profile
exports.getProfile = async function (req, res, next) {
    console.log("profile");
    const userId = req.body.userId; // Assuming the user ID is sent in the request body
    try {
        const data = await User.findById(userId);
        console.log("data");
        console.log(data);
        if (!data) {
            return res.status(404).json({ statusTxt: "error", message: "User not found." });
        }
        const profileData = {
            name: data.username,
            email: data.email,
            role_type: data.role_type,
            dep_id: data.dep_id,
            phone_number: data.phone_number,
            designation: data.designation
        };
        res.json({ statusTxt: "success", message: "Profile retrieved successfully.", profileData });
    } catch (error) {
        console.error(error);
        res.status(500).json({ statusTxt: "error", message: "An error occurred while processing your request." });
    }
};




// User Logout
exports.logoutUser = function (req, res, next) {
    console.log("logout")
    //localStorage.removeItem('token');
    // Clear session or token here
    res.redirect('/');
};

// Password Reset



exports.requestPasswordReset = async function (req, res, next) {
    const { email } = req.body;

    try {
        if (!email) {
            return res.status(400).json({ statusTxt: "error", message: "Email is required." });
        }

        const emailRegex = /\S+@\S+\.\S+/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ statusTxt: "error", message: "Invalid email format." });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ statusTxt: "error", message: "This Email is not registered!" });
        } else {
            if (user.resetOtp && Date.now() < user.resetOtpExpiry) {
                return res.status(400).json({ statusTxt: "error", message: "OTP already sent. Please check your email." });
            }

            // Generate OTP
            const otp = crypto.randomInt(100000, 999999).toString();

            // Store OTP securely
            user.resetOtp = otp;
            user.resetOtpExpiry = Date.now() + 3600000; // OTP expires in 1 hour
            await user.save();

            // Send OTP via email
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.NOTIFICATION_EMAIL, // Your Gmail email address
                    pass: process.env.NOTIFICATION_EMAIL_PASSWORD // Your Gmail password
                }
            });

            const mailOptions = {
                from: process.env.NOTIFICATION_EMAIL,
                to: email,
                subject: 'Password Reset OTP',
                text: `Your OTP for password reset is ${otp}`
            };

            await transporter.sendMail(mailOptions);

            return res.json({ statusTxt: "success", message: "OTP sent to your email!" });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ statusTxt: "error", message: "An error occurred while processing your request." });
    }
};


exports.resetPassword = async function (req, res, next) {
    const { email, password, otp } = req.body;

    try {
        if (!email) {
            return res.status(400).json({ statusTxt: "error", message: "Email is required." });
        }

        const emailRegex = /\S+@\S+\.\S+/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ statusTxt: "error", message: "Invalid email format." });
        }

        if (!password) {
            return res.status(400).json({ statusTxt: "error", message: "Password is required." });
        }

        if (!otp) {
            return res.status(400).json({ statusTxt: "error", message: "OTP is required." });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ statusTxt: "error", message: "This Email is not registered!" });
        } else {
            if (user.resetOtp !== otp || Date.now() > user.resetOtpExpiry) {
                return res.status(400).json({ statusTxt: "error", message: "Invalid or expired OTP." });
            }

            // Hash the new password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Update password
            user.password = hashedPassword;
            user.resetOtp = null;
            user.resetOtpExpiry = null;
            await user.save();

            console.log('Success');
            return res.json({ statusTxt: "success", message: "Password changed!" });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ statusTxt: "error", message: "An error occurred while processing your request." });
    }
};


