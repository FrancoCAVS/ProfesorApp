
'use client';

export type EducationLevel = 'secundario' | 'superior_no_universitario' | 'superior_universitario';

export type SecondaryOrientation = string;

export type EventType = 
  | 'EXAM_PARCIAL'
  | 'EXAM_RECUPERATORIO'
  | 'EXAM_FINAL_PRIMER_LLAMADO'
  | 'EXAM_FINAL_SEGUNDO_LLAMADO'
  | 'EXAM_REGULAR'
  | 'EXAM_LIBRE'
  | 'EXAM_COMPLETAR_CARRERA'
  | 'MEETING' 
  | 'HOLIDAY' 
  | 'CLASS' 
  | 'TRAINING' 
  | 'OTHER'
  | 'TRIMESTER_FIRST_START'
  | 'TRIMESTER_FIRST_END'
  | 'TRIMESTER_SECOND_START'
  | 'TRIMESTER_SECOND_END'
  | 'TRIMESTER_THIRD_START'
  | 'TRIMESTER_THIRD_END'
  | 'ACTO_ESCOLAR'
  | 'ENTREGA_NOTAS'
  | 'TUTORIA'
  | 'CONFERENCIA'
  | 'COMMEMORATIVE'
  | 'PERSONAL_APPOINTMENT'
  | 'PERSONAL_TASK';

export interface ScheduleEntry {
  day: number; // 1 (Monday) to 6 (Saturday)
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
}

export interface ClassGroup {
  id: string;
  name: string; // "5º A" or "K2005"
  schedule: ScheduleEntry[];
  cathedraHours?: number;
  secondaryOrientation?: SecondaryOrientation;
}

export interface Unit {
  id: string;
  name: string;
  topics: string[];
}

export interface ExamDate {
  id: string;
  instance: string;
  date?: Date;
}

export interface SubjectProgram {
  methodology?: string;
  units: Unit[];
  activities: string[];
  examDates: ExamDate[];
  finalObservation?: string;
}

export interface Subject {
  id: string;
  name: string;
  level: EducationLevel;
  color: string;
  institution: string;
  year: string;
  status: 'active' | 'archived';
  
  class_groups: ClassGroup[]; 
  
  role?: string;
  roleStartDate?: Date;
  
  notes?: string;
  
  // Link to the specific academic period. This is the source of truth for scheduling.
  academicPeriodId?: string;

  // Specific to 'Superior'
  career?: string;
  
  // New fields for program customization
  program?: SubjectProgram;
}

export type ReminderTiming = 'none' | 'on_time' | '5m' | '15m' | '1h' | '2h' | '1d' | '2d';
export type ReminderChannel = 'in_app' | 'email' | 'whatsapp' | 'telegram' | 'push';

export interface ReminderSettings {
  type: 'simple' | 'recurring';
  
  // Simple reminder settings
  timing?: ReminderTiming;
  
  // Recurring reminder settings
  frequency?: 'daily' | 'weekly' | 'monthly';
  count?: number; // Number of times to repeat
  
  channels: ReminderChannel[];
}

export interface Event {
  id: string;
  title: string;
  event_type: string;
  event_datetime: Date;
  end_datetime?: Date;
  description: string;
  reminder: ReminderSettings;
  status: 'active' | 'archived';
  subject_id?: string;
  link?: string;
  attendance_status?: 'attended' | 'missed';
  attendance_notes?: string;
  seriesId?: string;
}

export interface FollowUpTask {
  id: string;
  title: string;
  notes: string;
  link?: string;
  priority: 'urgent' | 'high' | 'normal' | 'low';
  dueDate?: Date;
  status: 'pending' | 'completed';
  createdAt: Date;
  reminder?: ReminderSettings;
  // Optional fields for tasks linked to events
  originalEventId?: string;
  originalEventTitle?: string;
  originalEventDate?: Date;
}

export interface AttendanceRecord {
  id: string;
  date: Date;
  subject_id: string;
  class_group_id: string;
  start_time: string;
  end_time: string;
  status: 'present' | 'absent';
  notes?: string; // notes for present, reason for absent
  justification?: 'justificada' | 'injustificada'; // only if absent
}

export interface AcademicPeriod {
  id: string;
  name: string;
  type: 'vacation' | 'exam_period' | 'class_period' | 'other' | 'exam_period_annual';
  periodType?: 'anual' | 'first_semester' | 'second_semester';
  startDate: Date;
  endDate: Date;
  level?: 'secundario' | 'superior_no_universitario' | 'superior_universitario' | 'all';
}

export interface UserProfile {
  name: string;
  email: string;
  phoneNumber?: string;
  notebookLMLink?: string;
  dailySummary?: {
    enabled: boolean;
    time: string; // "HH:mm"
    channels: ('whatsapp' | 'telegram')[];
  };
}

export interface SentEmail {
  id: string;
  to: string;
  subject: string;
  body: string;
  sentAt: Date;
}

export interface Authority {
    id: string;
    role: string;
    name: string;
}

export interface UniversityBody {
    id: string;
    type: 'faculty' | 'organism';
    name: string;
    authorities?: Authority[];
}

export interface CareerBody {
    id: string;
    name: string;
    authorities?: Authority[];
}

export interface Institution {
  id: string;
  name: string;
  level: EducationLevel;
  schoolNumber?: string;
  shifts: ('morning' | 'afternoon' | 'evening')[];
  authorities?: Authority[];
  universityBodies?: UniversityBody[];
  careerBodies?: CareerBody[];
}

export type ClassModality = 'presencial' | 'virtual_sincronica' | 'virtual_asincronica';

export interface CronogramaEntry {
  subjectId: string;
  groupId: string;
  date: string; // YYYY-MM-DD format for key
  topic?: string;
  classModality?: ClassModality;
  activity?: string;
  status?: 'planned' | 'taught' | 'skipped';
}
