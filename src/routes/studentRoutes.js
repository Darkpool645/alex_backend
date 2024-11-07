const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');

router.get('/examenes/:examId', studentController.getExamByID);

module.exports = router;