
'use client';

import * as React from 'react';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleSlash,
  Edit,
  LayoutGrid,
  List,
  MoreVertical,
  XCircle,
} from 'lucide-react';
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isWithinInterval,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { es } from 'date-fns/locale/es';

import { useApp } from '@/contexts/app-context';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import type {
  EducationLevel,
  Event,
  ScheduleEntry,
  Subject,
  AttendanceRecord,
  ClassGroup,
} from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

// #region Types and Constants
const levelTranslations: Record<EducationLevel, string> = {
  secundario: 'Secundario',
  superior_no_universitario: 'Superior (No Uni)',
  superior_universitario: 'Superior (Uni)',
};

interface AttendableInstance {
  id: string; // A unique identifier for THIS specific class instance
  date: Date;
  subject: Subject;
  group: ClassGroup;
  schedule: ScheduleEntry;
  type: 'class' | 'event';
  event?: Event;
  attendance?: {
    status: 'present' | 'absent';
    notes?: string;
  };
}
// #endregion

// #region Components
function AttendanceDialog({
  isOpen,
  onOpenChange,
  instance,
  onConfirm,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  instance: AttendableInstance | null;
  onConfirm: (
    instance: AttendableInstance,
    status: 'present' | 'absent',
    notes: string,
    justification?: 'justificada' | 'injustificada'
  ) => void;
}) {
  const [notes, setNotes] = React.useState('');
  const [status, setStatus] = React.useState<'present' | 'absent'>('present');

  React.useEffect(() => {
    if (isOpen && instance) {
      setNotes(instance.attendance?.notes || '');
      setStatus(instance.attendance?.status || 'present');
    }
  }, [isOpen, instance]);

  if (!instance) return null;

  const handleConfirm = () => {
    onConfirm(instance, status, notes, status === 'absent' ? 'justificada' : undefined);
    onOpenChange(false);
  };
  
  const groupDescription = instance.subject.level.startsWith('superior') && instance.subject.career
    ? `${instance.subject.career} - ${instance.subject.institution}`
    : `${instance.subject.institution} - ${instance.group.name}`;


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Asistencia</DialogTitle>
          <DialogDescription>
            {instance.subject.name} - {groupDescription} del{' '}
            {format(instance.date, 'PPP', { locale: es })}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-6">
          <RadioGroup value={status} onValueChange={(v) => setStatus(v as any)}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="present" id="s-present" />
              <Label htmlFor="s-present">Presente</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="absent" id="s-absent" />
              <Label htmlFor="s-absent">Ausente (Justificada)</Label>
            </div>
          </RadioGroup>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={
              status === 'present'
                ? 'Notas sobre la clase (opcional)...'
                : 'Motivo de la ausencia...'
            }
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm}>Confirmar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AttendanceCardView({ days, onEdit }: { days: { date: Date; classes: AttendableInstance[] }[], onEdit: (instance: AttendableInstance) => void }) {
  if (days.length === 0) {
    return (
      <div className="flex h-[calc(100vh-300px)] items-center justify-center rounded-lg border-2 border-dashed bg-muted/50">
        <p>No hay clases o eventos para registrar en este período.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
      {days.map(({ date, classes }) => (
        <div key={date.toISOString()} className="space-y-4">
          <h3 className="font-semibold text-lg text-center capitalize">{format(date, "EEEE d 'de' MMMM", { locale: es })}</h3>
          {classes.map(instance => {
            const groupDescription = instance.subject.level.startsWith('superior') && instance.subject.career
              ? `${instance.subject.career} - ${instance.subject.institution}`
              : `${instance.subject.institution} - ${instance.group.name}`;

            return (
              <Card key={instance.id} className="group flex flex-col">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg" style={{ color: instance.subject.color }}>{instance.subject.name}</CardTitle>
                      <CardDescription>{groupDescription}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm">{instance.schedule.startTime} - {instance.schedule.endTime}</p>
                    
                    {instance.attendance ? (
                      <Badge variant={instance.attendance.status === 'present' ? 'secondary' : 'destructive'} className="bg-opacity-20 mt-2">
                        {instance.attendance.status === 'present' ? <CheckCircle2 className="mr-2 h-4 w-4" /> : <XCircle className="mr-2 h-4 w-4" />}
                        {instance.attendance.status === 'present' ? 'Presente' : 'Ausente'}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="mt-2"><CircleSlash className="mr-2 h-4 w-4" />Sin Registrar</Badge>
                    )}

                    {instance.attendance?.notes && (
                      <div className="text-xs text-muted-foreground italic pt-2 border-t mt-2">
                        <p className="font-semibold not-italic mb-1">{instance.attendance.status === 'present' ? 'Notas:' : 'Motivo:'}</p>
                        <p>"{instance.attendance.notes}"</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-end mt-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => onEdit(instance)}>
                          <Edit className="mr-2 h-4 w-4" />Registrar/Editar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function AttendanceTableView({ days, onEdit, view }: { days: { date: Date; classes: AttendableInstance[] }[], onEdit: (instance: AttendableInstance) => void, view: 'day' | 'week' | 'month' }) {
    if (days.length === 0) {
    return (
      <div className="flex h-[calc(100vh-300px)] items-center justify-center rounded-lg border-2 border-dashed bg-muted/50">
        <p>No hay clases o eventos para registrar en este período.</p>
      </div>
    );
  }
  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            {view !== 'day' && <TableHead>Fecha</TableHead>}
            <TableHead>Horario</TableHead>
            <TableHead>Asignatura</TableHead>
            <TableHead>Grupo</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {days.flatMap(({ date, classes }) => 
            classes.map((instance) => {
              const groupDescription = instance.subject.level.startsWith('superior') && instance.subject.career
                ? `${instance.subject.career} - ${instance.subject.institution}`
                : `${instance.subject.institution} - ${instance.group.name}`;

              return (
                <TableRow key={instance.id}>
                  {view !== 'day' && <TableCell className="font-medium capitalize">{format(date, "EEEE d", { locale: es })}</TableCell>}
                  <TableCell>{instance.schedule.startTime} - {instance.schedule.endTime}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: instance.subject.color }} />
                      {instance.subject.name}
                    </div>
                  </TableCell>
                  <TableCell>{groupDescription}</TableCell>
                  <TableCell>
                    {instance.attendance ? (
                      <Badge variant={instance.attendance.status === 'present' ? 'secondary' : 'destructive'} className="bg-opacity-20">
                        {instance.attendance.status === 'present' ? <CheckCircle2 className="mr-2 h-4 w-4" /> : <XCircle className="mr-2 h-4 w-4" />}
                        {instance.attendance.status === 'present' ? 'Presente' : 'Ausente'}
                      </Badge>
                    ) : (
                      <Badge variant="outline"><CircleSlash className="mr-2 h-4 w-4" />Sin Registrar</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => onEdit(instance)}>Registrar</Button>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </Card>
  );
}
// #endregion

export default function AttendanceControlPage() {
  // #region State and Hooks
  const { subjects, events, attendanceRecords, addAttendanceRecord, updateAttendanceRecord, academicPeriods } = useApp();
  const { toast } = useToast();
  const [view, setView] = React.useState<'day' | 'week' | 'month'>('day');
  const [displayMode, setDisplayMode] = React.useState<'card' | 'list'>('card');
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [levelFilter, setLevelFilter] = React.useState<EducationLevel | 'all'>('all');
  const [hasMounted, setHasMounted] = React.useState(false);

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [selectedInstance, setSelectedInstance] = React.useState<AttendableInstance | null>(null);

  React.useEffect(() => { setHasMounted(true); }, []);
  // #endregion

  // #region Data Memoization
  const parsedAcademicPeriods = React.useMemo(() => {
    if (!academicPeriods) return [];
    return academicPeriods.map(p => ({ ...p, startDate: new Date(p.startDate), endDate: new Date(p.endDate) }));
  }, [academicPeriods]);

  const { range, title } = React.useMemo(() => {
    let start, end, title;
    switch (view) {
      case 'week':
        start = startOfWeek(currentDate, { weekStartsOn: 1 });
        end = endOfWeek(currentDate, { weekStartsOn: 1 });
        title = `Semana del ${format(start, 'd MMM')} al ${format(end, 'd MMM, yyyy')}`;
        break;
      case 'month':
        start = startOfMonth(currentDate);
        end = endOfMonth(currentDate);
        title = format(currentDate, 'MMMM yyyy', { locale: es });
        break;
      case 'day':
      default:
        start = currentDate;
        end = currentDate;
        title = format(currentDate, 'PPP', { locale: es });
    }
    return { range: { start, end }, title };
  }, [currentDate, view]);

  const attendableInstancesByDay = React.useMemo(() => {
    if (!hasMounted) return [];
    
    const instances: { [key: string]: AttendableInstance[] } = {};
    const daysInRange = eachDayOfInterval(range);

    const relevantSubjects = subjects.filter(s => 
      s.status === 'active' && 
      (levelFilter === 'all' || s.level === levelFilter)
    );

    daysInRange.forEach(day => {
      const dayKey = format(day, 'yyyy-MM-dd');
      instances[dayKey] = [];

      const isTeachingDay = (subject: Subject): boolean => {
        const subjectPeriod = parsedAcademicPeriods.find(p => p.id === subject.academicPeriodId);
        if (!subjectPeriod || subjectPeriod.type !== 'class_period' || !isWithinInterval(day, { start: subjectPeriod.startDate, end: subjectPeriod.endDate })) {
          return false;
        }

        const isSuspended = parsedAcademicPeriods.some(p => {
          const isSuspendingType = p.type === 'vacation' || p.type === 'exam_period_annual';
          if (!isSuspendingType) return false;
          const appliesToLevel = !p.level || p.level === 'all' || p.level === subject.level;
          if (!appliesToLevel) return false;
          return isWithinInterval(day, { start: p.startDate, end: p.endDate });
        });
        
        const isHoliday = events.some(e => e.event_type === 'HOLIDAY' && isSameDay(e.event_datetime, day));
        
        return !isSuspended && !isHoliday;
      };

      // 1. Regular scheduled classes
      relevantSubjects.forEach(subject => {
        if (!isTeachingDay(subject)) return;

        subject.class_groups?.forEach(group => {
          group.schedule?.forEach(schedule => {
            if (day.getDay() === Number(schedule.day)) {
              const instanceId = `${format(day, 'yyyy-MM-dd')}-${subject.id}-${group.id}-${schedule.startTime}`;
              const record = attendanceRecords.find(r => r.id === instanceId);
              
              instances[dayKey].push({
                id: instanceId,
                date: day,
                subject,
                group,
                schedule,
                type: 'class',
                attendance: record ? { status: record.status, notes: record.notes } : undefined
              });
            }
          });
        });
      });

      // 2. Other academic events (exams, meetings, etc.)
      events.filter(e => 
        isSameDay(e.event_datetime, day) && 
        e.subject_id && 
        (e.event_type.startsWith('EXAM_') || ['MEETING', 'TRAINING', 'ACTO_ESCOLAR', 'CLASS', 'JORNADA'].includes(e.event_type))
      ).forEach(event => {
        const subject = subjects.find(s => s.id === event.subject_id);
        if (!subject || (levelFilter !== 'all' && subject.level !== levelFilter)) return;
        
        const group: ClassGroup = { id: event.id, name: event.event_type, schedule: [] };
        const schedule: ScheduleEntry = {
          day: day.getDay(),
          startTime: format(event.event_datetime, 'HH:mm'),
          endTime: event.end_datetime ? format(event.end_datetime, 'HH:mm') : format(addDays(event.event_datetime, 1), 'HH:mm'),
        };

        const record = attendanceRecords.find(r => r.id === event.id);

        if (!instances[dayKey].some(i => i.schedule.startTime === schedule.startTime)) {
            instances[dayKey].push({
                id: event.id,
                date: day,
                subject,
                group,
                schedule,
                type: 'event',
                event,
                attendance: record ? { status: record.status, notes: record.notes } : undefined,
            });
        }
      });
      
      instances[dayKey].sort((a, b) => a.schedule.startTime.localeCompare(b.schedule.startTime));
    });

    return Object.entries(instances)
      .map(([date, classes]) => ({ date: new Date(date.replace(/-/g, '/')), classes }))
      .filter(day => day.classes.length > 0)
      .sort((a,b) => a.date.getTime() - b.date.getTime());

  }, [range, subjects, events, attendanceRecords, levelFilter, hasMounted, parsedAcademicPeriods]);
  // #endregion

  // #region Handlers
  const handleEdit = (instance: AttendableInstance) => {
    setSelectedInstance(instance);
    setDialogOpen(true);
  };
  
  const handleConfirmAttendance = (
    instance: AttendableInstance,
    status: 'present' | 'absent',
    notes: string,
    justification?: 'justificada' | 'injustificada'
  ) => {
    const recordId = instance.id;
    
    const record: AttendanceRecord = {
        id: recordId,
        date: instance.date,
        subject_id: instance.subject.id,
        class_group_id: instance.type === 'event' ? '00000000-0000-0000-0000-000000000000' : instance.group.id,
        start_time: instance.schedule.startTime,
        end_time: instance.schedule.endTime,
        status,
        notes,
        justification,
    };
    
    const existingRecord = attendanceRecords.find(r => r.id === recordId);
    
    if (existingRecord) {
        updateAttendanceRecord({ ...record, id: existingRecord.id });
    } else {
        addAttendanceRecord(record);
    }
    toast({ title: "Asistencia registrada", description: `Se guardó el estado para ${instance.subject.name}.` });
  };
  
  const navigateDate = (direction: 'prev' | 'next') => {
    const amount = direction === 'prev' ? -1 : 1;
    if (view === 'day') setCurrentDate(addDays(currentDate, amount));
    if (view === 'week') setCurrentDate(addDays(currentDate, amount * 7));
    if (view === 'month') setCurrentDate(addMonths(currentDate, amount));
  };
  // #endregion

  return (
    <div className="flex h-full flex-col">
      <AttendanceDialog
        isOpen={dialogOpen}
        onOpenChange={setDialogOpen}
        instance={selectedInstance}
        onConfirm={handleConfirmAttendance}
      />
      <PageHeader title="Control de Asistencia">
        <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => navigateDate('prev')}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="font-semibold text-center w-64">{title}</span>
            <Button variant="outline" size="icon" onClick={() => navigateDate('next')}><ChevronRight className="h-4 w-4" /></Button>
        </div>
         <Tabs value={view} onValueChange={(v) => setView(v as any)}>
          <TabsList>
            <TabsTrigger value="day">Día</TabsTrigger>
            <TabsTrigger value="week">Semana</TabsTrigger>
            <TabsTrigger value="month">Mes</TabsTrigger>
          </TabsList>
        </Tabs>
         <Select value={levelFilter} onValueChange={(v) => setLevelFilter(v as any)}>
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="Filtrar por nivel..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los niveles</SelectItem>
            <SelectItem value="secundario">Nivel Secundario</SelectItem>
            <SelectItem value="superior_no_universitario">Superior (No Universitario)</SelectItem>
            <SelectItem value="superior_universitario">Superior (Universitario)</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1 rounded-md bg-muted p-1">
          <Button onClick={() => setDisplayMode('card')} variant={displayMode === 'card' ? 'secondary' : 'ghost'} size="sm"><LayoutGrid className="mr-2 h-4 w-4"/>Fichas</Button>
          <Button onClick={() => setDisplayMode('list')} variant={displayMode === 'list' ? 'secondary' : 'ghost'} size="sm"><List className="mr-2 h-4 w-4"/>Lista</Button>
        </div>
      </PageHeader>
      <main className="flex-1 overflow-y-auto p-8">
        {!hasMounted ? (
          <div className="flex h-full items-center justify-center">
            <Skeleton className="h-64 w-full" />
          </div>
        ) : displayMode === 'card' ? (
          <AttendanceCardView days={attendableInstancesByDay} onEdit={handleEdit} />
        ) : (
          <AttendanceTableView days={attendableInstancesByDay} onEdit={handleEdit} view={view} />
        )}
      </main>
    </div>
  );
}
