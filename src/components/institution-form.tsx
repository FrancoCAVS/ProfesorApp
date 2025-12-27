
'use client';

import * as React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import type { Institution, Authority, UniversityBody, CareerBody } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';
import { PlusCircle, Trash2 } from 'lucide-react';
import { Separator } from './ui/separator';
import { Card } from './ui/card';

const authoritySchema = z.object({
  id: z.string(),
  role: z.string().min(3, 'El cargo debe tener al menos 3 caracteres.'),
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres.'),
});

const universityBodySchema = z.object({
  id: z.string(),
  type: z.enum(['faculty', 'organism']),
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres.'),
  authorities: z.array(authoritySchema).optional(),
});

const careerBodySchema = z.object({
  id: z.string(),
  name: z.string().min(3, 'El nombre de la carrera debe tener al menos 3 caracteres.'),
  authorities: z.array(authoritySchema).optional(),
});


const institutionSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres.'),
  level: z.enum(['secundario', 'superior_no_universitario', 'superior_universitario'], { required_error: 'Debe seleccionar un nivel.' }),
  schoolNumber: z.string().optional(),
  shifts: z.array(z.string()).optional(),
  authorities: z.array(authoritySchema).optional(),
  universityBodies: z.array(universityBodySchema).optional(),
  careerBodies: z.array(careerBodySchema).optional(),
});

type InstitutionFormValues = z.infer<typeof institutionSchema>;

interface InstitutionFormProps {
  institutionToEdit?: Institution | null;
  onFinished: (institution: Institution) => void;
  onCancel?: () => void;
}

const shiftItems = [
    { id: 'morning', label: 'Mañana' },
    { id: 'afternoon', label: 'Tarde' },
    { id: 'evening', label: 'Vespertino / Noche' },
];


function AuthoritiesManager({ control, name }: { control: any, name: `authorities` | `universityBodies.${number}.authorities` | `careerBodies.${number}.authorities` }) {
    const { fields, append, remove } = useFieldArray({
        control,
        name: name,
    });

    return (
        <div className="space-y-3 pt-3">
             <Label>Autoridades</Label>
             <div className="space-y-3">
                {fields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2 border rounded-md relative">
                       <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7" onClick={() => remove(index)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                        <FormField
                            control={control}
                            name={`${name}.${index}.role`}
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel className="text-xs">Cargo</FormLabel>
                                <FormControl><Input placeholder="Ej: Director/a" {...field} /></FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={control}
                            name={`${name}.${index}.name`}
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel className="text-xs">Nombre y Apellido</FormLabel>
                                <FormControl><Input placeholder="Ej: Lic. Ana Pérez" {...field} /></FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                ))}
            </div>
             <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ id: crypto.randomUUID(), role: '', name: '' })}
            >
                <PlusCircle className="mr-2 h-4 w-4" />
                Añadir Autoridad
            </Button>
        </div>
    );
}


