

'use client';

import * as React from 'react';
import { useApp } from '@/contexts/app-context';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { generateWeeklySummary } from '@/ai/flows/generate-weekly-summary-flow';
import { generateDailySummary } from '@/ai/flows/generate-daily-summary-flow';
import type { EventType as EventTypeEnum, Subject, CronogramaEntry } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { addDays, endOfMonth, endOfWeek, startOfMonth, startOfWeek, format, getWeek, eachDayOfInterval, isWithinInterval, isSameDay, getDay } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { Loader2, Mail, CheckCircle, Clock, BarChart2, Calendar as CalendarIcon, Percent, XCircle, Send } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { ChartContainer, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { sendTelegramMessage } from '@/services/telegram-service';

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
    TRIMESTER_FIRST_START: 'Inicio Primer Trimestre',
    TRIMESTER_FIRST_END: 'Fin Primer Trimestre',
    TRIMESTER_SECOND_START: 'Inicio Segundo Trimestre',
    TRIMESTER_SECOND_END: 'Fin Segundo Trimestre',
    TRIMESTER_THIRD_START: 'Inicio Tercer Trimestre',
    TRIMESTER_THIRD_END: 'Fin Tercer Trimestre',
    ACTO_ESCOLAR: 'Acto Escolar',
    ENTREGA_NOTAS: 'Entrega de Notas',
    TUTORIA: 'Tutoría',
    CONFERENCIA: 'Conferencia',
    COMMEMORATIVE: 'Fecha Conmemorativa',
    PERSONAL_APPOINTMENT: 'Turno Personal',
    PERSONAL_TASK: 'Tarea Personal',
};

interface SubjectReport {
  subjectId: string;
  subjectName: string;
  subjectColor: string;
  totalClasses: number;
  attended: number;
  absent: {
    total: number;
    justified: number;
    unjustified: number;
  };
  unrecorded: number;
  attendanceRate: number;
}

interface AttendanceReportData {
  range: { start: Date; end: Date };
  totalClasses: number;
  totalAttended: number;
  totalAbsent: {
    total: number;
    justified: number;
    unjustified: number;
  };
  totalUnrecorded: number;
  overallAttendanceRate: number;
  bySubject: SubjectReport[];
  absencesByDay: { day: string; count: number }[];
  absencesBySubject: { name: string; value: number; fill: string }[];
}

interface ProgramReportData {
    subject: Subject;
    range: { start: Date; end: Date };
    plannedTopics: number;
    taughtTopics: number;
    completionRate: number;
    pendingTopics: CronogramaEntry[];
    taughtTopicEntries: CronogramaEntry[];
}

