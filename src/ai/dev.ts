
import { config } from 'dotenv';
config();

import '@/ai/flows/suggest-event-details.ts';
import '@/ai/flows/generate-weekly-summary-flow.ts';
import '@/ai/flows/get-holidays-flow.ts';
import '@/ai/flows/extract-event-from-url-flow.ts';
import '@/ai/flows/extract-event-from-audio-flow.ts';
import '@/ai/flows/generate-formal-note-flow.ts';
import '@/ai/flows/generate-daily-summary-flow.ts';
import '@/ai/flows/get-commemorative-dates-flow.ts';
import '@/ai/flows/extract-academic-periods-from-image-flow.ts';
import '@/ai/flows/extract-event-from-image-flow.ts';
import '@/ai/flows/send-reminder-flow.ts';
import '@/ai/flows/generate-subject-schedule-flow.ts';
import '@/ai/flows/suggest-activities-flow.ts';
import '@/ai/flows/analyze-unit-content-flow.ts';
import '@/ai/flows/analyze-exam-schedule-flow.ts';
import '@/app/(app)/tools/user-guide/page';
import '@/app/(app)/tools/time-converter/page';
