
'use client';

import * as React from 'react';
import { PlusCircle, Upload, MoreVertical, Archive, ArchiveRestore, Copy, X, CalendarPlus, LayoutGrid, Rows3, ListChecks, FileDown, Trash2 } from 'lucide-react';
import { useApp } from '@/contexts/app-context';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SubjectForm } from '@/components/subject-form';
import type { Subject, EducationLevel, AcademicPeriod } from '@/lib/types';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ExamScheduleGenerator } from '@/components/exam-schedule-generator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { renderToStaticMarkup } from 'react-dom/server';
import { parse } from 'date-fns';

/**
 * A robust CSV parser that handles quoted fields, BOM, and both comma/semicolon delimiters.
 */
function parseCsv(text: string): Record<string, string>[] {
    // Handle UTF-8 BOM (Byte Order Mark)
    if (text.startsWith('ufeff')) {
        text = text.slice(1);
    }
    const cleanText = text.replace(/\r/g, ''); // Remove carriage returns
    const lines = cleanText.trim().split('\n');
    if (lines.length < 1) return [];

    // Detect delimiter (comma or semicolon)
    const headerLine = lines[0];
    const delimiter = headerLine.includes(';') ? ';' : ',';
    
    // Parse header, removing quotes and converting to lowercase
    const header = headerLine.split(delimiter).map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
    const rows = lines.slice(1);
    
    return rows.map(rowStr => {
        if (!rowStr.trim()) return {}; // Skip empty rows

        // Regex to split by the detected delimiter but ignore delimiters inside double quotes
        const values = rowStr.split(new RegExp(`${delimiter}(?=(?:(?:[^"]*"){2})*[^"]*$)`));
        
        const obj: Record<string, string> = {};
        header.forEach((key, i) => {
            let value = (values[i] || '').trim();
            // Remove quotes if they exist at the start and end and unescape double quotes
            if (value.startsWith('"') && value.endsWith('"')) {
                value = value.substring(1, value.length - 1).replace(/""/g, '"');
            }
            obj[key] = value;
        });
        return obj;
    }).filter(obj => Object.keys(obj).length > 0 && Object.values(obj).some(v => !!v));
}

const colorPalette = [
  'hsl(210 100% 50%)',
  'hsl(150 100% 40%)',
  'hsl(30 100% 50%)',
  'hsl(300 100% 50%)',
  'hsl(50 100% 50%)',
  'hsl(0 100% 60%)',
];

const levelTranslations: Record<EducationLevel, string> = {
  secundario: 'Secundario',
  superior_no_universitario: 'Superior (No Universitario)',
  superior_universitario: 'Superior (Universitario)',
};


