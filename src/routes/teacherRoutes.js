const express = require('express');
const teacherController = require('../controllers/teacherController');
const upload = require('../utils/multer'); // Asegúrate de importar multer

const router = express.Router();

// Asignar el middleware de Multer y luego el controlador
router.post('/upload-file', upload.single('file'), teacherController.uploadFile);
router.post('/create-exam', teacherController.registeExam);
router.get('/pending-exams/:userId', teacherController.getPendingExams);
router.put('/update-exam/:examId', teacherController.editExam);
module.exports = router;
