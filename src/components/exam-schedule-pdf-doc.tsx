
'use client';

import * as React from 'react';
import type { EducationLevel, Event as EventType, Subject } from '@/lib/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';

const levelOrder: EducationLevel[] = ['superior_universitario', 'superior_no_universitario', 'secundario'];
const levelTranslations: Record<EducationLevel, string> = {
  secundario: 'Nivel Secundario',
  superior_no_universitario: 'Nivel Superior No Universitario',
  superior_universitario: 'Nivel Superior Universitario',
};

interface ExamInfo {
    date: Date;
    subjectName: string;
    instance: string;
    level: EducationLevel;
}

interface ExamSchedulePdfDocProps {
    events: EventType[];
    subjects: Subject[];
}

export function ExamSchedulePdfDoc({ events, subjects }: ExamSchedulePdfDocProps) {
    const examsByLevel = React.useMemo(() => {
        const exams: ExamInfo[] = [];

        events.forEach(event => {
            if (event.event_type.startsWith('EXAM_') && event.subject_id) {
                const subject = subjects.find(s => s.id === event.subject_id);
                if (subject) {
                    exams.push({
                        date: event.event_datetime,
                        subjectName: subject.name,
                        instance: event.title,
                        level: subject.level,
                    });
                }
            }
        });

        const grouped = exams.reduce((acc, exam) => {
            if (!acc[exam.level]) {
                acc[exam.level] = [];
            }
            acc[exam.level].push(exam);
            return acc;
        }, {} as Record<EducationLevel, ExamInfo[]>);

        for (const level in grouped) {
            grouped[level as EducationLevel].sort((a, b) => a.date.getTime() - b.date.getTime());
        }

        return grouped;
    }, [events, subjects]);

    return (
        <div style={{ fontFamily: 'Inter, sans-serif', color: 'black', background: 'white', padding: '2rem' }}>
            <header style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Cronograma Global de Mesas de Examen</h1>
                <p style={{ fontSize: '0.875rem', color: '#4a5568' }}>Generado el: {format(new Date(), 'PPP p', { locale: es })}</p>
            </header>

            <main style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {levelOrder.map(level => {
                    const exams = examsByLevel[level];
                    if (!exams || exams.length === 0) return null;

                    return (
                        <div key={level} className="page-break">
                            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', borderBottom: '2px solid black', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                                {levelTranslations[level]}
                            </h2>
                            <table style={{ width: '100%', fontSize: '0.875rem', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid black' }}>
                                        <th style={{ textAlign: 'left', padding: '0.5rem', width: '25%' }}>Fecha y Hora</th>
                                        <th style={{ textAlign: 'left', padding: '0.5rem', width: '50%' }}>Asignatura</th>
                                        <th style={{ textAlign: 'left', padding: '0.5rem', width: '25%' }}>Instancia</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {exams.map((exam, index) => (
                                        <tr key={index} style={{ borderBottom: '1px solid #ddd' }}>
                                            <td style={{ padding: '0.5rem', whiteSpace: 'nowrap' }}>{format(exam.date, 'EEE, dd/MM/yy - HH:mm \'hs\'', { locale: es })}</td>
                                            <td style={{ padding: '0.5rem' }}>{exam.subjectName}</td>
                                            <td style={{ padding: '0.5rem' }}>{exam.instance}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    );
                })}
            </main>
        </div>
    );
}

