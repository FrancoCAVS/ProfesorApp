
'use server';
/**
 * @fileOverview Un flujo para generar una distribución de temas en un cronograma.
 *
 * - generateSubjectSchedule - Analiza un programa y días de clase para proponer un cronograma.
 * - GenerateScheduleInput - El tipo de entrada.
 * - GenerateScheduleOutput - El tipo de salida.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { ClassModality } from '@/lib/types';

const GenerateScheduleInputSchema = z.object({
  subjectName: z.string().describe('El nombre de la asignatura.'),
  program: z.object({
    units: z.array(z.object({
      name: z.string(),
      topics: z.array(z.string()),
    })),
    activities: z.array(z.string()),
    examDates: z.array(z.object({
      instance: z.string().describe('Ej: "Primer Parcial", "Recuperatorio Segundo Parcial"'),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    })),
  }),
  classDays: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).describe('Lista de fechas de clase disponibles, ordenadas cronológicamente.'),
});
export type GenerateScheduleInput = z.infer<typeof GenerateScheduleInputSchema>;


const CronogramaEntrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  topic: z.string().optional(),
  classModality: z.enum(['presencial', 'virtual_sincronica', 'virtual_asincronica']).optional().describe("La modalidad de la clase."),
  activity: z.string().optional().describe("La actividad específica a realizar en clase."),
});

const GenerateScheduleOutputSchema = z.object({
  schedule: z.array(CronogramaEntrySchema),
  finalObservation: z.string().optional().describe('Una observación final sobre temas no cubiertos que deben ser trabajados de forma autónoma.'),
});
export type GenerateScheduleOutput = z.infer<typeof GenerateScheduleOutputSchema>;

export async function generateSubjectSchedule(
  input: GenerateScheduleInput
): Promise<GenerateScheduleOutput> {
  return generateSubjectScheduleFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateSubjectSchedulePrompt',
  input: { schema: GenerateScheduleInputSchema },
  output: { schema: GenerateScheduleOutputSchema },
  prompt: `Eres un asesor pedagógico experto. Tu tarea es distribuir el programa de una asignatura de manera lógica y realista a lo largo de las clases disponibles, priorizando los contenidos más importantes.

Asignatura: {{subjectName}}

**Programa de la Asignatura:**
{{#each program.units}}
- Unidad: {{this.name}}
  {{#each this.topics}}
  - Tema: {{this}}
  {{/each}}
{{/each}}

**Actividades de Clase / Tipos de Actividad Posibles:**
{{#if program.activities}}
{{#each program.activities}}
- {{this}}
{{/each}}
{{else}}
(No se especificaron actividades)
{{/if}}

**Fechas de Examen Fijas (estos días son solo para evaluación):**
{{#if program.examDates}}
{{#each program.examDates}}
- {{this.date}}: {{this.instance}}
{{/each}}
{{else}}
(No se especificaron fechas de examen)
{{/if}}

**Días de Clase Disponibles (ordenados):**
{{#each classDays}}
- {{this}}
{{/each}}

**Instrucciones para generar el cronograma:**
1.  **Identificar Temas Nucleares:** Analiza todo el programa y determina cuáles son los temas más cruciales o "nucleares" que deben ser enseñados sí o sí en clase.
2.  **Distribución Prioritaria:** Distribuye primero los temas nucleares de forma secuencial en las fechas de clase disponibles. El ritmo debe ser pedagógico: **uno o dos temas por clase**. Si un tema es muy extenso, puedes dividirlo en dos clases.
3.  **Fechas de Examen:** Las fechas marcadas como exámenes DEBEN ser reservadas para esa actividad. En el cronograma, para esas fechas, el campo 'topic' debe ser el nombre del examen (ej. "Primer Parcial"), 'classModality' debe ser 'presencial' y el campo 'activity' debe ser "Evaluación". NO asignes temas de unidades en estos días.
4.  **Modalidad y Actividad:** Para las clases regulares, asigna una 'classModality' (por defecto 'presencial') y una 'activity' de la lista de actividades posibles que sea apropiada para el tema. Varía las actividades.
5.  **Clases de Repaso:** Es una buena práctica planificar una clase de "Repaso General" justo antes de una fecha de examen importante.
6.  **Manejo de Temas Restantes:** Si después de asignar los temas nucleares a todas las clases disponibles aún quedan temas del programa sin asignar, **NO LOS INCLUYAS EN EL CRONOGRAMA**.
7.  **Observación Final:** Si hubo temas que no se pudieron asignar por falta de tiempo, **DEBES** añadir una observación en el campo \`finalObservation\`. El texto debe ser: "Los temas del programa que no figuren en este cronograma deberán ser preparados de forma autónoma por los estudiantes." Si todos los temas fueron asignados, este campo debe ser omitido o nulo.

Genera la distribución completa y devuelve el objeto JSON final.
`,
});

const generateSubjectScheduleFlow = ai.defineFlow(
  {
    name: 'generateSubjectScheduleFlow',
    inputSchema: GenerateScheduleInputSchema,
    outputSchema: GenerateScheduleOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error("La IA no pudo generar el cronograma.");
    }
    return output;
  }
);
