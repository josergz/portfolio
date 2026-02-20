export const prerender = false;

import type { APIRoute } from "astro";
import { Resend } from "resend";

export const POST: APIRoute = async ({ request, clientAddress }) => {
  // 1. Obtener variables de entorno (Astro las inyecta en import.meta.env)
  const apiKey = import.meta.env.RESEND_API_KEY;
  const fromEmail = import.meta.env.RESEND_FROM;
  const toEmail = import.meta.env.RESEND_TO;

  // 2. Verificación de seguridad de variables
  if (!apiKey || !fromEmail || !toEmail) {
    console.error("Error: Faltan variables de entorno en el servidor.");
    return new Response(
      JSON.stringify({ message: "Error de configuración en el servidor." }),
      { status: 500 },
    );
  }

  // 3. Inicializar Resend DENTRO del handler para evitar errores de Cold Start
  const resend = new Resend(apiKey);

  try {
    const data = await request.formData();

    const name = data.get("name")?.toString().trim();
    const email = data.get("email")?.toString().trim();
    const subject = data.get("subject")?.toString().trim();
    const message = data.get("message")?.toString().trim();

    // 4. Validación de campos del formulario
    if (!name || !email || !subject || !message) {
      return new Response(
        JSON.stringify({ message: "Faltan campos obligatorios." }),
        { status: 400 },
      );
    }

    // 5. Envío del correo
    const { data: resendData, error } = await resend.emails.send({
      from: `Web Contact <${fromEmail}>`, // Debe ser noreply@josergz.dev
      to: [toEmail],
      replyTo: email,
      subject: `[Web] ${subject}`,
      html: `
        <div style="font-family: sans-serif; color: #333; line-height: 1.6;">
          <h2 style="color: #0070f3;">Nuevo mensaje de contacto</h2>
          <p><strong>De:</strong> ${name} (<a href="mailto:${email}">${email}</a>)</p>
          <p><strong>Asunto:</strong> ${subject}</p>
          <div style="background: #f9f9f9; padding: 20px; border-left: 4px solid #0070f3; border-radius: 4px; margin-top: 20px;">
            ${message.replace(/\n/g, "<br>")}
          </div>
          <hr style="border: 0; border-top: 1px solid #eee; margin-top: 30px;" />
          <p style="font-size: 11px; color: #999;">
            Enviado desde el portfolio | IP del cliente: ${clientAddress}
          </p>
        </div>
      `,
    });

    // 6. Manejo de error de la API de Resend
    if (error) {
      console.error("Resend API Error:", error);
      return new Response(
        JSON.stringify({
          message: "Resend no pudo procesar el envío.",
          error: error.message,
        }),
        { status: 400 },
      );
    }

    // 7. Respuesta exitosa
    return new Response(
      JSON.stringify({
        message: "¡Mensaje enviado con éxito!",
        id: resendData?.id,
      }),
      { status: 200 },
    );
  } catch (err) {
    console.error("Server Error:", err);
    return new Response(
      JSON.stringify({
        message: "Error crítico en el servidor.",
        error: String(err),
      }),
      { status: 500 },
    );
  }
};
