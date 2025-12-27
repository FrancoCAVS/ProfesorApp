
'use server';
/**
 * @fileOverview Un flujo para analizar el contenido de una unidad académica.
 *
 * - analyzeUnitContent - Analiza un texto, lo divide en temas y ofrece sugerencias pedagógicas.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const UnitContentSchema = z.object({
  unitName: z.string().describe('El nombre de la unidad.'),
  rawContent: z.string().describe('El texto completo de los contenidos de la unidad, sin procesar.'),
});

const AnalyzeUnitContentInputSchema = z.object({
  units: z.array(UnitContentSchema).describe('Un array con todas las unidades y sus contenidos.'),
  subjectName: z.string().describe('El nombre de la asignatura para dar contexto.'),
  subjectLevel: z.enum(['secundario', 'superior_no_universitario', 'superior_universitario']).describe('El nivel educativo de la asignatura.'),
  availableClasses: z.number().describe('La cantidad total de días de clase disponibles para esta asignatura en el período lectivo.'),
  totalClassHours: z.number().describe('La cantidad total de horas reloj de clase disponibles.'),
});
export type AnalyzeUnitContentInput = z.infer<typeof AnalyzeUnitContentInputSchema>;

const AnalyzedUnitSchema = z.object({
    unitName: z.string(),
    topics: z.array(z.string()).describe('Una lista de los temas individuales extraídos del contenido para esta unidad.'),
});

const AnalyzeUnitContentOutputSchema = z.object({
  analyzedUnits: z.array(AnalyzedUnitSchema),
  metrics: z.object({
      topicCount: z.number().describe('La cantidad total de temas identificados en todo el programa.'),
      availableClasses: z.number().describe('La cantidad de días de clase que se le proveyó como input.'),
      totalClassHours: z.number().describe('La cantidad de horas de clase que se le proveyó como input.'),
      estimatedAutonomousHours: z.number().describe('Una estimación de las horas de estudio autónomo que el alumno necesitará para completar el programa.'),
  }),
  suggestions: z.object({
    sequencing: z.string().describe('Una sugerencia sobre el orden lógico o la secuenciación de los temas a lo largo de todo el programa.'),
    prioritization: z.string().describe('Una identificación de los temas más importantes o nucleares de toda la asignatura.'),
    pacing: z.string().describe('Una recomendación sobre el ritmo, comparando la cantidad de temas con la cantidad de clases disponibles.'),
  }),
});
export type AnalyzeUnitContentOutput = z.infer<typeof AnalyzeUnitContentOutputSchema>;


export async function analyzeUnitContent(
  input: AnalyzeUnitContentInput
): Promise<AnalyzeUnitContentOutput> {
  return analyzeUnitContentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeUnitContentPrompt',
  input: { schema: AnalyzeUnitContentInputSchema },
  output: { schema: AnalyzeUnitContentOutputSchema },
  prompt: `Eres un asesor pedagógico experto en diseño curricular para el sistema educativo argentino. Tu tarea es analizar el contenido de un programa completo, estructurarlo y ofrecer métricas y sugerencias para su enseñanza.

**Contexto de la Asignatura:**
-   **Asignatura:** {{subjectName}}
-   **Nivel:** {{subjectLevel}}
-   **Días de Clase Disponibles:** {{availableClasses}}
-   **Horas Reloj de Clase Totales:** {{totalClassHours}}

**Contenidos en Bruto del Programa (por unidad):**
---
{{#each units}}
-   **Unidad: {{this.unitName}}**
    {{this.rawContent}}
---
{{/each}}

**Instrucciones de Procesamiento:**
1.  **Extraer Temas por Unidad:**
    *   Para cada unidad proporcionada, lee su "Contenido en Bruto".
    *   Separa el texto en una lista de temas individuales. **El delimitador entre temas es el punto seguido (.) o un salto de línea**. Cada oración, frase terminada en punto, o línea es un tema.
    *   Limpia cada tema (quita espacios extra, viñetas, etc.).
    *   Guarda el resultado en el array \`analyzedUnits\`, manteniendo la asociación entre el nombre de la unidad y su nueva lista de temas.

2.  **Calcular Métricas Clave:**
    *   **\`topicCount\`**: Cuenta el número total de temas que has identificado en **todas** las unidades combinadas.
    *   **\`availableClasses\`**: Simplemente devuelve el valor de entrada \`{{availableClasses}}\`.
    *   **\`totalClassHours\`**: Simplemente devuelve el valor de entrada \`{{totalClassHours}}\`.
    *   **\`estimatedAutonomousHours\`**: Estima la cantidad de horas de estudio autónomo que un estudiante promedio necesitaría para asimilar todo el contenido del programa. Considera la cantidad de temas y su posible complejidad. Una regla general es 1-2 horas de estudio por cada hora de clase, pero ajústala según la densidad del contenido.

3.  **Generar Sugerencias Pedagógicas Globales:**
    *   **\`sequencing\`**: Analiza la lista completa de unidades y temas. Propón una secuencia lógica y pedagógica para enseñar el programa completo. Explica brevemente por qué sugieres ese orden (ej. "de lo general a lo particular", "cronológico", etc.).
    *   **\`prioritization\`**: De la lista total de temas de todas las unidades, identifica 3 a 5 temas que consideres "nucleares" o absolutamente esenciales para toda la asignatura. Justifica por qué son los más importantes.
    *   **\`pacing\`**: Compara el número total de temas (\`topicCount\`) con la cantidad de clases disponibles (\`{{availableClasses}}\`). Ofrece una recomendación sobre el ritmo. Por ejemplo: "Tienes {{availableClasses}} clases para desarrollar {{topicCount}} temas, lo que implica un ritmo de X tema(s) por clase. Esto parece [adecuado/ajustado/insuficiente]. Se sugiere [agrupar temas/profundizar en los prioritarios]".

Devuelve el resultado en un objeto JSON estructurado.
`,
});

const analyzeUnitContentFlow = ai.defineFlow(
  {
    name: 'analyzeUnitContentFlow',
    inputSchema: AnalyzeUnitContentInputSchema,
    outputSchema: AnalyzeUnitContentOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error("La IA no pudo analizar los contenidos de la unidad.");
    }
    return output;
  }
);
