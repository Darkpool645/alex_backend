const { verifyToken } = require("../config/jwt");

// Verificar si el usuario está autenticado con un JWT válido
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(" ")[1];

    try {
      const user = verifyToken(token);
      req.user = user;
      next();
    } catch (error) {
      return res.status(403).json({ error: "Token no válido o expirado" });
    }
  } else {
    return res.status(401).json({ error: "Autenticación requerida" });
  }
};

// Acceso exclusivo a adminsitradores
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === "administrador") {
    next();
  } else {
    return res.status(403).json({ error: "Acceso no autorizado" });
  }
};

// Acceso exclusivo a docentes
const isTeacher = (req, res, next) => {
  if (req.user && req.user.role === "docente") {
    next();
  } else {
    return res.status(403).json({ error: "Acceso no autoizado" });
  }
};

// Acceso exclusivo a alumnos
const isStudent = (req, res, next) => {
  if (req.user && req.user.role === "alumno") {
    next();
  } else {
    return res.status(403).json({ error: "Acceso no autorizado" });
  }
};

module.exports = {
    authenticateJWT,
    isAdmin,
    isTeacher,
    isStudent
}