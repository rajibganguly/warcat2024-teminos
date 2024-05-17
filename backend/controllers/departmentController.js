const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Department = require('../models/department');
const { sendRegistrationEmail } = require('../service/emailService');
const bcrypt = require('bcrypt');


// Common function to register users with department
const handleUserRegistration = async (dep_name, secretary, headOffice) => {



    // Validate Secretary data
    const secretaryValidation = validateUserData(secretary, "secretary");
    if (secretaryValidation) {
        throw new Error(secretaryValidation);
    }

    // Validate Head of Office data
    const headOfficeValidation = validateUserData(headOffice, "head_of_Office");
    if (headOfficeValidation) {
        throw new Error(headOfficeValidation);
    }

    // Check if the user being registered is already assigned the opposite role in any department
    if (secretary || headOffice) {
        const existingUser = await User.findOne({
            $or: [
                { email: secretary?.email, role_type: 'head_of_Office' },
                { email: headOffice?.email, role_type: 'secretary' }
            ]
        });

        if (existingUser) {
            const errorMessage = existingUser.role_type === 'head_of_Office' ?
                'A user with head_of_Office role cannot be assigned secretary role in a different department.' :
                'A user with secretary role cannot be assigned head_of_Office role in a different department.';
            throw new Error(errorMessage);
        }
    }

    if (secretary && headOffice && secretary.email === headOffice.email) {
        throw new Error('A user cannot have two different roles in the same department.');
    }

    // Find or create the department
    let department = await Department.findOne({ department_name: dep_name });
    if (!department) {
        // Create a new department if it doesn't exist
        department = new Department({ department_name: dep_name, "timestamp": new Date().toISOString() });
        await department.save();
    }

    // Register Secretary
    if (secretary) {
        await registerUser({ ...secretary, department });
    }

    // Register Head of Office
    if (headOffice) {
        await registerUser({ ...headOffice, department });
    }
};

// Function to validate user data
const validateUserData = (userData, userType) => {
    let { name, email, phone_number } = userData;

    let regexForEmail = /^[a-z0-9]+@[a-z]+\.[a-z]{2,3}$/;
    let regexForPhone = /^\+91[1-9]\d{9}$/;

    let varifiedEmail = regexForEmail.test(email);
    let varifiedPhone = regexForPhone.test(phone_number);

    if (userType === 'head_of_Office') {
        const { designation } = userData;
        if (!designation) {
            return `${userType} data is incomplete: designation is required`;
        }
    }
    if (!name || !email || !phone_number) {
        return `${userType} data is incomplete: name, email, and phone number are required`;
    }

    if (!varifiedEmail) {
        return `${email} data is not correct`;
    }

    if (!varifiedPhone) {
        return `${phone_number} number is not correct`;
    }
    // You can add additional validation rules here if needed
    return null; // Data is valid
};


// User Registration//
exports.registerUserWithDepartment = async function (req, res, next) {
    const { secretary, headOffice, dep_name } = req.body;

    // Validate Secretary data
    const secretaryValidation = validateUserData(secretary, "secretary");
    if (secretaryValidation) {
        throw new Error(secretaryValidation);
    }

    // Validate Head of Office data
    const headOfficeValidation = validateUserData(headOffice, "head_of_Office");
    if (headOfficeValidation) {
        throw new Error(headOfficeValidation);
    }


    try {
        // Check if department exists
        const existingDepartment = await Department.findOne({ department_name: dep_name });
        if (existingDepartment) {
            // Department already exists, send error message
            return res.status(400).json({ statusTxt: "error", message: 'Department already exists' });
        }

        // Register users with department
        await handleUserRegistration(dep_name, secretary, headOffice);

        // Send success response
        res.status(200).json({ statusTxt: "success", message: "Department Added successfully." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ statusTxt: "error", message: "An error occurred while processing your request." });
    }
};

// Edit User Registration API
exports.editRegisterUserWithDepartment = async function (req, res, next) {
    const { secretary, headOffice, department_id, dep_name } = req.body;
    try {
        // Find the department
        const department = await Department.findById(department_id);
        if (!department) {
            return res.status(404).json({ statusTxt: "error", message: "Department not found." });
        }

        // Check if the department name already exists
        const existingDepartment = await Department.findOne({ department_name: dep_name });
        if (existingDepartment && existingDepartment._id.toString() !== department._id.toString()) {
            // Department with the provided name already exists, send error message
            return res.status(400).json({ statusTxt: "error", message: 'Department name already exists' });
        }

        // Find users with the department ID
        const users = await User.find({ departments: { $elemMatch: { dep_id: department._id } } });

        // Remove department ID from users' departments list if Head of Office or Secretary exists
        for (const user of users) {
            if (user) {

                const index = user.departments.findIndex(dep => dep.dep_id.toString() === department._id.toString());

                if (index !== -1) {
                    // Filter out the department ID from the user's departments list
                    user.departments = user.departments.filter(dep => dep.dep_id.toString() !== department._id.toString());
                    // Save the user after removing the department
                    await user.save();

                }
            }
        }
        // Register users with department
        await handleUserRegistration(dep_name, secretary, headOffice);

        res.status(200).json({ statusTxt: "success", message: "Department Edit successfully." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ statusTxt: "error", message: "An error occurred while processing your request." });
    }
};

