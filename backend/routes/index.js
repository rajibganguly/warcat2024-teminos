const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const departmentController = require('../controllers/departmentController');
const authMiddleware = require('../middleware/authMiddleware');
const meetingController = require('../controllers/meetingController');
const taskController = require('../controllers/taskController');
const multer = require('multer');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    return cb(null, './uploads'); // Corrected the destination path
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    return cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ storage });

// Define routes
router.post('/register-user-with-department', departmentController.registerUserWithDepartment);
router.put('/edit-register-user-with-department', authMiddleware, departmentController.editRegisterUserWithDepartment);
router.get('/departments', authMiddleware, departmentController.getAllDepartments);
router.post('/login', userController.loginUser);
router.get('/profile', authMiddleware, userController.getProfile);
router.get('/logout', userController.logoutUser); // Added authMiddleware here
router.post('/reset-password', userController.resetPassword); // Added authMiddleware here
router.post('/add-meeting', upload.single('file'), meetingController.addMeeting); // Define route for adding a meeting
router.put('/edit-meeting', upload.single('file'), authMiddleware, meetingController.editMeeting);
router.get('/meetings', authMiddleware, meetingController.getAllMeetings);
router.post('/add-task', upload.array('task_image', 30), taskController.addTask);
router.get('/tasks', taskController.getTask);
router.post('/edit-task', upload.single('task_image'), taskController.editTask);

module.exports = router;
