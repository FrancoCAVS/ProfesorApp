
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, isSameDay, addHours, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { Calendar as CalendarIcon, Loader2, Sparkles, Link, BellRing, MessageSquare, Send, Smartphone, Mail, PlusCircle, Trash2, Mic, AlertCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useApp } from '@/contexts/app-context';
import type { Event as EventType, EventType as EventTypeEnum, ReminderSettings, ReminderTiming } from '@/lib/types';
import { cn } from '@/lib/utils';
import { suggestEventDetails } from '@/ai/flows/suggest-event-details';
import { extractEventFromUrl } from '@/ai/flows/extract-event-from-url-flow';
import { extractEventFromAudio } from '@/ai/flows/extract-event-from-audio-flow';
import { useToast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from './ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

const eventDateSchema = z.object({
  start: z.date(),
  end: z.date(),
});

const reminderSchema = z.object({
  type: z.enum(['simple', 'recurring']),
  timing: z.enum(['none', 'on_time', '5m', '15m', '1h', '2h', '1d', '2d']).optional(),
  frequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
  count: z.coerce.number().min(1).optional(),
  channels: z.array(z.enum(['in_app', 'email', 'whatsapp', 'telegram', 'push'])).default([]),
}).superRefine((data, ctx) => {
  if (data.type === 'recurring') {
    if (!data.frequency) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['frequency'], message: 'La frecuencia es obligatoria.' });
    if (!data.count) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['count'], message: 'El número de veces es obligatorio.' });
  }
});


const eventSchema = z.object({
  title: z.string().min(3, 'El título debe tener al menos 3 caracteres.'),
  event_type: z.string().min(1, { message: "Debe seleccionar un tipo de evento." }),
  subject_id: z.string().optional().nullable(),
  dates: z.array(eventDateSchema).min(1, 'Debe seleccionar al menos una fecha.'),
  description: z.string().optional(),
  reminder: reminderSchema,
  link: z.string().url('Debe ser una URL válida.').optional().or(z.literal('')),
}).superRefine((data, ctx) => {
    data.dates.forEach((date, index) => {
        if (date.start >= date.end) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: [`dates`, index, 'end'],
                message: 'Fin debe ser posterior a inicio.',
            });
        }
    });
});


type EventFormValues = z.infer<typeof eventSchema>;

interface EventFormProps {
  eventToEdit?: EventType | null;
  onFinished: () => void;
}

const eventTypeTranslations: Record<EventTypeEnum, string> = {
    EXAM_PARCIAL: 'Examen Parcial',
    EXAM_RECUPERATORIO: 'Examen Recuperatorio',
    EXAM_FINAL_PRIMER_LLAMADO: 'Examen Final (1er Llamado)',
    EXAM_FINAL_SEGUNDO_LLAMADO: 'Examen Final (2do Llamado)',
    EXAM_REGULAR: 'Examen Regular',
    EXAM_LIBRE: 'Examen para Alumnos Libres',
    EXAM_COMPLETAR_CARRERA: 'Examen para Completar Carrera',
    MEETING: 'Reunión',
    HOLIDAY: 'Feriado',
    CLASS: 'Clase',
    TRAINING: 'Capacitación',
    OTHER: 'Otro',
    TRIMESTER_FIRST_START: 'Inicio 1er Trimestre',
    TRIMESTER_FIRST_END: 'Fin 1er Trimestre',
    TRIMESTER_SECOND_START: 'Inicio 2do Trimestre',
    TRIMESTER_SECOND_END: 'Fin 2do Trimestre',
    TRIMESTER_THIRD_START: 'Inicio 3er Trimestre',
    TRIMESTER_THIRD_END: 'Fin 3er Trimestre',
    ACTO_ESCOLAR: 'Acto Escolar',
    ENTREGA_NOTAS: 'Entrega de Notas',
    TUTORIA: 'Tutoría',
    CONFERENCIA: 'Conferencia',
    COMMEMORATIVE: 'Fecha Conmemorativa',
    PERSONAL_APPOINTMENT: 'Turno Médico',
    PERSONAL_TASK: 'Evento Personal',
};

const superiorExamTypes: EventTypeEnum[] = ['EXAM_PARCIAL', 'EXAM_RECUPERATORIO', 'EXAM_FINAL_PRIMER_LLAMADO', 'EXAM_FINAL_SEGUNDO_LLAMADO'];
const secundarioExamTypes: EventTypeEnum[] = ['EXAM_REGULAR', 'EXAM_LIBRE', 'EXAM_COMPLETAR_CARRERA', 'EXAM_PARCIAL'];
const trimesterEventTypes: EventTypeEnum[] = [
    'TRIMESTER_FIRST_START', 'TRIMESTER_FIRST_END', 'TRIMESTER_SECOND_START',
    'TRIMESTER_SECOND_END', 'TRIMESTER_THIRD_START', 'TRIMESTER_THIRD_END'
];
const generalEventTypes: EventTypeEnum[] = ['MEETING', 'HOLIDAY', 'CLASS', 'TRAINING', 'ACTO_ESCOLAR', 'ENTREGA_NOTAS', 'TUTORIA', 'CONFERENCIA', 'OTHER'];
const allExamTypes = [...new Set([...superiorExamTypes, ...secundarioExamTypes])];

