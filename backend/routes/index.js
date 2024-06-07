const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const departmentController = require('../controllers/departmentController');
const authMiddleware = require('../middleware/authMiddleware');
const meetingController = require('../controllers/meetingController');
const taskController = require('../controllers/taskController');
const { getStatistics } = require('../controllers/dashboardController');
const multer = require('multer');
const cors = require('cors');
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

// Enable CORS for all routes
router.use(cors());
// Define routes
router.post('/register-user-with-department', departmentController.registerUserWithDepartment);
router.put('/edit-register-user-with-department',  departmentController.editRegisterUserWithDepartment);
router.get('/departments',  departmentController.getAllDepartments);
router.post('/login', userController.loginUser);
router.get('/profile',  userController.getProfile);
router.get('/logout', userController.logoutUser); // Added authMiddleware here
router.post('/request-reset-password', userController.requestPasswordReset);
router.post('/reset-password', userController.resetPassword); // Added authMiddleware here
router.post('/add-meeting', upload.single('file'), meetingController.addMeeting); // Define route for adding a meeting
router.put('/edit-meeting', upload.single('file'),  meetingController.editMeeting);
router.get('/meetings', meetingController.getAllMeetings);
router.post('/add-task', upload.array('task_image', 30), taskController.addTask);
router.get('/tasks', taskController.getTask);
router.post('/edit-task', upload.single('task_image'), taskController.editTask);
router.post('/add-sub-task', upload.single('subtask_image'), taskController.addSubTask);
router.post('/edit-sub-task', upload.single('subtask_image'), taskController.editSubTask);
router.post('/add-meeting', meetingController.addMeeting); // Define route for adding a meeting
router.put('/edit-meeting', meetingController.editMeeting);
router.get('/meetings', meetingController.getAllMeetings);
router.delete('/deleteDepartment/:departmentId', departmentController.deleteDepartment);
router.post('/tasks/:taskId/add-note', taskController.addNoteToTask);
router.post('/tasks/:taskId/upload-completion-details', upload.single('upload_report'), taskController.uploadCompletionDetails);
router.get('/task-status-percentages',taskController.getTaskStatusPercentages);
router.put('/admin_verified', taskController.setAdminVerified);
router.get('/statistics', getStatistics);



module.exports = router;
