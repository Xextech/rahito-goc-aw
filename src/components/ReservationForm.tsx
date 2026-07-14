import React, { useState, useEffect, useCallback } from "react";
import { format, addDays, startOfToday, isSameDay } from "date-fns";
import { es, pl } from "date-fns/locale";
import { cn } from "../lib/utils";
import {
  DEFAULT_TABLES,
  TableDef,
  ReservationSlot,
  computeDisabledSlotsForParty,
  hasFullDayEvent,
  isActiveReservation,
  isDayFullyBooked,
} from "../lib/reservationUtils";
import { motion, AnimatePresence } from "motion/react";
import { Calendar as CalendarIcon, Users, Clock, CheckCircle2, AlertCircle, Utensils, PartyPopper } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

// Refresh window to poll availability while the form is open, so a slot
// taken by another visitor a few minutes ago disappears without a reload.
const AVAILABILITY_POLL_MS = 45_000;

// Generate half-hour slots from 08:00 to 22:00
const TIME_SLOTS: string[] = [];
for (let h = 8; h <= 22; h++) {
  const hh = String(h).padStart(2, '0');
  TIME_SLOTS.push(`${hh}:00`);
  if (h !== 22) TIME_SLOTS.push(`${hh}:30`);
}

type BookingMode = "table" | "event";

