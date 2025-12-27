
'use client';

import * as React from 'react';
import {
  format,
  isSameDay,
  startOfWeek,
  endOfWeek,
  addDays,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  parse,
  addHours,
  subDays,
  parseISO,
  isValid,
  eachDayOfInterval,
} from 'date-fns';
import { es } from 'date-fns/locale/es';
import { PlusCircle, Edit, Trash2, Upload, Loader2, Link, MoreVertical, Archive, ArchiveRestore, Filter, Download, ChevronDown, CheckCircle2, XCircle, CircleSlash, BrainCircuit, Search, Star, User, UserPlus, CalendarOff, GraduationCap, Users, Rows3, LayoutGrid, Printer, Settings2, Calendar as CalendarIcon, AlertTriangle, Lightbulb, FileDown, Percent, Clock, HelpCircle } from 'lucide-react';
import { useApp } from '@/contexts/app-context';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { EventForm } from '@/components/event-form';
import type { Event as EventType, EventType as EventTypeEnum, EducationLevel, Subject, ClassGroup, ScheduleEntry } from '@/lib/types';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuGroup, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuPortal, DropdownMenuSubContent } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { PersonalEventForm } from '@/components/personal-event-form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { DateRange } from 'react-day-picker';
import { analyzeExamSchedule, type AnalyzeExamScheduleOutput } from '@/ai/flows/analyze-exam-schedule-flow';
import { Alert } from '@/components/ui/alert';
import { extractEventFromUrl } from '@/ai/flows/extract-event-from-url-flow';

const eventTypeTranslations: Record<EventTypeEnum, string> = {
    EXAM_PARCIAL: 'Ex. Parcial',
    EXAM_RECUPERATORIO: 'Ex. Recuperatorio',
    EXAM_FINAL_PRIMER_LLAMADO: 'Ex. Final (1er)',
    EXAM_FINAL_SEGUNDO_LLAMADO: 'Ex. Final (2do)',
    EXAM_REGULAR: 'Ex. Regular',
    EXAM_LIBRE: 'Ex. Libre',
    EXAM_COMPLETAR_CARRERA: 'Ex. Completar Carrera',
    MEETING: 'Reunión',
    HOLIDAY: 'Feriado',
    CLASS: 'Clase',
    TRAINING: 'Capacitación',
    OTHER: 'Otro',
    TRIMESTER_FIRST_START: 'Inicio 1er Trim.',
    TRIMESTER_FIRST_END: 'Fin 1er Trim.',
    TRIMESTER_SECOND_START: 'Inicio 2do Trim.',
    TRIMESTER_SECOND_END: 'Fin 2do Trim.',
    TRIMESTER_THIRD_START: 'Inicio 3er Trim.',
    TRIMESTER_THIRD_END: 'Fin 3er Trim.',
    ACTO_ESCOLAR: 'Acto Escolar',
    ENTREGA_NOTAS: 'Entrega de Notas',
    TUTORIA: 'Tutoría',
    CONFERENCIA: 'Conferencia',
    COMMEMORATIVE: 'Fecha Conmemorativa',
    PERSONAL_APPOINTMENT: 'Turno Personal',
    PERSONAL_TASK: 'Tarea Personal',
};

const EventTypeBadge: React.FC<{ type: string }> = ({ type }) => {
    const isCoreType = Object.keys(eventTypeTranslations).includes(type);
    const label = isCoreType ? eventTypeTranslations[type as EventTypeEnum] : type;
    
    let variant: "secondary" | "default" | "outline" | "destructive" = 'outline';
    if (isCoreType) {
        const coreType = type as EventTypeEnum;
        variant = coreType.startsWith('EXAM') ? 'destructive' : coreType.startsWith('TRIMESTER') ? 'secondary' : ({
            MEETING: 'secondary',
            HOLIDAY: 'default',
            CLASS: 'outline',
            TRAINING: 'secondary',
            OTHER: 'outline',
            ACTO_ESCOLAR: 'secondary',
            ENTREGA_NOTAS: 'secondary',
            TUTORIA: 'outline',
            CONFERENCIA: 'outline',
            COMMEMORATIVE: 'default',
            PERSONAL_APPOINTMENT: 'default',
            PERSONAL_TASK: 'default',
        }[coreType] as "secondary" | "default" | "outline" | undefined) ?? 'outline';
    }
    
    return <Badge variant={variant}>{label}</Badge>;
}

type CalendarView = 'day' | 'week' | 'bi-week' | 'month';
type DisplayMode = 'fichas' | 'resumen';

type FollowUpDetails = {
    create: boolean;
    priority: 'normal' | 'high' | 'urgent' | 'low';
}