function ReportResults({ data }: { data: AttendanceReportData }) {
    const chartConfig = {
        asistencia: { label: 'Asistencia', color: 'hsl(var(--primary))' },
        ausencias: { label: 'Ausencias', color: 'hsl(var(--destructive))' },
    };
    
    const daysOfWeek = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

    const absencesByDayChartData = daysOfWeek.slice(1).map((day, index) => {
        const dayData = data.absencesByDay.find(d => d.day === day);
        return { day, ausencias: dayData ? dayData.count : 0 };
    });

    return (
        <div className="space-y-8 pt-6">
            <div className="text-center">
                <h3 className="text-xl font-bold">Resultados del Informe de Asistencia</h3>
                <p className="text-muted-foreground">
                    Período: {format(data.range.start, 'P', { locale: es })} - {format(data.range.end, 'P', { locale: es })}
                </p>
            </div>

             <Tabs defaultValue="summary">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="summary">Resumen General</TabsTrigger>
                    <TabsTrigger value="bySubject">Detalle por Asignatura</TabsTrigger>
                    <TabsTrigger value="absenceAnalysis">Análisis de Ausencias</TabsTrigger>
                </TabsList>
                <TabsContent value="summary" className="space-y-4 pt-4">
                     <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Clases</CardTitle>
                                <Clock className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{data.totalClasses}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Asistencia General</CardTitle>
                                <Percent className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{data.overallAttendanceRate.toFixed(1)}%</div>
                                <p className="text-xs text-muted-foreground">{data.totalAttended} de {data.totalClasses - data.totalAbsent.justified} clases posibles</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Presente</CardTitle>
                                <CheckCircle className="h-4 w-4 text-green-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{data.totalAttended}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Ausente</CardTitle>
                                <XCircle className="h-4 w-4 text-red-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{data.totalAbsent.total}</div>
                                <p className="text-xs text-muted-foreground">
                                    {data.totalAbsent.justified} justif. / {data.totalAbsent.unjustified} injustif.
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
                <TabsContent value="bySubject" className="pt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Tasa de Asistencia por Asignatura (%)</CardTitle>
                            <CardDescription>Comparación del porcentaje de asistencia (clases dadas / clases posibles).</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ChartContainer config={chartConfig} className="h-[250px] w-full">
                                <ResponsiveContainer>
                                    <BarChart data={data.bySubject}>
                                        <CartesianGrid vertical={false} />
                                        <XAxis dataKey="subjectName" tickLine={false} tickMargin={10} axisLine={false} tickFormatter={(value) => value.slice(0, 10)} />
                                        <YAxis unit="%" />
                                        <Tooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                                        <Bar dataKey="attendanceRate" fill="var(--color-asistencia)" radius={4} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </ChartContainer>
                        </CardContent>
                    </Card>

                    <Card className="mt-4">
                        <CardHeader>
                            <CardTitle>Detalle por Asignatura</CardTitle>
                        </CardHeader>
                        <CardContent className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Asignatura</TableHead>
                                        <TableHead className="text-center">Total Clases</TableHead>
                                        <TableHead className="text-center">Presente</TableHead>
                                        <TableHead className="text-center">Ausente (J/I)</TableHead>
                                        <TableHead className="text-center">Sin Registrar</TableHead>
                                        <TableHead className="text-right">% Asistencia</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.bySubject.map(s => (
                                        <TableRow key={s.subjectId}>
                                            <TableCell className="font-medium">{s.subjectName}</TableCell>
                                            <TableCell className="text-center">{s.totalClasses}</TableCell>
                                            <TableCell className="text-center text-green-600 font-semibold">{s.attended}</TableCell>
                                            <TableCell className="text-center text-red-600 font-semibold">
                                                {s.absent.total} ({s.absent.justified}/{s.absent.unjustified})
                                            </TableCell>
                                            <TableCell className="text-center">{s.unrecorded}</TableCell>
                                            <TableCell className="text-right font-bold">{s.attendanceRate.toFixed(1)}%</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="absenceAnalysis" className="pt-4 grid md:grid-cols-2 gap-4">
                     <Card>
                        <CardHeader>
                            <CardTitle>Ausencias por Día de la Semana</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <ChartContainer config={chartConfig} className="h-[250px] w-full">
                                <BarChart data={absencesByDayChartData}>
                                    <CartesianGrid vertical={false} />
                                    <XAxis dataKey="day" tickLine={false} tickMargin={10} axisLine={false} />
                                    <YAxis allowDecimals={false} />
                                    <Tooltip cursor={false} content={<ChartTooltipContent />} />
                                    <Bar dataKey="ausencias" fill="var(--color-ausencias)" radius={4} />
                                </BarChart>
                            </ChartContainer>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Distribución de Ausencias por Asignatura</CardTitle>
                        </CardHeader>
                        <CardContent className="flex justify-center">
                            <ChartContainer config={chartConfig} className="h-[250px] w-full">
                                <ResponsiveContainer>
                                    <PieChart>
                                        <Tooltip content={<ChartTooltipContent hideLabel />} />
                                        <Pie data={data.absencesBySubject} dataKey="value" nameKey="name" >
                                           {data.absencesBySubject.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.fill} />
                                            ))}
                                        </Pie>
                                        <ChartLegend content={<ChartLegendContent />} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </ChartContainer>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}


