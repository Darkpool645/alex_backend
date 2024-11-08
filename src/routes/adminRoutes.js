const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

router.post("/register-teacher", adminController.registerTeacher);
router.get("/teachers-amount/:schoolID", adminController.getCountTeachers);
router.get("/exams-amout/:schoolID",adminController.getCountExams);
router.get("/pending-exams/:schoolID", adminController.getActiveExams);
router.get("/teachers-list/:schoolId", adminController.getTeachersList);
router.post("/upload-file", adminController.uploadFile);

module.exports = router;