function AttendanceNoteDialog({
    isOpen,
    onOpenChange,
    event,
    status,
    onConfirm,
}: {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    event: EventType | null;
    status: 'attended' | 'missed';
    onConfirm: (notes: string, followUpDetails: FollowUpDetails | null) => void;
}) {
    const [notes, setNotes] = React.useState('');
    const [createFollowUp, setCreateFollowUp] = React.useState(false);
    const [followUpPriority, setFollowUpPriority] = React.useState<'normal' | 'high' | 'urgent' | 'low'>('normal');

    React.useEffect(() => {
        if (isOpen && event) {
            setNotes(event.attendance_notes || '');
            setCreateFollowUp(false);
            setFollowUpPriority('normal');
        }
    }, [isOpen, event]);

    if (!event) return null;

    const handleSubmit = () => {
        const followUpDetails = createFollowUp ? { create: true, priority: followUpPriority } : null;
        onConfirm(notes, followUpDetails);
        onOpenChange(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {status === 'attended' ? 'Confirmar Asistencia' : 'Confirmar Inasistencia'}
                    </DialogTitle>
                    <DialogDescription>
                        Añade una nota para "{event.title}". Esta acción creará un registro formal en la sección "Asistencia" y afectará a tus informes.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-6">
                    <div>
                        <Label htmlFor="attendance-notes">Notas de seguimiento (opcional)</Label>
                        <Textarea
                            id="attendance-notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder={status === 'attended' ? "Ej: Se cubrieron los temas planeados, los alumnos participaron activamente..." : "Ej: Ausente por motivo personal, reprogramar la clase de consulta..."}
                            className="mt-2"
                        />
                    </div>
                    <div className="space-y-4 rounded-lg border p-4 bg-muted/50">
                        <div className="flex items-center space-x-2">
                            <Checkbox id="create-follow-up" checked={createFollowUp} onCheckedChange={(checked) => setCreateFollowUp(!!checked)} />
                            <Label htmlFor="create-follow-up">Crear tarea de seguimiento para esta nota</Label>
                        </div>
                        {createFollowUp && (
                            <div className="pl-6">
                                <Label htmlFor="follow-up-priority">Prioridad de la Tarea</Label>
                                 <Select value={followUpPriority} onValueChange={(value) => setFollowUpPriority(value as any)}>
                                    <SelectTrigger id="follow-up-priority" className="mt-2">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="urgent">Urgente</SelectItem>
                                        <SelectItem value="high">Prioritario</SelectItem>
                                        <SelectItem value="normal">De rutina</SelectItem>
                                        <SelectItem value="low">Largo plazo</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button onClick={handleSubmit}>Confirmar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

interface ExamReport {
    conflicts: { event1: EventType, event2: EventType }[];
    countByLevel: Record<string, number>;
    suggestions: string[];
}

function ExamAnalysisDialog({ isOpen, onOpenChange, report, month }: { isOpen: boolean, onOpenChange: (open: boolean) => void, report: ExamReport | null, month: string }) {
    if (!report) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Análisis de Exámenes de {month}</DialogTitle>
                    <DialogDescription>
                        Resumen de la carga de exámenes, conflictos y sugerencias para el mes seleccionado.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4 max-h-[70vh] overflow-y-auto">
                    <Card>
                        <CardHeader>
                            <CardTitle>Conflictos de Horario Detectados</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {report.conflicts.length > 0 ? (
                                <ul className="space-y-3">
                                    {report.conflicts.map((conflict, index) => (
                                        <li key={index} className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                                            <div className="flex items-center gap-2 text-destructive font-semibold">
                                                <AlertTriangle className="h-4 w-4" />
                                                <span>Superposición detectada:</span>
                                            </div>
                                            <p className="text-sm pl-6">{conflict.event1.title} ({format(conflict.event1.event_datetime, 'p', { locale: es })})</p>
                                            <p className="text-sm pl-6">{conflict.event2.title} ({format(conflict.event2.event_datetime, 'p', { locale: es })})</p>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-muted-foreground">No se encontraron conflictos de horario en las mesas de examen del mes.</p>
                            )}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Total de Exámenes por Nivel</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nivel Educativo</TableHead>
                                        <TableHead className="text-right">Cantidad de Exámenes</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {Object.entries(report.countByLevel).map(([level, count]) => (
                                        <TableRow key={level}>
                                            <TableCell className="font-medium">{level}</TableCell>
                                            <TableCell className="text-right font-bold">{count}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle>Sugerencias de la IA</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {report.suggestions.length > 0 ? (
                                <ul className="space-y-2 list-disc pl-5">
                                    {report.suggestions.map((suggestion, index) => (
                                        <li key={index} className="text-sm">{suggestion}</li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-muted-foreground">La IA no ha generado sugerencias para este período.</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
                <DialogFooter>
                    <Button onClick={() => onOpenChange(false)}>Cerrar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

/**
 * A robust CSV parser that handles quoted fields, BOM, and both comma/semicolon delimiters.
 */
function parseCsv(text: string): Record<string, string>[] {
    // Handle UTF-8 BOM (Byte Order Mark)
    if (text.startsWith('ufeff')) {
        text = text.slice(1);
    }
    const cleanText = text.replace(/\r/g, ''); // Remove carriage returns
    const lines = cleanText.trim().split('\n');
    if (lines.length < 1) return [];

    // Detect delimiter (comma or semicolon)
    const headerLine = lines[0];
    const delimiter = headerLine.includes(';') ? ';' : ',';
    
    // Parse header, removing quotes and converting to lowercase
    const header = headerLine.split(delimiter).map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
    const rows = lines.slice(1);
    
    return rows.map(rowStr => {
        if (!rowStr.trim()) return {}; // Skip empty rows

        // Regex to split by the detected delimiter but ignore delimiters inside double quotes
        const values = rowStr.split(new RegExp(`${delimiter}(?=(?:(?:[^"]*"){2})*[^"]*$)`));
        
        const obj: Record<string, string> = {};
        header.forEach((key, i) => {
            let value = (values[i] || '').trim();
            // Remove quotes if they exist at the start and end and unescape double quotes
            if (value.startsWith('"') && value.endsWith('"')) {
                value = value.substring(1, value.length - 1).replace(/""/g, '"');
            }
            obj[key] = value;
        });
        return obj;
    }).filter(obj => Object.keys(obj).length > 0 && Object.values(obj).some(v => !!v));
}

function CalendarAttendanceSummary({ events }: { events: EventType[] }) {
    const reportData = React.useMemo(() => {
        const academicEvents = events.filter(e => e.subject_id && e.event_type !== 'HOLIDAY' && e.event_type !== 'COMMEMORATIVE');
        const totalClasses = academicEvents.length;

        let totalAttended = 0;
        let totalAbsentJustified = 0;
        let totalAbsentUnjustified = 0;

        academicEvents.forEach(event => {
            if (event.attendance_status === 'attended') {
                totalAttended++;
            } else if (event.attendance_status === 'missed') {
                // Simplified assumption for now. Can be enhanced if justification is stored.
                totalAbsentJustified++;
            }
        });

        const totalAbsent = totalAbsentJustified + totalAbsentUnjustified;
        const totalUnrecorded = totalClasses - totalAttended - totalAbsent;
        const possibleAttendance = totalClasses - totalAbsentJustified;
        const overallAttendanceRate = possibleAttendance > 0 ? (totalAttended / possibleAttendance) * 100 : 0;
        
        return {
            totalClasses,
            totalAttended,
            totalAbsent,
            totalAbsentJustified,
            totalAbsentUnjustified,
            totalUnrecorded,
            overallAttendanceRate
        };
    }, [events]);

    if (reportData.totalClasses === 0) return null;

    return (
        <div className="mt-8">
            <h3 className="text-xl font-bold text-center mb-4">Informe de Asistencia del Período</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Eventos</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{reportData.totalClasses}</div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Asistencia</CardTitle>
                        <Percent className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{reportData.overallAttendanceRate.toFixed(1)}%</div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Asistido</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{reportData.totalAttended}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Ausente</CardTitle>
                        <XCircle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{reportData.totalAbsent}</div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Sin Registrar</CardTitle>
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{reportData.totalUnrecorded}</div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default function CalendarPage() {
  const { events, subjects, deleteEvent, updateEventAttendance, addFollowUpTask, addMultipleEvents, archiveEvent, unarchiveEvent, academicPeriods } = useApp();
  const { toast } = useToast();
  const [date, setDate] = React.useState<Date | undefined>(undefined);
  const [month, setMonth] = React.useState<Date | undefined>(undefined);
  const [selectedEvent, setSelectedEvent] = React.useState<EventType | null>(null);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isPersonalFormOpen, setIsPersonalFormOpen] = React.useState(false);
  const [showArchived, setShowArchived] = React.useState(false);
  const [view, setView] = React.useState<CalendarView>('day');
  const [displayMode, setDisplayMode] = React.useState<DisplayMode>('fichas');
  
  const [isAttendanceNoteDialogOpen, setIsAttendanceNoteDialogOpen] = React.useState(false);
  const [eventForAttendanceNote, setEventForAttendanceNote] = React.useState<EventType | null>(null);
  const [attendanceStatusToSet, setAttendanceStatusToSet] = React.useState<'attended' | 'missed'>('attended');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [customDateRange, setCustomDateRange] = React.useState<DateRange | undefined>();
  
  const [isAnalysisLoading, setIsAnalysisLoading] = React.useState(false);
  const [analysisReport, setAnalysisReport] = React.useState<ExamReport | null>(null);
  const [isAnalysisDialogOpen, setIsAnalysisDialogOpen] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setDate(new Date());
    setMonth(new Date());
  }, []);
  
  const isCustomDateSearch = customDateRange?.from && customDateRange?.to;

  const { visibleEvents, viewTitle } = React.useMemo(() => {
    const lowerCaseSearchTerm = searchTerm.toLowerCase().trim();

    const baseFilteredEvents = events.filter(event => {
      if (!showArchived && event.status === 'archived') return false;
      return true;
    });

    if (isCustomDateSearch) {
      const filtered = baseFilteredEvents.filter(event => 
        isWithinInterval(event.event_datetime, { start: customDateRange.from!, end: customDateRange.to! })
      );
      const title = `Eventos del ${format(customDateRange.from!, 'PPP', { locale: es })} al ${format(customDateRange.to!, 'PPP', { locale: es })}`;
      return { visibleEvents: filtered.sort((a,b) => a.event_datetime.getTime() - b.event_datetime.getTime()), viewTitle: title };
    }

    if (lowerCaseSearchTerm) {
      const filteredEvents = baseFilteredEvents
        .filter(event => {
          const subject = subjects.find(s => s.id === event.subject_id);
          const searchCorpus = [
            event.title,
            event.description,
            subject?.name,
            subject?.institution,
            subject?.career,
            eventTypeTranslations[event.event_type as EventTypeEnum] || event.event_type,
            format(event.event_datetime, 'd MMMM yyyy, EEEE', { locale: es })
          ].filter(Boolean).join(' ').toLowerCase();

          return searchCorpus.includes(lowerCaseSearchTerm);
        })
        .sort((a, b) => a.event_datetime.getTime() - b.event_datetime.getTime());
      
      return {
        visibleEvents: filteredEvents,
        viewTitle: `Resultados de búsqueda para "${searchTerm}"`
      };
    }

    const anchorDate = date || new Date(); 
    const monthAnchor = month || anchorDate;

    let start: Date, end: Date, title: string;

    switch (view) {
      case 'week':
        start = startOfWeek(anchorDate, { weekStartsOn: 1 });
        end = endOfWeek(anchorDate, { weekStartsOn: 1 });
        title = `Semana del ${format(start, 'd MMM')} al ${format(end, 'd MMM, yyyy', { locale: es })}`;
        break;
      case 'bi-week':
        start = anchorDate;
        end = addDays(anchorDate, 14);
        title = `15 días desde el ${format(start, 'PPP', { locale: es })}`;
        break;
      case 'month':
        start = startOfMonth(monthAnchor);
        end = endOfMonth(monthAnchor);
        title = format(monthAnchor, 'MMMM yyyy', { locale: es });
        break;
      case 'day':
      default:
        start = anchorDate;
        end = anchorDate;
        title = `Eventos para ${format(anchorDate, 'PPP', { locale: es })}`;
        break;
    }
    
    // Combine created events and scheduled classes
    const allOccurrences: EventType[] = [...baseFilteredEvents];
    const dateRangeInterval = { start, end };
    const daysInRange = eachDayOfInterval(dateRangeInterval);

    const parsedAcademicPeriods = academicPeriods.map(p => ({
        ...p,
        startDate: new Date(p.startDate),
        endDate: new Date(p.endDate)
    }));

    daysInRange.forEach(day => {
        const dayOfWeek = day.getDay();

        const isHoliday = allOccurrences.some(e => e.event_type === 'HOLIDAY' && isSameDay(e.event_datetime, day));
        if (isHoliday) return;
        
        subjects.forEach(subject => {
            if (subject.status !== 'active' || !subject.class_groups) return;
            if (!subject.academicPeriodId) return;

            const subjectPeriod = parsedAcademicPeriods.find(p => p.id === subject.academicPeriodId);
            if (!subjectPeriod || subjectPeriod.type !== 'class_period' || !isWithinInterval(day, { start: subjectPeriod.startDate, end: subjectPeriod.endDate })) return;

            const isSuspended = parsedAcademicPeriods.some(p => {
                const isSuspendingType = p.type === 'vacation' || p.type === 'exam_period_annual';
                if (!isSuspendingType) return false;
                const appliesToLevel = !p.level || p.level === 'all' || p.level === subject.level;
                if (!appliesToLevel) return false;
                return isWithinInterval(day, { start: p.startDate, end: p.endDate });
            });

            if (isSuspended) return;

            subject.class_groups.forEach(group => {
                group.schedule.forEach(schedule => {
                    if (Number(schedule.day) === dayOfWeek) {
                        const [hour, minute] = schedule.startTime.split(':').map(Number);
                        const eventDate = new Date(day);
                        eventDate.setHours(hour, minute);

                        // Prevent duplication if an event for this class already exists
                        const existingEvent = allOccurrences.find(e => 
                            isSameDay(e.event_datetime, eventDate) &&
                            e.subject_id === subject.id &&
                            e.title.includes(group.name) // Simple check
                        );

                        if (!existingEvent) {
                            allOccurrences.push({
                                id: `class-${subject.id}-${group.id}-${day.toISOString()}-${schedule.startTime}`,
                                title: `${subject.name} - ${group.name}`,
                                event_type: 'CLASS',
                                event_datetime: eventDate,
                                description: `Clase regular para ${group.name}`,
                                subject_id: subject.id,
                                status: 'active',
                                reminder: { type: 'simple', timing: 'none', channels: [] }
                            });
                        }
                    }
                });
            });
        });
    });

    const filteredEvents = allOccurrences
      .filter(event => {
         const isInDateRange = view === 'day' ? isSameDay(event.event_datetime, start) : isWithinInterval(event.event_datetime, { start, end });
         return isInDateRange;
      })
      .sort((a, b) => a.event_datetime.getTime() - b.event_datetime.getTime());

    return { visibleEvents: filteredEvents, viewTitle: title };
  }, [events, date, month, view, showArchived, searchTerm, subjects, customDateRange, isCustomDateSearch, academicPeriods]);


  React.useEffect(() => {
    if (searchTerm) {
        setCustomDateRange(undefined);
        setDate(undefined);
        setMonth(undefined);
    }
    if(isCustomDateSearch){
        setSearchTerm('');
        setDate(undefined);
        setMonth(undefined);
    }
    if(!searchTerm && !isCustomDateSearch && !date) {
        setDate(new Date());
        setMonth(new Date());
    }
  }, [searchTerm, isCustomDateSearch, date]);

  const eventsByDay = React.useMemo(() => {
    const grouped: Record<string, EventType[]> = {};
    visibleEvents.forEach(event => {
      const dayKey = format(event.event_datetime, 'yyyy-MM-dd');
      if (!grouped[dayKey]) {
        grouped[dayKey] = [];
      }
      grouped[dayKey].push(event);
    });
    return grouped;
  }, [visibleEvents]);
  
  const sortedDays = Object.keys(eventsByDay).sort();

  const handleEdit = (event: EventType) => {
    if (event.id.startsWith('class-')) {
        toast({
            variant: "default",
            title: "Edición de Clase Regular",
            description: "Para editar el horario de una clase regular, ve a la página de 'Asignaturas' y modifica el horario de la comisión correspondiente.",
        });
        return;
    }
    setSelectedEvent(event);
    if(event.event_type === 'PERSONAL_APPOINTMENT' || event.event_type === 'PERSONAL_TASK') {
        setIsPersonalFormOpen(true);
    } else {
        setIsFormOpen(true);
    }
  };
  
  const handleAddNewAcademic = () => {
    setSelectedEvent(null);
    setIsFormOpen(true);
  };
  
  const handleAddNewPersonal = () => {
    setSelectedEvent(null);
    setIsPersonalFormOpen(true);
  };
  
  const handlePrint = () => {
    window.print();
  };

  const handleMarkAttendanceClick = (event: EventType, status: 'attended' | 'missed') => {
    setEventForAttendanceNote(event);
    setAttendanceStatusToSet(status);
    setIsAttendanceNoteDialogOpen(true);
  };
  
  const handleConfirmAttendance = (notes: string, followUpDetails: FollowUpDetails | null) => {
    if (!eventForAttendanceNote) return;
    
    updateEventAttendance(eventForAttendanceNote.id, attendanceStatusToSet, notes);
    
    toast({
        title: attendanceStatusToSet === 'attended' ? 'Asistencia marcada' : 'Inasistencia marcada',
        description: `Se registró el estado para "${eventForAttendanceNote.title}".`,
    });

    if (followUpDetails?.create) {
      if (notes.trim() && eventForAttendanceNote.id && eventForAttendanceNote.title && eventForAttendanceNote.event_datetime) {
        addFollowUpTask({
          originalEventId: eventForAttendanceNote.id,
          originalEventTitle: eventForAttendanceNote.title,
          originalEventDate: eventForAttendanceNote.event_datetime,
          notes: notes,
          priority: followUpDetails.priority,
        });
        toast({
            title: "Tarea de seguimiento creada",
            description: `Tu nota ha sido añadida a la página de Seguimiento.`,
        });
      } else {
        toast({
            variant: 'destructive',
            title: "No se pudo crear el seguimiento",
            description: `Se requieren notas para crear una tarea de seguimiento.`,
        });
      }
    }
  };

  React.useEffect(() => {
    if (!isFormOpen && !isPersonalFormOpen) {
      setSelectedEvent(null);
    }
  }, [isFormOpen, isPersonalFormOpen]);
  
  const handleEditAttendanceNoteClick = (event: EventType) => {
    const status = event.attendance_status === 'missed' ? 'missed' : 'attended';
    handleMarkAttendanceClick(event, status);
  };

  const handleAnalyzeExams = async () => {
    setIsAnalysisLoading(true);
    setAnalysisReport(null);

    const examsInMonth = visibleEvents.filter(e => e.event_type.startsWith('EXAM_') && e.subject_id);

    if (examsInMonth.length === 0) {
        toast({ title: 'Sin exámenes', description: 'No hay exámenes programados en el mes seleccionado para analizar.' });
        setIsAnalysisLoading(false);
        return;
    }

    // 1. Detect Conflicts
    const conflicts: { event1: EventType, event2: EventType }[] = [];
    const sortedExams = [...examsInMonth].sort((a, b) => a.event_datetime.getTime() - b.event_datetime.getTime());
    for (let i = 0; i < sortedExams.length; i++) {
        for (let j = i + 1; j < sortedExams.length; j++) {
            const event1 = sortedExams[i];
            const event2 = sortedExams[j];
            const end1 = event1.end_datetime || addHours(event1.event_datetime, 2); // Assume 2 hours if no end time
            const end2 = event2.end_datetime || addHours(event2.event_datetime, 2);

            if (event1.event_datetime < end2 && end1 > event2.event_datetime) {
                conflicts.push({ event1, event2 });
            }
        }
    }

    // 2. Count by Level
    const countByLevel = examsInMonth.reduce((acc, exam) => {
        const subject = subjects.find(s => s.id === exam.subject_id);
        if (subject) {
            const levelName = subject.level.startsWith('superior') ? 'Nivel Superior' : 'Nivel Secundario';
            acc[levelName] = (acc[levelName] || 0) + 1;
        }
        return acc;
    }, {} as Record<string, number>);

    // 3. Get AI Suggestions
    let suggestions: string[] = [];
    try {
        const aiInput = {
            month: format(month || new Date(), 'MMMM yyyy', { locale: es }),
            exams: examsInMonth.map(exam => {
                const subject = subjects.find(s => s.id === exam.subject_id);
                return {
                    title: exam.title,
                    date: exam.event_datetime.toISOString(),
                    level: subject?.level || 'desconocido',
                    year: subject?.year || 'N/A',
                    career: subject?.career,
                };
            }),
        };
        const result = await analyzeExamSchedule(aiInput);
        suggestions = result.suggestions;
    } catch (e) {
        console.error("AI analysis failed", e);
        toast({ variant: 'destructive', title: 'Error de IA', description: 'No se pudieron obtener las sugerencias.' });
    }

    setAnalysisReport({ conflicts, countByLevel, suggestions });
    setIsAnalysisLoading(false);
    setIsAnalysisDialogOpen(true);
  };
  
    const handleDownloadTemplate = () => {
        const csvHeader = "nombre_materia,institucion,nivel,tipo_examen,fecha,hora\n";
        const csvExample1 = `"Física","Colegio Nacional","secundario","EXAM_REGULAR","25-07-2024","10:00"\n`;
        const csvExample2 = `"Álgebra","UBA","superior_universitario","EXAM_FINAL_PRIMER_LLAMADO","22-07-2024","09:00"`;
        const csvContent = csvHeader + csvExample1 + csvExample2;

        const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'plantilla_importacion_examenes.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const fileText = await file.text();
            const results = parseCsv(fileText);

            if (results.length === 0) {
                toast({ variant: "destructive", title: "Archivo vacío", description: "El archivo CSV no contiene datos." });
                return;
            }

            const eventsToCreate: Omit<EventType, 'id' | 'status'>[] = [];
            let processedCount = 0;
            let errorCount = 0;

            for (const row of results) {
                const subject = subjects.find(s =>
                    s.name.toLowerCase() === row.nombre_materia?.toLowerCase() &&
                    s.institution.toLowerCase() === row.institucion?.toLowerCase() &&
                    s.level.toLowerCase() === row.nivel?.toLowerCase()
                );

                if (!subject) {
                    errorCount++;
                    continue;
                }

                const eventType = row.tipo_examen || '';
                const dateStr = row.fecha; // "DD-MM-YYYY"
                const timeStr = row.hora; // "HH:mm"

                if (dateStr && timeStr) {
                    try {
                        const eventDate = parse(`${dateStr} ${timeStr}`, 'dd-MM-yyyy HH:mm', new Date());

                        if (eventType && eventType.startsWith('EXAM_') && isValid(eventDate)) {
                            eventsToCreate.push({
                                title: `${subject.name} - ${eventTypeTranslations[eventType as EventTypeEnum] || eventType}`,
                                event_type: eventType,
                                event_datetime: eventDate,
                                description: `Examen importado desde CSV. Institución: ${subject.institution}.`,
                                subject_id: subject.id,
                                reminder: { type: 'simple', timing: '2d', channels: ['in_app'] }
                            });
                            processedCount++;
                        } else {
                          errorCount++;
                        }
                    } catch (parseError) {
                        console.error("Error parsing date/time for row:", row, parseError);
                        errorCount++;
                    }
                } else {
                    errorCount++;
                }
            }

            if (eventsToCreate.length > 0) {
                addMultipleEvents(eventsToCreate);
            }
      
            toast({
                title: "Importación CSV Completada",
                description: `${processedCount} exámenes generados. ${errorCount} filas no se pudieron procesar por datos incorrectos o faltantes.`,
            });

        } catch (error) {
            console.error("Error al importar CSV de exámenes:", error);
            toast({ variant: "destructive", title: "Error de Importación", description: "Hubo un problema al procesar el archivo CSV." });
        } finally {
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };


  return (
    <div className="flex h-full flex-col">
       <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".csv"
        className="hidden"
      />
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-2xl">
            <EventForm eventToEdit={selectedEvent} onFinished={() => setIsFormOpen(false)} />
        </DialogContent>
      </Dialog>
      <Dialog open={isPersonalFormOpen} onOpenChange={setIsPersonalFormOpen}>
        <DialogContent>
            <PersonalEventForm eventToEdit={selectedEvent} onFinished={() => setIsPersonalFormOpen(false)} />
        </DialogContent>
      </Dialog>
      <AttendanceNoteDialog
        isOpen={isAttendanceNoteDialogOpen}
        onOpenChange={setIsAttendanceNoteDialogOpen}
        event={eventForAttendanceNote}
        status={attendanceStatusToSet}
        onConfirm={handleConfirmAttendance}
      />
      <ExamAnalysisDialog
        isOpen={isAnalysisDialogOpen}
        onOpenChange={setIsAnalysisDialogOpen}
        report={analysisReport}
        month={format(month || new Date(), 'MMMM yyyy', { locale: es })}
      />
      <PageHeader title="Calendario" className="print:hidden">
        <div className="flex w-full flex-wrap items-center justify-end gap-2">
            <div className="flex flex-1 flex-wrap items-center gap-2">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por título, materia..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-full sm:w-auto sm:min-w-[250px]"
                    />
                </div>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full sm:w-auto">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            Buscar por Fecha
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={customDateRange?.from}
                            selected={customDateRange}
                            onSelect={setCustomDateRange}
                            numberOfMonths={2}
                            locale={es}
                        />
                    </PopoverContent>
                </Popover>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 rounded-md bg-muted p-1">
                    <Button onClick={() => setView('day')} variant={view === 'day' ? 'secondary' : 'ghost'} size="sm" className="px-3">Día</Button>
                    <Button onClick={() => setView('week')} variant={view === 'week' ? 'secondary' : 'ghost'} size="sm" className="px-3">Semana</Button>
                    <Button onClick={() => setView('bi-week')} variant={view === 'bi-week' ? 'secondary' : 'ghost'} size="sm" className="px-3">Quincena</Button>
                    <Button onClick={() => setView('month')} variant={view === 'month' ? 'secondary' : 'ghost'} size="sm" className="px-3">Mes</Button>
                </div>
                 {view === 'month' && (
                    <Button onClick={handleAnalyzeExams} variant="outline" size="sm" disabled={isAnalysisLoading}>
                        {isAnalysisLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lightbulb className="mr-2 h-4 w-4" />}
                        Analizar Mes
                    </Button>
                )}
                <div className="flex items-center gap-1 rounded-md bg-muted p-1">
                    <Button onClick={() => setDisplayMode('fichas')} variant={displayMode === 'fichas' ? 'secondary' : 'ghost'} size="sm" className="px-3"><LayoutGrid className="mr-2 h-4 w-4"/>Fichas</Button>
                    <Button onClick={() => setDisplayMode('resumen')} variant={displayMode === 'resumen' ? 'secondary' : 'ghost'} size="sm" className="px-3"><Rows3 className="mr-2 h-4 w-4"/>Resumen</Button>
                </div>
                
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                            <Upload className="mr-2 h-4 w-4" />
                            Importar Mesas
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                            Importar archivo CSV...
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleDownloadTemplate}>
                            Descargar plantilla (.csv)
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                            <Settings2 className="mr-2 h-4 w-4" />
                            Opciones
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuLabel>Opciones de Visualización</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuCheckboxItem checked={showArchived} onCheckedChange={setShowArchived}>
                            Mostrar eventos finalizados
                        </DropdownMenuCheckboxItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <div className='flex items-center gap-2'>
                <Button variant="outline" onClick={handleAddNewPersonal}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Añadir Evento Personal
                </Button>
                <Button onClick={handleAddNewAcademic}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Añadir Evento Académico
                </Button>
            </div>
        </div>
      </PageHeader>
      <div className="flex flex-1 overflow-hidden print:block">
        <div className={cn(
            "w-1/3 min-w-[350px] max-w-[400px] border-r p-8 flex-col transition-opacity print:hidden", 
            (searchTerm || isCustomDateSearch) ? "hidden" : "flex"
        )}>
            <h2 className="text-xl font-semibold mb-4 font-headline print:hidden">Selecciona una Fecha</h2>
            <Card className="print:hidden">
                {month ? (
                    <Calendar
                        mode="single"
                        selected={date}
                        onSelect={(newDate) => { setDate(newDate); if(newDate) setCustomDateRange(undefined); }}
                        month={month}
                        onMonthChange={setMonth}
                        className="p-0"
                        locale={es}
                        captionLayout="dropdown-buttons"
                        fromYear={new Date().getFullYear() - 5}
                        toYear={new Date().getFullYear() + 5}
                        modifiers={{
                            hasEvent: events.filter(e => e.status === 'active').map(e => e.event_datetime),
                        }}
                    />
                ) : (
                    <div className="p-3">
                        <Skeleton className="h-[298px] w-full" />
                    </div>
                )}
            </Card>
        </div>
        <div className={cn("flex-1 overflow-y-auto p-4 md:p-8 print:overflow-visible", (searchTerm || isCustomDateSearch) && "w-full max-w-full")}>
          {(!date && !searchTerm && !isCustomDateSearch) ? (
            <div className="flex h-full items-center justify-center rounded-lg border-2 border-dashed bg-muted/50 p-12 print:hidden">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold mb-4 font-headline print:text-2xl print:text-center">
                <span className="text-primary">{viewTitle}</span>
              </h2>

              {visibleEvents.length > 0 ? (
                <div className="printable-area">
                {displayMode === 'resumen' ? (
                     <div>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Horario</TableHead>
                                    <TableHead>Evento</TableHead>
                                    <TableHead>Asignatura</TableHead>
                                    <TableHead>Institución / Carrera</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {visibleEvents.map(event => {
                                    const subject = subjects.find(s => s.id === event.subject_id);
                                    
                                    let institutionDisplay = 'Personal';
                                    if (subject) {
                                        if (subject.level === 'superior_universitario') {
                                            institutionDisplay = `${subject.career} - ${subject.institution}`;
                                        } else {
                                            institutionDisplay = subject.institution;
                                        }
                                    }

                                    return (
                                        <TableRow key={event.id}>
                                            <TableCell>{format(event.event_datetime, 'P', { locale: es })}</TableCell>
                                            <TableCell>{format(event.event_datetime, 'p', { locale: es })}</TableCell>
                                            <TableCell className="font-medium">{event.title}</TableCell>
                                            <TableCell>{subject?.name || '-'}</TableCell>
                                            <TableCell>{institutionDisplay}</TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                     </div>
                 ) : (
                    <div className="space-y-6">
                      {sortedDays.map(dayKey => {
                        const dayEvents = eventsByDay[dayKey];
                        const day = parse(dayKey, 'yyyy-MM-dd', new Date());

                        return (
                            <div key={dayKey}>
                                <h3 className="font-semibold text-lg mb-3 border-b pb-2">{format(day, "EEEE, d 'de' MMMM", { locale: es })}</h3>
                                <div className="space-y-4">
                                    {dayEvents.map(event => {
                                        const subject = subjects.find(s => s.id === event.subject_id);
                                        const isCommemorative = event.event_type === 'COMMEMORATIVE';
                                        const isPersonal = event.event_type === 'PERSONAL_APPOINTMENT' || event.event_type === 'PERSONAL_TASK';
                                        const isHoliday = event.event_type === 'HOLIDAY';
                                        
                                        return (
                                            <Card 
                                                key={event.id} 
                                                className={cn(
                                                    "group transition-all hover:shadow-lg", 
                                                    event.status === 'archived' && 'bg-muted/70',
                                                    isHoliday && 'bg-gradient-to-br from-background to-blue-50 border-blue-200 shadow-md',
                                                    isCommemorative && 'bg-gradient-to-br from-background to-amber-50 border-accent shadow-md',
                                                    isPersonal && 'bg-gradient-to-br from-background to-emerald-50 border-emerald-500 shadow-md'
                                                )}
                                            >
                                                <CardHeader className="flex flex-row items-start justify-between pb-2">
                                                    <div className="space-y-1 flex-1">
                                                        <CardTitle className={cn("text-lg flex items-center gap-2 font-headline", event.status === 'archived' && 'line-through text-muted-foreground')}>
                                                            {isHoliday && <CalendarOff className="h-5 w-5 text-blue-500" />}
                                                            {isCommemorative && <Star className="h-5 w-5 text-amber-500" />}
                                                            {isPersonal && <User className="h-5 w-5 text-emerald-600" />}
                                                            {event.title}
                                                        </CardTitle>
                                                        <CardDescription className={cn("!mt-1", event.status === 'archived' && 'line-through')}>
                                                            {subject?.institution}
                                                        </CardDescription>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <EventTypeBadge type={event.event_type} />
                                                        {event.attendance_status === 'attended' && (
                                                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                                                                <CheckCircle2 className="mr-1 h-3 w-3"/> Asistido
                                                            </Badge>
                                                        )}
                                                        {event.attendance_status === 'missed' && (
                                                            <Badge variant="destructive">
                                                                <XCircle className="mr-1 h-3 w-3"/> Inasistencia
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="flex items-start justify-between gap-4">
                                                    <div className="flex-1 space-y-2">
                                                        {!isCommemorative && !isHoliday && (
                                                            <p className="font-semibold text-sm">
                                                                {format(event.event_datetime, 'p', { locale: es })}
                                                                {event.end_datetime && ` - ${format(event.end_datetime, 'p', { locale: es })}`}
                                                            </p>
                                                        )}
                                                        <p className={cn("text-sm text-foreground/80 whitespace-pre-wrap", event.status === 'archived' && 'line-through')}>{event.description}</p>
                                                        {event.attendance_notes && (
                                                            <div className="mt-2 p-3 text-xs bg-muted/70 rounded-md border border-dashed">
                                                                <p className="font-semibold text-muted-foreground">Notas de seguimiento:</p>
                                                                <p className="italic text-foreground">"{event.attendance_notes}"</p>
                                                            </div>
                                                        )}
                                                         {subject && (
                                                            <div className={cn("mt-2 p-3 rounded-md border bg-muted/30", event.status === 'archived' && 'text-muted-foreground/70 line-through')}>
                                                                <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: subject.color }}>
                                                                    {subject.name}
                                                                </div>
                                                                <div className="text-sm text-muted-foreground">
                                                                {subject.level.startsWith('superior') ? (
                                                                    <p className="flex items-center gap-2"><GraduationCap className="h-4 w-4" /> {subject.career}</p>
                                                                ) : (
                                                                    <div className="flex items-center gap-2"><Users className="h-4 w-4" /> {subject.class_groups.map(cg => cg.name).join(', ')}</div>
                                                                )}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {event.link && (
                                                        <Button variant="ghost" size="icon" asChild>
                                                        <a href={event.link} target="_blank" rel="noopener noreferrer" aria-label="Abrir enlace">
                                                            <Link className="h-4 w-4" />
                                                        </a>
                                                        </Button>
                                                    )}
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon">
                                                            <MoreVertical className="h-4 w-4" />
                                                            <span className="sr-only">Más opciones</span>
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            {event.status === 'archived' ? (
                                                                <DropdownMenuItem onClick={() => unarchiveEvent(event.id)}>
                                                                    <ArchiveRestore className="mr-2 h-4 w-4" />
                                                                    <span>Re-activar evento</span>
                                                                </DropdownMenuItem>
                                                            ) : (
                                                            <>
                                                                <DropdownMenuItem onClick={() => handleEdit(event)}>
                                                                    <Edit className="mr-2 h-4 w-4" />
                                                                    <span>Editar</span>
                                                                </DropdownMenuItem>
                                                                <DropdownMenuSeparator />
                                                                {!isCommemorative && !isHoliday && (subject || event.event_type.startsWith('CLASS')) && (
                                                                    <>
                                                                        {!event.attendance_status ? (
                                                                            <>
                                                                                <DropdownMenuItem onClick={() => handleMarkAttendanceClick(event, 'attended')}>
                                                                                    <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
                                                                                    <span>Marcar como Asistido</span>
                                                                                </DropdownMenuItem>
                                                                                <DropdownMenuItem onClick={() => handleMarkAttendanceClick(event, 'missed')}>
                                                                                    <XCircle className="mr-2 h-4 w-4 text-red-600" />
                                                                                    <span>Marcar como Inasistencia</span>
                                                                                </DropdownMenuItem>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <DropdownMenuItem onClick={() => handleEditAttendanceNoteClick(event)}>
                                                                                    <Edit className="mr-2 h-4 w-4" />
                                                                                    <span>Editar Nota</span>
                                                                                </DropdownMenuItem>
                                                                                <DropdownMenuItem onClick={() => updateEventAttendance(event.id, undefined, '')}>
                                                                                    <CircleSlash className="mr-2 h-4 w-4" />
                                                                                    <span>Quitar marca de asistencia</span>
                                                                                </DropdownMenuItem>
                                                                            </>
                                                                        )}
                                                                        <DropdownMenuSeparator />
                                                                    </>
                                                                )}
                                                                <DropdownMenuItem onClick={() => {
                                                                    archiveEvent(event.id);
                                                                    toast({ title: 'Evento finalizado', description: `"${event.title}" ha sido movido al archivo.` });
                                                                }}>
                                                                    <Archive className="mr-2 h-4 w-4" />
                                                                    <span>Finalizar evento</span>
                                                                </DropdownMenuItem>
                                                            </>
                                                            )}
                                                            <DropdownMenuSeparator />
                                                            <AlertDialog>
                                                                <AlertDialogTrigger asChild>
                                                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                                    <span>Eliminar</span>
                                                                </DropdownMenuItem>
                                                                </AlertDialogTrigger>
                                                                <AlertDialogContent>
                                                                    <AlertDialogHeader>
                                                                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                                                        <AlertDialogDescription>
                                                                            Esta acción no se puede deshacer. Esto eliminará permanentemente el evento "{event.title}".
                                                                        </AlertDialogDescription>
                                                                    </AlertDialogHeader>
                                                                    <AlertDialogFooter>
                                                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                        <AlertDialogAction onClick={() => deleteEvent(event.id)}>Eliminar</AlertDialogAction>
                                                                    </AlertDialogFooter>
                                                                </AlertDialogContent>
                                                            </AlertDialog>
                                                        </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        )
                                    })}
                                </div>
                            </div>
                        )
                      })}
                    </div>
                )}
                </div>
              ) : (
                <div className="flex h-full items-center justify-center rounded-lg border-2 border-dashed bg-muted/50 p-12 print:hidden">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold">{searchTerm || isCustomDateSearch ? 'No se encontraron resultados' : 'No hay eventos programados'}</h3>
                    <p className="text-muted-foreground">
                        {searchTerm || isCustomDateSearch
                            ? 'Intenta con otros términos de búsqueda o ajusta los filtros.'
                            : view === 'day' 
                                ? (showArchived ? "No hay eventos finalizados para esta fecha." : "Añade un nuevo evento o muestra los finalizados.")
                                : "No hay eventos para este período de tiempo."}
                    </p>
                  </div>
                </div>
              )}
               {(view === 'month' || (view === 'bi-week' && isCustomDateSearch)) && (
                    <CalendarAttendanceSummary events={visibleEvents} />
                )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

    