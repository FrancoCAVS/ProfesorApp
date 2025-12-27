
'use client';

import * as React from 'react';
import { useApp } from '@/contexts/app-context';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Inbox, Trash2, X, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import type { SentEmail } from '@/lib/types';

function EmailPreviewDialog({ email, onOpenChange }: { email: SentEmail | null, onOpenChange: (open: boolean) => void }) {
    if (!email) return null;

    return (
        <Dialog open={!!email} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{email.subject}</DialogTitle>
                    <DialogDescription>
                        Para: {email.to} | Enviado: {format(new Date(email.sentAt), 'PPP p', { locale: es })}
                    </DialogDescription>
                </DialogHeader>
                <div className="mt-4 max-h-[60vh] overflow-y-auto rounded-md border bg-muted/50 p-4">
                    <pre className="whitespace-pre-wrap text-sm font-sans">
                        {email.body}
                    </pre>
                </div>
                 <DialogFooter>
                    <Button onClick={() => onOpenChange(false)}>Cerrar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function SentEmailsPage() {
  const { sentEmails, deleteSentEmail, deleteMultipleSentEmails } = useApp();
  const { toast } = useToast();
  const [selectedEmails, setSelectedEmails] = React.useState<Set<string>>(new Set());
  const [previewEmail, setPreviewEmail] = React.useState<SentEmail | null>(null);
  const [hasMounted, setHasMounted] = React.useState(false);

  React.useEffect(() => {
    setHasMounted(true);
  }, []);

  const sortedEmails = React.useMemo(() => {
    if (!hasMounted || !Array.isArray(sentEmails)) return [];
    return [...sentEmails].sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
  }, [sentEmails, hasMounted]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedEmails(new Set(sortedEmails.map(e => e.id)));
    } else {
      setSelectedEmails(new Set());
    }
  };

  const handleSelectOne = (emailId: string, checked: boolean) => {
    setSelectedEmails(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(emailId);
      } else {
        newSet.delete(emailId);
      }
      return newSet;
    });
  };

  const handleDeleteSelected = () => {
    deleteMultipleSentEmails(selectedEmails);
    toast({
      title: 'Registros Eliminados',
      description: `${selectedEmails.size} correo(s) ha(n) sido eliminado(s) del historial.`,
    });
    setSelectedEmails(new Set());
  };

  const numSelected = selectedEmails.size;
  const numTotal = sortedEmails.length;
  const isAllSelected = numSelected > 0 && numSelected === numTotal;
  const isSomeSelected = numSelected > 0 && numSelected < numTotal;

  return (
    <div className="flex h-full flex-col">
      <EmailPreviewDialog email={previewEmail} onOpenChange={() => setPreviewEmail(null)} />
      <PageHeader title={numSelected > 0 ? `${numSelected} seleccionado(s)` : 'Bandeja de Salida'}>
        {numSelected > 0 && (
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setSelectedEmails(new Set())}>
              <X className="h-5 w-5" />
              <span className="sr-only">Limpiar selección</span>
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
                    Esta acción eliminará permanentemente {numSelected} registro(s) del historial de envíos.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteSelected}>Eliminar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </PageHeader>
      <div className="flex-1 overflow-y-auto p-8">
        <Card>
          <CardHeader>
            <CardTitle>Historial de Envíos</CardTitle>
            <CardDescription>
              Aquí puedes ver un registro de los correos electrónicos reales enviados por la aplicación.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px] pl-4">
                    <Checkbox
                      checked={isSomeSelected ? 'indeterminate' : isAllSelected}
                      onCheckedChange={(checked) => handleSelectAll(!!checked)}
                      aria-label="Seleccionar todo"
                      disabled={!hasMounted || sortedEmails.length === 0}
                    />
                  </TableHead>
                  <TableHead>Destinatario</TableHead>
                  <TableHead>Asunto</TableHead>
                  <TableHead>Fecha de Envío</TableHead>
                  <TableHead className="text-right pr-6">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!hasMounted ? (
                  Array.from({ length: 3 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell className="pl-4"><Skeleton className="h-5 w-5" /></TableCell>
                      <TableCell className="font-medium"><Skeleton className="h-5 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-2">
                          <Skeleton className="h-9 w-9" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : sortedEmails.length > 0 ? (
                  sortedEmails.map((email) => (
                    <TableRow key={email.id} data-state={selectedEmails.has(email.id) ? 'selected' : undefined}>
                      <TableCell className="pl-4">
                        <Checkbox
                          checked={selectedEmails.has(email.id)}
                          onCheckedChange={(checked) => handleSelectOne(email.id, !!checked)}
                          aria-label={`Seleccionar correo a ${email.to}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{email.to}</TableCell>
                      <TableCell>{email.subject}</TableCell>
                      <TableCell>{format(new Date(email.sentAt), 'PPP p', { locale: es })}</TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-2">
                           <Button variant="ghost" size="icon" onClick={() => setPreviewEmail(email)}>
                               <Eye className="h-4 w-4" />
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
                                  Esta acción no se puede deshacer. Se eliminará permanentemente el registro del correo enviado a {email.to} sobre "{email.subject}".
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteSentEmail(email.id)}>Eliminar</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-48 text-center">
                      <div className="flex flex-col items-center justify-center gap-4">
                        <Inbox className="h-12 w-12 text-muted-foreground" />
                        <p className="text-muted-foreground">Aún no se ha enviado ningún correo.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
