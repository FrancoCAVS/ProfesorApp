
'use client';

import * as React from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ArrowRightLeft, Clock } from 'lucide-react';
import { format, parse } from 'date-fns';
import { es } from 'date-fns/locale';

const timezones = [
  { label: 'Argentina (Buenos Aires)', value: 'America/Argentina/Buenos_Aires' },
  { label: 'Bolivia (La Paz)', value: 'America/La_Paz' },
  { label: 'Chile (Santiago)', value: 'America/Santiago' },
  { label: 'Colombia (Bogotá)', value: 'America/Bogota' },
  { label: 'Ecuador (Quito)', value: 'America/Guayaquil' },
  { label: 'España (Madrid)', value: 'Europe/Madrid' },
  { label: 'México (Ciudad de México)', value: 'America/Mexico_City' },
  { label: 'Paraguay (Asunción)', value: 'America/Asuncion' },
  { label: 'Perú (Lima)', value: 'America/Lima' },
  { label: 'Uruguay (Montevideo)', value: 'America/Montevideo' },
  { label: 'Venezuela (Caracas)', value: 'America/Caracas' },
  { label: 'EE.UU. (Nueva York)', value: 'America/New_York' },
  { label: 'EE.UU. (Los Ángeles)', value: 'America/Los_Angeles' },
];

export default function TimeConverterPage() {
  const [sourceTimezone, setSourceTimezone] = React.useState(timezones[3].value); // Colombia
  const [targetTimezone, setTargetTimezone] = React.useState(timezones[0].value); // Argentina
  const [sourceTime, setSourceTime] = React.useState('20:00');
  const [convertedTime, setConvertedTime] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  
  const handleConversion = React.useCallback(() => {
    setError(null);
    setConvertedTime(null);
    
    if (!sourceTime) {
      setError('Por favor, ingresa una hora.');
      return;
    }
    
    try {
      const today = new Date();
      const parsedTime = parse(sourceTime, 'HH:mm', today);
      if (isNaN(parsedTime.getTime())) {
          throw new Error('Formato de hora inválido.');
      }
      
      const sourceDateTimeStr = `${format(today, 'yyyy-MM-dd')}T${sourceTime}:00`;

      // Intl.DateTimeFormat is the modern way to handle timezone conversions in JS
      const targetFormatter = new Intl.DateTimeFormat('es-ES', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: targetTimezone,
        hour12: false,
      });

      // We need to parse the source date as if it's in the source timezone.
      // A trick is to get the UTC offset for the source timezone and apply it.
      const utcDate = new Date(sourceDateTimeStr + 'Z'); // Treat as UTC first
      const sourceOffset = new Date(utcDate.toLocaleString('en-US', { timeZone: sourceTimezone })).getTime() - utcDate.getTime();
      const sourceDate = new Date(utcDate.getTime() - sourceOffset);
      
      const convertedParts = targetFormatter.formatToParts(sourceDate);
      const convertedObj = convertedParts.reduce((acc, part) => {
          acc[part.type] = part.value;
          return acc;
      }, {} as Record<string, string>);

      const finalDate = parse(`${convertedObj.day}/${convertedObj.month}/${convertedObj.year}`, 'dd/MM/yyyy', new Date());

      setConvertedTime(
        `La hora en el país de destino será: ${convertedObj.hour}:${convertedObj.minute} del ${format(finalDate, 'PPPP', { locale: es })}`
      );

    } catch (e: any) {
        setError(`Error: ${e.message || 'No se pudo realizar la conversión.'}`);
    }
  }, [sourceTime, sourceTimezone, targetTimezone]);
  
  React.useEffect(() => {
    handleConversion();
  }, [handleConversion]);


  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Conversor de Horario Internacional" />
      <div className="flex-1 p-8 flex items-start justify-center pt-12">
        <Card className="w-full max-w-3xl">
          <CardHeader>
            <CardTitle>Conversor de Zonas Horarias</CardTitle>
            <CardDescription>
              Calcula a qué hora será un evento en otro país. La herramienta tiene en cuenta el horario de verano/invierno automáticamente.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label htmlFor="source-time">Hora en País de Origen</Label>
                    <Input
                        id="source-time"
                        type="time"
                        value={sourceTime}
                        onChange={(e) => setSourceTime(e.target.value)}
                    />
                </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="w-full space-y-2">
                <Label htmlFor="source-tz">País de Origen</Label>
                <Select value={sourceTimezone} onValueChange={setSourceTimezone}>
                    <SelectTrigger id="source-tz"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {timezones.map(tz => <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>)}
                    </SelectContent>
                </Select>
              </div>

              <div className="hidden sm:flex items-center justify-center pt-6">
                 <ArrowRightLeft className="h-6 w-6 text-muted-foreground" />
              </div>

              <div className="w-full space-y-2">
                <Label htmlFor="target-tz">País de Destino</Label>
                 <Select value={targetTimezone} onValueChange={setTargetTimezone}>
                    <SelectTrigger id="target-tz"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {timezones.map(tz => <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>)}
                    </SelectContent>
                </Select>
              </div>
            </div>

            <div className="pt-4">
                <Button onClick={handleConversion} className="w-full">Convertir</Button>
            </div>

            {convertedTime && (
                <div className="p-4 bg-primary/10 border-l-4 border-primary rounded-r-md">
                    <div className="flex items-center gap-3">
                        <Clock className="h-6 w-6 text-primary" />
                        <p className="font-semibold text-primary-foreground">{convertedTime}</p>
                    </div>
                </div>
            )}
            {error && (
                <div className="p-4 bg-destructive/10 text-destructive-foreground">
                    <p>{error}</p>
                </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
