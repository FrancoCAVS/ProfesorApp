
'use server';

/**
 * @fileOverview Un servicio para enviar mensajes a través de la API de Telegram.
 */

interface SendMessageOptions {
  body: string;
}

/**
 * Envía un mensaje de texto a un chat de Telegram usando un bot.
 * https://core.telegram.org/bots/api#sendmessage
 *
 * NOTA IMPORTANTE: Para usar esta función, necesitas crear un bot con BotFather
 * y obtener tu TOKEN de API y tu CHAT ID personal.
 *
 * Si no se configuran las variables de entorno (TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID),
 * esta función operará en MODO DE SIMULACIÓN, imprimiendo el mensaje en la consola
 * sin realizar un envío real.
 */
export async function sendTelegramMessage({ body }: SendMessageOptions) {
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
  console.log("INTENTO DE ENVÍO:");
  console.log("Token existe:", !!TELEGRAM_BOT_TOKEN); // Debería decir true
  console.log("Chat ID:", TELEGRAM_CHAT_ID)

  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.log('******************************************************************');
    console.log('* INFO: Credenciales de Telegram no configuradas.                *');
    console.log('* Se simulará el envío del mensaje en la consola.                *');
    console.log(`* PARA CHAT ID: ${TELEGRAM_CHAT_ID || '(no configurado)'}`);
    console.log(`* MENSAJE: ${body}`);
    console.log('******************************************************************');
    return { success: true, message: 'Simulación de envío en consola.' };
  }

  const payload = {
    chat_id: TELEGRAM_CHAT_ID,
    text: body,
  };

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();

    if (!data.ok) {
      console.error('Error de la API de Telegram:', data.description);
      throw new Error(data.description || 'Error desconocido al enviar el mensaje de Telegram.');
    }

    console.log(`Mensaje de Telegram enviado con éxito al chat ${TELEGRAM_CHAT_ID}.`);
    return { success: true, data };
  } catch (error) {
    console.error('Fallo en la función sendTelegramMessage:', error);
    // Devolvemos success: false para que la aplicación sepa que falló, pero no lanzamos un error que detenga la ejecución.
    return { success: false, message: (error as Error).message };
  }
}
