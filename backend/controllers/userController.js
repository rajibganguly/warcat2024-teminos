const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const User = require('../models/user');
const bcrypt = require('bcrypt');
const Department = require('../models/department');


// User Login
exports.loginUser = async function (req, res, next) {
    try {
        const { email, password, role_type } = req.body;
        const user = await User.findOne({ email }).exec();
        if (user) {
            // Check if the retrieved user's role_type matches the expected role_type
            if (user.role_type !== role_type) {
                return res.json({ success: false, message: "User role does not match the expected role type!" });
            }
            
            // Check if the provided password matches the hashed password in the database
            const passwordMatch = await bcrypt.compare(password, user.password);
            if (passwordMatch) {
                // Update the user's login time
                user.last_login = new Date();
                await user.save();

                // Generate JWT token for authentication
                const tokenPayload = {
                    _id: user._id, // MongoDB user ID
                    email: user.email,
                    name: user.name,
                    role_type: user.role_type
                };

                // Sign JWT token with a secret key and set expiration time
                const token = jwt.sign(tokenPayload, 'your_secret_key', { expiresIn: '1h' });
                
                // Return success response with token
                return res.json({ success: true, message: "Login successful!", token });
            } else {
                // Return error response if password is incorrect
                return res.json({ success: false, message: "Wrong password!" });
            }
        } else {
            // Return error response if user does not exist
            return res.json({ success: false, message: "This Email Is not registered!" });
        }
    } catch (err) {
        // Return error response for any internal server error
        console.error(err);
        return res.status(500).json({ success: false, message: "An error occurred while processing your request." });
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
            return res.status(404).json({ error: "User not found." });
        }
        const profileData = {
            name: data.username,
            email: data.email,
            role_type: data.role_type,
            dep_id: data.dep_id,
            phone_number: data.phone_number,
            designation: data.designation
        };
        res.json({ message: "Profile retrieved successfully.", profileData });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "An error occurred while processing your request." });
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
exports.resetPassword = async function (req, res, next) {
    const { email, password } = req.body;

    try {
        // Validate email
        if (!email) {
            return res.status(400).json({ error: "Email is required." });
        }

        // Validate email format
        const emailRegex = /\S+@\S+\.\S+/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: "Invalid email format." });
        }

        // Validate password
        if (!password) {
            return res.status(400).json({ error: "Password is required." });
        }

        // Check if the email is registered
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ "Success": "This Email Is not registered!" });
        } else {
            // Update password
            user.password = password;
            await user.save();

            console.log('Success');
            return res.json({ "Success": "Password changed!" });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "An error occurred while processing your request." });
    }
};

