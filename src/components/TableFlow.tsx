import React, { useState, useEffect, useRef } from "react";
import { collection, query, onSnapshot, doc, updateDoc, setDoc, getDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useLanguage } from "../context/LanguageContext";
import { Table as TableIcon, Users, Edit, Maximize2, Trash2, Plus, Check, MapPin, Briefcase, Grid, AlertCircle, HelpCircle } from "lucide-react";
import { format } from "date-fns";
import { es, pl } from "date-fns/locale";
import { cn } from "../lib/utils";
import { computeDayTableSuggestion, TableSuggestion } from "../lib/reservationUtils";

const SLOT_CAPACITY = 20;
const FULL_SINGLE_THRESHOLD = 10;

interface TableDef {
  id: string;
  name: string;
  seats: number;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  shape: "round" | "square" | "counter";
}

interface Reservation {
  id: string;
  name: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  guests: number;
  status: "confirmed" | "cancelled" | "pending";
  tableId?: string;
  tableName?: string;
}

// Initial default high-end restaurant layout
const DEFAULT_TABLES: TableDef[] = [
  { id: "table_1", name: "Mesa Sombra (A)", seats: 2, x: 20, y: 25, shape: "round" },
  { id: "table_2", name: "Mesa Luz (B)", seats: 2, x: 20, y: 65, shape: "round" },
  { id: "table_3", name: "Imperial Wagyu", seats: 4, x: 50, y: 45, shape: "square" },
  { id: "table_4", name: "Bar Omakase 1", seats: 2, x: 80, y: 20, shape: "counter" },
  { id: "table_5", name: "Bar Omakase 2", seats: 2, x: 80, y: 50, shape: "counter" },
  { id: "table_6", name: "Mesa Exclusiva", seats: 2, x: 50, y: 80, shape: "square" },
];

