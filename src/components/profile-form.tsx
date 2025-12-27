
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Link, MessageSquare, Send, Phone, Download, Upload } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useApp } from '@/contexts/app-context';
import { useToast } from '@/hooks/use-toast';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Checkbox } from './ui/checkbox';
import { Separator } from './ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';

const profileSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres.'),
  email: z.string().email('Por favor, introduce un correo electrónico válido.'),
  phoneNumber: z.string().optional(),
  notebookLMLink: z.string().url('Debe ser una URL válida.').optional().or(z.literal('')),
  dailySummary: z.object({
    enabled: z.boolean().default(false),
    time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Formato de hora inválido. Use HH:mm.'),
    channels: z.array(z.enum(['whatsapp', 'telegram'])).default([]),
  }).optional(),
  unrecordedAttendance: z.object({
    enabled: z.boolean().default(false),
    time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Formato de hora inválido. Use HH:mm.'),
    channels: z.array(z.enum(['whatsapp', 'telegram'])).default([]),
  }).optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface ProfileFormProps {
  onFinished: () => void;
}

export function ProfileForm({ onFinished }: ProfileFormProps) {
  const { userProfile, updateUserProfile, getBackupData, restoreBackupData } = useApp();
  const { toast } = useToast();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: userProfile.name,
      email: userProfile.email,
      phoneNumber: userProfile.phoneNumber || '',
      notebookLMLink: userProfile.notebookLMLink || '',
      dailySummary: {
        enabled: userProfile.dailySummary?.enabled ?? true,
        time: userProfile.dailySummary?.time ?? '20:00',
        channels: userProfile.dailySummary?.channels ?? ['whatsapp'],
      },
      unrecordedAttendance: {
        enabled: userProfile.unrecordedAttendance?.enabled ?? true,
        time: userProfile.unrecordedAttendance?.time ?? '22:00',
        channels: userProfile.unrecordedAttendance?.channels ?? ['telegram'],
      }
    },
  });

  const onSubmit = (data: ProfileFormValues) => {
    updateUserProfile(data);
    toast({
      title: 'Perfil Actualizado',
      description: 'Tu información ha sido guardada correctamente.',
    });
    onFinished();
  };
  
  const handleCreateBackup = () => {
    try {
        const backupData = getBackupData();
        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
            JSON.stringify(backupData, null, 2)
        )}`;
        const link = document.createElement("a");
        link.href = jsonString;
        link.download = "prof-friend-backup.json";
        link.click();
        toast({ title: "Respaldo Creado", description: "El archivo de respaldo se ha descargado." });
    } catch (error) {
        toast({ variant: "destructive", title: "Error al crear respaldo", description: "No se pudo generar el archivo de respaldo." });
        console.error(error);
    }
  };
  
  const handleRestoreFromFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const text = e.target?.result;
            if (typeof text !== 'string') throw new Error("File could not be read");
            const parsedData = JSON.parse(text);
            
            const success = await restoreBackupData(parsedData);
            
            if (success) {
                toast({ title: "Restauración Exitosa", description: "Los datos han sido restaurados. La página se recargará." });
                setTimeout(() => window.location.reload(), 2000);
            } else {
                throw new Error("El archivo de respaldo no tiene un formato válido.");
            }
        } catch (error) {
            toast({ variant: "destructive", title: "Error de Restauración", description: (error as Error).message });
            console.error(error);
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };
    reader.readAsText(file);
  };


  const watchedDailySummary = form.watch('dailySummary');
  const watchedUnrecordedAttendance = form.watch('unrecordedAttendance');

  return (
    <>
     <input
        type="file"
        ref={fileInputRef}
        onChange={handleRestoreFromFile}
        accept=".json"
        className="hidden"
      />
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre</FormLabel>
              <FormControl>
                <Input placeholder="Tu nombre" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Correo Electrónico</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="tu@correo.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="phoneNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nº de WhatsApp</FormLabel>
                 <FormControl>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Ej: 549387... (código de país y área)" className="pl-10" {...field} />
                    </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="notebookLMLink"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Enlace a NotebookLM</FormLabel>
              <FormControl>
                <div className="relative">
                  <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Pega el enlace a tu cuaderno aquí" className="pl-10" {...field} />
                </div>
              </FormControl>
               <p className="text-xs text-muted-foreground pt-1">
                Este enlace se usará en la sección "Periodos Lectivos" para un acceso rápido.
              </p>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Separator />
        
        <div className="space-y-4 rounded-lg border p-4">
            <FormField
              control={form.control}
              name="dailySummary.enabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between">
                  <div className="space-y-0.5">
                    <FormLabel>Resumen Diario Automático</FormLabel>
                    <FormDescription>
                      Recibe un resumen de la agenda del día siguiente.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            {watchedDailySummary?.enabled && (
                <div className="space-y-4 pl-2 pt-2 border-l-2 ml-2">
                     <FormField
                        control={form.control}
                        name="dailySummary.time"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Hora de envío</FormLabel>
                                <FormControl>
                                    <Input type="time" className="w-48" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                      control={form.control}
                      name="dailySummary.channels"
                      render={() => (
                        <FormItem>
                          <FormLabel>Canales de envío</FormLabel>
                           <div className="flex items-center gap-8 pt-2">
                                <FormField
                                    control={form.control}
                                    name="dailySummary.channels"
                                    render={({ field }) => (
                                        <FormItem className="flex items-center gap-2 space-y-0">
                                            <FormControl>
                                                <Checkbox
                                                    checked={field.value?.includes('whatsapp')}
                                                    onCheckedChange={(checked) => {
                                                        return checked
                                                        ? field.onChange([...(field.value || []), 'whatsapp'])
                                                        : field.onChange((field.value || []).filter((value) => value !== 'whatsapp'))
                                                    }}
                                                />
                                            </FormControl>
                                            <Label className="font-normal flex items-center gap-1.5"><MessageSquare /> WhatsApp</Label>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="dailySummary.channels"
                                    render={({ field }) => (
                                        <FormItem className="flex items-center gap-2 space-y-0">
                                            <FormControl>
                                                <Checkbox
                                                    checked={field.value?.includes('telegram')}
                                                    onCheckedChange={(checked) => {
                                                        return checked
                                                        ? field.onChange([...(field.value || []), 'telegram'])
                                                        : field.onChange((field.value || []).filter((value) => value !== 'telegram'))
                                                    }}
                                                />
                                            </FormControl>
                                            <Label className="font-normal flex items-center gap-1.5"><Send /> Telegram</Label>
                                        </FormItem>
                                    )}
                                />
                           </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                </div>
            )}
        </div>

        <div className="space-y-4 rounded-lg border p-4">
            <FormField
              control={form.control}
              name="unrecordedAttendance.enabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between">
                  <div className="space-y-0.5">
                    <FormLabel>Recordatorio de Asistencia Pendiente</FormLabel>
                    <FormDescription>
                      Recibe un aviso si no registraste asistencias del día.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            {watchedUnrecordedAttendance?.enabled && (
                <div className="space-y-4 pl-2 pt-2 border-l-2 ml-2">
                     <FormField
                        control={form.control}
                        name="unrecordedAttendance.time"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Hora de envío</FormLabel>
                                <FormControl>
                                    <Input type="time" className="w-48" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                      control={form.control}
                      name="unrecordedAttendance.channels"
                      render={() => (
                        <FormItem>
                          <FormLabel>Canales de envío</FormLabel>
                           <div className="flex items-center gap-8 pt-2">
                                <FormField
                                    control={form.control}
                                    name="unrecordedAttendance.channels"
                                    render={({ field }) => (
                                        <FormItem className="flex items-center gap-2 space-y-0">
                                            <FormControl>
                                                <Checkbox
                                                    checked={field.value?.includes('whatsapp')}
                                                    onCheckedChange={(checked) => {
                                                        return checked
                                                        ? field.onChange([...(field.value || []), 'whatsapp'])
                                                        : field.onChange((field.value || []).filter((value) => value !== 'whatsapp'))
                                                    }}
                                                />
                                            </FormControl>
                                            <Label className="font-normal flex items-center gap-1.5"><MessageSquare /> WhatsApp</Label>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="unrecordedAttendance.channels"
                                    render={({ field }) => (
                                        <FormItem className="flex items-center gap-2 space-y-0">
                                            <FormControl>
                                                <Checkbox
                                                    checked={field.value?.includes('telegram')}
                                                    onCheckedChange={(checked) => {
                                                        return checked
                                                        ? field.onChange([...(field.value || []), 'telegram'])
                                                        : field.onChange((field.value || []).filter((value) => value !== 'telegram'))
                                                    }}
                                                />
                                            </FormControl>
                                            <Label className="font-normal flex items-center gap-1.5"><Send /> Telegram</Label>
                                        </FormItem>
                                    )}
                                />
                           </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                </div>
            )}
        </div>
        
        <Separator />
        
        <div className="space-y-4 rounded-lg border p-4">
          <h3 className="text-lg font-medium">Resguardo y Restauración de Datos</h3>
          <FormDescription>
              Guarda toda la información de la aplicación en un archivo o restaura desde un respaldo previo.
          </FormDescription>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button type="button" variant="outline" onClick={handleCreateBackup}>
                <Download className="mr-2 h-4 w-4" />
                Crear Respaldo
            </Button>
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button type="button" variant="secondary">
                        <Upload className="mr-2 h-4 w-4" />
                        Restaurar desde Archivo
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción sobrescribirá todos los datos actuales de la aplicación. Asegúrate de tener un respaldo reciente si no quieres perder información. ¿Deseas continuar?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => fileInputRef.current?.click()}>
                            Continuar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onFinished}>Cancelar</Button>
          <Button type="submit">Guardar Cambios</Button>
        </div>
      </form>
    </Form>
    </>
  );
}
