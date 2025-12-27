
'use server';

import * as nodemailer from 'nodemailer';

interface MailOptions {
  to: string;
  subject: string;
  body: string;
}

let transporter: nodemailer.Transporter | null = null;

async function getTransporter() {
  if (transporter) {
    return transporter;
  }

  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass) {
    console.error('******************************************************************');
    console.error('* ERROR: Credenciales de correo no configuradas.                 *');
    console.error('* Por favor, cree un archivo .env y añada las variables          *');
    console.error('* EMAIL_USER y EMAIL_PASS. El envío de correos se simulará.      *');
    console.error('******************************************************************');
    return null;
  }

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: user,
      pass: pass, // Utilizar la contraseña de aplicación generada
    },
  });

  return transporter;
}


/**
 * Sends an email using a real Gmail account.
 * Returns an object indicating success or failure.
 */
export async function sendEmail({ to, subject, body }: MailOptions): Promise<{ success: boolean }> {
  const mailTransporter = await getTransporter();

  if (!mailTransporter) {
    console.error('El transportador de correo no está configurado. Revisa las variables de entorno. Se simulará el envío.');
    console.log('--- SIMULACIÓN DE CORREO ---');
    console.log(`Para: ${to}`);
    console.log(`Asunto: ${subject}`);
    console.log('----------------------------');
    // We return true in simulation mode so the app can continue.
    return { success: true };
  }

  const htmlBody = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #333;"><pre style="font-family: inherit; font-size: inherit; white-space: pre-wrap; margin: 0;">${body}</pre></div>`;

  try {
    const info = await mailTransporter.sendMail({
      from: `"El Amigo del Profesor" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: subject,
      text: body,
      html: htmlBody,
    });

    console.log(`Correo enviado a ${to}. Message ID: ${info.messageId}`);
    
    return {
        success: true,
    };
  } catch (error) {
    console.error('******************************************************************');
    console.error('* ERROR: No se pudo enviar el correo.                            *');
    console.error('* Esto puede deberse a credenciales incorrectas en .env o a      *');
    console.error('* la configuración de seguridad de Gmail (use una Contraseña de Aplicación). *');
    console.error('******************************************************************');
    console.error('Error detallado:', error);
    return { success: false };
  }
}
