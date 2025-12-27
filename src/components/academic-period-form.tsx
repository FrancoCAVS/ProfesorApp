
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { Calendar as CalendarIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useApp } from '@/contexts/app-context';
import type { AcademicPeriod } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';
import { Separator } from './ui/separator';

const periodSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres.'),
  type: z.enum(['vacation', 'exam_period', 'class_period', 'other', 'exam_period_annual'], { required_error: 'Debe seleccionar un tipo de periodo.' }),
  periodType: z.enum(['anual', 'first_semester', 'second_semester']).optional(),
  startDate: z.date({ required_error: 'Se requiere una fecha de inicio.' }),
  endDate: z.date({ required_error: 'Se requiere una fecha de fin.' }),
  level: z.enum(['secundario', 'superior_no_universitario', 'superior_universitario', 'all']),
}).refine((data) => data.endDate >= data.startDate, {
  message: 'La fecha de fin debe ser posterior o igual a la fecha de inicio.',
  path: ['endDate'],
}).refine((data) => data.type !== 'class_period' || !!data.periodType, {
  message: 'Debe especificar la duración del periodo lectivo.',
  path: ['periodType'],
});


type PeriodFormValues = z.infer<typeof periodSchema>;

interface AcademicPeriodFormProps {
  periodToEdit?: AcademicPeriod | null;
  onFinished: () => void;
}

const periodTypeTranslations: Record<AcademicPeriod['type'], string> = {
  vacation: 'Vacaciones / Receso',
  exam_period: 'Período de Exámenes (durante cursado)',
  class_period: 'Período Lectivo',
  other: 'Otro',
  exam_period_annual: 'Periodo de Exámenes (sin clases)'
};

export function AcademicPeriodForm({ periodToEdit, onFinished }: AcademicPeriodFormProps) {
  const { addAcademicPeriod, updateAcademicPeriod } = useApp();
  const { toast } = useToast();

  const form = useForm<PeriodFormValues>({
    resolver: zodResolver(periodSchema),
    defaultValues: periodToEdit 
    ? {
        ...periodToEdit,
        level: periodToEdit.level ?? 'all',
        periodType: periodToEdit.periodType ?? undefined,
      } 
    : {
      name: '',
      type: 'class_period',
      startDate: undefined,
      endDate: undefined,
      level: 'secundario',
      periodType: 'anual',
    },
  });

  const watchedType = form.watch('type');
  const watchedLevel = form.watch('level');

  const onSubmit = (data: PeriodFormValues) => {
    // Ensure periodType is only set for class_period
    const finalData: Omit<AcademicPeriod, 'id'> = {
        ...data,
        periodType: data.type === 'class_period' ? data.periodType : undefined,
    };
    
    if (periodToEdit) {
      updateAcademicPeriod({ ...periodToEdit, ...finalData });
      toast({ title: 'Periodo actualizado', description: 'El periodo lectivo ha sido guardado.' });
    } else {
      addAcademicPeriod(finalData);
      toast({ title: 'Periodo creado', description: 'El nuevo periodo lectivo ha sido añadido.' });
    }
    onFinished();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del Periodo</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Ciclo Lectivo 2024" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Periodo</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un tipo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {(Object.keys(periodTypeTranslations) as (keyof typeof periodTypeTranslations)[]).map((type) => {
                    return <SelectItem key={type} value={type}>{periodTypeTranslations[type]}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {watchedType === 'class_period' && (
          <>
            <Separator />
            <FormField
              control={form.control}
              name="periodType"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Duración del Periodo Lectivo</FormLabel>
                  <FormDescription>
                    Indica si este periodo corresponde a todo el año, o a un cuatrimestre específico.
                  </FormDescription>
                  <FormControl>
                     <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="flex flex-col sm:flex-row sm:space-x-4 pt-2"
                    >
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl><RadioGroupItem value="anual" /></FormControl>
                        <Label className="font-normal">Anual</Label>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl><RadioGroupItem value="first_semester" /></FormControl>
                        <Label className="font-normal">1er Cuatrimestre</Label>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl><RadioGroupItem value="second_semester" /></FormControl>
                        <Label className="font-normal">2do Cuatrimestre</Label>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Separator />
          </>
        )}
        
        <FormField
            control={form.control}
            name="level"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel>Nivel Aplicable</FormLabel>
                <FormControl>
                   <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value}
                    className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-2"
                  >
                    <FormItem className="flex items-center space-x-2 space-y-0">
                      <FormControl><RadioGroupItem value="all" /></FormControl>
                      <Label className="font-normal">Todos los niveles</Label>
                    </FormItem>
                    <FormItem className="flex items-center space-x-2 space-y-0">
                      <FormControl><RadioGroupItem value="secundario" /></FormControl>
                      <Label className="font-normal">Secundario</Label>
                    </FormItem>
                    <FormItem className="flex items-center space-x-2 space-y-0">
                      <FormControl><RadioGroupItem value="superior_no_universitario" /></FormControl>
                      <Label className="font-normal">Superior (No Uni)</Label>
                    </FormItem>
                     <FormItem className="flex items-center space-x-2 space-y-0">
                      <FormControl><RadioGroupItem value="superior_universitario" /></FormControl>
                      <Label className="font-normal">Superior (Uni)</Label>
                    </FormItem>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
        />
        

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Fecha de Inicio</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={'outline'}
                        className={cn('w-full pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}
                      >
                        {field.value ? format(field.value, 'P', { locale: es }) : <span>Elige una fecha</span>}
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
            name="endDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Fecha de Fin</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={'outline'}
                        className={cn('w-full pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}
                      >
                        {field.value ? format(field.value, 'P', { locale: es }) : <span>Elige una fecha</span>}
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
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="ghost" onClick={onFinished}>Cancelar</Button>
          <Button type="submit">{periodToEdit ? 'Guardar Cambios' : 'Crear Periodo'}</Button>
        </div>
      </form>
    </Form>
  );
}
