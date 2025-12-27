'use server';
/**
 * @fileOverview Un flujo para extraer detalles de un evento desde un dictado de voz.
 *
 * - extractEventFromAudio - Una función que transcribe audio y devuelve los detalles del evento.
 * - ExtractEventFromAudioInput - El tipo de entrada para la función.
 * - ExtractEventFromAudioOutput - El tipo de salida para la función.
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

const ExtractEventFromAudioInputSchema = z.object({
  audioDataUri: z
    .string()
    .describe(
      "Una grabación de audio dictando los detalles de un evento, como un URI de datos que debe incluir un tipo MIME y usar codificación Base64. Formato esperado: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ExtractEventFromAudioInput = z.infer<typeof ExtractEventFromAudioInputSchema>;


const ExtractEventFromAudioOutputSchema = z.object({
  title: z.string().optional().describe('El título principal del evento.'),
  description: z.string().optional().describe('Una descripción detallada del evento, incluyendo cualquier información relevante, agenda o material requerido.'),
  event_datetime: z.string().optional().describe('La fecha y hora de inicio del evento en formato ISO 8601 (YYYY-MM-DDTHH:mm:ss).'),
  end_datetime: z.string().optional().describe('La fecha y hora de finalización del evento en formato ISO 8601 (YYYY-MM-DDTHH:mm:ss). Si no se especifica, puede ser inferida o dejada en blanco.'),
  event_type: eventTypeEnum.optional().describe('El tipo de evento, clasificado en una de las categorías proporcionadas.'),
  link: z.string().optional().describe('Cualquier enlace web (URL) mencionado en el audio.'),
});
export type ExtractEventFromAudioOutput = z.infer<typeof ExtractEventFromAudioOutputSchema>;

export async function extractEventFromAudio(
  input: ExtractEventFromAudioInput
): Promise<ExtractEventFromAudioOutput> {
  return extractEventFromAudioFlow(input);
}

const currentYear = new Date().getFullYear();

const extractionPrompt = ai.definePrompt({
  name: 'extractEventFromTextPrompt',
  input: { schema: z.object({ transcription: z.string() }) },
  output: { schema: ExtractEventFromAudioOutputSchema },
  prompt: `Eres un asistente experto para un profesor. Tu tarea es escuchar una transcripción de voz y extraer los detalles para crear un evento de calendario. Sé muy cuidadoso y metódico.

Aquí está la transcripción del audio:
"{{{transcription}}}"

Ahora, por favor, rellena los siguientes campos en un objeto JSON. Sigue estas instrucciones MUY CUIDADOSAMENTE para cada campo:

1.  **\`title\`**:
    *   **Encuentra el título principal del evento.** Suele ser la frase clave.
    *   **CRÍTICO:** El título debe ser SOLAMENTE el nombre del evento. No incluyas fechas, horas, descripciones ni frases como "el evento es".
    *   **Ejemplo:** Si el audio dice "Crear un evento para la reunión de departamento el viernes a las 10", el \`title\` es SOLAMENTE "Reunión de departamento".

2.  **\`description\`**:
    *   **Pon TODO el resto de la información relevante aquí.** Si hay detalles adicionales, ponlos aquí.
    *   **Ejemplo:** Si el audio dice "Reunión de departamento para planificar el segundo trimestre", la \`description\` sería "Planificar el segundo trimestre".

3.  **\`event_datetime\` (Hora de Inicio)**:
    *   **Esta es la parte más importante.** Encuentra la fecha y hora de INICIO del evento.
    *   Busca palabras como "mañana", "pasado mañana", "el 5 de junio", "a las 10 de la mañana".
    *   Si no se menciona el año, asume que el año actual es ${currentYear}. Si se mencionan días relativos como "mañana", calcúlalo a partir de la fecha actual.
    *   **DEBES formatear la salida como una cadena de texto ISO 8601 válida: \`YYYY-MM-DDTHH:mm:ss\`**.
    *   Si no puedes encontrar una hora, usa por defecto '09:00:00'. Si no puedes encontrar una fecha, DEBES omitir este campo.

4.  **\`end_datetime\` (Hora de Fin)**:
    *   Encuentra la fecha y hora de FIN si se menciona.
    *   Si no se especifica, puedes inferirla (p. ej., añadiendo 1 o 2 horas a la hora de inicio) u omitir este campo.
    *   Formatéala como \`YYYY-MM-DDTHH:mm:ss\`.

5.  **\`event_type\`**:
    *   Analiza la transcripción para determinar el tipo de evento.
    *   Elige la MEJOR categoría coincidente de esta lista: ${eventTypeEnum.options.join(', ')}.
    *   Si nada encaja bien, usa \`OTHER\`.

6.  **\`link\`**:
    *   Busca cualquier dirección de sitio web (URL) mencionada.

Por favor, proporciona el JSON final. Si la información de un campo no está presente en el audio, omite el campo del objeto JSON.`,
});


const extractEventFromAudioFlow = ai.defineFlow(
  {
    name: 'extractEventFromAudioFlow',
    inputSchema: ExtractEventFromAudioInputSchema,
    outputSchema: ExtractEventFromAudioOutputSchema,
  },
  async (input) => {
    // Step 1: Transcribe audio
    const { text } = await ai.generate({
      prompt: 'Transcribe el siguiente audio. Responde solo con la transcripción del texto.',
      media: [{ url: input.audioDataUri }],
    });

    if (!text) {
      throw new Error("La transcripción de audio falló o el audio estaba vacío.");
    }
    
    // Step 2: Extract details from transcription text
    const { output } = await extractionPrompt({ transcription: text });
    return output!;
  }
);
