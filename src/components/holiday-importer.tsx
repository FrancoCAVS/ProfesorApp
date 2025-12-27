
'use client';

import * as React from 'react';
import { useApp } from '@/contexts/app-context';
import { useToast } from '@/hooks/use-toast';
import { getHolidaysForYear, type Holiday } from '@/ai/flows/get-holidays-flow';
import { Button } from './ui/button';
import { Loader2, AlertCircle, Check, Sparkles } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { format, parse } from 'date-fns';
import { es } from 'date-fns/locale/es';
import type { Event as EventType } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';

export function HolidayImporter({ onFinished }: { onFinished: () => void }) {
  const { addMultipleEvents } = useApp();
  const { toast } = useToast();
  const [status, setStatus] = React.useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [extractedHolidays, setExtractedHolidays] = React.useState<Holiday[]>([]);
  const [selectedHolidays, setSelectedHolidays] = React.useState<Set<string>>(new Set());
  const [error, setError] = React.useState<string | null>(null);
  const [year, setYear] = React.useState(new Date().getFullYear());
  const [additionalContext, setAdditionalContext] = React.useState('');

  const processRequest = React.useCallback(async (currentYear: number, context: string) => {
    setStatus('loading');
    setError(null);
    setExtractedHolidays([]);

    try {
      const result = await getHolidaysForYear({
        year: currentYear,
        country: 'Argentina',
        province: 'Salta',
        additionalContext: context,
      });

      if (result.holidays && result.holidays.length > 0) {
        setExtractedHolidays(result.holidays);
        const allHolidayNames = new Set(result.holidays.map(h => h.name));
        setSelectedHolidays(allHolidayNames);
        setStatus('success');
      } else {
        setStatus('error');
        setError("La IA no pudo encontrar ningún feriado para el año seleccionado. Prueba con otro año o añade más contexto.");
      }
    } catch (e) {
      console.error("Error processing holiday request with AI", e);
      setStatus('error');
      setError("Ocurrió un error al contactar al servicio de IA. Por favor, inténtalo de nuevo más tarde.");
    }
  }, []);

  const handleToggleSelection = (holidayName: string, checked: boolean) => {
    setSelectedHolidays(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(holidayName);
      } else {
        newSet.delete(holidayName);
      }
      return newSet;
    });
  };

  const handleImport = () => {
    const holidaysToImport = extractedHolidays.filter(h => selectedHolidays.has(h.name));
    
    const eventsToAdd: Omit<EventType, 'id' | 'status'>[] = [];
    let importedCount = 0;

    holidaysToImport.forEach(h => {
      try {
        const holidayDate = parse(h.date, 'yyyy-MM-dd', new Date());
        if (!isNaN(holidayDate.getTime())) {
          eventsToAdd.push({
            title: h.name,
            event_type: 'HOLIDAY',
            event_datetime: holidayDate,
            description: `Feriado nacional o provincial: ${h.name}`,
            reminder: { timing: 'none', channels: [] },
          });
          importedCount++;
        }
      } catch(e) {
        console.warn(`Error parsing date for holiday: ${h.name}`, e);
      }
    });

    if (eventsToAdd.length > 0) {
        addMultipleEvents(eventsToAdd);
    }

    toast({
      title: 'Importación Completada',
      description: `${importedCount} feriado(s) han sido añadidos correctamente.`,
    });
    onFinished();
  };

  const yearOptions = Array.from({ length: 4 }, (_, i) => new Date().getFullYear() - 1 + i);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
        <div>
          <Label htmlFor="year-select">Año a Consultar</Label>
          <Select value={String(year)} onValueChange={(val) => setYear(Number(val))}>
            <SelectTrigger id="year-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="additional-context">Contexto Adicional para la IA (Opcional)</Label>
          <Textarea 
            id="additional-context"
            placeholder="Ej: Incluir Triduo del Milagro (13-15 Sept)"
            value={additionalContext}
            onChange={(e) => setAdditionalContext(e.target.value)}
            className="h-20"
          />
        </div>
      </div>
      <Button onClick={() => processRequest(year, additionalContext)} disabled={status === 'loading'} className="w-full">
        {status === 'loading' ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="mr-2 h-4 w-4" />
        )}
        {status === 'loading' ? 'Consultando...' : 'Obtener Feriados'}
      </Button>
      
      {status === 'error' && error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error de Consulta</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {status === 'success' && (
        <Alert>
          <Check className="h-4 w-4" />
          <AlertTitle>¡Consulta Completa!</AlertTitle>
          <AlertDescription>
            Hemos obtenido {extractedHolidays.length} feriado(s). Revisa y selecciona los que deseas importar.
          </AlertDescription>
        </Alert>
      )}

      {extractedHolidays.length > 0 && (
        <Card>
          <CardHeader className="p-4">
            <CardTitle>Feriados Encontrados</CardTitle>
            <CardDescription>Desmarca los feriados que no quieras importar.</CardDescription>
          </CardHeader>
          <CardContent className="max-h-[40vh] overflow-y-auto space-y-2 p-4 pt-0">
            {extractedHolidays.map((holiday, index) => (
              <div key={index} className="flex items-center space-x-3 rounded-md border p-3">
                <Checkbox
                  id={`holiday-${index}`}
                  checked={selectedHolidays.has(holiday.name)}
                  onCheckedChange={(checked) => handleToggleSelection(holiday.name, !!checked)}
                />
                <Label htmlFor={`holiday-${index}`} className="flex-1 cursor-pointer">
                  <div className="font-semibold">{holiday.name}</div>
                  <p className="text-sm text-muted-foreground">
                    {format(parse(holiday.date, 'yyyy-MM-dd', new Date()), 'PPP', { locale: es })}
                  </p>
                </Label>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end gap-2 pt-4">
        <Button variant="ghost" onClick={onFinished}>Cancelar</Button>
        {status === 'success' && (
          <Button onClick={handleImport} disabled={selectedHolidays.size === 0}>
            Importar {selectedHolidays.size} Feriado(s)
          </Button>
        )}
      </div>
    </div>
  );
}