export function InstitutionForm({ institutionToEdit, onFinished, onCancel }: InstitutionFormProps) {
  const { toast } = useToast();

  const form = useForm<InstitutionFormValues>({
    resolver: zodResolver(institutionSchema),
    defaultValues: institutionToEdit 
      ? {
        ...institutionToEdit,
        schoolNumber: institutionToEdit.schoolNumber || '',
        shifts: institutionToEdit.shifts || [],
        authorities: institutionToEdit.authorities || [],
        universityBodies: institutionToEdit.universityBodies || [],
        careerBodies: institutionToEdit.careerBodies || [],
      }
      : {
      name: '',
      level: 'secundario',
      schoolNumber: '',
      shifts: [],
      authorities: [],
      universityBodies: [],
      careerBodies: [],
    },
  });

  const { fields: universityBodyFields, append: appendUniversityBody, remove: removeUniversityBody } = useFieldArray({
    control: form.control,
    name: "universityBodies",
  });
  
   const { fields: careerBodyFields, append: appendCareerBody, remove: removeCareerBody } = useFieldArray({
    control: form.control,
    name: "careerBodies",
  });

  const watchedLevel = form.watch('level');

  const onSubmit = (data: InstitutionFormValues) => {
    const finalData = { ...data, id: institutionToEdit?.id || crypto.randomUUID() };
    toast({ title: institutionToEdit ? 'Institución Actualizada' : 'Institución Creada' });
    onFinished(finalData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit, (errors) => console.error("Errores de validación del formulario de Institución:", errors))} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre de la Institución</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Colegio Nacional de Salta" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="level"
          render={({ field }) => (
              <FormItem className="space-y-3">
              <FormLabel>Nivel Educativo</FormLabel>
              <FormControl>
                  <RadioGroup
                  onValueChange={field.onChange}
                  value={field.value}
                  className="flex flex-col sm:flex-row sm:space-x-4 pt-2"
                  >
                  <FormItem className="flex items-center space-x-2 space-y-0">
                      <FormControl>
                      <RadioGroupItem value="secundario" />
                      </FormControl>
                      <Label className="font-normal">
                      Secundario
                      </Label>
                  </FormItem>
                  <FormItem className="flex items-center space-x-2 space-y-0">
                      <FormControl>
                      <RadioGroupItem value="superior_no_universitario" />
                      </FormControl>
                      <Label className="font-normal">
                      Superior (No Universitario)
                      </Label>
                  </FormItem>
                  <FormItem className="flex items-center space-x-2 space-y-0">
                      <FormControl>
                      <RadioGroupItem value="superior_universitario" />
                      </FormControl>
                      <Label className="font-normal">
                      Superior (Universitario)
                      </Label>
                  </FormItem>
                  </RadioGroup>
              </FormControl>
              <FormMessage />
              </FormItem>
          )}
        />
        
        {watchedLevel === 'secundario' ? (
             <FormField
                control={form.control}
                name="schoolNumber"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Número de Escuela (Opcional)</FormLabel>
                    <FormControl>
                        <Input placeholder="Ej: 4.058" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
        ) : null}

        {watchedLevel === 'superior_universitario' && (
          <div className="space-y-4">
            <Separator />
             <div className="space-y-2">
                <h3 className="text-lg font-medium">Facultades y Organismos</h3>
                <div className="max-h-64 overflow-y-auto space-y-4 pr-2 -mr-2">
                  {universityBodyFields.map((field, index) => (
                      <Card key={field.id} className="p-4 space-y-4 relative">
                          <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={() => removeUniversityBody(index)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>

                          <FormField
                            control={form.control}
                            name={`universityBodies.${index}.type`}
                            render={({ field }) => (
                                <FormItem className="space-y-3">
                                <FormLabel>Tipo</FormLabel>
                                <FormControl>
                                    <RadioGroup onValueChange={field.onChange} value={field.value} className="flex space-x-4">
                                        <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="faculty" /></FormControl><Label className="font-normal">Facultad</Label></FormItem>
                                        <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="organism" /></FormControl><Label className="font-normal">Otro Organismo</Label></FormItem>
                                    </RadioGroup>
                                </FormControl>
                                </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`universityBodies.${index}.name`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Nombre de la Facultad/Organismo</FormLabel>
                                <FormControl><Input placeholder="Ej: Facultad de Ingeniería" {...field} /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <AuthoritiesManager control={form.control} name={`universityBodies.${index}.authorities`} />
                      </Card>
                  ))}
                </div>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => appendUniversityBody({ id: crypto.randomUUID(), type: 'faculty', name: '', authorities: [] })}
                >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Añadir Facultad/Organismo
                </Button>
            </div>
          </div>
        )}

        {watchedLevel === 'superior_no_universitario' && (
          <div className="space-y-4">
            <Separator />
             <div className="space-y-2">
                <h3 className="text-lg font-medium">Carreras</h3>
                 <div className="max-h-64 overflow-y-auto space-y-4 pr-2 -mr-2">
                  {careerBodyFields.map((field, index) => (
                      <Card key={field.id} className="p-4 space-y-4 relative">
                          <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={() => removeCareerBody(index)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                          <FormField
                            control={form.control}
                            name={`careerBodies.${index}.name`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Nombre de la Carrera</FormLabel>
                                <FormControl><Input placeholder="Ej: Tecnicatura en Programación" {...field} /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <AuthoritiesManager control={form.control} name={`careerBodies.${index}.authorities`} />
                      </Card>
                  ))}
                </div>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => appendCareerBody({ id: crypto.randomUUID(), name: '', authorities: [] })}
                >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Añadir Carrera
                </Button>
            </div>
          </div>
        )}
        
        <Separator />
        
        <AuthoritiesManager control={form.control} name="authorities" />

        <Separator />

        <FormField
          control={form.control}
          name="shifts"
          render={() => (
            <FormItem>
              <div className="mb-4">
                <FormLabel className="text-base">Turnos</FormLabel>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-8 gap-4">
                {shiftItems.map((item) => (
                    <FormField
                    key={item.id}
                    control={form.control}
                    name="shifts"
                    render={({ field }) => {
                        return (
                        <FormItem
                            key={item.id}
                            className="flex flex-row items-start space-x-3 space-y-0"
                        >
                            <FormControl>
                            <Checkbox
                                checked={field.value?.includes(item.id)}
                                onCheckedChange={(checked) => {
                                return checked
                                    ? field.onChange([...(field.value || []), item.id])
                                    : field.onChange(
                                        (field.value || []).filter(
                                        (value) => value !== item.id
                                        )
                                    )
                                }}
                            />
                            </FormControl>
                            <Label className="font-normal">
                            {item.label}
                            </Label>
                        </FormItem>
                        )
                    }}
                    />
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex justify-end gap-2 pt-4">
          {onCancel && <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>}
          <Button type="submit">{institutionToEdit ? 'Guardar Cambios' : 'Crear Institución'}</Button>
        </div>
      </form>
    </Form>
  );
}
