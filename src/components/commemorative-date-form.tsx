
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { Calendar as CalendarIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useApp } from '@/contexts/app-context';
import type { Event as EventType } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const commemorativeDateSchema = z.object({
  title: z.string().min(3, 'El nombre debe tener al menos 3 caracteres.'),
  date: z.date({ required_error: 'Se requiere una fecha.' }),
});

type FormValues = z.infer<typeof commemorativeDateSchema>;

interface FormProps {
  dateToEdit?: EventType | null;
  onFinished: () => void;
}

export function CommemorativeDateForm({ dateToEdit, onFinished }: FormProps) {
  const { addEvent, updateEvent } = useApp();
  const { toast } = useToast();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(commemorativeDateSchema),
    defaultValues: dateToEdit 
      ? {
          title: dateToEdit.title,
          date: dateToEdit.event_datetime,
        }
      : {
          title: '',
          date: undefined,
      },
  });

  React.useEffect(() => {
    if (!dateToEdit) {
      form.setValue('date', new Date());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = (data: FormValues) => {
    const eventData = {
        title: data.title,
        event_datetime: data.date,
        event_type: 'COMMEMORATIVE' as const,
        description: `Fecha conmemorativa: ${data.title}`,
        reminder: { timing: '1d' as const, channels: ['in_app'] as const },
    };

    if (dateToEdit) {
      updateEvent({ ...dateToEdit, ...eventData });
      toast({ title: 'Fecha actualizada' });
    } else {
      addEvent(eventData);
      toast({ title: 'Fecha añadida' });
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
              <FormLabel>Nombre de la Fecha</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Día del Estudiante" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
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
        
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="ghost" onClick={onFinished}>Cancelar</Button>
          <Button type="submit">{dateToEdit ? 'Guardar Cambios' : 'Crear Fecha'}</Button>
        </div>
      </form>
    </Form>
  );
}
