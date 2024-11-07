const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
/**
 * @swagger
 * /register-admin:
 *   post:
 *     summary: Crea un nuevo usuario administrador
 *     description: Agrega un nuevo usuario al sistema.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Juan Pérez
 *               email:
 *                 type: string
 *                 example: juan.perez@example.com
 *               institution_name:
 *                 type: string
 *                 example: Universidad ejemplo
 *               address:
 *                 type: string
 *                 example: Calle ejemplo 123
 *               phone:
 *                 type: string
 *                 example: 1234567890 
 *               payment_method:
 *                 type: string
 *                 example: PayPal
 *               payment_token:
 *                 type: string
 *                 example: token
 *               country:
 *                 type: string
 *                 example: mxn
 *     responses:
 *       201:
 *         description: Usuario creado exitosamente
 *       400:
 *         description: El usuario ya existe
 *       500:
 *         description: Error procesando el pago
 *       500:
 *         description: Error durante el registro.
 */
router.post("/register-admin", authController.registerAdmin);
router.post("/login-admin", authController.loginAdmin);
router.post("/login-teacher", authController.loginTeacher);
router.post("/verify-code-admin", authController.verifyCode);
router.post("/login-student", authController.loginStudent);
module.exports = router;
