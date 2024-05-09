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
    if (userType === 'head_of_Office') {
        const { designation } = userData;
        if (!designation) {
            return `${userType} data is incomplete: designation is required`;
        }
    }
    if (!name || !email || !phone_number) {
        return `${userType} data is incomplete: name, email, and phone number are required`;
    }
    // You can add additional validation rules here if needed
    return null; // Data is valid
};


// User Registration
exports.registerUserWithDepartment = async function (req, res, next) {
    const { secretary, headOffice, dep_name } = req.body;
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
    const { secretary, headOffice, dep_name } = req.body;
    try {
        // Find the department
        const department = await Department.findOne({ department_name: dep_name });
        if (!department) {
            return res.status(404).json({ statusTxt: "error", message: "Department not found." });
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
    console.log(department, 'department ')
    // Find the user with the provided email
    let existingUser = await User.findOne({ email });

    // If user with the same email exists, update their departments
    if (existingUser) {
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
    try {
        // Find all departments
        const departments = await Department.find();

        // Create an array to store department details along with Secretary's and Head of Office's details
        const departmentsWithDetails = await Promise.all(departments.map(async (department) => {
            
            let getId = 'warcat-' + department._id;

            const secretary = await User.findOne({ 'departments.dep_id': department._id, 'role_type': 'secretary' });

            // Find Head of Office's details
            const headOfOffice = await User.findOne({ 'departments.dep_id': department._id, 'role_type': 'head_of_Office' });

            // Return department details along with Secretary's and Head of Office's details
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
        }));

        // Return the list of departments with Secretary's and Head of Office's details
        res.json(departmentsWithDetails);
    } catch (error) {
        console.error(error);
        res.status(500).json({ statusTxt: "error", message: 'An error occurred while processing your request' });
    }
};


// Controller function to handle GET request for delete department
exports.deleteDepartment = async (req, res) => {
    const departmentId = req.params.departmentId;  
    try {
        
        // Find the department by ID and delete it
        const deletedDepartment = await Department.findByIdAndDelete(departmentId);
        
        if (!deletedDepartment) {
            return res.status(404).json({ statusTxt: "error", message: 'Department not found' });
        }

        // Return the deleted department
        res.status(200).json({ statusTxt: "success", message: `${deletedDepartment.dept.department_name} Department deleted successfully`});
    } catch (error) {
        console.error(error);
        res.status(500).json({ statusTxt: "error", message: 'An error occurred while processing your request' });
    }
};

