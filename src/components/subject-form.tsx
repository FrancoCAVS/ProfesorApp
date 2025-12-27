
'use client';

import * as React from 'react';
import { useForm, useFieldArray, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PlusCircle, Trash2, Save, Sparkles, Check, AlertTriangle, Printer, BrainCircuit, BookOpen, Clock, Users, GraduationCap, CalendarOff } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useApp } from '@/contexts/app-context';
import type { Subject, SubjectProgram, Unit, SecondaryOrientation, Event as EventType } from '@/lib/types';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Separator } from './ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Textarea } from './ui/textarea';
import type { AcademicPeriod, Institution } from '@/lib/types';
import { InstitutionForm } from './institution-form';
import { useToast } from '../hooks/use-toast';
import { suggestActivities } from '@/ai/flows/suggest-activities-flow';
import { analyzeUnitContent, type AnalyzeUnitContentOutput } from '@/ai/flows/analyze-unit-content-flow';
import { Loader2 } from 'lucide-react';
import { Checkbox } from './ui/checkbox';
import { X } from 'lucide-react';
import { Slider } from './ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { eachDayOfInterval, isWithinInterval, isSameDay, differenceInMinutes, parse, format } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { Badge } from './ui/badge';


const scheduleEntrySchema = z.object({
  day: z.coerce.number().min(1).max(6),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Formato inválido'),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Formato inválido'),
});

const classGroupSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "El nombre es obligatorio."),
  schedule: z.array(scheduleEntrySchema).optional(),
  cathedraHours: z.coerce.number().min(0, "Debe ser un número positivo.").optional(),
  secondaryOrientation: z.string().optional(),
});

const examDateSchema = z.object({
    id: z.string(),
    instance: z.string().min(1, 'El nombre es obligatorio.'),
    date: z.date().nullable().optional(),
});

const unitSchema = z.object({
    id: z.string(),
    name: z.string().min(1, 'El nombre de la unidad es obligatorio.'),
    topics: z.array(z.string()).min(1, 'Debe haber al menos un tema por unidad.'),
});

const activitySchema = z.object({
  value: z.string(),
});

const subjectProgramSchema = z.object({
    methodology: z.string().optional(),
    units: z.array(unitSchema).optional(),
    activities: z.array(activitySchema).optional(),
    examDates: z.array(examDateSchema).optional(),
});

const subjectSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres.'),
  level: z.enum(['secundario', 'superior_no_universitario', 'superior_universitario'], { required_error: 'Debes seleccionar un nivel.' }),
  color: z.string().regex(/^hsl\(\d{1,3} \d{1,3}% \d{1,3}%\)$/, 'Color HSL inválido'),
  institution: z.string().min(1, 'El nombre de la institución es obligatorio.'),
  year: z.string().min(1, 'El año es obligatorio.'),
  class_groups: z.array(classGroupSchema).min(1, "Debe haber al menos una división o comisión."),
  
  role: z.string().optional(),
  roleStartDate: z.date().nullable().optional(),
  
  academicPeriodId: z.string().min(1, 'Debes seleccionar un periodo lectivo.'),
  
  notes: z.string().optional(),
  
  // Specific to 'Superior'
  career: z.string().optional(),
  
  // New fields for program customization
  program: subjectProgramSchema.optional(),

}).superRefine((data, ctx) => {
  if (data.level.startsWith('superior')) {
    if (!data.career || data.career.trim().length < 3) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['career'], message: 'La carrera es obligatoria.' });
    }
  }
  if (data.class_groups) {
    data.class_groups.forEach((group, groupIndex) => {
      if (group.schedule) {
        group.schedule.forEach((entry, scheduleIndex) => {
          if (entry.startTime && entry.endTime && entry.startTime >= entry.endTime) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: [`class_groups`, groupIndex, 'schedule', scheduleIndex, 'endTime'], message: 'Debe ser posterior al inicio.' });
          }
        });
      }
    });
  }
});

type SubjectFormValues = z.infer<typeof subjectSchema>;

interface SubjectFormProps {
  subjectToEdit: Subject | null;
  onFinished: (data?: Subject) => void;
  formMode?: 'basic' | 'program' | 'full' | 'split';
}

const colorPalette = [
  'hsl(210 100% 50%)',
  'hsl(150 100% 40%)',
  'hsl(30 100% 50%)',
  'hsl(300 100% 50%)',
  'hsl(50 100% 50%)',
  'hsl(0 100% 60%)',
];


