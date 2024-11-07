const db = require("../config/db");
const { v4: uuidv4 } = require('uuid');

exports.getExamByID = async (req, res) => {
  const { examId } = req.params;

  try {
    // Obtener examen por ID
    const [exam] = await db.query(
      "SELECT * FROM examenes WHERE examen_id = uuid_to_bin(?)",
      [examId]
    );

    // Verificar si no se encontraron registros
    if (exam.length < 1) {
      return res.status(404).json({ error: "Examen no encontrado" });
    }

    const examDetails = exam[0];

    // Convertir Buffers a UUID
    const examenIdUUID = uuidv4(examDetails.examen_id.data);
    const fkDocenteUUID = uuidv4(examDetails.fk_docente.data);

    // Obtener preguntas y respuestas del examen
    const [preguntas] = await db.query(
      "SELECT p.pregunta_id, p.texto_pregunta, r.respuesta_id, r.texto_respuesta, r.es_correcta FROM preguntas p LEFT JOIN respuestas_examen r ON p.fk_examen = uuid_to_bin(?) WHERE p.fk_examen = uuid_to_bin(?)",
      [examId, examId]
    );

    // Formatear las preguntas y respuestas
    const formattedPreguntas = {};

    preguntas.forEach(pregunta => {
      // Convertir el ID de la pregunta a UUID
      const preguntaIdUUID = uuidv4(pregunta.pregunta_id.data);

      // Si la pregunta aún no está en el objeto, agregarla
      if (!formattedPreguntas[preguntaIdUUID]) {
        formattedPreguntas[preguntaIdUUID] = {
          pregunta_id: preguntaIdUUID,
          texto_pregunta: pregunta.texto_pregunta,
          respuestas: [] // Inicializar la lista de respuestas
        };
      }

      // Agregar la respuesta si existe
      if (pregunta.respuesta_id) {
        // Convertir el ID de la respuesta a UUID
        const respuestaIdUUID = uuidv4(pregunta.respuesta_id.data);
        formattedPreguntas[preguntaIdUUID].respuestas.push({
          respuesta_id: respuestaIdUUID,
          texto_respuesta: pregunta.texto_respuesta,
          es_correcta: pregunta.es_correcta
        });
      }
    });

    // Convertir el objeto a un array
    const preguntasArray = Object.values(formattedPreguntas);

    // Formatear la respuesta
    const formattedExam = {
      examen_id: examenIdUUID,
      nombre: examDetails.nombre,
      descripcion: examDetails.descripcion,
      fecha_creacion: examDetails.fecha_creacion,
      fk_docente: fkDocenteUUID,
      estado: examDetails.estado,
      codigo_examen: examDetails.codigo_examen,
      nombreMateria: examDetails.nombreMateria,
      duracionExamen: examDetails.duracionExamen,
      nivelEducacional: examDetails.nivelEducacional,
      modalidad: examDetails.modalidad,
      turno: examDetails.turno,
      preguntas: preguntasArray // Aquí se agregan las preguntas sin duplicados
    };

    return res.status(200).json({
      success: true,
      exam: formattedExam,
    });
  } catch (error) {
    console.error(`Error al obtener el examen: ${error}`);
    return res.status(500).json({
      error: "Error al obtener la información del examen. Inténtalo más tarde.",
    });
  }
};
