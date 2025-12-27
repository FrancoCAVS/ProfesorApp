
'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Book,
  Calendar,
  CheckSquare,
  PanelLeft,
  ClipboardList,
  Mailbox,
  Clock,
  BellRing,
  CalendarRange,
  Wrench,
  ArrowRightLeft,
  PenSquare,
  Building2,
  CalendarCheck,
  Star,
  User,
  HelpCircle,
  Clock4,
  LogOut,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useApp } from '@/contexts/app-context';
import { useToast } from '@/hooks/use-toast';
import type { Event, ReminderSettings, EventType, SentEmail, Subject, AttendanceRecord, AcademicPeriod } from '@/lib/types';
import { format, formatDistanceToNow, subMinutes, subHours, subDays, getWeek, startOfWeek, addDays, endOfWeek, isSameDay, isPast, subWeeks, subMonths } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { sendReminder } from '@/ai/flows/send-reminder-flow';
import { generateWeeklySummary } from '@/ai/flows/generate-weekly-summary-flow';
import { generateDailySummary } from '@/ai/flows/generate-daily-summary-flow';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Avatar,
  AvatarFallback,
} from '@/components/ui/avatar';
import { ProfileForm } from '@/components/profile-form';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { sendWhatsappMessage } from '@/services/whatsapp-service';
import { sendTelegramMessage } from '@/services/telegram-service';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';


function getReminderDates(event: Event): Date[] {
  const { event_datetime, reminder } = event;
  if (!reminder || reminder.channels.length === 0) return [];
  
  const eventDate = new Date(event_datetime);
  const now = new Date();
  
  let reminderDate: Date | undefined;

  if (reminder.type === 'simple') {
    if (reminder.timing === 'none') return [];
    
    switch (reminder.timing) {
      case 'on_time': reminderDate = eventDate; break;
      case '5m': reminderDate = subMinutes(eventDate, 5); break;
      case '15m': reminderDate = subMinutes(eventDate, 15); break;
      case '1h': reminderDate = subHours(eventDate, 1); break;
      case '2h': reminderDate = subHours(eventDate, 2); break;
      case '1d': reminderDate = subDays(eventDate, 1); break;
      case '2d': reminderDate = subDays(eventDate, 2); break;
      default: return [];
    }
    // Only return the date if it's in the future
    return reminderDate && reminderDate > now ? [reminderDate] : [];
  }

  if (reminder.type === 'recurring') {
    if (!reminder.frequency || !reminder.count) return [];
    
    const dates: Date[] = [];
    
    for (let i = 0; i < reminder.count; i++) {
      let recurringReminderDate: Date;
      if (reminder.frequency === 'daily') {
        recurringReminderDate = subDays(eventDate, i + 1);
      } else if (reminder.frequency === 'weekly') {
        recurringReminderDate = subWeeks(eventDate, i + 1);
      } else if (reminder.frequency === 'monthly') {
        recurringReminderDate = subMonths(eventDate, i + 1);
      } else {
        continue;
      }
      
      if (recurringReminderDate > now) {
        dates.push(recurringReminderDate);
      }
    }
    return dates;
  }
  
  return [];
}


function AppNotifications() {
  const appState = useApp();
  const appStateRef = React.useRef(appState);
  appStateRef.current = appState;

  const { toast } = useToast();
  const toastRef = React.useRef(toast);
  toastRef.current = toast;

  const notifiedEventIdsRef = React.useRef<Set<string>>(new Set());

  React.useEffect(() => {
    const checkReminders = () => {
      const { events, userProfile, addSentEmail } = appStateRef.current;
      const now = new Date();
      
      events.forEach(event => {
        if (event.status !== 'active') return;

        const reminderDates = getReminderDates(event);
        if (reminderDates.length === 0) return;

        reminderDates.forEach(reminderTime => {
            const uniqueReminderId = `${event.id}-${reminderTime.toISOString()}`;
            
            if (reminderTime <= now && !notifiedEventIdsRef.current.has(uniqueReminderId)) {
                notifiedEventIdsRef.current.add(uniqueReminderId);
                
                const channels = event.reminder.channels || [];
                
                setTimeout(async () => {
                    if (channels.includes('in_app') || channels.includes('push')) {
                        toastRef.current({
                            title: `Recordatorio: ${event.title}`,
                            description: `El evento es ${formatDistanceToNow(event.event_datetime, { locale: es, addSuffix: true })}.`,
                            duration: 10000,
                        });

                        const audio = document.getElementById('notification-sound') as HTMLAudioElement;
                        if (audio) {
                            audio.play().catch(error => {
                                console.log("La reproducción de audio fue impedida por el navegador.", error);
                            });
                        }
                    }
                    
                    if (channels.includes('email')) {
                        try {
                            const result = await sendReminder({
                                recipientEmail: userProfile.email,
                                title: event.title,
                                description: event.description,
                                event_datetime: event.event_datetime.toISOString(),
                            });
                            if (result && result.subject && result.body) {
                                addSentEmail({
                                    to: userProfile.email,
                                    subject: result.subject,
                                    body: result.body,
                                });
                            }
                        } catch(e) {
                            console.error(e)
                        }
                    }
                }, 0);
            }
        });
      });
    };

    const intervalId = setInterval(checkReminders, 60000);
    const timeoutId = setTimeout(checkReminders, 100);

    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    };
  }, []);

  return null;
}

