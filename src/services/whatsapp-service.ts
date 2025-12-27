
'use server';

/**
 * @fileOverview Un servicio para enviar mensajes a través de la API de WhatsApp.
 */

interface SendMessageOptions {
  to: string;
  body: string;
}

/**
 * Envía un mensaje de texto a un número de WhatsApp usando la API de Meta.
 * https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages#send-messages
 *
 * NOTA IMPORTANTE: La API oficial de WhatsApp Business requiere un número de empresa
 * y una configuración a través de una cuenta de Meta para Desarrolladores.
 *
 * Si no se configuran las variables de entorno (WHATSAPP_PHONE_NUMBER_ID y WHATSAPP_TOKEN),
 * esta función operará en MODO DE SIMULACIÓN, imprimiendo el mensaje en la consola
 * sin realizar un envío real. Esto permite probar la aplicación sin una cuenta de empresa.
 */
export async function sendWhatsappMessage({ to, body }: SendMessageOptions) {
  const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;

  if (!WHATSAPP_PHONE_NUMBER_ID || !WHATSAPP_TOKEN) {
    console.log('******************************************************************');
    console.log('* INFO: Credenciales de WhatsApp no configuradas.                 *');
    console.log('* Se simulará el envío del mensaje en la consola.                 *');
    console.log(`* PARA: ${to}`);
    console.log(`* MENSAJE: ${body}`);
    console.log('******************************************************************');
    return { success: true, message: 'Simulación de envío en consola.' };
  }

  const formattedPhoneNumber = to.replace(/[^\d]/g, '');

  const payload = {
    messaging_product: 'whatsapp',
    to: formattedPhoneNumber,
    type: 'text',
    text: {
      preview_url: false,
      body: body,
    },
  };

  try {
    const response = await fetch(
      `https://graph.facebook.com/v19.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('Error de la API de WhatsApp:', data);
      throw new Error(data.error?.message || 'Error al enviar el mensaje de WhatsApp.');
    }

    console.log(`Mensaje de WhatsApp enviado a ${to}. Message ID: ${data.messages[0].id}`);
    return { success: true, data };
  } catch (error) {
    console.error('Error al enviar el mensaje de WhatsApp:', error);
    throw new Error('No se pudo enviar el mensaje de WhatsApp.');
  }
}
