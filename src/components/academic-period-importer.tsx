
'use client';

import * as React from 'react';
import { useApp } from '@/contexts/app-context';
import { useToast } from '@/hooks/use-toast';
import { extractAcademicPeriodsFromImage, type ExtractPeriodsOutput } from '@/ai/flows/extract-academic-periods-from-image-flow';
import { Button } from './ui/button';
import { Loader2, AlertCircle, Check, Sparkles } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale/es';
import type { AcademicPeriod } from '@/lib/types';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';

type ExtractedPeriod = ExtractPeriodsOutput['periods'][0];

const periodTypeTranslations: Record<ExtractedPeriod['type'], string> = {
  vacation: 'Vacaciones / Receso',
  exam_period: 'Período de Exámenes',
  other: 'Otro',
};

const periodTypeVariants: Record<ExtractedPeriod['type'], "secondary" | "destructive" | "outline"> = {
  vacation: 'secondary',
  exam_period: 'destructive',
  other: 'outline',
};

export function AcademicPeriodImporter({ file, onFinished }: { file: File; onFinished: () => void }) {
  const { addAcademicPeriod } = useApp();
  const { toast } = useToast();
  const [status, setStatus] = React.useState<'loading' | 'success' | 'error' | 'idle'>('idle');
  const [extractedPeriods, setExtractedPeriods] = React.useState<ExtractedPeriod[]>([]);
  const [selectedPeriods, setSelectedPeriods] = React.useState<Set<string>>(new Set());
  const [error, setError] = React.useState<string | null>(null);
  const [customInstructions, setCustomInstructions] = React.useState('');
  const fileDataUriRef = React.useRef<string | null>(null);

  const processFile = React.useCallback(async (instructions: string) => {
    setStatus('loading');
    setError(null);
    setExtractedPeriods([]); // Clear previous results

    const processWithUri = async (uri: string) => {
      try {
        const result = await extractAcademicPeriodsFromImage({
          fileDataUri: uri,
          year: new Date().getFullYear(),
          customInstructions: instructions,
        });

        if (result.periods && result.periods.length > 0) {
          setExtractedPeriods(result.periods);
          const allPeriodNames = new Set(result.periods.map(p => p.name));
          setSelectedPeriods(allPeriodNames);
          setStatus('success');
        } else {
          setStatus('error');
          setError("La IA no pudo encontrar ningún periodo lectivo en el documento. Prueba con un archivo más claro o añade instrucciones específicas para guiarla.");
        }
      } catch (e) {
        console.error("Error processing file with AI", e);
        setStatus('error');
        setError("Ocurrió un error al contactar al servicio de IA. Por favor, inténtalo de nuevo más tarde.");
      }
    };
    
    if (fileDataUriRef.current) {
      await processWithUri(fileDataUriRef.current);
    } else {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const uri = reader.result as string;
        fileDataUriRef.current = uri;
        await processWithUri(uri);
      };
      reader.onerror = () => {
        setStatus('error');
        setError("No se pudo leer el archivo.");
      }
    }
  }, [file]);
  
  React.useEffect(() => {
    if (file && status === 'idle') {
      processFile('');
    }
  }, [file, status, processFile]);

  const handleToggleSelection = (periodName: string, checked: boolean) => {
    setSelectedPeriods(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(periodName);
      } else {
        newSet.delete(periodName);
      }
      return newSet;
    });
  };

  const handleImport = () => {
    const periodsToImport = extractedPeriods.filter(p => selectedPeriods.has(p.name));
    
    let importedCount = 0;
    periodsToImport.forEach(p => {
      try {
        const startDate = parseISO(p.startDate);
        const endDate = parseISO(p.endDate);
        if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
          const academicPeriodData: Omit<AcademicPeriod, 'id'> = {
            name: p.name,
            type: p.type === 'class_period' ? 'other' : p.type, // Force to 'other' if AI hallucinates 'class_period'
            startDate,
            endDate,
            level: p.level,
          };
          addAcademicPeriod(academicPeriodData);
          importedCount++;
        } else {
          console.warn(`Skipping period with invalid date: ${p.name}`);
        }
      } catch(e) {
        console.warn(`Error parsing date for period: ${p.name}`, e);
      }
    });

    toast({
      title: 'Importación Completada',
      description: `${importedCount} periodo(s) han sido añadidos correctamente.`,
    });
    onFinished();
  };

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground">Analizando el documento, por favor espera...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {status === 'error' && error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error de Análisis</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {status === 'success' && (
        <Alert>
          <Check className="h-4 w-4" />
          <AlertTitle>¡Análisis Completo!</AlertTitle>
          <AlertDescription>
            Hemos extraído {extractedPeriods.length} periodo(s). Revisa y selecciona los que deseas importar.
          </AlertDescription>
        </Alert>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="custom-instructions">Instrucciones para la IA (Opcional)</Label>
        <Textarea
          id="custom-instructions"
          placeholder="Ej: Extraer solo los periodos del nivel secundario. Ignorar las fechas de inscripción."
          value={customInstructions}
          onChange={(e) => setCustomInstructions(e.target.value)}
        />
        <Button variant="outline" size="sm" onClick={() => processFile(customInstructions)} disabled={status === 'loading'}>
          <Sparkles className="mr-2 h-4 w-4" />
          {status === 'loading' ? 'Analizando...' : 'Volver a Analizar con Instrucciones'}
        </Button>
      </div>

      {extractedPeriods.length > 0 && (
        <Card>
          <CardHeader className="p-4">
            <CardTitle>Periodos Encontrados</CardTitle>
            <CardDescription>Desmarca los periodos que no quieras importar.</CardDescription>
          </CardHeader>
          <CardContent className="max-h-[40vh] overflow-y-auto space-y-2 p-4 pt-0">
            {extractedPeriods.map((period, index) => (
              <div key={index} className="flex items-center space-x-3 rounded-md border p-3">
                <Checkbox
                  id={`period-${index}`}
                  checked={selectedPeriods.has(period.name)}
                  onCheckedChange={(checked) => handleToggleSelection(period.name, !!checked)}
                />
                <Label htmlFor={`period-${index}`} className="flex-1 cursor-pointer">
                  <div className="flex justify-between items-start">
                    <div className="font-semibold">{period.name}</div>
                    <Badge variant={periodTypeVariants[period.type]}>{periodTypeTranslations[period.type]}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {format(parseISO(period.startDate), 'P', { locale: es })} - {format(parseISO(period.endDate), 'P', { locale: es })}
                  </p>
                  {period.level && <p className="text-xs text-muted-foreground capitalize">Nivel: {period.level.replace(/_/g, ' ')}</p>}
                </Label>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end gap-2 pt-4">
        <Button variant="ghost" onClick={onFinished}>Cancelar</Button>
        {status === 'success' && (
          <Button onClick={handleImport} disabled={selectedPeriods.size === 0}>
            Importar {selectedPeriods.size} Periodo(s)
          </Button>
        )}
      </div>
    </div>
  );
}