export default function ReservationForm() {
  const { lang, t } = useLanguage();
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState<BookingMode>("table");
  const [date, setDate] = useState<Date>(addDays(startOfToday(), 1));
  const [time, setTime] = useState("");
  const [guests, setGuests] = useState(2);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookingRef, setBookingRef] = useState<string | null>(null);
  const [assignedTable, setAssignedTable] = useState<string | null>(null);

  // Disponibilidad agregada (SIN datos personales) servida por el backend.
  // El navegador nunca lee la colección de reservas directamente: solo
  // recibe ocupación (hora, comensales, mesas, tipo) por fecha.
  const [dayReservations, setDayReservations] = useState<Record<string, ReservationSlot[]>>({});
  const [tables, setTables] = useState<TableDef[]>(DEFAULT_TABLES);
  const [availabilityError, setAvailabilityError] = useState(false);

  const activeLocale = lang === "es" ? es : pl;
  const availableDates = Array.from({ length: 14 }, (_, i) => addDays(startOfToday(), i));

  const fetchAvailability = useCallback(async () => {
    const start = format(availableDates[0], "yyyy-MM-dd");
    const end = format(availableDates[availableDates.length - 1], "yyyy-MM-dd");
    try {
      const res = await fetch(`/api/availability?start=${start}&end=${end}`);
      if (!res.ok) throw new Error(`availability ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data.tables) && data.tables.length > 0) setTables(data.tables);
      setDayReservations(data.reservationsByDate || {});
      setAvailabilityError(false);
    } catch (err) {
      console.warn("availability fetch failed", err);
      setAvailabilityError(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchAvailability();
    const interval = setInterval(fetchAvailability, AVAILABILITY_POLL_MS);
    return () => clearInterval(interval);
  }, [fetchAvailability]);

  const getDayRes = (d: Date): ReservationSlot[] => dayReservations[format(d, "yyyy-MM-dd")] || [];

  const isDayDisabled = (d: Date): boolean => {
    if (d.getDay() === 1) return true; // Lunes: cerrado
    const res = getDayRes(d);
    if (hasFullDayEvent(res)) return true; // Evento privado: día bloqueado
    if (mode === "event") {
      // Un evento necesita el restaurante entero: solo días sin reservas
      return res.some(isActiveReservation);
    }
    const fullyBooked = isDayFullyBooked(res, tables, TIME_SLOTS, guests);
    if (fullyBooked) return true;

    // Si es hoy, verificar si todas las franjas horarias libres están a menos de 2h de antelación
    if (isSameDay(d, startOfToday())) {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const disabledSlots = computeDisabledSlotsForParty(res, tables, TIME_SLOTS, guests);
      const hasAnyValidSlot = TIME_SLOTS.some((slot) => {
        if (disabledSlots.has(slot)) return false;
        const [sh, sm] = slot.split(":").map(Number);
        const slotMin = sh * 60 + sm;
        return slotMin >= currentMinutes + 120;
      });
      return !hasAnyValidSlot;
    }
    return false;
  };

  // Si la fecha seleccionada deja de ser válida (lunes, evento, aforo lleno),
  // saltar automáticamente al primer día disponible.
  useEffect(() => {
    if (isDayDisabled(date)) {
      const firstOk = availableDates.find((d) => !isDayDisabled(d));
      if (firstOk && !isSameDay(firstOk, date)) {
        setDate(firstOk);
        setTime("");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayReservations, mode, guests, tables]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const dateStr = format(date, "yyyy-MM-dd");

    try {
      // The server re-validates and re-assigns everything authoritatively
      // (real availability, 2h hold, event-day exclusivity) — the client
      // never decides table assignment, only submits the request.
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          date: dateStr,
          time: mode === "event" ? undefined : time,
          guests: mode === "event" ? undefined : guests,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (data.error === "day_taken") {
          setError(mode === "event" ? t.resEventDayTaken : t.resNoAvailability);
        } else if (data.error === "no_availability") {
          setError(t.resNoAvailability);
        } else if (data.error === "too_late") {
          setError(t.resErrorTooLate);
        } else if (res.status === 429) {
          setError(t.resErrorRateLimited);
        } else {
          setError(t.resErrorGeneric);
        }
        // Refresh availability: someone else may have just taken the slot.
        fetchAvailability();
        return;
      }

      setBookingRef(data.id);
      setAssignedTable(data.tableName || null);
      setStep(3);
      fetchAvailability();
    } catch (err: any) {
      console.error(err);
      setError(t.resErrorGeneric);
    } finally {
      setLoading(false);
    }
  };

  // Offset para alinear el primer día bajo su columna correcta (semana Lun-Dom)
  const firstDayOffset = (availableDates[0].getDay() + 6) % 7;

  const displayTime = mode === "event" ? t.resEventFullDay : (time || "--:--");

  return (
    <div className="max-w-4xl mx-auto bg-dark border border-border overflow-hidden flex flex-col md:flex-row shadow-2xl relative z-10" id="booking-form">
      {/* Branding Column */}
      <div className="md:w-1/3 bg-stone-900 border-b md:border-b-0 md:border-r border-border p-6 sm:p-10 flex flex-col justify-between gap-8">
        <div className="space-y-6">
          <div className="text-gold tracking-[0.3em] uppercase text-[10px] font-semibold">{t.heroSubtitle}</div>
          <h2 className="text-6xl font-serif font-light leading-none">Rahito</h2>
          <p className="text-stone-500 text-xs leading-relaxed uppercase tracking-widest italic font-serif max-w-[12rem]">
            {t.resSidebarDesc}
          </p>
        </div>

        <div className="pt-6 md:pt-10 border-t border-border space-y-4">
           <div className="text-[9px] text-stone-600 uppercase tracking-widest">{t.resSelectedDetail}</div>
           <div className="space-y-1">
             <div className="text-sm border-b border-border py-1 flex justify-between">
               <span className="text-stone-600 uppercase text-[9px] tracking-widest">{t.resDate}</span>
               <span className="text-stone-300 italic font-serif capitalize">{format(date, "MMM d", { locale: activeLocale })}</span>
             </div>
             <div className="text-sm border-b border-border py-1 flex justify-between h-8">
               <span className="text-stone-600 uppercase text-[9px] tracking-widest">{t.resTime}</span>
               <span className="text-stone-300 italic font-serif">{displayTime}</span>
             </div>
             <div className="text-sm border-b border-border py-1 flex justify-between">
               <span className="text-stone-600 uppercase text-[9px] tracking-widest">{t.resGuests}</span>
               <span className="text-stone-300 italic font-serif">{mode === "event" ? t.resEventWholeVenue : guests}</span>
             </div>
           </div>
        </div>
      </div>

      {/* Interactive Column */}
      <div className="flex-1 p-6 sm:p-10 md:p-12 relative min-h-[30rem] sm:min-h-[40rem]">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-12"
            >
              {/* Booking mode: table reservation vs private event */}
              <div className="flex gap-2 border border-border p-1 bg-stone-950/60">
                <button
                  onClick={() => {
                    setMode("table");
                    setError(null);
                  }}
                  className={cn(
                    "flex-1 py-3 text-[10px] uppercase tracking-widest font-bold transition-all flex items-center justify-center gap-2",
                    mode === "table"
                      ? "bg-gold text-dark"
                      : "text-stone-500 hover:text-stone-200"
                  )}
                >
                  <Utensils size={12} />
                  {t.resModeTable}
                </button>
                <button
                  onClick={() => {
                    setMode("event");
                    setTime("");
                    setError(null);
                  }}
                  className={cn(
                    "flex-1 py-3 text-[10px] uppercase tracking-widest font-bold transition-all flex items-center justify-center gap-2",
                    mode === "event"
                      ? "bg-gold text-dark"
                      : "text-stone-500 hover:text-stone-200"
                  )}
                >
                  <PartyPopper size={12} />
                  {t.resModeEvent}
                </button>
              </div>

              <div className="flex justify-between items-center bg-dark/50 pb-4 border-b border-border">
                <h3 className="text-2xl font-serif font-light">{t.resCalendarTitle}</h3>
                <div className="flex gap-4 text-[10px] tracking-widest uppercase items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-gold" />
                  <span className="text-gold">{t.resAvailable}</span>
                </div>
              </div>

              {availabilityError && (
                <div className="text-rose-500/80 text-[10px] uppercase tracking-widest bg-rose-500/5 p-4 border border-rose-500/20 italic flex items-center gap-2">
                  <AlertCircle size={14} />
                  <span>{t.resAvailabilityError}</span>
                </div>
              )}

              <div className="space-y-6">
                <div className="grid grid-cols-7 gap-1">
                  {t.resWeekdaysShort.map(d => (
                    <div key={d} className="text-[9px] text-stone-600 uppercase tracking-tighter text-center py-2">{d}</div>
                  ))}
                  {/* Celdas vacías para alinear el primer día con su columna real */}
                  {Array.from({ length: firstDayOffset }).map((_, i) => (
                    <div key={`offset-${i}`} className="aspect-square" />
                  ))}
                  {availableDates.map((d) => {
                    const disabledDay = isDayDisabled(d);
                    const isEventDay = hasFullDayEvent(getDayRes(d));
                    const selected = isSameDay(date, d);
                    return (
                      <button
                        key={d.toISOString()}
                        onClick={() => {
                          if (disabledDay) return;
                          setDate(d);
                          setTime("");
                        }}
                        disabled={disabledDay}
                        title={isEventDay ? t.resEventDayBlocked : undefined}
                        className={cn(
                          "aspect-square flex items-center justify-center text-sm border transition-all duration-300 relative",
                          selected
                            ? "bg-gold text-dark border-gold z-10 font-bold"
                            : disabledDay
                              ? "bg-stone-900 text-stone-600 border-border line-through opacity-70 cursor-not-allowed"
                              : "bg-dark text-stone-400 border-border hover:border-gold"
                        )}
                      >
                        {format(d, "d")}
                      </button>
                    );
                  })}
                </div>
              </div>

              {mode === "table" ? (
                <div className="space-y-6">
                  <label className="text-[10px] uppercase tracking-widest text-stone-500 block">{t.resAvailableHours}</label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {(() => {
                      // 1 = Monday, 0 = Sunday
                      const isMonday = date.getDay() === 1;
                      if (isMonday) {
                        return (
                          <div className="col-span-3 sm:col-span-4 text-center text-stone-500 py-4 italic">{t.resClosedLabel}</div>
                        );
                      }

                      // Disponibilidad por mesas reales, con franja de 2 horas
                      const dayRes = getDayRes(date);
                      const disabledSlots = computeDisabledSlotsForParty(dayRes, tables, TIME_SLOTS, guests);

                      return TIME_SLOTS.map((t_slot) => {
                        let disabled = disabledSlots.has(t_slot);

                        // Si es hoy, aplicar filtro de margen de 2 horas de antelación
                        if (isSameDay(date, startOfToday())) {
                          const now = new Date();
                          const currentMinutes = now.getHours() * 60 + now.getMinutes();
                          const [sh, sm] = t_slot.split(":").map(Number);
                          const slotMin = sh * 60 + sm;
                          if (slotMin < currentMinutes + 120) {
                            disabled = true;
                          }
                        }

                        return (
                          <button
                            key={t_slot}
                            onClick={() => setTime(t_slot)}
                            disabled={disabled}
                            className={cn(
                              "relative py-3 text-[11px] border transition-all uppercase tracking-widest overflow-hidden",
                              disabled
                                ? "bg-stone-800 text-stone-600 border-border pointer-events-none opacity-80"
                                : time === t_slot
                                  ? "bg-gold text-dark border-gold font-bold"
                                  : "bg-dark text-stone-500 border-border hover:border-gold hover:text-stone-300"
                            )}
                          >
                            <span className="relative z-10">{t_slot}</span>
                            {disabled && (
                              <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none">
                                <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(135deg, rgba(0,0,0,0.45) 0 50%, rgba(255,255,255,0.02) 50%)' }} />
                                <span className="z-10 text-xs uppercase tracking-widest text-white font-bold drop-shadow-lg">{t.resFullLabel}</span>
                              </div>
                            )}
                          </button>
                        );
                      });
                    })()}
                  </div>
                </div>
              ) : (
                <div className="border border-gold/25 bg-gold/5 p-6 space-y-3">
                  <div className="flex items-center gap-2 text-gold">
                    <PartyPopper size={14} />
                    <span className="text-[10px] uppercase tracking-[0.25em] font-bold">{t.resModeEvent}</span>
                  </div>
                  <p className="text-stone-400 text-sm font-serif italic leading-relaxed">
                    {t.resEventDesc}
                  </p>
                  <p className="text-[10px] text-stone-500 uppercase tracking-widest">
                    {t.resEventWholeVenue} • {t.resEventFullDay}
                  </p>
                </div>
              )}

              {mode === "table" && (
                <div className="space-y-6">
                  <label className="text-[10px] uppercase tracking-widest text-stone-500 block">{t.resPartySize}</label>
                  <div className="flex gap-3 flex-wrap">
                    {[1,2,3,4,5,6,7,8,9,10].map((n) => (
                      <button
                        key={n}
                        onClick={() => {
                          setGuests(n);
                          setTime("");
                        }}
                        className={cn(
                          "w-12 h-12 flex items-center justify-center text-sm border transition-all",
                          guests === n
                            ? "border-gold text-gold bg-gold/5"
                            : "border-border text-stone-600 hover:border-stone-400"
                        )}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  {guests >= 10 && (
                    <p className="text-[10px] text-gold/80 uppercase tracking-widest flex items-center gap-2">
                      <AlertCircle size={12} />
                      {t.resLargeGroupNote}
                    </p>
                  )}
                </div>
              )}

              <button
                disabled={mode === "table" ? !time : isDayDisabled(date)}
                onClick={() => setStep(2)}
                className="w-full py-5 bg-stone-muted text-dark uppercase tracking-[0.3em] font-bold text-xs hover:bg-gold transition-colors disabled:opacity-20"
              >
                {t.resBtnProceed}
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.form
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleSubmit}
              className="space-y-12"
            >
              <div className="flex justify-between items-center pb-4 border-b border-border">
                <h3 className="text-2xl font-serif font-light tracking-tight">{t.fieldPersonalTitle}</h3>
              </div>

              <div className="space-y-8">
                <div className="space-y-2 group">
                  <label className="text-[10px] uppercase tracking-widest text-stone-600 ml-1 group-focus-within:text-gold transition-colors">{t.fieldFullName}</label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-transparent border-b border-border py-2 text-stone-200 focus:outline-none focus:border-gold transition-all font-serif italic text-lg"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                  <div className="space-y-2 group">
                    <label className="text-[10px] uppercase tracking-widest text-stone-600 ml-1 group-focus-within:text-gold transition-colors">{t.fieldEmail}</label>
                    <input
                      required
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-transparent border-b border-border py-2 text-stone-200 focus:outline-none focus:border-gold transition-all font-serif italic text-lg"
                    />
                  </div>
                  <div className="space-y-2 group">
                    <label className="text-[10px] uppercase tracking-widest text-stone-600 ml-1 group-focus-within:text-gold transition-colors">{t.fieldPhone}</label>
                    <input
                      required
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full bg-transparent border-b border-border py-2 text-stone-200 focus:outline-none focus:border-gold transition-all font-serif italic text-lg"
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="text-rose-500/80 text-[10px] uppercase tracking-widest bg-rose-500/5 p-4 border border-rose-500/20 italic flex items-center gap-2">
                  <AlertCircle size={14} />
                  <span>* {error}</span>
                </div>
              )}

              <div className="flex gap-4 pt-10">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-8 border border-border text-stone-600 uppercase tracking-widest text-[9px] hover:text-stone-300 hover:border-stone-500 transition-all"
                >
                  {t.resBtnBack}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-5 bg-stone-muted text-dark uppercase tracking-[0.3em] font-bold text-xs hover:bg-gold transition-colors disabled:opacity-50"
                >
                  {loading ? t.resBtnConfirming : t.resBtnFinalize}
                </button>
              </div>
            </motion.form>
          )}

          {step === 3 && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center h-full text-center space-y-10"
            >
              <div className="w-16 h-16 rounded-full border border-gold flex items-center justify-center text-gold bg-gold/5">
                <CheckCircle2 size={32} strokeWidth={1} />
              </div>
              <div className="space-y-4">
                <h2 className="text-4xl font-serif font-light tracking-tight text-stone-100 italic">{t.resConfirmed}</h2>
                <p className="text-stone-500 text-sm tracking-widest uppercase leading-loose">
                  {t.resConfirmedDesc}
                </p>
              </div>

              <div className="w-full max-w-sm border border-border p-8 space-y-6 text-left relative overflow-hidden group bg-stone-900/10">
                 <div className="absolute -right-4 -bottom-4 text-border opacity-5 group-hover:text-gold/10 transition-colors">
                    <Utensils size={120} />
                 </div>
                 <div className="relative z-10 space-y-6">
                    <div className="flex justify-between items-end border-b border-border pb-4">
                       <span className="text-[9px] uppercase tracking-widest text-stone-600">{t.resReference}</span>
                       <span className="text-xs font-mono text-gold uppercase">{bookingRef?.slice(-8)}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-8 font-serif italic">
                       <div>
                          <span className="text-[9px] uppercase tracking-widest text-stone-600 not-italic font-sans block mb-1">{t.resDate}</span>
                          <p className="text-stone-200 text-lg capitalize">{format(date, "MMMM d", { locale: activeLocale })}</p>
                       </div>
                       <div>
                          <span className="text-[9px] uppercase tracking-widest text-stone-600 not-italic font-sans block mb-1">{t.resTime}</span>
                          <p className="text-stone-200 text-lg">{mode === "event" ? t.resEventFullDay : time}</p>
                       </div>
                    </div>
                    {assignedTable && (
                      <div className="border-t border-border pt-4">
                        <span className="text-[9px] uppercase tracking-widest text-stone-600 block mb-1">{t.resTableLabel}</span>
                        <p className="text-gold text-sm font-serif italic">{assignedTable}</p>
                      </div>
                    )}
                 </div>
              </div>

              <button
                onClick={() => {
                  setStep(1);
                  setFormData({ name: "", email: "", phone: "" });
                  setTime("");
                  setAssignedTable(null);
                }}
                className="text-[10px] text-stone-600 tracking-[0.4em] uppercase hover:text-gold transition-colors border-b border-transparent hover:border-gold pb-1"
              >
                {t.resNewBooking}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