function SubjectCard({
  subject,
  isSelected,
  onAction,
  academicPeriod,
}: {
  subject: Subject;
  isSelected: boolean;
  onAction: (action: string, subject: Subject, payload?: any) => void;
  academicPeriod?: AcademicPeriod;
}) {
  const router = useRouter();

  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Navigate to the programming page, but prevent navigation if a button, link or checkbox was clicked
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('[role="checkbox"]') || target.closest('a') || target.closest('[role="menuitem"]')) {
      e.stopPropagation();
      return;
    }
    router.push(`/subjects/${subject.id}/programacion`);
  };

  const handleMenuItemClick = (e: React.MouseEvent, action: string, subject: Subject) => {
    e.stopPropagation(); // Prevent card click from firing
    onAction(action, subject);
  };


  return (
    <div className="relative">
        <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onAction('select', subject, checked)}
            className="absolute top-4 left-4 z-10 h-6 w-6 bg-white"
            aria-label={`Seleccionar ${subject.name}`}
        />
        <Card 
            onClick={handleCardClick}
            className={cn("group flex flex-col transition-all hover:shadow-lg h-full cursor-pointer", subject.status === 'archived' && 'bg-muted/70', isSelected && "ring-2 ring-primary border-primary")}
        >
            <CardHeader className="flex flex-row items-start justify-between pb-3 pl-14">
                <div>
                    <CardTitle className={cn("font-headline text-lg", subject.status === 'archived' && 'line-through text-muted-foreground')} style={{ color: subject.color }}>{subject.name}</CardTitle>
                    <CardDescription>{levelTranslations[subject.level]}</CardDescription>
                </div>
                <div className="flex items-center gap-1">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem asChild>
                                <Link href={`/subjects/${subject.id}/cronograma`}>
                                    <ListChecks className="mr-2 h-4 w-4" />
                                    <span>Generar Cronograma</span>
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => handleMenuItemClick(e, 'generateExams', subject)}>
                                <CalendarPlus className="mr-2 h-4 w-4" />
                                <span>Generar Mesas de Examen</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={(e) => handleMenuItemClick(e, 'duplicate', subject)}>
                                <Copy className="mr-2 h-4 w-4" />
                                <span>Duplicar</span>
                            </DropdownMenuItem>
                            {subject.status === 'active' ? (
                                <DropdownMenuItem onClick={(e) => handleMenuItemClick(e, 'archive', subject)}>
                                    <Archive className="mr-2 h-4 w-4" />
                                    <span>Archivar</span>
                                </DropdownMenuItem>
                            ) : (
                                <DropdownMenuItem onClick={(e) => handleMenuItemClick(e, 'unarchive', subject)}>
                                    <ArchiveRestore className="mr-2 h-4 w-4" />
                                    <span>Desarchivar</span>
                                </DropdownMenuItem>
                            )}
                        
                            <DropdownMenuSeparator />
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        <span>Eliminar</span>
                                    </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Esta acción no se puede deshacer. Esto eliminará permanentemente la asignatura "{subject.name}" y todos sus eventos asociados.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => onAction('delete', subject)}>Eliminar</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <div 
                        className="h-4 w-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: subject.color }}
                    />
                </div>
            </CardHeader>
            <CardContent className="flex flex-col flex-grow justify-between pl-14">
                <div className={cn("text-sm text-muted-foreground space-y-1.5 flex-grow", subject.status === 'archived' && 'text-muted-foreground/70')}>
                    <p><span className="font-semibold text-foreground/80">Institución:</span> {subject.institution}</p>
                    <p><span className="font-semibold text-foreground/80">Año:</span> {subject.year}</p>
                    {academicPeriod && <p><span className="font-semibold text-foreground/80">Periodo:</span> {academicPeriod.name}</p>}
                    {subject.level.startsWith('superior') ? (
                        <>
                            {subject.career && <p><span className="font-semibold text-foreground/80">Carrera:</span> {subject.career}</p>}
                        </>
                    ) : null}
                    {subject.class_groups && subject.class_groups.length > 0 && (
                        <div className="space-y-1 pt-1">
                            <p className="font-semibold text-foreground/80">{subject.level === 'secundario' ? 'Divisiones:' : 'Comisiones:'}</p>
                            <div className="flex flex-wrap gap-1">
                                {subject.class_groups.map(cg => <Badge key={cg.id} variant="secondary">{cg.name} ({cg.cathedraHours || 0}hs)</Badge>)}
                            </div>
                        </div>
                    )}
                </div>
                {subject.notes && (
                    <div className="mt-4 pt-2 border-t border-dashed">
                        <p className="text-xs text-foreground font-semibold">Observaciones:</p>
                        <p className="text-xs text-muted-foreground whitespace-pre-wrap break-words">{subject.notes}</p>
                    </div>
                )}
            </CardContent>
        </Card>
    </div>
  );
}


function CardView({ subjects, onAction, selectedSubjects }: { subjects: Subject[], onAction: (action: string, subject: Subject, payload?: any) => void, selectedSubjects: Set<string> }) {
  const { academicPeriods } = useApp();
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {subjects.map((subject) => {
            const academicPeriod = academicPeriods.find(p => p.id === subject.academicPeriodId);
            return (
                <SubjectCard
                    key={subject.id}
                    subject={subject}
                    isSelected={selectedSubjects.has(subject.id)}
                    onAction={onAction}
                    academicPeriod={academicPeriod}
                />
            );
        })}
    </div>
  );
}

