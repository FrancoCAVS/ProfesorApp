
'use client';

import * as React from 'react';
import type { Subject, Event as EventType } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { format, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { CalendarSearch } from 'lucide-react';

interface ExamScheduleSummaryProps {
    subject: Subject;
    events: EventType[];
}

export function ExamScheduleSummary({ subject, events }: ExamScheduleSummaryProps) {

    const sortedExams = React.useMemo(() => {
        if (!subject.program?.examDates) {
            return [];
        }

        const getPriority = (eventType: string): number => {
            if (eventType.includes('FINAL')) return 1;
            if (eventType.includes('REGULAR') || eventType.includes('LIBRE') || eventType.includes('COMPLETAR_CARRERA')) return 2;
            if (eventType.includes('PARCIAL')) return 3;
            if (eventType.includes('RECUPERATORIO')) return 4;
            return 5;
        };
        
        const examsWithDetails = subject.program.examDates
            .map(examDate => {
                const event = events.find(e => e.seriesId === examDate.id || e.id === examDate.id);
                return { ...examDate, event };
            });

        return examsWithDetails
            .filter(exam => exam.date && exam.event)
            .sort((a, b) => {
                const priorityA = getPriority(a.event!.event_type);
                const priorityB = getPriority(b.event!.event_type);
                
                if (priorityA !== priorityB) {
                    return priorityA - priorityB;
                }
                
                return new Date(a.date!).getTime() - new Date(b.date!).getTime();
            });
    }, [subject.program?.examDates, events]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Cronograma de Exámenes Guardado</CardTitle>
                <CardDescription>
                    Resumen de las fechas de examen planificadas para esta asignatura.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {sortedExams.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Instancia</TableHead>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Horario</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedExams.map((exam) => (
                                <TableRow key={exam.id}>
                                    <TableCell className="font-medium">{exam.instance}</TableCell>
                                    <TableCell>{exam.date ? format(new Date(exam.date), 'EEE, d MMM', { locale: es }) : 'N/A'}</TableCell>
                                    <TableCell>{exam.event?.event_datetime ? format(exam.event.event_datetime, 'HH:mm \'hs\'', { locale: es }) : 'N/A'}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-8">
                        <CalendarSearch className="h-10 w-10 mb-4" />
                        <p className="text-sm">No hay fechas de examen programadas.</p>
                        <p className="text-xs">Añade fechas en la sección "Planificación Académica".</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
