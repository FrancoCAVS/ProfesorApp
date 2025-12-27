
'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { useApp } from '@/contexts/app-context';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Printer, Loader2, Save, Sparkles, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, isWithinInterval, isSameDay, differenceInMinutes, parse, parseISO } from 'date-fns';
import { es } from 'date-fns/locale/es';
import eachDayOfInterval from 'date-fns/eachDayOfInterval';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { CronogramaEntry, ClassModality, Subject, UserProfile } from '@/lib/types';
import { generateSubjectSchedule, type GenerateScheduleOutput } from '@/ai/flows/generate-subject-schedule-flow';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { renderToStaticMarkup } from 'react-dom/server';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface ClassDayInfo {
    groupName: string;
    groupId: string;
    classDays: Date[];
    totalClasses: number;
    totalHours: number;
}

const classModalityTranslations: Record<ClassModality, string> = {
    presencial: 'Presencial',
    virtual_sincronica: 'Virtual Sincrónica',
    virtual_asincronica: 'Virtual Asincrónica',
};

interface FullCronogramaEntry extends CronogramaEntry {
    groupId: string;
}

interface FullGenerateScheduleOutput {
    schedule: FullCronogramaEntry[];
    finalObservation: string | null;
}

function CronogramaPreviewDialog({
    isOpen,
    onOpenChange,
    suggestions,
    onApply,
}: {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    suggestions: FullGenerateScheduleOutput | null;
    onApply: (suggestions: FullGenerateScheduleOutput) => void;
}) {
    if (!suggestions || !suggestions.schedule || suggestions.schedule.length === 0) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Sugerencia de Cronograma Generada por IA</DialogTitle>
                    <DialogDescription>
                        Revisa la distribución propuesta. Puedes aplicarla para luego editarla o cancelarla.
                    </DialogDescription>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto pr-4">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[120px]">Fecha</TableHead>
                                <TableHead>Tema Sugerido</TableHead>
                                <TableHead>Modalidad</TableHead>
                                <TableHead>Actividad</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {suggestions.schedule.map((entry, index) => (
                                <TableRow key={index}>
                                    <TableCell className="font-medium">{format(parseISO(entry.date), 'dd/MM/yyyy', { locale: es })}</TableCell>
                                    <TableCell>{entry.topic || '-'}</TableCell>
                                    <TableCell>{entry.classModality ? classModalityTranslations[entry.classModality] : '-'}</TableCell>
                                    <TableCell>{entry.activity || '-'}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
                 {suggestions.finalObservation && (
                    <Alert variant="default" className="mt-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Observación Importante</AlertTitle>
                        <AlertDescription>{suggestions.finalObservation}</AlertDescription>
                    </Alert>
                )}
                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button onClick={() => { onApply(suggestions); onOpenChange(false); }}>Aplicar Sugerencias</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function CronogramaPage() {
    const params = useParams();
    const { subjects, academicPeriods, events, cronogramaData, updateCronogramaEntry, updateSubject, userProfile } = useApp();
    const subjectId = params.id as string;
    const { toast } = useToast();
    
    const [localCronograma, setLocalCronograma] = React.useState<Record<string, Partial<CronogramaEntry>>>({});
    const [hasChanges, setHasChanges] = React.useState(false);
    const [isGenerating, setIsGenerating] = React.useState(false);
    const [suggestedCronograma, setSuggestedCronograma] = React.useState<FullGenerateScheduleOutput | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = React.useState(false);
    const [finalObservation, setFinalObservation] = React.useState<string | null>(null);
    const [view, setView] = React.useState('fichas');

    const { subject, classDaysByGroup, cursadaPeriod } = React.useMemo(() => {
        const subject = subjects.find(s => s.id === subjectId);
        if (!subject) {
            return { subject: null, classDaysByGroup: [], cursadaPeriod: null };
        }

        const subjectPeriod = academicPeriods.find(p => p.id === subject.academicPeriodId);

        if (!subjectPeriod || subjectPeriod.type !== 'class_period') {
            return { subject, classDaysByGroup: [], cursadaPeriod: null };
        }

        const cursadaStart = subjectPeriod.startDate;
        const cursadaEnd = subjectPeriod.endDate;
        const cursadaPeriod = { start: cursadaStart, end: cursadaEnd };
        
        const allDaysInRange = eachDayOfInterval(cursadaPeriod);
        
        const groupsData: ClassDayInfo[] = [];

        subject.class_groups?.forEach(group => {
            const calculatedDays: Date[] = [];
            let totalMinutes = 0;

            allDaysInRange.forEach(day => {
                const isSuspended = academicPeriods.some(p => {
                    const isSuspendingType = p.type === 'vacation' || p.type === 'exam_period' || p.type === 'exam_period_annual';
                    if (!isSuspendingType) return false;
                    const appliesToLevel = !p.level || p.level === 'all' || p.level === subject.level;
                    if (!appliesToLevel) return false;
                    return isWithinInterval(day, { start: p.startDate, end: p.endDate });
                });
                if (isSuspended) return;

                const isHoliday = events.some(e => e.event_type === 'HOLIDAY' && isSameDay(e.event_datetime, day));
                if (isHoliday) return;
                
                const dayOfWeek = day.getDay();
                group.schedule.forEach(schedule => {
                    if (Number(schedule.day) === dayOfWeek) {
                         calculatedDays.push(day);
                         const startTime = parse(schedule.startTime, 'HH:mm', new Date());
                         const endTime = parse(schedule.endTime, 'HH:mm', new Date());
                         totalMinutes += differenceInMinutes(endTime, startTime);
                    }
                });
            });

            groupsData.push({
                groupName: group.name,
                groupId: group.id,
                classDays: calculatedDays.sort((a,b) => a.getTime() - b.getTime()),
                totalClasses: calculatedDays.length,
                totalHours: totalMinutes / 60
            });
        });

        return {
            subject,
            classDaysByGroup: groupsData,
            cursadaPeriod
        };
    }, [subjectId, subjects, academicPeriods, events]);
    
    React.useEffect(() => {
        const initialData: Record<string, Partial<CronogramaEntry>> = {};
        const relevantCronograma = cronogramaData.filter(d => d.subjectId === subjectId);
        
        relevantCronograma.forEach(d => {
            initialData[`${d.groupId}-${d.date}`] = d;
        });

        const subjectData = subjects.find(s => s.id === subjectId);
        setFinalObservation(subjectData?.program?.finalObservation || null);

        setLocalCronograma(initialData);
        setHasChanges(false);
    }, [cronogramaData, subjectId, subjects]);

    const handleFieldChange = (groupId: string, date: Date, field: 'topic' | 'classModality' | 'activity' | 'status', value: string) => {
        const dateKey = format(date, 'yyyy-MM-dd');
        const entryKey = `${groupId}-${dateKey}`;
        const finalValue = value === '__NONE__' ? undefined : value;
        
        setLocalCronograma(prev => ({
            ...prev,
            [entryKey]: {
                ...prev[entryKey],
                subjectId,
                groupId,
                date: dateKey,
                [field]: finalValue
            }
        }));
        setHasChanges(true);
    };

    const handleSaveChanges = () => {
        Object.values(localCronograma).forEach(entry => {
            if (entry.subjectId && entry.groupId && entry.date) { 
                updateCronogramaEntry(entry as CronogramaEntry);
            }
        });
        
        if (subject) {
            const updatedSubject = { ...subject };
            if (!updatedSubject.program) updatedSubject.program = { units: [], activities: [], examDates: [] };
            updatedSubject.program.finalObservation = finalObservation || undefined;
            updateSubject(updatedSubject); 
        }

        setHasChanges(false);
        toast({ title: "Cronograma Guardado", description: "Tus cambios han sido guardados exitosamente." });
    };
    
    const handleApplySuggestions = (suggestions: FullGenerateScheduleOutput) => {
        setLocalCronograma(prev => {
            const newCronogramaState = { ...prev };
            suggestions.schedule.forEach(item => {
                const entryKey = `${item.groupId}-${item.date}`;
                newCronogramaState[entryKey] = {
                    ...newCronogramaState[entryKey], // Keep existing data
                    ...item, // Overwrite with suggestions
                    subjectId,
                    status: 'planned', // Default status for new suggestions
                };
            });
            return newCronogramaState;
        });

        if (suggestions.finalObservation) {
            setFinalObservation(suggestions.finalObservation);
        } else {
            setFinalObservation(null);
        }
        
        setHasChanges(true);
        toast({ title: 'Sugerencias Aplicadas', description: 'El cronograma ha sido actualizado. Recuerda guardar los cambios.' });
    };


    const handleGenerateWithAI = async () => {
        if (!subject || !subject.program || classDaysByGroup.length === 0) {
            toast({ variant: 'destructive', title: 'Faltan datos', description: 'Asegúrate de haber completado la programación de la asignatura (unidades, temas, etc.) antes de generar el cronograma.' });
            return;
        }
        setIsGenerating(true);
        try {
            const allSuggestions: FullGenerateScheduleOutput = { schedule: [], finalObservation: ''};

            for (const group of classDaysByGroup) {
                const result = await generateSubjectSchedule({
                    subjectName: subject.name,
                    program: {
                        units: subject.program.units || [],
                        activities: subject.program.activities || [],
                        examDates: subject.program.examDates?.map(e => ({
                            instance: e.instance,
                            date: e.date ? format(new Date(e.date), 'yyyy-MM-dd') : '',
                        })).filter(e => e.date) || [],
                    },
                    classDays: group.classDays.map(d => format(d, 'yyyy-MM-dd')),
                });
                
                if (result.schedule) {
                    result.schedule.forEach(item => {
                         allSuggestions.schedule.push({
                            ...item,
                            subjectId: subject.id,
                            groupId: group.groupId,
                        });
                    })
                }
                
                if (result.finalObservation && !allSuggestions.finalObservation) {
                    allSuggestions.finalObservation = result.finalObservation;
                }
            }
            if (allSuggestions.schedule.length > 0) {
                setSuggestedCronograma(allSuggestions);
                setIsPreviewOpen(true);
            } else {
                 toast({ variant: 'destructive', title: 'Sin sugerencias', description: 'La IA no pudo generar un cronograma. Intenta de nuevo.' });
            }

        } catch (error) {
            toast({ variant: 'destructive', title: 'Error de IA', description: 'No se pudo generar el cronograma.' });
            console.error(error);
        } finally {
            setIsGenerating(false);
        }
    };

    if (!subject) {
        return <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    const allOriginalTopics = subject.program?.units.flatMap(u => u.topics.map(t => ({label: `${u.name}: ${t}`, value: t}))) || [];

    const handlePrint = () => {
        if (!subject) return;

        const printContent = renderToStaticMarkup(
            <>
                <header className="mb-6 space-y-2 text-center print:text-left">
                    <img src="https://www.ucasal.edu.ar/img/logo-ucasal-horizontal.png" alt="Logo UCASAL" className="h-16 w-auto mx-auto print:mx-0 mb-4" />
                    <h1 className="text-xl sm:text-2xl font-bold uppercase text-[#990000]">CARRERA: {subject.career || 'N/A'}</h1>
                    <h2 className="text-xl sm:text-2xl font-bold uppercase text-[#990000]">CÁTEDRA: {subject.name}</h2>
                    <h3 className="text-lg sm:text-xl font-semibold">
                        {subject.year} - {academicPeriods.find(p => p.id === subject.academicPeriodId)?.name || 'Periodo no definido'}
                    </h3>
                    <h2 className="text-xl sm:text-2xl font-bold uppercase">CRONOGRAMA</h2>
                </header>
                <p className="text-xs text-justify mb-4">
                    Esta planificación temporal de las actividades previstas es orientativa y está sujeta a posibles modificaciones. Las fechas previstas para la realización de actividades de evaluación y entrega de trabajos también están sujetas a posibles modificaciones, si bien, en este caso, sólo se podrán retrasar, con el correspondiente preaviso. En lo que hace referencia a la programación de exámenes finales, ésta se atendrá a este respecto a lo establecido por la Unidad Académica.
                </p>
                {classDaysByGroup.map(group => (
                    <div key={group.groupId} className="mb-8 print:break-before-page">
                        <div className="bg-[#990000] text-white p-2 font-bold">
                            Cronograma orientativo de actividades - {subject.level === 'secundario' ? 'División' : 'Comisión'}: {group.groupName}
                        </div>
                        <div className="border-l border-r border-b border-black">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[120px] font-bold text-black border-t-0 border-r border-b border-black">Fecha</TableHead>
                                        <TableHead className="font-bold text-black border-t-0 border-r border-b border-black">Tema</TableHead>
                                        <TableHead className="w-[180px] font-bold text-black border-t-0 border-r border-b border-black">Modalidad de Clase</TableHead>
                                        <TableHead className="w-[200px] font-bold text-black border-t-0 border-b border-black">Actividad</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {group.classDays.map(day => {
                                        const entryKey = `${group.groupId}-${format(day, 'yyyy-MM-dd')}`;
                                        const entry = localCronograma[entryKey];
                                        return (
                                            <TableRow key={day.toISOString()}>
                                                <TableCell className="border-r border-b-0 border-black font-medium">{format(day, 'dd/MM/yyyy')}</TableCell>
                                                <TableCell className="border-r border-b-0 border-black">{entry?.topic || ''}</TableCell>
                                                <TableCell className="border-r border-b-0 border-black">{entry?.classModality ? classModalityTranslations[entry.classModality] : ''}</TableCell>
                                                <TableCell className="border-b-0 border-black">{entry?.activity || ''}</TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                ))}
                {finalObservation && (
                    <div className="mt-6">
                        <h4 className="font-bold text-black">Observaciones:</h4>
                        <p className="text-sm italic text-black whitespace-pre-wrap">{finalObservation}</p>
                    </div>
                )}
            </>
        );
        
        const fullHtml = `
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Cronograma - ${subject.name}</title>
                <script src="https://cdn.tailwindcss.com"></script>
                 <style>
                    body { font-family: sans-serif; }
                    table { width: 100%; border-collapse: collapse; }
                    th, td { border: 1px solid black; padding: 8px; text-align: left; }
                    th { background-color: #f2f2f2; }
                    @media print {
                        .no-print { display: none; }
                        @page { size: A4; margin: 1cm; }
                    }
                </style>
            </head>
            <body>${printContent}</body>
            </html>
        `;

        const blob = new Blob([fullHtml], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const filename = view === 'fichas' 
            ? `cronograma_${subject.name.replace(/\s+/g, '_')}.html` 
            : `ddjj_${userProfile.name.replace(/\s+/g, '_')}.html`;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="flex h-full flex-col">
            <Button
                onClick={handlePrint}
                variant="outline"
                className="fixed bottom-6 right-6 z-50 rounded-full h-14 w-14 shadow-lg print:hidden"
            >
                <Printer className="h-6 w-6" />
            </Button>

            <PageHeader title="Generador de Cronograma" className="print:hidden">
                {hasChanges && (
                    <Button onClick={handleSaveChanges}>
                        <Save className="mr-2 h-4 w-4" />
                        Guardar Cambios
                    </Button>
                )}
                <Button onClick={handleGenerateWithAI} variant="outline" disabled={isGenerating}>
                    {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    {isGenerating ? 'Generando...' : 'Generar Cronograma con IA'}
                </Button>
            </PageHeader>
            
            <CronogramaPreviewDialog
                isOpen={isPreviewOpen}
                onOpenChange={setIsPreviewOpen}
                suggestions={suggestedCronograma}
                onApply={handleApplySuggestions}
            />

            <main className="flex-1 overflow-y-auto p-4 sm:p-8 bg-white text-black main-content">
                <header className="mb-6 space-y-2 text-center print:text-left">
                    <img src="https://www.ucasal.edu.ar/img/logo-ucasal-horizontal.png" alt="Logo UCASAL" className="h-16 w-auto mx-auto print:mx-0 mb-4" />
                    <h1 className="text-xl sm:text-2xl font-bold uppercase text-[#990000]">CARRERA: {subject.career || 'N/A'}</h1>
                    <h2 className="text-xl sm:text-2xl font-bold uppercase text-[#990000]">CÁTEDRA: {subject.name}</h2>
                    <h3 className="text-lg sm:text-xl font-semibold">
                        {subject.year} - {academicPeriods.find(p => p.id === subject.academicPeriodId)?.name || 'Periodo no definido'}
                    </h3>
                    <h2 className="text-xl sm:text-2xl font-bold uppercase">CRONOGRAMA</h2>
                </header>
                
                <p className="text-xs text-justify mb-4">
                    Esta planificación temporal de las actividades previstas es orientativa y está sujeta a posibles modificaciones. Las fechas previstas para la realización de actividades de evaluación y entrega de trabajos también están sujetas a posibles modificaciones, si bien, en este caso, sólo se podrán retrasar, con el correspondiente preaviso. En lo que hace referencia a la programación de exámenes finales, ésta se atendrá a este respecto a lo establecido por la Unidad Académica.
                </p>

                {classDaysByGroup.length === 0 && (
                    <Alert variant="destructive" className="print-hidden">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>No hay días de clase calculados</AlertTitle>
                    <AlertDescription>
                        No se han podido determinar los días de clase para esta asignatura. Verifica lo siguiente:
                        <ul className="list-disc pl-5 mt-2">
                            <li>La asignatura debe estar vinculada a un <b>Periodo Lectivo</b> activo.</li>
                            <li>Debe tener al menos un <b>horario semanal</b> configurado en sus comisiones/divisiones.</li>
                            <li>El periodo lectivo no debe estar completamente cubierto por <b>vacaciones o periodos de examen</b>.</li>
                        </ul>
                    </AlertDescription>
                    </Alert>
                )}

                {classDaysByGroup.map((groupData) => (
                    <div key={groupData.groupId} className="mb-8 print:break-before-page">
                        <div className="bg-[#990000] text-white p-2 font-bold">
                            Cronograma orientativo de actividades - {subject.level === 'secundario' ? 'División' : 'Comisión'}: {groupData.groupName}
                        </div>
                        <div className="border-l border-r border-b border-black">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[120px] font-bold text-black border-t-0 border-r border-b border-black">Fecha</TableHead>
                                        <TableHead className="font-bold text-black border-t-0 border-r border-b border-black">Tema</TableHead>
                                        <TableHead className="w-[180px] font-bold text-black border-t-0 border-r border-b border-black">Modalidad de Clase</TableHead>
                                        <TableHead className="w-[200px] font-bold text-black border-t-0 border-r border-b border-black">Actividad</TableHead>
                                        <TableHead className="w-[80px] font-bold text-black border-t-0 border-b border-black text-center">Dado</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {groupData.classDays.map(day => {
                                        const entryKey = `${groupData.groupId}-${format(day, 'yyyy-MM-dd')}`;
                                        const currentEntry = localCronograma[entryKey];
                                        const examOnDay = subject.program?.examDates?.find(e => e.date && isSameDay(new Date(e.date), day));
                                        
                                        const currentTopicValue = currentEntry?.topic;
                                        const topicInOriginalList = allOriginalTopics.some(t => t.value === currentTopicValue);
                                        const allTopicOptions = (topicInOriginalList || !currentTopicValue)
                                            ? allOriginalTopics
                                            : [{ label: `${currentTopicValue?.substring(0,30) || ''}...`, value: currentTopicValue || '' }, ...allOriginalTopics];
                                        
                                        const currentActivityValue = currentEntry?.activity;
                                        const originalActivities = subject.program?.activities || [];
                                        const allActivityOptions = [...new Set([...originalActivities, currentActivityValue].filter(Boolean))];


                                        return (
                                            <TableRow key={day.toISOString()} className={examOnDay ? 'bg-destructive/10' : ''}>
                                                <TableCell className="border-r border-b-0 border-black font-medium">{format(day, 'dd/MM/yyyy')}</TableCell>
                                                <TableCell className="border-r border-b-0 border-black h-12 p-1">
                                                    {examOnDay ? (
                                                        <div className="px-3 py-2 font-semibold text-destructive">{examOnDay.instance}</div>
                                                    ) : (
                                                        <Select value={currentTopicValue || ''} onValueChange={(value) => handleFieldChange(groupData.groupId, day, 'topic', value)}>
                                                            <SelectTrigger className="w-full h-full border-0 focus:ring-0 text-black">
                                                                <SelectValue placeholder="Seleccionar tema..." />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="__NONE__">-- Sin Asignar --</SelectItem>
                                                                {allTopicOptions.map(topic => <SelectItem key={topic.value} value={topic.value}>{topic.label}</SelectItem>)}
                                                            </SelectContent>
                                                        </Select>
                                                    )}
                                                </TableCell>
                                                <TableCell className="border-r border-b-0 border-black p-1">
                                                    {examOnDay ? (
                                                        <div className="px-3 py-2 font-semibold text-destructive">Presencial</div>
                                                    ) : (
                                                        <Select value={currentEntry?.classModality || ''} onValueChange={(value) => handleFieldChange(groupData.groupId, day, 'classModality', value)}>
                                                            <SelectTrigger className="w-full h-full border-0 focus:ring-0 text-black">
                                                                <SelectValue placeholder="Seleccionar..." />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="__NONE__">-- Sin Asignar --</SelectItem>
                                                                {(Object.keys(classModalityTranslations) as ClassModality[]).map(modality => (
                                                                    <SelectItem key={modality} value={modality}>{classModalityTranslations[modality]}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    )}
                                                </TableCell>
                                                <TableCell className="border-r border-b-0 border-black p-1">
                                                    {examOnDay ? (
                                                        <div className="px-3 py-2 font-semibold text-destructive">Evaluación</div>
                                                    ) : (
                                                        <Select value={currentActivityValue || ''} onValueChange={(value) => handleFieldChange(groupData.groupId, day, 'activity', value)}>
                                                            <SelectTrigger className="w-full h-full border-0 focus:ring-0 text-black">
                                                                <SelectValue placeholder="Seleccionar..." />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="__NONE__">-- Sin Asignar --</SelectItem>
                                                                {[...new Set(allActivityOptions)].map((activity) => <SelectItem key={activity} value={activity}>{activity}</SelectItem>)}
                                                            </SelectContent>
                                                        </Select>
                                                    )}
                                                </TableCell>
                                                 <TableCell className="border-b-0 border-black p-1 text-center">
                                                    {!examOnDay && currentTopicValue && (
                                                         <Checkbox
                                                            checked={currentEntry?.status === 'taught'}
                                                            onCheckedChange={(checked) => handleFieldChange(groupData.groupId, day, 'status', checked ? 'taught' : 'planned')}
                                                        />
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                ))}

                {finalObservation && (
                    <div className="mt-6">
                        <h4 className="font-bold text-black">Observaciones:</h4>
                        <Textarea 
                            className="text-sm italic text-black border-dashed" 
                            value={finalObservation}
                            onChange={(e) => {
                                setFinalObservation(e.target.value);
                                setHasChanges(true);
                            }}
                        />
                    </div>
                )}
                
                <Card className="mt-8 print:break-before-page">
                    <CardHeader>
                        <CardTitle>Resumen del Cursado</CardTitle>
                        <CardDescription>Información general calculada para la asignatura.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm font-medium mb-4">
                            <span className="font-bold">Período de Cursada:</span>
                            {' '}
                            {cursadaPeriod ? `${format(cursadaPeriod.start, 'P', { locale: es })} - ${format(cursadaPeriod.end, 'P', { locale: es })}` : 'N/A'}
                        </p>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{subject.level === 'secundario' ? 'División' : 'Comisión'}</TableHead>
                                    <TableHead className="text-right">Total de Clases Estimado</TableHead>
                                    <TableHead className="text-right">Total de Horas Reloj</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {classDaysByGroup.map(groupData => (
                                    <TableRow key={groupData.groupName}>
                                        <TableCell className="font-medium">{groupData.groupName}</TableCell>
                                        <TableCell className="text-right">{groupData.totalClasses} clases</TableCell>
                                        <TableCell className="text-right">{groupData.totalHours.toFixed(2)} horas</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
