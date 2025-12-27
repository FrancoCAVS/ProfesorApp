
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { Calendar as CalendarIcon, Loader2, Sparkles, Copy, Check, BrainCircuit } from 'lucide-react';

import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useApp } from '@/contexts/app-context';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { generateFormalNote } from '@/ai/flows/generate-formal-note-flow';
import type { DateRange } from 'react-day-picker';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

const noteGeneratorSchema = z.object({
  noteType: z.enum(['licencia', 'justificacion_inasistencia', 'otro']),
  level: z.enum(['secundario', 'superior_no_universitario', 'superior_universitario']),
  dates: z.object({
    from: z.date({ required_error: 'Se requiere una fecha de inicio.' }),
    to: z.date().optional(),
  }),
  reason: z.string().min(10, 'El motivo debe tener al menos 10 caracteres.'),
  regulationQuery: z.string().optional(),
});

type NoteGeneratorValues = z.infer<typeof noteGeneratorSchema>;

const recipientSchema = z.object({
    institutionId: z.string().optional(),
    authority: z.enum(['director', 'vicedirector', 'other']).optional(),
    customRecipient: z.string().optional(),
}).refine(data => {
    if (data.institutionId && data.institutionId !== 'custom') {
        return !!data.authority;
    }
    if (data.institutionId === 'custom') {
        return !!data.customRecipient && data.customRecipient.length > 2;
    }
    return false; // Must select something
}, { message: "Debe seleccionar una autoridad o ingresar un destinatario personalizado." });

type RecipientValues = z.infer<typeof recipientSchema>;


