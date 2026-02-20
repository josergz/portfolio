export const prerender = false;

import type { APIRoute } from "astro";
import { Resend } from "resend";

const getEnv = (key: string) =>
  import.meta.env[key] ?? (globalThis as any).process?.env?.[key];

const resend = new Resend(getEnv("RESEND_API_KEY"));

export const POST: APIRoute = async ({ request, clientAddress }) => {
  try {
    const data = await request.formData();

    const name = data.get("name")?.toString().trim();
    const email = data.get("email")?.toString().trim();
    const subject = data.get("subject")?.toString().trim();
    const message = data.get("message")?.toString().trim();

    // 1. Validación básica
    if (!name || !email || !subject || !message) {
      return new Response(
        JSON.stringify({ message: "Faltan campos obligatorios." }),
        { status: 400 },
      );
    }

    const fromEmail = getEnv("RESEND_FROM");
    const toEmail = getEnv("RESEND_TO");

    // 2. Intento de envío directo con Resend
    const { data: resendData, error } = await resend.emails.send({
      from: `Web Contact <${fromEmail}>`,
      to: [toEmail],
      replyTo: email,
      subject: `[Web] ${subject}`,
      html: `
        <div style="font-family: sans-serif; color: #333;">
          <h2>Nuevo mensaje de contacto</h2>
          <p><strong>De:</strong> ${name} (${email})</p>
          <p><strong>Asunto:</strong> ${subject}</p>
          <div style="background: #f4f4f4; padding: 15px; border-radius: 8px; margin-top: 20px;">
            ${message.replace(/\n/g, "<br>")}
          </div>
          <p style="font-size: 11px; color: #999; margin-top: 20px;">Enviado desde el portfolio | IP: ${clientAddress}</p>
        </div>
      `,
    });

    if (error) {
      console.error("Error de Resend:", error);
      return new Response(
        JSON.stringify({
          message: "Resend falló al enviar.",
          error: error.message,
        }),
        { status: 400 },
      );
    }

    return new Response(
      JSON.stringify({
        message: "¡Mensaje enviado con éxito!",
        id: resendData?.id,
      }),
      { status: 200 },
    );
  } catch (err) {
    console.error("Error en el servidor:", err);
    return new Response(
      JSON.stringify({
        message: "Error interno del servidor.",
        error: String(err),
      }),
      { status: 500 },
    );
  }
};
