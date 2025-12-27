
'use server';

/**
 * @fileOverview Un flujo para generar notas formales a autoridades institucionales, con consulta de normativa.
 *
 * - generateFormalNote - Genera el cuerpo de una nota formal.
 * - GenerateFormalNoteInput - El tipo de entrada.
 * - GenerateFormalNoteOutput - El tipo de salida.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';

const LevelSchema = z.enum(['secundario', 'superior_no_universitario', 'superior_universitario']);
const NoteTypeSchema = z.enum(['licencia', 'justificacion_inasistencia', 'otro']);

const RecipientDetailsSchema = z.object({
    institutionName: z.string().optional().describe("El nombre de la institución. Ej: 'Colegio Nacional'"),
    authorityTitle: z.string().optional().describe("El cargo de la autoridad. Ej: 'Director/a', 'Secretaría Académica'"),
    authorityName: z.string().optional().describe("El nombre de la autoridad. Ej: 'Lic. Ana Pérez'"),
    customRecipientName: z.string().optional().describe("Un nombre de destinatario personalizado si los otros campos no aplican.")
});

const GenerateFormalNoteInputSchema = z.object({
  recipientDetails: RecipientDetailsSchema.describe('Un objeto con los detalles de la autoridad a la que se dirige la nota.'),
  noteType: NoteTypeSchema.describe('El propósito principal de la nota.'),
  level: LevelSchema.describe('El nivel educativo para el cual se realiza la solicitud.'),
  startDate: z.string().describe('La fecha de inicio del período que cubre la nota (en formato ISO).'),
  endDate: z.string().optional().describe('La fecha de fin del período que cubre la nota (en formato ISO, opcional si es un solo día).'),
  reason: z.string().describe('La descripción detallada del motivo de la nota.'),
  regulationQuery: z.string().optional().describe('Una pregunta específica sobre la normativa a consultar para fundamentar la nota (Ej: "qué artículo justifica la ausencia por examen").'),
  authorName: z.string().describe('El nombre completo del docente que remite la nota.'),
  authorEmail: z.string().email().describe('El correo electrónico del docente.'),
});
export type GenerateFormalNoteInput = z.infer<typeof GenerateFormalNoteInputSchema>;

const GenerateFormalNoteOutputSchema = z.object({
  noteBody: z.string().describe('El cuerpo completo de la nota formal, listo para ser copiado y pegado.'),
  regulationFound: z.string().nullable().optional().describe('La normativa específica encontrada por la IA, si se realizó una consulta.'),
});
export type GenerateFormalNoteOutput = z.infer<typeof GenerateFormalNoteOutputSchema>;

export async function generateFormalNote(
  input: GenerateFormalNoteInput
): Promise<GenerateFormalNoteOutput> {
  return generateFormalNoteFlow(input);
}

const regulationSearchTool = ai.defineTool(
    {
        name: 'findRegulation',
        description: 'Busca y devuelve el texto de una normativa educativa argentina específica basada en una consulta del usuario. Debe ser usado si el usuario proporciona una regulationQuery.',
        inputSchema: z.object({ query: z.string().describe('La consulta del usuario sobre la normativa a buscar.') }),
        outputSchema: z.object({ regulation: z.string().describe('El texto completo del artículo, decreto o normativa encontrada.') }),
    },
    async ({ query }) => {
        // En una implementación real, aquí se consultaría una base de datos de normativas
        // o un servicio como NotebookLM. Para este prototipo, simulamos la búsqueda con
        // el conocimiento general del LLM.
        const { text } = await ai.generate({
            prompt: `Actúa como un experto en el Estatuto Docente y regímenes de licencia de Argentina. Responde a la siguiente consulta citando el artículo o normativa específica y su texto relevante. Consulta: "${query}"`,
        });
        return { regulation: text };
    }
);


const prompt = ai.definePrompt({
  name: 'generateFormalNotePrompt',
  tools: [regulationSearchTool],
  input: {
    schema: z.object({
      ...GenerateFormalNoteInputSchema.shape,
      formattedDate: z.string().describe("La fecha actual formateada como 'día de mes de año'."),
      formattedPeriod: z.string().describe("El período de fechas de la solicitud, ya formateado."),
    }),
  },
  output: { schema: GenerateFormalNoteOutputSchema },
  prompt: `Eres un asistente experto en redacción administrativa para el ámbito educativo argentino. Tu tarea es redactar una nota formal, clara, concisa y fundamentada en la normativa vigente.

**Proceso a seguir:**
1.  **Analizar Solicitud:** Revisa todos los datos proporcionados por el usuario.
2.  **Consultar Normativa (si se requiere):**
    *   Si el campo \`regulationQuery\` contiene una consulta, **DEBES** usar la herramienta \`findRegulation\` para buscar la normativa correspondiente.
    *   El resultado de esta búsqueda (el texto de la ley, artículo, etc.) es CRUCIAL. Guárdalo para el siguiente paso.
3.  **Redactar la Nota:**
    *   **Fundamentación:** El cuerpo de la nota DEBE basarse en la normativa encontrada. No solo la cites, úsala para construir el argumento. Por ejemplo, si la normativa exige notificar con 48hs de antelación, la redacción debe reflejar que se está cumpliendo con ese plazo.
    *   **Encabezado:** Comienza con "Salta, {{formattedDate}}".
    *   **Destinatario:** Construye un saludo formal y específico usando los \`recipientDetails\`. Evita "A quien corresponda" a menos que no se proporcione ningún detalle. Ejemplos: "Al Sr. Director Lic. Juan Pérez", "A la Dirección de la Escuela...", "A la Secretaría Académica".
    *   **Cuerpo:**
        *   Preséntate formalmente (Ej: "Por medio de la presente, me dirijo a usted...").
        *   Expón claramente el motivo (\`reason\`) y el propósito (\`noteType\`) de la nota.
        *   Indica el período de fechas (\`formattedPeriod\`).
        *   Integra la normativa encontrada de forma natural. Ej: "...en cumplimiento de lo establecido por el Artículo 70 del Estatuto Docente, que indica que...", "...amparándome en la Resolución N°123/24, que regula las licencias por...".
    *   **Cierre:** Usa una fórmula de cierre formal (Ej: "Sin otro particular, saludo a usted atentamente.").
    *   **Firma:** Deja un espacio para la firma, seguido del nombre completo (\`{{authorName}}\`), DNI (usa un placeholder "DNI: XX.XXX.XXX"), y su email (\`{{authorEmail}}\`).

**Salida Final:**
-   \`noteBody\`: Debe ser el texto completo y final de la nota.
-   \`regulationFound\`: Debe contener el texto de la normativa encontrada por la herramienta \`findRegulation\`. Si no se usó la herramienta, este campo debe ser \`null\`.

**Contexto del Usuario:**
- Remitente: {{authorName}} ({{authorEmail}})
- Destinatario: {{recipientDetails.institutionName}}, {{recipientDetails.authorityTitle}} {{recipientDetails.authorityName}} {{recipientDetails.customRecipientName}}
- Nivel: {{level}}
- Propósito: {{noteType}}
- Período: {{formattedPeriod}}
- Motivo: {{reason}}
- Consulta de Normativa: {{regulationQuery}}
`,
});

const generateFormalNoteFlow = ai.defineFlow(
  {
    name: 'generateFormalNoteFlow',
    inputSchema: GenerateFormalNoteInputSchema,
    outputSchema: GenerateFormalNoteOutputSchema,
  },
  async (input) => {
    const formattedDate = format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es });
    
    const start = new Date(input.startDate);
    let formattedPeriod = format(start, "PPP", { locale: es });
    if (input.endDate) {
        const end = new Date(input.endDate);
        if (start.toISOString().split('T')[0] !== end.toISOString().split('T')[0]) {
            formattedPeriod = `desde el ${format(start, "PPP", { locale: es })} hasta el ${format(end, "PPP", { locale: es })}`;
        }
    }

    let retries = 0;
    const maxRetries = 5;
    const baseDelay = 1000; // 1 second

    while (retries < maxRetries) {
        try {
            const { output } = await prompt({
                ...input,
                formattedDate,
                formattedPeriod,
            });

            if (!output) {
                throw new Error('La IA no pudo generar una respuesta.');
            }

            return output;

        } catch (error: any) {
             const errorMessage = error.message || '';
            if (errorMessage.includes('503') || errorMessage.toLowerCase().includes('overloaded')) {
                retries++;
                if (retries >= maxRetries) {
                    console.error(`El modelo está sobrecargado. Se reintentó ${maxRetries} veces sin éxito.`, error);
                    throw new Error("El servicio de IA está sobrecargado actualmente. Por favor, inténtalo de nuevo más tarde.");
                }
                const delay = baseDelay * Math.pow(2, retries) + Math.random() * 1000;
                console.warn(`Intento ${retries}/${maxRetries} fallido por sobrecarga del modelo. Reintentando en ${delay.toFixed(0)}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                // For any other error, re-throw immediately.
                console.error("Error no recuperable generando la nota formal:", error);
                throw error;
            }
        }
    }
    // This part should be unreachable if the loop logic is correct.
    throw new Error('No se pudo generar el contenido después de múltiples reintentos.');
  }
);
