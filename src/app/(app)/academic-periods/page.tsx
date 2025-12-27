
'use client';

import * as React from 'react';
import { PlusCircle, Edit, Trash2, CalendarRange, BrainCircuit, Upload, ImageIcon, Sparkles, FileUp, ListChecks, Filter } from 'lucide-react';
import { useApp } from '@/contexts/app-context';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AcademicPeriodForm } from '@/components/academic-period-form';
import type { AcademicPeriod, Event as EventType, EducationLevel } from '@/lib/types';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { format, differenceInDays, isSaturday, isSunday, isSameDay, eachDayOfInterval, differenceInWeeks } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { AcademicPeriodImporter } from '@/components/academic-period-importer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


const periodTypeTranslations: Record<AcademicPeriod['type'], string> = {
  vacation: 'Vacaciones / Receso',
  exam_period: 'Período de Exámenes',
  class_period: 'Período Lectivo',
  other: 'Otro',
  exam_period_annual: 'Periodo de Exámenes (sin clases)'
};

const periodTypeVariants: Record<AcademicPeriod['type'], "secondary" | "destructive" | "outline" | "default"> = {
  vacation: 'secondary',
  exam_period: 'destructive',
  class_period: 'default',
  other: 'outline',
  exam_period_annual: 'destructive',
};

const levelTranslations: Record<NonNullable<AcademicPeriod['level']>, string> = {
  all: 'Todos los Niveles',
  secundario: 'Nivel Secundario',
  superior_no_universitario: 'Superior (No Uni)',
  superior_universitario: 'Superior (Uni)',
};

const getDurationInfo = (start: Date, end: Date, holidays: EventType[]) => {
    const days = eachDayOfInterval({ start, end });
    const businessDays = days.filter(day => {
        const isWeekend = isSaturday(day) || isSunday(day);
        const isHoliday = holidays.some(h => h.event_type === 'HOLIDAY' && isSameDay(h.event_datetime, day));
        return !isWeekend && !isHoliday;
    }).length;

    const totalWeeks = differenceInWeeks(end, start);
    
    return {
        businessDays,
        totalWeeks
    };
};

