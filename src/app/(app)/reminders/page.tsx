
'use client';

import * as React from 'react';
import { useApp } from '@/contexts/app-context';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Info, PlusCircle, Link as LinkIcon, BellRing, MoreVertical, Edit, Trash2 } from 'lucide-react';
import { format, parseISO, isValid, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { useToast } from '@/hooks/use-toast';
import type { FollowUpTask, ReminderTiming } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FollowUpTaskForm } from '@/components/follow-up-task-form';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

const priorityOrder: Record<FollowUpTask['priority'], number> = {
  urgent: 1,
  high: 2,
  normal: 3,
  low: 4,
};

const priorityStyles: Record<FollowUpTask['priority'], { label: string; style: React.CSSProperties }> = {
  urgent: { label: 'Urgente', style: { backgroundColor: 'hsl(var(--destructive))', color: 'hsl(var(--destructive-foreground))' } },
  high: { label: 'Prioritario', style: { backgroundColor: 'hsl(35, 92%, 55%)', color: 'hsl(0, 0%, 100%)' } },
  normal: { label: 'De rutina', style: { backgroundColor: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' } },
  low: { label: 'Largo plazo', style: { backgroundColor: 'hsl(var(--muted-foreground))', color: 'hsl(var(--background))' } },
};

const reminderTimingTranslations: Record<ReminderTiming, string> = {
    none: 'Sin recordatorio',
    on_time: 'A la hora del evento',
    '5m': '5 min antes',
    '15m': '15 min antes',
    '1h': '1 hora antes',
    '2h': '2 horas antes',
    '1d': '1 día antes',
    '2d': '2 días antes',
};


export default function RemindersPage() {
  const { followUpTasks, updateFollowUpTaskStatus, deleteFollowUpTask } = useApp();
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [taskToEdit, setTaskToEdit] = React.useState<FollowUpTask | null>(null);
  const [hasMounted, setHasMounted] = React.useState(false);

  React.useEffect(() => {
    setHasMounted(true);
  }, []);
  
  React.useEffect(() => {
    if(!isFormOpen) {
        setTaskToEdit(null);
    }
  }, [isFormOpen]);


  const pendingTasks = React.useMemo(() => {
    const tasksWithDates = followUpTasks.map(task => {
        const parseDate = (date: string | Date | undefined) => {
            if (!date) return undefined;
            if (date instanceof Date) return date;
            if (typeof date === 'string') {
                const parsed = new Date(date);
                return isValid(parsed) ? parsed : undefined;
            }
            return undefined;
        };
        
        return {
            ...task,
            dueDate: parseDate(task.dueDate),
            originalEventDate: parseDate(task.originalEventDate),
        };
    });
    
    return tasksWithDates
      .filter(task => task.status === 'pending')
      .sort((a, b) => {
        if (a.dueDate && b.dueDate) {
            return priorityOrder[a.priority] - priorityOrder[b.priority] || a.dueDate.getTime() - b.dueDate.getTime();
        }
        if (a.dueDate) return -1; // Tasks with dates come first
        if (b.dueDate) return 1;
        return priorityOrder[a.priority] - priorityOrder[b.priority]; // Then sort by priority
      });
  }, [followUpTasks]);
  
  const handleCompleteTask = (taskId: string) => {
    updateFollowUpTaskStatus(taskId, 'completed');
    toast({
        title: 'Tarea completada',
        description: 'La tarea de seguimiento ha sido marcada como completada.',
    });
  };
  
  const handleEditTask = (task: FollowUpTask) => {
    setTaskToEdit(task);
    setIsFormOpen(true);
  }

  const handleAddNew = () => {
    setTaskToEdit(null);
    setIsFormOpen(true);
  }

  return (
    <div className="flex h-full flex-col">
       <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{taskToEdit ? 'Editar Tarea' : 'Añadir Nueva Tarea'}</DialogTitle>
          </DialogHeader>
          <FollowUpTaskForm taskToEdit={taskToEdit} onFinished={() => setIsFormOpen(false)} />
        </DialogContent>
      </Dialog>
      <PageHeader title="Seguimiento de Notas y Tareas">
         <Button onClick={handleAddNew}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Añadir Tarea
        </Button>
      </PageHeader>
      <div className="flex-1 overflow-y-auto p-8">
        {pendingTasks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pendingTasks.map(task => {
              return (
                <Card key={task.id} className="flex flex-col">
                  <CardHeader>
                      <div className="flex justify-between items-start gap-2">
                          <div className="flex-1">
                              <CardTitle className="text-base">
                                  {task.title}
                              </CardTitle>
                              {task.originalEventDate && isValid(task.originalEventDate) && (
                                <CardDescription>
                                    Evento del: {format(task.originalEventDate, 'P', { locale: es })}
                                </CardDescription>
                              )}
                          </div>
                          <Badge style={priorityStyles[task.priority].style}>
                              {priorityStyles[task.priority].label}
                          </Badge>
                      </div>
                  </CardHeader>
                  <CardContent className="flex-grow flex flex-col justify-between">
                    <div className="space-y-3">
                      {task.notes && (
                        <blockquote className="border-l-2 pl-4 italic text-sm">
                            "{task.notes}"
                        </blockquote>
                      )}
                       {task.link && (
                        <a href={task.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                            <LinkIcon className="h-4 w-4" />
                            <span>{task.link}</span>
                        </a>
                      )}
                      {hasMounted && task.dueDate && (
                        <p className="text-xs text-muted-foreground font-semibold">
                            Vencimiento: {format(task.dueDate, 'PPP p', { locale: es })} ({formatDistanceToNow(task.dueDate, { locale: es, addSuffix: true })})
                        </p>
                      )}
                      {task.reminder && task.reminder.timing !== 'none' && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <BellRing className="h-4 w-4"/>
                            <span>{reminderTimingTranslations[task.reminder.timing]}</span>
                          </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-4">
                        <Button className="w-full" onClick={() => handleCompleteTask(task.id)}>
                            <Check className="mr-2 h-4 w-4" />
                            Marcar como completado
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="icon" className="shrink-0">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditTask(task)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    <span>Editar</span>
                                </DropdownMenuItem>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            <span>Eliminar</span>
                                        </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Esta acción eliminará permanentemente esta tarea.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => deleteFollowUpTask(task.id)}>Eliminar</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="flex h-[calc(100vh-200px)] items-center justify-center rounded-lg border-2 border-dashed bg-muted/50">
            <div className="text-center">
              <Info className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No hay tareas pendientes</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Puedes crear tareas de seguimiento desde las notas de un evento en el calendario o añadirlas manually aquí.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
