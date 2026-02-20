export const prerender = false;

import type { APIRoute } from "astro";
import { Resend } from "resend";

const getEnv = (key: string) =>
  import.meta.env[key] ?? (globalThis as any).process?.env?.[key];

const resend = new Resend(getEnv("RESEND_API_KEY"));

export const POST: APIRoute = async ({ request, clientAddress }) => {
  try {
    const data = await request.formData();

    // Extraemos los datos pero NO validamos el token de Cloudflare por ahora
    const name = data.get("name")?.toString().trim();
    const email = data.get("email")?.toString().trim();
    const subject = data.get("subject")?.toString().trim();
    const message = data.get("message")?.toString().trim();

    // Solo validamos que los campos de texto no estén vacíos
    if (!name || !email || !subject || !message) {
      return new Response(
        JSON.stringify({ message: "Faltan campos obligatorios." }),
        { status: 400 },
      );
    }

    // --- CLOUDFLARE DESHABILITADO MOMENTÁNEAMENTE ---
    console.log("Omitiendo validación de Turnstile para pruebas...");
    // ------------------------------------------------

    const fromEmail = getEnv("RESEND_FROM");
    const toEmail = getEnv("RESEND_TO");

    // Intento de envío directo con Resend
    const { data: resendData, error } = await resend.emails.send({
      from: `Prueba Directa <${fromEmail}>`,
      to: [toEmail],
      replyTo: email,
      subject: `[TEST SIN CAPTCHA] ${subject}`,
      html: `
        <p><strong>De:</strong> ${name} (${email})</p>
        <p><strong>Mensaje:</strong> ${message}</p>
        <p style="color: red;">Este correo se envió omitiendo el captcha.</p>
      `,
    });

    if (error) {
      console.error("Error de Resend:", error);
      return new Response(
        JSON.stringify({
          message: "Resend falló",
          error: error.message,
        }),
        { status: 400 },
      );
    }

    return new Response(
      JSON.stringify({
        message: "Resend funciona perfectamente.",
        id: resendData?.id,
      }),
      { status: 200 },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        message: "Error crítico en el servidor.",
        error: String(err),
      }),
      { status: 500 },
    );
  }
};
