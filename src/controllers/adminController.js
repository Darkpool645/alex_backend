const { v4: uuidv4, stringify: uuidStringify } = require("uuid");
const db = require("../config/db");
const path = require("path");
const fs = require("fs").promises;
const { processFile } = require("../utils/processFiles");

// Convertir UUID a formato binario
const uuidToBinary = (uuid) => {
  return Buffer.from(uuid.replace(/-/g, ""), "hex");
};

// Registrar un nuevo docente
exports.registerTeacher = async (req, res) => {
  const { name, fk_institution } = req.body;

  // Función para generar un código de registro alfanumérico de 6 caracteres
  const generateCode = (length = 6) => {
    const characters = "abcdefghijklmnopqrstuvwxyz0123456789";
    let code = "";
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      code += characters[randomIndex];
    }
    return code;
  };

  try {
    // Verificar que la escuela exista
    const [existingSchool] = await db.query(
      "SELECT * FROM instituciones WHERE institucion_id = UUID_TO_BIN(?)",
      [fk_institution]
    );

    if (existingSchool.length < 1) {
      return res.status(400).json({ error: "La escuela no existe" });
    }

    // Verificar si el docente ya está registrado
    const [existingTeacher] = await db.query(
      "SELECT * FROM usuarios WHERE nombre = ? AND fk_institucion = UUID_TO_BIN(?)",
      [name, fk_institution]
    );

    if (existingTeacher.length > 0) {
      return res.status(400).json({ error: "El usuario ya existe" });
    }

    // Generar usuario_id (UUID) y código de registro
    const usuario_id = uuidv4(); // Generar UUID
    const codigo_registro = generateCode(6); // Generar código de registro alfanumérico

    // Insertar nuevo docente
    const sql = `
      INSERT INTO usuarios (usuario_id, nombre, rol, fk_institucion, codigo_registro, estado)
      VALUES (UUID_TO_BIN(?), ?, 'docente', UUID_TO_BIN(?), ?, 'activo')
    `;

    await db.query("START TRANSACTION"); // Iniciar la transacción

    await db.query(sql, [usuario_id, name, fk_institution, codigo_registro]);

    // Confirmar la transacción
    await db.query("COMMIT");

    // Enviar respuesta de éxito
    return res.status(201).json({
      success: true,
      message: "Docente registrado exitosamente",
      usuario: {
        usuario_id,
        name,
        fk_institution,
        codigo_registro,
        estado: "activo",
      },
    });
  } catch (error) {
    await db.query("ROLLBACK"); // Revertir si hay un error
    console.error("Error al registrar el docente:", error);
    return res.status(500).json({
      error: "Error durante la creación del docente. Inténtalo más tarde.",
    });
  }
};

// Obtener cantidad de docentes
exports.getCountTeachers = async (req, res) => {
  const { schoolID } = req.params;

  if (!schoolID) {
    return res.status(400).json({ message: "Se requiere el ID de la escuela" });
  }

  const schoolIdBinary = uuidToBinary(schoolID);

  try {
    const [teacherCount] = await db.query(
      `SELECT COUNT(*) AS total FROM usuarios WHERE fk_institucion = ? AND rol = 'docente'`,
      [schoolIdBinary]
    );

    return res.status(200).json({
      success: true,
      totalTeachers: teacherCount[0].total,
    });
  } catch (error) {
    console.error(`Error al obtener la cantidad de docentes:`, error);
    return res.status(500).json({
      error: "Error al obtener la información de usuarios. Inténtalo más tarde",
    });
  }
};

