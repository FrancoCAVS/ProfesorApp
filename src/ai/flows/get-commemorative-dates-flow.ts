
'use server';

/**
 * @fileOverview Un flujo para obtener una lista de fechas conmemorativas o significativas para el ámbito educativo.
 *
 * - getCommemorativeDatesForYear - Una función que devuelve una lista de fechas.
 * - GetCommemorativeDatesInput - El tipo de entrada para la función.
 * - GetCommemorativeDatesOutput - El tipo de salida para la función.
 * - CommemorativeDate - El tipo para una única fecha conmemorativa.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GetCommemorativeDatesInputSchema = z.object({
  year: z.number().describe('El año para el cual obtener las fechas.'),
  country: z.string().describe('El país para el cual obtener las fechas (en español).'),
  province: z.string().optional().describe('La provincia para la cual obtener las fechas (opcional).'),
  additionalContext: z.string().optional().describe('Contexto adicional para guiar la búsqueda de la IA.'),
});
export type GetCommemorativeDatesInput = z.infer<typeof GetCommemorativeDatesInputSchema>;

const CommemorativeDateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha debe estar en formato YYYY-MM-DD").describe('La fecha del evento en formato YYYY-MM-DD.'),
  name: z.string().describe('El nombre de la fecha conmemorativa.'),
  description: z.string().optional().describe('Una breve descripción de por qué la fecha es relevante para la educación.'),
});
export type CommemorativeDate = z.infer<typeof CommemorativeDateSchema>;

const GetCommemorativeDatesOutputSchema = z.object({
  dates: z.array(CommemorativeDateSchema),
});
export type GetCommemorativeDatesOutput = z.infer<typeof GetCommemorativeDatesOutputSchema>;

export async function getCommemorativeDatesForYear(input: GetCommemorativeDatesInput): Promise<GetCommemorativeDatesOutput> {
  return getCommemorativeDatesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'getCommemorativeDatesPrompt',
  input: { schema: GetCommemorativeDatesInputSchema },
  output: { schema: GetCommemorativeDatesOutputSchema },
  prompt: `Eres un asistente experto en calendarios escolares y culturales de Argentina.
Tu tarea es proporcionar una lista de fechas conmemorativas, efemérides y días significativos para el ámbito educativo para el país y año indicados.

País: {{{country}}}
Año: {{{year}}}
{{#if province}}Provincia: {{{province}}}{{/if}}

Instrucciones CRÍTICAS:
-   **EXCLUYE FERIADOS NACIONALES OBLIGATORIOS Y DÍAS NO LABORABLES.** No liste días como "Navidad", "Día del Trabajador", "Año Nuevo", etc. El usuario ya tiene una función para eso.
-   **ENFÓCATE en fechas relevantes para la comunidad educativa**: Día del Maestro, Día del Estudiante, Día del Respeto a la Diversidad Cultural, Día de la Memoria por la Verdad y la Justicia, Inicio de la Primavera, etc.
-   Incluye fechas de importancia cultural, científica o social que puedan ser trabajadas en el aula.
-   Asegúrate de que cada fecha esté en el formato YYYY-MM-DD.
-   Proporciona una breve descripción sobre la relevancia de la fecha.
-   Ordena la lista final cronológicamente.

{{#if additionalContext}}
**Contexto Adicional de Alta Prioridad:**
Presta especial atención a estas instrucciones.
"{{additionalContext}}"
{{/if}}
`,
});

const getCommemorativeDatesFlow = ai.defineFlow(
  {
    name: 'getCommemorativeDatesFlow',
    inputSchema: GetCommemorativeDatesInputSchema,
    outputSchema: GetCommemorativeDatesOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error("No se pudo generar la lista de fechas conmemorativas.");
    }
    // Sort just in case the model doesn't.
    output.dates.sort((a, b) => a.date.localeCompare(b.date));
    return output;
  }
);
