'use client';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft } from 'lucide-react';

export default function NewCallPage() {
  const today = new Date().toISOString().split('T')[0];

  const [date, setDate] = useState(today);
  const [clave, setClave] = useState<string | undefined>(undefined);
  const [machine, setMachine] = useState<string | undefined>(undefined);
  const [address, setAddress] = useState('');
  const [alertMsg, setAlertMsg] = useState(''); // <-- estado para mostrar alerta
  const router = useRouter();
  const addressInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    addressInputRef.current?.focus();
  }, []);

  const handleNext = () => {
    if (!date) return setAlertMsg('Por favor, seleccione la fecha del llamado.');
    if (!clave) return setAlertMsg('Por favor, seleccione la clave.');
    if (!machine) return setAlertMsg('Por favor, seleccione la máquina.');
    if (!address.trim()) return setAlertMsg('Por favor, ingrese la dirección.');

    // Todos los campos completos → limpiar alerta y avanzar
    setAlertMsg('');
    router.push(
      `/enroll?date=${date}&clave=${clave}&machine=${machine}&address=${encodeURIComponent(address)}`
    );
  };

  return (
    <div className="min-h-screen bg-background p-6 flex flex-col items-center">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold mb-6 text-center">Nuevo llamado</h1>

        <div className="space-y-4">
          {/* Fecha */}
          <div>
            <label className="text-sm font-medium">Fecha llamado</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          {/* Clave */}
          <div>
            <label className="text-sm font-medium">Clave</label>
            <Select onValueChange={setClave}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una clave" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10-0-1">10-0-1</SelectItem>
                <SelectItem value="10-0-2">10-0-2</SelectItem>
                <SelectItem value="10-0-3">10-0-3</SelectItem>
                <SelectItem value="10-0-4">10-0-4</SelectItem>
                <SelectItem value="10-0-5">10-0-5</SelectItem>
                <SelectItem value="INCENDIO">Incendio</SelectItem>
                <SelectItem value="Reunión">Reunión</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Máquina */}
          <div>
            <label className="text-sm font-medium">Máquina</label>
            <Select onValueChange={setMachine}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una máquina" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Q7">Q-7</SelectItem>
                <SelectItem value="RX7">RX-7</SelectItem>
                <SelectItem value="M7">M-7</SelectItem>
                <SelectItem value="Cuartel">Cuartel</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Dirección */}
          <div>
            <label className="text-sm font-medium">Dirección</label>
            <Input
              ref={addressInputRef}
              placeholder="Ingrese dirección"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
        </div>

        {/* ALERTA */}
        {alertMsg && (
          <div className="mt-4 p-2 bg-red-100 text-red-800 rounded">
            {alertMsg}
          </div>
        )}

        {/* Botones */}
        <div className="flex flex-col gap-3 mt-8">
          <Button size="lg" onClick={handleNext}>
            Enrolar voluntarios
          </Button>

          <Button size="lg" variant="secondary">
            Consultar datos
          </Button>

          <Button asChild size="lg" variant="ghost">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Cancelar y volver
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

    