
import type { Event, Subject, AttendanceRecord, AcademicPeriod, FollowUpTask, Institution } from './types';
import { addDays, set, subDays } from 'date-fns';

const now = new Date();
const currentYear = now.getFullYear().toString();

export const MOCK_INSTITUTIONS: Institution[] = [
    {
        id: 'inst-1',
        name: 'Técnico Profesional - Centro de Educación Integral',
        level: 'secundario',
        schoolNumber: '4.058',
        directorName: 'Lic. Ana María Pérez',
        viceDirectorName: 'Prof. Juan Carlos González',
        shifts: ['morning', 'afternoon'],
    },
    {
        id: 'inst-2',
        name: 'Universidad Tecnológica Nacional',
        level: 'superior_no_universitario',
        directorName: 'Ing. Mario García',
        shifts: ['evening'],
    },
    {
        id: 'inst-3',
        name: 'Universidad de Buenos Aires',
        level: 'superior_universitario',
        shifts: ['morning', 'afternoon', 'evening'],
    },
];

export const MOCK_ACADEMIC_PERIODS: AcademicPeriod[] = [
    { id: 'ap-uni-c1', name: '1er Cuatrimestre Universitario 2024', type: 'class_period', periodType: 'first_semester', startDate: new Date(2024, 2, 18), endDate: new Date(2024, 6, 13), level: 'superior_universitario' },
    { id: 'ap-uni-c2', name: '2do Cuatrimestre Universitario 2024', type: 'class_period', periodType: 'second_semester', startDate: new Date(2024, 7, 12), endDate: new Date(2024, 11, 7), level: 'superior_universitario' },
    { id: 'ap-sup-c1', name: '1er Cuatrimestre Superior 2024', type: 'class_period', periodType: 'first_semester', startDate: new Date(2024, 2, 11), endDate: new Date(2024, 6, 6), level: 'superior_no_universitario' },
    { id: 'ap-sup-c2', name: '2do Cuatrimestre Superior 2024', type: 'class_period', periodType: 'second_semester', startDate: new Date(2024, 7, 5), endDate: new Date(2024, 11, 30), level: 'superior_no_universitario' },
    { id: 'ap-sup-anual', name: 'Periodo Lectivo Superior (Anual) 2024', type: 'class_period', periodType: 'anual', startDate: new Date(2024, 2, 11), endDate: new Date(2024, 11, 30), level: 'superior_no_universitario' },
    { id: 'ap-sec-anual', name: 'Periodo Lectivo Secundario 2024', type: 'class_period', periodType: 'anual', startDate: new Date(2024, 2, 4), endDate: new Date(2024, 11, 20), level: 'secundario' },
    { id: 'ap-receso-invierno', name: 'Receso escolar de invierno', type: 'vacation', startDate: new Date(2024, 6, 8), endDate: new Date(2024, 6, 19), level: 'all' },
    { id: 'ap-exam-jul-ago', name: 'Mesas de Examen Julio/Agosto', type: 'exam_period', startDate: new Date(2024, 6, 22), endDate: new Date(2024, 7, 2), level: 'all' },
    { id: 'ap-exam-dic', name: 'Mesas de Examen Diciembre', type: 'exam_period', startDate: new Date(2024, 11, 16), endDate: new Date(2024, 11, 27), level: 'all' },
];

