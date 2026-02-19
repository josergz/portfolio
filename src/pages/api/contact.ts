export const prerender = false; // <--- ESTO ES LA CLAVE

import type { APIRoute } from "astro";
import { Resend } from "resend";

const resend = new Resend(import.meta.env.RESEND_API_KEY);

export const POST: APIRoute = async ({ request, clientAddress }) => {
  try {
    const data = await request.formData();

    const token = data.get("cf-turnstile-response")?.toString();
    const name = data.get("name")?.toString().trim();
    const email = data.get("email")?.toString().trim();
    const subject = data.get("subject")?.toString().trim();
    const message = data.get("message")?.toString().trim();

    if (!token || !name || !email || !subject || !message) {
      return new Response(
        JSON.stringify({ message: "Faltan campos obligatorios." }),
        { status: 400 },
      );
    }

    // Verificación Turnstile
    const secretKey = import.meta.env.TURNSTILE_SECRET_KEY;
    const verifyRes = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `secret=${secretKey}&response=${token}`,
      },
    );
    const verifyData = await verifyRes.json();

    if (!verifyData.success) {
      return new Response(
        JSON.stringify({ message: "Error de seguridad (Captcha)." }),
        { status: 403 },
      );
    }

    const cleanMessage = message.replace(/</g, "&lt;").replace(/>/g, "&gt;");

    // ENVÍO USANDO TUS VARIABLES DEL .ENV
    await resend.emails.send({
      from: `Form Contact (${name}) <${import.meta.env.RESEND_FROM}>`,
      to: import.meta.env.RESEND_TO,
      replyTo: email,
      subject: `[${subject}]`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
          <div style="background-color: #2563eb; padding: 30px 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 22px;">Tiene un nuevo mensaje de ${name}</h1>
          </div>
          <div style="padding: 30px; color: #1e293b; line-height: 1.8;">
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 25px; border: 1px solid #f1f5f9;">
              <p style="margin: 5px 0; font-size: 15px;"><strong>Nombre:</strong> ${name}</p>
              <p style="margin: 5px 0; font-size: 15px;"><strong>Email:</strong> <a href="mailto:${email}" style="color: #2563eb;">${email}</a></p>
              <p style="margin: 5px 0; font-size: 15px;"><strong>Asunto:</strong> ${subject}</p>
            </div>
            <p style="font-weight: bold; margin-bottom: 10px; font-size: 17px; color: #0f172a;">Mensaje:</p>
            <div style="font-size: 16px; color: #334155; white-space: pre-wrap; margin: 0; padding: 0;">${cleanMessage}</div>
          </div>
          <div style="background-color: #f1f5f9; padding: 25px; text-align: center; border-top: 1px solid #e2e8f0;">
            <a href="mailto:${email}?subject=RE: ${encodeURIComponent(subject)}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">Responder</a>
            <p style="font-size: 12px; color: #94a3b8; margin-top: 20px;">Enviado desde josergz.dev | IP: ${clientAddress}</p>
          </div>
        </div>
      `,
    });

    return new Response(JSON.stringify({ message: "¡Enviado!" }), {
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ message: "Error en el servidor." }), {
      status: 500,
    });
  }
};
