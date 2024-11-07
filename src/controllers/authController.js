const { v4: uuidv4 } = require("uuid");
const { generateToken } = require("../config/jwt");
const {
  getCurrencyByCountry,
  convertLocalCurrencyToUsd,
} = require("../utils/currencyConversion");
const stripe = require("../config/stripe");
const paypal = require("../config/paypal");
const db = require("../config/db");
const { sendWellcomeEmail, sendVerificationCode } = require("../config/mail");

function formatUUID(buffer) {
  const hexString = buffer.toString("hex");
  return [
    hexString.substr(0, 8),
    hexString.substr(8, 4),
    hexString.substr(12, 4),
    hexString.substr(16, 4),
    hexString.substr(20, 12),
  ].join("-");
}

// Procesar el pago
const processPayment = async (
  payment_method,
  payment_token,
  amountInLocalCurrency,
  currency
) => {
  if (payment_method === "stripe") {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amountInLocalCurrency * 100), // Convertir a centavos
      currency: currency,
      description: "Pago de subscripción para administrador",
      payment_method: payment_token,
      confirm: true,
      return_url: "http://localhost:5173/",
    });
    return {
      id: paymentIntent.id, // ID del pago en Stripe
      amount: paymentIntent.amount, // Monto pagado
    };
  } else if (payment_method === "paypal") {
    const executePaymentJson = {
      payer_id: payment_token,
      transactions: [
        {
          amount: {
            currency: currency,
            total: amountInLocalCurrency.toFixed(2),
          },
        },
      ],
    };
    return new Promise((resolve, reject) => {
      paypal.payment.execute(
        payment_token,
        executePaymentJson,
        (error, payment) => {
          if (error) {
            return reject(error);
          }
          resolve({
            id: payment.id, // ID del pago en PayPal
            amount: payment.transactions[0].amount.total, // Monto pagado
          });
        }
      );
    });
  }
  throw new Error("Método de pago no válido");
};

// Registro del administrador
exports.registerAdmin = async (req, res) => {
  const {
    name,
    email,
    institution_name,
    address,
    phone,
    payment_method,
    payment_token,
    country,
  } = req.body;

  try {
    // Verificar que el usuario no exista
    const [existingUser] = await db.query(
      "SELECT * FROM usuarios WHERE correo = ?",
      [email]
    );
    if (existingUser.length > 0) {
      return res.status(400).json({ error: "El usuario ya existe" });
    }

    // Obtener la moneda del país y convertir a USD
    const currency = getCurrencyByCountry(country);
    const amountInLocalCurrency = await convertLocalCurrencyToUsd(10, currency);

    // Procesar el pago
    let paymentResult;
    try {
      paymentResult = await processPayment(
        payment_method,
        payment_token,
        amountInLocalCurrency,
        currency
      );
    } catch (error) {
      console.error(`Error procesando el pago: ${error}`);
      return res.status(500).json({ error: "Error procesando el pago" });
    }

    // Registro de información de usuario en la base de datos
    await db.query("START TRANSACTION");

    const adminID = uuidv4().replace(/-/g, "");
    const instituteID = uuidv4().replace(/-/g, "");

    await db.query(
      "INSERT INTO instituciones (institucion_id, nombre, direccion, telefono) VALUES (UNHEX(?), ?, ?, ?)",
      [instituteID, institution_name, address, phone]
    );

    await db.query(
      "INSERT INTO usuarios (usuario_id, nombre, correo, rol, fk_institucion, estado) VALUES (UNHEX(?), ?, ?, 'administrador', UNHEX(?), 'activo')",
      [adminID, name, email, instituteID]
    );

    // Generación de código de verificación para enviar al correo
    const verificationCode = Math.floor(
      100000 + Math.random() * 900000
    ).toString();
    await sendWellcomeEmail(email, verificationCode);

    const verificationCodeID = uuidv4().replace(/-/g, "");
    const expirationDate = new Date();
    expirationDate.setHours(expirationDate.getHours() + 1);

    await db.query(
      "INSERT INTO codigos_verificacion (codigo_id, fk_usuario, codigo, valido_hasta) VALUES (UNHEX(?), UNHEX(?), ?, ?)",
      [verificationCodeID, adminID, verificationCode, expirationDate]
    );

    // Registro de pago y suscripción
    const subscriptionID = uuidv4().replace(/-/g, "");
    await db.query(
      "INSERT INTO suscripciones (suscripcion_id, fk_administrador, fecha_inicio, fecha_fin, estado) VALUES (UNHEX(?), UNHEX(?), ?, ?, 'activa')",
      [
        subscriptionID,
        adminID,
        new Date(),
        new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
      ]
    );

    const paymentID = uuidv4().replace(/-/g, "");
    await db.query(
      "INSERT INTO pagos (pago_id, fk_suscripcion, monto, metodo_pago, referencia_pago, estado, fecha_pago) VALUES (UNHEX(?), UNHEX(?), ?, ?, ?, 'completado', ?)",
      [
        paymentID,
        subscriptionID,
        amountInLocalCurrency,
        payment_method,
        paymentResult.id,
        new Date(),
      ] // Usa paymentResult.id como referencia de pago
    );

    await db.query("COMMIT");

    // Generación del token
    const token = generateToken({ id: adminID, role: "administrador" });

    return res.status(201).json({
      success: true,
      message: "Registro exitoso. Revise su correo para continuar",
      token,
      usuario: {
        id: adminID,
        name,
        email,
        rol: "administrador",
      },
    });
  } catch (error) {
    await db.query("ROLLBACK");
    console.error(`Error durante el registro de administrador: ${error}`);
    return res.status(500).json({
      error: "Error durante el registro. Inténtalo más tarde",
    });
  }
};