export const MOCK_SUBJECTS: Subject[] = [
  { 
    id: 'subj-1', 
    name: 'Análisis Matemático I', 
    level: 'superior_no_universitario', 
    color: 'hsl(210 100% 50%)',
    institution: 'Universidad Tecnológica Nacional',
    year: currentYear,
    career: 'Ingeniería en Sistemas',
    status: 'active',
    academicPeriodId: 'ap-sup-anual',
    role: 'Titular',
    roleStartDate: new Date(now.getFullYear() - 2, 2, 1),
    notes: 'Material de estudio disponible en el campus virtual. Clases de consulta los viernes.',
    class_groups: [
      { id: 'cg-1-1', name: 'K2005', cathedraHours: 6, schedule: [
        { day: 1, startTime: '08:00', endTime: '10:00' },
        { day: 3, startTime: '10:00', endTime: '12:00' },
      ]}
    ]
  },
  { 
    id: 'subj-2', 
    name: 'Álgebra', 
    level: 'superior_no_universitario', 
    color: 'hsl(30 100% 50%)',
    institution: 'Universidad de Buenos Aires',
    year: currentYear,
    career: 'Ciencias de la Computación',
    status: 'active',
    academicPeriodId: 'ap-sup-c1',
    class_groups: [
      { id: 'cg-2-1', name: 'Comisión 1', cathedraHours: 5, schedule: [
        { day: 2, startTime: '14:00', endTime: '16:00' },
        { day: 4, startTime: '14:00', endTime: '16:00' },
      ]}
    ]
  },
  { 
    id: 'subj-3', 
    name: 'Física', 
    level: 'secundario', 
    color: 'hsl(120 100% 35%)',
    institution: 'Técnico Profesional - Centro de Educación Integral',
    year: currentYear,
    status: 'active',
    academicPeriodId: 'ap-sec-anual',
    role: 'Interino',
    roleStartDate: new Date(now.getFullYear(), 2, 1),
    class_groups: [
      { id: 'cg-3-1', name: '5º B', cathedraHours: 3, schedule: [{ day: 1, startTime: '10:30', endTime: '12:00' }]},
      { id: 'cg-3-2', name: '5º C', cathedraHours: 3, schedule: [{ day: 5, startTime: '08:00', endTime: '09:30' }]}
    ]
  },
  { 
    id: 'subj-4', 
    name: 'Literatura', 
    level: 'secundario', 
    color: 'hsl(300 100% 50%)',
    institution: 'Técnico Profesional - Centro de Educación Integral',
    year: currentYear,
    status: 'active',
    academicPeriodId: 'ap-sec-anual',
    class_groups: [
      { id: 'cg-4-1', name: '4º Año', cathedraHours: 4, schedule: [{ day: 3, startTime: '08:00', endTime: '09:30' }] }
    ]
  },
  { 
    id: 'subj-5', 
    name: 'Historia Argentina', 
    level: 'secundario', 
    color: 'hsl(50 100% 50%)',
    institution: 'Técnico Profesional - Centro de Educación Integral',
    year: currentYear,
    status: 'active',
    academicPeriodId: 'ap-sec-anual',
    class_groups: [
      { id: 'cg-5-1', name: '3º A', cathedraHours: 4, schedule: [{ day: 2, startTime: '08:00', endTime: '09:30' }] }
    ]
  },
  { 
    id: 'subj-6', 
    name: 'Filosofía y Lógica', 
    level: 'superior_universitario', 
    color: 'hsl(0 100% 60%)',
    institution: 'Universidad de Buenos Aires',
    year: currentYear,
    career: 'Filosofía',
    status: 'active',
    academicPeriodId: 'ap-uni-c1',
    class_groups: [
      { id: 'cg-6-1', name: 'Comisión 3', cathedraHours: 4, schedule: [{ day: 4, startTime: '18:00', endTime: '20:00' }] }
    ]
  },
  { 
    id: 'subj-7', 
    name: 'Biología', 
    level: 'secundario', 
    color: 'hsl(80 60% 50%)',
    institution: 'Técnico Profesional - Centro de Educación Integral',
    year: (now.getFullYear() - 1).toString(),
    status: 'archived',
    academicPeriodId: 'ap-sec-anual',
    class_groups: [
      { id: 'cg-7-1', name: '2º Año', cathedraHours: 5, schedule: [] }
    ]
  },
  { 
    id: 'subj-8', 
    name: 'Programación I', 
    level: 'superior_no_universitario', 
    color: 'hsl(240 100% 70%)',
    institution: 'Universidad Tecnológica Nacional',
    year: currentYear,
    career: 'Ingeniería en Sistemas',
    status: 'active',
    academicPeriodId: 'ap-sup-c2',
    class_groups: [
      { id: 'cg-8-1', name: 'K2006', cathedraHours: 5, schedule: [{ day: 5, startTime: '18:00', endTime: '21:00' }] }
    ]
  }
];

export const MOCK_EVENTS: Event[] = [
  { id: 'evt-1', title: 'Reunión de Departamento', event_type: 'MEETING', event_datetime: set(addDays(now, 3), { hours: 10 }), description: 'Planificación del segundo semestre.', reminder: { timing: '1d', channels: ['in_app', 'email'] }, status: 'active', subject_id: 'subj-1' },
  { id: 'evt-2', title: 'Entrega de Notas Finales', event_type: 'ENTREGA_NOTAS', event_datetime: set(addDays(now, 10), { hours: 18 }), description: 'Cierre de actas para Álgebra.', reminder: { timing: '2d', channels: ['in_app'] }, status: 'active', subject_id: 'subj-2' },
  { id: 'evt-3', title: 'Acto Día de la Bandera', event_type: 'ACTO_ESCOLAR', event_datetime: set(subDays(now, 5), { hours: 9 }), description: 'Acto escolar. Asistencia obligatoria.', reminder: { timing: '1d', channels: [] }, status: 'archived', attendance_status: 'attended' },
  { id: 'evt-4', title: 'Capacitación en Nuevas TICs', event_type: 'TRAINING', event_datetime: set(addDays(now, 7), { hours: 14, minutes: 30 }), description: 'Taller sobre herramientas digitales para el aula.', reminder: { timing: '1h', channels: ['in_app'] }, status: 'active' },
  { id: 'evt-5', title: 'Feriado Nacional', event_type: 'HOLIDAY', event_datetime: set(addDays(now, 20), { hours: 0 }), description: 'Día de la Independencia', reminder: { timing: 'none', channels: [] }, status: 'active' },
  { id: 'evt-6', title: 'Mesa de Examen Final - Física', event_type: 'EXAM_REGULAR', event_datetime: set(addDays(now, 30), { hours: 9 }), description: 'Mesa para alumnos regulares y libres de Física.', reminder: { timing: '2d', channels: ['in_app'] }, status: 'active', subject_id: 'subj-3' },
];

const absenceDate = subDays(now, 3);

export const MOCK_ATTENDANCE: AttendanceRecord[] = [
    { 
        id: 'att-1', 
        date: absenceDate, 
        subject_id: 'subj-1',
        class_group_id: 'cg-1-1',
        start_time: '08:00',
        end_time: '10:00',
        status: 'absent',
        notes: 'Cita médica',
        justification: 'justificada',
    },
     { 
        id: 'att-2', 
        date: absenceDate, 
        subject_id: 'subj-3',
        class_group_id: 'cg-3-1',
        start_time: '10:30',
        end_time: '12:00',
        status: 'present',
        notes: 'Clase de repaso para el parcial.',
    },
];

export const MOCK_FOLLOW_UP_TASKS: FollowUpTask[] = [
    {
        id: 'fut-1',
        originalEventId: 'evt-2',
        originalEventTitle: 'Entrega de Notas Finales',
        originalEventDate: set(addDays(now, 10), { hours: 18 }),
        notes: 'Recordar cargar las notas de los recuperatorios antes de la fecha límite.',
        priority: 'high',
        createdAt: new Date(),
        dueDate: addDays(now, 8),
        status: 'pending',
    }
];
