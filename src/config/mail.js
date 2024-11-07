const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

// Configuración del transporte de correo
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const mailOptions = (email, subject, htmlContent) => {
  return {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: subject,
    html: htmlContent,
  };
};

// Envío de correo con código de verificación para registro
const sendWellcomeEmail = async (email, verificationCode) => {
  const htmlTemplatePath = path.join(
    __dirname,
    "../templates/wellcomeCode.html"
  );

  // Leer el archivo HTML y remplazar el código de verificación
  let htmlContent = fs.readFileSync(htmlTemplatePath, "utf8");
  htmlContent = htmlContent.replace("{{verificationCode}}", verificationCode);

  const data = mailOptions(email, "Bienvenido a ALEX", htmlContent);

  return transporter.sendMail(data);
};

// Envío de correo con código de verificación 
const sendVerificationCode = async (email, verificationCode) => {
  const htmlTemplatePath = path.join(__dirname, "../templates/verificationCode.html");

  let htmlContent = fs.readFileSync(htmlTemplatePath, "utf8");
  htmlContent = htmlContent.replace("{{verificationCode}}", verificationCode);

  const data = mailOptions(email, "Código de verificación", htmlContent);
  return transporter.sendMail(data); 
}

module.exports = {
  sendWellcomeEmail,
  sendVerificationCode
};