// Function to generate a random password
const generateRandomPassword = () => {
    const length = 10; // Length of the random password
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let password = '';
    for (let i = 0; i < length; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
};


async function registerUser(userData) {
    const { email, name, role_type, designation, phone_number, department } = userData;
    // Find the user with the provided email
    let existingUser = await User.findOne({ email });

    // If user with the same email exists, update their departments
    if (existingUser) {

        if (existingUser.name) existingUser.name = name;
        if (existingUser.phone_number) existingUser.phone_number = phone_number;
        if (existingUser.designation) existingUser.designation = designation;
        await existingUser.save();

        // Ensure that the department to be added is not already present in the user's departments
        if (!existingUser.departments.some(dep => dep.dep_id.toString() === department._id.toString())) {
            existingUser.departments.push({ dep_id: department._id, dep_name: department.department_name });
            await existingUser.save();
        }
        return; // No need to create a new user
    }
    // Generate a random password
    const password = generateRandomPassword();

    // Hash the generated password
    const hashedPassword = await bcrypt.hash(password, 10);
    // Create a new user with the provided information
    const newUser = new User({
        email,
        password: hashedPassword, // Generate a random password or handle as required
        name,
        role_type,
        designation,
        phone_number,
        departments: [{ dep_id: department._id, dep_name: department.department_name }]
    });
    await newUser.save();
    try {
        await sendRegistrationEmail(newUser?.email, password, department.department_name, role_type);
        console.log('Email sent successfully');
    } catch (error) {
        console.error('Error sending email: ', error);
    }
}


// Controller function to handle GET request for all department details
exports.getAllDepartments = async (req, res) => {
    const { userId, role_type } = req.query; // Extract userId and role_type from request body

    try {
        if (role_type === 'admin') {
            // If role_type is 'admin', fetch all departments
            const departments = await Department.find();
            const departmentsWithDetails = await populateDepartmentDetails(departments);
            return res.status(200).json(departmentsWithDetails);
        }

        // Find the user by userId
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ statusTxt: "error", message: 'User not found' });
        }

        // Check if the user role_type is 'head_of_office' or 'secretary'
        if (user.role_type !== role_type && user.role_type !== role_type) {
            return res.status(403).json({ statusTxt: "error", message: 'User is not authorized to access departments' });
        }

        // Get the department IDs of the user
        const depIds = user.departments.map(department => department.dep_id);

        // Find departments associated with the user's departments
        const departments = await Department.find({ _id: { $in: depIds } });
        const departmentsWithDetails = await populateDepartmentDetails(departments);

        if (!departments || departments.length === 0) {
            return res.status(404).json({ statusTxt: "error", message: 'No departments found for the user' });
        }

        return res.status(200).json(departmentsWithDetails);
    } catch (error) {
        console.error(error);
        res.status(500).json({ statusTxt: "error", message: 'An error occurred while processing your request' });
    }
};

// Function to populate department details with Secretary's and Head of Office's details
async function populateDepartmentDetails(departments) {
    // Array to store promises for populating department details
    const promises = departments.map(async (department) => {
        let getId = 'warcat-' + department._id;

        const secretary = await User.findOne({ 'departments.dep_id': department._id, 'role_type': 'secretary' });
        const headOfOffice = await User.findOne({ 'departments.dep_id': department._id, 'role_type': 'head_of_Office' });

        return {
            id: getId,
            department: department,
            secretary: secretary ? {
                email: secretary.email,
                name: secretary.name,
                role_type: secretary.role_type,
                designation: secretary.designation,
                phone_number: secretary.phone_number
            } : null,
            headOffice: headOfOffice ? {
                email: headOfOffice.email,
                name: headOfOffice.name,
                role_type: headOfOffice.role_type,
                designation: headOfOffice.designation,
                phone_number: headOfOffice.phone_number
            } : null
        };
    });

    // Resolve all promises and return the response
    return await Promise.all(promises);
}



// Controller function to handle delete request for delete department [ Not using ]
exports.deleteDepartment = async (req, res) => {
    const departmentId = req.params.departmentId;
    try {

        // Find the department by ID and delete it
        const deletedDepartment = await Department.findByIdAndDelete(departmentId);

        if (!deletedDepartment) {
            return res.status(404).json({ statusTxt: "error", message: 'Department not found' });
        }

        // Return the deleted department
        res.status(200).json({ statusTxt: "success", message: `${deletedDepartment.dept.department_name} Department deleted successfully` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ statusTxt: "error", message: 'An error occurred while processing your request' });
    }
};

