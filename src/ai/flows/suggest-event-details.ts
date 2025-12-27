'use server';

/**
 * @fileOverview Flujo de sugerencia de detalles de eventos impulsado por IA.
 *
 * - suggestEventDetails - Una función que sugiere descripciones de eventos.
 * - SuggestEventDetailsInput - El tipo de entrada para la función suggestEventDetails.
 * - SuggestEventDetailsOutput - El tipo de retorno para la función suggestEventDetails.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestEventDetailsInputSchema = z.object({
  eventType: z.string().describe('El tipo de evento (p. ej., EXAM_PARCIAL, MEETING, HOLIDAY, CLASS, TRAINING, OTHER).'),
  subject: z.string().describe('La asignatura del evento.'),
  level: z.string().describe('El nivel educativo de la asignatura (Superior o Secundario).'),
});
export type SuggestEventDetailsInput = z.infer<typeof SuggestEventDetailsInputSchema>;

const SuggestEventDetailsOutputSchema = z.object({
  description: z.string().describe('La descripción sugerida para el evento.'),
});
export type SuggestEventDetailsOutput = z.infer<typeof SuggestEventDetailsOutputSchema>;

export async function suggestEventDetails(input: SuggestEventDetailsInput): Promise<SuggestEventDetailsOutput> {
  return suggestEventDetailsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestEventDetailsPrompt',
  input: {schema: SuggestEventDetailsInputSchema},
  output: {schema: SuggestEventDetailsOutputSchema},
  prompt: `Eres un asistente de IA que ayuda a los profesores a crear descripciones de eventos.
Basado en la siguiente información, genera una descripción detallada y relevante para el evento.

Tipo de Evento: {{{eventType}}}
Asignatura: {{{subject}}}
Nivel Educativo: {{{level}}}

Descripción:`,
});

const suggestEventDetailsFlow = ai.defineFlow(
  {
    name: 'suggestEventDetailsFlow',
    inputSchema: SuggestEventDetailsInputSchema,
    outputSchema: SuggestEventDetailsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
