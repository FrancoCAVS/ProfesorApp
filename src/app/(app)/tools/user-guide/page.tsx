
'use client';

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const GuideSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="mb-8">
        <h2 className="text-2xl font-bold font-headline text-primary mb-4 pb-2 border-b border-primary/20">{title}</h2>
        <div className="space-y-4 text-foreground/90">{children}</div>
    </div>
);

const SubSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <div className="space-y-3 text-foreground/80 pl-4 border-l-2 border-accent/50">{children}</div>
    </div>
);

const ListItem = ({ children, isBold = false }: { children: React.ReactNode, isBold?: boolean }) => (
    <li className={`list-disc list-inside ${isBold ? 'font-semibold' : ''}`}>{children}</li>
);

export default function UserGuidePage() {
    return (
         <div className="flex h-full flex-col">
            <PageHeader title="Guía de Usuario" />
            <main className="flex-1 overflow-y-auto p-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-3xl font-bold">¡Bienvenido/a a "El Amigo del Profesor"!</CardTitle>
                        <CardDescription className="text-md">
                            Esta aplicación está diseñada para ser tu asistente personal en la gestión de tu día a día como docente. Aquí podrás centralizar tus horarios, planificar eventos, registrar asistencias y mucho más, todo potenciado con herramientas de inteligencia artificial para hacerte la vida más fácil.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="prose prose-blue max-w-none">
                        <p>Esta guía te ayudará a dar tus primeros pasos y a sacar el máximo provecho de la aplicación.</p>
                        
                        <Separator className="my-6" />

                        <GuideSection title="🚀 Fase 1: La Configuración Inicial">
                            <p>Para que la aplicación funcione correctamente, es crucial que primero configures algunos datos básicos. Te recomendamos seguir este orden:</p>
                            
                            <SubSection title="1. Instituciones">
                                <p>Es el punto de partida. Aquí registrarás todas las escuelas, colegios o universidades donde trabajas, con un nivel de detalle increíble.</p>
                                <ul>
                                    <ListItem>Ve a la sección "Instituciones" en el menú lateral.</ListItem>
                                    <ListItem>Añade cada institución, especificando su nombre y nivel (secundario, superior no universitario, etc.).</ListItem>
                                    <ListItem isBold>Gestión de Autoridades:</ListItem>
                                    <p className="pl-6 text-sm">Ya no hay campos fijos. Puedes añadir cualquier cargo (Director/a, Rector/a, Coordinador/a) y el nombre de la persona que lo ocupa. ¡Total flexibilidad!</p>
                                    <ListItem isBold>Detalle por Nivel:</ListItem>
                                    <ul className="pl-6 list-[circle]">
                                        <li><b>Para Nivel Superior Universitario:</b> Puedes añadir "Facultades" u "Organismos", y a cada uno asignarle sus propias autoridades (Decano/a, Secretario/a, etc.).</li>
                                        <li><b>Para Nivel Superior No Universitario:</b> Puedes añadir "Carreras" con sus respectivas autoridades (Coordinador/a, etc.).</li>
                                    </ul>
                                    <ListItem isBold>¿Por qué es importante?</ListItem>
                                    <p className="pl-6 text-sm">Las asignaturas que crees más adelante se vincularán a estas instituciones. Además, esta información se usará para generar documentos formales.</p>
                                </ul>
                            </SubSection>

                             <SubSection title="2. Periodos Lectivos">
                                <p>Aquí definirás los marcos temporales de tu año académico. Esto es vital para que la aplicación sepa cuándo tienes clases.</p>
                                <ul>
                                    <ListItem>Ve a "Periodos Lectivos".</ListItem>
                                    <ListItem><b>Añade los periodos clave</b>:
                                        <ul className="pl-6 list-[circle]">
                                            <li><b>Periodos Lectivos</b>: El más importante. Define el inicio y fin de tus clases (ej. "Ciclo Lectivo 2024", "1er Cuatrimestre").</li>
                                            <li><b>Recesos y Vacaciones</b>: Añade las vacaciones de invierno o verano. La aplicación sabrá que en esos días no hay clases.</li>
                                            <li><b>Periodos de Exámenes</b>: Define las fechas de mesas de examen. Durante estos días, las clases regulares se suspenderán automáticamente en tu calendario de asistencia.</li>
                                        </ul>
                                    </ListItem>
                                    <ListItem isBold>¡Usa la IA!</ListItem>
                                    <p className="pl-6 text-sm">Puedes usar el botón <b>"Importar de Calendario con IA"</b> para subir una imagen o PDF del calendario oficial y que la IA extraiga estas fechas por ti.</p>
                                </ul>
                            </SubSection>

                            <SubSection title="3. Asignaturas">
                                <p>El corazón de la aplicación. Aquí crearás cada una de las materias que dictas.</p>
                                 <ul>
                                    <ListItem>Ve a la sección "Asignaturas".</ListItem>
                                    <ListItem>Añade una nueva asignatura:</ListItem>
                                     <ul className="pl-6 list-[circle]">
                                        <li>Dale un nombre y un color para identificarla fácilmente.</li
                                        <li>Vincúlala a una Institución y a un Periodo Lectivo de los que ya creaste.</li
                                        <li>Añade las divisiones o comisiones (ej. "5º A" o "Comisión K2005").</li
                                        <li>Dentro de cada comisión, <b>define el horario semanal</b> (qué días y a qué hora tienes clases) y la carga horaria.</li
                                    ul>
                                ul>
                            SubSection>
                        GuideSection>
                        
                        Separator className="my-6" />

                        GuideSection title="📚 Fase 2: Planificación Académica">
                             p>Una vez creadas tus asignaturas, es hora de darles contenido. El centro de mando para esto es la página de "Programación" de cada asignatura.</p
                             SubSection title="Acceder a la Programación">
                                p>Ve a "Asignaturas", y simplemente haz clic en la tarjeta de la materia que quieras planificar.</p
                             SubSection>
                             SubSection title="¿Qué puedes hacer aquí?">
                                 ul
                                     ListItem isBold>Definir Unidades y Contenidos:</ListItem>
                                     p className="pl-6 text-sm">Estructura tu programa creando unidades y listando todos los temas o contenidos para cada una. Puedes pegar texto directamente.</p
                                     ListItem isBold>Analizar el Programa con IA:</ListItem>
                                     p className="pl-6 text-sm">Usa el botón <b>"Analizar Programa Completo"</b>. La IA leerá tus unidades y te dará métricas (cantidad de temas vs. clases), sugerencias de orden y ritmo, e identificará los temas más importantes.</p
                                     ListItem isBold>Planificar Actividades:</ListItem>
                                     p className="pl-6 text-sm">Define las metodologías y tipos de actividades que usarás. ¡Usa la IA para que te sugiera actividades creativas y específicas para tu materia!</p
                                     ListItem isBold>Programar Exámenes:</ListItem>
                                     p className="pl-6 text-sm">Añade las fechas de tus exámenes parciales. Esto es crucial para la generación del cronograma.</p
                                 ul>
                             SubSection>
                        GuideSection>

                        Separator className="my-6" />

                         GuideSection title="🛠️ Fase 3: Herramientas y Automatización">
                            p>Con toda la información cargada, ahora puedes usar las herramientas más potentes de la aplicación.</p
                            SubSection title="Generador de Cronograma (desde Programación)">
                                p>Una vez que hayas definido los temas en la página de "Programación", ve a la opción <b>"Generar Cronograma"</b>.</p
                                 ul
                                    ListItem>La IA distribuirá tus temas de forma lógica a lo largo de las clases del año, respetando las fechas de examen.</ListItem>
                                    ListItem>Revisa la sugerencia, aplícala y luego edita manually si es necesario.</ListItem>
                                    ListItem>Puedes descargar el cronograma completo como un archivo HTML, listo para imprimir y presentar.</ListItem>
                                ul>
                            SubSection>
                             SubSection title="Generador de Mesas de Examen">
                                 ul
                                    ListItem><b>Generación Rápida:</b> En la página de "Asignaturas", selecciona una o varias materias del mismo nivel. Usa el botón <b>"Generar Mesas de Examen"</b>, completa un único formulario con las fechas para los diferentes llamados, y la aplicación creará todos los eventos de examen automáticamente.</ListItem>
                                    ListItem><b>Importación Masiva desde CSV:</b> Ve a la página de <b>"Asignaturas"</b>. Allí encontrarás los botones <b>"Importar CSV"</b> y <b>"Descargar Plantilla"</b>.</ListItem>
                                    ListItem isBold>Plantilla CSV Unificada:</ListItem>
                                    p className="pl-6 text-sm">Tu archivo CSV debe tener estas columnas: `nombre_materia`, `institucion`, `nivel`, `tipo_examen`, `fecha` y `hora`.</p
                                    ul className="pl-12 list-[circle]">
                                        li><b>`tipo_examen`</b>: Debe ser un identificador como `EXAM_REGULAR`, `EXAM_LIBRE`, `EXAM_FINAL_PRIMER_LLAMADO`, etc.</li
                                        li><b>`fecha`</b>: Crucial que esté en formato `DD-MM-YYYY`.</li
                                        li><b>`hora`</b>: Crucial que esté en formato `HH:mm` (24 horas).</li
                                    ul>
                                ul>
                            SubSection>
                            SubSection title="Generador de Notas (en Herramientas > Generador de Notas)">
                                p>¿Necesitas redactar una nota formal para solicitar una licencia o justificar una inasistencia?</p
                                 ul
                                    ListItem>Completa un simple formulario con el destinatario (que puedes elegir de tus instituciones guardadas), el motivo, y la IA redactará una nota profesional lista para ser copiada. ¡Incluso puede fundamentarla con la normativa vigente si se lo pides!</ListItem>
                                ul>
                            SubSection>
                        GuideSection>

                        Separator className="my-6" />

                        GuideSection title="☀️ Uso Diario">
                            SubSection title="Calendario: Tu Centro de Mando">
                                p>Es la pantalla principal donde verás todo lo que sucede: clases, eventos personales, feriados, fechas conmemorativas y exámenes.</p
                            SubSection>
                            SubSection title="Confirmación de Asistencia y Seguimiento de Eventos">
                                p>Para no perder de vista ninguna tarea posterior a un evento, puedes registrar tu participación y crear seguimientos.</p
                                ul
                                    ListItem isBold>1. Marca tu participación:</ListItem>
                                    p className="pl-6 text-sm">En el <b>Calendario</b>, haz clic en el menú de un evento (los tres puntos verticales) y selecciona "Marcar como Asistido" o "Marcar como Inasistencia".</p
                                    ListItem isBold>2. Añade una Nota:</ListItem>
                                    p className="pl-6 text-sm">Aparecerá una ventana donde puedes escribir una nota. Por ejemplo, si asististe a una reunión, puedes anotar: "Quedó pendiente enviar el resumen por correo".</p
                                    ListItem isBold>3. Crea la Tarea de Seguimiento:</ListItem>
                                    p className="pl-6 text-sm">Dentro de esa misma ventana, marca la casilla <b>"Crear tarea de seguimiento"</b>. Al confirmar, tu nota se convertirá en una tarea pendiente.</p
                                ul>
                             SubSection>
                             SubSection title="Seguimiento de Notas y Tareas">
                                p>Esta sección es tu centro de tareas pendientes, para que no se te olvide nada importante.</p
                                 ul
                                    ListItem>Aquí verás todas las tareas que creaste desde el Calendario.</ListItem>
                                    ListItem>También puedes añadir tareas manualmente desde esta sección.</ListItem>
                                    ListItem>Una vez que resuelvas una tarea (ej. enviaste el correo del resumen), márcala como completada.</ListItem>
                                ul>
                             SubSection>
                             SubSection title="Asistencia: Registro de Clases">
                                 ul
                                    ListItem>Ve a la sección "Asistencia". Por defecto, verás las clases de hoy.</ListItem>
                                    ListItem>Registra si estuviste presente o ausente. Si faltas, puedes justificarlo.</ListItem>
                                    ListItem>Usa las pestañas "Semana" y "Mes" para ver un panorama más amplio y acceder a un informe de tu porcentaje de asistencia.</ListItem>
                                ul>
                             SubSection>
                             SubSection title="Informes: Analiza tu Desempeño">
                                p>La sección "Informes" te permite visualizar datos clave sobre tu actividad.</p
                                ul
                                    ListItem><b>Informe de Asistencia</b>: Genera un reporte detallado de tus asistencias y ausencias para una semana, un mes o un período personalizado. Verás un resumen global y un desglose por cada asignatura, ideal para finales de trimestre.</ListItem>
                                    ListItem><b>Resúmenes Manuales</b>: ¿Necesitas enviar un resumen de tu semana o tu día ahora mismo? Desde aquí puedes generar y enviar manualmente los resúmenes por correo o mensajería.</ListItem>
                                ul>
                            SubSection>
                             SubSection title="Recordatorios: Tu Asistente Proactivo">
                                p>La aplicación puede enviarte recordatorios para mantenerte al día. Puedes configurar dos tipos:</p
                                ol className="list-decimal list-inside space-y-2 pl-4">
                                    li><b>Recordatorios de Eventos</b>: Al crear o editar cualquier evento en el calendario, verás una sección para "Configuración de Recordatorios".
                                        ul className="pl-6 list-[circle]">
                                            li>Elige cuándo quieres recibir el aviso (ej. 1 día antes, 15 minutos antes).</li
                                            li>Selecciona por qué canales quieres recibirlo (una notificación en la app, un email, etc.).</li
                                            li>Puedes configurar recordatorios simples (un solo aviso) o recurrentes (varios avisos).</li
                                        ul>
                                    li><b>Recordatorios Automáticos (Configura tu Perfil)</b>: Haz clic en tu avatar (abajo a la izquierda) para abrir tu perfil. Aquí puedes activar/desactivar y configurar:
                                         ul className="pl-6 list-[circle]">
                                            li><b>Resumen Diario</b>: Recibe un mensaje automático por WhatsApp o Telegram con tu agenda del día siguiente. ¡Perfecto para empezar el día organizado!</li
                                            li><b>Recordatorio de Asistencia</b>: Si olvidas registrar las asistencias de un día, la app te enviará un recordatorio por la noche para que no se te pase.</li
                                        ul>
                                    li>
                                ol>
                             SubSection>
                        GuideSection>

                        Separator className="my-6" />

                        GuideSection title="❓ Preguntas Frecuentes (FAQ)">
                            SubSection title="¿Por qué no veo mis clases en el calendario o en la sección de asistencia?">
                                p>Este es el problema más común y casi siempre se debe a que falta un eslabón en la cadena de configuración. Asegúrate de tener todo esto en orden:</p>
                                ul
                                    ListItem><b>1. Institución Creada</b>: Debes tener al menos una institución registrada.</ListItem>
                                    ListItem><b>2. Periodo Lectivo Activo</b>: Necesitas un "Periodo Lectivo" (no de examen ni vacaciones) que incluya la fecha actual.</ListItem>
                                    ListItem><b>3. Asignatura Vinculada</b>: Tu asignatura debe estar vinculada tanto a la institución como al periodo lectivo correcto.</ListItem>
                                    ListItem><b>4. Horario Semanal Definido</b>: Dentro de la asignatura, su comisión o división debe tener al menos un horario semanal configurado (ej. Lunes de 8:00 a 10:00).</ListItem>
                                    ListItem><b>5. Sin Superposiciones</b>: Verifica que un feriado o un periodo de vacaciones/examen no esté cancelando la clase de ese día.</ListItem>
                                ul>
                            SubSection>
                            SubSection title="¿Cómo puedo mejorar las respuestas de la IA?">
                                p>La calidad de la IA depende de la calidad de los datos que le das. Para mejores resultados:</p>
                                ul
                                    ListItem><b>Para Actividades y Cronogramas</b>: En la página de "Programación", sé lo más detallado posible. Define bien las unidades, los temas y, sobre todo, la carrera o la orientación de la materia. Esto le da a la IA el contexto que necesita.</ListItem>
                                    ListItem><b>Para Importar con IA (Feriados, Periodos)</b>: Usa imágenes o PDFs claros y de buena calidad. Si la IA se equivoca, usa el campo de "Instrucciones Adicionales" para guiarla (ej. "Extraer solo los periodos del nivel secundario").</ListItem>
                                ul>
                            SubSection>
                            SubSection title="¿Se guardan mis datos en la nube?">
                                p>No. Esta aplicación funciona de manera <b>local</b>. Todos tus datos (asignaturas, horarios, eventos, etc.) se guardan exclusivamente en el almacenamiento de tu navegador. Esto garantiza tu privacidad.</p
                                p className="font-semibold">Ventaja: Control total y privacidad.</p
                                p className="font-semibold">Desventaja: Los datos no se sincronizan entre diferentes dispositivos o navegadores. Si limpias la caché de tu navegador, podrías perder los datos.</p
                            SubSection>
                             SubSection title="¿Cómo puedo hacer una copia de seguridad de mis datos?">
                                p>Dado que los datos son locales, la aplicación incluye una función de resguardo y restauración. Es una buena práctica usarla regularmente.</p
                                ul
                                    ListItem>Ve a tu <b>Perfil</b> (haciendo clic en tu avatar abajo a la izquierda).</ListItem>
                                    ListItem>En la sección "Resguardo y Restauración", haz clic en <b>"Crear Respaldo"</b>. Esto descargará un archivo `prof-friend-backup.json` con toda tu información.</ListItem>
                                    ListItem>Guarda ese archivo en un lugar seguro (un pendrive, la nube, etc.).</ListItem>
                                    ListItem>Para restaurar, usa el botón <b>"Restaurar desde Archivo"</b> en esa misma sección y selecciona el archivo de respaldo que guardaste. ¡Cuidado! Esto sobrescribirá todos los datos actuales.</ListItem>
                                ul>
                             SubSection>
                             SubSection title="Archivé una asignatura por error, ¿cómo la recupero?">
                                p>¡No te preocupes! Los datos no se eliminan. Sigue estos pasos:</p
                                ul
                                    ListItem>Ve a la página de <b>"Asignaturas"</b>.</ListItem>
                                    ListItem>Activa el interruptor <b>"Mostrar archivadas"</b> que está en la parte superior derecha.</ListItem>
                                    ListItem>Verás las asignaturas archivadas con un estilo atenuado. Haz clic en el menú (tres puntos) de la asignatura que quieres recuperar y selecciona <b>"Desarchivar"</b>.</ListItem>
                                ul>
                            SubSection>
                            SubSection title="¿Cuál es la diferencia entre `Seguimiento` y `Recordatorios`?">
                                p>Es una distinción clave para la productividad:</p
                                ul
                                    ListItem><b>Recordatorios:</b> Son pasivos. La app te avisa *antes* de que un evento ocurra para que no te olvides.</ListItem>
                                    ListItem><b>Seguimiento:</b> Es activo. Es una lista de tareas *tuyas* que surgen *después* de un evento. Es para que gestiones las acciones pendientes y te asegures de que se completen.</ListItem>
                                ul>
                            SubSection>
                            SubSection title="¿Puedo usar la app sin conexión a internet?">
                                p><b>Sí, parcialmente.</b> Como tus datos de horarios, asignaturas y eventos están guardados localmente, puedes consultar toda tu información (calendario, horarios, etc.) sin conexión. Sin embargo, todas las funcionalidades que dependen de la <b>Inteligencia Artificial</b> (generadores, importadores, etc.) requieren una conexión activa a internet para funcionar.</p
                            SubSection>
                            SubSection title="¿Por qué la app me pide permiso para el micrófono?">
                                p>Solo se te pedirá permiso si intentas usar la función de <b>"Añadir por Voz"</b> al crear un evento. La app necesita acceder al micrófono para poder transcribir tu dictado y rellenar el formulario del evento automáticamente. Si no planeas usar esta función, puedes denegar el permiso sin problemas.</p
                            SubSection>
                            SubSection title="¿El envío de mensajes por WhatsApp/Telegram es gratuito?">
                                p>La aplicación en sí no cobra nada. Sin embargo, el envío de mensajes depende de servicios externos:</p
                                ul
                                    ListItem><b>Telegram</b>: Usar un bot de Telegram es gratuito. Solo necesitas crear tu propio bot y configurar las credenciales en la app.</ListItem>
                                    ListItem><b>WhatsApp</b>: La API oficial de WhatsApp Business (que la app está preparada para usar) puede tener costos asociados dependiendo del volumen de mensajes, según las políticas de Meta/Facebook.</ListItem>
                                    ListItem><b>Modo Simulación</b>: Si no configuras las credenciales, la app no enviará mensajes reales, sino que los mostrará en la consola del sistema, permitiéndote probar la funcionalidad sin costo alguno.</ListItem>
                                ul>
                            SubSection>
                            SubSection title="¿Cómo se calcula el porcentaje de asistencia en los informes?">
                                p>El porcentaje se calcula de la forma más justa posible: <b>(Clases Presente) / (Clases Totales - Ausencias Justificadas)</b>.</p
                                p>Esto significa que las ausencias justificadas (por enfermedad, licencia, etc.) no penalizan tu porcentaje de asistencia, ya que se restan del total de clases "posibles".</p
                            SubSection>
                            SubSection title="¿Qué es NotebookLM y por qué aparece en la app?">
                                p><b>NotebookLM</b> es una herramienta de Google que te permite crear un "cuaderno de notas" inteligente basado en tus propios documentos (PDFs, textos, etc.). Puedes subir, por ejemplo, el Estatuto Docente o el régimen de licencias, y luego hacerle preguntas en lenguaje natural.</p
                                p>La aplicación se integra con él de dos formas:</p
                                ul
                                    ListItem>En tu <b>Perfil</b>, puedes guardar un enlace a tu cuaderno de NotebookLM para un acceso rápido.</ListItem>
                                    ListItem>El <b>Generador de Notas</b> puede usar la IA para consultar normativas. Tener tus documentos cargados en NotebookLM puede hacer que estas consultas sean mucho más precisas.</ListItem>
                                ul>
                            SubSection>
                            SubSection title="Un evento en mi calendario aparece en un color diferente (azul, ámbar, verde), ¿qué significa?">
                                p>La aplicación usa colores para diferenciar tipos de eventos de un vistazo:</p
                                ul
                                    ListItem><b>Color de la Asignatura</b>: Eventos académicos regulares (exámenes, reuniones de cátedra).</ListItem>
                                    ListItem><b>Azul</b>: Feriados. Estos días no se programarán clases.</ListItem>
                                    ListItem><b>Ámbar/Dorado</b>: Fechas Conmemorativas. Son recordatorios que no suspenden las clases.</ListItem>
                                    ListItem><b>Verde</b>: Eventos Personales (turnos médicos, trámites). Para diferenciar tu vida personal de la laboral.</ListItem>
                                ul>
                            SubSection>
                        GuideSection>

                    CardContent>
                Card>
            main>
        div>
    );
}
