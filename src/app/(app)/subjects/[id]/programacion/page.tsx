
'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useApp } from '@/contexts/app-context';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Printer, Loader2, ListChecks, ChevronDown, Download, Save } from 'lucide-react';
import { SubjectForm } from '@/components/subject-form';
import type { Subject } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { ExamScheduleSummary } from '@/components/exam-schedule-summary';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ExamSchedulePdfDoc } from '@/components/exam-schedule-pdf-doc';
import { cn } from '@/lib/utils';
import { renderToStaticMarkup } from 'react-dom/server';

export default function ProgramacionPage() {
    const params = useParams();
    const router = useRouter();
    const { subjects, updateSubject, events } = useApp();
    const { toast } = useToast();
    const subjectId = params.id as string;
    
    const [subject, setSubject] = React.useState<Subject | null>(null);

    React.useEffect(() => {
        const foundSubject = subjects.find(s => s.id === subjectId);
        if (foundSubject) {
            setSubject(foundSubject);
        } else {
            // Optional: Redirect if subject not found
            // router.push('/subjects');
        }
    }, [subjectId, subjects, router]);

    const handleFormSubmit = (updatedData: Subject) => {
        if (!subject) return; // Protección por si acaso

        // REPARACIÓN: Re-conectamos el ID que ya tenemos en memoria con los datos nuevos del formulario
        const dataToSave = {
            ...updatedData, 
            id: subject.id 
        };

        console.log("Guardando cambios corregidos:", dataToSave);
        updateSubject(dataToSave); // Ahora sí lleva ID y funcionará
        toast({ title: 'Asignatura Actualizada', description: 'Los cambios han sido guardados.' });
    };

    const handleLocalPrint = () => {
        if (!subject) return;

        // Since we can't easily render a complex interactive component to a static string,
        // we will create a simplified HTML structure for printing the key info.
        // A more advanced solution might involve a dedicated printable component.
        const printContent = `
            <h1 style="font-size: 1.5rem; font-weight: bold; text-align: center; margin-bottom: 0.5rem;">${subject.name}</h1>
            <h2 style="font-size: 1.125rem; color: #4a5568; text-align: center; margin-bottom: 1rem;">${subject.institution} - ${subject.career || levelTranslations[subject.level]}</h2>
            <h3 style="font-size: 1rem; color: #6b7280; text-align: center; margin-bottom: 2rem;">Año ${subject.year}</h3>
            
            <h4 style="font-size: 1.25rem; font-weight: 600; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.5rem; margin-bottom: 1rem;">Unidades y Contenidos</h4>
            ${subject.program?.units?.map(unit => `
                <div style="margin-bottom: 1rem;">
                    <h5 style="font-size: 1.1rem; font-weight: 600;">${unit.name}</h5>
                    <ul style="list-style-type: disc; padding-left: 20px;">
                        ${unit.topics.map(topic => `<li>${topic}</li>`).join('')}
                    </ul>
                </div>
            `).join('') || '<p>No hay unidades definidas.</p>'}
            
            <h4 style="font-size: 1.25rem; font-weight: 600; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.5rem; margin-top: 2rem; margin-bottom: 1rem;">Actividades</h4>
            <ul style="list-style-type: disc; padding-left: 20px;">
                ${subject.program?.activities?.map(activity => `<li>${activity}</li>`).join('') || '<li>No hay actividades definidas.</li>'}
            </ul>
        `;

        const fullHtml = `
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <title>Programación - ${subject.name}</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; }
                    h1, h2, h3, h4, h5 { margin: 0; }
                    ul { margin-top: 0.5rem; }
                </style>
            </head>
            <body>${printContent}</body>
            </html>
        `;

        const blob = new Blob([fullHtml], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `programacion_${subject.name.replace(/ /g, '_')}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };
    
    const handlePrintGlobalSchedule = () => {
        const printContent = renderToStaticMarkup(
            <ExamSchedulePdfDoc subjects={subjects} events={events} />
        );
        
        const fullHtml = `
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Cronograma Global de Exámenes</title>
                <script src="https://cdn.tailwindcss.com"></script>
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
                    body { font-family: 'Inter', sans-serif; }
                    @page { size: A4; margin: 1.5cm; }
                    @media print {
                        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        .no-print { display: none; }
                    }
                    .page-break { page-break-after: always; }
                </style>
            </head>
            <body>
                <div class="no-print p-4 bg-gray-100 border-b text-center text-sm">
                    <p>Estás viendo una previsualización. Usa la función de impresión de tu navegador (Ctrl+P o Cmd+P) para guardar como PDF o imprimir.</p>
                </div>
                ${printContent}
            </body>
            </html>
        `;

        const blob = new Blob([fullHtml], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'cronograma_examenes.html';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast({
            title: "Descarga Iniciada",
            description: "Se ha descargado el archivo 'cronograma_examenes.html'. Ábrelo en tu navegador para imprimirlo.",
        });
    };


    if (!subject) {
        return <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }
    
    const subjectEvents = events.filter(e => e.subject_id === subject.id);

    return (
        <div className="flex h-full flex-col">
            <div className="non-printable-content">
                <PageHeader title={`Programación: ${subject.name}`}>
                    <Button asChild variant="outline">
                        <Link href={`/subjects/${subject.id}/cronograma`}>
                            <ListChecks className="mr-2 h-4 w-4" />
                            Generar Cronograma
                        </Link>
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline">
                                <Printer className="mr-2 h-4 w-4" />
                                Imprimir / Exportar
                                <ChevronDown className="ml-2 h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={handleLocalPrint}>
                                <Download className="mr-2 h-4 w-4" />
                                Descargar Programación de esta Asignatura (HTML)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handlePrintGlobalSchedule}>
                                <Download className="mr-2 h-4 w-4" />
                                Descargar Cronograma Global (HTML)
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <Button type="submit" form="subject-program-form">
                        <Save className="mr-2 h-4 w-4" />
                        Guardar Cambios
                    </Button>
                </PageHeader>
            </div>
            <div className="flex-1 overflow-y-auto p-8 printable-subject">
                <div className="print:block hidden text-center mb-6">
                    <h1 className="text-2xl font-bold">{subject.name}</h1>
                    <h2 className="text-lg text-gray-700">{subject.institution} - {subject.career || levelTranslations[subject.level]}</h2>
                    <h3 className="text-md text-gray-500">Año {subject.year}</h3>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                         <SubjectForm
                            subjectToEdit={subject}
                            onFinished={handleFormSubmit}
                            formMode="split"
                        />
                    </div>
                    <div className="lg:col-span-1 non-printable-content">
                        <ExamScheduleSummary subject={subject} events={subjectEvents} />
                    </div>
                </div>
            </div>
        </div>
    );
}

const levelTranslations = {
  secundario: 'Nivel Secundario',
  superior_no_universitario: 'Nivel Superior No Universitario',
  superior_universitario: 'Nivel Superior Universitario',
};
