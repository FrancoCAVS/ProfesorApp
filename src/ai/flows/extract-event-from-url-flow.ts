'use server';
/**
 * @fileOverview Un flujo para extraer detalles de un evento desde una URL.
 *
 * - extractEventFromUrl - Una función que analiza una URL y devuelve los detalles del evento.
 * - ExtractEventFromUrlInput - El tipo de entrada para la función.
 * - ExtractEventFromUrlOutput - El tipo de salida para la función.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const eventTypeEnum = z.enum([
  'EXAM_PARCIAL',
  'EXAM_RECUPERATORIO',
  'EXAM_FINAL_PRIMER_LLAMADO',
  'EXAM_FINAL_SEGUNDO_LLAMADO',
  'EXAM_REGULAR',
  'EXAM_LIBRE',
  'EXAM_COMPLETAR_CARRERA',
  'MEETING',
  'HOLIDAY',
  'CLASS',
  'TRAINING',
  'OTHER',
  'TRIMESTER_FIRST_START',
  'TRIMESTER_FIRST_END',
  'TRIMESTER_SECOND_START',
  'TRIMESTER_SECOND_END',
  'TRIMESTER_THIRD_START',
  'TRIMESTER_THIRD_END',
  'ACTO_ESCOLAR',
  'ENTREGA_NOTAS',
  'TUTORIA',
  'CONFERENCIA',
]);

const ExtractEventFromUrlInputSchema = z.object({
  url: z.string().url().describe("La URL de la página web que contiene la información del evento."),
});
export type ExtractEventFromUrlInput = z.infer<typeof ExtractEventFromUrlInputSchema>;


const ExtractEventFromUrlOutputSchema = z.object({
  title: z.string().optional().describe('El título principal del evento.'),
  description: z.string().optional().describe('Una descripción detallada del evento, incluyendo cualquier información relevante, agenda o material requerido.'),
  event_datetime: z.string().optional().describe('La fecha y hora de inicio del evento en formato ISO 8601 (YYYY-MM-DDTHH:mm:ss).'),
  end_datetime: z.string().optional().describe('La fecha y hora de finalización del evento en formato ISO 8601 (YYYY-MM-DDTHH:mm:ss). Si no se especifica, puede ser inferida o dejada en blanco.'),
  event_type: eventTypeEnum.optional().describe('El tipo de evento, clasificado en una de las categorías proporcionadas.'),
  link: z.string().optional().describe('Cualquier enlace web (URL) encontrado en la página, como un enlace de registro o una videollamada. Si la URL de entrada es el enlace principal, úsala aquí.'),
});
export type ExtractEventFromUrlOutput = z.infer<typeof ExtractEventFromUrlOutputSchema>;

export async function extractEventFromUrl(
  input: ExtractEventFromUrlInput
): Promise<ExtractEventFromUrlOutput> {
  return extractEventFromUrlFlow(input);
}

const currentYear = new Date().getFullYear();

const prompt = ai.definePrompt({
  name: 'extractEventFromUrlPrompt',
  input: { schema: ExtractEventFromUrlInputSchema },
  output: { schema: ExtractEventFromUrlOutputSchema },
  prompt: `Eres un asistente experto para un profesor. Tu tarea es leer una página web y extraer los detalles para crear un evento de calendario. Sé muy cuidadoso y metódico, prestando atención a la estructura HTML como \`<h1>\` vs \`<p>\`.

Aquí está la URL para analizar:
{{{url}}}

Ahora, por favor, rellena los siguientes campos en un objeto JSON. Sigue estas instrucciones MUY CUIDADOSAMENTE para cada campo:

1.  **\`title\`**:
    *   **Encuentra el título principal y oficial del evento.** Suele estar en la etiqueta \`<h1>\` principal.
    *   **CRÍTICO:** El título debe ser SOLAMENTE el nombre del evento en sí.
    *   **NO incluyas** ninguna otra información como quién lo presenta, dónde es, subtítulos, fechas u horas.
    *   **Ejemplo:** Si la página tiene \`<h1>Conferencia de IA</h1>\` y \`<p>Por Dr. Juan Pérez</p>\`, el \`title\` es SOLAMENTE "Conferencia de IA".

2.  **\`description\`**:
    *   **Pon TODO el resto del texto relevante de la página aquí.** Todo lo que NO sea el título principal va en la descripción.
    *   Esto incluye subtítulos, nombres de los ponentes, lugares, agendas, materiales necesarios, etc.
    *   **Ejemplo:** Siguiendo el ejemplo anterior, la \`description\` sería "Por Dr. Juan Pérez" y cualquier otro texto encontrado en el cuerpo.

3.  **\`event_datetime\` (Hora de Inicio)**:
    *   **Esta es la parte más importante.** Encuentra la fecha y hora de INICIO del evento.
    *   Busca palabras como "fecha", "día", "hora", "a las".
    *   Si no se menciona el año, asume que el año actual es ${currentYear}.
    *   **DEBES formatear la salida como una cadena de texto ISO 8601 válida: \`YYYY-MM-DDTHH:mm:ss\`**.
    *   Si no puedes encontrar una hora, usa por defecto '09:00:00'. Si no puedes encontrar una fecha, DEBES omitir este campo.

4.  **\`end_datetime\` (Hora de Fin)**:
    *   Encuentra la fecha y hora de FIN.
    *   Si no se especifica una hora de fin, puedes inferirla (p. ej., añadiendo 1 o 2 horas a la hora de inicio) u omitir este campo.
    *   Formatéala como \`YYYY-MM-DDTHH:mm:ss\`.

5.  **\`event_type\`**:
    *   Analiza el título y la descripción para determinar el tipo de evento.
    *   Elige la MEJOR categoría coincidente de esta lista: ${eventTypeEnum.options.join(', ')}.
    *   Si nada encaja bien, usa \`OTHER\`.

6.  **\`link\`**:
    *   Extrae la URL más relevante para registrarse o unirse. Si no encuentras ninguna, puedes usar la URL de entrada.

Por favor, proporciona el JSON final. Si la información de un campo no está presente en la página, omite el campo del objeto JSON.`,
});

const extractEventFromUrlFlow = ai.defineFlow(
  {
    name: 'extractEventFromUrlFlow',
    inputSchema: ExtractEventFromUrlInputSchema,
    outputSchema: ExtractEventFromUrlOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
