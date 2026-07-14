import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { initializeApp as initializeAdminApp, applicationDefault, App as AdminApp } from "firebase-admin/app";
import { getFirestore as getAdminFirestore, FieldValue, Firestore as AdminFirestore } from "firebase-admin/firestore";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import fs from "fs";
import {
  DEFAULT_TABLES,
  FULL_RESTAURANT_LABEL,
  TableDef,
  ReservationSlot,
  autoAssignTables,
  hasFullDayEvent,
  isActiveReservation,
} from "./src/lib/reservationUtils";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize the public Firebase client SDK — used only for the narrow,
// intentionally-public operations already scoped tightly by Firestore
// rules (get-by-id and self-cancellation via a reservation's own link).
const firebaseConfig = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "firebase-applet-config.json"), "utf8")
);
const firebaseApp = initializeApp(firebaseConfig, "server-app");
const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

// Initialize Firebase Admin (server-only, bypasses Firestore security
// rules entirely) so personal reservation data is never readable by an
// unauthenticated client — only by this trusted server process.
//
// On Cloud Run this picks up the service's attached identity automatically
// via Application Default Credentials (no secret to manage). For local
// development, run `gcloud auth application-default login`, or point
// GOOGLE_APPLICATION_CREDENTIALS at a service account key file.
//
// Credentials are resolved lazily by the underlying gRPC client, so a
// missing/broken ADC setup does NOT surface as a rejection on the first
// real request — it can throw as an unhandled rejection at the process
// level and crash the whole server. To avoid that, we force credential
// resolution here at startup with a real (tiny) read, inside a try/catch,
// before any request is ever served.
let adminDb: AdminFirestore | null = null;
let adminApp: AdminApp | null = null;
// The Admin app object is created once and reused; only the Firestore
// connectivity check ("did the read succeed?") is retried. Retrying
// initializeApp() would throw "app already exists".
let adminAppInstance: AdminApp | null = null;
let lastInitAttempt = 0;
const INIT_RETRY_COOLDOWN_MS = 15_000;

// Attempts to (re)establish the Firestore connection. Safe to call on every
// request: if it already succeeded it's a no-op, and if it previously failed
// it retries at most once every INIT_RETRY_COOLDOWN_MS. This means that once
// the Cloud Run service account is granted Firestore access (or the API is
// enabled), the running container heals itself within ~15s — no redeploy
// needed.
async function ensureAdminFirestore(): Promise<boolean> {
  if (adminDb) return true;

  const now = Date.now();
  if (now - lastInitAttempt < INIT_RETRY_COOLDOWN_MS) return false;
  lastInitAttempt = now;

  try {
    if (!adminAppInstance) {
      adminAppInstance = initializeAdminApp({
        credential: applicationDefault(),
        projectId: firebaseConfig.projectId,
      });
    }
    const fsdb = getAdminFirestore(adminAppInstance, firebaseConfig.firestoreDatabaseId);
    await fsdb.collection("health_check").limit(1).get();
    adminDb = fsdb;
    adminApp = adminAppInstance;
    console.log("[server] Firebase Admin initialized via Application Default Credentials.");
    return true;
  } catch (err: any) {
    console.warn("[server] Firebase Admin NOT ready — availability/booking/admin-login endpoints return 503. Will retry on the next request.");
    console.warn("[server]   Common causes: Firestore API disabled, or the Cloud Run service account lacks 'roles/datastore.user'.");
    console.warn("[server]   Reason:", err?.message || err);
    return false;
  }
}

// Last-resort safety net: a transient Firestore/auth hiccup must never take
// the whole site down. Log it and keep serving the rest of the app instead
// of letting Node crash the process on an unhandled rejection.
process.on("unhandledRejection", (reason) => {
  console.error("[server] Unhandled rejection (server kept alive):", reason);
});
process.on("uncaughtException", (err) => {
  console.error("[server] Uncaught exception (server kept alive):", err);
});

