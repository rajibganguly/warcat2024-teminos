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
router.post('/register-user-with-department',authMiddleware, departmentController.registerUserWithDepartment);
router.put('/edit-register-user-with-department', authMiddleware, departmentController.editRegisterUserWithDepartment);
router.get('/departments', authMiddleware, departmentController.getAllDepartments);
router.post('/login', userController.loginUser);
router.get('/profile', authMiddleware, userController.getProfile);
router.get('/logout', userController.logoutUser); // Added authMiddleware here
router.post('/reset-password', userController.resetPassword); // Added authMiddleware here
router.post('/add-meeting', upload.single('file'),authMiddleware, meetingController.addMeeting); // Define route for adding a meeting
router.put('/edit-meeting', upload.single('file'), authMiddleware, meetingController.editMeeting);
router.get('/meetings', meetingController.getAllMeetings);
router.post('/add-task', upload.array('task_image', 30),authMiddleware, taskController.addTask);
router.get('/tasks', authMiddleware, taskController.getTask);
router.post('/edit-task', upload.single('task_image'), authMiddleware, taskController.editTask);
router.post('/add-sub-task', upload.single('subtask_image'),authMiddleware, taskController.addSubTask);
router.post('/edit-sub-task', upload.single('subtask_image'), authMiddleware, taskController.editSubTask);
router.post('/add-meeting', authMiddleware, meetingController.addMeeting); // Define route for adding a meeting
router.put('/edit-meeting', authMiddleware, meetingController.editMeeting);
router.get('/meetings',authMiddleware, meetingController.getAllMeetings);
router.delete('/deleteDepartment/:departmentId', authMiddleware, departmentController.deleteDepartment);
router.post('/tasks/:taskId/add-note',authMiddleware, taskController.addNoteToTask);
router.post('/tasks/:taskId/upload-completion-details', upload.single('upload_report'),authMiddleware, taskController.uploadCompletionDetails);
router.get('/task-status-percentages',taskController.getTaskStatusPercentages);


module.exports = router;
