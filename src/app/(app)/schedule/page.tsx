
'use client';

import * as React from 'react';
import { useApp } from '@/contexts/app-context';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { Subject, ScheduleEntry, ClassGroup, EducationLevel } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Clock, Printer } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, parse, differenceInMinutes } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const daysOfWeek = [
    'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'
];
const ddjjDays = [1, 2, 3, 4, 5, 6]; // Lunes a Sábado

interface ScheduledClass extends ScheduleEntry {
    subject: Subject;
    group: ClassGroup;
}

const levelShortNames: Record<EducationLevel, string> = {
    'secundario': 'Secundario',
    'superior_no_universitario': 'Sup. (No Uni)',
    'superior_universitario': 'Sup. (Uni)',
};

function ScheduleCardView() {
    const { subjects } = useApp();
    const [hasMounted, setHasMounted] = React.useState(false);

    React.useEffect(() => {
        setHasMounted(true);
    }, []);

    const { scheduledClassesByDay, weekDaysWithClasses } = React.useMemo(() => {
        const grouped: Record<number, ScheduledClass[]> = {};
        
        subjects.forEach(subject => {
            if (subject.status === 'active' && subject.class_groups) {
                subject.class_groups.forEach(group => {
                    group.schedule.forEach(entry => {
                        const day = Number(entry.day);
                        if (!grouped[day]) {
                            grouped[day] = [];
                        }
                        grouped[day].push({ ...entry, subject, group });
                    });
                });
            }
        });
        
        for (const day in grouped) {
            grouped[day].sort((a, b) => a.startTime.localeCompare(b.startTime));
        }

        const sortedDays = Object.keys(grouped).map(Number).sort((a, b) => a - b);

        return { scheduledClassesByDay: grouped, weekDaysWithClasses: sortedDays };
    }, [subjects]);

    return (
        <div className="flex-1 overflow-y-auto print:overflow-visible">
            {!hasMounted ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="space-y-4">
                            <Skeleton className="h-8 w-1/2 mx-auto" />
                            <Skeleton className="h-32 w-full" />
                            <Skeleton className="h-32 w-full" />
                        </div>
                    ))}
                </div>
            ) : weekDaysWithClasses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 items-start print:grid-cols-3 print:gap-4">
                    {weekDaysWithClasses.map(day => (
                        <div key={day} className="flex flex-col gap-4">
                            <h2 className="text-xl font-semibold font-headline text-center sticky top-0 bg-background py-2 print:static print:bg-transparent">{daysOfWeek[day]}</h2>
                            <div className="space-y-4">
                                {scheduledClassesByDay[day].map(item => (
                                    <Card key={`${item.subject.id}-${item.group.id}-${item.day}-${item.startTime}`} className="group transition-all hover:shadow-md border-l-4 print:shadow-none print:break-inside-avoid" style={{ borderLeftColor: item.subject.color }}>
                                        <CardHeader className="pb-3">
                                            <div className="flex justify-between items-start gap-2">
                                                <div className="flex-1">
                                                    <CardTitle className="text-lg leading-tight">{item.subject.name}</CardTitle>
                                                    <CardDescription>{item.subject.level.startsWith('superior') ? item.subject.career : item.group.name}</CardDescription>
                                                </div>
                                                <Badge variant="secondary" className="whitespace-nowrap print:border print:border-gray-400">{levelShortNames[item.subject.level]}</Badge>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="flex items-center text-sm text-muted-foreground mb-2">
                                                <Clock className="mr-2 h-4 w-4" />
                                                <span>{item.startTime} - {item.endTime}</span>
                                            </div>
                                            <p className="text-xs text-muted-foreground">{item.subject.institution}</p>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex h-[calc(100vh-200px)] items-center justify-center rounded-lg border-2 border-dashed bg-muted/50 print:hidden">
                    <div className="text-center">
                        <h3 className="text-lg font-semibold">No hay horarios definidos</h3>
                        <p className="text-muted-foreground">Añade horarios a tus asignaturas para verlos aquí.</p>
                    </div>
                </div>
            )}
        </div>
    );
}

function DeclaracionJuradaView() {
    const { subjects, userProfile } = useApp();

    const ddjjData = React.useMemo(() => {
        const data: { reparticion: string; cargo: string; horarios: Record<number, string>; cargaTotalMinutos: number }[] = [];
        
        subjects.forEach(subject => {
            if (subject.status === 'active' && subject.class_groups) {
                subject.class_groups.forEach(group => {
                    if (group.schedule && group.schedule.length > 0) {
                        const roleText = subject.role ? ` (${subject.role})` : '';
                        
                        const row = {
                            reparticion: subject.institution.startsWith('UCASAL') ? 'UCASAL' : 'M. de E.C.C. y T.',
                            cargo: `${subject.institution} - ${subject.name} - ${group.name}${roleText}`,
                            horarios: { 1: '', 2: '', 3: '', 4: '', 5: '', 6: '' } as Record<number, string>,
                            cargaTotalMinutos: 0
                        };
                        
                        group.schedule.forEach(entry => {
                            const dayNumber = Number(entry.day);
                            if (dayNumber >= 1 && dayNumber <= 6) {
                                row.horarios[dayNumber] = `${entry.startTime} a ${entry.endTime}`;
                                const startDate = parse(entry.startTime, 'HH:mm', new Date());
                                const endDate = parse(entry.endTime, 'HH:mm', new Date());
                                row.cargaTotalMinutos += differenceInMinutes(endDate, startDate);
                            }
                        });
                        data.push(row);
                    }
                });
            }
        });
        return data;
    }, [subjects]);

    const formatDuration = (totalMinutes: number) => {
        if (!totalMinutes || totalMinutes === 0) return '-';
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    };

    return (
        <div className="bg-white text-black p-4 print:p-0">
            <div className="text-center mb-4 space-y-2">
                <h2 className="font-bold text-lg">DECLARACIÓN JURADA DE EMPLEOS PÚBLICOS - DDJJ</h2>
                <p className="text-xs text-justify">
                    Declaro bajo juramento que todos los datos consignados a continuación son veraces y exactos y que no incurro en ninguna superposición horaria en mi desempeño. Me notifico que cualquier falsedad, ocultamiento u omisión dará motivo a grave sanción y que estoy obligado/a a denunciar cualquier modificación dentro de las 48 (cuarenta y ocho) horas producida. Toda prestación de servicios en contravención da las normas legales vigentes implicará, además la pérdida al derecho a la remuneración de los días trabajados.
                </p>
            </div>
            
            <div className="grid grid-cols-2 gap-x-4 text-sm mb-4">
                <span><span className="font-bold">LUGAR:</span> Salta</span>
                <span className="text-right"><span className="font-bold">FECHA:</span> {format(new Date(), 'P', { locale: es })}</span>
            </div>

            <Table className="mb-4 border text-sm">
                <TableHeader><TableRow><TableHead colSpan={4} className="text-center font-bold">DATOS PERSONALES</TableHead></TableRow></TableHeader>
                <TableBody>
                    <TableRow>
                        <TableCell className="font-bold">Apellidos y Nombres:</TableCell>
                        <TableCell>{userProfile.name}</TableCell>
                        <TableCell className="font-bold">CUIL Nº:</TableCell>
                        <TableCell>20-22637332-3</TableCell>
                    </TableRow>
                     <TableRow>
                        <TableCell className="font-bold">Domicilio:</TableCell>
                        <TableCell>Barrio El Bosque Block 3 dpto. 1</TableCell>
                        <TableCell className="font-bold">Localidad:</TableCell>
                        <TableCell>Salta</TableCell>
                    </TableRow>
                </TableBody>
            </Table>
            
            <div className="w-full overflow-x-auto">
              <Table className="border text-xs min-w-[1000px]"
              style={{ tableLayout: 'fixed', width: '100%' }}>
                  <TableHeader>
                      <TableRow>
                          <TableHead className="w-[10%] border text-center font-bold">MINISTERIO Y REPARTICION</TableHead>
                          <TableHead className="w-[25%] border text-center font-bold">ESTABLECIMIENTO Y DETALLE CARGO/FUNCION/PASIVIDAD</TableHead>
                          <TableHead className="w-[8%] border text-center font-bold">LUNES</TableHead>
                          <TableHead className="w-[8%] border text-center font-bold">MARTES</TableHead>
                          <TableHead className="w-[8%] border text-center font-bold">MIÉRCOLES</TableHead>
                          <TableHead className="w-[8%] border text-center font-bold">JUEVES</TableHead>
                          <TableHead className="w-[8%] border text-center font-bold">VIERNES</TableHead>
                          <TableHead className="w-[8%] border text-center font-bold">SÁBADO</TableHead>
                          <TableHead className="w-[8%] border text-center font-bold">CARGA HORARIA</TableHead>
                          <TableHead className="w-[9%] border text-center font-bold">SELLO Y FIRMA</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {ddjjData.map((row, index) => (
                          <TableRow key={index}>
                              <TableCell className="border text-center">{row.reparticion}</TableCell>
                              <TableCell className="border">{row.cargo}</TableCell>
                              {ddjjDays.map(day => (
                                  <TableCell key={day} className="border text-center align-middle whitespace-nowrap p-1">{row.horarios[day] || ''}</TableCell>
                              ))}
                              <TableCell className="border text-center align-middle font-semibold">{formatDuration(row.cargaTotalMinutos)}</TableCell>
                              <TableCell className="border"></TableCell>
                          </TableRow>
                      ))}
                      {Array.from({ length: Math.max(0, 15 - ddjjData.length) }).map((_, i) => (
                          <TableRow key={`empty-${i}`}>
                              <TableCell className="border h-10"></TableCell>
                              <TableCell className="border"></TableCell>
                              <TableCell className="border"></TableCell>
                              <TableCell className="border"></TableCell>
                              <TableCell className="border"></TableCell>
                              <TableCell className="border"></TableCell>
                              <TableCell className="border"></TableCell>
                              <TableCell className="border"></TableCell>
                              <TableCell className="border"></TableCell>
                              <TableCell className="border"></TableCell>
                          </TableRow>
                      ))}
                  </TableBody>
              </Table>
            </div>
        </div>
    );
}


export default function SchedulePage() {
    const [view, setView] = React.useState('fichas');

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="flex h-full flex-col">
            <PageHeader title="Horario" className="print:hidden">
                 <Tabs value={view} onValueChange={setView} className="w-auto">
                    <TabsList>
                        <TabsTrigger value="fichas">Vista Fichas</TabsTrigger>
                        <TabsTrigger value="ddjj">Vista DDJJ</TabsTrigger>
                    </TabsList>
                </Tabs>
                {view === 'ddjj' && (
                    <Button variant="outline" onClick={handlePrint}>
                        <Printer className="mr-2 h-4 w-4" />
                        Imprimir Declaración
                    </Button>
                )}
            </PageHeader>
            <div className="flex-1 overflow-y-auto p-4 md:p-8 print:p-0 print:overflow-visible">
                {view === 'fichas' ? <ScheduleCardView /> : <DeclaracionJuradaView />}
            </div>
        </div>
    );
}