async function requireAdminDb(res: express.Response): Promise<AdminFirestore | null> {
  await ensureAdminFirestore();
  if (!adminDb) {
    res.status(503).json({ error: "server_not_configured", message: "El servidor aún no puede conectar con la base de datos. Inténtelo de nuevo en unos segundos." });
    return null;
  }
  return adminDb;
}

async function requireAdminApp(res: express.Response): Promise<AdminApp | null> {
  await ensureAdminFirestore();
  if (!adminApp) {
    res.status(503).json({ error: "server_not_configured", message: "El servidor aún no puede conectar con la base de datos. Inténtelo de nuevo en unos segundos." });
    return null;
  }
  return adminApp;
}

// ── Validation helpers (defense in depth; Firestore rules also validate) ──
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+\-()\s]{9,20}$/;
const MAX_ADVANCE_DAYS = 60;

function isValidBookingDate(dateStr: string): boolean {
  if (!DATE_RE.test(dateStr)) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(target.getTime())) return false;
  const diffDays = (target.getTime() - today.getTime()) / 86_400_000;
  if (diffDays < 0 || diffDays > MAX_ADVANCE_DAYS) return false;
  if (target.getDay() === 1) return false; // Monday: closed
  return true;
}

function buildTimeSlots(): string[] {
  const slots: string[] = [];
  for (let h = 8; h <= 22; h++) {
    const hh = String(h).padStart(2, "0");
    slots.push(`${hh}:00`);
    if (h !== 22) slots.push(`${hh}:30`);
  }
  return slots;
}
const TIME_SLOTS = buildTimeSlots();

async function loadTables(fsdb: AdminFirestore): Promise<TableDef[]> {
  const ref = fsdb.doc("settings/restaurant_layout");
  const snap = await ref.get();
  const data = snap.data();
  if (snap.exists && Array.isArray(data?.tables) && data!.tables.length > 0) {
    return data!.tables as TableDef[];
  }
  await ref.set({ tables: DEFAULT_TABLES });
  return DEFAULT_TABLES;
}

async function loadDayReservations(fsdb: AdminFirestore, date: string): Promise<Array<ReservationSlot & { id: string }>> {
  const snap = await fsdb.collection("reservations").where("date", "==", date).get();
  return snap.docs
    .map((d) => {
      const data = d.data();
      return {
        id: d.id,
        time: data.time as string,
        guests: Number(data.guests) || 0,
        status: (data.status as string) || "confirmed",
        tableIds: Array.isArray(data.tableIds) ? data.tableIds : undefined,
        tableId: data.tableId || undefined,
        type: data.type || "table",
      };
    })
    .filter(isActiveReservation);
}

function sendReservationEmails(params: {
  name: string; email: string; phone: string; date: string; time: string; guests: number;
  bookingRef: string; tableName?: string; type?: string; baseUrl: string;
}) {
  const { name, email, phone, date, time, guests, bookingRef, tableName, type, baseUrl } = params;
  const isEvent = type === "event";
  const displayTime = isEvent ? "Día completo (Evento Privado)" : time;
  const tableRowHtml = tableName
    ? `<tr style="border-bottom: 1px solid #292524;"><td style="padding: 10px 0; font-weight: bold; color: #d97706; font-size: 13px; text-transform: uppercase;">Mesa:</td><td style="color: #f5f5f4;">${tableName}</td></tr>`
    : "";

  return (async () => {
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
          auth: { user: smtpUser, pass: smtpPass },
        });
      }

      const adminUrl = `${baseUrl.replace(/\/$/, "")}/?admin=true`;
      const cancelUrl = `${baseUrl.replace(/\/$/, "")}/api/cancel-reservation?id=${bookingRef}`;

      const ownerSubject = isEvent
        ? `🎉 Nuevo Evento Privado en Rahito Głogów - ${name}`
        : `🍽️ Nueva Reserva en Rahito Głogów - ${name}`;
      const ownerText = `Se ha recibido una nueva ${isEvent ? 'reserva de EVENTO PRIVADO (restaurante completo)' : 'reserva exclusiva'}:
- Nombre: ${name}
- Email: ${email}
- Teléfono: ${phone || 'N/D'}
- Fecha: ${date}
- Hora: ${displayTime}
- Personas: ${guests} comensales${tableName ? `\n- Mesa: ${tableName}` : ''}
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
              <tr style="border-bottom: 1px solid #292524;"><td style="padding: 10px 0; font-weight: bold; color: #d97706; font-size: 13px; text-transform: uppercase;">Hora:</td><td style="color: #f5f5f4;">${displayTime}</td></tr>
              <tr style="border-bottom: 1px solid #292524;"><td style="padding: 10px 0; font-weight: bold; color: #d97706; font-size: 13px; text-transform: uppercase;">Comensales:</td><td style="color: #f5f5f4; font-weight: bold;">${guests} comensales</td></tr>
              ${tableRowHtml}
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

      const clientSubject = `✨ Tu Reserva ha sido Confirmada - Rahito Głogów`;
      const clientText = `¡Hola ${name}!

