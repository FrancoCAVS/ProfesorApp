

'use server';
/**
 * @fileOverview Un flujo para sugerir actividades y modalidades de trabajo basadas en una metodología y asignatura.
 *
 * - suggestActivities - Analiza una asignatura y metodología para proponer actividades.
 * - SuggestActivitiesInput - El tipo de entrada.
 * - SuggestActivitiesOutput - El tipo de salida.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SuggestActivitiesInputSchema = z.object({
  subjectName: z.string().describe('El nombre de la asignatura.'),
  subjectLevel: z.enum(['secundario', 'superior_no_universitario', 'superior_universitario']).describe('El nivel educativo de la asignatura.'),
  methodology: z.string().describe('La metodología pedagógica general seleccionada (ej. "Metodologías Activas", "Aprendizaje Basado en Proyectos").'),
  career: z.string().optional().describe('La carrera a la que pertenece la asignatura (solo para nivel superior).'),
  secondaryOrientation: z.string().optional().describe('La orientación curricular de la asignatura (solo para nivel secundario). Si la materia tiene varias orientaciones, se puede proporcionar la más representativa o la primera de ellas para dar contexto.'),
  detailLevel: z.number().min(0).max(100).optional().describe('El nivel de detalle deseado (0=muy corto y preciso, 100=muy largo y detallado).'),
  specificity: z.number().min(0).max(100).optional().describe('El nivel de especificidad deseado (0=muy general y versátil, 100=muy específico y creativo).'),
});
export type SuggestActivitiesInput = z.infer<typeof SuggestActivitiesInputSchema>;

const SuggestActivitiesOutputSchema = z.object({
  activities: z.array(z.string()).describe('Una lista de 5 a 8 actividades o modalidades de trabajo específicas y creativas, adecuadas para la asignatura y la metodología.'),
});
export type SuggestActivitiesOutput = z.infer<typeof SuggestActivitiesOutputSchema>;

export async function suggestActivities(
  input: SuggestActivitiesInput
): Promise<SuggestActivitiesOutput> {
  return suggestActivitiesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestActivitiesPrompt',
  input: { schema: SuggestActivitiesInputSchema },
  output: { schema: SuggestActivitiesOutputSchema },
  prompt: `Eres un asesor pedagógico experto en innovación educativa. Tu tarea es generar una lista de actividades y modalidades de trabajo concretas y creativas para un profesor.

**Contexto:**
-   **Asignatura:** {{subjectName}}
-   **Nivel:** {{subjectLevel}}
{{#if career}}
-   **Carrera (Nivel Superior):** {{career}}
{{/if}}
{{#if secondaryOrientation}}
-   **Orientación (Nivel Secundario):** {{secondaryOrientation}}
{{/if}}
-   **Metodología General:** {{methodology}}

**Instrucciones del Usuario (Alta Prioridad):**
-   **Nivel de Detalle Preferido (0-100):** {{detailLevel}}. Un valor cercano a 0 significa "muy corto y preciso". Un valor cercano a 100 significa "muy largo y detallado".
-   **Nivel de Especificidad Preferido (0-100):** {{specificity}}. Un valor cercano a 0 significa "muy general y versátil". Un valor cercano a 100 significa "muy específico para la asignatura y creativo".

**Instrucciones Generales:**
1.  **Analiza el Contexto Detalladamente:** Considera la asignatura, el nivel y la metodología para proponer ideas relevantes.
    *   **Crucial:** Si se proporciona una **carrera** (para nivel superior) o una **orientación** (para nivel secundario), las sugerencias DEBEN estar directamente relacionadas con ese campo específico. Por ejemplo, para "Física" en la carrera de "Ingeniería Civil", sugiere proyectos sobre estructuras. Para "Geografía" en la orientación "Turismo", sugiere actividades de planificación de circuitos turísticos.
    *   Adapta la complejidad al nivel. Las actividades para "superior_universitario" deben ser más complejas y académicas que para "secundario".
2.  **Genera Actividades Específicas:** Proporciona una lista de 5 a 8 actividades concretas. Evita términos genéricos como "Trabajo práctico". Sé más descriptivo y alinéate con las preferencias del usuario.
    *   **Ejemplo Bueno (para "Historia", "Metodologías Activas", orientación "Ciencias Sociales", con preferencia por detalle "short" y especificidad "specific"):** "Debate estilo parlamentario sobre causas de la Revolución de Mayo", "Creación de una línea de tiempo interactiva con herramientas digitales", "Análisis de fuentes primarias en grupos".
    *   **Ejemplo Malo:** "Hacer un TP", "Leer el libro", "Exposición".
3.  **Sé Creativo:** Ofrece ideas que inspiren al docente a salir de la rutina.
4.  **Formato de Salida:** Devuelve un objeto JSON con una única clave "activities", que contiene un array de strings con las actividades sugeridas.
`,
});

const suggestActivitiesFlow = ai.defineFlow(
  {
    name: 'suggestActivitiesFlow',
    inputSchema: SuggestActivitiesInputSchema,
    outputSchema: SuggestActivitiesOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error("La IA no pudo generar sugerencias de actividades.");
    }
    return output;
  }
);
