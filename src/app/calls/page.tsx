'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import {
  collection,
  getDocs,
  DocumentData,
  Timestamp,
  query,
  where,
  writeBatch,
} from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';

type Call = {
  id: string;
  fecha: string;
  clave: string;
  maquina: string;
  direccion: string;
  timestamp: Timestamp;
};

export default function CallsPage() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [callToDelete, setCallToDelete] = useState<Call | null>(null);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const fetchCalls = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'llamados'));

        const callsMap = new Map<string, DocumentData[]>();

        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          const key = `${data.fecha}-${data.clave}-${data.maquina}-${data.direccion}`;

          if (!callsMap.has(key)) {
            callsMap.set(key, []);
          }
          callsMap.get(key)!.push(data);
        });

        const uniqueCalls = Array.from(callsMap.values())
          .map((callDocuments) => {
            // Find the earliest ingreso timestamp for the call to use for sorting
            const sortedByIngreso = [...callDocuments].sort((a, b) => {
              const timeA =
                a.ingreso && typeof a.ingreso.toMillis === 'function' ? a.ingreso.toMillis() : 0;
              const timeB =
                b.ingreso && typeof b.ingreso.toMillis === 'function' ? b.ingreso.toMillis() : 0;
              return timeA - timeB;
            });
            const firstEntry = sortedByIngreso[0];

            const { fecha, clave, maquina, direccion } = firstEntry;
            const key = `${fecha}-${clave}-${maquina}-${direccion}`;

            return {
              id: key,
              fecha: fecha,
              clave: clave,
              maquina: maquina,
              direccion: direccion,
              timestamp: firstEntry.ingreso, // The timestamp of the first volunteer enrollment
            };
          })
          .sort((a, b) => {
            // Sort calls by their timestamp, descending
            const timeA =
              a.timestamp && typeof a.timestamp.toMillis === 'function'
                ? a.timestamp.toMillis()
                : 0;
            const timeB =
              b.timestamp && typeof b.timestamp.toMillis === 'function'
                ? b.timestamp.toMillis()
                : 0;
            return timeB - timeA;
          });

        setCalls(uniqueCalls as Call[]);
      } catch (error) {
        console.error('Error cargando llamados:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'No se pudieron cargar los llamados.',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCalls();
  }, [toast]);

  const handleDeleteCall = async () => {
    if (!callToDelete) return;

    setLoading(true);
    try {
      const q = query(
        collection(db, 'llamados'),
        where('fecha', '==', callToDelete.fecha),
        where('clave', '==', callToDelete.clave),
        where('maquina', '==', callToDelete.maquina),
        where('direccion', '==', callToDelete.direccion)
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        throw new Error('No se encontraron los registros del llamado para eliminar.');
      }

      const batch = writeBatch(db);
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();

      setCalls((prevCalls) => prevCalls.filter((call) => call.id !== callToDelete.id));
      toast({
        title: 'Llamado eliminado',
        description: 'El llamado y todos sus registros han sido eliminados.',
      });
    } catch (error: any) {
      console.error('Error eliminando el llamado:', error);
      toast({
        variant: 'destructive',
        title: 'Error al eliminar',
        description: error.message || 'No se pudo eliminar el llamado.',
      });
    } finally {
      handleCloseDialog();
      setLoading(false);
    }
  };

  const handleCloseDialog = () => {
    setCallToDelete(null);
    setDeleteConfirmationText('');
  };

  if (loading && calls.length === 0)
    return <p className="text-center mt-12">Cargando llamados...</p>;

  if (calls.length === 0 && !loading)
    return <p className="text-center mt-12">No hay llamados disponibles.</p>;

  return (
    <>
      <div className="min-h-screen bg-background p-6 flex flex-col items-center">
        <h1 className="text-2xl font-bold mb-6">Llamados disponibles</h1>

        <div className="w-full max-w-md space-y-4">
          {calls.map((call) => (
            <div key={call.id} className="flex items-center gap-2">
              <Button
                size="lg"
                className="w-full flex-grow justify-start px-4 py-3 h-auto text-left"
                onClick={() => {
                  router.push(
                    `/enroll?date=${call.fecha}&clave=${call.clave}&machine=${
                      call.maquina
                    }&address=${encodeURIComponent(call.direccion)}`
                  );
                }}
              >
                <div className="flex flex-col">
                  <span>
                    {call.fecha} · {call.clave} · {call.maquina}
                  </span>
                  <span className="text-sm text-muted-foreground">{call.direccion}</span>
                </div>
              </Button>
              <Button
                variant="destructive"
                size="lg"
                className="shrink-0 px-3"
                onClick={() => setCallToDelete(call)}
                disabled={loading}
              >
                <Trash2 className="h-5 w-5" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <AlertDialog open={!!callToDelete} onOpenChange={(open) => !open && handleCloseDialog()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás realmente seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción es irreversible y eliminará todos los registros del llamado. Para
              confirmar, escribe la palabra secreta en el campo de abajo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={deleteConfirmationText}
            onChange={(e) => setDeleteConfirmationText(e.target.value)}
            placeholder="Escribe la palabra secreta"
            className="mt-2"
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCloseDialog}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCall}
              disabled={deleteConfirmationText !== 'GL-AL407'}
              className="bg-destructive hover:bg-destructive/90"
            >
              Sí, eliminar llamado
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