Tu reserva en Rahito Głogów ha sido confirmada con éxito. Esperamos darte la bienvenida para ofrecerte una experiencia culinaria excepcional.

Detalles de tu reserva:
- Fecha: ${date}
- Hora: ${displayTime}
- Comensales: ${guests} personas${tableName ? `\n- Mesa: ${tableName}` : ''}
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
              <tr style="border-bottom: 1px solid #292524;"><td style="padding: 10px 0; font-weight: bold; color: #d97706; font-size: 13px; text-transform: uppercase;">Hora:</td><td style="color: #f5f5f4;">${displayTime}</td></tr>
              <tr style="border-bottom: 1px solid #292524;"><td style="padding: 10px 0; font-weight: bold; color: #d97706; font-size: 13px; text-transform: uppercase;">Comensales:</td><td style="color: #f5f5f4; font-weight: bold;">${guests} comensales</td></tr>
              ${tableRowHtml}
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
        await transporter.sendMail({ from: `"Portal Rahito" <no-reply@rahito.com>`, to: ownerEmail, subject: ownerSubject, text: ownerText, html: ownerHtml });
        console.log(`[SMTP] Success: Real booking email dispatched to Owner: ${ownerEmail}`);
        await transporter.sendMail({ from: `"Rahito Głogów" <no-reply@rahito.com>`, to: email, subject: clientSubject, text: clientText, html: clientHtml });
        console.log(`[SMTP] Success: Real confirmation email dispatched to Client: ${email}`);
      } else {
        console.log(`\n======================================================`);
        console.log(`[SMTP SIMULATION] (Configure SMTP_HOST in .env for real send)`);
        console.log(`To Owner: ${ownerEmail}`);
        console.log(`To Client: ${email}`);
        console.log(`Subject Owner: ${ownerSubject}`);
        console.log(`Subject Client: ${clientSubject}`);
        console.log(`======================================================\n`);
      }
    } catch (err: any) {
      console.error("[SMTP Error] Failed to send email:", err);
    }
  })();
}

