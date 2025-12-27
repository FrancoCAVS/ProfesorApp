
'use client';

import * as React from 'react';
import { useApp } from '@/contexts/app-context';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit, Trash2, Sparkles, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Event as EventType } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { HolidayForm } from '@/components/holiday-form';
import { HolidayImporter } from '@/components/holiday-importer';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';

const HolidayRow = ({ event, onEdit, onDelete, isSelected, onSelect }: { event: EventType, onEdit: (event: EventType) => void, onDelete: (eventId: string) => void, isSelected: boolean, onSelect: (id: string, checked: boolean) => void }) => {
    return (
        <TableRow data-state={isSelected ? 'selected' : undefined}>
             <TableCell className="w-[50px] pl-4">
                <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => onSelect(event.id, !!checked)}
                    aria-label={`Seleccionar feriado ${event.title}`}
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
                                    Esta acción eliminará permanentemente el feriado "{event.title}".
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


export default function HolidaysPage() {
    const { events, deleteEvent, deleteMultipleEvents } = useApp();
    const { toast } = useToast();
    const [selectedEvent, setSelectedEvent] = React.useState<EventType | null>(null);
    const [isFormOpen, setIsFormOpen] = React.useState(false);
    const [isImporterOpen, setIsImporterOpen] = React.useState(false);
    const [selectedHolidays, setSelectedHolidays] = React.useState<Set<string>>(new Set());
    const [hasMounted, setHasMounted] = React.useState(false);

    React.useEffect(() => {
        setHasMounted(true);
    }, []);

    const holidays = React.useMemo(() => {
        return events
        .map(event => ({
            ...event,
            event_datetime: new Date(event.event_datetime) 
        }))
        .filter(e => e.event_type === 'HOLIDAY' && e.status === 'active')
        .sort((a, b) => {
            // Primer criterio: la fecha
            const dateComparison = a.event_datetime.getTime() - b.event_datetime.getTime();
            
            // Si las fechas son diferentes, usa ese resultado
            if (dateComparison !== 0) {
                return dateComparison;
            }
            
            // Si las fechas son iguales (desempate), usa el título
            return a.title.localeCompare(b.title);
        });
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
            setSelectedHolidays(new Set(holidays.map(h => h.id)));
        } else {
            setSelectedHolidays(new Set());
        }
    };

    const handleSelectOne = (holidayId: string, checked: boolean) => {
        setSelectedHolidays(prev => {
            const newSet = new Set(prev);
            if (checked) {
                newSet.add(holidayId);
            } else {
                newSet.delete(holidayId);
            }
            return newSet;
        });
    };

    const handleDeleteSelected = () => {
        deleteMultipleEvents(selectedHolidays);
        toast({
          title: 'Feriados Eliminados',
          description: `${selectedHolidays.size} registro(s) ha(n) sido eliminado(s) del historial.`,
        });
        setSelectedHolidays(new Set());
    };

    const numSelected = selectedHolidays.size;
    const numTotal = holidays.length;
    const isAllSelected = numSelected > 0 && numSelected === numTotal;
    const isSomeSelected = numSelected > 0 && numSelected < numTotal;

    return (
        <div className="flex h-full flex-col">
            <PageHeader title={numSelected > 0 ? `${numSelected} seleccionado(s)` : 'Días Feriados'}>
                {numSelected > 0 ? (
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => setSelectedHolidays(new Set())}>
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
                                        Esta acción eliminará permanentemente {numSelected} registro(s) de feriados.
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
                            Importar Feriados con IA
                        </Button>
                        <Button onClick={handleAddNew}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Añadir Feriado Manualmente
                        </Button>
                    </>
                )}
            </PageHeader>
            
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{selectedEvent ? 'Editar Feriado' : 'Añadir Nuevo Feriado'}</DialogTitle>
                    </DialogHeader>
                    <HolidayForm holidayToEdit={selectedEvent} onFinished={() => setIsFormOpen(false)} />
                </DialogContent>
            </Dialog>
            
            <Dialog open={isImporterOpen} onOpenChange={setIsImporterOpen}>
                <DialogContent className="sm:max-w-2xl">
                     <DialogHeader>
                        <DialogTitle>Importar Feriados Nacionales y Provinciales</DialogTitle>
                         <DialogDescription>
                          Usa la IA para obtener una lista de feriados para un año específico. Revisa y selecciona los que deseas añadir a tu calendario.
                        </DialogDescription>
                      </DialogHeader>
                    <HolidayImporter onFinished={() => setIsImporterOpen(false)} />
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
                ) : holidays.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px] pl-4">
                                    <Checkbox
                                        checked={isSomeSelected ? 'indeterminate' : isAllSelected}
                                        onCheckedChange={(checked) => handleSelectAll(!!checked)}
                                        aria-label="Seleccionar todo"
                                        disabled={holidays.length === 0}
                                    />
                                </TableHead>
                                <TableHead className="w-[250px]">Fecha</TableHead>
                                <TableHead>Nombre del Feriado</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {holidays.map(h => (
                                <HolidayRow
                                    key={h.id}
                                    event={h}
                                    onEdit={handleEdit}
                                    onDelete={deleteEvent}
                                    isSelected={selectedHolidays.has(h.id)}
                                    onSelect={handleSelectOne}
                                />
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                     <div className="flex h-[calc(100vh-200px)] items-center justify-center rounded-lg border-2 border-dashed bg-muted/50">
                        <div className="text-center">
                            <Sparkles className="mx-auto h-12 w-12 text-muted-foreground" />
                            <h3 className="mt-4 text-lg font-semibold">No hay feriados definidos</h3>
                            <p className="mt-2 text-sm text-muted-foreground">
                                Importa los feriados con IA o añádelos manualmente.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
