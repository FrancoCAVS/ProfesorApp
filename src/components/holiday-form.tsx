
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useApp } from '@/contexts/app-context';
import type { Event as EventType } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const holidayFormSchema = z.object({
  title: z.string().min(3, 'El nombre debe tener al menos 3 caracteres.'),
  date: z.date({ required_error: 'Se requiere una fecha.' }),
  type: z.enum(['inamovible', 'trasladable', 'no_laborable']),
  scope: z.enum(['nacional', 'provincial', 'otro']),
});

type HolidayFormValues = z.infer<typeof holidayFormSchema>;

interface HolidayFormProps {
  holidayToEdit?: EventType | null;
  onFinished: () => void;
}

const typeTranslations: Record<HolidayFormValues['type'], string> = {
    inamovible: 'Inamovible',
    trasladable: 'Trasladable',
    no_laborable: 'Día no Laborable',
};

const scopeTranslations: Record<HolidayFormValues['scope'], string> = {
    nacional: 'Nacional',
    provincial: 'Provincial',
    otro: 'Otro',
};

function parseDescription(description: string): Partial<HolidayFormValues> {
    const defaults = {
        type: 'inamovible' as const,
        scope: 'nacional' as const,
    };
    if (!description) return defaults;

    let type: HolidayFormValues['type'] | undefined;
    let scope: HolidayFormValues['scope'] | undefined;

    if (description.includes('Inamovible')) type = 'inamovible';
    if (description.includes('Trasladable')) type = 'trasladable';
    if (description.includes('No Laborable')) type = 'no_laborable';

    if (description.includes('Nacional')) scope = 'nacional';
    if (description.includes('Provincial')) scope = 'provincial';
    if (description.includes('Otro')) scope = 'otro';

    return {
        type: type || defaults.type,
        scope: scope || defaults.scope,
    };
}


export function HolidayForm({ holidayToEdit, onFinished }: HolidayFormProps) {
  const { addEvent, updateEvent } = useApp();
  const { toast } = useToast();
  
  const parsedDesc = holidayToEdit ? parseDescription(holidayToEdit.description) : {};

  const form = useForm<HolidayFormValues>({
    resolver: zodResolver(holidayFormSchema),
    defaultValues: holidayToEdit 
      ? {
          title: holidayToEdit.title,
          date: holidayToEdit.event_datetime,
          type: parsedDesc.type || 'inamovible',
          scope: parsedDesc.scope || 'nacional',
        }
      : {
          title: '',
          date: undefined,
          type: 'inamovible',
          scope: 'nacional',
      },
  });

  React.useEffect(() => {
    if (!holidayToEdit) {
      form.setValue('date', new Date());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = (data: HolidayFormValues) => {
    const description = `Feriado ${scopeTranslations[data.scope]} (${typeTranslations[data.type]})`;
    
    const eventData = {
        title: data.title,
        event_datetime: data.date,
        event_type: 'HOLIDAY' as const,
        description: description,
        reminder: { timing: 'none' as const, channels: [] },
    };

    if (holidayToEdit) {
      updateEvent({ ...holidayToEdit, ...eventData });
      toast({ title: 'Feriado actualizado' });
    } else {
      addEvent(eventData);
      toast({ title: 'Feriado añadido' });
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
              <FormLabel>Nombre del Feriado</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Día del Trabajador" {...field} />
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
        
        <div className="grid grid-cols-2 gap-4">
             <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                      <SelectContent>
                        {(Object.keys(typeTranslations) as Array<keyof typeof typeTranslations>).map(key => (
                            <SelectItem key={key} value={key}>{typeTranslations[key]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="scope"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ámbito</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                      <SelectContent>
                        {(Object.keys(scopeTranslations) as Array<keyof typeof scopeTranslations>).map(key => (
                            <SelectItem key={key} value={key}>{scopeTranslations[key]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="ghost" onClick={onFinished}>Cancelar</Button>
          <Button type="submit">{holidayToEdit ? 'Guardar Cambios' : 'Crear Feriado'}</Button>
        </div>
      </form>
    </Form>
  );
}
