
'use client';
import { useSearchParams } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp, DocumentData, onSnapshot
} from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { db } from '@/lib/firebase';
import { useToast } from "@/hooks/use-toast";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Download, ListChecks, LogOut, GripVertical, Trash2 } from 'lucide-react';
import { cn, removeDiacritics } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";


type Volunteer = {
  id: string;
  llamadoId?: string;
  nombre: string;
  apellidos: string;
  rut: string;
  registro: string;
  ingreso: any;
  retirada?: any;
  cargo?: string;
  calidad?: string;
  eliminado?: boolean;
};

type Llamado = {
  id?: string;
  voluntarioId: string | null;
  nombreCompleto?: string;
  fecha: string;
  clave: string;
  maquina: string;
  direccion: string;
  ingreso: any;
  retirada?: any;
  eliminado?: boolean;
};

type AttendanceItem = Volunteer & {
    status: 'present' | 'retired';
    customDescription?: string;
};

const categoryTitles: Record<string, string> = {
    oficiales: 'Oficiales',
    comandancia: 'Comandancia',
    miembrosHonorarios: 'Miembros Honorarios de la Institución',
    voluntarios: 'Voluntarios y Voluntarias',
};

const SortableVolunteerItem = ({ children, id }: { children: React.ReactNode; id: string }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1 : 'auto',
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 group mb-1">
      <div className="flex-grow">
        {children}
      </div>
      <div 
        {...attributes} 
        {...listeners} 
        className="cursor-grab active:cursor-grabbing p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
      >
        <GripVertical className="h-5 w-5" />
      </div>
    </div>
  );
};

