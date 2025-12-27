'use server';
/**
 * @fileOverview Un flujo para extraer detalles de un evento desde una imagen.
 *
 * - extractEventFromImage - Una función que analiza una imagen y devuelve los detalles del evento.
 * - ExtractEventFromImageInput - El tipo de entrada para la función.
 * - ExtractEventFromImageOutput - El tipo de salida para la función.
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

const ExtractEventFromImageInputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      "Una imagen de un folleto, póster o captura de pantalla de un evento, como un URI de datos que debe incluir un tipo MIME y usar codificación Base64. Formato esperado: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ExtractEventFromImageInput = z.infer<typeof ExtractEventFromImageInputSchema>;


const ExtractEventFromImageOutputSchema = z.object({
  title: z.string().optional().describe('El título principal del evento.'),
  description: z.string().optional().describe('Una descripción detallada del evento, incluyendo cualquier información relevante, agenda o material requerido.'),
  event_datetime: z.string().optional().describe('La fecha y hora de inicio del evento en formato ISO 8601 (YYYY-MM-DDTHH:mm:ss).'),
  end_datetime: z.string().optional().describe('La fecha y hora de finalización del evento en formato ISO 8601 (YYYY-MM-DDTHH:mm:ss). Si no se especifica, puede ser inferida o dejada en blanco.'),
  event_type: eventTypeEnum.optional().describe('El tipo de evento, clasificado en una de las categorías proporcionadas.'),
  link: z.string().optional().describe('Cualquier enlace web (URL) encontrado en la imagen, como un enlace de registro o una videollamada.'),
});
export type ExtractEventFromImageOutput = z.infer<typeof ExtractEventFromImageOutputSchema>;

export async function extractEventFromImage(
  input: ExtractEventFromImageInput
): Promise<ExtractEventFromImageOutput> {
  return extractEventFromImageFlow(input);
}

const currentYear = new Date().getFullYear();

const prompt = ai.definePrompt({
  name: 'extractEventFromImagePrompt',
  input: { schema: ExtractEventFromImageInputSchema },
  output: { schema: ExtractEventFromImageOutputSchema },
  prompt: `Eres un asistente experto para un profesor. Tu tarea es mirar una imagen (como un folleto o un póster) y extraer los detalles para crear un evento de calendario. Sé muy cuidadoso y metódico.

Aquí está la información de la imagen:
{{media url=imageDataUri}}

Ahora, por favor, rellena los siguientes campos en un objeto JSON. Sigue estas instrucciones MUY CUIDADOSAMENTE para cada campo:

1.  **\`title\`**:
    *   **Encuentra el título principal y oficial del evento.** Suele ser el texto más grande.
    *   **CRÍTICO:** El título debe ser SOLAMENTE el nombre del evento en sí.
    *   **NO incluyas** ninguna otra información como quién lo presenta, dónde es, subtítulos, fechas u horas.
    *   **Ejemplo:** Si la imagen dice "Conferencia sobre el Futuro de la Educación" y debajo "Por Dr. Juan Pérez en el Aula Magna", el \`title\` es SOLAMENTE "Conferencia sobre el Futuro de la Educación".

2.  **\`description\`**:
    *   **Pon TODO el resto del texto de la imagen aquí.** Todo lo que NO sea el título principal va en la descripción.
    *   Esto incluye subtítulos, nombres de los ponentes, lugares, agendas, materiales necesarios, etc.
    *   **Ejemplo:** Siguiendo el ejemplo anterior, la \`description\` sería "Por Dr. Juan Pérez en el Aula Magna."

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
    *   Busca cualquier dirección de sitio web (URL) para registrarse, una videollamada o más información.

Por favor, proporciona el JSON final. Si la información de un campo no está presente en la imagen, omite el campo del objeto JSON.`,
});

const extractEventFromImageFlow = ai.defineFlow(
  {
    name: 'extractEventFromImageFlow',
    inputSchema: ExtractEventFromImageInputSchema,
    outputSchema: ExtractEventFromImageOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