function WeeklySummaryTrigger() {
  const appState = useApp();
  const appStateRef = React.useRef(appState);
  appStateRef.current = appState;
  
  const { toast } = useToast();
  const toastRef = React.useRef(toast);
  toastRef.current = toast;

  React.useEffect(() => {
    const checkAndSendSummary = () => {
      const { events, subjects, lastSummarySentForWeek, markSummaryAsSent, userProfile, addSentEmail } = appStateRef.current;
      
      const now = new Date();
      const dayOfWeek = now.getDay();
      
      const weekIdentifier = `${now.getFullYear()}-${getWeek(now, { weekStartsOn: 1 })}`;
      
      if (dayOfWeek >= 5 && lastSummarySentForWeek !== weekIdentifier) {
        
        setTimeout(async () => {
            markSummaryAsSent(weekIdentifier);

            const nextWeekStart = startOfWeek(addDays(now, 7), { weekStartsOn: 1 });
            const nextWeekEnd = endOfWeek(addDays(now, 7), { weekStartsOn: 1 });

            const upcomingEvents = events.filter(event => {
                const eventDate = new Date(event.event_datetime);
                return eventDate >= nextWeekStart && eventDate <= nextWeekEnd && event.status === 'active';
            });

            const input = {
                recipientEmail: userProfile.email,
                events: upcomingEvents.map(event => {
                    const subject = subjects.find(s => s.id === event.subject_id);
                    return {
                        title: event.title,
                        event_type: event.event_type,
                        event_datetime_str: format(event.event_datetime, "EEEE, d 'de' MMMM 'a las' p", { locale: es }),
                        description: event.description,
                        subject_name: subject?.name,
                    }
                }),
                week_start_str: format(nextWeekStart, 'd MMMM', { locale: es }),
                week_end_str: format(nextWeekEnd, 'd MMMM, yyyy', { locale: es }),
            };

            try {
                const result = await generateWeeklySummary(input);
                addSentEmail({
                    to: userProfile.email,
                    subject: result.subject,
                    body: result.body,
                });
                if (result.emailSent) {
                    toastRef.current({
                        title: "Resumen Semanal Automático Enviado",
                        description: "El resumen de la próxima semana ha sido generado y enviado. Puedes consultarlo en la Bandeja de Salida.",
                    });
                } else {
                    toastRef.current({
                        variant: "destructive",
                        title: "Resumen Semanal Generado (Error de Envío)",
                        description: "El resumen se guardó en la Bandeja de Salida pero no se pudo enviar por correo.",
                    });
                }
            } catch (error) {
                console.error("Error al enviar el resumen semanal automático:", error);
                toastRef.current({
                    variant: "destructive",
                    title: "Error en Envío Automático",
                    description: "No se pudo generar el resumen semanal automático.",
                });
            }
        }, 0);
      }
    };

    const timeoutId = setTimeout(checkAndSendSummary, 5000);
    return () => clearTimeout(timeoutId);
    
  }, []);

  return null;
}

