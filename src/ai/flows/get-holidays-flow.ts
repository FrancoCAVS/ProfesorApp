
'use server';

/**
 * @fileOverview Un flujo para obtener la lista de feriados para un país, provincia y año determinados.
 *
 * - getHolidaysForYear - Una función que devuelve una lista de feriados.
 * - GetHolidaysInput - El tipo de entrada para la función.
 * - GetHolidaysOutput - El tipo de salida para la función.
 * - Holiday - El tipo para un único feriado.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GetHolidaysInputSchema = z.object({
  year: z.number().describe('El año para el cual obtener los feriados.'),
  country: z.string().describe('El país para el cual obtener los feriados (en español).'),
  province: z.string().optional().describe('La provincia para la cual obtener los feriados (opcional). Si se proporciona, se deben incluir tanto los feriados nacionales como los provinciales.'),
  additionalContext: z.string().optional().describe('Contexto adicional o pistas sobre festividades locales específicas (ej. "Triduo del Milagro en septiembre") para mejorar la precisión de la IA.'),
});
export type GetHolidaysInput = z.infer<typeof GetHolidaysInputSchema>;

const HolidaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha debe estar en formato YYYY-MM-DD").describe('La fecha del feriado en formato YYYY-MM-DD.'),
  name: z.string().describe('El nombre del feriado.'),
});
export type Holiday = z.infer<typeof HolidaySchema>;

const GetHolidaysOutputSchema = z.object({
  holidays: z.array(HolidaySchema),
});
export type GetHolidaysOutput = z.infer<typeof GetHolidaysOutputSchema>;

export async function getHolidaysForYear(input: GetHolidaysInput): Promise<GetHolidaysOutput> {
  return getHolidaysFlow(input);
}

const holidaysPrompt = ai.definePrompt({
  name: 'getHolidaysPrompt',
  input: { schema: GetHolidaysInputSchema },
  output: { schema: GetHolidaysOutputSchema },
  prompt: `Eres un asistente experto en calendarios globales.
Tu tarea es proporcionar una lista completa y precisa de los feriados y días no laborables para el país, provincia (si se especifica) y año indicados.

País: {{{country}}}
Año: {{{year}}}
{{#if province}}Provincia: {{{province}}}{{/if}}

Instrucciones:
-   Proporciona una lista de TODOS los feriados nacionales inamovibles y trasladables para el país y año.
-   {{#if province}}Además, si se especificó una provincia, incluye TODOS los feriados y días no laborables específicos de esa provincia (ej. aniversarios de fundación, patronos provinciales, asuetos locales).{{/if}}
-   {{#if province}}No incluyas feriados de otras provincias.{{else}}Excluye todos los feriados provinciales.{{/if}}
-   Excluye los días no laborables que son opcionales para sectores específicos (como Jueves Santo o días para ciertas religiones) a menos que se indique lo contrario.
-   Asegúrate de que cada fecha esté en el formato YYYY-MM-DD.
-   Ordena la lista final cronológicamente.
-   No incluyas duplicados. Si un feriado nacional y uno provincial caen en el mismo día, prioriza el nombre del feriado nacional.
-   Si un feriado es trasladable, asegúrate de proporcionar la fecha exacta en la que se observa en el año especificado, no su fecha original.

{{#if additionalContext}}
**Contexto Adicional de Alta Prioridad:**
Presta especial atención a estas instrucciones para encontrar feriados o asuetos locales específicos. Esto es muy importante.
"{{additionalContext}}"
{{/if}}
`,
});

const getHolidaysFlow = ai.defineFlow(
  {
    name: 'getHolidaysFlow',
    inputSchema: GetHolidaysInputSchema,
    outputSchema: GetHolidaysOutputSchema,
  },
  async (input) => {
    const { output } = await holidaysPrompt(input);
    if (!output) {
      throw new Error("No se pudo generar la lista de feriados.");
    }
    // Sort just in case the model doesn't.
    output.holidays.sort((a, b) => a.date.localeCompare(b.date));
    return output;
  }
);