function ClassGroupSchedule({ control, groupIndex }: { control: any, groupIndex: number }) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `class_groups.${groupIndex}.schedule`,
  });

  return (
    <div className="space-y-3 pt-3">
      <div className="space-y-3">
        {fields.map((item, scheduleIndex) => (
          <div key={item.id} className="flex flex-col sm:flex-row sm:items-end gap-2 p-2 border rounded-md">
            <FormField
              control={control}
              name={`class_groups.${groupIndex}.schedule.${scheduleIndex}.day`}
              render={({ field }) => (
                <FormItem className="flex-grow">
                  <Label className="text-xs">Día</Label>
                  <Select onValueChange={field.onChange} defaultValue={String(field.value)}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="1">Lunes</SelectItem>
                      <SelectItem value="2">Martes</SelectItem>
                      <SelectItem value="3">Miércoles</SelectItem>
                      <SelectItem value="4">Jueves</SelectItem>
                      <SelectItem value="5">Viernes</SelectItem>
                      <SelectItem value="6">Sábado</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name={`class_groups.${groupIndex}.schedule.${scheduleIndex}.startTime`}
              render={({ field }) => (
                <FormItem className="w-full sm:w-auto">
                  <Label className="text-xs">Inicio</Label>
                  <FormControl><Input type="time" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name={`class_groups.${groupIndex}.schedule.${scheduleIndex}.endTime`}
              render={({ field }) => (
                <FormItem className="w-full sm:w-auto">
                  <Label className="text-xs">Fin</Label>
                  <FormControl><Input type="time" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="button" variant="ghost" size="icon" className="shrink-0 self-center sm:self-end" onClick={() => remove(scheduleIndex)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => append({ day: 1, startTime: '08:00', endTime: '10:00' })}
      >
        <PlusCircle className="mr-2 h-4 w-4" />
        Añadir Horario
      </Button>
    </div>
  );
}

function EditableActivityItem({ value, onUpdate, onRemove }: { value: string; onUpdate: (newValue: string) => void; onRemove: () => void; }) {
    const [isEditing, setIsEditing] = React.useState(false);
    const [currentValue, setCurrentValue] = React.useState(value);
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);

    React.useEffect(() => {
        if (isEditing && textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.select();
            autoResizeTextarea();
        }
    }, [isEditing]);

    const autoResizeTextarea = () => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    };

    const handleSave = () => {
        if (currentValue.trim() && currentValue.trim() !== value) {
            onUpdate(currentValue.trim());
        } else {
            setCurrentValue(value);
        }
        setIsEditing(false);
    };
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSave();
        } else if (e.key === 'Escape') {
            setCurrentValue(value);
            setIsEditing(false);
        }
    };

    return (
        <div className="flex items-start gap-2 p-2 rounded-md hover:bg-accent/50">
            {isEditing ? (
                <Textarea
                    ref={textareaRef}
                    value={currentValue}
                    onChange={(e) => {
                        setCurrentValue(e.target.value);
                        autoResizeTextarea();
                    }}
                    onBlur={handleSave}
                    onKeyDown={handleKeyDown}
                    className="h-auto flex-1 text-sm resize-none"
                    rows={1}
                />
            ) : (
                <p
                    onClick={() => setIsEditing(true)}
                    className="flex-1 cursor-pointer text-sm whitespace-pre-wrap py-2"
                    title="Clic para editar"
                >
                    {value}
                </p>
            )}
            <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 mt-1 shrink-0"
                onClick={onRemove}
            >
                <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
            </Button>
        </div>
    );
}


function ActivitiesManager({ control, name, label, placeholder, onSuggest }: { control: any; name: string; label: string; placeholder: string; onSuggest: (detailLevel: number, specificity: number) => Promise<string[]> }) {
    const { fields, append, remove, update } = useFieldArray({ control, name });
    const [inputValue, setInputValue] = React.useState('');
    const [isSuggesting, setIsSuggesting] = React.useState(false);
    const [suggestions, setSuggestions] = React.useState<string[]>([]);
    const [isSuggestionsOpen, setIsSuggestionsOpen] = React.useState(false);
    const [selectedSuggestions, setSelectedSuggestions] = React.useState<Set<string>>(new Set());
    const [detailLevel, setDetailLevel] = React.useState([50]);
    const [specificity, setSpecificity] = React.useState([50]);
    const { toast } = useToast();

    const handleSuggestClick = async () => {
        setIsSuggesting(true);
        try {
            const result = await onSuggest(detailLevel[0], specificity[0]);
            if (result && result.length > 0) {
                setSuggestions(result);
                setSelectedSuggestions(new Set(result));
                setIsSuggestionsOpen(true);
            } else {
                toast({ variant: 'destructive', title: 'No se encontraron sugerencias.' });
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error al obtener sugerencias.' });
        } finally {
            setIsSuggesting(false);
        }
    };

    const handleAddSuggestions = () => {
        const currentActivities = new Set((fields as { value: string }[]).map((f) => f.value));
        const activitiesToAdd = Array.from(selectedSuggestions).filter(s => !currentActivities.has(s));
        activitiesToAdd.forEach(activity => append({ value: activity }));
        setIsSuggestionsOpen(false);
    };

    const handleAppend = () => {
        if (inputValue.trim()) {
            append({ value: inputValue.trim() });
            setInputValue('');
        }
    };

    return (
        <div className="space-y-4">
            <Dialog open={isSuggestionsOpen} onOpenChange={setIsSuggestionsOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Sugerencias de Actividades</DialogTitle>
                        <DialogDescription>Selecciona las actividades que deseas añadir a tu programa.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 max-h-80 overflow-y-auto p-1">
                        {suggestions.map((suggestion, index) => (
                            <div key={index} className="flex items-center space-x-2 p-2 rounded-md hover:bg-accent">
                                <Checkbox
                                    id={`suggestion-${index}`}
                                    checked={selectedSuggestions.has(suggestion)}
                                    onCheckedChange={(checked) => {
                                        const newSet = new Set(selectedSuggestions);
                                        if (checked) newSet.add(suggestion); else newSet.delete(suggestion);
                                        setSelectedSuggestions(newSet);
                                    }}
                                />
                                <Label htmlFor={`suggestion-${index}`} className="font-normal">{suggestion}</Label>
                            </div>
                        ))}
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsSuggestionsOpen(false)}>Cancelar</Button>
                        <Button onClick={handleAddSuggestions}>Añadir ({selectedSuggestions.size})</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <div className="flex items-center justify-between">
                <Label>{label}</Label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 rounded-lg border p-4">
                <div className="space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Corto y preciso</span>
                        <span>Largo y detallado</span>
                    </div>
                    <Slider
                        value={detailLevel}
                        onValueChange={setDetailLevel}
                        max={100}
                        step={1}
                    />
                     <Label className="text-sm font-medium">Nivel de Detalle</Label>
                </div>
                <div className="space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>General y versátil</span>
                        <span>Específico y creativo</span>
                    </div>
                     <Slider
                        value={specificity}
                        onValueChange={setSpecificity}
                        max={100}
                        step={1}
                    />
                    <Label className="text-sm font-medium">Nivel de Especificidad</Label>
                </div>
                <div className="col-span-1 sm:col-span-2 flex justify-center">
                    <Button type="button" size="sm" variant="outline" onClick={handleSuggestClick} disabled={isSuggesting}>
                        {isSuggesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                        Sugerir actividades con IA
                    </Button>
                </div>
            </div>
            <div className="space-y-2">
                <div className="border rounded-lg p-2 min-h-[150px] max-h-96 overflow-y-auto bg-muted/50 space-y-1">
                    {fields.length > 0 ? (
                        fields.map((field, index) => (
                            <EditableActivityItem
                                key={field.id}
                                value={(field as { value: string }).value}
                                onUpdate={(newValue) => update(index, { value: newValue })}
                                onRemove={() => remove(index)}
                            />
                        ))
                    ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground text-sm p-4">
                            No hay actividades añadidas.
                        </div>
                    )}
                </div>
                <div className="flex gap-2">
                    <Input
                        value={inputValue}
                        onChange={e => setInputValue(e.target.value)}
                        placeholder={placeholder}
                        onKeyDown={e => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAppend();
                            }
                        }}
                    />
                    <Button type="button" size="sm" onClick={handleAppend}>Añadir</Button>
                </div>
            </div>
        </div>
    );
}

function UnitManager({ control, form }: { control: any, form: any }) {
    const { fields, append, remove, update } = useFieldArray({ control, name: 'program.units' });
    
    return (
        <div className="space-y-4">
            <Label>Unidades y Contenidos</Label>
            {fields.map((unit, index) => (
                <Card key={unit.id} className="p-4">
                    <div className="flex justify-between items-center mb-2">
                        <FormField
                            control={control}
                            name={`program.units.${index}.name`}
                            render={({ field }) => (
                                <FormItem className="flex-grow">
                                    <FormControl>
                                        <Input placeholder={`Nombre de la Unidad ${index + 1}`} {...field} className="text-base font-semibold" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                    </div>
                    <div className="pl-4 space-y-2">
                        <FormField
                            control={control}
                            name={`program.units.${index}.topics`}
                            render={({ field }) => {
                                const topicsAsString = Array.isArray(field.value) ? field.value.join('\n') : '';
                                return (
                                    <FormItem>
                                        <Label>Contenidos (uno por línea)</Label>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Pega o escribe los temas de la unidad aquí, uno por línea..."
                                                value={topicsAsString}
                                                onChange={(e) => {
                                                    const topicsArray = e.target.value.split('\n').filter(t => t.trim() !== '');
                                                    field.onChange(topicsArray);
                                                }}
                                                className="min-h-[120px] resize-y"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                );
                            }}
                        />
                    </div>
                </Card>
            ))}
            <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ id: crypto.randomUUID(), name: `Unidad ${fields.length + 1}`, topics: [] })}
            >
                <PlusCircle className="mr-2 h-4 w-4" />
                Añadir Unidad
            </Button>
        </div>
    );
}

function ExamManager({ control, class_groups }: { control: any, class_groups: any[] }) {
    const { fields, append, remove } = useFieldArray({ control, name: 'program.examDates' });
    
    const classWeekdays = React.useMemo(() => {
        if (!class_groups) return new Set();
        const weekdays = new Set<number>();
        class_groups.forEach(group => {
            group.schedule?.forEach((entry: any) => {
                weekdays.add(Number(entry.day));
            });
        });
        return weekdays;
    }, [class_groups]);

    return (
        <div className="space-y-2">
            <Label>Fechas de Examen</Label>
            <div className="space-y-3">
                {fields.map((field, index) => (
                    <div key={field.id} className="flex items-end gap-2">
                        <FormField
                            control={control}
                            name={`program.examDates.${index}.instance`}
                            render={({ field }) => (
                                <FormItem className="flex-grow">
                                    <Label className="text-xs">Instancia</Label>
                                    <FormControl>
                                        <Input placeholder="Ej: Primer Parcial" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={control}
                            name={`program.examDates.${index}.date`}
                            render={({ field }) => {
                                const selectedDate = field.value;
                                let isWarning = false;
                                if (selectedDate && classWeekdays.size > 0) {
                                    const examDay = new Date(selectedDate).getUTCDay();
                                    const classDaysSundayBased = Array.from(classWeekdays).map(d => d % 7);
                                    if (!classDaysSundayBased.includes(examDay)) {
                                        isWarning = true;
                                    }
                                }
                                return (
                                <FormItem className="flex-grow">
                                    <Label className="text-xs">Fecha</Label>
                                    <FormControl>
                                       <Input type="date" value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''} onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value + 'T00:00:00') : undefined)} />
                                    </FormControl>
                                    <FormMessage />
                                    {isWarning && (
                                        <p className="text-xs text-amber-600 flex items-center gap-1 pt-1">
                                            <AlertTriangle className="h-3 w-3" />
                                            Este día no es un día de cursada habitual.
                                        </p>
                                    )}
                                </FormItem>
                                );
                            }}
                        />
                         <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                    </div>
                ))}
            </div>
             <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ id: crypto.randomUUID(), instance: 'Primer Parcial', date: undefined })}
            >
                <PlusCircle className="mr-2 h-4 w-4" />
                Añadir Fecha de Examen
            </Button>
        </div>
    );
}

