const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const departmentController = require('../controllers/departmentController');
const authMiddleware = require('../middleware/authMiddleware');
const meetingController = require('../controllers/meetingController');
const multer = require('multer');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    return cb(null, './uploads/meeting-images') // corrected the destination path
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    return cb(null, uniqueSuffix+ '-' + file.originalname )
  }
})

const upload = multer({ storage });

// Define routes
router.post('/register-user-with-department', departmentController.registerUserWithDepartment);
router.put('/edit-register-user-with-department', authMiddleware, departmentController.editRegisterUserWithDepartment);
router.get('/departments', authMiddleware, departmentController.getAllDepartments);
router.post('/login', userController.loginUser);
router.get('/profile', authMiddleware, userController.getProfile);
router.get('/logout', authMiddleware, userController.logoutUser); // Added authMiddleware here
router.post('/reset-password', authMiddleware, userController.resetPassword); // Added authMiddleware here
router.post('/add-meeting', upload.single('file'), meetingController.addMeeting); // Define route for adding a meeting

module.exports = router;