const reminderTimingTranslations: Record<ReminderTiming, string> = {
    none: 'Sin recordatorio',
    on_time: 'A la hora del evento',
    '5m': '5 minutos antes',
    '15m': '15 minutos antes',
    '1h': '1 hora antes',
    '2h': '2 horas antes',
    '1d': '1 día antes',
    '2d': '2 días antes',
};


export function EventForm({ eventToEdit, onFinished }: EventFormProps) {
  const { events, subjects, addEvent, updateEvent, customEventTypes, addCustomEventType } = useApp();
  const { toast } = useToast();
  const [isSuggesting, setIsSuggesting] = React.useState(false);
  const [isScanningUrl, setIsScanningUrl] = React.useState(false);
  const [isProcessingAudio, setIsProcessingAudio] = React.useState(false);
  const [subjectLevelFilter, setSubjectLevelFilter] = React.useState<'all' | 'Superior' | 'Secundario'>('all');
  const [isNewTypeDialogOpen, setIsNewTypeDialogOpen] = React.useState(false);
  const [isAudioDialogOpen, setIsAudioDialogOpen] = React.useState(false);
  const [newTypeName, setNewTypeName] = React.useState('');
  const [conflictingEvent, setConflictingEvent] = React.useState<EventType | null>(null);

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: eventToEdit 
    ? {
        ...eventToEdit,
        title: eventToEdit.title ?? '',
        dates: [{ 
            start: eventToEdit.event_datetime ?? new Date(), 
            end: eventToEdit.end_datetime ?? addHours(eventToEdit.event_datetime ?? new Date(), 1) 
        }],
        event_type: eventToEdit.event_type ?? 'OTHER',
        description: eventToEdit.description ?? '',
        link: eventToEdit.link ?? '',
        reminder: {
            type: eventToEdit.reminder?.type ?? 'simple',
            timing: eventToEdit.reminder?.timing ?? '1d',
            frequency: eventToEdit.reminder?.frequency ?? 'daily',
            count: eventToEdit.reminder?.count ?? 3,
            channels: eventToEdit.reminder?.channels ?? ['in_app'],
        }
      } 
    : {
      title: '',
      event_type: 'OTHER',
      subject_id: undefined,
      dates: [],
      description: '',
      reminder: {
        type: 'simple',
        timing: '1d',
        channels: ['in_app'],
        frequency: 'daily',
        count: 3,
      },
      link: '',
    },
  });
  
  const watchedEventType = form.watch('event_type');
  const watchedSubjectId = form.watch('subject_id');
  const watchedDates = form.watch('dates');
  const watchedReminderType = form.watch('reminder.type');
  
  const activeSubjects = React.useMemo(() => subjects.filter(s => s.status === 'active'), [subjects]);

  const filteredSubjects = React.useMemo(() => {
    if (subjectLevelFilter === 'all') {
      return activeSubjects;
    }
    if (subjectLevelFilter === 'Superior') {
      return activeSubjects.filter(s => s.level.startsWith('superior'));
    }
    if (subjectLevelFilter === 'Secundario') {
      return activeSubjects.filter(s => s.level === 'secundario');
    }
    return activeSubjects;
  }, [activeSubjects, subjectLevelFilter]);


  const selectedSubject = React.useMemo(() => {
    return subjects.find(s => s.id === watchedSubjectId);
  }, [subjects, watchedSubjectId]);

  const canSuggest = watchedEventType && watchedSubjectId && selectedSubject;

  const isHolidayForm = watchedEventType === 'HOLIDAY';


  React.useEffect(() => {
    if (selectedSubject) {
        const currentEventType = form.getValues('event_type') as EventTypeEnum; // Cast for checking against enums
        const isCustomType = !Object.keys(eventTypeTranslations).includes(currentEventType);
        
        if (isCustomType) return; // Don't reset if it's a custom type

        let isValid = false;
        
        if (selectedSubject.level.startsWith('superior')) {
            isValid = superiorExamTypes.includes(currentEventType) || generalEventTypes.includes(currentEventType);
        } else if (selectedSubject.level === 'secundario') {
            isValid = secundarioExamTypes.includes(currentEventType) || generalEventTypes.includes(currentEventType) || trimesterEventTypes.includes(currentEventType);
        }
        
        if (!isValid && !generalEventTypes.includes(currentEventType)) {
            form.setValue('event_type', 'OTHER', { shouldDirty: true });
        }
    }
  }, [selectedSubject, form]);

  React.useEffect(() => {
    if (!watchedDates || watchedDates.length === 0) {
      setConflictingEvent(null);
      return;
    }

    const eventsToCheck = events.filter(e => {
        if (e.status === 'archived') return false;
        if (eventToEdit && e.id === eventToEdit.id) return false;
        return true;
    });

    let conflict: EventType | null = null;

    for (const dateRange of watchedDates) {
        if (!dateRange.start || !dateRange.end) continue;
        
        const foundConflict = eventsToCheck.find(existingEvent => {
            const existingEnd = existingEvent.end_datetime ?? addHours(existingEvent.event_datetime, 1);
            // Check for overlap: (StartA < EndB) and (EndA > StartB)
            return dateRange.start < existingEnd && dateRange.end > existingEvent.event_datetime;
        });

        if (foundConflict) {
            conflict = foundConflict;
            break;
        }
    }

    setConflictingEvent(conflict);
  }, [watchedDates, events, eventToEdit]);


  const handleSuggestion = async () => {
    if (!canSuggest) return;
    setIsSuggesting(true);
    try {
        const result = await suggestEventDetails({
            eventType: watchedEventType,
            subject: selectedSubject.name,
            level: selectedSubject.level,
        });
        
        if(result.description) form.setValue('description', result.description, { shouldValidate: true });

    } catch (error) {
        console.error("AI Suggestion failed:", error);
        toast({
            variant: "destructive",
            title: "Sugerencia de IA fallida",
            description: "No se pudieron generar sugerencias. Por favor, inténtalo de nuevo.",
        });
    } finally {
        setIsSuggesting(false);
    }
  };
  
  const populateFormWithExtractedData = (result: any) => {
    if (result.title) form.setValue('title', result.title);
    if (result.description) form.setValue('description', result.description);
    if (result.link) form.setValue('link', result.link);
    if (result.event_type) {
        const allTypes = [...Object.keys(eventTypeTranslations), ...customEventTypes];
        if (allTypes.includes(result.event_type)) {
            form.setValue('event_type', result.event_type);
        } else {
            addCustomEventType(result.event_type);
            form.setValue('event_type', result.event_type);
        }
    }

    if (result.event_datetime) {
        const startDate = parseISO(result.event_datetime);
        if (isValid(startDate)) {
            let endDate;
            if (result.end_datetime) {
                const parsedEnd = parseISO(result.end_datetime);
                endDate = isValid(parsedEnd) && parsedEnd > startDate ? parsedEnd : addHours(startDate, 1);
            } else {
                endDate = addHours(startDate, 1);
            }
            form.setValue('dates', [{ start: startDate, end: endDate }]);
        }
    }
  };

  const handleUrlScan = async (url: string) => {
    setIsScanningUrl(true);
    try {
        const result = await extractEventFromUrl({ url });
        populateFormWithExtractedData(result);
        if (!result.link) form.setValue('link', url); // Use original URL if none found
        toast({ title: 'Análisis Completado', description: 'El formulario ha sido completado con los datos de la URL.' });

    } catch (error) {
        console.error("Error al escanear la URL:", error);
        toast({ variant: "destructive", title: "Error de IA", description: "No se pudieron extraer los detalles de la URL." });
    } finally {
        setIsScanningUrl(false);
    }
  };

  const handleAudioScan = async (audioDataUri: string) => {
    setIsAudioDialogOpen(false);
    setIsProcessingAudio(true);
    try {
        const result = await extractEventFromAudio({ audioDataUri });
        populateFormWithExtractedData(result);
        toast({ title: 'Análisis Completado', description: 'El formulario ha sido completado con el audio.' });
    } catch (error) {
        console.error("Error al procesar el audio:", error);
        toast({ variant: "destructive", title: "Error de IA", description: "No se pudieron extraer los detalles del audio." });
    } finally {
        setIsProcessingAudio(false);
    }
  };


  const onSubmit = (data: EventFormValues) => {
    const finalSubjectId = data.subject_id === '__NONE__' ? undefined : data.subject_id;
    
    if (eventToEdit?.id) {
        // Editing a single event instance
        const eventPayload = {
            ...data,
            subject_id: finalSubjectId,
            event_datetime: data.dates[0].start,
            end_datetime: data.dates[0].end,
        };
        const { dates, ...finalPayload } = eventPayload;
        updateEvent({ ...eventToEdit, ...finalPayload });
    } else {
        // Creating a new event or a series of events
        const seriesId = data.dates.length > 1 ? crypto.randomUUID() : undefined;

        data.dates.forEach((dateItem, index) => {
            const instanceTitle = seriesId
                ? `${data.title} (Parte ${index + 1}/${data.dates.length})`
                : data.title;

            const eventPayload = {
                ...data,
                subject_id: finalSubjectId,
                title: instanceTitle,
                event_datetime: dateItem.start,
                end_datetime: dateItem.end,
                seriesId: seriesId,
            };
            const { dates, ...restOfPayload } = eventPayload;
            addEvent(restOfPayload as Omit<EventType, 'id' | 'status'>);
        });
    }
    onFinished();
  };
  
  const handleCreateNewType = () => {
    if (newTypeName.trim()) {
        addCustomEventType(newTypeName);
        form.setValue('event_type', newTypeName.trim(), { shouldValidate: true });
        setIsNewTypeDialogOpen(false);
        setNewTypeName('');
    }
  };
  
  const anyScanRunning = isScanningUrl || isProcessingAudio;

  return (
    <>
      <Dialog open={isNewTypeDialogOpen} onOpenChange={setIsNewTypeDialogOpen}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Crear Nuevo Tipo de Evento</DialogTitle>
                <DialogDescription>
                    Añade un tipo de evento personalizado para usarlo ahora y en el futuro.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
                <Label htmlFor="new-type-name">Nombre del Tipo</Label>
                <Input
                    id="new-type-name"
                    value={newTypeName}
                    onChange={(e) => setNewTypeName(e.target.value)}
                    placeholder="Ej: Entrega de Proyecto Final"
                />
            </div>
            <DialogFooter>
                <Button variant="ghost" onClick={() => setIsNewTypeDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleCreateNewType}>Guardar Tipo</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      <AudioInputDialog 
        isOpen={isAudioDialogOpen} 
        onOpenChange={setIsAudioDialogOpen}
        onScan={handleAudioScan}
      />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 flex-grow flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
                <DialogTitle>
                    {eventToEdit && eventToEdit.id
                        ? 'Editar Evento'
                        : isHolidayForm
                        ? 'Añadir Feriado Manualmente'
                        : 'Añadir Nuevo Evento Académico'}
                </DialogTitle>
                 {!isHolidayForm && (
                    <div className="flex items-center gap-2">
                        <Button 
                            type="button" 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setIsAudioDialogOpen(true)}
                            disabled={anyScanRunning || !!eventToEdit}
                        >
                            {isProcessingAudio ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                            <Mic className="mr-2 h-4 w-4" />
                            )}
                            {isProcessingAudio ? 'Procesando...' : 'Por Voz'}
                        </Button>
                        <UrlScanPopover
                            onScan={handleUrlScan}
                            isScanning={isScanningUrl}
                            disabled={anyScanRunning || !!eventToEdit}
                        />
                    </div>
                 )}
            </div>
          </DialogHeader>
          
          <div className="space-y-6 flex-grow">
            <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>{isHolidayForm ? 'Nombre del Feriado' : 'Título del Evento'}</FormLabel>
                    <FormControl>
                        <Input placeholder={isHolidayForm ? 'Ej: Día del Trabajador' : 'Ej: Curso de Verano'} {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />

            {!isHolidayForm && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                    <FormField
                    control={form.control}
                    name="subject_id"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Asignatura (Opcional)</FormLabel>
                        <RadioGroup
                            value={subjectLevelFilter}
                            onValueChange={(value: 'all' | 'Superior' | 'Secundario') => {
                                const currentSubject = activeSubjects.find(s => s.id === watchedSubjectId);
                                if (currentSubject && value !== 'all') {
                                    let subjectShouldBeVisible = false;
                                    if (value === 'Secundario') {
                                        subjectShouldBeVisible = currentSubject.level === 'secundario';
                                    } else if (value === 'Superior') {
                                        subjectShouldBeVisible = currentSubject.level.startsWith('superior');
                                    }
                                    
                                    if (!subjectShouldBeVisible) {
                                        form.resetField('subject_id');
                                    }
                                }
                                setSubjectLevelFilter(value);
                            }}
                            className="flex space-x-4 pt-2"
                            >
                            <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                <RadioGroupItem value="all" id="level-all" />
                                </FormControl>
                                <Label htmlFor="level-all" className="font-normal">
                                Todos
                                </Label>
                            </FormItem>
                            <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                <RadioGroupItem value="Secundario" id="level-secundario" />
                                </FormControl>
                                <Label htmlFor="level-secundario" className="font-normal">
                                Secundario
                                </Label>
                            </FormItem>
                            <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                <RadioGroupItem value="Superior" id="level-superior" />
                                </FormControl>
                                <Label htmlFor="level-superior" className="font-normal">
                                Superior
                                </Label>
                            </FormItem>
                        </RadioGroup>
                        <Select onValueChange={field.onChange} value={field.value || '__NONE__'}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecciona una asignatura" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            <SelectItem value="__NONE__">-- Sin Asignatura --</SelectItem>
                            {filteredSubjects.map((subject) => {
                                const label = subject.level.startsWith('superior')
                                    ? `${subject.name} - ${subject.career}`
                                    : `${subject.name} - ${subject.institution}`;
                                return (
                                    <SelectItem key={subject.id} value={subject.id}>{label}</SelectItem>
                                );
                            })}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="event_type"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Tipo de Evento</FormLabel>
                        <Select 
                            onValueChange={(value) => {
                                if (value === '__CREATE_NEW__') {
                                    setIsNewTypeDialogOpen(true);
                                } else {
                                    field.onChange(value);
                                }
                            }}
                            value={field.value}
                        >
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecciona un tipo de evento" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            {customEventTypes.length > 0 && (
                                <SelectGroup>
                                    <SelectLabel>Tipos Personalizados</SelectLabel>
                                    {customEventTypes.map((type) => (
                                        <SelectItem key={`custom-${type}`} value={type}>{type}</SelectItem>
                                    ))}
                                </SelectGroup>
                            )}
                            {!selectedSubject && (
                                <>
                                <SelectGroup>
                                    <SelectLabel>Exámenes</SelectLabel>
                                    {allExamTypes.map((type) => (
                                        <SelectItem key={`all-exam-${type}`} value={type}>{eventTypeTranslations[type]}</SelectItem>
                                    ))}
                                </SelectGroup>
                                <SelectGroup>
                                    <SelectLabel>Hitos Lectivos</SelectLabel>
                                    {trimesterEventTypes.map((type) => (
                                        <SelectItem key={`all-trim-${type}`} value={type}>{eventTypeTranslations[type]}</SelectItem>
                                    ))}
                                </SelectGroup>
                                </>
                            )}
                            {selectedSubject?.level.startsWith('superior') && (
                                <SelectGroup>
                                <SelectLabel>Exámenes (Nivel Superior)</SelectLabel>
                                {superiorExamTypes.map((type) => (
                                    <SelectItem key={`sup-${type}`} value={type}>{eventTypeTranslations[type]}</SelectItem>
                                ))}
                                </SelectGroup>
                            )}
                            {selectedSubject?.level === 'secundario' && (
                                <>
                                <SelectGroup>
                                    <SelectLabel>Hitos Lectivos (Secundario)</SelectLabel>
                                    {trimesterEventTypes.map((type) => (
                                    <SelectItem key={`sec-trim-${type}`} value={type}>{eventTypeTranslations[type]}</SelectItem>
                                    ))}
                                </SelectGroup>
                                <SelectGroup>
                                    <SelectLabel>Exámenes (Nivel Secundario)</SelectLabel>
                                    {secundarioExamTypes.map((type) => (
                                    <SelectItem key={`sec-exam-${type}`} value={type}>{eventTypeTranslations[type]}</SelectItem>
                                    ))}
                                </SelectGroup>
                                </>
                            )}
                            <SelectGroup>
                                <SelectLabel>Eventos Generales</SelectLabel>
                                {generalEventTypes.map((type) => (
                                <SelectItem key={`gen-${type}`} value={type}>{eventTypeTranslations[type]}</SelectItem>
                                ))}
                            </SelectGroup>
                            <Separator className="my-1" />
                                <SelectItem value="__CREATE_NEW__" className="text-primary focus:text-primary">
                                    <div className="flex items-center gap-2">
                                        <PlusCircle className="h-4 w-4" />
                                        <span>Crear nuevo tipo...</span>
                                    </div>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </div>
            )}

            <FormField
                control={form.control}
                name="dates"
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                    <FormLabel>{isHolidayForm ? 'Fecha(s)' : 'Fechas y Horas del Evento'}</FormLabel>
                    <div className="space-y-2">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant={'outline'} type="button" disabled={isHolidayForm && !!eventToEdit}>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Añadir Fecha
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    onSelect={(date) => {
                                        if (date) {
                                            const newStartDate = new Date(date);
                                            const currentTime = field.value.length > 0 ? field.value[0].start : new Date();
                                            newStartDate.setHours(currentTime.getHours(), currentTime.getMinutes());
                                            
                                            if (!field.value.some(d => isSameDay(d.start, newStartDate))) {
                                                const newEndDate = addHours(newStartDate, 1);
                                                const sortedDates = [...field.value, {start: newStartDate, end: newEndDate}].sort((a, b) => a.start.getTime() - b.start.getTime());
                                                field.onChange(isHolidayForm ? [{start: newStartDate, end: newEndDate}] : sortedDates);
                                            }
                                        }
                                    }}
                                    initialFocus
                                    locale={es}
                                />
                            </PopoverContent>
                        </Popover>

                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {field.value.map((item, index) => (
                                <div key={index} className="flex flex-col gap-2 rounded-md border p-2 text-sm">
                                    <div className="flex items-center justify-between">
                                    <span>{format(item.start, 'PPP', { locale: es })}</span>
                                    {!isHolidayForm && (
                                        <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => {
                                                    const newDates = field.value.filter((_, i) => i !== index);
                                                    field.onChange(newDates);
                                                }}
                                                disabled={!!eventToEdit}
                                            >
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                    )}
                                    </div>
                                    {!isHolidayForm && (
                                        <div className="flex items-center gap-2">
                                        <Input
                                                type="time"
                                                className="h-8"
                                                value={format(item.start, 'HH:mm')}
                                                onChange={(e) => {
                                                    const [hours, minutes] = e.target.value.split(':').map(Number);
                                                    const newDates = [...field.value];
                                                    newDates[index].start.setHours(hours, minutes);
                                                    field.onChange(newDates);
                                                }}
                                        />
                                        <span className="text-muted-foreground">-</span>
                                        <div className="w-full">
                                                <Input
                                                    type="time"
                                                    className="h-8"
                                                    value={format(item.end, 'HH:mm')}
                                                    onChange={(e) => {
                                                        const [hours, minutes] = e.target.value.split(':').map(Number);
                                                        const newDates = [...field.value];
                                                        newDates[index].end.setHours(hours, minutes);
                                                        form.setValue('dates', newDates, { shouldValidate: true });
                                                    }}
                                                />
                                                {form.formState.errors.dates?.[index]?.end && (
                                                    <p className="text-sm font-medium text-destructive mt-1">
                                                        {form.formState.errors.dates[index]!.end!.message}
                                                    </p>
                                                )}
                                        </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                    <FormMessage />
                    </FormItem>
                )}
                />
            
            {conflictingEvent && (
                <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>¡Atención! Superposición de horario</AlertTitle>
                <AlertDescription>
                    Este horario se superpone con el evento: <br />
                    <span className="font-semibold">"{conflictingEvent.title}"</span>
                    <br />
                    Programado para el {format(conflictingEvent.event_datetime, "PPP 'a las' p", { locale: es })}.
                </AlertDescription>
                </Alert>
            )}

            {!isHolidayForm && (
                <>
                    <FormField
                        control={form.control}
                        name="link"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Enlace (Opcional)</FormLabel>
                            <FormControl>
                            <div className="relative">
                                <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="https://ejemplo.com/info-adicional" className="pl-10" {...field} />
                            </div>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />

                    {canSuggest && (
                        <div className="text-center">
                            <Button type="button" variant="outline" onClick={handleSuggestion} disabled={isSuggesting}>
                                {isSuggesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                {isSuggesting ? 'Generando...' : 'Sugerir descripción con IA'}
                            </Button>
                        </div>
                    )}

                    <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Descripción</FormLabel>
                            <FormControl>
                            <Textarea placeholder="Añade una descripción más detallada..." className="resize-y" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    
                    <Separator />

                    <div className="space-y-4 rounded-lg border p-4">
                        <h3 className="text-base font-medium">Configuración de Recordatorios</h3>
                        <FormField
                        control={form.control}
                        name="reminder.type"
                        render={({ field }) => (
                            <FormItem>
                            <RadioGroup
                                onValueChange={field.onChange}
                                value={field.value}
                                className="grid grid-cols-2 gap-4"
                            >
                                <FormItem>
                                <RadioGroupItem value="simple" id="r-simple" className="peer sr-only" />
                                <Label
                                    htmlFor="r-simple"
                                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                                >
                                    Recordatorio Simple
                                    <span className="text-xs text-muted-foreground mt-1 text-center">Un único aviso.</span>
                                </Label>
                                </FormItem>
                                <FormItem>
                                <RadioGroupItem value="recurring" id="r-recurring" className="peer sr-only" />
                                <Label
                                    htmlFor="r-recurring"
                                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                                >
                                    Recordatorio Recurrente
                                    <span className="text-xs text-muted-foreground mt-1 text-center">Varios avisos.</span>
                                </Label>
                                </FormItem>
                            </RadioGroup>
                            </FormItem>
                        )}
                        />
                        
                        {watchedReminderType === 'simple' && (
                        <FormField
                            control={form.control}
                            name="reminder.timing"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Avisar con antelación</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                        {(Object.keys(reminderTimingTranslations) as ReminderTiming[]).map(timing => (
                                            <SelectItem key={timing} value={timing}>{reminderTimingTranslations[timing]}</SelectItem>
                                        ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        )}

                        {watchedReminderType === 'recurring' && (
                            <div className="space-y-4 pt-2">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="reminder.frequency"
                                        render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Frecuencia</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    <SelectItem value="daily">Diariamente</SelectItem>
                                                    <SelectItem value="weekly">Semanalmente</SelectItem>
                                                    <SelectItem value="monthly">Mensualmente</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                        )}
                                    />
                                    <FormField
                                    control={form.control}
                                    name="reminder.count"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Repetir</FormLabel>
                                            <FormControl>
                                                <Input type="number" min="1" placeholder="Ej: 3" {...field} />
                                            </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                                </div>
                            </div>
                        )}
                        
                        <FormField
                            control={form.control}
                            name="reminder.channels"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Canales de Notificación</FormLabel>
                                <div className="grid grid-cols-2 gap-4 pt-2">
                                        <FormItem className="flex items-center gap-2 space-y-0">
                                            <FormControl>
                                            <Checkbox
                                                checked={field.value?.includes('in_app')}
                                                onCheckedChange={(checked) => {
                                                const newValue = field.value ? [...field.value] : [];
                                                if (checked) {
                                                    newValue.push('in_app');
                                                } else {
                                                    const index = newValue.indexOf('in_app');
                                                    if (index > -1) newValue.splice(index, 1);
                                                }
                                                field.onChange(newValue);
                                                }}
                                            />
                                            </FormControl>
                                            <Label className="font-normal flex items-center gap-1.5"><BellRing className="h-4 w-4" /> En la App</Label>
                                        </FormItem>
                                        <FormItem className="flex items-center gap-2 space-y-0">
                                            <FormControl>
                                                <Checkbox
                                                    checked={field.value?.includes('push')}
                                                    onCheckedChange={(checked) => {
                                                        const newValue = field.value ? [...field.value] : [];
                                                        if (checked) {
                                                            newValue.push('push');
                                                        } else {
                                                            const index = newValue.indexOf('push');
                                                            if (index > -1) newValue.splice(index, 1);
                                                        }
                                                        field.onChange(newValue);
                                                    }}
                                                />
                                            </FormControl>
                                            <Label className="font-normal flex items-center gap-1.5"><Smartphone className="h-4 w-4" /> Push</Label>
                                        </FormItem>
                                        <FormItem className="flex items-center gap-2 space-y-0">
                                            <FormControl>
                                                <Checkbox
                                                    checked={field.value?.includes('email')}
                                                    onCheckedChange={(checked) => {
                                                        const newValue = field.value ? [...field.value] : [];
                                                        if (checked) {
                                                            newValue.push('email');
                                                        } else {
                                                            const index = newValue.indexOf('email');
                                                            if (index > -1) newValue.splice(index, 1);
                                                        }
                                                        field.onChange(newValue);
                                                    }}
                                                />
                                            </FormControl>
                                            <Label className="font-normal flex items-center gap-1.5"><Mail className="h-4 w-4" /> Email</Label>
                                        </FormItem>
                                        <FormItem className="flex items-center gap-2 space-y-0">
                                            <FormControl>
                                                <Checkbox
                                                    checked={field.value?.includes('whatsapp')}
                                                    onCheckedChange={(checked) => {
                                                        const newValue = field.value ? [...field.value] : [];
                                                        if (checked) {
                                                            newValue.push('whatsapp');
                                                        } else {
                                                            const index = newValue.indexOf('whatsapp');
                                                            if (index > -1) newValue.splice(index, 1);
                                                        }
                                                        field.onChange(newValue);
                                                    }}
                                                />
                                            </FormControl>
                                            <Label className="font-normal flex items-center gap-1.5"><MessageSquare className="h-4 w-4" /> WhatsApp</Label>
                                        </FormItem>
                                        <FormItem className="flex items-center gap-2 space-y-0">
                                            <FormControl>
                                                <Checkbox
                                                    checked={field.value?.includes('telegram')}
                                                    onCheckedChange={(checked) => {
                                                        const newValue = field.value ? [...field.value] : [];
                                                        if (checked) {
                                                            newValue.push('telegram');
                                                        } else {
                                                            const index = newValue.indexOf('telegram');
                                                            if (index > -1) newValue.splice(index, 1);
                                                        }
                                                        field.onChange(newValue);
                                                    }}
                                                />
                                            </FormControl>
                                            <Label className="font-normal flex items-center gap-1.5"><Send className="h-4 w-4" /> Telegram</Label>
                                        </FormItem>
                                    </div>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </>
            )}
          </div>

          <DialogFooter className="flex-shrink-0">
            <Button type="button" variant="ghost" onClick={onFinished}>Cancelar</Button>
            <Button type="submit">{eventToEdit ? 'Guardar Cambios' : 'Crear Evento'}</Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}

function UrlScanPopover({ onScan, isScanning, disabled }: { onScan: (url: string) => void; isScanning: boolean; disabled: boolean; }) {
  const [url, setUrl] = React.useState('');
  const [isOpen, setIsOpen] = React.useState(false);

  const handleScanClick = () => {
    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      onScan(url);
      setIsOpen(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
            <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled}
            >
                <Link className="mr-2 h-4 w-4" />
                Desde URL
            </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
            <div className="grid gap-4">
                <div className="space-y-2">
                    <h4 className="font-medium leading-none">Añadir desde Enlace Web</h4>
                    <p className="text-sm text-muted-foreground">
                        Pega el enlace a una página de evento para extraer los detalles.
                    </p>
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="scan-url">URL del Evento</Label>
                    <Input id="scan-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://ejemplo.com/mi-evento" />
                </div>
                <Button onClick={handleScanClick} disabled={isScanning || !url}>
                    {isScanning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Escanear URL
                </Button>
            </div>
        </PopoverContent>
    </Popover>
  );
}

function AudioInputDialog({ 
    isOpen, 
    onOpenChange, 
    onScan 
}: { 
    isOpen: boolean; 
    onOpenChange: (isOpen: boolean) => void; 
    onScan: (audioDataUri: string) => void; 
}) {
    const { toast } = useToast();
    const [isRecording, setIsRecording] = React.useState(false);
    const [hasPermission, setHasPermission] = React.useState<boolean | null>(null);
    const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
    const audioChunksRef = React.useRef<Blob[]>([]);

    React.useEffect(() => {
        if (isOpen && hasPermission === null) {
            navigator.mediaDevices.getUserMedia({ audio: true })
                .then(stream => {
                    setHasPermission(true);
                    mediaRecorderRef.current = new MediaRecorder(stream);

                    mediaRecorderRef.current.ondataavailable = (event) => {
                        audioChunksRef.current.push(event.data);
                    };

                    mediaRecorderRef.current.onstop = () => {
                        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                        const reader = new FileReader();
                        reader.readAsDataURL(audioBlob);
                        reader.onloadend = () => {
                            const base64data = reader.result as string;
                            onScan(base64data);
                        };
                        audioChunksRef.current = [];
                        // Clean up the stream
                        stream.getTracks().forEach(track => track.stop());
                    };
                })
                .catch(err => {
                    console.error("Error getting mic permission:", err);
                    setHasPermission(false);
                    toast({
                        variant: 'destructive',
                        title: 'Permiso de Micrófono Denegado',
                        description: 'Por favor, habilita el acceso al micrófono en la configuración de tu navegador.',
                    });
                });
        }
    }, [isOpen, hasPermission, onScan, toast]);

    const handleToggleRecording = () => {
        if (isRecording) {
            mediaRecorderRef.current?.stop();
        } else {
            mediaRecorderRef.current?.start();
        }
        setIsRecording(!isRecording);
    };
    
    // Reset state when dialog closes
    const handleOpenChange = (open: boolean) => {
        if (!open) {
            if (isRecording) {
                mediaRecorderRef.current?.stop();
            }
            setIsRecording(false);
            setHasPermission(null);
            audioChunksRef.current = [];
        }
        onOpenChange(open);
    }
    
    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Crear Evento por Voz</DialogTitle>
                    <DialogDescription>
                        {isRecording 
                            ? "Habla ahora. Di los detalles del evento claramente."
                            : "Presiona 'Grabar' y dicta los detalles del evento. Por ejemplo: 'Examen de Física el 25 de junio a las 10 am'."}
                    </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col items-center justify-center py-8 gap-4">
                    {hasPermission === null && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            <span>Solicitando permiso del micrófono...</span>
                        </div>
                    )}
                    {hasPermission === false && (
                         <Alert variant="destructive">
                            <AlertTitle>Acceso Denegado</AlertTitle>
                            <AlertDescription>
                                No se puede grabar sin acceso al micrófono.
                            </AlertDescription>
                        </Alert>
                    )}
                     {hasPermission && (
                        <>
                            {isRecording && (
                                <div className="flex items-center gap-2 text-destructive mb-4">
                                    <div className="w-3 h-3 rounded-full bg-destructive animate-pulse"></div>
                                    <span>Grabando...</span>
                                </div>
                            )}
                            <Button 
                                size="lg" 
                                variant={isRecording ? 'destructive' : 'default'}
                                onClick={handleToggleRecording}
                                className="w-48"
                            >
                                <Mic className="mr-2 h-5 w-5" />
                                {isRecording ? 'Detener Grabación' : 'Iniciar Grabación'}
                            </Button>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

    