function AttendanceReportGenerator() {
  const { subjects, attendanceRecords, academicPeriods, events } = useApp();
  const { toast } = useToast();
  const [reportType, setReportType] = React.useState('week');
  const [date, setDate] = React.useState<Date | undefined>(new Date());
  const [range, setRange] = React.useState<DateRange | undefined>();
  const [isLoading, setIsLoading] = React.useState(false);
  const [reportData, setReportData] = React.useState<AttendanceReportData | null>(null);

  const handleGenerateReport = () => {
    setIsLoading(true);
    setReportData(null);

    let start: Date | undefined;
    let end: Date | undefined;
    const today = new Date();

    switch (reportType) {
      case 'week':
        start = startOfWeek(date || today, { weekStartsOn: 1 });
        end = endOfWeek(date || today, { weekStartsOn: 1 });
        break;
      case 'month':
        start = startOfMonth(date || today);
        end = endOfMonth(date || today);
        break;
      case 'custom':
        start = range?.from;
        end = range?.to;
        break;
    }

    if (!start || !end) {
      toast({ variant: 'destructive', title: 'Fechas inválidas', description: 'Por favor, selecciona un rango de fechas válido.' });
      setIsLoading(false);
      return;
    }
    
    const finalStartDate = start;
    const finalEndDate = end;
    
    setTimeout(() => {
        const scheduledClassesMap = new Map<string, { subjectId: string, subjectName: string, subjectColor: string }>();
        const daysInInterval = eachDayOfInterval({ start: finalStartDate, end: finalEndDate });
        
        daysInInterval.forEach(day => {
            const dayOfWeek = day.getDay();
            subjects.forEach(subject => {
                if (subject.status === 'active' && subject.class_groups) {
                    
                    const subjectPeriod = academicPeriods.find(p => p.id === subject.academicPeriodId);
                    if (!subjectPeriod || subjectPeriod.type !== 'class_period') return;

                    const isTeachingDay = isWithinInterval(day, { start: subjectPeriod.startDate, end: subjectPeriod.endDate });
                    if (!isTeachingDay) return;

                    const isSuspended = academicPeriods.some(p => {
                        const isSuspendingType = p.type === 'vacation' || p.type === 'exam_period' || p.type === 'exam_period_annual';
                        if (!isSuspendingType) return false;
                        
                        const appliesToLevel = !p.level || p.level === 'all' || p.level === subject.level;
                        if (!appliesToLevel) return false;

                        return isWithinInterval(day, { start: p.startDate, end: p.endDate });
                    });
                    
                    const isHoliday = events.some(e => e.event_type === 'HOLIDAY' && isSameDay(e.event_datetime, day));

                    if (isSuspended || isHoliday) {
                        return;
                    }
                    
                    subject.class_groups.forEach(group => {
                        group.schedule.forEach(schedule => {
                            if (Number(schedule.day) === dayOfWeek) {
                                const classId = `${format(day, 'yyyy-MM-dd')}-${subject.id}-${group.id}-${schedule.startTime}`;
                                scheduledClassesMap.set(classId, { subjectId: subject.id, subjectName: subject.name, subjectColor: subject.color });
                            }
                        });
                    });
                }
            });
        });

        const recordsInPeriod = attendanceRecords.filter(r => isWithinInterval(r.date, { start: finalStartDate, end: finalEndDate }));
        const subjectReports = new Map<string, SubjectReport>();

        subjects.forEach(s => {
            subjectReports.set(s.id, {
                subjectId: s.id,
                subjectName: s.name,
                subjectColor: s.color,
                totalClasses: 0,
                attended: 0,
                absent: { total: 0, justified: 0, unjustified: 0 },
                unrecorded: 0,
                attendanceRate: 0
            });
        });
        
        scheduledClassesMap.forEach((val, key) => {
            const report = subjectReports.get(val.subjectId);
            if(report) {
                report.totalClasses++;
            }
        });

        recordsInPeriod.forEach(record => {
            const report = subjectReports.get(record.subject_id);
            if (report) {
                if (record.status === 'present') {
                    report.attended++;
                } else if (record.status === 'absent') {
                    report.absent.total++;
                    if (record.justification === 'justificada') {
                        report.absent.justified++;
                    } else {
                        report.absent.unjustified++;
                    }
                }
            }
        });

        let totalClasses = 0, totalAttended = 0, totalJustified = 0, totalUnjustified = 0;
        const finalSubjectReports: SubjectReport[] = [];
        
        const absencesByDay = Array(7).fill(0);
        const absencesBySubjectMap = new Map<string, { count: number; color: string }>();

        recordsInPeriod.filter(r => r.status === 'absent').forEach(record => {
            const dayOfWeek = getDay(record.date);
            absencesByDay[dayOfWeek]++;
            const subject = subjects.find(s => s.id === record.subject_id);
            if(subject) {
                const current = absencesBySubjectMap.get(subject.name) || { count: 0, color: subject.color };
                current.count++;
                absencesBySubjectMap.set(subject.name, current);
            }
        });
        
        const daysOfWeek = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

        subjectReports.forEach(report => {
            if (report.totalClasses > 0) {
                report.unrecorded = report.totalClasses - report.attended - report.absent.total;
                const possibleAttendance = report.totalClasses - report.absent.justified;
                report.attendanceRate = possibleAttendance > 0 ? (report.attended / possibleAttendance) * 100 : 0;
                
                totalClasses += report.totalClasses;
                totalAttended += report.attended;
                totalJustified += report.absent.justified;
                totalUnjustified += report.absent.unjustified;

                finalSubjectReports.push(report);
            }
        });

        const totalAbsences = totalJustified + totalUnjustified;
        const totalUnrecorded = totalClasses - totalAttended - totalAbsences;
        const totalPossibleAttendance = totalClasses - totalJustified;
        const overallAttendanceRate = totalPossibleAttendance > 0 ? (totalAttended / totalPossibleAttendance) * 100 : 0;
        
        setReportData({
            range: { start: finalStartDate, end: finalEndDate },
            totalClasses,
            totalAttended,
            totalAbsent: { total: totalAbsences, justified: totalJustified, unjustified: totalUnjustified },
            totalUnrecorded,
            overallAttendanceRate,
            bySubject: finalSubjectReports.sort((a,b) => b.totalClasses - a.totalClasses),
            absencesByDay: daysOfWeek.map((day, index) => ({ day, count: absencesByDay[index] })),
            absencesBySubject: Array.from(absencesBySubjectMap.entries()).map(([name, data]) => ({ name, value: data.count, fill: data.color })),
        });

        setIsLoading(false);
    }, 100);
  };
  
  const formattedDate = React.useMemo(() => {
    if (reportType === 'week') {
      const start = startOfWeek(date || new Date(), { weekStartsOn: 1 });
      const end = endOfWeek(date || new Date(), { weekStartsOn: 1 });
      return `Semana del ${format(start, 'd MMM')} al ${format(end, 'd MMM, yyyy', { locale: es })}`;
    }
    if (reportType === 'month') {
      return format(date || new Date(), 'MMMM yyyy', { locale: es });
    }
    if (reportType === 'custom' && range?.from && range?.to) {
      return `${format(range.from, 'PPP', { locale: es })} - ${format(range.to, 'PPP', { locale: es })}`;
    }
    if (reportType === 'custom' && range?.from) {
      return format(range.from, 'PPP', { locale: es });
    }
    return 'Selecciona un período';
  }, [reportType, date, range]);


  return (
    <Card>
        <CardHeader>
            <CardTitle>Informe de Asistencia</CardTitle>
            <CardDescription>
                Genera un informe detallado de asistencias y ausencias para un período específico. El cálculo excluye los días marcados como vacaciones, feriados o de examen.
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <Tabs value={reportType} onValueChange={(value) => { setReportData(null); setReportType(value); }} className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="week">Semana</TabsTrigger>
                    <TabsTrigger value="month">Mes</TabsTrigger>
                    <TabsTrigger value="custom">Personalizado</TabsTrigger>
                </TabsList>
            </Tabs>

            <div className="flex flex-col sm:flex-row items-center gap-4">
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant={'outline'}
                            className={cn('w-full sm:w-[320px] justify-start text-left font-normal', !date && 'text-muted-foreground')}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            <span>{formattedDate}</span>
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        {reportType === 'custom' ? (
                            <Calendar
                                mode="range"
                                selected={range}
                                onSelect={setRange}
                                initialFocus
                                numberOfMonths={2}
                                locale={es}
                            />
                        ) : (
                             <Calendar
                                mode="single"
                                selected={date}
                                onSelect={setDate}
                                initialFocus
                                locale={es}
                            />
                        )}
                    </PopoverContent>
                </Popover>
                 <Button onClick={handleGenerateReport} disabled={isLoading}>
                    {isLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <BarChart2 className="mr-2 h-4 w-4" />
                    )}
                    {isLoading ? 'Generando...' : 'Generar Informe'}
                </Button>
            </div>
            
            {isLoading && (
                <div className="space-y-4 pt-4">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-64 w-full" />
                    <Skeleton className="h-48 w-full" />
                </div>
            )}

            {reportData && <ReportResults data={reportData} />}
        </CardContent>
    </Card>
  );
}