function ApplicableSuspensionPeriods({ academicPeriodId, subjectLevel }: { academicPeriodId?: string, subjectLevel: Subject['level'] }) {
    const { academicPeriods } = useApp();

    const applicablePeriods = React.useMemo(() => {
        if (!academicPeriodId) return [];
        
        const mainPeriod = academicPeriods.find(p => p.id === academicPeriodId);
        if (!mainPeriod) return [];
        
        return academicPeriods.filter(p => {
            const isSuspensionType = p.type === 'vacation' || p.type === 'exam_period' || p.type === 'exam_period_annual';
            if (!isSuspensionType) return false;

            const periodOverlaps = mainPeriod.startDate <= p.endDate && mainPeriod.endDate >= p.startDate;
            if (!periodOverlaps) return false;
            
            const appliesToLevel = !p.level || p.level === 'all' || p.level === subjectLevel;
            return appliesToLevel;
        });
    }, [academicPeriodId, academicPeriods, subjectLevel]);

    if (applicablePeriods.length === 0) {
        return null;
    }

    return (
        <div className="mt-2 space-y-2">
            <Label className="text-xs text-muted-foreground">Períodos de Suspensión Aplicables:</Label>
            <div className="flex flex-wrap gap-2">
                {applicablePeriods.map(p => (
                    <Badge key={p.id} variant="secondary" className="flex items-center gap-2">
                        <CalendarOff className="h-3 w-3"/>
                        <span>{p.name}</span>
                    </Badge>
                ))}
            </div>
        </div>
    );
}


