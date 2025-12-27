
'use server';

/**
 * @fileOverview Un flujo para generar un resumen diario de la agenda para enviar por mensajería.
 *
 * - generateDailySummary - Una función que genera el texto del resumen.
 * - DailySummaryInput - El tipo de entrada para la función.
 * - DailySummaryOutput - El tipo de salida para la función.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const EventSchema = z.object({
  title: z.string().describe('El título del evento.'),
  time_str: z.string().describe('La hora del evento (ej. 10:00 AM).'),
  subject_name: z.string().optional().describe('El nombre de la asignatura, si aplica.'),
});

const DailySummaryInputSchema = z.object({
  events: z.array(EventSchema),
  date_str: z.string().describe("La fecha del resumen (ej. Lunes, 15 de julio)."),
});
export type DailySummaryInput = z.infer<typeof DailySummaryInputSchema>;

const DailySummaryOutputSchema = z.object({
  summary: z.string().describe('El texto del resumen, formateado para mensajería instantánea (WhatsApp/Telegram).'),
});
export type DailySummaryOutput = z.infer<typeof DailySummaryOutputSchema>;

export async function generateDailySummary(input: DailySummaryInput): Promise<DailySummaryOutput> {
  return generateDailySummaryFlow(input);
}

const messagePrompt = ai.definePrompt({
  name: 'generateDailySummaryPrompt',
  input: { schema: DailySummaryInputSchema },
  output: { schema: DailySummaryOutputSchema },
  prompt: `Eres un asistente de IA de élite, especializado en ayudar a profesionales de la educación. Tu tarea es redactar un resumen de la agenda de mañana para ser enviado por WhatsApp o Telegram.

**Instrucciones de Diseño:**
- El resumen debe ser muy conciso, claro y fácil de leer en un móvil.
- Utiliza emojis de forma sutil y profesional para mejorar la legibilidad.
- El tono debe ser amigable y proactivo.
- Usa negrita (con asteriscos, ej. *texto*) para los títulos y horas.

**Estructura del Contenido:**
1.  **Encabezado:** Comienza con un saludo y la fecha. Ej: "¡Hola! Este es tu resumen para mañana, *{{date_str}}*:"
2.  **Lista de Eventos:** Enumera los eventos del día. Para cada evento, indica la hora y el título. Si tiene una asignatura, menciónala.
    - Usa un emoji relevante para cada tipo de evento (reunión 🤝, examen ✍️, clase 📚, etc.).
3.  **Mensaje de Cierre:** Finaliza con un breve mensaje positivo. Ej: "¡Que tengas un excelente día!"
4.  **Día Vacío:** Si la lista de eventos está vacía, DEBES generar un mensaje indicando que la agenda está despejada. Ejemplo: "¡Buenas noticias! Mañana, *{{date_str}}*, no tienes eventos programados. ¡Un buen día para planificar o adelantar trabajo! 💪"

**Importante:** Formatea la salida como un único texto listo para copiar y pegar en un chat.

**Datos de los eventos de mañana:**
{{#if events}}
{{#each events}}
- *{{this.time_str}}*: {{this.title}} {{#if this.subject_name}}({{this.subject_name}}){{/if}}
{{/each}}
{{else}}
No hay eventos.
{{/if}}
`,
});

const generateDailySummaryFlow = ai.defineFlow(
  {
    name: 'generateDailySummaryFlow',
    inputSchema: DailySummaryInputSchema,
    outputSchema: DailySummaryOutputSchema,
  },
  async (input) => {
    const { output } = await messagePrompt(input);

    if (!output?.summary) {
      throw new Error("No se pudo generar el contenido del resumen diario.");
    }

    return output;
  }
);