// Obtener cantidad de exámenes
exports.getCountExams = async (req, res) => {
  const { schoolID } = req.params;

  if (!schoolID) {
    return res
      .status(400)
      .json({ message: "Se requiere el ID de la escuela " });
  }

  const schoolIdBinary = uuidToBinary(schoolID);

  try {
    const [examsCount] = await db.query(
      `SELECT 
         COUNT(DISTINCT e.examen_id) AS totalExams
       FROM 
         usuarios u
       LEFT JOIN 
         examenes e ON u.usuario_id = e.fk_docente
       LEFT JOIN 
         respuestas_alumno ra ON e.examen_id = ra.fk_examen
       WHERE 
         u.fk_institucion = ? AND u.rol = 'docente'`,
      [schoolIdBinary]
    );

    return res.status(200).json({
      success: true,
      totalExams: examsCount[0].totalExams,
    });
  } catch (error) {
    console.log(`Error al obtener la cantidad de exámenes: ${error}`);
    return res.status(500).json({
      error:
        "Error al obtener la información de exámenes. Inténtalo más tarde.",
    });
  }
};

// Obtener lista de exámenes activos
exports.getActiveExams = async (req, res) => {
  const { schoolID } = req.params;

  if (!schoolID) {
    return res.status(400).json({ message: "Se requiere el ID de la escuela" });
  }

  const schoolIdBinary = uuidToBinary(schoolID);

  try {
    const [activeExams] = await db.query(
      `SELECT BIN_TO_UUID(e.examen_id) AS examen_id, e.nombre, e.descripcion, e.codigo_examen, u.nombre, e.nombreMateria
       FROM examenes e
       INNER JOIN usuarios u ON e.fk_docente = u.usuario_id
       WHERE u.fk_institucion = ?
       AND e.estado = 'activo'
       AND u.rol = 'docente'`,
      [schoolIdBinary]
    );
    

    if (activeExams.length === 0) {
      return res.status(404).json({
        success: true,
        message: "No se encontraron exámenes activos en la escuela.",
      });
    }

    return res.status(200).json({
      success: true,
      exams: activeExams,
    });
  } catch (error) {
    console.error(`Error al obtener los exámenes pendientes: ${error}`);
    return res.status(500).json({
      error:
        "Error al obtener la lista de exámenes pendientes. Inténtalo más tarde",
    });
  }
};

// Obtener lista de docentes
exports.getTeachersList = async (req, res) => {
  const { schoolId } = req.params;

  if (!schoolId) {
    return res.status(400).json({ message: "Se requiere el ID de la escuela" });
  }

  try {
    const [teachersList] = await db.query(
      `SELECT * FROM usuarios WHERE fk_institucion = ? AND rol = 'docente'`,
      [uuidToBinary(schoolId)]
    );

    if (teachersList.length > 0) {
      const formattedTeachersList = teachersList.map(teacher => ({
        ...teacher,
        usuario_id: uuidStringify(teacher.usuario_id), // Convertir Buffer a UUID
        fk_institucion: uuidStringify(teacher.fk_institucion) // Convertir Buffer a UUID
      }));

      return res.status(200).json({
        success: true,
        teachers: formattedTeachersList,
      });
    } else {
      return res.status(404).json({
        message: "No se encontraron docentes en la escuela.",
      });
    }
  } catch (error) {
    console.error(`Error al obtener la lista de docentes: ${error}`);
    return res.status(500).json({
      error: "Error al obtener la lista de docentes. Inténtalo más tarde",
    });
  }
};

exports.uploadFile = async (req, res) => {
  console.log("Verificando el archivo subido...");
  console.log("Archivo recibido:", req.file);

  if (!req.file) {
    console.error("No se subió ningún archivo");
    return res.status(400).json({ message: "No se subió ningún archivo" });
  }

  // Ruta del archivo subido
  const filePath = path.join(__dirname, "../uploads", req.file.filename);
  console.log("Ruta del archivo: ", filePath);

  try {
    // Procesar el archivo para generar el JSON
    const questions = await processFile(filePath);
    console.log("Archivo procesado con éxito:", questions);

    // Eliminar el archivo después de procesarlo
    await fs.unlink(filePath);
    console.log("Archivo temporal eliminado.");

    // Responder con el JSON generado
    res.status(200).json({
      success: true,
      message: "Archivo procesado exitosamente",
      questions,
    });
  } catch (error) {
    console.error("Error procesando el archivo:", error);
    res
      .status(500)
      .json({ message: error.message || "Error procesando el archivo" });
  }
};
