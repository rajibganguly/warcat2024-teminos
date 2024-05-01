const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const departmentController = require('../controllers/departmentController');
const authMiddleware = require('../middleware/authMiddleware');

// Define routes
router.post('/register-user-with-department', departmentController.registerUserWithDepartment); // removed authMiddleware currently
router.put('/edit-register-user-with-department', authMiddleware, departmentController.editRegisterUserWithDepartment);
router.get('/departments', authMiddleware, departmentController.getAllDepartments);
router.post('/login', userController.loginUser);
router.get('/profile', authMiddleware,  userController.getProfile); // Add authMiddleware here
router.get('/logout', userController.logoutUser); // Add authMiddleware here
router.post('/reset-password', userController.resetPassword); // Add authMiddleware here 

// Define other routes as needed

module.exports = router;
