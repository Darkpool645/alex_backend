const fs = require("fs").promises;
const path = require("path");
const db = require("../config/db");
const {
  v4: uuidv4,
  parse: uuidParse,
  stringify: uuidStringify,
} = require("uuid");
const { processFile } = require("../utils/processFiles");

const uuidToBinary = (uuid) => {
  return Buffer.from(uuid.replace(/-/g, ""), "hex");
};

const bufferToUuid = (buffer) => {
  return uuidStringify(buffer);
};

const generateExamCode = () => {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code;
};

// Controlador para subir el archivo
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

exports.registeExam = async (req, res) => {
  console.log("Registrando examen...");

  const {
    nombre,
    descripcion,
    fk_docente,
    nombreMateria,
    duracionExamen,
    nivelEducacional,
    modalidad,
    turno,
    preguntas,
  } = req.body;

  if (
    !nombre ||
    !descripcion ||
    !fk_docente ||
    !nombreMateria ||
    duracionExamen == null ||
    !nivelEducacional ||
    !modalidad ||
    !turno ||
    !preguntas
  ) {
    return res
      .status(400)
      .json({ message: "Todos los campos son obligatorios" });
  }

  const examenId = uuidToBinary(uuidv4());
  const codigoExamen = generateExamCode(); // Asegúrate de que esta función esté definida

  // Convertir fk_docente a BINARY(16)
  const fkDocenteBinary = uuidToBinary(fk_docente);

  try {
    const insertExamQuery = `
            INSERT INTO examenes (examen_id, nombre, descripcion, fk_docente,
                                  nombreMateria, duracionExamen, nivelEducacional,
                                  modalidad, turno, codigo_examen, estado)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'activo')`;

    await db.query(insertExamQuery, [
      examenId,
      nombre,
      descripcion,
      fkDocenteBinary,
      nombreMateria,
      duracionExamen,
      nivelEducacional,
      modalidad,
      turno,
      codigoExamen,
    ]);

    // Insertar preguntas y respuestas
    for (const pregunta of preguntas) {
      const preguntaID = uuidToBinary(uuidv4());
      const insertPreguntaQuery = `INSERT INTO preguntas (pregunta_id, texto_pregunta, fk_examen) VALUES (?, ?, ?)`;
      await db.query(insertPreguntaQuery, [
        preguntaID,
        pregunta.texto_pregunta,
        examenId,
      ]);

      for (const respuesta of pregunta.respuestas) {
        const respuestaID = uuidToBinary(uuidv4());
        const insertRespuestaQuery = `INSERT INTO respuestas_examen (respuesta_id, fk_pregunta, texto_respuesta, es_correcta) VALUES (?, ?, ?, ?)`;

        await db.query(insertRespuestaQuery, [
          respuestaID,
          preguntaID,
          respuesta.texto_respuesta,
          respuesta.es_correcta,
        ]);
      }
    }

    res.status(200).json({
      success: true,
      message: "Examen registrado exitosamente",
      codigoExamen,
    });
  } catch (error) {
    console.error(`Error registrando el examen: ${error}`);
    res
      .status(500)
      .json({ message: error.message || "Error registrando el examen" });
  }
};

exports.getPendingExams = async (req, res) => {
  const { userId } = req.params; // Asumimos que el ID del docente se pasa como parámetro

  if (!userId) {
    return res.status(400).json({ message: "Se requiere el ID del docente" });
  }

  // Convertir el userId a formato BINARY(16) para la consulta
  const docenteIdBinary = uuidToBinary(userId);

  try {
    // 1. Consulta para obtener los exámenes activos creados por el docente
    const queryExamenes = `
        SELECT e.examen_id, e.nombre, e.descripcion, e.nombreMateria, e.duracionExamen, e.nivelEducacional, 
               e.modalidad, e.turno, e.fecha_creacion, e.codigo_examen
        FROM examenes e
        WHERE e.fk_docente = ? AND e.estado = 'activo'
      `;

    const [examenes] = await db.query(queryExamenes, [docenteIdBinary]);

    if (examenes.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No hay exámenes pendientes",
        exams: [],
      });
    }

    // 2. Iterar sobre cada examen para obtener las preguntas y respuestas
    const detailedExams = [];

    for (const examen of examenes) {
      // Convertir examen_id a formato UUID
      examen.examen_id = bufferToUuid(examen.examen_id);

      // Obtener las preguntas del examen actual
      const queryPreguntas = `
          SELECT p.pregunta_id, p.texto_pregunta
          FROM preguntas p
          WHERE p.fk_examen = ?
        `;
      const [preguntas] = await db.query(queryPreguntas, [
        uuidToBinary(examen.examen_id),
      ]);

      // Obtener las respuestas para cada pregunta
      for (const pregunta of preguntas) {
        // Convertir pregunta_id a formato UUID
        pregunta.pregunta_id = bufferToUuid(pregunta.pregunta_id);

        const queryRespuestas = `
            SELECT r.respuesta_id, r.texto_respuesta, r.es_correcta
            FROM respuestas_examen r
            WHERE r.fk_pregunta = ?
          `;
        const [respuestas] = await db.query(queryRespuestas, [
          uuidToBinary(pregunta.pregunta_id),
        ]);

        // Convertir respuesta_id de cada respuesta a formato UUID
        pregunta.respuestas = respuestas.map((respuesta) => ({
          ...respuesta,
          respuesta_id: bufferToUuid(respuesta.respuesta_id),
        }));
      }

      // Agregar las preguntas con respuestas al examen
      examen.preguntas = preguntas;

      // Agregar el examen completo al arreglo detallado
      detailedExams.push(examen);
    }

    // 3. Responder con los exámenes detallados, con los IDs convertidos a UUID
    res.status(200).json({
      success: true,
      exams: detailedExams,
    });
  } catch (error) {
    console.error(
      "Error al obtener la información de los exámenes pendientes:",
      error
    );
    res.status(500).json({
      message:
        error.message || "Error al obtener la información de los exámenes",
    });
  }
};

