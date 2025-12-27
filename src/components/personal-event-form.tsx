
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, addHours, setHours, setMinutes } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { Calendar as CalendarIcon, UserPlus, AlertCircle, BellRing, Smartphone, Mail, MessageSquare, Send } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useApp } from '@/contexts/app-context';
import type { Event as EventType, ReminderSettings, ReminderTiming } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';

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


const personalEventSchema = z.object({
  title: z.string().min(3, 'El título debe tener al menos 3 caracteres.'),
  event_type: z.enum(['PERSONAL_APPOINTMENT', 'PERSONAL_TASK']),
  date: z.date({ required_error: 'Se requiere una fecha.' }),
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Formato de hora inválido.').optional(),
  description: z.string().optional(),
  reminder: reminderSchema,
});

type PersonalEventFormValues = z.infer<typeof personalEventSchema>;

interface PersonalEventFormProps {
  eventToEdit?: EventType | null;
  onFinished: () => void;
}

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


export function PersonalEventForm({ eventToEdit, onFinished }: PersonalEventFormProps) {
  const { addEvent, updateEvent, events } = useApp();
  const { toast } = useToast();
  const [conflictingEvent, setConflictingEvent] = React.useState<EventType | null>(null);

  const form = useForm<PersonalEventFormValues>({
    resolver: zodResolver(personalEventSchema),
    defaultValues: eventToEdit
      ? {
          title: eventToEdit.title,
          event_type: (eventToEdit.event_type as 'PERSONAL_APPOINTMENT' | 'PERSONAL_TASK') || 'PERSONAL_TASK',
          date: eventToEdit.event_datetime,
          time: format(eventToEdit.event_datetime, 'HH:mm'),
          description: eventToEdit.description,
          reminder: eventToEdit.reminder || { type: 'simple', timing: '1h', channels: ['in_app'] },
        }
      : {
          title: '',
          event_type: 'PERSONAL_APPOINTMENT',
          date: undefined,
          time: format(new Date(), 'HH:mm'),
          description: '',
          reminder: { type: 'simple', timing: '1h', channels: ['in_app'], frequency: 'daily', count: 1 },
        },
  });

  React.useEffect(() => {
    if (!eventToEdit) {
        form.setValue('date', new Date());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const watchedDate = form.watch('date');
  const watchedTime = form.watch('time');
  const watchedReminderType = form.watch('reminder.type');

  React.useEffect(() => {
    if (!watchedDate || !watchedTime) {
      setConflictingEvent(null);
      return;
    }

    const [hours, minutes] = watchedTime.split(':').map(Number);
    const startDateTime = setMinutes(setHours(watchedDate, hours), minutes);
    const endDateTime = addHours(startDateTime, 1);

    const eventsToCheck = events.filter(e => {
        if (e.status === 'archived') return false;
        if (eventToEdit && e.id === eventToEdit.id) return false;
        return true;
    });

    const foundConflict = eventsToCheck.find(existingEvent => {
        const existingEnd = existingEvent.end_datetime ?? addHours(existingEvent.event_datetime, 1);
        return startDateTime < existingEnd && endDateTime > existingEvent.event_datetime;
    });

    setConflictingEvent(foundConflict || null);

  }, [watchedDate, watchedTime, events, eventToEdit]);

  const onSubmit = (data: PersonalEventFormValues) => {
    const [hours, minutes] = (data.time || '09:00').split(':').map(Number);
    const event_datetime = setMinutes(setHours(data.date, hours), minutes);

    const eventData = {
      title: data.title,
      event_type: data.event_type,
      event_datetime,
      end_datetime: addHours(event_datetime, 1),
      description: data.description || '',
      reminder: data.reminder,
    };

    if (eventToEdit) {
      updateEvent({ ...eventToEdit, ...eventData });
      toast({ title: 'Evento personal actualizado' });
    } else {
      addEvent(eventData);
      toast({ title: 'Evento personal añadido' });
    }
    onFinished();
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          <div className="flex items-center gap-2">
            <UserPlus />
            {eventToEdit ? 'Editar Evento Personal' : 'Añadir Evento Personal'}
          </div>
        </DialogTitle>
        <DialogDescription>
          Añade un evento personal a tu calendario para tener una visión completa de tus compromisos.
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Título</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: Turno médico" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <FormField
                control={form.control}
                name="event_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Evento</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="PERSONAL_APPOINTMENT">Turno / Cita</SelectItem>
                        <SelectItem value="PERSONAL_TASK">Tarea / Trámite</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            <FormField
              control={form.control}
              name="time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hora</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Fecha</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={'outline'}
                          className={cn('w-full pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}
                        >
                          {field.value ? format(field.value, 'PPP', { locale: es }) : <span>Elige una fecha</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus locale={es} />
                    </PopoverContent>
                  </Popover>
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

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descripción (Opcional)</FormLabel>
                <FormControl>
                  <Textarea placeholder="Añade detalles adicionales..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

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
                          <RadioGroupItem value="simple" id="p-r-simple" className="peer sr-only" />
                          <Label
                            htmlFor="p-r-simple"
                            className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                          >
                            Simple
                            <span className="text-xs text-muted-foreground mt-1 text-center">Un solo aviso.</span>
                          </Label>
                        </FormItem>
                        <FormItem>
                          <RadioGroupItem value="recurring" id="p-r-recurring" className="peer sr-only" />
                          <Label
                            htmlFor="p-r-recurring"
                            className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                          >
                           Recurrente
                            <span className="text-xs text-muted-foreground mt-1 text-center">Varios avisos.</span>
                          </Label>
                        </FormItem>
                      </RadioGroup>
                    </FormItem>
                  )}
                />

                {watchedReminderType === 'simple' ? (
                  <FormField
                    control={form.control}
                    name="reminder.timing"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Avisar con antelación</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            {(Object.keys(reminderTimingTranslations) as ReminderTiming[]).map(timing => (
                              <SelectItem key={timing} value={timing}>{reminderTimingTranslations[timing]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                ) : (
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

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onFinished}>Cancelar</Button>
            <Button type="submit">{eventToEdit ? 'Guardar Cambios' : 'Crear Evento'}</Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}