function DailySummaryTrigger() {
    const appState = useApp();
    const appStateRef = React.useRef(appState);
    appStateRef.current = appState;
    const { toast } = useToast();
    const toastRef = React.useRef(toast);
    toastRef.current = toast;

    React.useEffect(() => {
        const checkAndSendDailySummary = async () => {
            const { events, subjects, userProfile, lastDailySummarySentFor, markDailySummaryAsSent } = appStateRef.current;

            if (!userProfile.dailySummary?.enabled || !userProfile.dailySummary.time || userProfile.dailySummary.channels.length === 0) {
                return;
            }

            const now = new Date();
            const [hours, minutes] = userProfile.dailySummary.time.split(':').map(Number);
            const todayIdentifier = format(now, 'yyyy-MM-dd');

            if (now.getHours() === hours && now.getMinutes() === minutes && lastDailySummarySentFor !== todayIdentifier) {
                markDailySummaryAsSent(todayIdentifier);
                
                const tomorrow = addDays(now, 1);
                const tomorrowsEvents = events.filter(event => isSameDay(event.event_datetime, tomorrow) && event.status === 'active');

                const summaryInput = {
                    date_str: format(tomorrow, "EEEE, d 'de' MMMM", { locale: es }),
                    events: tomorrowsEvents.map(event => {
                        const subject = subjects.find(s => s.id === event.subject_id);
                        return {
                            title: event.title,
                            time_str: format(event.event_datetime, "p", { locale: es }),
                            subject_name: subject?.name,
                        };
                    })
                };
                
                try {
                    const result = await generateDailySummary(summaryInput);
                    if (result && result.summary) {
                        const channels = userProfile.dailySummary.channels;
                        
                        if (channels.includes('whatsapp') && userProfile.phoneNumber) {
                          await sendWhatsappMessage({ to: userProfile.phoneNumber, body: result.summary });
                        }
                        
                        if (channels.includes('telegram')) {
                           await sendTelegramMessage({ body: result.summary });
                        }
                        
                        toastRef.current({
                            title: "Resumen Diario Enviado",
                            description: `Resumen para mañana enviado a ${channels.join(', ')}.`,
                        });
                    }
                } catch (error) {
                    console.error("Error al generar o enviar el resumen diario:", error);
                     toastRef.current({
                        variant: "destructive",
                        title: "Error de Resumen Diario",
                        description: "No se pudo generar o enviar el resumen para mañana.",
                    });
                }
            }
        };

        const intervalId = setInterval(checkAndSendDailySummary, 60000); // Check every minute
        checkAndSendDailySummary(); // Check immediately on load

        return () => clearInterval(intervalId);
    }, []);

    return null;
}

type NavItem = {
  href?: string;
  icon: React.ElementType;
  label: string;
  children?: Omit<NavItem, 'children'>[];
};

const navItems: NavItem[] = [
  { href: '/calendar', icon: Calendar, label: 'Calendario' },
  { href: '/attendance-control', icon: CheckSquare, label: 'Control de Asistencia' },
  { href: '/subjects', icon: Book, label: 'Asignaturas' },
  { href: '/institutions', icon: Building2, label: 'Instituciones' },
  { href: '/schedule', icon: Clock, label: 'Horario' },
  { href: '/academic-periods', icon: CalendarRange, label: 'Periodos Lectivos' },
  { href: '/holidays', icon: CalendarCheck, label: 'Días Feriados' },
  { href: '/commemorative-dates', icon: Star, label: 'Fechas Conmemorativas' },
  { href: '/reminders', icon: BellRing, label: 'Seguimiento' },
  { href: '/reports', icon: ClipboardList, label: 'Informes' },
  { href: '/sent-emails', icon: Mailbox, label: 'Bandeja de Salida' },
  {
    label: 'Herramientas',
    icon: Wrench,
    children: [
      { href: '/tools/note-generator', icon: PenSquare, label: 'Generador de Notas' },
      { href: '/tools/converter', icon: ArrowRightLeft, label: 'Conversor de Horas' },
      { href: '/tools/time-converter', icon: Clock4, label: 'Conversor de Horario' },
      { href: '/tools/user-guide', icon: HelpCircle, label: 'Guía de uso' },
    ],
  },
];


