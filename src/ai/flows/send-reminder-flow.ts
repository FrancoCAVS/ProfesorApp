
'use server';

/**
 * @fileOverview Un flujo para enviar notificaciones de recordatorio por correo electrónico.
 *
 * - sendReminder - Una función que maneja el envío de un correo electrónico de recordatorio.
 * - SendReminderInput - El tipo de entrada para la función sendReminder.
 * - SendReminderOutput - El tipo de salida para la función sendReminder.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { sendEmail } from '@/services/email-service';

const SendReminderInputSchema = z.object({
  recipientEmail: z.string().email().describe('La dirección de correo electrónico del destinatario.'),
  title: z.string().describe('El título del evento.'),
  description: z.string().describe('La descripción del evento.'),
  event_datetime: z.string().describe('La fecha y hora del evento como una cadena de texto ISO.'),
});
export type SendReminderInput = z.infer<typeof SendReminderInputSchema>;

const SendReminderOutputSchema = z.object({
  subject: z.string().optional(),
  body: z.string().optional(),
});
export type SendReminderOutput = z.infer<typeof SendReminderOutputSchema>;

const emailPrompt = ai.definePrompt({
    name: 'generateReminderEmailPrompt',
    input: { schema: z.object({
        title: z.string(),
        description: z.string(),
        event_datetime_str: z.string(),
    }) },
    output: { 
        schema: z.object({
            subject: z.string().describe('El asunto del correo electrónico. Debe empezar con "Recordatorio:".'),
            body: z.string().describe('El cuerpo del correo electrónico en formato de texto plano. Debe ser amigable y profesional, escrito en español.')
        })
    },
    prompt: `Eres un asistente de IA de élite, especializado en ayudar a profesionales de la educación. Tu tarea es redactar un correo electrónico de recordatorio claro, profesional y con un diseño moderno.

**Información del Evento:**
- **Evento:** {{title}}
- **Fecha y Hora:** {{event_datetime_str}}
- **Descripción:** {{description}}

**Instrucciones:**
- **Asunto:** Genera un asunto conciso que empiece con "Recordatorio:".
- **Cuerpo del Mensaje:** Redacta un cuerpo de correo amigable pero profesional. Presenta los detalles del evento de forma clara y estructurada. Utiliza espaciado y saltos de línea para un diseño limpio y legible, no uses caracteres como asteriscos.
- **Idioma:** El correo debe estar completamente en español.
- **Importante:** No incluyas un saludo genérico (ej. "Estimado/a,") ni una despedida formal con firma (ej. "Atentamente,"), solo el contenido principal del recordatorio.
`,
});

const sendReminderFlow = ai.defineFlow(
  {
    name: 'sendReminderFlow',
    inputSchema: SendReminderInputSchema,
    outputSchema: SendReminderOutputSchema,
  },
  async (input) => {
    const eventDate = new Date(input.event_datetime);
    
    const { output } = await emailPrompt({
        title: input.title,
        description: input.description,
        event_datetime_str: format(eventDate, "PPPPp", { locale: es })
    });
    
    if (!output) {
      console.error("No se pudo generar el contenido del correo electrónico.");
      return { subject: undefined };
    }

    const { subject, body } = output;

    await sendEmail({
      to: "filosofia.secundario@gmail.com",
      subject,
      body,
    });

    return { subject: output.subject, body: output.body };
  }
);

export async function sendReminder(input: SendReminderInput): Promise<SendReminderOutput> {
  return sendReminderFlow(input);
}