exports.editExam = async (req, res) => {
    const { examId } = req.params; // ID del examen a editar
    const {
      nombre,
      descripcion,
      nombreMateria,
      duracionExamen,
      nivelEducacional,
      modalidad,
      turno,
      preguntas,
    } = req.body;
  
    if (
      !nombre ||
      !descripcion ||
      !nombreMateria ||
      duracionExamen == null ||
      !nivelEducacional ||
      !modalidad ||
      !turno ||
      !preguntas ||
      preguntas.length < 1 // Debe haber al menos 1 pregunta
    ) {
      return res.status(400).json({ message: "Todos los campos son obligatorios y debe haber al menos una pregunta." });
    }
  
    // Iniciar la transacción para asegurar la integridad de los datos
    const connection = await db.getConnection();
    await connection.beginTransaction();
  
    try {
      // Actualizar los detalles del examen
      const updateExamQuery = `
        UPDATE examenes
        SET nombre = ?, descripcion = ?, nombreMateria = ?, duracionExamen = ?, nivelEducacional = ?, modalidad = ?, turno = ?
        WHERE examen_id = ?
      `;
      
      await connection.query(updateExamQuery, [
        nombre,
        descripcion,
        nombreMateria,
        duracionExamen,
        nivelEducacional,
        modalidad,
        turno,
        uuidToBinary(examId),
      ]);
  
      // Obtener las preguntas actuales para eliminarlas
      const existingQuestionsQuery = `
        SELECT pregunta_id FROM preguntas WHERE fk_examen = ?
      `;
      const [existingQuestions] = await connection.query(existingQuestionsQuery, [uuidToBinary(examId)]);
      
      // Eliminar las preguntas y sus respuestas asociadas
      for (const question of existingQuestions) {
        // Eliminar respuestas asociadas
        const deleteAnswersQuery = `
          DELETE FROM respuestas_examen WHERE fk_pregunta = ?
        `;
        await connection.query(deleteAnswersQuery, [question.pregunta_id]);
  
        // Eliminar la pregunta
        const deleteQuestionQuery = `
          DELETE FROM preguntas WHERE pregunta_id = ?
        `;
        await connection.query(deleteQuestionQuery, [question.pregunta_id]);
      }
  
      // Insertar las nuevas preguntas y respuestas
      for (const pregunta of preguntas) {
        const preguntaID = uuidToBinary(uuidv4());
        const insertPreguntaQuery = `INSERT INTO preguntas (pregunta_id, texto_pregunta, fk_examen) VALUES (?, ?, ?)`;
        await connection.query(insertPreguntaQuery, [
          preguntaID,
          pregunta.texto_pregunta,
          uuidToBinary(examId),
        ]);
  
        for (const respuesta of pregunta.respuestas) {
          const respuestaID = uuidToBinary(uuidv4());
          const insertRespuestaQuery = `INSERT INTO respuestas_examen (respuesta_id, fk_pregunta, texto_respuesta, es_correcta) VALUES (?, ?, ?, ?)`;
  
          await connection.query(insertRespuestaQuery, [
            respuestaID,
            preguntaID,
            respuesta.texto_respuesta,
            respuesta.es_correcta,
          ]);
        }
      }
  
      await connection.commit();
      res.status(200).json({ success: true, message: "Examen editado exitosamente" });
    } catch (error) {
      await connection.rollback();
      console.error("Error editando el examen:", error);
      res.status(500).json({ message: error.message || "Error editando el examen" });
    } finally {
      connection.release();
    }
  };
  