export default function TableFlow({ 
  reservations, 
  selectedDate, 
  onUpdateReservation 
}: { 
  reservations: Reservation[]; 
  selectedDate: string;
  onUpdateReservation: (id: string, updates: Partial<Reservation>) => Promise<void>;
}) {
  const { lang, t } = useLanguage();
  const [tables, setTables] = useState<TableDef[]>([]);
  const [activeTimeSlot, setActiveTimeSlot] = useState<string>("19:00");
  const [selectedTable, setSelectedTable] = useState<TableDef | null>(null);
  const [selectedResToAssign, setSelectedResToAssign] = useState<Reservation | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dayLayoutStatus, setDayLayoutStatus] = useState<'loading' | 'saved' | 'none'>('loading');
  const [suggestion, setSuggestion] = useState<TableSuggestion | null>(null);
  
  // Drag and drop state
  const canvasRef = useRef<HTMLDivElement>(null);
  const [draggedTableId, setDraggedTableId] = useState<string | null>(null);

  // Available times (matching ReservationForm TIME_SLOTS)
  // Generate half-hour slots from 08:00 to 22:00
  const TIME_SLOTS: string[] = [];
  for (let h = 8; h <= 22; h++) {
    const hh = String(h).padStart(2, '0');
    TIME_SLOTS.push(`${hh}:00`);
    if (h !== 22) TIME_SLOTS.push(`${hh}:30`);
  }

  // Load per-day table layout from Firestore; fallback to global layout
  useEffect(() => {
    let cancelled = false;

    const loadLayout = async () => {
      setDayLayoutStatus('loading');
      setSelectedTable(null);
      setSelectedResToAssign(null);
      setSuggestion(null);

      // 1. Try day-specific layout
      const dayRef = doc(db, "day_layouts", selectedDate);
      const daySnap = await getDoc(dayRef);
      if (cancelled) return;

      if (daySnap.exists()) {
        const data = daySnap.data();
        if (data && Array.isArray(data.tables)) {
          setTables(data.tables);
          setDayLayoutStatus('saved');
          return;
        }
      }

      // 2. Fallback: global layout
      const globalRef = doc(db, "settings", "restaurant_layout");
      const globalSnap = await getDoc(globalRef);
      if (cancelled) return;

      if (globalSnap.exists()) {
        const data = globalSnap.data();
        if (data && Array.isArray(data.tables)) {
          setTables(data.tables);
        } else {
          setTables(DEFAULT_TABLES);
        }
      } else {
        setTables(DEFAULT_TABLES);
      }

      setDayLayoutStatus('none');
    };

    loadLayout();
    return () => { cancelled = true; };
  }, [selectedDate]);

  // When day has no saved layout, compute a suggestion from confirmed reservations
  useEffect(() => {
    if (dayLayoutStatus !== 'none') {
      setSuggestion(null);
      return;
    }

    const dateRes = reservations.filter(r => r.date === selectedDate);
    const sugg = computeDayTableSuggestion(
      dateRes.map(r => ({ guests: r.guests, time: r.time, status: r.status })),
      DEFAULT_TABLES
    );
    setSuggestion(sugg);
  }, [reservations, selectedDate, dayLayoutStatus]);

  // Filter reservations for the active date and active slot
  const currentReservations = reservations.filter(
    (r) => r.date === selectedDate && r.time === activeTimeSlot && r.status === "confirmed"
  );

  // Unassigned bookings for the selected slot and date
  const unassignedBookings = currentReservations.filter((r) => !r.tableId);

  // Find booking assigned to a specific table
  const getBookingForTable = (tableId: string) => {
    return currentReservations.find((r) => r.tableId === tableId);
  };

  // Assign reservation to table
  const assignTable = async (resId: string, table: TableDef) => {
    try {
      setLoading(true);
      
      // Detect if there's an existing assignment on this table at the same hour
      const existingOnTable = getBookingForTable(table.id);
      if (existingOnTable) {
        // Clear previous table assignment
        await onUpdateReservation(existingOnTable.id, { tableId: "", tableName: "" });
      }

      await onUpdateReservation(resId, {
        tableId: table.id,
        tableName: table.name,
      });

      setSelectedResToAssign(null);
    } catch (err) {
      console.error("Failed to assign table:", err);
    } finally {
      setLoading(false);
    }
  };

  // Remove booking from table
  const unassignTable = async (resId: string) => {
    try {
      setLoading(true);
      await onUpdateReservation(resId, {
        tableId: "",
        tableName: "",
      });
    } catch (err) {
      console.error("Failed to unassign:", err);
    } finally {
      setLoading(false);
    }
  };

  // Save per-day table configuration to Firestore
  const saveDayLayout = async (newTables: TableDef[]) => {
    try {
      const dayRef = doc(db, "day_layouts", selectedDate);
      await setDoc(dayRef, { tables: newTables });
      setDayLayoutStatus('saved');
      setSuggestion(null);
    } catch (err) {
      console.error("Failed to save layout:", err);
    }
  };

  // Accept auto-suggestion for the current day
  const handleApplySuggestion = async () => {
    if (!suggestion) return;
    setTables(suggestion.tables);
    await saveDayLayout(suggestion.tables);
  };

  // Delete day-specific layout and revert to auto-suggestion
  const handleResetLayout = async () => {
    try {
      const dayRef = doc(db, "day_layouts", selectedDate);
      await deleteDoc(dayRef);
      setDayLayoutStatus('none');
    } catch (err) {
      console.error("Failed to reset layout:", err);
    }
  };

  const handleAddTable = () => {
    const id = `table_${Date.now()}`;
    const newTable: TableDef = {
      id,
      name: `${lang === "es" ? "Nueva Mesa" : "Nowy Stolik"} ${tables.length + 1}`,
      seats: 2,
      x: 50,
      y: 50,
      shape: "square"
    };
    const updated = [...tables, newTable];
    setTables(updated);
    saveDayLayout(updated);
    setSelectedTable(newTable);
  };

  const handleDeleteTable = (id: string) => {
    const updated = tables.filter(t => t.id !== id);
    setTables(updated);
    saveDayLayout(updated);
    if (selectedTable?.id === id) setSelectedTable(null);
  };

  const handleUpdateTableProp = (id: string, field: keyof TableDef, val: any) => {
    const updated = tables.map(t => {
      if (t.id === id) {
        return { ...t, [field]: val };
      }
      return t;
    });
    setTables(updated);
    saveDayLayout(updated);
    if (selectedTable?.id === id) {
      setSelectedTable({ ...selectedTable, [field]: val });
    }
  };

  // Dragging event handlers
  const handleDragStart = (id: string) => {
    if (!isEditMode) return;
    setDraggedTableId(id);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!draggedTableId || !canvasRef.current || !isEditMode) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    // Constrain percentages to margins (5% to 95%)
    const clampedX = Math.max(5, Math.min(95, Math.round(x)));
    const clampedY = Math.max(5, Math.min(95, Math.round(y)));

    setTables(prev => prev.map(t => {
      if (t.id === draggedTableId) {
        return { ...t, x: clampedX, y: clampedY };
      }
      return t;
    }));
  };

  const handleDragEnd = () => {
    if (draggedTableId) {
      saveDayLayout(tables);
      setDraggedTableId(null);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-10 border border-border bg-stone-950 p-4 sm:p-8 md:p-10" id="tableflow-dashboard-component">
      
      {/* Header section with instructions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 border-b border-border pb-6 sm:pb-8">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-gold">
            <span className="w-1.5 h-1.5 rounded-full bg-gold" />
            <h3 className="text-xl font-serif font-light tracking-wide uppercase italic">TableFlow Setup</h3>
          </div>
          <p className="text-stone-500 text-xs max-w-2xl leading-relaxed">
            {lang === "es" 
              ? "Diseñe la disposición física de su restaurante y asigne reservas activas a cada mesa en tiempo real. Utilice el modo edición para reposicionar las mesas arrastrándolas."
              : "Projektuj fizyczny układ restauracji i przypisuj aktywne rezerwacje do konkretnych stolików. Włącz tryb edycji, aby przesuwać stoliki metodą przeciągnij i upuść."
            }
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5 sm:gap-4">
          <button
            onClick={() => setIsEditMode(!isEditMode)}
            className={cn(
              "px-6 py-3 border text-[10px] uppercase tracking-widest font-bold transition-all transition-colors",
              isEditMode 
                ? "bg-gold text-dark border-gold" 
                : "border-border text-stone-400 hover:text-stone-100 hover:border-stone-600"
            )}
          >
            {isEditMode 
              ? (lang === "es" ? "🔑 Bloquear Diseño" : "🔑 Zablokuj Układ") 
              : (lang === "es" ? "🛠️ Editar Mesas" : "🛠️ Edytuj Stoliki")
            }
          </button>
          
          {isEditMode && (
            <button
              onClick={handleAddTable}
              className="px-6 py-3 border border-border bg-stone-900 text-[10px] uppercase tracking-widest text-gold hover:border-gold transition-colors flex items-center gap-2"
            >
              <Plus size={12} />
              {lang === "es" ? "Añadir Mesa" : "Dodaj Stolik"}
            </button>
          )}
        </div>
      </div>

      {/* Per-day layout suggestion / status banner */}
      {dayLayoutStatus !== 'loading' && (
        <div className={cn(
          "flex flex-wrap items-center justify-between gap-3 px-5 py-3 border",
          dayLayoutStatus === 'saved'
            ? "border-emerald-500/20 bg-emerald-500/5"
            : "border-gold/20 bg-gold/5"
        )}>
          <div className="flex items-center gap-2.5 text-xs">
            {dayLayoutStatus === 'saved' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-stone-500 font-mono text-[10px]">
                  {lang === 'es'
                    ? `Diseño personalizado guardado para este día.`
                    : `Zapisany układ na ten dzień.`}
                </span>
              </>
            ) : suggestion ? (
              <>
                <span className="w-2 h-2 rounded-full bg-gold shrink-0 animate-pulse" />
                <span className="text-stone-500 font-mono text-[10px] leading-relaxed">
                  {lang === 'es' ? suggestion.description.es : suggestion.description.pl}
                </span>
              </>
            ) : null}
          </div>

          <div className="flex gap-2 shrink-0">
            {suggestion && dayLayoutStatus === 'none' && (
              <button
                onClick={handleApplySuggestion}
                className="px-4 py-1.5 bg-gold/10 border border-gold/30 text-gold text-[9px] uppercase tracking-widest font-bold hover:bg-gold hover:text-dark transition-all"
              >
                {lang === 'es' ? 'Aplicar Sugerencia' : 'Zastosuj Sugestię'}
              </button>
            )}
            {dayLayoutStatus === 'saved' && (
              <button
                onClick={handleResetLayout}
                className="px-4 py-1.5 border border-stone-700 text-stone-500 text-[9px] uppercase tracking-widest hover:text-rose-500 hover:border-rose-500 transition-all"
              >
                {lang === 'es' ? 'Restablecer Auto' : 'Przywróć Auto'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Date & Time Slot Selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 bg-stone-900/10 p-5 border border-border">
        <div className="space-y-1">
          <div className="text-[10px] uppercase tracking-widest text-stone-600">{t.resDate} {lang === "es" ? "Visualizada" : "Wybrana"}</div>
          <div className="text-stone-300 font-serif italic text-lg capitalize font-light">
            {format(new Date(`${selectedDate}T12:00:00`), "eeee, d MMMM yyyy", { locale: lang === "es" ? es : pl })}
          </div>
        </div>

          <div className="flex items-center gap-3 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
          <span className="text-[10px] uppercase tracking-widest text-stone-500 mr-2 flex-shrink-0">{t.resTime}:</span>
          <div className="flex gap-1.5 overflow-x-auto max-w-lg">
            {(() => {
              // compute occupancy for selectedDate from reservations prop
              const dateRes = reservations.filter(r => r.date === selectedDate && r.status === 'confirmed');
              const occMap: Record<string, { total: number; hasLarge: boolean }> = {};
              dateRes.forEach(r => {
                const t = r.time;
                const g = r.guests || 0;
                if (!occMap[t]) occMap[t] = { total: 0, hasLarge: false };
                occMap[t].total += g;
                if (g >= FULL_SINGLE_THRESHOLD) occMap[t].hasLarge = true;
              });

              // determine disabled slots
              const disabled = new Set<string>();
              TIME_SLOTS.forEach((s, idx) => {
                const info = occMap[s];
                const total = info?.total ?? 0;
                const hasLarge = info?.hasLarge ?? false;
                const isFull = hasLarge || total >= SLOT_CAPACITY;
                if (isFull) {
                  disabled.add(s);
                  for (let k = 1; k <= 4; k++) {
                    const next = TIME_SLOTS[idx + k];
                    if (next) disabled.add(next);
                  }
                }
              });

              return TIME_SLOTS.filter((s, idx) => idx % 2 === 0).map((slot) => (
              <button
                key={slot}
                onClick={() => {
                  setActiveTimeSlot(slot);
                  setSelectedResToAssign(null);
                }}
                className={cn(
                  "px-3 py-1.5 text-[10px] tracking-widest border transition-all rounded font-mono",
                  disabled.has(slot)
                    ? "bg-stone-800 text-stone-600 border-border pointer-events-none opacity-60"
                    : activeTimeSlot === slot
                      ? "bg-gold text-dark border-gold font-bold"
                      : "bg-stone-950 text-stone-500 border-border hover:border-stone-700"
                )}
              >
                {slot}
              </button>
              ));
            })()}
          </div>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* Interactive Floor Map Canvas (Left Column) */}
        <div className="lg:col-span-8 flex flex-col space-y-4">
          <div className="flex justify-between items-center px-2">
            <span className="text-[10px] uppercase tracking-[0.2em] text-stone-500 font-bold">{lang === "es" ? "Distribución del Plano" : "Mapa Sali"}</span>
            <div className="flex items-center gap-4 text-[9px] uppercase tracking-widest font-mono text-stone-600">
               <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-emerald-500/10 border border-emerald-500/30" /> {lang === "es" ? "Libre" : "Wolny"}</span>
               <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-gold/10 border border-gold/40" /> {lang === "es" ? "Ocupada" : "Zajęty"}</span>
            </div>
          </div>

          <div 
            ref={canvasRef}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleDragEnd}
            onMouseLeave={handleDragEnd}
            className={cn(
              "w-full aspect-[4/3] bg-stone-950 border border-border relative overflow-hidden transition-all select-none shadow-inner",
              isEditMode ? "bg-stone-900/15 border-dashed border-gold/30 cursor-crosshair" : "cursor-default"
            )}
            style={{
              backgroundImage: "radial-gradient(#292524 1px, transparent 1px)",
              backgroundSize: "24px 24px"
            }}
          >
            {/* Restaurant Entrance Marker */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-stone-900 border-b border-x border-border font-mono text-[8px] uppercase tracking-[0.3em] px-4 py-1.5 text-stone-600 z-10">
               {lang === "es" ? "Entrada" : "Wejście"}
            </div>

            {/* Kitchen Indicator */}
            <div className="absolute bottom-0 right-10 bg-stone-900/60 border-t border-x border-border/80 font-mono text-[8px] uppercase tracking-[0.3em] px-4 py-1.5 text-stone-600 z-10">
               {lang === "es" ? "Cocina" : "Kuchnia"}
            </div>

            {/* Tables Loop */}
            {tables.map((table) => {
              const booking = getBookingForTable(table.id);
              const isOccupied = !!booking;
              const isSelected = selectedTable?.id === table.id;

              return (
                <div
                  key={table.id}
                  onMouseDown={() => handleDragStart(table.id)}
                  onClick={() => {
                    if (!draggedTableId) setSelectedTable(table);
                  }}
                  style={{
                    left: `${table.x}%`,
                    top: `${table.y}%`,
                    transform: "translate(-50%, -50%)"
                  }}
                  className={cn(
                    "absolute transition-shadow duration-300 p-1 sm:p-2 cursor-pointer flex flex-col items-center justify-center border text-center relative select-none",
                    table.shape === "round" 
                      ? "rounded-full w-14 h-14 xs:w-16 xs:h-16 sm:w-24 sm:h-24" 
                      : "rounded w-14 h-11 xs:w-16 xs:h-12 sm:w-24 sm:h-20",
                    isOccupied 
                      ? "bg-gold/5 border-gold/50 shadow-[0_0_15px_rgba(217,119,6,0.1)] text-gold" 
                      : "bg-emerald-500/5 border-emerald-500/20 text-stone-300 hover:border-stone-500",
                    isSelected ? "ring-2 ring-gold border-gold/90" : ""
                  )}
                >
                  {/* Miniature visual seats around table */}
                  {Array.from({ length: table.seats }).map((_, idx) => {
                    const angle = (idx * 360) / table.seats;
                    const radius = table.shape === "round" ? 38 : 42;
                    const rad = (angle * Math.PI) / 180;
                    const cosVal = Math.cos(rad);
                    const sinVal = Math.sin(rad);
                    return (
                      <span 
                        key={idx}
                        className={cn(
                          "absolute w-1 h-1 sm:w-2 sm:h-2 rounded-full border border-border bg-stone-800 transition-colors",
                          isOccupied ? "bg-gold border-gold" : "bg-emerald-500"
                        )}
                        style={{
                          left: `calc(50% + (${cosVal} * ${radius}%) - 3px)`,
                          top: `calc(50% + (${sinVal} * ${radius}%) - 3px)`
                        }}
                      />
                    );
                  })}

                  {/* Table Label */}
                  <span className="text-[7px] xs:text-[8px] sm:text-[9px] font-bold uppercase tracking-widest text-center max-w-[85%] truncate select-none block leading-none sm:leading-tight">
                    {table.name}
                  </span>
                  
                  {/* Seat capacity stats */}
                  <span className="text-[6.5px] sm:text-[8px] opacity-60 font-mono select-none block mt-0.5 sm:mt-1">
                     {table.seats} Pax
                  </span>

                  {isOccupied && (
                     <div className="absolute -bottom-2 bg-gold text-dark text-[6.5px] xs:text-[7.5px] sm:text-[8px] font-bold px-1 sm:px-1.5 py-0.5 rounded shadow-lg uppercase tracking-tight select-none">
                       {booking.name.split(" ")[0]}
                     </div>
                  )}
                </div>
              );
            })}
          </div>
          
          {isEditMode && (
            <p className="text-[10px] text-yellow-600 italic text-center font-mono">
              * Arrastre las mesas dentro de la cuadrícula superior para reorganizar el salón. Las posiciones se guardan automáticamente.
            </p>
          )}
        </div>

        {/* Informative Side Panel & Custom Actions (Right Column) */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* Section: Assign Bookings Section */}
          <div className="border border-border bg-stone-900/10 p-6 space-y-6">
            <h4 className="text-xs uppercase tracking-[0.2em] text-stone-400 font-bold border-b border-border pb-3">
              {lang === "es" ? "Asignar Reservas" : "Przypisywanie Rezerwacji"}
            </h4>
            
            {/* If there is a selected reservation queue to assign */}
            {selectedResToAssign ? (
              <div className="bg-gold/5 border border-gold/30 p-4 space-y-4">
                 <div className="space-y-1">
                    <p className="text-[9px] uppercase tracking-widest text-gold font-bold">{lang === "es" ? "Pasajeros" : "Rezerwacja"}</p>
                    <p className="text-sm font-serif italic text-stone-100">{selectedResToAssign.name}</p>
                    <p className="text-[10px] text-stone-500 font-mono">{selectedResToAssign.guests} {lang === "es" ? "personas" : "gości"} @ {selectedResToAssign.time}</p>
                 </div>
                 
                 <div className="space-y-2 border-t border-border pt-3">
                    <p className="text-[9px] uppercase tracking-widest text-stone-400 leading-snug">
                      {lang === "es" ? "👉 Haga click en una mesa del plano a la izquierda para sentar a este comensal." : "👉 Kliknij wolny stolik na planie po lewej stronie, aby przypisać gościa."}
                    </p>
                    <div className="grid grid-cols-2 gap-2 pt-2">
                       {tables.map(t => (
                         <button
                           key={t.id}
                           onClick={() => assignTable(selectedResToAssign.id, t)}
                           className="py-2 border border-border/80 hover:border-gold hover:text-gold bg-stone-950 text-[10px] uppercase font-bold tracking-widest"
                         >
                           {t.name}
                         </button>
                       ))}
                    </div>
                 </div>

                 <button
                   onClick={() => setSelectedResToAssign(null)}
                   className="w-full py-2 border border-stone-800 text-[10px] uppercase tracking-widest text-stone-500 hover:text-stone-300"
                 >
                   Cancelar Asignación
                 </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-[11px] text-stone-500 leading-relaxed font-serif italic">
                  {lang === "es" 
                    ? `Pendientes de mesa para las ${activeTimeSlot}:` 
                    : `Oczekują na przypisanie stolika o ${activeTimeSlot}:`
                  }
                </p>

                {unassignedBookings.length === 0 ? (
                  <div className="border border-border border-dashed p-6 text-center space-y-1">
                     <Check className="text-emerald-500 mx-auto" size={18} />
                     <p className="text-[10px] uppercase tracking-widest text-stone-600 font-bold">{lang === "es" ? "Todas sentadas" : "Wszyscy usadzeni"}</p>
                     <p className="text-[9px] text-stone-600 font-light italic leading-snug">No hay comensales pendientes de mesa en este horario.</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[14rem] overflow-y-auto pr-1">
                    {unassignedBookings.map((res) => (
                      <div 
                        key={res.id} 
                        className="p-3 border border-border bg-stone-950 flex justify-between items-center group hover:border-gold transition-colors"
                      >
                        <div className="space-y-1">
                          <p className="text-xs font-serif text-stone-200 italic">{res.name}</p>
                          <p className="text-[9px] text-stone-600 flex items-center gap-1">
                            <Users size={8} /> {res.guests} Pax • {res.time}
                          </p>
                        </div>
                        <button
                          onClick={() => setSelectedResToAssign(res)}
                          className="px-3 py-1.5 bg-stone-900 border border-border text-[9px] uppercase tracking-widest text-gold hover:bg-gold hover:text-dark transition-all font-bold"
                        >
                          {lang === "es" ? "Sentar" : "Usadź"}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section: Selected Table Details / Editor */}
          {selectedTable ? (
            <div className="border border-border bg-stone-900/10 p-6 space-y-6">
              <div className="flex justify-between items-center border-b border-border pb-3">
                <h4 className="text-xs uppercase tracking-[0.2em] text-stone-400 font-bold">
                   {selectedTable.name}
                </h4>
                {isEditMode && (
                   <button 
                     onClick={() => handleDeleteTable(selectedTable.id)}
                     className="text-stone-700 hover:text-rose-500 transition-colors"
                     title="Borrar Mesa"
                   >
                     <Trash2 size={12} />
                   </button>
                )}
              </div>

              {/* Occupied info or simple settings */}
              {(() => {
                const booking = getBookingForTable(selectedTable.id);
                return (
                  <div className="space-y-4">
                     {booking ? (
                       <div className="bg-stone-950 p-4 border border-border space-y-4">
                         <div className="space-y-1">
                           <span className="text-[8px] bg-gold/10 border border-gold/30 text-gold px-2 py-0.5 uppercase tracking-wider rounded font-mono">
                             {lang === "es" ? "OCUPADO" : "OCCUPIED"}
                           </span>
                           <h5 className="text-sm font-serif italic text-stone-200 pt-2">{booking.name}</h5>
                           <p className="text-[10px] text-stone-600 font-mono">{booking.email}</p>
                           <p className="text-[10px] text-stone-600 font-mono">{booking.phone}</p>
                         </div>
                         
                         <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
                            <div>
                               <span className="text-[8px] uppercase tracking-widest text-stone-600 block">Capacidad:</span>
                               <span className="text-stone-300 text-xs">{selectedTable.seats} Pax</span>
                            </div>
                            <div>
                               <span className="text-[8px] uppercase tracking-widest text-stone-600 block">Comensales:</span>
                               <span className="text-gold text-xs font-bold">{booking.guests} Pax</span>
                            </div>
                         </div>

                         <button
                           onClick={() => unassignTable(booking.id)}
                           className="w-full py-2 bg-rose-950/20 border border-rose-900/40 text-[9px] uppercase tracking-widest text-rose-500 hover:bg-rose-950/40 transition-colors font-bold"
                         >
                           {lang === "es" ? "Desocupar Mesa" : "Zwolnij Stolik"}
                         </button>
                       </div>
                     ) : (
                       <p className="text-[11px] text-stone-500 italic block">
                         {lang === "es" ? "Mesa libre para este horario de servicio." : "Stolik wolny w tej godzinie."}
                       </p>
                     )}

                     {/* Configuration form for Table name / capacity (only in Edit Mode or always) */}
                     {isEditMode && (
                       <div className="space-y-4 border-t border-border pt-4">
                         <div className="space-y-1 group">
                           <label className="text-[9px] uppercase tracking-widest text-stone-600">{lang === "es" ? "Nombre de la Mesa" : "Nazwa Stolika"}</label>
                           <input
                             type="text"
                             value={selectedTable.name}
                             onChange={(e) => handleUpdateTableProp(selectedTable.id, "name", e.target.value)}
                             className="w-full bg-stone-950 border border-border px-3 py-1.5 text-xs text-stone-200 focus:outline-none focus:border-gold transition-colors font-serif italic"
                           />
                         </div>
                         
                         <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-1">
                             <label className="text-[9px] uppercase tracking-widest text-stone-600">{lang === "es" ? "Capacidad" : "Miejsca"}</label>
                             <select
                               value={selectedTable.seats}
                               onChange={(e) => handleUpdateTableProp(selectedTable.id, "seats", Number(e.target.value))}
                               className="w-full bg-stone-950 border border-border px-3 py-1.5 text-xs text-stone-300 focus:outline-none focus:border-gold transition-colors"
                             >
                               {[1, 2, 3, 4, 6, 8, 10, 12].map(n => (
                                 <option key={n} value={n}>{n} Pax</option>
                               ))}
                             </select>
                           </div>

                           <div className="space-y-1">
                             <label className="text-[9px] uppercase tracking-widest text-stone-600">{lang === "es" ? "Forma" : "Kształt"}</label>
                             <select
                               value={tableShapeToFriendlyLabel(selectedTable.shape)}
                               onChange={(e) => handleUpdateTableProp(selectedTable.id, "shape", e.target.value)}
                               className="w-full bg-stone-950 border border-border px-3 py-1.5 text-xs text-stone-300 focus:outline-none focus:border-gold transition-colors"
                             >
                               <option value="round">{lang === "es" ? "Redonda" : "Okrągły"}</option>
                               <option value="square">{lang === "es" ? "Cuadrada" : "Kwadratowy"}</option>
                               <option value="counter">{lang === "es" ? "Barra" : "Lada/Bar"}</option>
                             </select>
                           </div>
                         </div>
                       </div>
                     )}
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="border border-border border-dashed p-8 text-center bg-stone-900/5 space-y-2">
              <HelpCircle className="text-stone-700 mx-auto" size={24} />
              <p className="text-[10px] uppercase tracking-widest text-stone-500 font-bold">{lang === "es" ? "Ninguna Mesa Seleccionada" : "Brak Wybranego Stolika"}</p>
              <p className="text-[9px] text-stone-600 font-light italic leading-relaxed">
                Haga click sobre cualquier mesa en el plano para gestionar su ocupación y configuraciones individuales.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function tableShapeToFriendlyLabel(shape: string): string {
  return shape || "round";
}
