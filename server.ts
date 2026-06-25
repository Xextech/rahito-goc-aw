import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // SMTP Email notification route for bookings (translates to PHPMailer logic in Node)
  app.post("/api/notify-reservation", async (req, res) => {
    const { name, email, phone, date, time, guests, bookingRef } = req.body;
    if (!name || !email || !date || !time || !guests) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      const smtpHost = process.env.SMTP_HOST;
      const smtpPort = parseInt(process.env.SMTP_PORT || "587");
      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;
      const ownerEmail = process.env.OWNER_EMAIL || "bove.abt@gmail.com";

      let transporter = null;
      if (smtpHost && smtpUser && smtpPass) {
        transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
        });
      }

      const emailSubject = `🍽️ Nueva Reserva en Rahito Głogów - ${name}`;
      const emailText = `Se ha recibido una nueva reserva exclusiva:
- Nombre: ${name}
- Email: ${email}
- Teléfono: ${phone || 'N/D'}
- Fecha: ${date}
- Hora: ${time}
- Personas: ${guests} comensales
- Referencia: ${bookingRef}

Gestione sus mesas desde el Portal del Propietario en la web.`;

      const emailHtml = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; background-color: #0c0b0a; color: #e7e5e4; border: 1px solid #d97706; border-radius: 4px;">
          <h2 style="color: #d97706; font-family: serif; font-style: italic; border-bottom: 1px solid #292524; padding-bottom: 12px; margin-top: 0;">Rahito Głogów</h2>
          <p style="font-size: 14px; line-height: 1.6; color: #a8a29e;">Se ha registrado una nueva reserva exclusiva a través de la web:</p>
          <div style="background-color: #1c1917; padding: 15px; border-radius: 4px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="border-bottom: 1px solid #292524;"><td style="padding: 10px 0; font-weight: bold; color: #d97706; width: 35%; font-size: 13px; text-transform: uppercase;">Cliente:</td><td style="color: #f5f5f4;">${name}</td></tr>
              <tr style="border-bottom: 1px solid #292524;"><td style="padding: 10px 0; font-weight: bold; color: #d97706; font-size: 13px; text-transform: uppercase;">Email:</td><td style="color: #f5f5f4;">${email}</td></tr>
              <tr style="border-bottom: 1px solid #292524;"><td style="padding: 10px 0; font-weight: bold; color: #d97706; font-size: 13px; text-transform: uppercase;">Teléfono:</td><td style="color: #f5f5f4;">${phone || 'N/D'}</td></tr>
              <tr style="border-bottom: 1px solid #292524;"><td style="padding: 10px 0; font-weight: bold; color: #d97706; font-size: 13px; text-transform: uppercase;">Fecha:</td><td style="color: #f5f5f4;">${date}</td></tr>
              <tr style="border-bottom: 1px solid #292524;"><td style="padding: 10px 0; font-weight: bold; color: #d97706; font-size: 13px; text-transform: uppercase;">Hora:</td><td style="color: #f5f5f4;">${time}</td></tr>
              <tr style="border-bottom: 1px solid #292524;"><td style="padding: 10px 0; font-weight: bold; color: #d97706; font-size: 13px; text-transform: uppercase;">Comensales:</td><td style="color: #f5f5f4; font-weight: bold;">${guests} comensales</td></tr>
              <tr><td style="padding: 10px 0; font-weight: bold; color: #d97706; font-size: 13px; text-transform: uppercase;">Ref ID:</td><td style="font-family: monospace; color: #f5f5f4;">${bookingRef}</td></tr>
            </table>
          </div>
          <p style="font-size: 12px; color: #78716c; margin-bottom: 0;">Este es un mensaje automático de Rahito Głogów. Gestione las mesas en tiempo real en la plataforma.</p>
        </div>
      `;

      if (transporter) {
        await transporter.sendMail({
          from: `"Portal Rahito" <no-reply@rahito.com>`,
          to: ownerEmail,
          subject: emailSubject,
          text: emailText,
          html: emailHtml,
        });
        console.log(`[SMTP] Success: Real booking email dispatched to ${ownerEmail}`);
        return res.json({ status: "sent", message: "Email sent successfully" });
      } else {
        console.log(`\n======================================================`);
        console.log(`[SMTP SIMULATION] (Configure SMTP_HOST in .env for real send)`);
        console.log(`To: ${ownerEmail}`);
        console.log(`Subject: ${emailSubject}`);
        console.log(`Message Body:\n${emailText}`);
        console.log(`======================================================\n`);
        return res.json({ status: "simulated", message: "SMTP simulated successfully in logs" });
      }
    } catch (err: any) {
      console.error("[SMTP Error] Failed to send email:", err);
      // Fallback so client flow doesn't hang
      return res.status(200).json({ status: "error", error: err.message, message: "Email triggering failed but booking preserved" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
