
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, setHours, setMinutes } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { Calendar as CalendarIcon, Link as LinkIcon, BellRing, MessageSquare, Send, Smartphone, Mail } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useApp } from '@/contexts/app-context';
import type { FollowUpTask, ReminderTiming } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
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


const taskFormSchema = z.object({
  title: z.string().min(3, 'El título debe tener al menos 3 caracteres.'),
  notes: z.string().optional(),
  dueDate: z.date().optional(),
  dueTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Formato de hora inválido.').optional(),
  priority: z.enum(['urgent', 'high', 'normal', 'low']),
  link: z.string().url('Debe ser una URL válida.').optional().or(z.literal('')),
  reminder: reminderSchema,
}).refine(data => {
    // If dueTime is set, dueDate must also be set.
    return !data.dueTime || !!data.dueDate;
}, {
    message: 'Se requiere una fecha si se especifica una hora.',
    path: ['dueDate'],
});


type TaskFormValues = z.infer<typeof taskFormSchema>;

interface TaskFormProps {
  taskToEdit?: FollowUpTask | null;
  onFinished: () => void;
}

const priorityTranslations: Record<FollowUpTask['priority'], string> = {
  urgent: 'Urgente',
  high: 'Prioritario',
  normal: 'De rutina',
  low: 'Largo plazo',
};

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


export function FollowUpTaskForm({ taskToEdit, onFinished }: TaskFormProps) {
  const { addFollowUpTask, updateFollowUpTask } = useApp();
  const { toast } = useToast();

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: taskToEdit 
        ? {
            title: taskToEdit.title,
            notes: taskToEdit.notes,
            dueDate: taskToEdit.dueDate ? new Date(taskToEdit.dueDate) : undefined,
            dueTime: taskToEdit.dueDate ? format(new Date(taskToEdit.dueDate), 'HH:mm') : '',
            priority: taskToEdit.priority,
            link: taskToEdit.link || '',
            reminder: taskToEdit.reminder || { type: 'simple', timing: '1d', channels: ['in_app'] },
        }
        : {
            title: '',
            notes: '',
            dueTime: '',
            priority: 'normal',
            link: '',
            reminder: { type: 'simple', timing: '1d', channels: ['in_app'], frequency: 'daily', count: 1 },
    },
  });
  
  const watchedReminderType = form.watch('reminder.type');

  const onSubmit = (data: TaskFormValues) => {
    let finalDueDate: Date | undefined = undefined;
    if (data.dueDate) {
        if (data.dueTime) {
            const [hours, minutes] = data.dueTime.split(':').map(Number);
            finalDueDate = setMinutes(setHours(data.dueDate, hours), minutes);
        } else {
            finalDueDate = data.dueDate;
        }
    }

    const taskData: Omit<FollowUpTask, 'id' | 'status' | 'createdAt'> = {
      title: data.title,
      notes: data.notes || '',
      dueDate: finalDueDate,
      priority: data.priority,
      link: data.link,
      reminder: data.reminder,
      originalEventId: taskToEdit?.originalEventId,
      originalEventTitle: taskToEdit?.originalEventTitle,
      originalEventDate: taskToEdit?.originalEventDate,
    };

    if (taskToEdit) {
        updateFollowUpTask({ ...taskToEdit, ...taskData });
        toast({ title: 'Tarea actualizada', description: 'La tarea ha sido modificada.' });
    } else {
        addFollowUpTask(taskData);
        toast({ title: 'Tarea añadida', description: 'La nueva tarea ha sido añadida a tu lista de seguimiento.' });
    }

    onFinished();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Título de la Tarea</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Preparar material para la clase de Física" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
         <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción / Notas (Opcional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Añade detalles, pasos a seguir, o cualquier información relevante aquí." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Fecha Límite (Opcional)</FormLabel>
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
             <FormField
                control={form.control}
                name="dueTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hora Límite (Opcional)</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
            />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Prioridad</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {(Object.keys(priorityTranslations) as Array<keyof typeof priorityTranslations>).map(p => (
                            <SelectItem key={p} value={p}>{priorityTranslations[p]}</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="link"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Enlace (Opcional)</FormLabel>
                    <FormControl>
                    <div className="relative">
                        <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="https://ejemplo.com" className="pl-10" {...field} />
                    </div>
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
        </div>

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
                      <RadioGroupItem value="simple" id="t-r-simple" className="peer sr-only" />
                      <Label
                        htmlFor="t-r-simple"
                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                      >
                        Recordatorio Simple
                        <span className="text-xs text-muted-foreground mt-1 text-center">Un solo aviso.</span>
                      </Label>
                    </FormItem>
                    <FormItem>
                      <RadioGroupItem value="recurring" id="t-r-recurring" className="peer sr-only" />
                      <Label
                        htmlFor="t-r-recurring"
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
                        <FormLabel>Repetir (veces)</FormLabel>
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
        
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="ghost" onClick={onFinished}>Cancelar</Button>
          <Button type="submit">{taskToEdit ? 'Guardar Cambios' : 'Añadir Tarea'}</Button>
        </div>
      </form>
    </Form>
  );
}