exports.loginAdmin = async (req, res) => {
  const { email } = req.body;
  try {
    // Verificar que el usuario existe
    const [existingUser] = await db.query(
      "SELECT * FROM usuarios WHERE correo = ?",
      [email]
    );

    if (existingUser.length < 1) {
      return res.status(400).json({ error: "El usuario no existe" });
    }

    // Generación de código de verificación para enviar al correo
    const verificationCode = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    await sendVerificationCode(email, verificationCode);

    // Eliminar el código de verificación existente y registrar el nuevo
    await db.query("START TRANSACTION");
    await db.query("DELETE FROM codigos_verificacion WHERE fk_usuario = ?", [
      existingUser[0].usuario_id,
    ]);

    await db.query("DELETE FROM intentos_verificacion WHERE fk_usuario = ?", [
      existingUser[0].usuario_id,
    ]);
    const verificationCodeID = Buffer.from(uuidv4().replace(/-/g, ""), "hex");
    const expirationDate = new Date();
    expirationDate.setHours(expirationDate.getHours() + 1);
    await db.query(
      "INSERT INTO codigos_verificacion (codigo_id, fk_usuario, codigo, valido_hasta) VALUES (?, ?, ?, ?)",
      [
        verificationCodeID,
        existingUser[0].usuario_id,
        verificationCode,
        expirationDate,
      ]
    );
    await db.query("COMMIT");
    return res.status(200).json({
      success: true,
      message: "Inicio de sesión exitoso. Revise su correo para continuar",
    });
  } catch (error) {
    await db.query("ROLLBACK");
    return res.status(500).json({
      error: "Error durante el inicio de sesión. Inténtalo más tarde",
    });
  }
};

exports.verifyCode = async (req, res) => {
  const { email, code } = req.body;

  try {
    // Buscar el administrador por correo
    const [existingAdmin] = await db.query(
      "SELECT usuario_id, nombre, correo, rol, fk_institucion FROM usuarios WHERE correo = ? AND rol = 'administrador'",
      [email]
    );

    if (existingAdmin.length < 1) {
      console.log("Correo electrónico no válido o no encontrado");
      return res
        .status(400)
        .json({ error: "Correo electrónico no válido o no encontrado" });
    }

    const admin = existingAdmin[0];

    // Verificar intentos de verificación
    const [attempts] = await db.query(
      "SELECT intentos, ultimo_intento FROM intentos_verificacion WHERE fk_usuario = ?",
      [admin.usuario_id]
    );

    if (attempts.length < 1) {
      await db.query(
        "INSERT INTO intentos_verificacion (intento_id, fk_usuario, intentos) VALUES (UUID_TO_BIN(UUID()), ?, 0)",
        [admin.usuario_id]
      );
    } else {
      const currentAttempts = attempts[0].intentos;
      if (currentAttempts >= 3) {
        return res.status(403).json({
          error:
            "Has alcanzado el límite de intentos fallidos. Solicita un nuevo código de verificación.",
        });
      }
    }

    // Verificar el código de seguridad
    const [verificationCode] = await db.query(
      "SELECT codigo, valido_hasta, verificado FROM codigos_verificacion WHERE fk_usuario = ? AND codigo = ?",
      [admin.usuario_id, code]
    );

    if (verificationCode.length < 1) {
      // Incrementar el contador de intentos fallidos
      await db.query(
        "UPDATE intentos_verificacion SET intentos = intentos + 1, ultimo_intento = CURRENT_TIMESTAMP WHERE fk_usuario = ?",
        [admin.usuario_id]
      );

      const [updatedAttempts] = await db.query(
        "SELECT intentos FROM intentos_verificacion WHERE fk_usuario = ?",
        [admin.usuario_id]
      );

      const intentosRestantes = 3 - updatedAttempts[0].intentos;

      return res.status(401).json({
        error: `Código de verificación incorrecto. Intentos restantes: ${intentosRestantes}`,
      });
    }

    const codeDetails = verificationCode[0];

    // Verificar si el código ha expirado
    if (new Date(codeDetails.valido_hasta) < new Date()) {
      return res.status(410).json({
        error:
          "El código de verificación ha expirado. Solicita un nuevo código.",
      });
    }

    // Si el código es correcto, marcarlo como verificado
    await db.query(
      "UPDATE codigos_verificacion SET verificado = TRUE WHERE fk_usuario = ? AND codigo = ?",
      [admin.usuario_id, code]
    );

    await db.query(
      "UPDATE intentos_verificacion SET intentos = 0 WHERE fk_usuario = ?",
      [admin.usuario_id]
    );

    // Convertir el usuario_id de Buffer a string hexadecimal
    const formattedUserId = formatUUID(admin.usuario_id);
    const formattedInstitutionId = formatUUID(admin.fk_institucion);

    // Generar el token
    const token = generateToken({
      id: formattedUserId,
      role: admin.rol,
      schoolId: formattedInstitutionId,
    });

    return res.status(200).json({
      success: true,
      message: "Inicio de sesión exitoso",
      token,
      usuario: {
        id: formattedUserId,
        name: admin.nombre,
        email: admin.correo,
        rol: admin.rol,
      },
    });
  } catch (error) {
    console.error(
      `Error durante la verificación de código de seguridad: ${error}`
    );
    return res.status(500).json({
      error: "Error durante la verificación de código. Inténtalo más tarde.",
    });
  }
};