function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = React.useState(false);
  const pathname = usePathname();
  const { userProfile, logout } = useApp();
  const [hasMounted, setHasMounted] = React.useState(false);
  const isMobile = useIsMobile();
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const router = useRouter();
  const { isAuthenticated } = useApp();

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      setHasMounted(true);
      if (!isAuthenticated) {
        router.replace('/login');
      }
    }
  }, [isAuthenticated, router]);

  React.useEffect(() => {
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  }, [isMobile]);

  if (!hasMounted || !isAuthenticated) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Skeleton className="h-full w-full" />
      </div>
    );
  }

  const NavContent = ({ isSidebarOpen, onClick }: { isSidebarOpen: boolean, onClick: () => void }) => {
    const navContentClass = cn("flex flex-col flex-1", !isSidebarOpen && "items-center");

    return (
      <div className={navContentClass}>
        <nav className="flex-1 px-4 py-4">
          <TooltipProvider delayDuration={0}>
            <ul className="space-y-2">
              {navItems.map((item) => (
                <li key={item.label}>
                  {item.children && isSidebarOpen ? (
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value={item.label} className="border-b-0">
                        <AccordionTrigger
                          className={cn(
                            'flex w-full items-center justify-between gap-3 rounded-lg px-4 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-primary/10 hover:no-underline [&[data-state=open]>svg]:text-primary',
                            item.children.some(child => pathname.startsWith(child.href!)) && 'bg-primary/10 font-semibold text-primary'
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <item.icon className="h-5 w-5" />
                            <span>{item.label}</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-1">
                          <ul className="space-y-1 pl-8">
                            {item.children.map((child) => (
                              <li key={child.href}>
                                <Link
                                  href={child.href!}
                                  className={cn(
                                    'flex items-center gap-3 rounded-lg px-4 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-primary/10',
                                    pathname === child.href && 'bg-primary/10 font-semibold text-primary'
                                  )}
                                  onClick={onClick}
                                >
                                  <child.icon className="h-5 w-5 shrink-0" />
                                  <span>{child.label}</span>
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link
                          href={item.href || (item.children ? item.children[0].href : '#')!}
                          className={cn(
                            'flex items-center gap-3 rounded-lg px-4 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-primary/10',
                            (item.href && pathname === item.href || item.children?.some(c => c.href === pathname)) && 'bg-primary/10 font-semibold text-primary',
                            !isSidebarOpen && 'justify-center'
                          )}
                          onClick={onClick}
                        >
                          <item.icon className="h-5 w-5" />
                          {isSidebarOpen && <span>{item.label}</span>}
                        </Link>
                      </TooltipTrigger>
                      {!isSidebarOpen && (
                        <TooltipContent side="right">
                          <p>{item.label}</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  )}
                </li>
              ))}
            </ul>
          </TooltipProvider>
        </nav>
        <div className="mt-auto border-t p-4">
          <button
            onClick={logout}
            className={cn(
              'flex w-full items-center gap-3 rounded-md p-2 text-left text-destructive transition-colors hover:bg-destructive/10',
              !isSidebarOpen && 'justify-center'
            )}
          >
            <LogOut className="h-5 w-5" />
            {isSidebarOpen && <span>Cerrar Sesión</span>}
          </button>
          <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
            <DialogTrigger asChild>
              <button
                className={cn(
                  'flex w-full items-center gap-3 rounded-md p-2 text-left transition-colors hover:bg-accent mt-2',
                  !isSidebarOpen && 'justify-center'
                )}
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {hasMounted ? (userProfile.name?.charAt(0).toUpperCase() || <User />) : null}
                  </AvatarFallback>
                </Avatar>
                {isSidebarOpen && (
                  <div className="flex-1 overflow-hidden">
                    {hasMounted ? (
                      <>
                        <p className="truncate text-sm font-medium">{userProfile.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{userProfile.email}</p>
                      </>
                    ) : (
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    )}
                  </div>
                )}
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Editar Perfil</DialogTitle>
              </DialogHeader>
              <ProfileForm onFinished={() => setIsProfileDialogOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>
    )
  };


  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      {isMobile ? (
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <div className="absolute top-4 left-4 z-20">
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <PanelLeft className="h-5 w-5" />
                <span className="sr-only">Abrir Menú</span>
              </Button>
            </SheetTrigger>
          </div>
          <SheetContent side="left" className="w-[300px] p-0 flex flex-col">
            <SheetHeader className="h-16 flex flex-row items-center border-b px-6">
                <SheetTitle className="text-lg font-bold font-headline text-primary">Chronos Docente</SheetTitle>
            </SheetHeader>
            <NavContent isSidebarOpen={true} onClick={() => setIsSheetOpen(false)} />
          </SheetContent>
        </Sheet>
      ) : (
        <aside
          className={cn(
            'flex flex-col border-r bg-card transition-all duration-300 ease-in-out print:hidden',
            isSidebarOpen ? 'w-64' : 'w-20'
          )}
        >
          <div
            className={cn(
              'flex h-16 items-center border-b px-6',
              isSidebarOpen ? 'justify-between' : 'justify-center'
            )}
          >
            {isSidebarOpen && (
              <h1 className="text-lg font-bold font-headline text-primary">
                Chronos Docente
              </h1>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              <PanelLeft className="h-5 w-5" />
              <span className="sr-only">Alternar barra lateral</span>
            </Button>
          </div>
          <NavContent isSidebarOpen={isSidebarOpen} onClick={() => {}} />
        </aside>
      )}

      <div className={cn("relative flex min-h-0 flex-grow flex-col print:block", isMobile && "pt-16")}>
        <AppNotifications />
        <WeeklySummaryTrigger />
        <DailySummaryTrigger />
        {children}
      </div>
      <audio id="notification-sound" src="/sounds/notification.mp3" preload="auto"></audio>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppLayoutContent>{children}</AppLayoutContent>;
}
