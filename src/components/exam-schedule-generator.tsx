
'use client';

import * as React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { Calendar as CalendarIcon, PlusCircle, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useApp } from '@/contexts/app-context';
import type { Subject, Event, EventType as EventTypeEnum } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Separator } from './ui/separator';
import { Card, CardContent } from './ui/card';

const examEntrySchema = z.object({
  id: z.string(),
  turnName: z.string().min(3, 'El turno es obligatorio.'),
  instanceType: z.string().min(1, "Debes seleccionar un tipo de instancia."),
  date: z.date({ required_error: "Se requiere una fecha." }),
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Hora inválida"),
  notificationDate: z.date().optional(),
});

const examScheduleSchema = z.object({
  year: z.coerce.number(),
  exams: z.array(examEntrySchema).min(1, 'Debes añadir al menos una fecha de examen.'),
});

type ExamScheduleFormValues = z.infer<typeof examScheduleSchema>;

const combineDateTime = (date: Date, time: string): Date => {
    const [hours, minutes] = time.split(':').map(Number);
    const newDate = new Date(date);
    newDate.setHours(hours, minutes, 0, 0);
    return newDate;
};

const eventTypeTranslations: Record<string, string> = {
    EXAM_PARCIAL: 'Examen Parcial',
    EXAM_RECUPERATORIO: 'Examen Recuperatorio',
    EXAM_FINAL_PRIMER_LLAMADO: 'Examen Final (1er Llamado)',
    EXAM_FINAL_SEGUNDO_LLAMADO: 'Examen Final (2do Llamado)',
    EXAM_REGULAR: 'Alumnos Regulares',
    EXAM_LIBRE: 'Alumnos Pendientes/Previos/Libres',
    EXAM_COMPLETAR_CARRERA: 'Alumnos para Completar Carrera',
};


export function ExamScheduleGenerator({ subjects, onFinished }: { subjects: Subject[], onFinished: () => void }) {
  const { addMultipleEvents } = useApp();
  const { toast } = useToast();

  if (!subjects || subjects.length === 0) return null;

  const level = subjects[0].level.startsWith('superior') ? 'Superior' : 'Secundario';
  
  const form = useForm<ExamScheduleFormValues>({
    resolver: zodResolver(examScheduleSchema),
    defaultValues: {
      year: new Date().getFullYear(),
      exams: [],
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "exams",
  });
  
  const onSubmit = (data: ExamScheduleFormValues) => {
    const eventsToAdd: Omit<Event, 'id' | 'status'>[] = [];
    
    const getBaseDescription = (turnName: string, year: number, notificationDate?: Date) => {
        let description = `Turno: ${turnName} - Año: ${year}\n`;
        if (notificationDate) {
            description += `Fecha de Notificación: ${format(notificationDate, 'PPP', { locale: es })}\n`;
        }
        return description.trim();
    };

    subjects.forEach(subject => {
      data.exams.forEach(exam => {
        const eventType = exam.instanceType as EventTypeEnum;
        
        eventsToAdd.push({
          title: subject.name,
          event_type: eventType,
          event_datetime: combineDateTime(exam.date, exam.time),
          description: getBaseDescription(exam.turnName, data.year, exam.notificationDate),
          reminder: { type: 'simple', timing: '2d', channels: ['in_app'] },
          subject_id: subject.id,
        });
      });
    });
    
    if (eventsToAdd.length > 0) {
        addMultipleEvents(eventsToAdd);
        toast({
            title: "Mesas de Examen Generadas",
            description: `Se han añadido ${eventsToAdd.length} evento(s) de examen a tu calendario.`
        });
    }

    onFinished();
  };
  
  const yearOptions = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  const availableExamTypes = React.useMemo(() => {
    if (level === 'Superior') {
        return {
            "Llamados Finales": ['EXAM_FINAL_PRIMER_LLAMADO', 'EXAM_FINAL_SEGUNDO_LLAMADO'],
            "Parciales": ['EXAM_PARCIAL', 'EXAM_RECUPERATORIO'],
        };
    }
    return {
        "Instancias": ['EXAM_REGULAR', 'EXAM_LIBRE', 'EXAM_COMPLETAR_CARRERA', 'EXAM_PARCIAL'],
    };
  }, [level]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit, (errors) => console.error('Errores de validación:', errors))} className="space-y-6">
        <div className="flex justify-end">
            <FormField
                control={form.control}
                name="year"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Año Lectivo</FormLabel>
                    <Select onValueChange={(v) => field.onChange(Number(v))} defaultValue={String(field.value)}>
                        <FormControl>
                            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {yearOptions.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
            />
        </div>
        
        <Separator />
        
        <div className="space-y-4">
            <h3 className="text-lg font-medium">Fechas de Examen</h3>
            {fields.map((field, index) => (
                <Card key={field.id} className="p-4 relative">
                    <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-8 w-8" onClick={() => remove(index)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        <FormField
                            control={form.control}
                            name={`exams.${index}.turnName`}
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Turno / Mes</FormLabel>
                                <FormControl>
                                    <Input placeholder="Ej: Diciembre" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name={`exams.${index}.instanceType`}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Instancia</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..."/></SelectTrigger></FormControl>
                                        <SelectContent>
                                            {Object.entries(availableExamTypes).map(([group, types]) => (
                                                <React.Fragment key={group}>
                                                    <Separator />
                                                    <h4 className="px-2 py-1.5 text-sm font-semibold">{group}</h4>
                                                    {types.map(type => (
                                                        <SelectItem key={type} value={type}>{eventTypeTranslations[type]}</SelectItem>
                                                    ))}
                                                </React.Fragment>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name={`exams.${index}.time`}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Hora</FormLabel>
                                    <FormControl><Input type="time" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name={`exams.${index}.date`}
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Fecha</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button variant={'outline'} className={cn('w-full pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}>
                                                    {field.value ? format(field.value, 'PPP', { locale: es }) : <span>Selecciona una fecha</span>}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus locale={es} captionLayout="dropdown-buttons" />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name={`exams.${index}.notificationDate`}
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Fecha Notificación (Opcional)</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button variant={'outline'} className={cn('w-full pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}>
                                                    {field.value ? format(field.value, 'PPP', { locale: es }) : <span>Selecciona una fecha</span>}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus locale={es} captionLayout="dropdown-buttons" />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </Card>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => append({ id: crypto.randomUUID(), turnName: '', instanceType: '', date: new Date(), time: '09:00' })}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Añadir Fecha de Examen
            </Button>
             <FormField control={form.control} name="exams" render={({ field }) => (<FormItem><FormMessage /></FormItem>)} />
        </div>

        <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="ghost" onClick={onFinished}>Cancelar</Button>
            <Button type="submit">Generar Mesas de Examen</Button>
        </div>
      </form>
    </Form>
  );
}