function CardView({ periods, onEdit, onDelete, holidays }: { periods: AcademicPeriod[], onEdit: (p: AcademicPeriod) => void, onDelete: (id: string) => void, holidays: EventType[] }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {periods.map((period) => {
                const { businessDays, totalWeeks } = getDurationInfo(period.startDate, period.endDate, holidays);
                return (
                    <Card key={period.id} className="group flex flex-col transition-all hover:shadow-md">
                        <CardHeader className="flex flex-row items-start justify-between pb-3">
                            <div>
                                <CardTitle className="text-lg">{period.name}</CardTitle>
                                <CardDescription>
                                    {format(new Date(period.startDate), 'P', { locale: es })} - {format(new Date(period.endDate), 'P', { locale: es })}
                                    <br/>
                                    <span className="font-semibold">
                                        {businessDays} días hábiles (aprox. {totalWeeks} semanas)
                                    </span>
                                </CardDescription>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                               <Badge variant={periodTypeVariants[period.type]}>{periodTypeTranslations[period.type]}</Badge>
                               {period.level && (
                                 <Badge variant="outline">{levelTranslations[period.level]}</Badge>
                               )}
                            </div>
                        </CardHeader>
                        <CardContent className="flex flex-grow items-end justify-end">
                           <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="icon" onClick={() => onEdit(period)}>
                                    <Edit className="h-4 w-4" />
                                </Button>
                                 <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Esta acción no se puede deshacer. Esto eliminará permanentemente el periodo "{period.name}".
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => onDelete(period.id)}>Eliminar</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                           </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}

function TimelineView({ periods, onEdit, onDelete, holidays }: { periods: AcademicPeriod[], onEdit: (p: AcademicPeriod) => void, onDelete: (id: string) => void, holidays: EventType[] }) {
    const periodTypeTimelineColors: Record<AcademicPeriod['type'], string> = {
      vacation: 'bg-accent',
      exam_period: 'bg-destructive',
      class_period: 'bg-primary',
      other: 'bg-muted-foreground',
      exam_period_annual: 'bg-destructive/70',
    };
    
    return (
        <div className="relative mx-auto max-w-3xl pl-8 before:absolute before:inset-y-0 before:left-4 before:w-0.5 before:bg-border">
            {periods.map(period => {
                const { businessDays, totalWeeks } = getDurationInfo(period.startDate, period.endDate, holidays);
                return (
                    <div key={period.id} className="relative mb-8 last:mb-0">
                        <div className={`absolute left-4 top-5 -translate-x-1/2 h-4 w-4 rounded-full ${periodTypeTimelineColors[period.type]} ring-4 ring-background`} />
                        <div className="group ml-8">
                            <Card className="transition-all hover:shadow-md">
                               <CardHeader className="flex flex-row items-start justify-between pb-3">
                                    <div>
                                        <CardTitle className="text-lg">{period.name}</CardTitle>
                                        <CardDescription>
                                            {format(new Date(period.startDate), 'P', { locale: es })} - {format(new Date(period.endDate), 'P', { locale: es })}
                                            <br/>
                                             <span className="font-semibold">
                                                {businessDays} días hábiles (aprox. {totalWeeks} semanas)
                                             </span>
                                        </CardDescription>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                       <Badge variant={periodTypeVariants[period.type]}>{periodTypeTranslations[period.type]}</Badge>
                                       {period.level && (
                                         <Badge variant="outline">{levelTranslations[period.level]}</Badge>
                                       )}
                                    </div>
                                </CardHeader>
                                 <CardContent className="flex justify-end pt-2">
                                   <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="ghost" size="icon" onClick={() => onEdit(period)}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                         <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Esta acción no se puede deshacer. Esto eliminará permanentemente el periodo "{period.name}".
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => onDelete(period.id)}>Eliminar</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                   </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )
            })}
        </div>
    );
}

function ImageView({ imageUrl, onUpload, onRemove }: { imageUrl: string | null; onUpload: () => void; onRemove: () => void; }) {
    if (!imageUrl) {
        return (
            <div className="flex h-[calc(100vh-300px)] items-center justify-center rounded-lg border-2 border-dashed bg-muted/50">
                <div className="text-center">
                    <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">No hay imagen de calendario</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Sube una imagen o PDF del calendario oficial para tenerla a mano.
                    </p>
                    <Button onClick={onUpload} className="mt-4">
                        <Upload className="mr-2 h-4 w-4" />
                        Subir Archivo
                    </Button>
                </div>
            </div>
        );
    }

    const isPdf = imageUrl.startsWith('data:application/pdf');

    return (
        <div className="relative h-full w-full">
            {isPdf ? (
                 <iframe src={imageUrl} className="w-full h-full border-0" title="Calendario Académico PDF"></iframe>
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted/20 p-4">
                     <img src={imageUrl} alt="Calendario Académico" className="max-w-full max-h-full object-contain rounded-lg shadow-lg" />
                </div>
            )}
             <div className="absolute top-4 right-4 flex gap-2">
                 <Button onClick={onUpload} variant="secondary">
                    <Upload className="mr-2 h-4 w-4" />
                    Cambiar
                </Button>
                <Button onClick={onRemove} variant="destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Quitar
                </Button>
            </div>
        </div>
    )
}

const EmptyPeriodsView = () => (
    <div className="flex h-[calc(100vh-200px)] items-center justify-center rounded-lg border-2 border-dashed bg-muted/50">
        <div className="text-center">
            <CalendarRange className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No hay periodos lectivos definidos</h3>
            <p className="mt-2 text-sm text-muted-foreground">
                Añade periodos como vacaciones o mesas de examen para verlos aquí.
            </p>
        </div>
    </div>
);

export default function AcademicPeriodsPage() {
  const { academicPeriods, deleteAcademicPeriod, userProfile, calendarImageUrl, setCalendarImageUrl, addEvent, events } = useApp();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [selectedPeriod, setSelectedPeriod] = React.useState<AcademicPeriod | null>(null);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = React.useState(false);
  const [importFile, setImportFile] = React.useState<File | null>(null);
  const [view, setView] = React.useState<'card' | 'timeline' | 'image'>('card');
  const [levelFilter, setLevelFilter] = React.useState<'all' | EducationLevel>('all');
  const { toast } = useToast();

  const handleEdit = (period: AcademicPeriod) => {
    setSelectedPeriod(period);
    setIsFormOpen(true);
  };

  const handleAddNew = () => {
    setSelectedPeriod(null);
    setIsFormOpen(true);
  };

  React.useEffect(() => {
    if (!isFormOpen) {
      setSelectedPeriod(null);
    }
  }, [isFormOpen]);
  
  React.useEffect(() => {
    if (!isImportDialogOpen) {
      setImportFile(null);
    }
  }, [isImportDialogOpen]);


  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({variant: 'destructive', title: "Archivo demasiado grande", description: "Por favor, elige un archivo menor a 5MB."});
        return;
      }
      
      if (view === 'image') {
        const reader = new FileReader();
        reader.onloadend = () => {
          setCalendarImageUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setImportFile(file);
        setIsImportDialogOpen(true);
      }
    }
    // Reset file input to allow re-uploading the same file
    if(event.target) event.target.value = '';
  };

  const handleRemoveImage = () => {
    setCalendarImageUrl(null);
  };

  const sortedPeriods = React.useMemo(() => {
    return [...academicPeriods]
        .filter(p => {
            if (levelFilter === 'all') return true;
            return p.level === levelFilter || p.level === 'all';
        })
        .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  }, [academicPeriods, levelFilter]);
  
  const notebookLink = userProfile.notebookLMLink || 'https://notebooklm.google.com/';

  return (
    <div className="flex h-full flex-col">
       <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*,application/pdf"
        className="hidden"
      />
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedPeriod ? 'Editar Periodo' : 'Añadir Nuevo Periodo'}</DialogTitle>
          </DialogHeader>
          <AcademicPeriodForm periodToEdit={selectedPeriod} onFinished={() => setIsFormOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Importar Periodos desde Calendario</DialogTitle>
             <DialogDescription>
              Sube una imagen o PDF de un calendario académico para extraer automáticamente los periodos lectivos.
            </DialogDescription>
          </DialogHeader>
          {importFile ? (
            <AcademicPeriodImporter file={importFile} onFinished={() => setIsImportDialogOpen(false)} />
          ) : (
             <div className="grid grid-cols-1 pt-4">
                <button
                    onClick={() => handleUploadClick()}
                    className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed rounded-lg hover:bg-accent transition-colors"
                >
                    <FileUp className="h-8 w-8 text-primary" />
                    <span className="font-semibold">Subir Archivo de Calendario</span>
                    <span className="text-sm text-center text-muted-foreground">Sube una imagen o PDF.</span>
                </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      <PageHeader title="Periodos Lectivos">
        <Tabs value={view} onValueChange={(v) => setView(v as any)}>
            <TabsList>
                <TabsTrigger value="card">Fichas</TabsTrigger>
                <TabsTrigger value="timeline">Línea de Tiempo</TabsTrigger>
                <TabsTrigger value="image">Imagen de Calendario</TabsTrigger>
            </TabsList>
        </Tabs>
        {view !== 'image' && (
          <Select value={levelFilter} onValueChange={(v) => setLevelFilter(v as any)}>
            <SelectTrigger className="w-full sm:w-[220px]">
              <SelectValue placeholder="Filtrar por nivel..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los niveles</SelectItem>
              <SelectItem value="secundario">Nivel Secundario</SelectItem>
              <SelectItem value="superior_no_universitario">Superior (No Universitario)</SelectItem>
              <SelectItem value="superior_universitario">Superior (Universitario)</SelectItem>
            </SelectContent>
          </Select>
        )}
        <Button variant="outline" asChild>
            <a href={notebookLink} target="_blank" rel="noopener noreferrer">
                <BrainCircuit className="mr-2 h-4 w-4" />
                Consultar en NotebookLM
            </a>
        </Button>
         <Button onClick={() => setIsImportDialogOpen(true)} variant="outline">
            <Sparkles className="mr-2 h-4 w-4" />
            Importar de Calendario con IA
        </Button>
        <Button onClick={handleAddNew}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Añadir Periodo
        </Button>
      </PageHeader>
      <div className={cn("flex-1 overflow-y-auto", view !== 'image' && 'p-8')}>
        {view === 'image' ? (
          <ImageView 
              imageUrl={calendarImageUrl} 
              onUpload={handleUploadClick}
              onRemove={handleRemoveImage}
          />
        ) : sortedPeriods.length > 0 ? (
            view === 'card' 
            ? <CardView periods={sortedPeriods} onEdit={handleEdit} onDelete={deleteAcademicPeriod} holidays={events} /> 
            : <TimelineView periods={sortedPeriods} onEdit={handleEdit} onDelete={deleteAcademicPeriod} holidays={events} />
        ) : (
          <EmptyPeriodsView />
        )}
      </div>
    </div>
  );
}
