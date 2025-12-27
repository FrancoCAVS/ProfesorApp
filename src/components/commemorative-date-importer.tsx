
'use client';

import * as React from 'react';
import { useApp } from '@/contexts/app-context';
import { useToast } from '@/hooks/use-toast';
import { getCommemorativeDatesForYear, type CommemorativeDate } from '@/ai/flows/get-commemorative-dates-flow';
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

export function CommemorativeDateImporter({ onFinished }: { onFinished: () => void }) {
  const { addEvent } = useApp();
  const { toast } = useToast();
  const [status, setStatus] = React.useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [extractedDates, setExtractedDates] = React.useState<CommemorativeDate[]>([]);
  const [selectedDates, setSelectedDates] = React.useState<Set<string>>(new Set());
  const [error, setError] = React.useState<string | null>(null);
  const [year, setYear] = React.useState(new Date().getFullYear());
  const [additionalContext, setAdditionalContext] = React.useState('');

  const processRequest = React.useCallback(async (currentYear: number, context: string) => {
    setStatus('loading');
    setError(null);
    setExtractedDates([]);

    try {
      const result = await getCommemorativeDatesForYear({
        year: currentYear,
        country: 'Argentina',
        province: 'Salta',
        additionalContext: context,
      });

      if (result.dates && result.dates.length > 0) {
        setExtractedDates(result.dates);
        const allDateNames = new Set(result.dates.map(h => h.name));
        setSelectedDates(allDateNames);
        setStatus('success');
      } else {
        setStatus('error');
        setError("La IA no pudo encontrar ninguna fecha relevante para el año seleccionado. Prueba con otro año o añade más contexto.");
      }
    } catch (e) {
      console.error("Error processing request with AI", e);
      setStatus('error');
      setError("Ocurrió un error al contactar al servicio de IA. Por favor, inténtalo de nuevo más tarde.");
    }
  }, []);

  const handleToggleSelection = (dateName: string, checked: boolean) => {
    setSelectedDates(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(dateName);
      } else {
        newSet.delete(dateName);
      }
      return newSet;
    });
  };

  const handleImport = () => {
    const datesToImport = extractedDates.filter(h => selectedDates.has(h.name));
    
    let importedCount = 0;
    datesToImport.forEach(h => {
      try {
        const date = parse(h.date, 'yyyy-MM-dd', new Date());
        if (!isNaN(date.getTime())) {
          const eventData: Omit<EventType, 'id' | 'status'> = {
            title: h.name,
            event_type: 'COMMEMORATIVE',
            event_datetime: date,
            description: h.description || `Fecha conmemorativa: ${h.name}`,
            reminder: { timing: '1d', channels: ['in_app'] },
          };
          addEvent(eventData);
          importedCount++;
        }
      } catch(e) {
        console.warn(`Error parsing date for commemorative date: ${h.name}`, e);
      }
    });

    toast({
      title: 'Importación Completada',
      description: `${importedCount} fecha(s) ha(n) sido añadida(s) correctamente.`,
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
            placeholder="Ej: Fechas relacionadas con la literatura"
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
        {status === 'loading' ? 'Consultando...' : 'Obtener Fechas'}
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
            Hemos obtenido {extractedDates.length} fecha(s). Revisa y selecciona las que deseas importar.
          </AlertDescription>
        </Alert>
      )}

      {extractedDates.length > 0 && (
        <Card>
          <CardHeader className="p-4">
            <CardTitle>Fechas Encontradas</CardTitle>
            <CardDescription>Desmarca las fechas que no quieras importar.</CardDescription>
          </CardHeader>
          <CardContent className="max-h-[40vh] overflow-y-auto space-y-2 p-4 pt-0">
            {extractedDates.map((date, index) => (
              <div key={index} className="flex items-start space-x-3 rounded-md border p-3">
                <Checkbox
                  id={`date-${index}`}
                  checked={selectedDates.has(date.name)}
                  onCheckedChange={(checked) => handleToggleSelection(date.name, !!checked)}
                  className="mt-1"
                />
                <Label htmlFor={`date-${index}`} className="flex-1 cursor-pointer">
                  <div className="font-semibold">{date.name}</div>
                  <p className="text-sm text-muted-foreground">
                    {format(parse(date.date, 'yyyy-MM-dd', new Date()), 'PPP', { locale: es })}
                  </p>
                  {date.description && <p className="text-xs italic text-muted-foreground mt-1">{date.description}</p>}
                </Label>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end gap-2 pt-4">
        <Button variant="ghost" onClick={onFinished}>Cancelar</Button>
        {status === 'success' && (
          <Button onClick={handleImport} disabled={selectedDates.size === 0}>
            Importar {selectedDates.size} Fecha(s)
          </Button>
        )}
      </div>
    </div>
  );
}
