const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,          // smtp.gmail.com
  port: process.env.EMAIL_PORT,          // 587
  secure: process.env.EMAIL_SECURE === "true", // false si usas 587
  auth: {
    user: process.env.EMAIL_USER,        // tu correo
    pass: process.env.EMAIL_PASS,        // tu contraseña o app password
  },
});
