
'use server';
/**
 * @fileOverview Un flujo para analizar un cronograma de exámenes y ofrecer sugerencias.
 *
 * - analyzeExamSchedule - Analiza un conjunto de exámenes y devuelve un análisis pedagógico.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';

const ExamSchema = z.object({
  title: z.string().describe('El título del examen (generalmente el nombre de la materia).'),
  date: z.string().describe('La fecha y hora del examen en formato ISO.'),
  level: z.string().describe('El nivel educativo de la materia (secundario, superior_universitario, etc.).'),
  year: z.string().describe('El año o curso al que pertenece la materia (Ej: "1er Año", "5to Año").'),
  career: z.string().optional().describe('La carrera a la que pertenece la materia, si aplica.'),
});

const AnalyzeExamScheduleInputSchema = z.object({
  exams: z.array(ExamSchema),
  month: z.string().describe('El mes que se está analizando (Ej: "Julio 2024").'),
});
export type AnalyzeExamScheduleInput = z.infer<typeof AnalyzeExamScheduleInputSchema>;


const AnalyzeExamScheduleOutputSchema = z.object({
  suggestions: z.array(z.string()).describe('Una lista de 3 a 5 sugerencias concretas y accionables sobre el cronograma de exámenes.'),
});
export type AnalyzeExamScheduleOutput = z.infer<typeof AnalyzeExamScheduleOutputSchema>;


export async function analyzeExamSchedule(
  input: AnalyzeExamScheduleInput
): Promise<AnalyzeExamScheduleOutput> {
  return analyzeExamScheduleFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeExamSchedulePrompt',
  input: { schema: AnalyzeExamScheduleInputSchema },
  output: { schema: AnalyzeExamScheduleOutputSchema },
  prompt: `Eres un coordinador pedagógico experto en la organización de calendarios académicos. Tu tarea es analizar el siguiente cronograma de exámenes para el mes de {{month}} y proporcionar sugerencias para mejorarlo.

**Listado de Exámenes:**
---
{{#each exams}}
-   **Materia:** {{this.title}} ({{this.year}}{{#if this.career}}, {{this.career}}{{/if}})
    -   **Nivel:** {{this.level}}
    -   **Fecha:** {{this.date}}
---
{{/each}}

**Instrucciones de Análisis:**
1.  **Carga de Estudiantes:** Identifica si hay una alta concentración de exámenes para un mismo año o carrera en días consecutivos o en la misma semana. Esto puede sobrecargar a los estudiantes.
2.  **Distribución Equitativa:** Evalúa si los exámenes están distribuidos de manera equilibrada a lo largo del mes o si están todos agrupados en una o dos semanas.
3.  **Complejidad de Materias:** Si reconoces materias que suelen ser de alta carga teórica o práctica (como matemáticas, física, programación), fíjate si están muy juntas.
4.  **Coherencia entre Niveles:** Observa si hay patrones extraños, como agrupar todos los exámenes de nivel secundario en una semana y los de superior en otra, sin un motivo aparente.
5.  **Días de Descanso:** Fíjate si hay exámenes en días consecutivos (ej. lunes, martes y miércoles) para el mismo grupo de estudiantes (mismo año/carrera).

**Generación de Sugerencias:**
-   Basado en tu análisis, genera una lista de 3 a 5 **sugerencias concretas y accionables**.
-   Las sugerencias deben ser directas y fáciles de entender.
-   Ejemplos de sugerencias:
    *   "Se observa una alta concentración de exámenes para 1er Año de Ingeniería en la primera semana. Se sugiere mover el examen de Álgebra a la tercera semana para dar más tiempo de estudio."
    *   "Los exámenes de Física y Química para 5to Año están en días consecutivos. Sería beneficioso dejar al menos un día de estudio entre ellos."
    *   "La distribución general es buena, pero se podría considerar adelantar el examen de Literatura para no dejar la última semana tan vacía."
    *   "Hay 4 exámenes en 4 días seguidos para la carrera de Abogacía. Esto representa una carga excesiva para los estudiantes."
-   Si no encuentras problemas significativos, puedes generar una sugerencia positiva. Ejemplo: "La distribución de exámenes parece equilibrada y no presenta conflictos de sobrecarga evidentes."

Devuelve el resultado en el formato JSON especificado.
`,
});

const analyzeExamScheduleFlow = ai.defineFlow(
  {
    name: 'analyzeExamScheduleFlow',
    inputSchema: AnalyzeExamScheduleInputSchema,
    outputSchema: AnalyzeExamScheduleOutputSchema,
  },
  async (input) => {
    // Convert dates to a more readable format for the AI
    const examsWithFormattedDates = input.exams.map(exam => ({
        ...exam,
        date: format(new Date(exam.date), "EEEE, d 'de' MMMM 'a las' HH:mm 'hs'", { locale: es }),
    }));

    const { output } = await prompt({ ...input, exams: examsWithFormattedDates });
    if (!output) {
      throw new Error("La IA no pudo analizar el cronograma de exámenes.");
    }
    return output;
  }
);