export default function NoteGeneratorPage() {
  const { userProfile, institutions } = useApp();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const [generatedNote, setGeneratedNote] = React.useState('');
  const [regulationFound, setRegulationFound] = React.useState('');
  const [hasCopied, setHasCopied] = React.useState(false);
  const [recipientSelection, setRecipientSelection] = React.useState<Partial<RecipientValues>>({});


  const form = useForm<NoteGeneratorValues>({
    resolver: zodResolver(noteGeneratorSchema),
    defaultValues: {
      noteType: 'justificacion_inasistencia',
      level: 'secundario',
      dates: { from: undefined, to: undefined },
      reason: '',
      regulationQuery: '',
    },
  });

  React.useEffect(() => {
    // Set default date on client-side to avoid hydration mismatch
    form.reset({
        ...form.getValues(),
        dates: { from: new Date() }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.reset]);


  const handleGenerate = async (data: NoteGeneratorValues) => {
    const selectedInstitution = institutions.find(i => i.id === recipientSelection.institutionId);
    let recipientDetails: any = {};
    let isValidRecipient = false;

    if (recipientSelection.institutionId === 'custom' && recipientSelection.customRecipient) {
        recipientDetails = { customRecipientName: recipientSelection.customRecipient };
        isValidRecipient = true;
    } else if (selectedInstitution && recipientSelection.authority) {
        recipientDetails = {
            institutionName: selectedInstitution.name,
            authorityTitle: recipientSelection.authority,
        };
        const selectedAuthority = selectedInstitution.authorities?.find(a => a.role === recipientSelection.authority);
        if (selectedAuthority) {
            recipientDetails.authorityName = selectedAuthority.name;
        } else if (recipientSelection.authority === 'Otro Cargo...' && recipientSelection.customRecipient) {
             recipientDetails.authorityTitle = recipientSelection.customRecipient;
             recipientDetails.authorityName = undefined;
        }
        isValidRecipient = true;
    }

    if (!isValidRecipient) {
        toast({
            variant: 'destructive',
            title: 'Falta Destinatario',
            description: 'Por favor, selecciona una institución y autoridad, o ingresa un destinatario personalizado.',
        });
        return;
    }
    
    setIsLoading(true);
    setGeneratedNote('');
    setRegulationFound('');

    try {
      const result = await generateFormalNote({
        recipientDetails,
        noteType: data.noteType,
        level: data.level,
        startDate: data.dates.from.toISOString(),
        endDate: data.dates.to?.toISOString(),
        reason: data.reason,
        regulationQuery: data.regulationQuery,
        authorName: userProfile.name,
        authorEmail: userProfile.email,
      });

      if (result.noteBody) {
        setGeneratedNote(result.noteBody);
        if (result.regulationFound) {
            setRegulationFound(result.regulationFound);
        }
      } else {
        toast({
          variant: 'destructive',
          title: 'Error de Generación',
          description: 'La IA no pudo generar la nota. Por favor, intenta de nuevo.',
        });
      }
    } catch (error) {
      console.error('Error generando la nota:', error);
      toast({
        variant: 'destructive',
        title: 'Error de Conexión',
        description: 'No se pudo contactar al servicio de IA.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedNote);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
  };
  
  const dates = form.watch('dates');
  const dateRange: DateRange | undefined = dates?.from ? { from: dates.from, to: dates.to } : undefined;
  const notebookLink = userProfile.notebookLMLink || 'https://notebooklm.google.com/';

  const selectedInstitution = institutions.find(i => i.id === recipientSelection.institutionId);

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Generador de Notas Formales" />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Generar Nueva Nota</CardTitle>
              <CardDescription>
                Completa los siguientes campos para que la IA redacte un borrador de la nota.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleGenerate)} className="space-y-6">
                    <div className="space-y-2">
                      <FormLabel>Destinatario</FormLabel>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Select 
                            value={recipientSelection.institutionId || ''} 
                            onValueChange={(id) => setRecipientSelection(id === 'custom' ? { institutionId: 'custom' } : { institutionId: id, authority: undefined })}
                        >
                            <SelectTrigger><SelectValue placeholder="Seleccionar Institución..." /></SelectTrigger>
                            <SelectContent>
                                {institutions.map(inst => (
                                    <SelectItem key={inst.id} value={inst.id}>{inst.name}</SelectItem>
                                ))}
                                 <SelectItem value="custom">Otro (Ingreso Manual)</SelectItem>
                            </SelectContent>
                        </Select>
                        {recipientSelection.institutionId && recipientSelection.institutionId !== 'custom' && selectedInstitution && (
                            <Select
                                value={recipientSelection.authority || ''}
                                onValueChange={(auth) => setRecipientSelection(prev => ({ ...prev, authority: auth as any, customRecipient: '' }))}
                            >
                                <SelectTrigger><SelectValue placeholder="Seleccionar Autoridad..."/></SelectTrigger>
                                <SelectContent>
                                    {selectedInstitution.authorities?.map(auth => (
                                        <SelectItem key={auth.id} value={auth.role}>{auth.role}: {auth.name}</SelectItem>
                                    ))}
                                    <SelectItem value="Otro Cargo...">Otro Cargo...</SelectItem>
                                </SelectContent>
                            </Select>
                        )}
                      </div>
                       {(recipientSelection.institutionId === 'custom' || recipientSelection.authority === 'Otro Cargo...') && (
                            <Input 
                                placeholder="Escribe el cargo o nombre, ej: 'Secretaría Académica'" 
                                value={recipientSelection.customRecipient || ''}
                                onChange={(e) => setRecipientSelection(prev => ({...prev, customRecipient: e.target.value}))}
                                className="mt-2"
                            />
                        )}
                    </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <FormField
                        control={form.control}
                        name="noteType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipo de Nota</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                              <SelectContent>
                                <SelectItem value="justificacion_inasistencia">Justificación de Inasistencia</SelectItem>
                                <SelectItem value="licencia">Solicitud de Licencia</SelectItem>
                                <SelectItem value="otro">Otra Solicitud/Notificación</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="level"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nivel Educativo</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                              <SelectContent>
                                <SelectItem value="secundario">Secundario</SelectItem>
                                <SelectItem value="superior_no_universitario">Superior No Universitario</SelectItem>
                                <SelectItem value="superior_universitario">Superior Universitario</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                  </div>
                   <FormField
                    control={form.control}
                    name="dates"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Fecha(s) de Aplicación</FormLabel>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    id="date"
                                    variant={"outline"}
                                    className={cn("justify-start text-left font-normal", !dateRange?.from && "text-muted-foreground")}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dateRange?.from ? (
                                        dateRange.to ? (
                                            <>
                                                {format(dateRange.from, "LLL dd, y")} -{" "}
                                                {format(dateRange.to, "LLL dd, y")}
                                            </>
                                        ) : (
                                            format(dateRange.from, "LLL dd, y")
                                        )
                                    ) : (
                                        <span>Selecciona un rango</span>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    initialFocus
                                    mode="range"
                                    defaultMonth={dateRange?.from}
                                    selected={dateRange}
                                    onSelect={(range) => field.onChange({ from: range?.from, to: range?.to })}
                                    numberOfMonths={2}
                                    locale={es}
                                />
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="reason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Motivo Detallado</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Describe el motivo. Ej: Asisto a un congreso de educación..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField
                    control={form.control}
                    name="regulationQuery"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fundamentar en Normativa (Opcional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: normativa para licencia por enfermedad" {...field} />
                        </FormControl>
                         <p className="text-xs text-muted-foreground pt-1">
                            La IA buscará y fundamentará la nota en la regulación relevante.
                            <a href={notebookLink} target="_blank" rel="noopener noreferrer" className="ml-1 text-primary hover:underline">Consultar NotebookLM</a>.
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={isLoading} className="w-full">
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    {isLoading ? 'Generando...' : 'Generar Nota con IA'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle>Borrador Generado</CardTitle>
              <CardDescription>
                Revisa, edita si es necesario y copia el texto para usarlo.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col relative space-y-4">
              {regulationFound && (
                <Alert variant="default" className="bg-blue-50 border-blue-200">
                  <BrainCircuit className="h-4 w-4 text-blue-600" />
                  <AlertTitle className="text-blue-800">Normativa Encontrada y Aplicada</AlertTitle>
                  <AlertDescription className="text-blue-700 text-xs whitespace-pre-wrap font-mono">
                    {regulationFound}
                  </AlertDescription>
                </Alert>
              )}
              <div className="relative flex-grow">
                <pre className="whitespace-pre-wrap text-sm font-sans flex-grow w-full h-full rounded-md border bg-muted p-4 min-h-[300px]">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : generatedNote ? (
                    generatedNote
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      Aquí aparecerá el borrador de tu nota...
                    </div>
                  )}
                </pre>
                 {generatedNote && (
                  <Button onClick={handleCopy} size="icon" className="absolute top-2 right-2 h-8 w-8">
                    {hasCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    <span className="sr-only">{hasCopied ? 'Copiado' : 'Copiar'}</span>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
