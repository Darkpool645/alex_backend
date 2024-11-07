const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const bodyParser = require("body-parser");
const compression = require("compression");
const db = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require('./routes/adminRoutes');
const teacherRoutes = require('./routes/teacherRoutes');
const studentRoutes = require('./routes/studentRoutes');
const swaggerSpec = require('./config/swaggerConfig');
const swaggerUi = require('swagger-ui-express');
const {
  authenticateJWT,
  isAdmin,
  isStudent,
  isTeacher,
} = require("./middlewares/authMiddleware");
require("dotenv").config();

const app = express();
  
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));
app.use(helmet()); // Seguridad para los headers HTTP
app.use(cors()); // Permitir solicitudes desde diferentes dominios
app.use(morgan("dev")); // Logger para registrar las solicitudes
app.use(compression()); // Compresión de las respuestas HTTP para mejorar el rendimiento

// Limite de solicitudes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Demasiadas solicitudes desde esta IP, intente de nuevo más tarde.",
});
app.use(limiter);

// Parseo de JSON y datos de formularios
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Prueba de conexión a la base de datos
const checkDbConnection = async () => {
  try {
    const connection = await db.getConnection();
    console.log("Conexión a la base de datos exitosa");
    connection.release();
  } catch (err) {
    console.error("Error al conectar con la base de datos:", err);
    process.exit(1);
  }
};

// Definición de rutas
app.use("/auth", authRoutes);
app.use("/admin", adminRoutes);
app.use("/teacher", teacherRoutes);
app.use("/student", studentRoutes);

app.get("/api/admin", authenticateJWT, isAdmin, (req, res) => {
  res.json({
    message: "Acceso a una ruta protegida y exclusiva para administradores",
    user: req.user,
  });
});

app.get("/api/teacher", authenticateJWT, isTeacher, (req, res) => {
  res.json({
    message: "Acceso a una ruta protegida y exclusiva para docentes",
    user: req.user,
  });
});

app.get("/api/student", authenticateJWT, isStudent, (req, res) => {
  res.json({
    message: "Acceso a una ruta protegida y exclusiva para alumnos",
    user: req.user,
  });
});

// Manejo de rutas no encontradas
app.use((req, res, next) => {
  res.status(404).json({ error: "Ruta no encontrada" });
});

// Middleware para manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Error interno del servidor" });
});

// Iniciar servidor
const startServer = async () => {
  await checkDbConnection();

  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running at port ${PORT}`);
  });
};

startServer(); // Llamar a la función para iniciar el servidor
