import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase for server-side reservation lookups/cancellations
const firebaseConfig = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "firebase-applet-config.json"), "utf8")
);
const firebaseApp = initializeApp(firebaseConfig, "server-app");
const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

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
      const ownerEmail = process.env.OWNER_EMAIL || "Rahitorestaurant@gmail.com";

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

      const baseUrl = process.env.APP_URL || `${req.headers["x-forwarded-proto"] || "https"}://${req.get("host")}`;
      const adminUrl = `${baseUrl.replace(/\/$/, "")}/?admin=true`;
      const cancelUrl = `${baseUrl.replace(/\/$/, "")}/api/cancel-reservation?id=${bookingRef}`;

      // 1. Owner's Email (contains admin portal link)
      const ownerSubject = `🍽️ Nueva Reserva en Rahito Głogów - ${name}`;
      const ownerText = `Se ha recibido una nueva reserva exclusiva:
- Nombre: ${name}
- Email: ${email}
- Teléfono: ${phone || 'N/D'}
- Fecha: ${date}
- Hora: ${time}
- Personas: ${guests} comensales
- Referencia: ${bookingRef}

Gestione sus mesas directamente desde el Panel de Administración:
${adminUrl}`;

      const ownerHtml = `
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

          <div style="text-align: center; margin: 30px 0;">
            <a href="${adminUrl}" target="_blank" style="background-color: #d97706; color: #0c0b0a; padding: 14px 28px; text-decoration: none; font-weight: bold; font-family: sans-serif; font-size: 13px; text-transform: uppercase; letter-spacing: 0.1em; border-radius: 4px; display: inline-block;">
              Ver Reservas en el Portal
            </a>
          </div>

          <p style="font-size: 12px; color: #78716c; margin-bottom: 0; text-align: center; border-top: 1px solid #292524; padding-top: 15px;">Este es un mensaje automático de Rahito Głogów. Gestione las mesas en tiempo real en la plataforma.</p>
        </div>
      `;

      // 2. Client's Email (no admin portal link)
      const clientSubject = `✨ Tu Reserva ha sido Confirmada - Rahito Głogów`;
      const clientText = `¡Hola ${name}!

Tu reserva en Rahito Głogów ha sido confirmada con éxito. Esperamos darte la bienvenida para ofrecerte una experiencia culinaria excepcional.

Detalles de tu reserva:
- Fecha: ${date}
- Hora: ${time}
- Comensales: ${guests} personas
- Referencia de Reserva: ${bookingRef}

Si deseas realizar modificaciones o tienes peticiones especiales, por favor ponte en contacto con nosotros respondiendo a este correo.
¡Te esperamos pronto!`;

      const clientHtml = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; background-color: #0c0b0a; color: #e7e5e4; border: 1px solid #d97706; border-radius: 4px;">
          <h2 style="color: #d97706; font-family: serif; font-style: italic; border-bottom: 1px solid #292524; padding-bottom: 12px; margin-top: 0; text-align: center;">Rahito Głogów</h2>
          <p style="font-size: 14px; line-height: 1.6; color: #e7e5e4; text-align: center; font-weight: bold;">¡Tu reserva ha sido confirmada!</p>
          <p style="font-size: 14px; line-height: 1.6; color: #a8a29e; text-align: center;">Hola ${name}, tu mesa está reservada. Nos complace confirmarte los detalles de tu visita:</p>
          
          <div style="background-color: #1c1917; padding: 15px; border-radius: 4px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="border-bottom: 1px solid #292524;"><td style="padding: 10px 0; font-weight: bold; color: #d97706; width: 35%; font-size: 13px; text-transform: uppercase;">Fecha:</td><td style="color: #f5f5f4;">${date}</td></tr>
              <tr style="border-bottom: 1px solid #292524;"><td style="padding: 10px 0; font-weight: bold; color: #d97706; font-size: 13px; text-transform: uppercase;">Hora:</td><td style="color: #f5f5f4;">${time}</td></tr>
              <tr style="border-bottom: 1px solid #292524;"><td style="padding: 10px 0; font-weight: bold; color: #d97706; font-size: 13px; text-transform: uppercase;">Comensales:</td><td style="color: #f5f5f4; font-weight: bold;">${guests} comensales</td></tr>
              <tr><td style="padding: 10px 0; font-weight: bold; color: #d97706; font-size: 13px; text-transform: uppercase;">Ref ID:</td><td style="font-family: monospace; color: #f5f5f4;">${bookingRef}</td></tr>
            </table>
          </div>

          <p style="font-size: 13px; line-height: 1.6; color: #a8a29e; text-align: center; margin-top: 25px;">Si necesitas realizar algún cambio o tienes alguna petición especial, ponte en contacto con nosotros.</p>
          
          <div style="text-align: center; margin: 25px 0;">
            <a href="${cancelUrl}" target="_blank" style="background-color: #7f1d1d; color: #fecaca; padding: 12px 24px; text-decoration: none; font-weight: bold; font-family: sans-serif; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; border-radius: 4px; display: inline-block; border: 1px solid #dc2626;">
              Anular mi Reserva
            </a>
          </div>

          <p style="font-size: 12px; color: #78716c; margin-bottom: 0; text-align: center; border-top: 1px solid #292524; padding-top: 15px;">Gracias por elegir Rahito Głogów. ¡Te esperamos pronto!</p>
        </div>
      `;

      if (transporter) {
        // Send email to the Owner
        await transporter.sendMail({
          from: `"Portal Rahito" <no-reply@rahito.com>`,
          to: ownerEmail,
          subject: ownerSubject,
          text: ownerText,
          html: ownerHtml,
        });
        console.log(`[SMTP] Success: Real booking email dispatched to Owner: ${ownerEmail}`);

        // Send email to the Client
        await transporter.sendMail({
          from: `"Rahito Głogów" <no-reply@rahito.com>`,
          to: email,
          subject: clientSubject,
          text: clientText,
          html: clientHtml,
        });
        console.log(`[SMTP] Success: Real confirmation email dispatched to Client: ${email}`);

        return res.json({ status: "sent", message: "Emails sent successfully" });
      } else {
        console.log(`\n======================================================`);
        console.log(`[SMTP SIMULATION] (Configure SMTP_HOST in .env for real send)`);
        console.log(`To Owner: ${ownerEmail}`);
        console.log(`To Client: ${email}`);
        console.log(`Subject Owner: ${ownerSubject}`);
        console.log(`Subject Client: ${clientSubject}`);
        console.log(`======================================================\n`);
        return res.json({ status: "simulated", message: "SMTP simulated successfully in logs" });
      }
    } catch (err: any) {
      console.error("[SMTP Error] Failed to send email:", err);
      // Fallback so client flow doesn't hang
      return res.status(200).json({ status: "error", error: err.message, message: "Email triggering failed but booking preserved" });
    }
  });

  // SMTP cancellation route for customers
  app.get("/api/cancel-reservation", async (req, res) => {
    const bookingId = req.query.id as string;
    if (!bookingId) {
      return res.status(400).send("Falta el identificador de la reserva (booking ID).");
    }

    try {
      // 1. Fetch the reservation from Firestore
      const docRef = doc(db, "reservations", bookingId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return res.status(404).send(`
          <!DOCTYPE html>
          <html lang="es">
          <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Reserva No Encontrada - Rahito Głogów</title>
              <style>
                  body { background-color: #0c0b0a; color: #e7e5e4; font-family: 'Playfair Display', Georgia, serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; text-align: center; }
                  .container { max-width: 500px; border: 1px solid #dc2626; background-color: #1c1917; padding: 40px; border-radius: 4px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); }
                  h1 { color: #dc2626; font-size: 2.5rem; font-weight: 300; margin-top: 0; font-style: italic; }
                  p { font-family: 'Inter', sans-serif; font-size: 0.95rem; line-height: 1.6; color: #a8a29e; margin-bottom: 30px; }
                  .btn { display: inline-block; background-color: #d97706; color: #0c0b0a; padding: 12px 28px; text-decoration: none; font-weight: bold; font-family: 'Inter', sans-serif; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.1em; border-radius: 4px; transition: background-color 0.2s; }
                  .btn:hover { background-color: #f59e0b; }
              </style>
              <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&family=Playfair+Display:ital,wght@0,400;1,400&display=swap" rel="stylesheet">
          </head>
          <body>
              <div class="container">
                  <h1>Rahito Głogów</h1>
                  <p>La reserva no existe o ya ha sido eliminada de nuestro sistema.</p>
                  <a href="/" class="btn">Volver al Sitio Web</a>
              </div>
          </body>
          </html>
        `);
      }

      const data = docSnap.data();
      const { name, email, phone, date, time, guests, status } = data;

      if (status === "cancelled") {
        return res.status(200).send(`
          <!DOCTYPE html>
          <html lang="es">
          <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Reserva Ya Anulada - Rahito Głogów</title>
              <style>
                  body { background-color: #0c0b0a; color: #e7e5e4; font-family: 'Playfair Display', Georgia, serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; text-align: center; }
                  .container { max-width: 500px; border: 1px solid #d97706; background-color: #1c1917; padding: 40px; border-radius: 4px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); }
                  h1 { color: #d97706; font-size: 2.5rem; font-weight: 300; margin-top: 0; font-style: italic; }
                  p { font-family: 'Inter', sans-serif; font-size: 0.95rem; line-height: 1.6; color: #a8a29e; margin-bottom: 30px; }
                  .btn { display: inline-block; background-color: #d97706; color: #0c0b0a; padding: 12px 28px; text-decoration: none; font-weight: bold; font-family: 'Inter', sans-serif; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.1em; border-radius: 4px; transition: background-color 0.2s; }
                  .btn:hover { background-color: #f59e0b; }
              </style>
              <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&family=Playfair+Display:ital,wght@0,400;1,400&display=swap" rel="stylesheet">
          </head>
          <body>
              <div class="container">
                  <h1>Rahito Głogów</h1>
                  <p>Esta reserva para el día <strong>${date}</strong> a las <strong>${time}</strong> ya fue anulada previamente. La mesa se encuentra libre.</p>
                  <a href="/" class="btn">Volver al Sitio Web</a>
              </div>
          </body>
          </html>
        `);
      }

      // 2. Update status to 'cancelled' in Firestore
      await updateDoc(docRef, {
        status: "cancelled",
        updatedAt: serverTimestamp(),
      });

      // 3. Send notification emails to both Client and Owner
      const smtpHost = process.env.SMTP_HOST;
      const smtpPort = parseInt(process.env.SMTP_PORT || "587");
      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;
      const ownerEmail = process.env.OWNER_EMAIL || "Rahitorestaurant@gmail.com";

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

      // Cancellation Subject & Email template for Owner
      const ownerCancelSubject = `❌ Reserva ANULADA por Cliente - ${name}`;
      const ownerCancelText = `Se ha anulado una reserva en Rahito Głogów:
- Cliente: ${name}
- Email: ${email}
- Teléfono: ${phone || 'N/D'}
- Fecha: ${date}
- Hora: ${time}
- Personas: ${guests} comensales
- Referencia: ${bookingId}

La mesa ha sido liberada automáticamente en el sistema.`;

      const ownerCancelHtml = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; background-color: #0c0b0a; color: #e7e5e4; border: 1px solid #dc2626; border-radius: 4px;">
          <h2 style="color: #dc2626; font-family: serif; font-style: italic; border-bottom: 1px solid #292524; padding-bottom: 12px; margin-top: 0;">Rahito Głogów</h2>
          <p style="font-size: 14px; line-height: 1.6; color: #a8a29e;">Un cliente ha anulado su reserva a través de la web. La mesa ha sido liberada automáticamente en el sistema.</p>
          
          <div style="background-color: #1c1917; padding: 15px; border-radius: 4px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="border-bottom: 1px solid #292524;"><td style="padding: 10px 0; font-weight: bold; color: #dc2626; width: 35%; font-size: 13px; text-transform: uppercase;">Cliente:</td><td style="color: #f5f5f4;">${name}</td></tr>
              <tr style="border-bottom: 1px solid #292524;"><td style="padding: 10px 0; font-weight: bold; color: #dc2626; font-size: 13px; text-transform: uppercase;">Email:</td><td style="color: #f5f5f4;">${email}</td></tr>
              <tr style="border-bottom: 1px solid #292524;"><td style="padding: 10px 0; font-weight: bold; color: #dc2626; font-size: 13px; text-transform: uppercase;">Teléfono:</td><td style="color: #f5f5f4;">${phone || 'N/D'}</td></tr>
              <tr style="border-bottom: 1px solid #292524;"><td style="padding: 10px 0; font-weight: bold; color: #dc2626; font-size: 13px; text-transform: uppercase;">Fecha:</td><td style="color: #f5f5f4;">${date}</td></tr>
              <tr style="border-bottom: 1px solid #292524;"><td style="padding: 10px 0; font-weight: bold; color: #dc2626; font-size: 13px; text-transform: uppercase;">Hora:</td><td style="color: #f5f5f4;">${time}</td></tr>
              <tr style="border-bottom: 1px solid #292524;"><td style="padding: 10px 0; font-weight: bold; color: #dc2626; font-size: 13px; text-transform: uppercase;">Comensales:</td><td style="color: #f5f5f4; font-weight: bold;">${guests} comensales</td></tr>
              <tr><td style="padding: 10px 0; font-weight: bold; color: #dc2626; font-size: 13px; text-transform: uppercase;">Ref ID:</td><td style="font-family: monospace; color: #f5f5f4;">${bookingId}</td></tr>
            </table>
          </div>
          <p style="font-size: 12px; color: #78716c; margin-bottom: 0; text-align: center; border-top: 1px solid #292524; padding-top: 15px;">Este es un mensaje automático de Rahito Głogów. Panel de administración actualizado.</p>
        </div>
      `;

      // Cancellation Subject & Email template for Client
      const clientCancelSubject = `❌ Confirmación de Anulación de Reserva - Rahito Głogów`;
      const clientCancelText = `Hola ${name},
      
Te confirmamos que tu reserva en Rahito Głogów ha sido anulada con éxito y tu mesa ha sido liberada en nuestro sistema.

Detalles de la reserva anulada:
- Fecha: ${date}
- Hora: ${time}
- Comensales: ${guests} personas
- Referencia: ${bookingId}

Esperamos tener la oportunidad de recibirte en otra ocasión. ¡Muchas gracias!`;

      const clientCancelHtml = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; background-color: #0c0b0a; color: #e7e5e4; border: 1px solid #dc2626; border-radius: 4px;">
          <h2 style="color: #dc2626; font-family: serif; font-style: italic; border-bottom: 1px solid #292524; padding-bottom: 12px; margin-top: 0; text-align: center;">Rahito Głogów</h2>
          <p style="font-size: 14px; line-height: 1.6; color: #e7e5e4; text-align: center; font-weight: bold;">Anulación de Reserva Confirmada</p>
          <p style="font-size: 14px; line-height: 1.6; color: #a8a29e; text-align: center;">Hola ${name}, te confirmamos que tu reserva ha sido anulada correctamente y la mesa se encuentra liberada.</p>
          
          <div style="background-color: #1c1917; padding: 15px; border-radius: 4px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="border-bottom: 1px solid #292524;"><td style="padding: 10px 0; font-weight: bold; color: #dc2626; width: 35%; font-size: 13px; text-transform: uppercase;">Fecha:</td><td style="color: #f5f5f4;">${date}</td></tr>
              <tr style="border-bottom: 1px solid #292524;"><td style="padding: 10px 0; font-weight: bold; color: #dc2626; font-size: 13px; text-transform: uppercase;">Hora:</td><td style="color: #f5f5f4;">${time}</td></tr>
              <tr style="border-bottom: 1px solid #292524;"><td style="padding: 10px 0; font-weight: bold; color: #dc2626; font-size: 13px; text-transform: uppercase;">Comensales:</td><td style="color: #f5f5f4; font-weight: bold;">${guests} comensales</td></tr>
              <tr><td style="padding: 10px 0; font-weight: bold; color: #dc2626; font-size: 13px; text-transform: uppercase;">Ref ID:</td><td style="font-family: monospace; color: #f5f5f4;">${bookingId}</td></tr>
            </table>
          </div>

          <p style="font-size: 13px; line-height: 1.6; color: #a8a29e; text-align: center; margin-top: 25px;">Esperamos poder ofrecerte una mesa en otra ocasión.</p>
          <p style="font-size: 12px; color: #78716c; margin-bottom: 0; text-align: center; border-top: 1px solid #292524; padding-top: 15px;">Gracias por informarnos. ¡Hasta pronto!</p>
        </div>
      `;

      if (transporter) {
        // Send email to Owner
        await transporter.sendMail({
          from: `"Portal Rahito" <no-reply@rahito.com>`,
          to: ownerEmail,
          subject: ownerCancelSubject,
          text: ownerCancelText,
          html: ownerCancelHtml,
        });
        console.log(`[SMTP] Cancel notification sent to Owner: ${ownerEmail}`);

        // Send email to Client
        await transporter.sendMail({
          from: `"Rahito Głogów" <no-reply@rahito.com>`,
          to: email,
          subject: clientCancelSubject,
          text: clientCancelText,
          html: clientCancelHtml,
        });
        console.log(`[SMTP] Cancel confirmation sent to Client: ${email}`);
      } else {
        console.log(`\n======================================================`);
        console.log(`[SMTP SIMULATION] (Cancel Email triggered)`);
        console.log(`To Owner: ${ownerEmail}`);
        console.log(`To Client: ${email}`);
        console.log(`Subject Owner: ${ownerCancelSubject}`);
        console.log(`Subject Client: ${clientCancelSubject}`);
        console.log(`======================================================\n`);
      }

      // 4. Return successful cancellation HTML page
      return res.status(200).send(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reserva Anulada con Éxito - Rahito Głogów</title>
            <style>
                body { background-color: #0c0b0a; color: #e7e5e4; font-family: 'Playfair Display', Georgia, serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; text-align: center; }
                .container { max-width: 500px; border: 1px solid #dc2626; background-color: #1c1917; padding: 40px; border-radius: 4px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); }
                h1 { color: #dc2626; font-size: 2.5rem; font-weight: 300; margin-top: 0; font-style: italic; }
                p { font-family: 'Inter', sans-serif; font-size: 0.95rem; line-height: 1.6; color: #a8a29e; margin-bottom: 30px; }
                .details { border-top: 1px solid #292524; border-bottom: 1px solid #292524; padding: 20px 0; margin-bottom: 30px; text-align: left; font-family: 'Inter', sans-serif; font-size: 0.9rem; }
                .detail-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
                .detail-row:last-child { margin-bottom: 0; }
                .label { color: #dc2626; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.1em; font-weight: bold; }
                .value { color: #f5f5f4; }
                .btn { display: inline-block; background-color: #d97706; color: #0c0b0a; padding: 12px 28px; text-decoration: none; font-weight: bold; font-family: 'Inter', sans-serif; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.1em; border-radius: 4px; transition: background-color 0.2s; }
                .btn:hover { background-color: #f59e0b; }
            </style>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&family=Playfair+Display:ital,wght@0,400;1,400&display=swap" rel="stylesheet">
        </head>
        <body>
            <div class="container">
                <h1>Rahito Głogów</h1>
                <p>Su reserva ha sido anulada correctamente en nuestro sistema y la mesa ha sido liberada.</p>
                
                <div class="details">
                    <div class="detail-row">
                        <span class="label">Cliente:</span>
                        <span class="value">${name}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Fecha:</span>
                        <span class="value">${date}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Hora:</span>
                        <span class="value">${time}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Comensales:</span>
                        <span class="value">${guests} comensales</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Ref ID:</span>
                        <span class="value" style="font-family: monospace;">${bookingId}</span>
                    </div>
                </div>

                <a href="/" class="btn">Volver al Sitio Web</a>
            </div>
        </body>
        </html>
      `);
    } catch (err: any) {
      console.error("[Cancellation Error]:", err);
      return res.status(500).send(`Error al procesar la anulación de la reserva: ${err.message}`);
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