export function SubjectForm({ subjectToEdit, onFinished, formMode = 'full' }: SubjectFormProps) {
  const { addSubject, updateSubject, superiorRoles, secondaryRoles, addSuperiorRole, addSecondaryRole, academicPeriods, institutions, addInstitution, secondaryOrientations, addSecondaryOrientation, events } = useApp();
  const [isNewRoleDialogOpen, setIsNewRoleDialogOpen] = React.useState(false);
  const [isNewInstitutionOpen, setIsNewInstitutionOpen] = React.useState(false);
  const [isNewOrientationOpen, setIsNewOrientationOpen] = React.useState(false);
  const [newRoleName, setNewRoleName] = React.useState('');
  const [newOrientationName, setNewOrientationName] = React.useState('');
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const [analysisResult, setAnalysisResult] = React.useState<AnalyzeUnitContentOutput | null>(null);

  const form = useForm<SubjectFormValues>({
    resolver: zodResolver(subjectSchema),
    defaultValues: subjectToEdit 
    ? {
        ...subjectToEdit,
        level: (subjectToEdit.level?.toLowerCase() ?? 'secundario') as SubjectFormValues['level'],
        career: subjectToEdit.career ?? '',
        role: subjectToEdit.role ?? undefined,
        notes: subjectToEdit.notes ?? '',
        academicPeriodId: subjectToEdit.academicPeriodId ?? undefined,
        program: {
            methodology: subjectToEdit.program?.methodology || 'Metodologías Activas',
            units: subjectToEdit.program?.units || [],
            activities: (subjectToEdit.program?.activities || []).map(act => typeof act === 'string' ? {value: act} : act),
            examDates: subjectToEdit.program?.examDates || [],
        },
      }
    : {
      name: '',
      level: 'secundario',
      color: colorPalette[0],
      institution: '',
      year: new Date().getFullYear().toString(),
      class_groups: [{ id: crypto.randomUUID(), name: '', schedule: [], cathedraHours: 0 }],
      career: '',
      role: undefined,
      roleStartDate: undefined,
      notes: '',
      academicPeriodId: undefined,
      program: { units: [], activities: [], examDates: [], methodology: 'Metodologías Activas' },
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "class_groups",
  });

  const watchedColor = form.watch('color');
  const watchedLevel = form.watch('level');
  const watchedAcademicPeriodId = form.watch('academicPeriodId');
  const classGroups = useWatch({ control: form.control, name: "class_groups" });
  
  const availableRoles = React.useMemo(() => {
    return watchedLevel.startsWith('superior') ? superiorRoles : secondaryRoles;
  }, [watchedLevel, superiorRoles, secondaryRoles]);
  
  const availablePeriods = React.useMemo(() => {
    return academicPeriods.filter(p => {
        if (p.type !== 'class_period') return false;
        if (!p.level || p.level === 'all') return true;
        if (p.level === watchedLevel) return true;
        if (watchedLevel.startsWith('superior') && p.level.startsWith('superior')) return true;
        return false;
    });
  }, [academicPeriods, watchedLevel]);

  const onSubmit = (data: SubjectFormValues) => {
    const finalData = { ...data, program: { ...data.program, activities: data.program?.activities?.map(a => a.value) } } as any;
    onFinished(finalData);
  };
  
  const handleCreateNewRole = () => {
    const trimmedName = newRoleName.trim();
    if (trimmedName) {
        if (watchedLevel.startsWith('superior')) {
            addSuperiorRole(trimmedName);
        } else {
            addSecondaryRole(trimmedName);
        }
        form.setValue('role', trimmedName, { shouldValidate: true });
        setIsNewRoleDialogOpen(false);
        setNewRoleName('');
    }
  };
  
  const handleCreateNewOrientation = () => {
    const trimmedName = newOrientationName.trim();
    if (trimmedName) {
      addSecondaryOrientation(trimmedName);
      form.setValue(`class_groups.${fields.length - 1}.secondaryOrientation`, trimmedName, { shouldValidate: true });
      setIsNewOrientationOpen(false);
      setNewOrientationName('');
    }
  };

  const handleNewInstitutionCreated = (newInstitution: Institution) => {
    addInstitution(newInstitution);
    form.setValue('institution', newInstitution.name, { shouldValidate: true });
    setIsNewInstitutionOpen(false);
  }

  const handleSuggestActivities = async (detailLevel: number, specificity: number) => {
    const subjectName = form.getValues('name');
    const subjectLevel = form.getValues('level');
    const methodology = form.getValues('program.methodology');
    const career = form.getValues('career');
    const classGroups = form.getValues('class_groups');
    
    // Use the orientation from the first group that has one, for context.
    const secondaryOrientationValue = classGroups?.find(g => g.secondaryOrientation)?.secondaryOrientation;

    if (!subjectName || !methodology) {
        toast({
            variant: 'destructive',
            title: 'Faltan datos',
            description: 'Asegúrate de haber ingresado un nombre para la asignatura y seleccionado una metodología.'
        });
        return [];
    }

    try {
        const result = await suggestActivities({ 
          subjectName, 
          subjectLevel, 
          methodology,
          career: subjectLevel.startsWith('superior') ? career : undefined,
          secondaryOrientation: subjectLevel === 'secundario' ? secondaryOrientationValue : undefined,
          detailLevel,
          specificity,
        });
        return result.activities || [];
    } catch (error) {
        console.error('Error sugiriendo actividades:', error);
        return [];
    }
  };

  const handleAnalyzeContent = async () => {
        setIsLoading(true);
        const currentSubject = form.getValues();
        const units = currentSubject.program?.units || [];
        
        const unitsToAnalyze = units.map(unit => ({
            unitName: unit.name,
            rawContent: Array.isArray(unit.topics) ? unit.topics.join('. ') : '',
        })).filter(u => u.rawContent.trim() !== '');

        if (unitsToAnalyze.length === 0) {
            toast({ variant: 'destructive', title: 'Contenido Vacío', description: 'Por favor, añade contenido a las unidades antes de analizar.' });
            setIsLoading(false);
            return;
        }
        
        const subjectPeriod = academicPeriods.find(p => p.id === currentSubject.academicPeriodId);
        if (!subjectPeriod) {
            toast({ variant: 'destructive', title: 'Período Lectivo no definido', description: 'Por favor, vincula un período lectivo a la asignatura para calcular los días de clase.' });
            setIsLoading(false);
            return;
        }
        
        const allDaysInRange = eachDayOfInterval({ start: subjectPeriod.startDate, end: subjectPeriod.endDate });
        let availableClasses = 0;
        let totalClassMinutes = 0;

        allDaysInRange.forEach(day => {
            const isSuspended = academicPeriods.some(p => {
                const isSuspendingType = p.type === 'vacation' || p.type === 'exam_period';
                if (!isSuspendingType) return false;
                const appliesToLevel = !p.level || p.level === 'all' || p.level === currentSubject.level;
                if (!appliesToLevel) return false;
                return isWithinInterval(day, { start: p.startDate, end: p.endDate });
            });
            if (isSuspended) return;

            const isHoliday = events.some((e: EventType) => e.event_type === 'HOLIDAY' && isSameDay(e.event_datetime, day));
            if (isHoliday) return;

            const dayOfWeek = day.getDay();
            currentSubject.class_groups.forEach(group => {
                let hasClassThisDay = false;
                 group.schedule?.forEach(schedule => {
                    if (Number(schedule.day) === dayOfWeek) {
                        hasClassThisDay = true;
                        const startTime = parse(schedule.startTime, 'HH:mm', new Date());
                        const endTime = parse(schedule.endTime, 'HH:mm', new Date());
                        if (!isNaN(startTime.getTime()) && !isNaN(endTime.getTime())) {
                            totalClassMinutes += differenceInMinutes(endTime, startTime);
                        }
                    }
                });
                if(hasClassThisDay) {
                    availableClasses++;
                }
            });
        });

        try {
            const result = await analyzeUnitContent({
                units: unitsToAnalyze,
                subjectName: currentSubject.name,
                subjectLevel: currentSubject.level,
                availableClasses,
                totalClassHours: totalClassMinutes / 60,
            });
            setAnalysisResult(result);
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error de Análisis', description: 'No se pudo analizar el contenido.' });
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleApplyTopics = () => {
        if (analysisResult) {
            const currentUnits = form.getValues('program.units') || [];
            const updatedUnits = currentUnits.map(unit => {
                const analyzed = analysisResult.analyzedUnits.find(au => au.unitName === unit.name);
                return analyzed ? { ...unit, topics: analyzed.topics } : unit;
            });
            
            form.setValue('program.units', updatedUnits);
            setAnalysisResult(null);
            toast({ title: 'Contenidos Aplicados', description: 'La lista de temas ha sido actualizada para todas las unidades analizadas.' });
        }
    };

  const renderBasicInfo = () => {
    return (
     <Card className="non-printable-content">
        <CardHeader>
            <CardTitle>Información General</CardTitle>
            <CardDescription>Detalles básicos de la asignatura.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Nombre de la Asignatura</FormLabel><FormControl><Input placeholder="p. ej. Escritura Creativa" {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="level" render={({ field }) => ( <FormItem className="space-y-3"><FormLabel>Nivel Educativo</FormLabel><FormControl><RadioGroup onValueChange={(value) => { field.onChange(value); form.resetField('academicPeriodId');}} value={field.value} className="flex flex-col sm:flex-row sm:space-x-4 pt-2"><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="secundario" /></FormControl><FormLabel className="font-normal">Secundario</FormLabel></FormItem><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="superior_no_universitario" /></FormControl><FormLabel className="font-normal">Superior (No Universitario)</FormLabel></FormItem><FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="superior_universitario" /></FormControl><FormLabel className="font-normal">Superior (Universitario)</FormLabel></FormItem></RadioGroup></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="institution" render={({ field }) => ( <FormItem><FormLabel>Institución</FormLabel><Select onValueChange={(value) => value === '__CREATE_NEW__' ? setIsNewInstitutionOpen(true) : field.onChange(value)} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecciona una institución" /></SelectTrigger></FormControl><SelectContent>{institutions.map(inst => (<SelectItem key={inst.id} value={inst.name}>{inst.name}</SelectItem>))}<Separator className="my-1" /><SelectItem value="__CREATE_NEW__" className="text-primary focus:text-primary"><div className="flex items-center gap-2"><PlusCircle className="h-4 w-4" /><span>Añadir nueva institución...</span></div></SelectItem></SelectContent></Select><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="year" render={({ field }) => (<FormItem><FormLabel>Año</FormLabel><FormControl><Input placeholder="p. ej. 2024 o 1er Año" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    {watchedLevel.startsWith('superior') && (<FormField control={form.control} name="career" render={({ field }) => (<FormItem><FormLabel>Carrera</FormLabel><FormControl><Input placeholder="p. ej. Ingeniería en Sistemas" {...field} /></FormControl><FormMessage /></FormItem>)} />)}
                    <div className="md:col-span-2">
                        <FormField control={form.control} name="academicPeriodId" render={({ field }) => ( <FormItem><FormLabel>Periodo Lectivo</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Vincula un periodo lectivo..." /></SelectTrigger></FormControl><SelectContent>{availablePeriods.length > 0 ? availablePeriods.map(p => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)) : (<div className="p-4 text-sm text-muted-foreground">No hay periodos lectivos configurados para este nivel.</div>)}</SelectContent></Select><FormMessage /></FormItem> )} />
                        <ApplicableSuspensionPeriods academicPeriodId={watchedAcademicPeriodId} subjectLevel={watchedLevel} />
                    </div>
                    <FormField control={form.control} name="role" render={({ field }) => (<FormItem><FormLabel>Cargo Docente (Opcional)</FormLabel><Select onValueChange={(value) => value === '__CREATE_NEW__' ? setIsNewRoleDialogOpen(true) : field.onChange(value)} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecciona un cargo" /></SelectTrigger></FormControl><SelectContent>{availableRoles.map(role => (<SelectItem key={role} value={role}>{role}</SelectItem>))}<Separator className="my-1" /><SelectItem value="__CREATE_NEW__" className="text-primary focus:text-primary"><div className="flex items-center gap-2"><PlusCircle className="h-4 w-4" /><span>Crear nuevo cargo...</span></div></SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="notes" render={({ field }) => (<FormItem className="md:col-span-2"><FormLabel>Observaciones / Enlaces de Interés</FormLabel><FormControl><Textarea placeholder="Añade aquí cualquier nota, observación relevante o enlaces importantes para la asignatura..." className="resize-y" {...field} /></FormControl><FormMessage /></FormItem>)} />
                </div>
                <FormField control={form.control} name="color" render={({ field }) => (<FormItem><FormLabel>Color</FormLabel><FormControl><div className="flex gap-2 pt-2">{colorPalette.map(color => (<button type="button" key={color} onClick={() => field.onChange(color)} className={`w-8 h-8 rounded-full border-2 transition-all ${watchedColor === color ? 'border-primary ring-2 ring-ring' : 'border-transparent'}`} style={{ backgroundColor: color }} />))}</div></FormControl><FormMessage /></FormItem>)} />
                <Separator className="my-6" />
                <div className="space-y-4">
                    <div className="flex justify-between items-center"><h3 className="text-lg font-medium">{`Divisiones / Comisiones`}</h3><FormField control={form.control} name={`class_groups`} render={() => <FormMessage />} /></div>
                    <div className="space-y-4">{fields.map((group, index) => (
                        <Card key={group.id} className="p-4">
                            <CardHeader className="p-0 pb-4">
                                <div className="flex justify-between items-start gap-4">
                                    <FormField control={form.control} name={`class_groups.${index}.name`} render={({ field }) => (<FormItem className="flex-1"><FormLabel>{watchedLevel === 'secundario' ? 'División / Curso' : 'Comisión'}</FormLabel><FormControl><Input placeholder={watchedLevel === 'secundario' ? 'p. ej. 5º A' : 'p. ej. K2005'} {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name={`class_groups.${index}.cathedraHours`} render={({ field }) => (<FormItem className="w-32"><FormLabel>{watchedLevel === 'superior_universitario' ? 'Horas Reloj' : 'Horas Cátedra'}</FormLabel><FormControl><Input type="number" placeholder="Ej: 4" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                                    {fields.length > 1 && (<Button type="button" variant="ghost" size="icon" className="mt-6" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>)}
                                </div>
                                {watchedLevel === 'secundario' && (
                                    <div className="pt-4">
                                    <FormField control={form.control} name={`class_groups.${index}.secondaryOrientation`} render={({ field }) => ( <FormItem><FormLabel>Modalidad o Especialidad</FormLabel><Select onValueChange={(value) => value === '__CREATE_NEW__' ? setIsNewOrientationOpen(true) : field.onChange(value)} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecciona una modalidad/especialidad..." /></SelectTrigger></FormControl><SelectContent>{secondaryOrientations.map(o => (<SelectItem key={o} value={o}>{o}</SelectItem>))}<Separator className="my-1" /><SelectItem value="__CREATE_NEW__" className="text-primary focus:text-primary"><div className="flex items-center gap-2"><PlusCircle className="h-4 w-4" /><span>Crear nueva modalidad...</span></div></SelectItem></SelectContent></Select><FormMessage /></FormItem> )} />
                                    </div>
                                )}
                            </CardHeader>
                            <CardContent className="p-0">
                                <Label className="text-xs">Horario Semanal</Label>
                                <ClassGroupSchedule control={form.control} groupIndex={index} />
                            </CardContent>
                        </Card>
                    ))}</div>
                    <Button type="button" variant="outline" onClick={() => append({ id: crypto.randomUUID(), name: '', schedule: [], cathedraHours: 0 })}><PlusCircle className="mr-2 h-4 w-4" />Añadir {watchedLevel === 'secundario' ? 'División' : 'Comisión'}</Button>
                </div>
            </div>
        </CardContent>
    </Card>
  )};

  const renderProgramInfo = () => {
    return (
     <Card className="print:break-before-page non-printable-content">
        <CardHeader>
            <CardTitle>Planificación Académica</CardTitle>
            <CardDescription>Define las unidades, temas y actividades de la asignatura.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="space-y-6">
                <UnitManager control={form.control} form={form} />
                <div className="text-center pt-2">
                    <Button type="button" variant="outline" onClick={handleAnalyzeContent} disabled={isLoading}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BrainCircuit className="mr-2 h-4 w-4" />}
                        Analizar Programa Completo con IA
                    </Button>
                </div>
                <Separator />
                <div className="space-y-6">
                    <FormField control={form.control} name="program.methodology" render={({ field }) => ( <FormItem><FormLabel>Metodología Pedagógica</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecciona una metodología..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="Metodologías Activas">Metodologías Activas</SelectItem><SelectItem value="Aprendizaje Basado en Proyectos">Aprendizaje Basado en Proyectos</SelectItem><SelectItem value="Clase Invertida (Flipped Classroom)">Clase Invertida (Flipped Classroom)</SelectItem><SelectItem value="Gamificación">Gamificación</SelectItem><SelectItem value="Clase Tradicional/Expositiva">Clase Tradicional/Expositiva</SelectItem></SelectContent></Select></FormItem> )} />
                    <Controller control={form.control} name="program.activities" render={({ field }) => ( <ActivitiesManager control={form.control} name={field.name} label="Modalidades de Trabajo / Actividades" placeholder="Añadir una actividad..." onSuggest={handleSuggestActivities} /> )} />
                </div>
                <Separator />
                <ExamManager control={form.control} class_groups={classGroups} />
            </div>
        </CardContent>
    </Card>
  )};

  return (
    <>
      <Dialog open={isNewRoleDialogOpen} onOpenChange={setIsNewRoleDialogOpen}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Crear Nuevo Cargo Docente</DialogTitle><DialogDescription>Añade un cargo personalizado para usarlo ahora y en el futuro en el nivel seleccionado.</DialogDescription></DialogHeader><div className="space-y-2"><Label htmlFor="new-role-name">Nombre del Cargo</Label><Input id="new-role-name" value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} placeholder="Ej: Jefe de Departamento" /></div><DialogFooter><Button variant="ghost" onClick={() => setIsNewRoleDialogOpen(false)}>Cancelar</Button><Button onClick={handleCreateNewRole}>Guardar Cargo</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={isNewOrientationOpen} onOpenChange={setIsNewOrientationOpen}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Crear Nueva Modalidad</DialogTitle><DialogDescription>Añade una modalidad o especialidad personalizada para el nivel secundario.</DialogDescription></DialogHeader><div className="space-y-2"><Label htmlFor="new-orientation-name">Nombre de la Modalidad</Label><Input id="new-orientation-name" value={newOrientationName} onChange={(e) => setNewOrientationName(e.target.value)} placeholder="Ej: Artes Visuales" /></div><DialogFooter><Button variant="ghost" onClick={() => setIsNewOrientationOpen(false)}>Cancelar</Button><Button onClick={handleCreateNewOrientation}>Guardar Modalidad</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={isNewInstitutionOpen} onOpenChange={setIsNewInstitutionOpen}><DialogContent className="sm:max-w-2xl"><DialogHeader><DialogTitle>Añadir Nueva Institución</DialogTitle></DialogHeader><InstitutionForm onFinished={handleNewInstitutionCreated} onCancel={() => setIsNewInstitutionOpen(false)} /></DialogContent></Dialog>
      
      <Dialog open={!!analysisResult} onOpenChange={() => setAnalysisResult(null)}>
        <DialogContent className="max-w-2xl">
            <DialogHeader>
                <DialogTitle>Análisis de Contenidos del Programa</DialogTitle>
                <DialogDescription>
                    La IA ha procesado el programa completo y ofrece las siguientes sugerencias y estructura.
                </DialogDescription>
            </DialogHeader>
            {analysisResult && (
                <Tabs defaultValue="suggestions" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="suggestions">Sugerencias y Métricas</TabsTrigger>
                        <TabsTrigger value="topics">Contenidos Organizados</TabsTrigger>
                    </TabsList>
                    <TabsContent value="suggestions">
                        <Card>
                            <CardHeader>
                                <CardTitle>Métricas Clave de la Asignatura</CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-2 gap-4 text-center">
                                <div className="rounded-lg bg-muted p-3">
                                    <dt className="text-sm font-medium text-muted-foreground">Total Temas</dt>
                                    <dd className="text-2xl font-bold flex items-center justify-center gap-2"><BookOpen className="h-6 w-6 text-primary"/>{analysisResult.metrics.topicCount}</dd>
                                </div>
                                <div className="rounded-lg bg-muted p-3">
                                    <dt className="text-sm font-medium text-muted-foreground">Días de Clase</dt>
                                    <dd className="text-2xl font-bold flex items-center justify-center gap-2"><GraduationCap className="h-6 w-6 text-primary"/>{analysisResult.metrics.availableClasses}</dd>
                                </div>
                                <div className="rounded-lg bg-muted p-3">
                                    <dt className="text-sm font-medium text-muted-foreground">Horas de Clase</dt>
                                    <dd className="text-2xl font-bold flex items-center justify-center gap-2"><Clock className="h-6 w-6 text-primary"/>{analysisResult.metrics.totalClassHours.toFixed(1)}</dd>
                                </div>
                                <div className="rounded-lg bg-muted p-3">
                                    <dt className="text-sm font-medium text-muted-foreground">Estudio Autónomo (Est.)</dt>
                                    <dd className="text-2xl font-bold flex items-center justify-center gap-2"><Users className="h-6 w-6 text-primary"/>{analysisResult.metrics.estimatedAutonomousHours}</dd>
                                </div>
                            </CardContent>
                        </Card>
                         <Card className="mt-4">
                            <CardHeader>
                                <CardTitle>Sugerencias de la IA</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 text-sm">
                                <div>
                                    <h4 className="font-semibold">Secuenciación Sugerida</h4>
                                    <p className="text-muted-foreground">{analysisResult.suggestions.sequencing}</p>
                                </div>
                                <div>
                                    <h4 className="font-semibold">Contenidos Prioritarios</h4>
                                    <p className="text-muted-foreground">{analysisResult.suggestions.prioritization}</p>
                                </div>
                                <div>
                                    <h4 className="font-semibold">Ritmo y Pacing</h4>
                                    <p className="text-muted-foreground">{analysisResult.suggestions.pacing}</p>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="topics">
                        <Card>
                            <CardHeader>
                                <CardTitle>Temas Extraídos ({analysisResult.metrics.topicCount})</CardTitle>
                                <CardDescription>Estos son los temas que la IA ha identificado, agrupados por unidad. Puedes aplicarlos para reestructurar tu programa.</CardDescription>
                            </CardHeader>
                            <CardContent className="max-h-72 overflow-y-auto space-y-4 text-sm">
                                {analysisResult.analyzedUnits.map((unit, index) => (
                                    <div key={index}>
                                        <h4 className="font-semibold">{unit.unitName}</h4>
                                        <ul className="list-disc pl-5 text-muted-foreground">
                                            {unit.topics.map((topic, topicIndex) => <li key={topicIndex}>{topic}</li>)}
                                        </ul>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                        <DialogFooter className="pt-4">
                            <Button variant="ghost" onClick={() => setAnalysisResult(null)}>Cancelar</Button>
                            <Button onClick={handleApplyTopics}>Aplicar Contenidos</Button>
                        </DialogFooter>
                    </TabsContent>
                </Tabs>
            )}
        </DialogContent>
      </Dialog>
      
      <Form {...form}>
        <form id="subject-program-form" onSubmit={form.handleSubmit(onSubmit, (errors) => console.log("Errores de validacion del formulario", errors))} className="space-y-6">
            {formMode === 'full' && (
                <>
                    {renderBasicInfo()}
                    <Separator className="my-6" />
                    {renderProgramInfo()}
                </>
            )}
            {formMode === 'split' && (
                <>
                    {renderBasicInfo()}
                    <div className="mt-8" />
                    {renderProgramInfo()}
                </>
            )}

            {formMode === 'full' && (
             <div className="flex justify-end gap-2 pt-4 border-t">
                <Button type="button" variant="ghost" onClick={() => onFinished()}>Cancelar</Button>
                <Button type="submit">{subjectToEdit ? 'Guardar Cambios' : 'Crear Asignatura'}</Button>
            </div>
            )}
        </form>
      </Form>
    </>
  );
}
SubjectForm.displayName = "SubjectForm";
