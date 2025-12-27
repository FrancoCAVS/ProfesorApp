
'use client';

import * as React from 'react';
import { useApp } from '@/contexts/app-context';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { PlusCircle, Building2, Edit, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { InstitutionForm } from '@/components/institution-form';
import type { Institution, EducationLevel } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

const shiftTranslations: Record<string, string> = {
  morning: 'Mañana',
  afternoon: 'Tarde',
  evening: 'Vespertino/Noche',
};

const levelTranslations: Record<EducationLevel, string> = {
  secundario: 'Secundario',
  superior_no_universitario: 'Superior (No Universitario)',
  superior_universitario: 'Superior (Universitario)',
};

export default function InstitutionsPage() {
  const { institutions, addInstitution, updateInstitution, deleteInstitution } = useApp();
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [selectedInstitution, setSelectedInstitution] = React.useState<Institution | null>(null);
  const { toast } = useToast();

  const handleAddNew = () => {
    setSelectedInstitution(null);
    setIsFormOpen(true);
  };

  const handleEdit = (institution: Institution) => {
    setSelectedInstitution(institution);
    setIsFormOpen(true);
  };
  
  const handleDelete = (id: string) => {
    deleteInstitution(id);
    toast({ variant: 'destructive', title: 'Institución Eliminada' });
  };

  const onFormFinished = (institution: Institution) => {
    if (selectedInstitution) {
      updateInstitution(institution);
    } else {
      addInstitution(institution);
    }
    setIsFormOpen(false);
  };
  
  React.useEffect(() => {
    if (!isFormOpen) {
        setSelectedInstitution(null);
    }
  }, [isFormOpen]);

  return (
    <div className="flex h-full flex-col">
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{selectedInstitution ? 'Editar Institución' : 'Añadir Nueva Institución'}</DialogTitle>
          </DialogHeader>
          <InstitutionForm 
            institutionToEdit={selectedInstitution} 
            onFinished={onFormFinished} 
            onCancel={() => setIsFormOpen(false)} 
          />
        </DialogContent>
      </Dialog>
      
      <PageHeader title="Instituciones">
        <Button onClick={handleAddNew}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Añadir Institución
        </Button>
      </PageHeader>
      
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        {institutions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {institutions.map((inst) => (
              <Card key={inst.id} className="group flex flex-col">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{inst.name}</CardTitle>
                      {inst.level !== 'superior_universitario' && inst.schoolNumber && (
                          <CardDescription>Escuela N° {inst.schoolNumber}</CardDescription>
                      )}
                      <CardDescription>
                          <Badge variant="outline" className="mt-1">{levelTranslations[inst.level]}</Badge>
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(inst)}>
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
                              Esta acción eliminará permanentemente la institución "{inst.name}".
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(inst.id)}>Eliminar</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 flex-grow flex flex-col justify-between">
                  <div className="text-sm space-y-2">
                    {inst.authorities && inst.authorities.length > 0 && (
                        <div className="space-y-1">
                            {inst.authorities.map(auth => (
                                <p key={auth.id}><span className="font-semibold">{auth.role}:</span> {auth.name}</p>
                            ))}
                        </div>
                    )}
                    
                    {inst.universityBodies && inst.universityBodies.length > 0 && (
                      <div className="space-y-3 pt-2 mt-2 border-t">
                        <h4 className="font-semibold text-sm">Facultades y Organismos:</h4>
                        <div className="space-y-2">
                          {inst.universityBodies.map(body => (
                            <div key={body.id} className="text-xs p-2 bg-muted/50 rounded-md">
                              <p className="font-bold">{body.name} <span className="font-normal text-muted-foreground">({body.type === 'faculty' ? 'Facultad' : 'Organismo'})</span></p>
                              {body.authorities?.map(auth => (
                                <p key={auth.id}><span className="font-semibold">{auth.role}:</span> {auth.name}</p>
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                     {inst.careerBodies && inst.careerBodies.length > 0 && (
                      <div className="space-y-3 pt-2 mt-2 border-t">
                        <h4 className="font-semibold text-sm">Carreras:</h4>
                        <div className="space-y-2">
                          {inst.careerBodies.map(body => (
                            <div key={body.id} className="text-xs p-2 bg-muted/50 rounded-md">
                              <p className="font-bold">{body.name}</p>
                              {body.authorities?.map(auth => (
                                <p key={auth.id}><span className="font-semibold">{auth.role}:</span> {auth.name}</p>
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>
                 
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex h-[calc(100vh-200px)] items-center justify-center rounded-lg border-2 border-dashed bg-muted/50">
            <div className="text-center p-4">
              <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No hay instituciones guardadas</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Añade las instituciones donde trabajas para empezar.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
