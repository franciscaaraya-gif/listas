'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { collection, query, where, getDocs, doc, setDoc, updateDoc, addDoc, deleteDoc , serverTimestamp} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, CreditCard, ArrowLeft, Upload, FileText } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { removeDiacritics } from '@/lib/utils';

const initialFormState = {
  id: '',
  nombre: '',
  apellidos: '',
  rut: '',
  registro: '',
  tarjeta: '',
  regNacional: '',
  compania: '',
  grupoSangre: '',
  donante: '',
  cargo: '',
  calidad: '',
  retirado: false,
};


export default function VoluntariosPage() {
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);
  const [originalTarjeta, setOriginalTarjeta] = useState(''); // Para saber si cambió
  const [form, setForm] = useState(initialFormState);
  const [fileToImport, setFileToImport] = useState<File | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  useEffect(() => {
      if (search.trim().length < 3) {
        setForm(initialFormState);
        return;
      };
    
      const timer = setTimeout(async () => {
        setLoading(true);
        try {
          const val = search.trim();
          const volRef = collection(db, 'voluntarios');
          const tarRef = collection(db, 'tarjetas');
          
          const esFormatoRut = /^[0-9.]+\-[0-9kK]{1}$/.test(val);
          
          let volData: any = null;
          let tarjetaEncontrada = '';
    
          if (esFormatoRut) {
            const qRut = query(volRef, where('rut', '==', val));
            const snapRut = await getDocs(qRut);
            if (!snapRut.empty) volData = { id: snapRut.docs[0].id, ...snapRut.docs[0].data() };
          } else {
            const [snapReg, snapTar] = await Promise.all([
              getDocs(query(volRef, where('registro', '==', val))),
              getDocs(query(tarRef, where('tarjeta', '==', val)))
            ]);
    
            if (!snapReg.empty) {
              volData = { id: snapReg.docs[0].id, ...snapReg.docs[0].data() };
            } else if (!snapTar.empty) {
              const tData = snapTar.docs[0].data();
              tarjetaEncontrada = tData.tarjeta;
              const qV = query(volRef, where('registro', '==', tData.regNacional.toString()));
              const sV = await getDocs(qV);
              if (!sV.empty) volData = { id: sV.docs[0].id, ...sV.docs[0].data() };
            }
          }
    
          if (!volData && !esFormatoRut) {
            const normalizedSearch = removeDiacritics(val.toLowerCase());
            const allVolunteersSnapshot = await getDocs(volRef);
            const nameMatch = allVolunteersSnapshot.docs
                .map(doc => ({ id: doc.id, ...(doc.data() as { nombre?: string, apellidos?: string }) }))
                .find(v =>
                    removeDiacritics((v.nombre || '').toLowerCase()).includes(normalizedSearch) ||
                    removeDiacritics((v.apellidos || '').toLowerCase()).includes(normalizedSearch)
                );
            
            if (nameMatch) {
                volData = nameMatch;
            }
          }

          if (volData) {
            if (!tarjetaEncontrada && volData.registro) {
              const qT = query(tarRef, where('regNacional', '==', volData.registro));
              const sT = await getDocs(qT);
              if (!sT.empty) tarjetaEncontrada = sT.docs[0].data().tarjeta;
            }
            setForm({ ...initialFormState, ...volData, tarjeta: tarjetaEncontrada });
            setOriginalTarjeta(tarjetaEncontrada);
          } else {
            setForm({ 
              ...initialFormState,
              rut: esFormatoRut ? val : '', 
              registro: !esFormatoRut && !isNaN(parseInt(val)) ? val : '', 
            });
            setOriginalTarjeta('');
          }
        } catch (error) {
          console.error("Error en búsqueda:", error);
          toast({ variant: "destructive", title: "Error en Búsqueda", description: "No se pudieron obtener los datos." });
        } finally {
          setLoading(false);
        }
      }, 600);
    
      return () => clearTimeout(timer);
  }, [search, toast]);

 const handleSave = async () => {
    try {
      if (!form.nombre || !form.registro) {
        toast({ variant: "destructive", title: "Campos requeridos", description: "Nombre y Registro son obligatorios." });
        return;
      }
  
      const ahora = serverTimestamp();
      let volId = form.id;
  
      const { id, tarjeta, ...volDataToSave } = form;

      const volData = {
        ...volDataToSave,
        nombre: form.nombre.trim(),
        apellidos: form.apellidos.trim(),
        rut: form.rut.trim(),
        registro: form.registro.trim(),
        actualizadoEn: ahora
      };
  
      if (volId) {
        await updateDoc(doc(db, 'voluntarios', volId), volData);
      } else {
        const newVol = await addDoc(collection(db, 'voluntarios'), {
          ...volData,
          creadaEn: ahora
        });
        volId = newVol.id;
      }
  
      const tarjetaLimpia = form.tarjeta.trim();
      const tarRef = collection(db, 'tarjetas');
  
      if (tarjetaLimpia !== originalTarjeta) {
        if (originalTarjeta) {
          const qOld = query(tarRef, where('tarjeta', '==', originalTarjeta));
          const sOld = await getDocs(qOld);
          const deletePromises = sOld.docs.map(d => deleteDoc(d.ref));
          await Promise.all(deletePromises);
        }
  
        if (tarjetaLimpia) {
          const qNew = query(tarRef, where('tarjeta', '==', tarjetaLimpia));
          const sNew = await getDocs(qNew);
          
          if (sNew.empty) {
            await addDoc(tarRef, {
              tarjeta: tarjetaLimpia,
              regNacional: form.registro.trim(),
              creadaEn: ahora,
            });
          } else {
            const docId = sNew.docs[0].id;
            await updateDoc(doc(db, 'tarjetas', docId), {
              regNacional: form.registro.trim(),
              actualizadoEn: ahora,
            });
          }
        }
      }
      
      toast({ title: "¡Éxito!", description: "Ficha del voluntario guardada correctamente." });
      setSearch('');
      setForm(initialFormState);
      setOriginalTarjeta('');
    } catch (error) {
      console.error("Error al guardar:", error);
      toast({ variant: "destructive", title: "Error al Guardar", description: "Ocurrió un error al guardar los datos." });
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setFileToImport(file || null);
  };

  const handleConfirmImport = () => {
    if (!fileToImport) return;

    setImportLoading(true);
    setImportProgress(0);
    setTotalRecords(0);

    const reader = new FileReader();
    reader.onload = async (e) => {
        const data = e.target?.result;
        if (!data) {
            setImportLoading(false);
            toast({ variant: "destructive", title: "Error de Lectura", description: "No se pudo leer el archivo." });
            return;
        };

        try {
            const workbook = XLSX.read(data, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json: any[] = XLSX.utils.sheet_to_json(worksheet);

            const volRef = collection(db, 'voluntarios');
            setTotalRecords(json.length);
            
            for (let i = 0; i < json.length; i++) {
                const v = json[i];
                const registro = v['Registro']?.toString().trim() || '';
                if (!registro) {
                  setImportProgress(i + 1);
                  continue;
                };

                const nombreCompleto = `${v['Nombre'] || ''} ${v['Segundo Nombre'] || ''}`.trim();
                const apellidosCompleto = `${v['Primer Apellido'] || ''} ${v['Segundo Apellido'] || ''}`.trim();
                const rutCompleto = v['Rut'] && v['Digito'] ? `${v['Rut']}-${v['Digito']}` : (v['Rut'] || '');

                const vToImport = {
                    nombre: nombreCompleto,
                    apellidos: apellidosCompleto,
                    rut: rutCompleto.toString().trim(),
                    registro: registro,
                    regNacional: registro,
                    compania: v['Cía.']?.toString().trim() || '',
                    grupoSangre: v['Sangre Grupo']?.toString().trim() || '',
                    donante: v['Donante']?.toString().trim() || '',
                    cargo: v['Cargo']?.toString().trim() || '',
                    calidad: v['Calidad']?.toString().trim() || '',
                    retirado: v['Calidad']?.toString().toLowerCase().trim() === 'retirado',
                };
                
                const q = query(volRef, where('registro', '==', vToImport.registro));
                const querySnapshot = await getDocs(q);

                const dataToSave = { ...vToImport, actualizadoEn: serverTimestamp() };

                if (querySnapshot.empty) {
                    await addDoc(volRef, { ...dataToSave, creadaEn: serverTimestamp() });
                } else {
                    const docId = querySnapshot.docs[0].id;
                    await updateDoc(doc(db, 'voluntarios', docId), dataToSave);
                }
                setImportProgress(i + 1);
            }
            toast({ title: "Importación Completa", description: `Se procesaron ${json.length} registros.` });
        } catch (error) {
            console.error("Error al importar archivo:", error);
            toast({ variant: "destructive", title: "Error en Importación", description: "Ocurrió un error. Revise la consola." });
        } finally {
            setImportLoading(false);
            setFileToImport(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
            setImportProgress(0);
            setTotalRecords(0);
        }
    };
    reader.readAsBinaryString(fileToImport);
  };


  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Card className="shadow-lg">
        <CardHeader className="bg-slate-50 border-b">
          <CardTitle className="flex items-center gap-2 text-slate-800">
            <CreditCard className="h-6 w-6 text-red-600" /> Ficha del Voluntario
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-500 uppercase">Buscador (RUT, Reg, Tarjeta, Nombre)</label>
            <div className="relative">
               <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
               <Input 
                ref={searchInputRef}
                className="pl-10 h-12 text-lg border-2 focus:border-red-500"
                placeholder="Escanee o escriba..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold">Nombres</label>
              <Input value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold">Apellidos</label>
              <Input value={form.apellidos} onChange={e => setForm({...form, apellidos: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold">RUT</label>
              <Input value={form.rut} onChange={e => setForm({...form, rut: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold">N° Registro</label>
              <Input value={form.registro} onChange={e => setForm({...form, registro: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold">Cargo</label>
              <Input value={form.cargo} onChange={e => setForm({...form, cargo: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold">Calidad</label>
              <Input value={form.calidad} onChange={e => setForm({...form, calidad: e.target.value})} />
            </div>
          </div>

          <div className="p-4 bg-red-50 border-red-100 border rounded-lg space-y-2">
            <label className="text-xs font-bold text-red-700 flex items-center gap-1">
              <CreditCard className="h-3 w-3" /> UID Tarjeta Física
            </label>
            <Input 
              className="bg-white border-red-200"
              placeholder="ID de tarjeta (NFC)"
              value={form.tarjeta} 
              onChange={e => setForm({...form, tarjeta: e.target.value})} 
            />
            <p className="text-[10px] text-red-500 italic">Si el ID cambia, se actualizará el vínculo automáticamente al guardar.</p>
          </div>

          <Button className="w-full h-14 text-lg bg-red-600 hover:bg-red-700" onClick={handleSave} disabled={loading || importLoading}>
            {loading ? 'Guardando...' : (form.id ? 'Actualizar Ficha' : 'Registrar Nuevo Voluntario')}
          </Button>
        </CardContent>
      </Card>
      
      <div className="mt-6">
        <Card className="shadow-lg">
            <CardHeader className="bg-slate-50 border-b">
              <CardTitle className="flex items-center gap-2 text-slate-800">
                <Upload className="h-6 w-6 text-red-600" /> Carga Masiva desde Excel
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
                <p className="text-sm text-muted-foreground">
                    Seleccione un archivo para importar/actualizar. La carga se iniciará al presionar el botón de confirmación. Si un voluntario (por "Registro") ya existe, se actualizará; de lo contrario, se creará.
                </p>
                <Input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleFileSelect}
                    disabled={importLoading}
                    className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
                />
                {fileToImport && (
                  <div className="p-2 bg-slate-100 rounded-md text-sm text-slate-600 flex items-center gap-2">
                    <FileText className="h-4 w-4 shrink-0" />
                    <span className="truncate">Archivo seleccionado: <strong>{fileToImport.name}</strong></span>
                  </div>
                )}
                <Button 
                  className="w-full"
                  onClick={handleConfirmImport}
                  disabled={!fileToImport || importLoading}
                >
                  {importLoading ? `Procesando... (${importProgress}/${totalRecords})` : 'Confirmar Carga Masiva'}
                </Button>

                {importLoading && (
                  <div className="space-y-2 pt-2">
                    <Progress value={totalRecords > 0 ? (importProgress / totalRecords) * 100 : 0} className="w-full" />
                    <p className="text-sm text-muted-foreground text-center">
                      Importando {importProgress} de {totalRecords} registros...
                    </p>
                  </div>
                )}
            </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Button asChild variant="ghost" className="w-full">
            <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver al Inicio
            </Link>
        </Button>
      </div>
    </div>
  );
}