exports.loginTeacher = async (req, res) => {
  const { code } = req.body;
  try {
    // Verificar que el código del docente sea válido
    const [existingTeacher] = await db.query(
      "SELECT * FROM usuarios WHERE codigo_registro = ?",
      [code]
    );

    if (existingTeacher.length < 1) {
      return res.status(400).json({ error: "Código de registro inválido" });
    }

    // Verificar que el estado del usuario sea activo
    const teacher = existingTeacher[0];
    if (teacher.estado !== "activo") {
      return res
        .status(403)
        .json({ error: "Acceso denegado. Usuario no activo" });
    }

    // Generar el token

    // Convertir usuario_id y fk_institucion a formato UUID

    const token = generateToken({
      id: formatUUID(teacher.usuario_id),
      role: teacher.rol,
    });

    return res.status(200).json({
      success: true,
      message: "Inicio de sesión exitoso",
      token,
      usuario: {
        id: formatUUID(teacher.usuario_id),
        name: teacher.nombre,
        estado: teacher.estado,
        rol: teacher.rol,
        fk_institucion: formatUUID(teacher.fk_institucion),
      },
    });
  } catch (error) {
    console.error(`Error durante el inicio de sesión como docente: ${error}`);
    return res.status(500).json({
      error: "Error durante el inicio de sesión. Inténtalo más tarde",
    });
  }
};

exports.loginStudent = async (req, res) => {
  const { examCode } = req.body;

  try {
    // Verificar si el examen existe
    const [existingExam] = await db.query(
      "SELECT * FROM examenes WHERE codigo_examen = ?",
      [examCode]
    );

    if (existingExam.length < 1) {
      return res
        .status(400)
        .json({ error: "El código del examen es inválido" });
    }

    const exam = existingExam[0];

    // Verificar el estado del examen
    if (exam.estado !== "activo") {
      return res
        .status(403)
        .json({ error: "Acceso denegado. El examen no está activo" });
    }

    // Verificar si fk_docente está presente
    if (!exam.fk_docente) {
      return res
        .status(500)
        .json({ error: "No se encontró el docente del examen" });
    }

    // Obtener la institución asociada al docente
    const [docenteData] = await db.query(
      "SELECT fk_institucion FROM usuarios WHERE usuario_id = UNHEX(?)",
      [exam.fk_docente.toString("hex")] // Convierte el Buffer a string hexadecimal
    );

    if (docenteData.length < 1) {
      return res
        .status(500)
        .json({ error: "No se encontró la institución asociada al docente" });
    }

    const institutionId = docenteData[0].fk_institucion;

    const studentID = uuidv4().replace(/-/g, ""); // Generar un nuevo ID de estudiante

    // Registrar al estudiante en la tabla de usuarios
    await db.query(
      "INSERT INTO usuarios (usuario_id, rol, fk_institucion, estado) VALUES (UNHEX(?), 'alumno', UNHEX(?), 'activo')",
      [studentID, institutionId.toString("hex")] // Asegúrate de convertir a string hexadecimal
    );

    // Generar el token para el estudiante
    const token = generateToken({
      id: formatUUID(studentID),
      role: 'alumno',
      schoolId: formatUUID(institutionId),
      time: Math.floor(Date.now() / 1000) + exam.duracionExamen * 60
    });

    return res.status(200).json({
      success: true,
      message: "Acceso al examen permitido",
      token,
      exam: formatUUID(exam.examen_id)
    });
  } catch (error) {
    console.error(`Error durante el inicio de sesión del alumno: ${error.message}`);
    return res.status(500).json({
      error: "Error durante el inicio de sesión. Inténtalo más tarde"
    });
  }
};