function ListView({ 
  subjects, 
  onAction, 
  selectedSubjects,
  onSelectAll,
  isAllSelected,
  isSomeSelected
}: { 
  subjects: Subject[], 
  onAction: (action: string, subject: Subject, payload?: any) => void, 
  selectedSubjects: Set<string>,
  onSelectAll: (checked: boolean) => void,
  isAllSelected: boolean,
  isSomeSelected: boolean,
}) {
  const { academicPeriods } = useApp();

  return (
    <Card>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={isSomeSelected ? 'indeterminate' : isAllSelected}
                  onCheckedChange={(checked) => onSelectAll(!!checked)}
                  disabled={subjects.length === 0}
                  aria-label="Seleccionar todo"
                />
              </TableHead>
              <TableHead>Asignatura</TableHead>
              <TableHead>Institución / Periodo</TableHead>
              <TableHead>Nivel</TableHead>
              <TableHead>Grupos</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subjects.map((subject) => {
              const academicPeriod = academicPeriods.find(p => p.id === subject.academicPeriodId);
              return (
                <TableRow key={subject.id} data-state={selectedSubjects.has(subject.id) ? "selected" : undefined}>
                  <TableCell>
                    <Checkbox
                      checked={selectedSubjects.has(subject.id)}
                      onCheckedChange={(checked) => onAction('select', subject, checked)}
                      aria-label={`Seleccionar ${subject.name}`}
                    />
                  </TableCell>
                  <TableCell>
                      <Link href={`/subjects/${subject.id}/programacion`} className="flex items-center gap-3 hover:underline">
                          <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: subject.color }} />
                          <div className="flex flex-col">
                              <span className="font-medium">{subject.name}</span>
                              {subject.status === 'archived' && <Badge variant="secondary" className="w-fit">Archivada</Badge>}
                          </div>
                      </Link>
                  </TableCell>
                  <TableCell>
                    <div>{subject.institution}</div>
                    {academicPeriod && <div className="text-xs text-muted-foreground">{academicPeriod.name}</div>}
                  </TableCell>
                  <TableCell>{levelTranslations[subject.level]}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {subject.class_groups?.map(g => <Badge key={g.id} variant="outline">{g.name} ({g.cathedraHours || 0}hs)</Badge>)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                                <Link href={`/subjects/${subject.id}/cronograma`}>
                                    <ListChecks className="mr-2 h-4 w-4" />
                                    <span>Generar Cronograma</span>
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onAction('generateExams', subject)}><CalendarPlus className="mr-2 h-4 w-4" /><span>Generar Exámenes</span></DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => onAction('duplicate', subject)}><Copy className="mr-2 h-4 w-4" /><span>Duplicar</span></DropdownMenuItem>
                            {subject.status === 'active' ? (
                                <DropdownMenuItem onClick={() => onAction('archive', subject)}><Archive className="mr-2 h-4 w-4" /><span>Archivar</span></DropdownMenuItem>
                            ) : (
                                <DropdownMenuItem onClick={() => onAction('unarchive', subject)}><ArchiveRestore className="mr-2 h-4 w-4" /><span>Desarchivar</span></DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        <span>Eliminar</span>
                                    </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Esta acción no se puede deshacer. Esto eliminará permanentemente la asignatura "{subject.name}" y todos sus eventos asociados.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => onAction('delete', subject)}>Eliminar</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
            )})}
          </TableBody>
        </Table>
      </div>
    </Card>
  )
}

