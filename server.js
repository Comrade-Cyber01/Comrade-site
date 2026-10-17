import express from "express";
import cors from "cors";
import { Resend } from "resend";

/* ========== STRICT ENV CHECK — runs before anything else ========== */
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const MAIL_TO        = process.env.MAIL_TO    || "corneliusotwori5@gmail.com";
const MAIL_FROM      = process.env.MAIL_FROM  || "onboarding@resend.dev";

if (!RESEND_API_KEY || !RESEND_API_KEY.startsWith("re_")) {
  console.error("❌ FATAL: RESEND_API_KEY is missing or invalid.");
  console.error("   → Set it in Render → Environment → RESEND_API_KEY");
  console.error("   → Value must start with 're_'");
  process.exit(1);   // ← stops the build/startup immediately
}
/* ================================================================= */

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "1mb" }));

const resend = new Resend(RESEND_API_KEY);

/* ---------- HEALTH ---------- */
app.get("/", (_req, res) => res.json({ ok: true, service: "comrade-cyber-backend" }));
app.get("/health", (_req, res) => res.json({ ok: true }));

/* ---------- EMAIL HTML TEMPLATE ---------- */
function buildHtml({ refNo, userName, userEmail, phone, service, details, fileUrl, fileName }) {
  const year = new Date().getFullYear();
  const safeDetails = String(details || "").replace(/\n/g, "<br>");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background: #faf8ff; padding: 20px; margin: 0; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; box-shadow: 0 8px 16px rgba(50,16,109,0.08); overflow: hidden; }
    .header { background: linear-gradient(135deg, #32106d 0%, #6d28d9 100%); padding: 30px; text-align: center; color: white; font-size: 22px; font-weight: bold; letter-spacing: 1px; }
    .header small { display: block; font-size: 12px; font-weight: 500; opacity: 0.85; margin-top: 6px; letter-spacing: 2px; }
    .content { padding: 30px; color: #211638; line-height: 1.6; }
    .content h2 { margin-top: 0; color: #32106d; }
    .field { margin: 10px 0; padding: 10px 14px; background: #f4efff; border-left: 3px solid #6d28d9; border-radius: 6px; }
    .field b { color: #32106d; display: inline-block; min-width: 90px; }
    .footer { background: #f4efff; padding: 15px; text-align: center; font-size: 13px; color: #6b6479; border-top: 1px solid #e5ddf2; }
    .footer a { color: #5b21b6; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      COMRADE CYBER
      <small>ONLINE SERVICES PORTAL</small>
    </div>
    <div class="content">
      <h2>New Service Request</h2>
      <div class="field"><b>Ref:</b> ${refNo}</div>
      <div class="field"><b>Name:</b> ${userName}</div>
      <div class="field"><b>Email:</b> ${userEmail}</div>
      <div class="field"><b>Phone:</b> ${phone}</div>
      <div class="field"><b>Service:</b> ${service}</div>
      <div class="field"><b>Details:</b><br>${safeDetails}</div>
      ${fileUrl ? `<div class="field"><b>File:</b> <a href="${fileUrl}">${fileName || "attachment"}</a></div>` : ""}
    </div>
    <div class="footer">
      &copy; ${year} COMRADE CYBER &ndash; <a href="mailto:${MAIL_TO}">Contact</a><br>
      Alupe, Busia, Kenya
    </div>
  </div>
</body>
</html>`;
}

/* ---------- PLAIN TEXT FALLBACK ---------- */
function buildText({ refNo, userName, userEmail, phone, service, details, fileUrl }) {
  return [
    "COMRADE CYBER — New Service Request",
    "-----------------------------------",
    `Ref:     ${refNo}`,
    `Name:    ${userName}`,
    `Email:   ${userEmail}`,
    `Phone:   ${phone}`,
    `Service: ${service}`,
    "",
    "Details:",
    details,
    fileUrl ? `\nAttachment: ${fileUrl}` : "",
    "",
    `© ${new Date().getFullYear()} COMRADE CYBER — Alupe, Busia, Kenya`,
  ].join("\n");
}

/* ---------- SEND ---------- */
app.post("/api/send-request", async (req, res) => {
  try {
    const data = req.body || {};
    const {
      refNo = "N/A",
      userName = "—",
      userEmail = "—",
      phone = "—",
      service = "—",
      details = "—",
      fileUrl = "",
      fileName = "",
    } = data;

    const { data: result, error } = await resend.emails.send({
      from: `COMRADE CYBER <${MAIL_FROM}>`,
      to: MAIL_TO,
      replyTo: userEmail !== "—" ? userEmail : undefined,
      subject: `New Request ${refNo} — ${service}`,
      text: buildText(data),
      html: buildHtml(data),
    });

    if (error) {
      console.error("Resend error:", error);
      return res.status(500).json({ error: error.message || "Failed to send email." });
    }

    res.json({ ok: true, refNo, id: result?.id });
  } catch (err) {
    console.error("Send error:", err);
    res.status(500).json({ error: err.message || "Failed to send email." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
