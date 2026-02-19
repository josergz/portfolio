export const prerender = false;

import type { APIRoute } from "astro";
import { Resend } from "resend";

// Función para leer env vars tanto en local como en Vercel sin errores de tipos
const getEnv = (key: string) => {
  return import.meta.env[key] ?? (globalThis as any).process?.env?.[key];
};

const resend = new Resend(getEnv("RESEND_API_KEY"));

export const POST: APIRoute = async ({ request, clientAddress }) => {
  try {
    const data = await request.formData();

    const token = data.get("cf-turnstile-response")?.toString();
    const name = data.get("name")?.toString().trim();
    const email = data.get("email")?.toString().trim();
    const subject = data.get("subject")?.toString().trim();
    const message = data.get("message")?.toString().trim();

    // 1. Validación de campos
    if (!token || !name || !email || !subject || !message) {
      return new Response(
        JSON.stringify({ message: "Faltan campos obligatorios." }),
        { status: 400 },
      );
    }

    // 2. Verificación Turnstile (Cloudflare)
    const secretKey = getEnv("TURNSTILE_SECRET_KEY");
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

    // 3. Envío con Resend
    const fromEmail = getEnv("RESEND_FROM"); // Debe ser noreply@josergz.dev
    const toEmail = getEnv("RESEND_TO");

    const { error } = await resend.emails.send({
      from: `Contacto Web <${fromEmail}>`,
      to: [toEmail],
      replyTo: email,
      subject: `[Web] ${subject}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2>Nuevo mensaje de contacto</h2>
          <p><strong>Nombre:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Asunto:</strong> ${subject}</p>
          <div style="margin-top: 20px; padding: 15px; background: #f5f5f5; border-radius: 5px;">
            ${message.replace(/\n/g, "<br>")}
          </div>
          <p style="font-size: 10px; color: #999; margin-top: 20px;">IP: ${clientAddress}</p>
        </div>
      `,
    });

    if (error) {
      return new Response(JSON.stringify({ message: error.message }), {
        status: 400,
      });
    }

    return new Response(JSON.stringify({ message: "¡Enviado!" }), {
      status: 200,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ message: "Error interno.", error: String(err) }),
      { status: 500 },
    );
  }
};