export default function EnrollPage() {
  const searchParams = useSearchParams();
  const autoInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const [isMounted, setIsMounted] = useState(false);
  const [list, setList] = useState<Volunteer[]>([]);
  const [fullListWithDeleted, setFullListWithDeleted] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoSearch, setAutoSearch] = useState('');
  const [isManualMode, setIsManualMode] = useState(false);
  const [manualSearch, setManualSearch] = useState('');
  const [manualSearchResults, setManualSearchResults] = useState<Volunteer[]>([]);
  const [selectedManualVolunteer, setSelectedManualVolunteer] = useState<Volunteer | null>(null);
  const [isAddUnlistedDialogOpen, setIsAddUnlistedDialogOpen] = useState(false);
  const [newVolunteerName, setNewVolunteerName] = useState('');
  const [popupOpen, setPopupOpen] = useState(false);
  const [llamadoExistente, setLlamadoExistente] = useState<Llamado | null>(null);
  const [volunteerToRetire, setVolunteerToRetire] = useState<Volunteer | null>(null);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [categorizedAttendance, setCategorizedAttendance] = useState<Record<string, AttendanceItem[]>>({});
  const [isAttendanceLoading, setIsAttendanceLoading] = useState(false);
  const [editingVolunteer, setEditingVolunteer] = useState<AttendanceItem | null>(null);
  const [customDescription, setCustomDescription] = useState('');

  const date = searchParams.get('date') || '';
  const clave = searchParams.get('clave') || '';
  const machine = searchParams.get('machine') || '';
  const address = searchParams.get('address') || '';

  useEffect(() => {
    setIsMounted(true);
    autoInputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!isMounted || !date || !clave || !machine || !address) {
      setList([]);
      setFullListWithDeleted([]);
      return;
    }

    const llamadosCol = collection(db, 'llamados');
    const q = query(
      llamadosCol,
      where('fecha', '==', date),
      where('clave', '==', clave),
      where('maquina', '==', machine),
      where('direccion', '==', address)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      try {
        if (snapshot.empty) {
          setList([]);
          setFullListWithDeleted([]);
          return;
        }

        const llamados = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Llamado));
        const volunteerIds = llamados.map(l => l.voluntarioId).filter((id): id is string => !!id);

        const volunteersData = new Map<string, DocumentData>();
        
        if (volunteerIds.length > 0) {
            const volunteersCol = collection(db, 'voluntarios');
            const volunteerIdChunks: string[][] = [];

            for (let i = 0; i < volunteerIds.length; i += 30) {
              volunteerIdChunks.push(volunteerIds.slice(i, i + 30));
            }

            await Promise.all(
              volunteerIdChunks.map(async (chunk) => {
                if (chunk.length > 0) {
                  const volunteersQuery = query(volunteersCol, where('__name__', 'in', chunk));
                  const volunteersSnapshot = await getDocs(volunteersQuery);
                  volunteersSnapshot.forEach((vDoc) => {
                    volunteersData.set(vDoc.id, vDoc.data());
                  });
                }
              })
            );
        }

        const loadedVolunteers = llamados
          .map((llamado) => {
            if (llamado.voluntarioId) {
                const volunteerData = volunteersData.get(llamado.voluntarioId);
                if (volunteerData) {
                  return {
                    id: llamado.voluntarioId,
                    llamadoId: llamado.id,
                    ...volunteerData,
                    ingreso: llamado.ingreso,
                    retirada: llamado.retirada || null,
                    eliminado: llamado.eliminado || false,
                  } as Volunteer;
                }
            }
             if (llamado.nombreCompleto) {
                const fullName = (llamado.nombreCompleto || '').trim();
                const nameParts = fullName.split(' ');
                const nombre = nameParts.pop() || '';
                const apellidos = nameParts.join(' ');
                
                return {
                    id: llamado.id!,
                    llamadoId: llamado.id,
                    nombre: nombre,
                    apellidos: apellidos,
                    rut: 'S/R',
                    registro: 'S/R', 
                    ingreso: llamado.ingreso,
                    retirada: llamado.retirada || null,
                    eliminado: llamado.eliminado || false,
                } as Volunteer;
            }
            return null;
          })
          .filter((v): v is Volunteer => v !== null);

        loadedVolunteers.sort((a, b) => (Number(a.registro) || Infinity) - (Number(b.registro) || Infinity));
        
        setFullListWithDeleted(loadedVolunteers);
        setList(loadedVolunteers.filter(v => !v.eliminado));
      } catch (error) {
        console.error('Error cargando voluntarios:', error);
      }
    });

    return () => unsubscribe();
  }, [isMounted, date, clave, machine, address]);

  useEffect(() => {
    if (isManualMode || autoSearch.trim().length < 3) return;

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const val = autoSearch.trim();
        const tarjetasCol = collection(db, 'tarjetas');
        let volunteerFound: Volunteer | null = null;

        const qByTarjeta = query(tarjetasCol, where('tarjeta', '==', val));
        const tarjetaSnap = await getDocs(qByTarjeta);

        if (!tarjetaSnap.empty) {
          const tarjetaData = tarjetaSnap.docs[0].data();
          if (tarjetaData.regNacional) {
            const volunteersCol = collection(db, 'voluntarios');
            const volQuery = query(volunteersCol, where('registro', '==', tarjetaData.regNacional.toString()));
            const volSnap = await getDocs(volQuery);
            if (!volSnap.empty) {
              const d = volSnap.docs[0];
              volunteerFound = { id: d.id, ...d.data() } as Volunteer;
            }
          }
        }

        if (volunteerFound) {
          await processFoundVolunteer(volunteerFound);
        } else {
          toast({ variant: "destructive", title: "Tarjeta no encontrada", description: `No se encontró voluntario asociado.` });
        }
      } catch (err: any) {
        console.error("Error en búsqueda automática:", err);
        toast({ variant: "destructive", title: "Error", description: err.message });
      } finally {
        setAutoSearch('');
        setLoading(false);
        autoInputRef.current?.focus();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [autoSearch, isManualMode, date, clave, machine, address, toast]);

  useEffect(() => {
    if (!isManualMode || manualSearch.trim().length < 3) {
        setManualSearchResults([]);
        setSelectedManualVolunteer(null);
        return;
    }

    const timer = setTimeout(async () => {
        setLoading(true);
        try {
            const val = removeDiacritics(manualSearch.trim().toLowerCase());
            const volunteersCol = collection(db, 'voluntarios');
            const volunteersSnapshot = await getDocs(volunteersCol);
            const allVolunteers = volunteersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Volunteer));

            const results = allVolunteers.filter(v => 
                removeDiacritics((v.nombre || '').toLowerCase()).includes(val) ||
                removeDiacritics((v.apellidos || '').toLowerCase()).includes(val) ||
                (v.registro || '').toLowerCase().includes(val)
            );
            
            setManualSearchResults(results);
            setSelectedManualVolunteer(null);
        } catch (err: any) {
            console.error("Error en búsqueda manual:", err);
            toast({ variant: "destructive", title: "Error", description: "No se pudo realizar la búsqueda." });
        } finally {
            setLoading(false);
        }
    }, 500);

    return () => clearTimeout(timer);
  }, [manualSearch, isManualMode, toast]);

  const processFoundVolunteer = async (volunteer: Volunteer) => {
    const llamadosCol = collection(db, 'llamados');
    const q = query(
      llamadosCol,
      where('voluntarioId', '==', volunteer.id),
      where('fecha', '==', date),
      where('clave', '==', clave),
      where('maquina', '==', machine),
      where('direccion', '==', address)
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      await addDoc(llamadosCol, {
        voluntarioId: volunteer.id,
        nombreCompleto: `${volunteer.apellidos || ''} ${volunteer.nombre || ''}`.trim(),
        fecha: date,
        clave,
        maquina: machine,
        direccion: address,
        ingreso: serverTimestamp(),
        retirada: null,
        eliminado: false,
      });
      toast({ title: "Voluntario agregado", description: `${volunteer.apellidos} ${volunteer.nombre} fue añadido.` });
    } else {
      const docData = snapshot.docs[0];
      setLlamadoExistente({ id: docData.id, ...docData.data() } as Llamado);
      setPopupOpen(true);
    }
  };
  
  const addVolunteerManually = async () => {
    if (!selectedManualVolunteer) return;
    await processFoundVolunteer(selectedManualVolunteer);
    setManualSearch('');
    setManualSearchResults([]);
    setSelectedManualVolunteer(null);
  };

  const handleAddUnlistedVolunteer = async () => {
    const name = newVolunteerName.trim();
    if (!name) return;
    setLoading(true);
    try {
        await addDoc(collection(db, 'llamados'), {
            nombreCompleto: name,
            voluntarioId: null,
            fecha: date,
            clave,
            maquina: machine,
            direccion: address,
            ingreso: serverTimestamp(),
            retirada: null,
            eliminado: false,
        });
        toast({ title: "Voluntario agregado", description: `${name} fue añadido.` });
    } catch (err: any) {
        toast({ variant: "destructive", title: "Error", description: err.message });
    } finally {
        setIsAddUnlistedDialogOpen(false);
        setNewVolunteerName('');
        setManualSearch('');
        setManualSearchResults([]);
        setLoading(false);
    }
  };

  const handleRetirada = (volunteer: Volunteer) => {
    if (!volunteer.llamadoId) return;
    setVolunteerToRetire(volunteer);
  };

  const handleEliminar = async (volunteer: Volunteer) => {
    if (!volunteer.llamadoId) return;
    try {
        const ref = doc(db, 'llamados', volunteer.llamadoId);
        await updateDoc(ref, { eliminado: true });
        toast({ title: "Registro eliminado", description: "El voluntario ha sido quitado de la lista." });
    } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar." });
    }
  };

  const confirmExecuteRetirada = async () => {
    if (!volunteerToRetire?.llamadoId) return;
    try {
        const ref = doc(db, 'llamados', volunteerToRetire.llamadoId);
        await updateDoc(ref, { retirada: serverTimestamp(), eliminado: false });
        toast({ title: "Retirada registrada." });
    } catch(err: any) {
        toast({ variant: "destructive", title: "Error", description: "No se pudo registrar la retirada." });
    } finally {
        setVolunteerToRetire(null);
    }
  };

  const handleExistingVolunteerAction = async () => {
    if (!llamadoExistente || !llamadoExistente.id) return;
    try {
        const ref = doc(db, 'llamados', llamadoExistente.id);
        if (llamadoExistente.eliminado) {
            await updateDoc(ref, { eliminado: false, retirada: null, ingreso: serverTimestamp() });
            toast({ title: "Voluntario reingresado" });
        } else if (!llamadoExistente.retirada) {
            await updateDoc(ref, { retirada: serverTimestamp(), eliminado: false });
            toast({ title: "Retirada registrada." });
        } else {
            await updateDoc(ref, { eliminado: true });
            toast({ title: "Registro eliminado" });
        }
    } catch (err: any) {
        console.error("Error al gestionar acción:", err);
    } finally {
        setPopupOpen(false);
        setLlamadoExistente(null);
    }
  };

  const handleDownloadELector = () => {
    const exportList = list.filter(v => !v.eliminado);
    if (exportList.length === 0) return;
    const dataToExport = exportList.filter(v => v.registro !== 'S/R').map(v => ({ id: v.registro, apellido: v.apellidos, nombre: v.nombre }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    XLSX.utils.sheet_add_aoa(worksheet, [["id", "apellido", "nombre"]], { origin: "A1" });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Voluntarios");
    XLSX.writeFile(workbook, "lista_elector.xlsx");
  };

  const handleDownloadCallInfo = async () => { 
    if (fullListWithDeleted.length === 0) return;
    const dataToExport = fullListWithDeleted.map(v => {
        let estado = "PRESENTE";
        if (v.eliminado) estado = "ELIMINADO";
        else if (v.retirada) estado = "RETIRADA";
        return {
            "N° Registro": v.registro,
            "Apellidos y Nombres": `${v.apellidos || ''} ${v.nombre || ''}`.trim(),
            "Estado": estado,
            "Ingreso": (v.ingreso && typeof v.ingreso.toDate === 'function') ? v.ingreso.toDate().toLocaleString('es-CL') : 'N/A',
            "Retirada": (v.retirada && typeof v.retirada.toDate === 'function') ? v.retirada.toDate().toLocaleString('es-CL') : 'N/A'
        };
    });
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Asistencia Completa");
    XLSX.writeFile(workbook, `llamado_${date}_${clave}.xlsx`);
  };

  const handleShowAttendance = async () => {
    setIsAttendanceModalOpen(true);
    setIsAttendanceLoading(true);
    try {
        const attendedVolunteers: AttendanceItem[] = list.map(v => ({ ...v, status: v.retirada ? 'retired' : 'present' }));
        const oficiales: AttendanceItem[] = [], comandancia: AttendanceItem[] = [], miembrosHonorarios: AttendanceItem[] = [], voluntarios: AttendanceItem[] = [];
        const oficialesCargos = ['Director', 'Capitan', 'Capitán', 'Secretario', 'Tesorero', 'Intendente'];
        
        attendedVolunteers.forEach(v => {
            const cargo = (v.cargo || '').trim(), calidad = (v.calidad || '').trim();
            if (oficialesCargos.includes(cargo) || cargo.startsWith('Teniente') || /Ayudante (1|2|3|1°|2°|3°)/i.test(cargo)) oficiales.push(v);
            else if (cargo.startsWith('Insp.') || cargo.startsWith('Ayte.')) comandancia.push(v);
            else if (calidad.toLowerCase().includes('miembro honorario')) miembrosHonorarios.push(v);
            else voluntarios.push(v);
        });
        
        const oficialesOrder = ['Director', 'Capitan', 'Capitán', 'Teniente', 'Ayudante', 'Secretario', 'Tesorero', 'Intendente'];
        oficiales.sort((a, b) => {
            const cargoA = (a.cargo || '').trim(), cargoB = (b.cargo || '').trim();
            const getBase = (c: string) => c.startsWith('Teniente') ? 'Teniente' : (/Ayudante (1|2|3|1°|2°|3°)/i.test(c) ? 'Ayudante' : c);
            const idxA = oficialesOrder.indexOf(getBase(cargoA)), idxB = oficialesOrder.indexOf(getBase(cargoB));
            return idxA !== idxB ? idxA - idxB : cargoA.localeCompare(cargoB);
        });
        miembrosHonorarios.sort((a, b) => (Number(a.registro) || 0) - (Number(b.registro) || 0));
        voluntarios.sort((a, b) => `${a.apellidos} ${a.nombre}`.localeCompare(`${b.apellidos} ${b.nombre}`));
        setCategorizedAttendance({ oficiales, comandancia, miembrosHonorarios, voluntarios });
    } finally {
        setIsAttendanceLoading(false);
    }
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setCategorizedAttendance((prev) => {
      let activeCat, overCat, activeIdx = -1, overIdx = -1;
      for (const cat in prev) {
        const aIdx = prev[cat].findIndex((v: any) => v.id === active.id);
        if (aIdx !== -1) { activeCat = cat; activeIdx = aIdx; }
        const oIdx = prev[cat].findIndex((v: any) => v.id === over.id);
        if (oIdx !== -1) { overCat = cat; overIdx = oIdx; }
      }
      if (!activeCat || !overCat) return prev;
      const next = JSON.parse(JSON.stringify(prev));
      let item;
      if (activeCat === overCat) {
        next[activeCat] = arrayMove(next[activeCat], activeIdx, overIdx);
        item = next[activeCat][overIdx];
      } else {
        [item] = next[activeCat].splice(activeIdx, 1);
        next[overCat].splice(overIdx, 0, item);
      }
      setEditingVolunteer(item);
      setCustomDescription(item.customDescription || '');
      return next;
    });
  };

  const handleSaveDescription = () => {
    if (!editingVolunteer) return;
    const next = { ...categorizedAttendance };
    for (const cat in next) {
        const idx = next[cat].findIndex(v => v.id === editingVolunteer.id);
        if (idx !== -1) { next[cat][idx].customDescription = customDescription; break; }
    }
    setCategorizedAttendance(next);
    setEditingVolunteer(null);
  };

  const presentCount = list.filter(v => !v.retirada).length;
  const retiredCount = list.length - presentCount;

  if (!isMounted) return null;

  return (
    <div className="min-h-screen bg-background p-6 flex flex-col items-center">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-xl font-bold">Lista {date} · {clave} · {machine}</h1>
          <p className="text-sm text-muted-foreground">{address}</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Enrolar por Tarjeta (Automático)</label>
          <Input ref={autoInputRef} placeholder="Escanear Tarjeta..." value={autoSearch} onChange={(e) => setAutoSearch(e.target.value)} disabled={loading || isManualMode} />
        </div>

        <Button variant="outline" size="sm" className="w-full text-muted-foreground" onClick={() => { setIsManualMode(!isManualMode); if (!isManualMode) { setAutoSearch(''); setTimeout(() => autoInputRef.current?.focus(), 100); } }}>
            {isManualMode ? 'Ocultar Ingreso Manual' : 'Ingresar Manualmente'}
        </Button>
        
        {isManualMode && (
            <div className="border rounded-lg p-4 bg-card space-y-4 shadow-sm">
                <Input placeholder="Nombre, Apellido o N° Registro" value={manualSearch} onChange={(e) => setManualSearch(e.target.value)} />
                {manualSearchResults.length > 0 && (
                  <ScrollArea className="h-40 border rounded-md p-2">
                    {manualSearchResults.map(vol => (
                      <button key={vol.id} onClick={() => setSelectedManualVolunteer(vol)} className={cn("w-full text-left p-2 rounded-md text-sm hover:bg-accent", selectedManualVolunteer?.id === vol.id && "bg-accent font-semibold")}>
                        {vol.apellidos} {vol.nombre} (Reg: {vol.registro})
                      </button>
                    ))}
                  </ScrollArea>
                )}
                {manualSearchResults.length === 0 && manualSearch.length >= 3 && !loading && (
                    <Button variant="link" onClick={() => { setNewVolunteerName(manualSearch); setIsAddUnlistedDialogOpen(true); }}>Agregar como no listado</Button>
                )}
                <Button className="w-full" onClick={addVolunteerManually} disabled={!selectedManualVolunteer}>Agregar a la lista</Button>
            </div>
        )}

        <div className="space-y-2 pt-4">
          <h2 className="font-semibold border-b pb-1 flex justify-between items-center text-sm">
            <span>Enrolados</span>
            <span className="text-xs font-normal bg-muted px-2 py-0.5 rounded-md">{presentCount} presentes, {retiredCount} retirados</span>
          </h2>
          <ScrollArea className="h-[40vh]">
            <div className="pr-4 space-y-2">
            {list.map((v) => (
              <div key={v.id} className={cn("flex justify-between items-center p-2 border rounded text-sm transition-colors", v.retirada && "bg-muted text-muted-foreground")}>
                <span className={cn(v.retirada && "line-through")}>{v.registro} - {v.apellidos} {v.nombre}</span>
                {!v.retirada ? (
                  <Button variant="ghost" size="sm" className="h-8 px-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50" onClick={() => handleRetirada(v)}>
                    <LogOut className="mr-1 h-3 w-3"/>
                    Retirada
                  </Button>
                ) : (
                  <Button variant="ghost" size="sm" className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleEliminar(v)}>
                    <Trash2 className="mr-1 h-3 w-3"/>
                    Eliminar
                  </Button>
                )}
              </div>
            ))}
            </div>
          </ScrollArea>
        </div>
        
        <div className="flex flex-col gap-2 pt-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="secondary" className="w-full"><Download className="mr-2 h-4 w-4" /> Descargar Excel</Button></DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuItem onClick={handleDownloadCallInfo}>Info Llamado</DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownloadELector}>E-Lector</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="secondary" className="w-full" onClick={handleShowAttendance}><ListChecks className="mr-2 h-4 w-4" /> Pasar Lista</Button>
        </div>
        
        <Link href="/" className={cn(buttonVariants({ variant: "ghost" }), "w-full flex items-center justify-center gap-2")}>
          <ArrowLeft className="h-4 w-4" /> Volver al Inicio
        </Link>
      </div>

      <Dialog open={isAddUnlistedDialogOpen} onOpenChange={setIsAddUnlistedDialogOpen}>
        <DialogContent>
            <DialogHeader><DialogTitle>Agregar no listado</DialogTitle></DialogHeader>
            <Input value={newVolunteerName} onChange={(e) => setNewVolunteerName(e.target.value)} placeholder="Apellidos Nombres" className="mt-4"/>
            <DialogFooter>
                <Button variant="ghost" onClick={() => setIsAddUnlistedDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleAddUnlistedVolunteer}>Agregar</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={popupOpen} onOpenChange={setPopupOpen}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Gestión de Voluntario</AlertDialogTitle>
                  <AlertDialogDescription>
                      {llamadoExistente?.nombreCompleto} ya está en el registro.
                      {llamadoExistente?.eliminado ? ' Está eliminado. ¿Reingresar?' : llamadoExistente?.retirada ? ' Ya tiene retirada. ¿Eliminarlo?' : ' ¿Marcar retirada?'}
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setPopupOpen(false)}>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleExistingVolunteerAction}>
                    {llamadoExistente?.eliminado ? 'Reingresar' : llamadoExistente?.retirada ? 'Eliminar' : 'Confirmar'}
                  </AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!volunteerToRetire} onOpenChange={(open) => !open && setVolunteerToRetire(null)}>
        <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>¿Confirmar retirada?</AlertDialogTitle></AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={confirmExecuteRetirada} className="bg-destructive hover:bg-destructive/90">Confirmar</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isAttendanceModalOpen} onOpenChange={setIsAttendanceModalOpen}>
        <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Lista de Asistencia</DialogTitle></DialogHeader>
            <ScrollArea className="h-[60vh] pr-4">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <div className="mb-4 text-center">
                        <h3 className="font-bold text-xs uppercase text-muted-foreground">Mártires de la Compañía</h3>
                        <p className="mt-2 font-semibold text-sm">EMILE GRUNENWALD LEHMANN<br/>ALEJANDRO ACOSTA LILLO</p>
                    </div>
                    <Separator className="my-4" />
                    <div className="space-y-6">
                        {Object.entries(categorizedAttendance).map(([category, volunteers]) => (
                            volunteers.length > 0 && (
                                <div key={category}>
                                    <h4 className="font-bold text-sm mb-2 border-b pb-1 text-slate-700">{categoryTitles[category]}</h4>
                                    <SortableContext items={volunteers.map(v => v.id)} strategy={verticalListSortingStrategy}>
                                      <div className="space-y-1">
                                        {volunteers.map((v) => (
                                          <SortableVolunteerItem key={v.id} id={v.id}>
                                            <div className={cn("p-1.5 text-xs rounded-md border flex justify-between items-center bg-white", v.status === 'retired' && "text-red-800 line-through bg-red-50")}>
                                              <div className="flex-grow">
                                                  { v.customDescription && <span className="font-bold text-sky-700 mr-2">[{v.customDescription}]</span> }
                                                  { (category === 'oficiales' || category === 'comandancia') && v.cargo ? (
                                                    <><span className="font-semibold text-slate-700 mr-2">{v.cargo}</span><span>{v.apellidos} {v.nombre}</span></>
                                                  ) : (
                                                    <><span className="mr-2">{v.apellidos} {v.nombre}</span><span className="text-muted-foreground">({v.cargo || v.calidad || 'Voluntario'})</span></>
                                                  )}
                                              </div>
                                            </div>
                                          </SortableVolunteerItem>
                                        ))}
                                      </div>
                                    </SortableContext>
                                </div>
                            )
                        ))}
                    </div>
                </DndContext>
            </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingVolunteer} onOpenChange={(open) => !open && setEditingVolunteer(null)}>
        <DialogContent>
            <DialogHeader><DialogTitle>Agregar Descripción</DialogTitle></DialogHeader>
            <Input value={customDescription} onChange={(e) => setCustomDescription(e.target.value)} placeholder="Ej: A cargo de material mayor" className="mt-4"/>
            <DialogFooter>
                <Button variant="ghost" onClick={() => setEditingVolunteer(null)}>Cancelar</Button>
                <Button onClick={handleSaveDescription}>Guardar</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