function ProgramReportGenerator() {
    const { subjects, cronogramaData, academicPeriods } = useApp();
    const [selectedSubject, setSelectedSubject] = React.useState<Subject | null>(null);
    const [selectedPeriodId, setSelectedPeriodId] = React.useState<string | null>(null);
    const [reportData, setReportData] = React.useState<ProgramReportData | null>(null);
    const { toast } = useToast();

    const handleGenerate = () => {
        if (!selectedSubject || !selectedPeriodId) {
            toast({ variant: 'destructive', title: 'Faltan datos', description: 'Selecciona una asignatura y un período.' });
            return;
        }
        
        const period = academicPeriods.find(p => p.id === selectedPeriodId);
        if (!period) return;
        
        const entriesInPeriod = cronogramaData.filter(entry => 
            entry.subjectId === selectedSubject.id &&
            isWithinInterval(new Date(entry.date), { start: period.startDate, end: period.endDate })
        );
        
        const plannedTopics = entriesInPeriod.filter(e => e.topic);
        const taughtTopics = plannedTopics.filter(e => e.status === 'taught');
        const pendingTopics = plannedTopics.filter(e => e.status !== 'taught');

        setReportData({
            subject: selectedSubject,
            range: { start: period.startDate, end: period.endDate },
            plannedTopics: plannedTopics.length,
            taughtTopics: taughtTopics.length,
            completionRate: plannedTopics.length > 0 ? (taughtTopics.length / plannedTopics.length) * 100 : 0,
            pendingTopics: pendingTopics,
            taughtTopicEntries: taughtTopics,
        });
    };
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Informe de Cumplimiento del Programa</CardTitle>
                <CardDescription>
                    Compara los temas planificados en el cronograma con los que fueron marcados como "dados".
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid md:grid-cols-3 gap-4">
                    <Select onValueChange={(id) => setSelectedSubject(subjects.find(s=>s.id === id) || null)}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar Asignatura..." /></SelectTrigger>
                        <SelectContent>
                            {subjects.filter(s => s.status === 'active').map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select onValueChange={setSelectedPeriodId} disabled={!selectedSubject}>
                         <SelectTrigger><SelectValue placeholder="Seleccionar Período..." /></SelectTrigger>
                         <SelectContent>
                            {academicPeriods.filter(p => p.type === 'class_period' && (!p.level || p.level === 'all' || p.level === selectedSubject?.level)).map(p => (
                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                         </SelectContent>
                    </Select>
                     <Button onClick={handleGenerate} disabled={!selectedSubject || !selectedPeriodId}>
                        <BarChart2 className="mr-2 h-4 w-4" /> Generar Informe
                    </Button>
                </div>
                {reportData && (
                    <div className="pt-6 space-y-4">
                        <Card>
                            <CardHeader className="text-center">
                                <CardTitle>Cumplimiento de "{reportData.subject.name}"</CardTitle>
                                <CardDescription>{reportData.range.start.toLocaleDateString()} - {reportData.range.end.toLocaleDateString()}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-3 gap-4 text-center">
                                    <div className="p-3 bg-muted rounded-md"><dt className="text-sm font-medium text-muted-foreground">Temas Planificados</dt><dd className="text-2xl font-bold">{reportData.plannedTopics}</dd></div>
                                    <div className="p-3 bg-muted rounded-md"><dt className="text-sm font-medium text-muted-foreground">Temas Dados</dt><dd className="text-2xl font-bold">{reportData.taughtTopics}</dd></div>
                                    <div className="p-3 bg-muted rounded-md"><dt className="text-sm font-medium text-muted-foreground">% Avance</dt><dd className="text-2xl font-bold text-primary">{reportData.completionRate.toFixed(1)}%</dd></div>
                                </div>
                                <ChartContainer config={{}} className="h-20 w-full">
                                    <BarChart layout="vertical" data={[{ name: 'Avance', ...reportData }]} stackOffset="expand">
                                        <XAxis type="number" hide />
                                        <YAxis type="category" dataKey="name" hide />
                                        <Bar dataKey="taughtTopics" fill="hsl(var(--primary))" stackId="a" radius={[5, 5, 5, 5]} />
                                        <Bar dataKey="pendingTopics" fill="hsl(var(--muted))" stackId="a" radius={[5, 5, 5, 5]} />
                                    </BarChart>
                                </ChartContainer>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div>
                                        <h4 className="font-semibold mb-2">Temas Pendientes ({reportData.pendingTopics.length})</h4>
                                        <div className="h-48 overflow-y-auto rounded-md border p-2 text-sm">
                                            {reportData.pendingTopics.length > 0 ? reportData.pendingTopics.map(e => <p key={e.date} className="truncate"><b>{format(new Date(e.date), 'dd/MM')}:</b> {e.topic}</p>) : <p className="text-muted-foreground">¡Ninguno!</p>}
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold mb-2">Temas Dados ({reportData.taughtTopics.length})</h4>
                                        <div className="h-48 overflow-y-auto rounded-md border p-2 text-sm">
                                             {reportData.taughtTopicEntries.length > 0 ? reportData.taughtTopicEntries.map(e => <p key={e.date} className="truncate"><b>{format(new Date(e.date), 'dd/MM')}:</b> {e.topic}</p>) : <p className="text-muted-foreground">Ninguno</p>}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default function ReportsPage() {
    const { events, subjects, lastSummarySentForWeek, userProfile, addSentEmail } = useApp();
    const { toast } = useToast();
    const [isWeeklyLoading, setIsWeeklyLoading] = React.useState(false);
    const [isDailyLoading, setIsDailyLoading] = React.useState(false);
    const [hasMounted, setHasMounted] = React.useState(false);

    React.useEffect(() => {
        setHasMounted(true);
    }, []);

    const currentWeekIdentifier = hasMounted ? `${new Date().getFullYear()}-${getWeek(new Date(), { weekStartsOn: 1 })}` : null;
    const wasSummarySentThisWeek = lastSummarySentForWeek === currentWeekIdentifier;
    const userEmail = userProfile.email;

    const handleGenerateWeeklySummary = async () => {
        setIsWeeklyLoading(true);

        const now = new Date();
        const nextWeekStart = startOfWeek(addDays(now, 7), { weekStartsOn: 1 });
        const nextWeekEnd = endOfWeek(addDays(now, 7), { weekStartsOn: 1 });

        const upcomingEvents = events.filter(event => {
            const eventDate = new Date(event.event_datetime);
            return eventDate >= nextWeekStart && eventDate <= nextWeekEnd && event.status === 'active';
        });

        const input = {
            recipientEmail: userEmail,
            events: upcomingEvents.map(event => {
                const subject = subjects.find(s => s.id === event.subject_id);
                return {
                    title: event.title,
                    event_type: eventTypeTranslations[event.event_type as EventTypeEnum] || event.event_type,
                    event_datetime_str: format(event.event_datetime, "EEEE, d 'de' MMMM 'a las' p", { locale: es }),
                    description: event.description,
                    subject_name: subject?.name,
                }
            }),
            week_start_str: format(nextWeekStart, 'd MMMM', { locale: es }),
            week_end_str: format(nextWeekEnd, 'd MMMM, yyyy', { locale: es }),
        };

        try {
            const result = await generateWeeklySummary(input);
            if(result.emailSent) {
                addSentEmail({
                  to: userEmail,
                  subject: result.subject!,
                  body: result.body!,
                });
                toast({
                    title: "Resumen Semanal Enviado por Correo",
                    description: `El correo ha sido generado y enviado. Puedes verlo en la Bandeja de Salida.`,
                });
            }
            if(result.telegramSent) {
                toast({
                    title: "Resumen Semanal Enviado a Telegram",
                });
            }
             if (!result.emailSent && !result.telegramSent) {
               toast({
                variant: "destructive",
                title: "Error de Envío",
                description: "No se pudo enviar el resumen por ninguno de los canales. Revisa la consola para más detalles.",
              });
            }
        } catch (error) {
            console.error("Error generating weekly summary:", error);
            toast({
                variant: "destructive",
                title: "Error al generar resumen",
                description: "No se pudo generar el resumen semanal. Por favor, inténtelo de nuevo.",
            });
        } finally {
            setIsWeeklyLoading(false);
        }
    };
    
    const handleGenerateDailySummary = async () => {
        console.log("Iniciando generación de resumen diario...");
        setIsDailyLoading(true);
        const tomorrow = addDays(new Date(), 1);
        const tomorrowsEvents = events.filter(event => isSameDay(event.event_datetime, tomorrow) && event.status === 'active');
        console.log("Eventos en bruto para mañana:", tomorrowsEvents);

        const summaryInput = {
            date_str: format(tomorrow, "EEEE, d 'de' MMMM", { locale: es }),
            events: tomorrowsEvents.map(event => {
                const subject = subjects.find(s => s.id === event.subject_id);
                return {
                    title: event.title,
                    time_str: format(event.event_datetime, "p", { locale: es }),
                    subject_name: subject?.name,
                };
            })
        };
        
        console.log("Datos enviados a la IA para generar el resumen:", summaryInput);

        try {
            const result = await generateDailySummary(summaryInput);
            if (result && result.summary) {
                if (userProfile.dailySummary?.channels.includes('telegram')) {
                    console.log("Intentando enviar a Telegram:", result.summary);
                    await sendTelegramMessage({ body: result.summary });
                }
                
                toast({
                    title: "Resumen Diario Enviado",
                    description: `Resumen para mañana enviado a tus canales configurados.`,
                });
            }
        } catch (error) {
            console.error("Error al generar o enviar el resumen diario:", error);
             toast({
                variant: "destructive",
                title: "Error de Resumen Diario",
                description: "No se pudo generar o enviar el resumen para mañana.",
            });
        } finally {
            setIsDailyLoading(false);
        }
    };

    return (
        <div className="flex h-full flex-col">
            <PageHeader title="Informes y Resúmenes" />
            <div className="flex-1 overflow-y-auto p-8 space-y-8">
                 <Tabs defaultValue="attendance">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="attendance">Informe de Asistencia</TabsTrigger>
                        <TabsTrigger value="program">Informe de Cumplimiento</TabsTrigger>
                    </TabsList>
                    <TabsContent value="attendance" className="mt-4">
                        <AttendanceReportGenerator />
                    </TabsContent>
                    <TabsContent value="program" className="mt-4">
                        <ProgramReportGenerator />
                    </TabsContent>
                </Tabs>

                <Card>
                    <CardHeader>
                        <CardTitle>Resúmenes Manuales</CardTitle>
                        <CardDescription>
                           Genera y envía resúmenes a tus canales configurados en cualquier momento.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col sm:flex-row gap-4">
                        <Button onClick={handleGenerateDailySummary} disabled={isDailyLoading || !hasMounted} variant="outline">
                            {isDailyLoading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Send className="mr-2 h-4 w-4" />
                            )}
                            {isDailyLoading ? 'Generando...' : 'Generar Resumen Diario'}
                        </Button>
                         <Button onClick={handleGenerateWeeklySummary} disabled={isWeeklyLoading || !hasMounted} variant="outline">
                            {isWeeklyLoading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Send className="mr-2 h-4 w-4" />
                            )}
                            {isWeeklyLoading ? 'Generando...' : 'Generar Resumen Semanal'}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