function TotalsSummary({ subjects }: { subjects: Subject[] }) {
  const { academicPeriods } = useApp();
  
  const summary = React.useMemo(() => {
    const activeSubjects = subjects.filter(s => s.status === 'active');
    const totalsByPeriod: { [periodId: string]: { periodName: string; cathedraHours: number; clockHours: number; } } = {};

    activeSubjects.forEach(subject => {
      if (!subject.academicPeriodId || !subject.class_groups) return;
      
      const period = academicPeriods.find(p => p.id === subject.academicPeriodId);
      if (!period) return;

      if (!totalsByPeriod[subject.academicPeriodId]) {
        totalsByPeriod[subject.academicPeriodId] = {
          periodName: period.name,
          cathedraHours: 0,
          clockHours: 0,
        };
      }

      let subjectCathedraHours = 0;
      if (Array.isArray(subject.class_groups)) {
        subject.class_groups.forEach(group => {
            if (group.cathedraHours && group.cathedraHours > 0) {
            subjectCathedraHours += group.cathedraHours;
            }
        });
      }
      
      let subjectClockHours = 0;
      if (subject.level === 'superior_universitario') {
          subjectClockHours = subjectCathedraHours;
      } else {
          const minutesPerCathedraHour = subject.level === 'secundario' ? 40 : 45;
          subjectClockHours = (subjectCathedraHours * minutesPerCathedraHour) / 60;
      }
      
      totalsByPeriod[subject.academicPeriodId].cathedraHours += subjectCathedraHours;
      totalsByPeriod[subject.academicPeriodId].clockHours += subjectClockHours;
    });
    
    return Object.values(totalsByPeriod)
      .filter(item => item.cathedraHours > 0 || item.clockHours > 0)
      .sort((a, b) => a.periodName.localeCompare(b.periodName));
  }, [subjects, academicPeriods]);

  if (subjects.length === 0 || summary.length === 0) {
    return null;
  }

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle>Resumen de Carga Horaria Semanal</CardTitle>
        <CardDescription>
          Cálculo total para las asignaturas activas que se muestran actualmente según los filtros aplicados.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Periodo Lectivo</TableHead>
                <TableHead className="text-right">Horas Cátedra Totales</TableHead>
                <TableHead className="text-right">Horas Reloj Totales</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summary.map(item => (
                <TableRow key={item.periodName}>
                  <TableCell className="font-medium">{item.periodName}</TableCell>
                  <TableCell className="text-right font-semibold">{item.cathedraHours.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-semibold">{item.clockHours.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}


export default function SubjectsPage() {
  const { subjects, deleteSubject, addSubject, archiveSubject, unarchiveSubject, duplicateSubject, deleteMultipleSubjects, archiveMultipleSubjects, addMultipleEvents } = useApp();
  const { toast } = useToast();
  const [subjectsForGenerator, setSubjectsForGenerator] = React.useState<Subject[] | null>(null);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isGeneratorOpen, setIsGeneratorOpen] = React.useState(false);
  const [showArchived, setShowArchived] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [levelFilter, setLevelFilter] = React.useState<"all" | EducationLevel>("all");
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedSubjects, setSelectedSubjects] = React.useState<Set<string>>(new Set());
  const [hasMounted, setHasMounted] = React.useState(false);
  const [view, setView] = React.useState<'card' | 'list'>('card');


  React.useEffect(() => {
    setHasMounted(true);
  }, []);
  
  const handleAddNew = () => {
    setIsFormOpen(true);
  };
  
  const handleFormFinished = (data?: Subject) => {
    if (data) {
        addSubject(data);
    }
    setIsFormOpen(false);
  }

  const handleOpenGenerator = (subject: Subject) => {
    setSubjectsForGenerator([subject]);
    setIsGeneratorOpen(true);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleDownloadTemplate = () => {
    const csvHeader = "nombre_materia,institucion,nivel,tipo_examen,fecha,hora\n";
    const csvExample1 = `"Física","Colegio Nacional","secundario","EXAM_REGULAR","25-07-2024","10:00"\n`;
    const csvExample2 = `"Álgebra","UBA","superior_universitario","EXAM_FINAL_PRIMER_LLAMADO","22-07-2024","09:00"`;
    const csvContent = csvHeader + csvExample1 + csvExample2;

    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'plantilla_importacion_examenes.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({
        title: "Descarga Iniciada",
        description: "Se ha descargado la plantilla CSV.",
    });
  };
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const fileText = await file.text();
      const results = parseCsv(fileText);

      if (results.length === 0) {
        toast({ variant: "destructive", title: "Archivo vacío", description: "El archivo CSV no contiene datos." });
        return;
      }

      const eventsToCreate: Omit<EventType, 'id' | 'status'>[] = [];
      let processedCount = 0;
      let errorCount = 0;

      for (const row of results) {
        const subject = subjects.find(
          (s) =>
            s.name.toLowerCase() === row.nombre_materia?.toLowerCase() &&
            s.institution.toLowerCase() === row.institucion?.toLowerCase()
        );

        if (!subject) {
          errorCount++;
          continue;
        }

        const eventType = row.tipo_examen || '';
        const dateStr = row.fecha; // "DD-MM-YYYY"
        const timeStr = row.hora; // "HH:mm"

        if (dateStr && timeStr) {
            const eventDate = parse(`${dateStr} ${timeStr}`, 'dd-MM-yyyy HH:mm', new Date());

            if (eventType && eventType.startsWith('EXAM_') && eventDate) {
                 eventsToCreate.push({
                    title: `${subject.name} - ${eventType.replace('EXAM_', '').replace(/_/g, ' ')}`,
                    event_type: eventType,
                    event_datetime: eventDate,
                    description: `Examen importado desde CSV. Institución: ${subject.institution}.`,
                    subject_id: subject.id,
                    reminder: { type: 'simple', timing: '2d', channels: ['in_app'] }
                });
                processedCount++;
            } else {
              errorCount++;
            }
        } else {
            errorCount++;
        }
      }

      if (eventsToCreate.length > 0) {
        addMultipleEvents(eventsToCreate);
      }
      
      toast({
        title: "Importación CSV Completada",
        description: `${processedCount} exámenes generados. ${errorCount} filas no se pudieron procesar.`,
      });

    } catch (error) {
      console.error("Error al importar CSV de exámenes:", error);
      toast({ variant: "destructive", title: "Error de Importación", description: "Hubo un problema al procesar el archivo CSV." });
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };


  const visibleSubjects = React.useMemo(() => {
    const subjectsToFilter = showArchived
      ? subjects.filter(s => s.status === 'archived')
      : subjects.filter(s => s.status === 'active');

    return subjectsToFilter.filter((subject) => {
      const lowerCaseSearchTerm = searchTerm.toLowerCase().trim();
      
      const levelMatch = levelFilter === 'all' || subject.level.toLowerCase() === levelFilter.toLowerCase();
      
      const searchMatch = !lowerCaseSearchTerm || [
        subject.name,
        subject.institution,
        subject.career,
        subject.year,
        ...(Array.isArray(subject.class_groups) ? subject.class_groups.map((g) => g.name) : []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(lowerCaseSearchTerm);

      return levelMatch && searchMatch;
    });
  }, [subjects, showArchived, levelFilter, searchTerm]);

  const handleSubjectSelection = (id: string, checked: boolean) => {
    setSelectedSubjects(prev => {
        const newSet = new Set(prev);
        if (checked) {
            newSet.add(id);
        } else {
            newSet.delete(id);
        }
        return newSet;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedSubjects(new Set(visibleSubjects.map(s => s.id)));
    } else {
      setSelectedSubjects(new Set());
    }
  };

  const numVisible = visibleSubjects.length;
  const numSelected = selectedSubjects.size;
  const isAllSelected = numVisible > 0 && numSelected === numVisible;
  const isSomeSelected = numSelected > 0 && numSelected < numVisible;


  const selectedSubjectObjects = React.useMemo(() => {
    if (selectedSubjects.size === 0) return [];
    return subjects.filter(s => selectedSubjects.has(s.id));
  }, [selectedSubjects, subjects]);

  const areLevelsConsistent = React.useMemo(() => {
    if (selectedSubjectObjects.length < 2) return true;
    const firstLevel = selectedSubjectObjects[0].level;
    return selectedSubjectObjects.every(s => s.level === firstLevel);
  }, [selectedSubjectObjects]);
  
  const handleOpenGeneratorForSelected = () => {
    if (!areLevelsConsistent) {
        toast({
            variant: "destructive",
            title: "Niveles Inconsistentes",
            description: "Por favor, selecciona asignaturas del mismo nivel educativo (Superior o Secundario) para generar mesas de examen en conjunto.",
        });
        return;
    }
    setSubjectsForGenerator(selectedSubjectObjects);
    setIsGeneratorOpen(true);
  };

  const handleSubjectAction = (action: string, subject: Subject, payload?: any) => {
    switch (action) {
      case 'select':
        handleSubjectSelection(subject.id, !!payload);
        break;
      case 'duplicate':
        duplicateSubject(subject.id);
        toast({ title: "Asignatura Duplicada", description: `Se ha creado una copia de "${subject.name}".` });
        break;
      case 'archive':
        archiveSubject(subject.id);
        break;
      case 'unarchive':
        unarchiveSubject(subject.id);
        break;
      case 'delete':
        deleteSubject(subject.id);
        break;
      case 'generateExams':
        handleOpenGenerator(subject);
        break;
    }
  };
  
  React.useEffect(() => {
    if (!isGeneratorOpen) {
      setSubjectsForGenerator(null);
    }
  }, [isGeneratorOpen]);

  React.useEffect(() => {
    setSelectedSubjects(new Set());
  }, [levelFilter, searchTerm, showArchived, view]);

  const handleArchiveSelected = () => {
    archiveMultipleSubjects(selectedSubjects);
    toast({
        title: "Asignaturas Archivadas",
        description: `${selectedSubjects.size} asignatura(s) ha(n) sido archivada(s) correctamente.`,
    });
    setSelectedSubjects(new Set());
  };

  const handleDeleteSelected = () => {
    deleteMultipleSubjects(selectedSubjects);
    toast({
        title: "Asignaturas Eliminadas",
        description: `${selectedSubjects.size} asignatura(s) ha(n) sido eliminada(s) permanentemente.`,
        variant: 'destructive'
    });
    setSelectedSubjects(new Set());
  };

  return (
    <div className="flex h-full flex-col">
       <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".csv"
        className="hidden"
      />
       <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogContent className="sm:max-w-2xl flex flex-col max-h-[90dvh]">
                <DialogHeader>
                    <DialogTitle>Añadir Nueva Asignatura</DialogTitle>
                </DialogHeader>
                <SubjectForm subjectToEdit={null} onFinished={handleFormFinished} />
            </DialogContent>
        </Dialog>
        <Dialog open={isGeneratorOpen} onOpenChange={setIsGeneratorOpen}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>
                        {subjectsForGenerator && subjectsForGenerator.length > 1
                            ? `Generar Mesas para ${subjectsForGenerator.length} Asignaturas`
                            : `Generar Mesas de Examen para "${subjectsForGenerator?.[0]?.name}"`
                        }
                    </DialogTitle>
                </DialogHeader>
                {subjectsForGenerator && subjectsForGenerator.length > 0 && (
                  <ExamScheduleGenerator subjects={subjectsForGenerator} onFinished={() => setIsGeneratorOpen(false)} />
                )}
            </DialogContent>
        </Dialog>
        <PageHeader title={selectedSubjects.size > 0 ? `${selectedSubjects.size} seleccionada(s)` : 'Asignaturas'}>
            <div className={cn("flex flex-wrap items-center justify-end gap-2 w-full", selectedSubjects.size > 0 && 'flex-row')}>
              {selectedSubjects.size > 0 ? (
                 <>
                    <Button variant="ghost" size="icon" onClick={() => setSelectedSubjects(new Set())}>
                        <X className="h-5 w-5" />
                    </Button>
                    <div className="flex-grow md:flex-grow-0" />
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="outline" onClick={handleOpenGeneratorForSelected} disabled={!areLevelsConsistent}>
                                    <CalendarPlus className="mr-2 h-4 w-4" />
                                    Generar Exámenes
                                </Button>
                            </TooltipTrigger>
                            {!areLevelsConsistent && (
                                <TooltipContent>
                                    <p>Selecciona asignaturas del mismo nivel.</p>
                                </TooltipContent>
                            )}
                        </Tooltip>
                    </TooltipProvider>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="outline">
                                <Archive className="mr-2 h-4 w-4" />
                                Archivar
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>¿Archivar asignaturas seleccionadas?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Esta acción archivará {selectedSubjects.size} asignatura(s) y todos sus eventos asociados. Podrás desarchivarlas más tarde.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={handleArchiveSelected}>Archivar</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>

                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Eliminar
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar asignaturas seleccionadas?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Esta acción no se puede deshacer. Se eliminarán permanentemente {selectedSubjects.size} asignatura(s) y todos sus eventos asociados.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDeleteSelected}>Eliminar</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                  </>
              ) : (
                <>
                    <div className="flex flex-wrap items-center gap-2">
                      <Tabs value={view} onValueChange={(v) => setView(v as any)}>
                          <TabsList>
                              <TabsTrigger value="card"><LayoutGrid className="mr-2 h-4 w-4" />Fichas</TabsTrigger>
                              <TabsTrigger value="list"><Rows3 className="mr-2 h-4 w-4" />Lista</TabsTrigger>
                          </TabsList>
                      </Tabs>
                      <Select value={levelFilter} onValueChange={(value) => setLevelFilter(value as any)}>
                          <SelectTrigger className="w-full sm:w-auto sm:min-w-[220px]">
                              <SelectValue placeholder="Filtrar por nivel" />
                          </SelectTrigger>
                          <SelectContent>
                              <SelectItem value="all">Todos los niveles</SelectItem>
                              <SelectItem value="secundario">Secundario</SelectItem>
                              <SelectItem value="superior_no_universitario">Superior (No Universitario)</SelectItem>
                              <SelectItem value="superior_universitario">Superior (Universitario)</SelectItem>
                          </SelectContent>
                      </Select>
                      <Input
                          placeholder="Buscar por asignatura, carrera, curso..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full sm:w-auto sm:min-w-[250px]"
                      />
                      <div className="flex items-center space-x-2">
                          <Switch id="show-archived" checked={showArchived} onCheckedChange={setShowArchived} />
                          <Label htmlFor="show-archived">Mostrar archivadas</Label>
                      </div>
                    </div>
                    <div className="flex-grow" />
                    <div className="flex flex-wrap items-center gap-2">
                      <Button variant="outline" onClick={handleDownloadTemplate}>
                          <FileDown className="mr-2 h-4 w-4" />
                          Descargar Plantilla
                      </Button>
                      <Button variant="outline" onClick={handleImportClick}>
                          <Upload className="mr-2 h-4 w-4" />
                          Importar CSV
                      </Button>
                      <Button onClick={handleAddNew}>
                          <PlusCircle className="mr-2 h-4 w-4" />
                          Añadir Asignatura
                      </Button>
                    </div>
                </>
              )}
          </div>
        </PageHeader>
        <div className="flex-1 overflow-y-auto p-4 sm:p-8">
            {hasMounted ? (
                 visibleSubjects.length > 0 ? (
                    view === 'card' ? (
                        <CardView subjects={visibleSubjects} onAction={handleSubjectAction} selectedSubjects={selectedSubjects} />
                    ) : (
                        <ListView
                            subjects={visibleSubjects}
                            onAction={handleSubjectAction}
                            selectedSubjects={selectedSubjects}
                            onSelectAll={handleSelectAll}
                            isAllSelected={isAllSelected}
                            isSomeSelected={isSomeSelected}
                        />
                    )
                 ) : (
                     <div className="col-span-full flex h-64 items-center justify-center rounded-lg border-2 border-dashed bg-muted/50">
                        <div className="text-center">
                            <h3 className="text-lg font-semibold">No se encontraron asignaturas</h3>
                            <p className="text-muted-foreground">
                                Prueba a cambiar los filtros o a añadir una nueva asignatura.
                            </p>
                        </div>
                    </div>
                )
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {Array.from({ length: 8 }).map((_, index) => (
                      <Card key={index} className="h-full">
                          <CardHeader className="flex flex-row items-start justify-between pb-3 pl-14">
                            <div>
                              <Skeleton className="h-6 w-32 mb-1" />
                              <Skeleton className="h-4 w-20" />
                            </div>
                            <Skeleton className="h-4 w-4 rounded-full" />
                          </CardHeader>
                          <CardContent className="flex flex-col flex-grow justify-between pl-14 space-y-2">
                              <Skeleton className="h-4 w-4/5" />
                              <Skeleton className="h-4 w-3/5" />
                              <Skeleton className="h-4 w-4/5" />
                              <Skeleton className="h-4 w-1/2" />
                          </CardContent>
                      </Card>
                    ))}
                </div>
            )}
            <TotalsSummary subjects={visibleSubjects} />
        </div>
    </div>
  );
}