async function syncGoogleReviews(fsdb: AdminFirestore, lang: string): Promise<any> {
  const placeId = "ChIJL7umRjf1BUcR5lWohgdAFvo";
  const url = `https://places.googleapis.com/v1/places/${placeId}?languageCode=${lang}`;
  
  console.log(`[server] Syncing Google reviews (${lang}) from Google Places API...`);
  
  let token = "";
  try {
    const cred = applicationDefault();
    const tokenObj = await cred.getAccessToken();
    token = tokenObj.access_token;
  } catch (err: any) {
    console.error("[server] Failed to get OAuth2 token for Places API:", err.message || err);
    throw new Error("No se pudo obtener el token de acceso de Google.");
  }

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "X-Goog-FieldMask": "id,displayName,rating,userRatingCount,reviews"
    }
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("[server] Places API error response:", errText);
    throw new Error(`Google Places API returned status ${res.status}`);
  }

  const data = (await res.json()) as any;

  const rating = Number(data.rating) || 4.9;
  const userRatingCount = Number(data.userRatingCount) || 193;
  const reviews = (data.reviews || []).map((r: any) => ({
    authorName: r.authorAttribution?.displayName || "Anónimo",
    authorPhoto: r.authorAttribution?.photoUri || "",
    rating: Number(r.rating) || 5,
    text: r.text?.text || "",
    originalText: r.originalText?.text || "",
    languageCode: r.text?.languageCode || "",
    originalLanguageCode: r.originalText?.languageCode || "",
    relativeTime: r.relativePublishTimeDescription || "",
    publishTime: r.publishTime || "",
  }));

  const payload = {
    rating,
    userRatingCount,
    reviews,
    updatedAt: FieldValue.serverTimestamp(),
  };

  await fsdb.doc(`settings/google_reviews_${lang}`).set(payload);
  console.log(`[server] Google reviews (${lang}) successfully synced and cached in Firestore (${reviews.length} reviews).`);
  
  return {
    rating,
    userRatingCount,
    reviews,
    updatedAt: new Date().toISOString(),
  };
}

