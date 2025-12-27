
'use client';

import * as React from 'react';
import { useApp } from '@/contexts/app-context';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit, Trash2, X, Star, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Event as EventType } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { CommemorativeDateForm } from '@/components/commemorative-date-form';
import { CommemorativeDateImporter } from '@/components/commemorative-date-importer';
import { Skeleton } from '@/components/ui/skeleton';


const CommemorativeDateRow = ({ event, onEdit, onDelete, isSelected, onSelect }: { event: EventType, onEdit: (event: EventType) => void, onDelete: (eventId: string) => void, isSelected: boolean, onSelect: (id: string, checked: boolean) => void }) => {
    return (
        <TableRow data-state={isSelected ? 'selected' : undefined}>
             <TableCell className="w-[50px] pl-4">
                <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => onSelect(event.id, !!checked)}
                    aria-label={`Seleccionar fecha ${event.title}`}
                />
            </TableCell>
            <TableCell className="font-medium">{format(event.event_datetime, 'PPP', { locale: es })}</TableCell>
            <TableCell>{event.title}</TableCell>
            <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => onEdit(event)}>
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
                                <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Esta acción eliminará permanentemente la fecha "{event.title}".
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => onDelete(event.id)}>Eliminar</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </TableCell>
        </TableRow>
    );
};


export default function CommemorativeDatesPage() {
    const { events, deleteEvent, deleteMultipleEvents } = useApp();
    const { toast } = useToast();
    const [selectedEvent, setSelectedEvent] = React.useState<EventType | null>(null);
    const [isFormOpen, setIsFormOpen] = React.useState(false);
    const [isImporterOpen, setIsImporterOpen] = React.useState(false);
    const [selectedDates, setSelectedDates] = React.useState<Set<string>>(new Set());
    const [hasMounted, setHasMounted] = React.useState(false);

    React.useEffect(() => {
        setHasMounted(true);
    }, []);

    const commemorativeDates = React.useMemo(() => {
        if (!hasMounted) return [];
        return events
            .filter(e => e.event_type === 'COMMEMORATIVE' && e.status === 'active')
            .sort((a, b) => a.event_datetime.getTime() - b.event_datetime.getTime());
    }, [events, hasMounted]);

    const handleEdit = (event: EventType) => {
        setSelectedEvent(event);
        setIsFormOpen(true);
    };

    const handleAddNew = () => {
        setSelectedEvent(null);
        setIsFormOpen(true);
    };

    React.useEffect(() => {
        if (!isFormOpen && !isImporterOpen) {
            setSelectedEvent(null);
        }
    }, [isFormOpen, isImporterOpen]);

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedDates(new Set(commemorativeDates.map(h => h.id)));
        } else {
            setSelectedDates(new Set());
        }
    };

    const handleSelectOne = (id: string, checked: boolean) => {
        setSelectedDates(prev => {
            const newSet = new Set(prev);
            if (checked) {
                newSet.add(id);
            } else {
                newSet.delete(id);
            }
            return newSet;
        });
    };

    const handleDeleteSelected = () => {
        deleteMultipleEvents(selectedDates);
        toast({
          title: 'Fechas Eliminadas',
          description: `${selectedDates.size} registro(s) ha(n) sido eliminado(s) del historial.`,
        });
        setSelectedDates(new Set());
    };

    const numSelected = selectedDates.size;
    const numTotal = commemorativeDates.length;
    const isAllSelected = numSelected > 0 && numSelected === numTotal;
    const isSomeSelected = numSelected > 0 && numSelected < numTotal;

    return (
        <div className="flex h-full flex-col">
            <PageHeader title={numSelected > 0 ? `${numSelected} seleccionado(s)` : 'Fechas Conmemorativas'}>
                {numSelected > 0 ? (
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => setSelectedDates(new Set())}>
                            <X className="h-5 w-5" />
                        </Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Eliminar ({numSelected})
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Esta acción eliminará permanentemente {numSelected} registro(s) de fechas conmemorativas.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDeleteSelected}>Eliminar</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                ) : (
                    <>
                        <Button onClick={() => setIsImporterOpen(true)}>
                            <Sparkles className="mr-2 h-4 w-4" />
                            Importar con IA
                        </Button>
                        <Button onClick={handleAddNew}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Añadir Fecha Manualmente
                        </Button>
                    </>
                )}
            </PageHeader>
            
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{selectedEvent ? 'Editar Fecha' : 'Añadir Nueva Fecha'}</DialogTitle>
                        <DialogDescription>
                            Añade fechas significativas para la planificación de tus clases. Estas fechas no suspenden la actividad escolar.
                        </DialogDescription>
                    </DialogHeader>
                    <CommemorativeDateForm dateToEdit={selectedEvent} onFinished={() => setIsFormOpen(false)} />
                </DialogContent>
            </Dialog>

            <Dialog open={isImporterOpen} onOpenChange={setIsImporterOpen}>
                <DialogContent className="sm:max-w-2xl">
                     <DialogHeader>
                        <DialogTitle>Importar Fechas Conmemorativas</DialogTitle>
                         <DialogDescription>
                          Usa la IA para obtener una lista de efemérides y fechas relevantes para el ámbito educativo.
                        </DialogDescription>
                      </DialogHeader>
                    <CommemorativeDateImporter onFinished={() => setIsImporterOpen(false)} />
                </DialogContent>
            </Dialog>
            
            <div className="flex-1 overflow-y-auto p-8">
                {!hasMounted ? (
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px] pl-4"><Skeleton className="h-5 w-5" /></TableHead>
                                <TableHead className="w-[250px]"><Skeleton className="h-5 w-24" /></TableHead>
                                <TableHead><Skeleton className="h-5 w-48" /></TableHead>
                                <TableHead className="text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell className="pl-4"><Skeleton className="h-5 w-5" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-64" /></TableCell>
                                    <TableCell><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : commemorativeDates.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px] pl-4">
                                    <Checkbox
                                        checked={isSomeSelected ? 'indeterminate' : isAllSelected}
                                        onCheckedChange={(checked) => handleSelectAll(!!checked)}
                                        aria-label="Seleccionar todo"
                                        disabled={commemorativeDates.length === 0}
                                    />
                                </TableHead>
                                <TableHead className="w-[250px]">Fecha</TableHead>
                                <TableHead>Nombre de la Fecha</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {commemorativeDates.map(h => (
                                <CommemorativeDateRow
                                    key={h.id}
                                    event={h}
                                    onEdit={handleEdit}
                                    onDelete={deleteEvent}
                                    isSelected={selectedDates.has(h.id)}
                                    onSelect={handleSelectOne}
                                />
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                     <div className="flex h-[calc(100vh-200px)] items-center justify-center rounded-lg border-2 border-dashed bg-muted/50">
                        <div className="text-center">
                            <Star className="mx-auto h-12 w-12 text-muted-foreground" />
                            <h3 className="mt-4 text-lg font-semibold">No hay fechas conmemorativas definidas</h3>
                            <p className="mt-2 text-sm text-muted-foreground">
                                Importa fechas con la IA o añádelas manualmente para tenerlas presentes.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
