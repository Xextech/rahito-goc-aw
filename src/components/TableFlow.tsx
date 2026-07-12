import React, { useState, useEffect, useRef } from "react";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useLanguage } from "../context/LanguageContext";
import { Users, Trash2, Plus, Check, HelpCircle, Wand2, PartyPopper } from "lucide-react";
import { format } from "date-fns";
import { es, pl } from "date-fns/locale";
import { cn } from "../lib/utils";
import {
  DEFAULT_TABLES,
  TableDef,
  autoAssignTables,
  getReservationTableIds,
  hasFullDayEvent,
  isActiveReservation,
  blocksSlot,
} from "../lib/reservationUtils";

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
  tableIds?: string[];
  tableName?: string;
  type?: string;
}

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
  // Empezar con las 5 mesas de 4 por defecto; el plano guardado las sustituye al cargar
  const [tables, setTables] = useState<TableDef[]>(DEFAULT_TABLES);
  const [activeTimeSlot, setActiveTimeSlot] = useState<string>("19:00");
  const [selectedTable, setSelectedTable] = useState<TableDef | null>(null);
  const [selectedResToAssign, setSelectedResToAssign] = useState<Reservation | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [loading, setLoading] = useState(false);

  // Drag and drop state (pointer events: mouse + touch)
  const canvasRef = useRef<HTMLDivElement>(null);
  const [draggedTableId, setDraggedTableId] = useState<string | null>(null);
  const dragMovedRef = useRef(false);
  const tablesRef = useRef<TableDef[]>(tables);
  useEffect(() => { tablesRef.current = tables; }, [tables]);

  // Available times (matching ReservationForm TIME_SLOTS)
  // Generate half-hour slots from 08:00 to 22:00
  const TIME_SLOTS: string[] = [];
  for (let h = 8; h <= 22; h++) {
    const hh = String(h).padStart(2, '0');
    TIME_SLOTS.push(`${hh}:00`);
    if (h !== 22) TIME_SLOTS.push(`${hh}:30`);
  }

  // Load the single global restaurant layout; seed the 5 default tables of 4
  // the first time so the owner always starts with the real dining room.
  useEffect(() => {
    let cancelled = false;

    const loadLayout = async () => {
      try {
        const globalRef = doc(db, "settings", "restaurant_layout");
        const globalSnap = await getDoc(globalRef);
        if (cancelled) return;

        if (globalSnap.exists() && Array.isArray(globalSnap.data()?.tables) && globalSnap.data()!.tables.length > 0) {
          setTables(globalSnap.data()!.tables);
        } else {
          setTables(DEFAULT_TABLES);
          // Seed Firestore so the same 5 tables drive availability everywhere
          try {
            await setDoc(globalRef, { tables: DEFAULT_TABLES });
          } catch (seedErr) {
            console.warn("Could not seed default layout:", seedErr);
          }
        }
      } catch (err) {
        console.error("Failed to load layout:", err);
        if (!cancelled) setTables(DEFAULT_TABLES);
      }
    };

    loadLayout();
    return () => { cancelled = true; };
  }, []);

  // Active reservations for the selected date (events included)
  const dateReservations = reservations.filter(
    (r) => r.date === selectedDate && isActiveReservation(r)
  );
  const eventOfDay = dateReservations.find((r) => r.type === "event");

  // Reservations holding a table during the active slot (2-hour window)
  const currentReservations = dateReservations.filter(
    (r) => r.type !== "event" && r.status === "confirmed" && blocksSlot(r.time, activeTimeSlot)
  );

  // Unassigned bookings starting exactly at the selected slot
  const unassignedBookings = dateReservations.filter(
    (r) => r.type !== "event" && r.status === "confirmed" && r.time === activeTimeSlot && getReservationTableIds(r).length === 0
  );

  // Find booking occupying a specific table during the active slot
  const getBookingForTable = (tableId: string) => {
    if (eventOfDay) return eventOfDay;
    return currentReservations.find((r) => {
      if (getReservationTableIds(r).includes(tableId)) return true;
      // Large parties take the whole restaurant
      return r.guests >= 10 && getReservationTableIds(r).length > 0;
    });
  };

  // Assign reservation to a table manually
  const assignTable = async (resId: string, table: TableDef) => {
    try {
      setLoading(true);

      // Detect if there's an existing assignment on this table at the same hour
      const existingOnTable = currentReservations.find((r) => getReservationTableIds(r).includes(table.id) && r.id !== resId);
      if (existingOnTable) {
        await onUpdateReservation(existingOnTable.id, { tableId: "", tableIds: [], tableName: "" });
      }

      await onUpdateReservation(resId, {
        tableId: table.id,
        tableIds: [table.id],
        tableName: table.name,
      });

      setSelectedResToAssign(null);
    } catch (err) {
      console.error("Failed to assign table:", err);
    } finally {
      setLoading(false);
    }
  };

  // Automatic assignment: pick free table(s) honouring the 2-hour window
  const autoAssign = async (res: Reservation) => {
    try {
      setLoading(true);
      const others = dateReservations.filter((r) => r.id !== res.id);
      const assignment = autoAssignTables(others, tables, res.time, res.guests);
      if (!assignment) {
        alert(t.resNoAvailability);
        return;
      }
      await onUpdateReservation(res.id, {
        tableId: assignment.tableIds[0],
        tableIds: assignment.tableIds,
        tableName: assignment.tableName,
      });
      setSelectedResToAssign(null);
    } catch (err) {
      console.error("Failed to auto-assign table:", err);
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
        tableIds: [],
        tableName: "",
      });
    } catch (err) {
      console.error("Failed to unassign:", err);
    } finally {
      setLoading(false);
    }
  };

  // Persist the global table layout to Firestore
  const saveLayout = async (newTables: TableDef[]) => {
    try {
      await setDoc(doc(db, "settings", "restaurant_layout"), { tables: newTables });
    } catch (err) {
      console.error("Failed to save layout:", err);
    }
  };

  const handleAddTable = () => {
    const id = `table_${Date.now()}`;
    // Stagger new tables so they never stack on top of each other
    const col = tables.length % 4;
    const row = Math.floor(tables.length / 4) % 4;
    const newTable: TableDef = {
      id,
      name: `${t.tfNewTablePrefix} ${tables.length + 1}`,
      seats: 4,
      x: 20 + col * 20,
      y: 20 + row * 20,
      shape: "square"
    };
    const updated = [...tables, newTable];
    setTables(updated);
    saveLayout(updated);
    setSelectedTable(newTable);
  };

  const handleDeleteTable = (id: string) => {
    const updated = tables.filter(t => t.id !== id);
    setTables(updated);
    saveLayout(updated);
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
    saveLayout(updated);
    if (selectedTable?.id === id) {
      setSelectedTable({ ...selectedTable, [field]: val });
    }
  };

  // ── Drag & drop with pointer capture ─────────────────────────
  const handleTablePointerDown = (e: React.PointerEvent, table: TableDef) => {
    setSelectedTable(table);
    if (!isEditMode) return;
    e.preventDefault();
    dragMovedRef.current = false;
    // Capture on the canvas so the drag survives fast movements and
    // works identically with mouse and touch.
    canvasRef.current?.setPointerCapture(e.pointerId);
    setDraggedTableId(table.id);
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggedTableId || !canvasRef.current || !isEditMode) return;
    e.preventDefault();
    dragMovedRef.current = true;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    // Constrain percentages to margins (5% to 95%)
    const clampedX = Math.max(5, Math.min(95, Math.round(x * 10) / 10));
    const clampedY = Math.max(5, Math.min(95, Math.round(y * 10) / 10));

    setTables(prev => prev.map(t => {
      if (t.id === draggedTableId) {
        return { ...t, x: clampedX, y: clampedY };
      }
      return t;
    }));
  };

  const handleCanvasPointerUp = () => {
    if (draggedTableId) {
      if (dragMovedRef.current) {
        saveLayout(tablesRef.current);
        // Refresh the side panel with the new position
        const moved = tablesRef.current.find(t => t.id === draggedTableId);
        if (moved) setSelectedTable(moved);
      }
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
            {t.tfIntro}
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
            {isEditMode ? t.tfLockLayout : t.tfEditTables}
          </button>

          {isEditMode && (
            <button
              onClick={handleAddTable}
              className="px-6 py-3 border border-border bg-stone-900 text-[10px] uppercase tracking-widest text-gold hover:border-gold transition-colors flex items-center gap-2"
            >
              <Plus size={12} />
              {t.tfAddTable}
            </button>
          )}
        </div>
      </div>

      {/* Private event banner: the whole day is blocked */}
      {eventOfDay && (
        <div className="flex items-center gap-3 px-5 py-4 border border-gold/30 bg-gold/5">
          <PartyPopper size={16} className="text-gold shrink-0" />
          <div className="text-xs">
            <span className="text-gold font-bold uppercase tracking-widest text-[10px] block">
              {t.tfEventDayBlockedTitle}
            </span>
            <span className="text-stone-500 font-mono text-[10px]">
              {eventOfDay.name} • {eventOfDay.email} • {eventOfDay.phone}
            </span>
          </div>
        </div>
      )}

      {/* Date & Time Slot Selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 bg-stone-900/10 p-5 border border-border">
        <div className="space-y-1">
          <div className="text-[10px] uppercase tracking-widest text-stone-600">{t.resDate} {t.tfDateViewedSuffix}</div>
          <div className="text-stone-300 font-serif italic text-lg capitalize font-light">
            {format(new Date(`${selectedDate}T12:00:00`), "eeee, d MMMM yyyy", { locale: lang === "es" ? es : pl })}
          </div>
        </div>

        <div className="flex items-center gap-3 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
          <span className="text-[10px] uppercase tracking-widest text-stone-500 mr-2 flex-shrink-0">{t.resTime}:</span>
          <div className="flex gap-1.5 overflow-x-auto max-w-lg">
            {(() => {
              // Mark slots that have confirmed reservations starting on them
              const slotsWithBookings = new Set(
                dateReservations
                  .filter(r => r.type !== "event" && r.status === "confirmed")
                  .map(r => r.time)
              );

              return TIME_SLOTS.map((slot) => {
                const bookingsInSlot = dateReservations.filter(
                  (r) => r.type !== "event" && r.status === "confirmed" && blocksSlot(r.time, slot)
                );
                
                const hasDirectBooking = slotsWithBookings.has(slot);
                const isBlocked = bookingsInSlot.length > 0;
                
                // Get set of table IDs occupied during this slot
                const occupiedTableIds = new Set(
                  bookingsInSlot.flatMap(getReservationTableIds)
                );
                
                const isFullyOccupied = !!eventOfDay || occupiedTableIds.size >= tables.length;
                const isSelected = activeTimeSlot === slot;

                return (
                  <button
                    key={slot}
                    onClick={() => {
                      setActiveTimeSlot(slot);
                      setSelectedResToAssign(null);
                    }}
                    className={cn(
                      "relative px-3 py-1.5 text-[10px] tracking-widest border transition-all rounded font-mono flex items-center justify-center gap-1.5 shrink-0",
                      isSelected
                        ? "bg-gold text-dark border-gold font-bold"
                        : isFullyOccupied
                        ? "bg-rose-950/20 text-rose-500/60 border-rose-950/60 line-through cursor-pointer hover:border-rose-500"
                        : isBlocked
                        ? "bg-amber-950/10 text-amber-500 border-amber-800/40 hover:border-amber-500"
                        : "bg-stone-950 text-stone-500 border-border hover:border-stone-700"
                    )}
                    title={
                      isFullyOccupied
                        ? (lang === "es" ? "Completo / Bloqueado" : "Pełny / Zablokowany")
                        : isBlocked
                        ? (lang === "es" ? "Ocupación parcial" : "Częściowe obłożenie")
                        : (lang === "es" ? "Libre" : "Wolny")
                    }
                  >
                    {slot}
                    {hasDirectBooking && (
                      <span className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        isSelected ? "bg-dark" : "bg-gold"
                      )} />
                    )}
                  </button>
                );
              });
            })()}
          </div>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

        {/* Interactive Floor Map Canvas (Left Column) */}
        <div className="lg:col-span-8 flex flex-col space-y-4">
          <div className="flex justify-between items-center px-2">
            <span className="text-[10px] uppercase tracking-[0.2em] text-stone-500 font-bold">{t.tfFloorLayout}</span>
            <div className="flex items-center gap-4 text-[9px] uppercase tracking-widest font-mono text-stone-600">
               <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-emerald-500/10 border border-emerald-500/30" /> {t.tfFree}</span>
               <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-gold/10 border border-gold/40" /> {t.tfOccupied}</span>
            </div>
          </div>

          <div
            ref={canvasRef}
            onPointerMove={handleCanvasPointerMove}
            onPointerUp={handleCanvasPointerUp}
            onPointerCancel={handleCanvasPointerUp}
            className={cn(
              "w-full aspect-[4/3] bg-stone-950 border border-border relative overflow-hidden transition-all select-none shadow-inner",
              isEditMode ? "bg-stone-900/15 border-dashed border-gold/30 touch-none" : "cursor-default"
            )}
            style={{
              backgroundImage: "radial-gradient(#292524 1px, transparent 1px)",
              backgroundSize: "24px 24px"
            }}
          >
            {/* Restaurant Entrance Marker */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-stone-900 border-b border-x border-border font-mono text-[8px] uppercase tracking-[0.3em] px-4 py-1.5 text-stone-600 z-10">
               {t.tfEntrance}
            </div>

            {/* Kitchen Indicator */}
            <div className="absolute bottom-0 right-10 bg-stone-900/60 border-t border-x border-border/80 font-mono text-[8px] uppercase tracking-[0.3em] px-4 py-1.5 text-stone-600 z-10">
               {t.tfKitchen}
            </div>

            {/* Tables Loop */}
            {tables.map((table) => {
              const booking = getBookingForTable(table.id);
              const isOccupied = !!booking;
              const isSelected = selectedTable?.id === table.id;
              const isDragging = draggedTableId === table.id;

              return (
                <div
                  key={table.id}
                  onPointerDown={(e) => handleTablePointerDown(e, table)}
                  style={{
                    left: `${table.x}%`,
                    top: `${table.y}%`,
                    transform: "translate(-50%, -50%)"
                  }}
                  className={cn(
                    "absolute p-1 sm:p-2 flex flex-col items-center justify-center border text-center select-none",
                    isDragging ? "z-20 shadow-2xl" : "transition-shadow duration-300",
                    isEditMode ? (isDragging ? "cursor-grabbing" : "cursor-grab") : "cursor-pointer",
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
                          "absolute w-1 h-1 sm:w-2 sm:h-2 rounded-full border border-border transition-colors",
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
              {t.tfDragHint}
            </p>
          )}
        </div>

        {/* Informative Side Panel & Custom Actions (Right Column) */}
        <div className="lg:col-span-4 space-y-8">

          {/* Section: Assign Bookings Section */}
          <div className="border border-border bg-stone-900/10 p-6 space-y-6">
            <h4 className="text-xs uppercase tracking-[0.2em] text-stone-400 font-bold border-b border-border pb-3">
              {t.tfAssignReservations}
            </h4>

            {/* If there is a selected reservation queue to assign */}
            {selectedResToAssign ? (
              <div className="bg-gold/5 border border-gold/30 p-4 space-y-4">
                 <div className="space-y-1">
                    <p className="text-[9px] uppercase tracking-widest text-gold font-bold">{t.tfReservationLabel}</p>
                    <p className="text-sm font-serif italic text-stone-100">{selectedResToAssign.name}</p>
                    <p className="text-[10px] text-stone-500 font-mono">{selectedResToAssign.guests} {t.tfPeopleUnit} @ {selectedResToAssign.time}</p>
                 </div>

                 <button
                   onClick={() => autoAssign(selectedResToAssign)}
                   disabled={loading}
                   className="w-full py-2.5 bg-gold text-dark text-[10px] uppercase tracking-widest font-bold hover:bg-gold/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                 >
                   <Wand2 size={12} />
                   {t.tfAutoAssignBtn}
                 </button>

                 <div className="space-y-2 border-t border-border pt-3">
                    <p className="text-[9px] uppercase tracking-widest text-stone-400 leading-snug">
                      {t.tfManualAssignHint}
                    </p>
                    <div className="grid grid-cols-2 gap-2 pt-2">
                       {tables.map(tb => (
                         <button
                           key={tb.id}
                           onClick={() => assignTable(selectedResToAssign.id, tb)}
                           disabled={loading}
                           className="py-2 border border-border/80 hover:border-gold hover:text-gold bg-stone-950 text-[10px] uppercase font-bold tracking-widest disabled:opacity-50"
                         >
                           {tb.name}
                         </button>
                       ))}
                    </div>
                 </div>

                 <button
                   onClick={() => setSelectedResToAssign(null)}
                   className="w-full py-2 border border-stone-800 text-[10px] uppercase tracking-widest text-stone-500 hover:text-stone-300"
                 >
                   {t.tfCancelAssign}
                 </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-[11px] text-stone-500 leading-relaxed font-serif italic">
                  {t.tfPendingForSlot.replace('{time}', activeTimeSlot)}
                </p>

                {unassignedBookings.length === 0 ? (
                  <div className="border border-border border-dashed p-6 text-center space-y-1">
                     <Check className="text-emerald-500 mx-auto" size={18} />
                     <p className="text-[10px] uppercase tracking-widest text-stone-600 font-bold">{t.tfAllSeated}</p>
                     <p className="text-[9px] text-stone-600 font-light italic leading-snug">
                       {t.tfNoPending}
                     </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[14rem] overflow-y-auto pr-1">
                    {unassignedBookings.map((res) => (
                      <div
                        key={res.id}
                        className="p-3 border border-border bg-stone-950 flex justify-between items-center group hover:border-gold transition-colors gap-2"
                      >
                        <div className="space-y-1 min-w-0">
                          <p className="text-xs font-serif text-stone-200 italic truncate">{res.name}</p>
                          <p className="text-[9px] text-stone-600 flex items-center gap-1">
                            <Users size={8} /> {res.guests} Pax • {res.time}
                          </p>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <button
                            onClick={() => autoAssign(res)}
                            disabled={loading}
                            title={t.tfAutoAssignTooltip}
                            className="px-2 py-1.5 bg-gold/10 border border-gold/30 text-[9px] uppercase tracking-widest text-gold hover:bg-gold hover:text-dark transition-all font-bold disabled:opacity-50"
                          >
                            <Wand2 size={11} />
                          </button>
                          <button
                            onClick={() => setSelectedResToAssign(res)}
                            className="px-3 py-1.5 bg-stone-900 border border-border text-[9px] uppercase tracking-widest text-gold hover:bg-gold hover:text-dark transition-all font-bold"
                          >
                            {t.tfSeatBtn}
                          </button>
                        </div>
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
                     title={t.tfDeleteTableTooltip}
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
                             {booking.type === "event" ? t.tfBadgeEvent : t.tfBadgeOccupied}
                           </span>
                           <h5 className="text-sm font-serif italic text-stone-200 pt-2">{booking.name}</h5>
                           <p className="text-[10px] text-stone-600 font-mono">{booking.email}</p>
                           <p className="text-[10px] text-stone-600 font-mono">{booking.phone}</p>
                         </div>

                         <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
                            <div>
                               <span className="text-[8px] uppercase tracking-widest text-stone-600 block">{t.tfCapacityLabel}</span>
                               <span className="text-stone-300 text-xs">{selectedTable.seats} Pax</span>
                            </div>
                            <div>
                               <span className="text-[8px] uppercase tracking-widest text-stone-600 block">{t.tfGuestsLabel}</span>
                               <span className="text-gold text-xs font-bold">{booking.guests} Pax</span>
                            </div>
                         </div>

                         <div>
                            <span className="text-[8px] uppercase tracking-widest text-stone-600 block">{t.tfOccupiedWindowLabel}</span>
                            <span className="text-stone-400 text-[10px] font-mono">
                              {booking.type === "event" ? t.resEventFullDay : `${booking.time} — 2h`}
                            </span>
                         </div>

                         {booking.type !== "event" && (
                           <button
                             onClick={() => unassignTable(booking.id)}
                             className="w-full py-2 bg-rose-950/20 border border-rose-900/40 text-[9px] uppercase tracking-widest text-rose-500 hover:bg-rose-950/40 transition-colors font-bold"
                           >
                             {t.tfFreeTableBtn}
                           </button>
                         )}
                       </div>
                     ) : (
                       <p className="text-[11px] text-stone-500 italic block">
                         {t.tfTableFreeNote}
                       </p>
                     )}

                     {/* Configuration form for Table name / capacity (only in Edit Mode) */}
                     {isEditMode && (
                       <div className="space-y-4 border-t border-border pt-4">
                         <div className="space-y-1 group">
                           <label className="text-[9px] uppercase tracking-widest text-stone-600">{t.tfTableNameLabel}</label>
                           <input
                             type="text"
                             value={selectedTable.name}
                             onChange={(e) => handleUpdateTableProp(selectedTable.id, "name", e.target.value)}
                             className="w-full bg-stone-950 border border-border px-3 py-1.5 text-xs text-stone-200 focus:outline-none focus:border-gold transition-colors font-serif italic"
                           />
                         </div>

                         <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-1">
                             <label className="text-[9px] uppercase tracking-widest text-stone-600">{t.tfCapacityFieldLabel}</label>
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
                             <label className="text-[9px] uppercase tracking-widest text-stone-600">{t.tfShapeLabel}</label>
                             <select
                               value={selectedTable.shape}
                               onChange={(e) => handleUpdateTableProp(selectedTable.id, "shape", e.target.value)}
                               className="w-full bg-stone-950 border border-border px-3 py-1.5 text-xs text-stone-300 focus:outline-none focus:border-gold transition-colors"
                             >
                               <option value="round">{t.tfShapeRound}</option>
                               <option value="square">{t.tfShapeSquare}</option>
                               <option value="counter">{t.tfShapeCounter}</option>
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
              <p className="text-[10px] uppercase tracking-widest text-stone-500 font-bold">{t.tfNoTableSelected}</p>
              <p className="text-[9px] text-stone-600 font-light italic leading-relaxed">
                {t.tfNoTableSelectedHint}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
