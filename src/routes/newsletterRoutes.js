const { Router } = require('express');
const nodemailer = require('nodemailer');

const router = Router();

router.post('/', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: 'El email es requerido' });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    // Send email to admin
    await transporter.sendMail({
      from: `"Tearz 1874!" <${process.env.EMAIL_USER}>`,
      to: process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
      subject: 'Nueva suscripción al Newsletter 🎉',
      text: `El usuario con email ${email} se ha suscrito al newsletter.`,
      html: `<p>El usuario con email <strong>${email}</strong> se ha suscrito al newsletter.</p>`,
    });

    // Optional: send welcome email to user
    await transporter.sendMail({
      from: `"Tearz 1874!" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '¡Bienvenido al Newsletter de Tearz 1874! 🖤',
      text: 'Gracias por suscribirte. Vas a recibir todas nuestras novedades y drops.',
      html: '<p>Gracias por suscribirte. Vas a recibir todas nuestras novedades y drops.</p>',
    });

    res.json({ success: true, message: 'Suscripción exitosa' });
  } catch (error) {
    console.error('Error enviando newsletter:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
});

module.exports = router;