async function startServer() {
  // Best-effort first attempt at startup. If it fails (e.g. permissions not
  // yet granted), each incoming request will retry via ensureAdminFirestore,
  // so the container self-heals without a redeploy.
  await ensureAdminFirestore();

  const app = express();
  const PORT = parseInt(process.env.PORT || "3000");

  // Cloud Run sits exactly one reverse-proxy hop in front of this
  // container and sets X-Forwarded-For. Without telling Express to trust
  // that one hop, express-rate-limit refuses to trust the header and
  // throws on every request (ERR_ERL_UNEXPECTED_X_FORWARDED_FOR) instead
  // of just rate-limiting by the wrong IP — which took the whole site
  // down in production, including /api/health, so Cloud Run stopped
  // routing traffic entirely.
  app.set("trust proxy", 1);

  // Security headers. CSP is left to the app's own meta tags / build output
  // since Vite's dev middleware injects inline scripts that a strict CSP
  // here would break; the other helmet defaults (X-Content-Type-Options,
  // X-Frame-Options, etc.) still apply.
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(express.json({ limit: "15kb" }));

  // Health check first and unconditionally, before any middleware (rate
  // limiter, auth, etc.) that could ever fail — Cloud Run's readiness
  // probe must never depend on anything else being healthy.
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Rate limiting: protects against scripted abuse (calendar spam-filling,
  // scraping, brute-forcing cancellation links) without needing external
  // infrastructure. Limits are per-IP.
  const availabilityLimiter = rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: true, legacyHeaders: false });
  const bookingLimiter = rateLimit({ windowMs: 60 * 60_000, limit: 8, standardHeaders: true, legacyHeaders: false, message: { error: "rate_limited", message: "Demasiadas reservas desde este origen. Inténtelo de nuevo más tarde." } });
  const cancelLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 20, standardHeaders: true, legacyHeaders: false });
  const adminLoginLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 100, standardHeaders: true, legacyHeaders: false, message: { error: "rate_limited", message: "Demasiados intentos. Inténtelo de nuevo más tarde." } });
  const globalLimiter = rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: true, legacyHeaders: false });
  app.use("/api/", globalLimiter);

  // Public, PII-free availability for the booking calendar. Personal data
  // (name/email/phone) never leaves the server — only aggregate occupancy
  // (time, guests, assigned table ids, type) is returned.
  app.get("/api/availability", availabilityLimiter, async (req, res) => {
    const fsdb = await requireAdminDb(res);
    if (!fsdb) return;

    const start = String(req.query.start || "");
    const end = String(req.query.end || "");
    if (!DATE_RE.test(start) || !DATE_RE.test(end)) {
      return res.status(400).json({ error: "invalid_range", message: "start/end deben tener formato YYYY-MM-DD" });
    }
    const startMs = new Date(`${start}T00:00:00`).getTime();
    const endMs = new Date(`${end}T00:00:00`).getTime();
    const spanDays = (endMs - startMs) / 86_400_000;
    if (!(spanDays >= 0) || spanDays > MAX_ADVANCE_DAYS) {
      return res.status(400).json({ error: "invalid_range", message: "Rango de fechas inválido" });
    }

    try {
      const tables = await loadTables(fsdb);
      const snap = await fsdb.collection("reservations").where("date", ">=", start).where("date", "<=", end).get();
      const reservationsByDate: Record<string, Array<{ time: string; guests: number; tableIds: string[]; type: string; status: string }>> = {};
      snap.docs.forEach((d) => {
        const data = d.data();
        if (!isActiveReservation({ status: data.status || "confirmed" })) return;
        const date = data.date as string;
        if (!reservationsByDate[date]) reservationsByDate[date] = [];
        reservationsByDate[date].push({
          time: data.time,
          guests: Number(data.guests) || 0,
          tableIds: Array.isArray(data.tableIds) ? data.tableIds : (data.tableId ? [data.tableId] : []),
          type: data.type || "table",
          status: data.status || "confirmed",
        });
      });
      res.json({ tables, reservationsByDate });
    } catch (err: any) {
      console.error("[availability] failed:", err);
      res.status(500).json({ error: "internal_error" });
    }
  });

  // Reservation creation: fully server-validated and server-assigned so a
  // malicious client cannot lie about table availability, bypass the
  // 2-hour hold, or overbook a private-event day.
  app.post("/api/reservations", bookingLimiter, async (req, res) => {
    const fsdb = await requireAdminDb(res);
    if (!fsdb) return;

    const body = req.body || {};
    const mode = body.mode === "event" ? "event" : "table";
    const date = String(body.date || "");
    const name = String(body.name || "").trim().slice(0, 100);
    const email = String(body.email || "").trim().slice(0, 100);
    const phone = String(body.phone || "").trim().slice(0, 20);
    const guests = mode === "event" ? 20 : Math.trunc(Number(body.guests));
    const time = mode === "event" ? "00:00" : String(body.time || "");

    if (!isValidBookingDate(date)) {
      return res.status(400).json({ error: "invalid_date", message: "Fecha inválida, cerrada (lunes) o fuera de rango." });
    }
    if (name.length < 2 || !EMAIL_RE.test(email) || !PHONE_RE.test(phone)) {
      return res.status(400).json({ error: "invalid_contact", message: "Datos de contacto inválidos." });
    }
    if (mode === "table") {
      if (!TIME_RE.test(time) || !TIME_SLOTS.includes(time)) {
        return res.status(400).json({ error: "invalid_time", message: "Hora inválida." });
      }
      if (!Number.isInteger(guests) || guests < 1 || guests > 20) {
        return res.status(400).json({ error: "invalid_guests", message: "Número de comensales inválido." });
      }
    }

    try {
      const tables = await loadTables(fsdb);
      const dayReservations = await loadDayReservations(fsdb, date);

      let tableIds: string[];
      let tableName: string;

      if (mode === "event") {
        if (dayReservations.length > 0) {
          return res.status(409).json({ error: "day_taken", message: "Ese día ya tiene reservas y no puede bloquearse para un evento." });
        }
        tableIds = tables.map((t) => t.id);
        tableName = FULL_RESTAURANT_LABEL;
      } else {
        if (hasFullDayEvent(dayReservations)) {
          return res.status(409).json({ error: "day_taken", message: "Ese día está bloqueado por un evento privado." });
        }
        const assignment = autoAssignTables(dayReservations, tables, time, guests);
        if (!assignment) {
          return res.status(409).json({ error: "no_availability", message: "No quedan mesas disponibles para esa hora." });
        }
        tableIds = assignment.tableIds;
        tableName = assignment.tableName;
      }

      const reservationDoc = {
        date,
        time,
        guests,
        name,
        email,
        phone,
        status: "confirmed" as const,
        type: mode,
        tableId: tableIds[0] || "",
        tableIds,
        tableName,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };

      const ref = await fsdb.collection("reservations").add(reservationDoc);

      const forwardedHost = (req.headers["x-forwarded-host"] as string) || (req.headers["x-fh-requested-host"] as string);
      const baseUrl = process.env.APP_URL || `${req.headers["x-forwarded-proto"] || "https"}://${forwardedHost || req.get("host")}`;
      await sendReservationEmails({ name, email, phone, date, time, guests, bookingRef: ref.id, tableName, type: mode, baseUrl });

      res.status(201).json({ id: ref.id, date, time, guests, tableName, type: mode });
    } catch (err: any) {
      console.error("[reservations] create failed:", err);
      res.status(500).json({ error: "internal_error" });
    }
  });

  // Owner dashboard passphrase login. Verified server-side against
  // ADMIN_PASSPHRASE (never shipped to the client bundle) and, on success,
  // mints a real Firebase Auth custom token carrying an `owner` claim so
  // Firestore security rules can trust the session exactly like a Google
  // sign-in — the dashboard no longer has any privileged path that bypasses
  // Firestore rules.
  app.post("/api/admin/login", adminLoginLimiter, async (req, res) => {
    // Validate the passphrase FIRST, before touching Firebase, so a wrong
    // password always returns a clear 401 (and is never masked by an
    // unrelated server/database problem).
    const configured = process.env.ADMIN_PASSPHRASE;
    const passphrase = String(req.body?.passphrase || "");
    if (!configured) {
      return res.status(503).json({ error: "not_configured", message: "El acceso por contraseña no está configurado en el servidor (falta ADMIN_PASSPHRASE)." });
    }
    if (!passphrase || passphrase !== configured) {
      return res.status(401).json({ error: "invalid_passphrase", message: "Contraseña incorrecta." });
    }

    // Passphrase is correct — now we need the Admin app to mint a token.
    const application = await requireAdminApp(res);
    if (!application) return;

    try {
      const token = await getAdminAuth(application).createCustomToken("admin-passphrase", { owner: true });
      res.json({ token });
    } catch (err: any) {
      // Minting a custom token requires the runtime service account to be
      // able to sign (iam.serviceAccounts.signBlob), i.e. the
      // "Service Account Token Creator" role on itself. This is a separate
      // grant from Firestore access, so surface it clearly.
      console.error("[admin/login] failed to mint custom token:", err?.message || err);
      const needsSignPermission = /signBlob|iam\.serviceAccounts|permission/i.test(err?.message || "");
      res.status(needsSignPermission ? 503 : 500).json({
        error: needsSignPermission ? "token_signing_unavailable" : "internal_error",
        message: needsSignPermission
          ? "El servidor no puede firmar el token de sesión (falta el rol 'Service Account Token Creator')."
          : "Error interno al iniciar sesión.",
      });
    }
  });

  // SMTP cancellation route for customers
  app.get("/api/cancel-reservation", cancelLimiter, async (req, res) => {
    const bookingId = req.query.id as string;
    if (!bookingId) {
      return res.status(400).send("Falta el identificador de la reserva (booking ID).");
    }

    const fsdb = await requireAdminDb(res);
    if (!fsdb) return;

    try {
      // 1. Fetch the reservation from Firestore
      const docRef = fsdb.collection("reservations").doc(bookingId);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
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

      const data = docSnap.data()!;
      const { name, email, phone, date, time, guests, status, type } = data;

      if (type === "event") {
        return res.status(200).send(`
          <!DOCTYPE html>
          <html lang="es">
          <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Anulación de Evento Privado - Rahito Głogów</title>
              <style>
                  body { background-color: #0c0b0a; color: #e7e5e4; font-family: 'Playfair Display', Georgia, serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; text-align: center; }
                  .container { max-width: 500px; border: 1px solid #d97706; background-color: #1c1917; padding: 40px; border-radius: 4px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); }
                  h1 { color: #d97706; font-size: 2.2rem; font-weight: 300; margin-top: 0; font-style: italic; }
                  p { font-family: 'Inter', sans-serif; font-size: 0.95rem; line-height: 1.6; color: #a8a29e; margin-bottom: 20px; }
                  .phone-number { font-size: 1.8rem; font-family: 'Playfair Display', serif; font-style: italic; color: #f5f5f4; margin: 25px 0; font-weight: bold; }
                  .btn { display: inline-block; background-color: #d97706; color: #0c0b0a; padding: 12px 28px; text-decoration: none; font-weight: bold; font-family: 'Inter', sans-serif; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.1em; border-radius: 4px; transition: background-color 0.2s; margin-bottom: 12px; }
                  .btn:hover { background-color: #f59e0b; }
                  .btn-secondary { display: inline-block; color: #a8a29e; padding: 12px 28px; text-decoration: none; font-family: 'Inter', sans-serif; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.1em; border-radius: 4px; transition: color 0.2s; border: 1px solid #292524; }
                  .btn-secondary:hover { color: #f5f5f4; border-color: #d97706; }
                  .button-group { display: flex; flex-direction: column; gap: 8px; align-items: center; justify-content: center; }
              </style>
              <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&family=Playfair+Display:ital,wght@0,400;1,400&display=swap" rel="stylesheet">
          </head>
          <body>
              <div class="container">
                  <h1>Anulación de Evento Privado</h1>
                  <p>Por motivos de seguridad y logística, la cancelación de un <strong>Evento Privado</strong> no puede realizarse de forma automática desde la web.</p>
                  <p>Para anular este evento, por favor póngase en contacto directamente por teléfono con la propiedad:</p>
                  <div class="phone-number">+48 510 276 655</div>
                  <div class="button-group">
                      <a href="tel:+48510276655" class="btn">Llamar al Propietario</a>
                      <a href="/" class="btn-secondary">Volver al Sitio Web</a>
                  </div>
              </div>
          </body>
          </html>
        `);
      }

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
      await docRef.update({
        status: "cancelled",
        updatedAt: FieldValue.serverTimestamp(),
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

  // Google reviews endpoint with 24h caching in Firestore
  app.get("/api/reviews", async (req, res) => {
    const fsdb = await requireAdminDb(res);
    if (!fsdb) return;

    const lang = (req.query.lang as string) === "pl" ? "pl" : "es";

    try {
      const docRef = fsdb.doc(`settings/google_reviews_${lang}`);
      const snap = await docRef.get();
      
      let data = snap.data();
      let needsSync = false;

      if (!snap.exists || !data) {
        needsSync = true;
      } else {
        const updatedAt = data.updatedAt;
        if (updatedAt) {
          const updatedDate = typeof updatedAt.toDate === "function" ? updatedAt.toDate() : new Date(updatedAt);
          const diffMs = Date.now() - updatedDate.getTime();
          const oneDayMs = 24 * 60 * 60 * 1000;
          if (diffMs > oneDayMs) {
            needsSync = true;
          }
        } else {
          needsSync = true;
        }
      }

      if (needsSync) {
        try {
          const freshData = await syncGoogleReviews(fsdb, lang);
          return res.json(freshData);
        } catch (syncErr: any) {
          console.warn(`[server] Failed to sync fresh reviews for ${lang}, falling back to cached reviews:`, syncErr.message || syncErr);
          if (data) {
            return res.json({
              rating: data.rating,
              userRatingCount: data.userRatingCount,
              reviews: data.reviews,
              updatedAt: typeof data.updatedAt.toDate === "function" ? data.updatedAt.toDate().toISOString() : data.updatedAt,
              _cachedFallback: true
            });
          }
          throw syncErr;
        }
      }

      res.json({
        rating: data!.rating,
        userRatingCount: data!.userRatingCount,
        reviews: data!.reviews,
        updatedAt: typeof data!.updatedAt.toDate === "function" ? data!.updatedAt.toDate().toISOString() : data!.updatedAt
      });
    } catch (err: any) {
      console.error(`[server] Error in /api/reviews handler (${lang}):`, err.message || err);
      res.status(500).json({ error: "failed_to_fetch_reviews", message: "No se pudieron obtener las opiniones en este momento." });
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
