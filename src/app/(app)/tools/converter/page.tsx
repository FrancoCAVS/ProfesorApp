
'use client';

import * as React from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRightLeft } from 'lucide-react';

const CONVERSION_FACTORS = {
  secundario: 40 / 60, // 40 minutos / 60 minutos
  superior_no_universitario: 45 / 60, // 45 minutos / 60 minutos
};

type Level = keyof typeof CONVERSION_FACTORS;

export default function ConverterPage() {
  const [level, setLevel] = React.useState<Level>('secundario');
  const [cathedraHours, setCathedraHours] = React.useState('');
  const [clockHours, setClockHours] = React.useState('');

  const handleLevelChange = (newLevel: Level) => {
    setLevel(newLevel);
    // Reset fields on level change to avoid confusion
    setCathedraHours('');
    setClockHours('');
  };

  const handleCathedraChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCathedraHours(value);

    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0) {
      const converted = numValue * CONVERSION_FACTORS[level];
      setClockHours(converted.toFixed(2));
    } else {
      setClockHours('');
    }
  };

  const handleClockChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setClockHours(value);

    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0) {
      const converted = numValue / CONVERSION_FACTORS[level];
      setCathedraHours(converted.toFixed(2));
    } else {
      setCathedraHours('');
    }
  };


  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Conversor de Horas" />
      <div className="flex-1 p-8 flex items-start justify-center pt-12">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle>Conversor de Horas Cátedra a Horas Reloj</CardTitle>
            <CardDescription>
              Selecciona el nivel educativo y completa uno de los campos para calcular el equivalente.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="level-select">Nivel Educativo</Label>
              <Select value={level} onValueChange={handleLevelChange}>
                <SelectTrigger id="level-select">
                  <SelectValue placeholder="Selecciona un nivel..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="secundario">
                    Nivel Secundario (1 Hora Cátedra = 40 min)
                  </SelectItem>
                  <SelectItem value="superior_no_universitario">
                    Nivel Superior No Universitario (1 Hora Cátedra = 45 min)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="w-full space-y-2">
                <Label htmlFor="cathedra-hours">Horas Cátedra</Label>
                <Input
                  id="cathedra-hours"
                  type="number"
                  placeholder="Ej: 10"
                  value={cathedraHours}
                  onChange={handleCathedraChange}
                  min="0"
                />
              </div>

              <div className="hidden sm:flex items-center justify-center pt-6">
                 <ArrowRightLeft className="h-6 w-6 text-muted-foreground" />
              </div>

              <div className="w-full space-y-2">
                <Label htmlFor="clock-hours">Horas Reloj</Label>
                <Input
                  id="clock-hours"
                  type="number"
                  placeholder="Ej: 6.67"
                  value={clockHours}
                  onChange={handleClockChange}
                  min="0"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
