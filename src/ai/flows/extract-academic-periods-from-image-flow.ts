'use server';
/**
 * @fileOverview Un flujo para extraer periodos lectivos desde una imagen o PDF de un calendario.
 *
 * - extractAcademicPeriodsFromImage - Analiza un archivo y devuelve una lista de periodos lectivos.
 * - ExtractPeriodsInput - El tipo de entrada.
 * - ExtractPeriodsOutput - El tipo de salida.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const LevelSchema = z.enum(['secundario', 'superior_no_universitario', 'superior_universitario', 'all']);

const ExtractedPeriodSchema = z.object({
  name: z.string().describe('El nombre descriptivo del periodo (ej. "Receso Invernal", "Mesas de Examen Febrero").'),
  type: z.enum(['vacation', 'exam_period', 'other']).describe('El tipo de periodo. Usa "exam_period" para cualquier periodo de exámenes, "vacation" para recesos o vacaciones, y "other" para todo lo demás (como inicio/fin de clases).'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha debe estar en formato YYYY-MM-DD").describe('La fecha de inicio del periodo en formato YYYY-MM-DD.'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha de fin del periodo en formato YYYY-MM-DD.").describe('La fecha de fin del periodo en formato YYYY-MM-DD.'),
  level: LevelSchema.optional().describe('El nivel educativo al que aplica el periodo. Si no se especifica o no aplica, usa "all".'),
});

const ExtractPeriodsInputSchema = z.object({
  fileDataUri: z
    .string()
    .describe(
      "Un archivo (imagen o PDF) de un calendario académico, como un URI de datos con codificación Base64. Formato: 'data:<mimetype>;base64,<data>'."
    ),
  year: z.number().describe('El año lectivo al que corresponde el calendario, para desambiguar fechas.'),
  customInstructions: z.string().optional().describe('Instrucciones adicionales del usuario para guiar la extracción.'),
});
export type ExtractPeriodsInput = z.infer<typeof ExtractPeriodsInputSchema>;

const ExtractPeriodsOutputSchema = z.object({
  periods: z.array(ExtractedPeriodSchema),
});
export type ExtractPeriodsOutput = z.infer<typeof ExtractPeriodsOutputSchema>;

export async function extractAcademicPeriodsFromImage(
  input: ExtractPeriodsInput
): Promise<ExtractPeriodsOutput> {
  return extractAcademicPeriodsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractAcademicPeriodsPrompt',
  input: { schema: ExtractPeriodsInputSchema },
  output: { schema: ExtractPeriodsOutputSchema },
  prompt: `Eres un asistente experto en analizar calendarios académicos para el sistema educativo argentino. Tu tarea es extraer todos los periodos lectivos relevantes del documento proporcionado (que puede ser una imagen o un PDF). El año de referencia es {{year}}.

Analiza el siguiente documento detenidamente:
{{media url=fileDataUri}}

Instrucciones:
1.  **Identifica todos los periodos**: Busca fechas de inicio y fin para recesos, vacaciones, periodos de inscripción, mesas de examen, inicio y fin de cuatrimestres/trimestres, etc.
2.  **Extrae los detalles para cada periodo**:
    *   \`name\`: Usa el nombre oficial que aparece en el calendario (ej. "Receso Escolar de Invierno", "Turno de Exámenes Finales Diciembre").
    *   \`type\`: Clasifica cada periodo. Usa 'vacation' para recesos y vacaciones. Usa 'exam_period' para CUALQUIER tipo de periodo de examen (finales, previos, etc.). **NUNCA uses 'class_period'**. Usa 'other' para todo lo demás (inicio/fin de ciclo, inscripciones).
    *   \`startDate\` y \`endDate\`: Extrae las fechas de inicio y fin. **Formato OBLIGATORIO: YYYY-MM-DD**. Usa el año de referencia {{year}}. Si solo se menciona un mes, asegúrate de que el año sea correcto.
    *   \`level\`: Si el calendario especifica un nivel, indícalo. Usa 'secundario' para nivel medio, 'superior_no_universitario' para terciarios o institutos superiores, y 'superior_universitario' para carreras universitarias. Si se aplica a todos o no se especifica, usa 'all'.
3.  **Formato de Salida**: Devuelve un objeto JSON con una única clave "periods", que contiene un array de los objetos de periodo que encontraste. Si no encuentras ningún periodo, devuelve un array vacío.

{{#if customInstructions}}
Instrucciones Adicionales del Usuario (Prioridad Alta):
Sigue estas instrucciones personalizadas con la máxima prioridad, incluso si contradicen las instrucciones generales anteriores:
"{{customInstructions}}"
{{/if}}
`,
});

const extractAcademicPeriodsFlow = ai.defineFlow(
  {
    name: 'extractAcademicPeriodsFlow',
    inputSchema: ExtractPeriodsInputSchema,
    outputSchema: ExtractPeriodsOutputSchema,
  },
  async (input) => {
    // The Gemini model can handle PDF and image data URIs directly.
    const { output } = await prompt(input);

    if (!output) {
      return { periods: [] };
    }
    return output;
  }
);
