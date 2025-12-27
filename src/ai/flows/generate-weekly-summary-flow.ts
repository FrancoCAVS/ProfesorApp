
'use server';

/**
 * @fileOverview Un flujo para generar un resumen semanal de eventos por correo electrónico y Telegram.
 *
 * - generateWeeklySummary - Una función que genera el contenido de resumen y lo envía.
 * - WeeklySummaryInput - El tipo de entrada para la función generateWeeklySummary.
 * - WeeklySummaryOutput - El tipo de salida para la función generateWeeklySummary.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { sendEmail } from '@/services/email-service';
import { sendTelegramMessage } from '@/services/telegram-service';

const EventSchema = z.object({
  title: z.string(),
  event_type: z.string(),
  event_datetime_str: z.string(),
  description: z.string().optional(),
  subject_name: z.string().optional(),
});

const WeeklySummaryInputSchema = z.object({
  recipientEmail: z.string().email().describe("La dirección de correo electrónico del destinatario."),
  events: z.array(EventSchema),
  week_start_str: z.string(),
  week_end_str: z.string(),
});
export type WeeklySummaryInput = z.infer<typeof WeeklySummaryInputSchema>;

const WeeklySummaryOutputSchema = z.object({
  subject: z.string().optional().describe('El asunto del correo electrónico.'),
  body: z.string().optional().describe('El cuerpo del correo electrónico en formato de texto plano.'),
  emailSent: z.boolean().describe('Indica si el correo fue enviado exitosamente.'),
  telegramSent: z.boolean().describe('Indica si el mensaje de Telegram fue enviado exitosamente.'),
});
export type WeeklySummaryOutput = z.infer<typeof WeeklySummaryOutputSchema>;

export async function generateWeeklySummary(input: WeeklySummaryInput): Promise<WeeklySummaryOutput> {
  return generateWeeklySummaryFlow(input);
}

const summaryPrompt = ai.definePrompt({
  name: 'generateWeeklySummaryPrompt',
  input: { schema: WeeklySummaryInputSchema },
  output: { schema: z.object({
      email: z.object({
          subject: z.string().describe('El asunto del correo electrónico.'),
          body: z.string().describe('El cuerpo del correo electrónico en formato de texto plano, formateado para ser legible y profesional.'),
      }),
      telegram: z.object({
          summary: z.string().describe('El texto del resumen para Telegram, conciso, con emojis y formato markdown (ej. *texto* para negrita).')
      })
  })},
  prompt: `Eres un asistente de IA de élite, especializado en ayudar a profesionales de la educación. Tu tarea es redactar DOS resúmenes de la agenda semanal del {{week_start_str}} al {{week_end_str}}.

**Instrucciones Críticas:**
- **NO INVENTES EVENTOS.** Si la lista de eventos está vacía, DEBES generar un mensaje indicando que no hay eventos programados para la semana. Si la razón es un receso o período de exámenes, menciónalo. NO inventes una agenda.
- Debes generar dos formatos: uno para un correo electrónico formal y otro para un mensaje de Telegram rápido y amigable.

**Formato 1: Correo Electrónico**
- **Diseño:** Texto plano, profesional, muy legible, usando espaciado y mayúsculas para títulos. NO uses caracteres especiales como asteriscos (*) o numerales (#).
- **Tono:** Profesional, conciso y motivador.
- **Estructura:**
  1.  Párrafo introductorio.
  2.  Eventos agrupados por día con encabezado claro (ej. "LUNES, 15 DE JULIO").
  3.  Detalles de cada evento: Hora, Tipo, Título.
  4.  Mensaje de cierre positivo.
  5.  **Si no hay eventos, genera un mensaje indicando que la semana está despejada. Ejemplo: "No hay eventos programados para la próxima semana. Es un buen momento para planificar o descansar."**

**Formato 2: Telegram**
- **Diseño:** Conciso, claro y fácil de leer en un móvil.
- **Tono:** Amigable y proactivo.
- **Formato:** Usa negrita (con asteriscos, ej. *texto*) y emojis relevantes (reunión 🤝, examen ✍️, clase 📚).
- **Estructura:**
  1.  Encabezado: saludo y fecha (ej. "🗓️ *Resumen Semanal: {{week_start_str}} al {{week_end_str}}*").
  2.  Lista de eventos, agrupados por día.
  3.  Mensaje de cierre breve.
  4.  **Si no hay eventos, un mensaje corto que lo indique. Ejemplo: "¡Hola! La próxima semana no tienes eventos programados. ¡A disfrutar del receso invernal! ❄️"**

**Importante:** Proporciona un objeto JSON con dos claves principales: \`email\` y \`telegram\`, cada una con su contenido correspondiente.

**Datos de los eventos de la semana:**
{{#if events}}
{{#each events}}
- Título: {{this.title}}
  - Fecha: {{this.event_datetime_str}}
  - Tipo: {{this.event_type}}
  {{#if this.subject_name}}- Asignatura: {{this.subject_name}}{{/if}}
  - Descripción: {{this.description}}
---
{{/each}}
{{else}}
La lista de eventos para la semana está vacía.
{{/if}}
`,
});

const generateWeeklySummaryFlow = ai.defineFlow(
  {
    name: 'generateWeeklySummaryFlow',
    inputSchema: WeeklySummaryInputSchema,
    outputSchema: WeeklySummaryOutputSchema,
  },
  async (input) => {
    const { output } = await summaryPrompt(input);

    if (!output) {
      throw new Error("No se pudo generar el contenido del resumen semanal.");
    }
    
    const { email: emailContent, telegram: telegramContent } = output;

    // Intenta enviar el correo
    const emailResult = await sendEmail({
        to: input.recipientEmail,
        subject: emailContent.subject,
        body: emailContent.body,
    });
    
    if (emailResult.success) {
      // Guardamos el correo solo si se envió exitosamente
      // Esto es manejado en el contexto, esta función solo devuelve el contenido.
    } else {
      console.warn("El resumen semanal se generó pero no se pudo enviar por correo.");
    }
    
    // Intenta enviar el mensaje de Telegram
    const telegramResult = await sendTelegramMessage({
      body: telegramContent.summary,
    });

    if (!telegramResult.success) {
      console.warn("El resumen semanal se generó pero no se pudo enviar por Telegram.");
    }

    // Devuelve el contenido generado y el estado de ambos envíos.
    return {
      subject: emailContent.subject,
      body: emailContent.body,
      emailSent: emailResult.success,
      telegramSent: telegramResult.success,
    };
  }
);
