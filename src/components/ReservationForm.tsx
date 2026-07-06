import React, { useState, useEffect } from "react";
import { format, addDays, startOfToday, isSameDay } from "date-fns";
import { es, pl } from "date-fns/locale";
import { collection, addDoc, serverTimestamp, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { cn } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { Calendar as CalendarIcon, Users, Clock, CheckCircle2, AlertCircle, Utensils } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

// Generate half-hour slots from 08:00 to 22:00
const TIME_SLOTS: string[] = [];
for (let h = 8; h <= 22; h++) {
  const hh = String(h).padStart(2, '0');
  TIME_SLOTS.push(`${hh}:00`);
  if (h !== 22) TIME_SLOTS.push(`${hh}:30`);
}

const SLOT_CAPACITY = 20; // total capacity per timeslot
const FULL_SINGLE_THRESHOLD = 10; // single reservation >= this counts as full

export default function ReservationForm() {
  const { lang, t } = useLanguage();
  const [step, setStep] = useState(1);
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

  // occupancy map: { 'yyyy-mm-dd': { '08:00': { total: number, hasLarge: boolean } } }
  const [occupancy, setOccupancy] = useState<Record<string, Record<string, { total: number; hasLarge: boolean }>>>({});

  const activeLocale = lang === "es" ? es : pl;
  const availableDates = Array.from({ length: 14 }, (_, i) => addDays(startOfToday(), i + 1));

  // Listen to reservations for next 14 days and build occupancy map
  useEffect(() => {
    const start = format(availableDates[0], "yyyy-MM-dd");
    const end = format(availableDates[availableDates.length - 1], "yyyy-MM-dd");
    const q = query(collection(db, "reservations"), where("date", ">=", start), where("date", "<=", end));
    const unsub = onSnapshot(q, (snap) => {
      const map: Record<string, Record<string, { total: number; hasLarge: boolean }>> = {};
      snap.docs.forEach((d) => {
        const data: any = d.data();
        if (!data || !data.date || !data.time || !data.guests) return;
        const date = data.date as string;
        const time = data.time as string;
        const guests = Number(data.guests) || 0;
        if (!map[date]) map[date] = {};
        if (!map[date][time]) map[date][time] = { total: 0, hasLarge: false };
        map[date][time].total += guests;
        if (guests >= FULL_SINGLE_THRESHOLD) map[date][time].hasLarge = true;
      });
      setOccupancy(map);
    });
    return () => unsub();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const dateStr = format(date, "yyyy-MM-dd");

    const reservation = {
      date: dateStr,
      time,
      guests,
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      status: "confirmed",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      // 1. Store the booking securely in Firebase Firestore
      const docRef = await addDoc(collection(db, "reservations"), reservation);
      const generatedId = docRef.id;
      setBookingRef(generatedId);

      // 2. Dispatch a secure Node server-side POST request to notify the owner (analogous to PHPMailer SMTP)
      try {
        await fetch("/api/notify-reservation", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            date: dateStr,
            time,
            guests,
            bookingRef: generatedId,
          }),
        });
      } catch (notifyErr) {
        console.warn("Notification server api failed, but booking was saved to DB:", notifyErr);
      }

      setStep(3);
    } catch (err: any) {
      console.error(err);
      setError(lang === "es" ? "Error al registrar la reserva. Inténtelo de nuevo." : "Nie udało się zarezerwować stolika. Spróbuj ponownie później.");
    } finally {
      setLoading(false);
    }
  };

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
               <span className="text-stone-300 italic font-serif">{time || "--:--"}</span>
             </div>
             <div className="text-sm border-b border-border py-1 flex justify-between">
               <span className="text-stone-600 uppercase text-[9px] tracking-widest">{t.resGuests}</span>
               <span className="text-stone-300 italic font-serif">{guests}</span>
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
              <div className="flex justify-between items-center bg-dark/50 pb-4 border-b border-border">
                <h3 className="text-2xl font-serif font-light">{t.resCalendarTitle}</h3>
                <div className="flex gap-4 text-[10px] tracking-widest uppercase items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-gold" />
                  <span className="text-gold">{t.resAvailable}</span>
                </div>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-7 gap-1">
                  {(lang === "es" ? ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"] : ["Pon", "Wt", "Śr", "Czw", "Pt", "Sob", "Nie"]).map(d => (
                    <div key={d} className="text-[9px] text-stone-600 uppercase tracking-tighter text-center py-2">{d}</div>
                  ))}
                  {availableDates.map((d) => (
                    <button
                      key={d.toISOString()}
                      onClick={() => setDate(d)}
                      className={cn(
                        "aspect-square flex items-center justify-center text-sm border transition-all duration-300 relative",
                        isSameDay(date, d)
                          ? "bg-gold text-dark border-gold z-10 font-bold"
                          : "bg-dark text-stone-400 border-border hover:border-gold"
                      )}
                    >
                      {format(d, "d")}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <label className="text-[10px] uppercase tracking-widest text-stone-500 block">{t.resAvailableHours}</label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {(() => {
                    // 1 = Monday, 0 = Sunday
                    const isMonday = date.getDay() === 1;
                    if (isMonday) {
                      return (
                        <div className="col-span-3 sm:col-span-4 text-center text-stone-500 py-4 italic">{lang === 'es' ? 'Cerrado' : 'Zamknięte'}</div>
                      );
                    }

                    // occupancy for selected date
                    const dateStr = format(date, "yyyy-MM-dd");
                    const dayOccupancy = occupancy[dateStr] || {};

                    // determine disabled slots including follow-up blocking
                    const disabledSlots = new Set<string>();
                    TIME_SLOTS.forEach((slot, idx) => {
                      const info = dayOccupancy[slot];
                      const total = info?.total ?? 0;
                      const hasLarge = info?.hasLarge ?? false;
                      const isFull = hasLarge || total >= SLOT_CAPACITY;
                      if (isFull) {
                        disabledSlots.add(slot);
                        // block next 2 hours -> next 4 half-hour slots
                        for (let k = 1; k <= 4; k++) {
                          const next = TIME_SLOTS[idx + k];
                          if (next) disabledSlots.add(next);
                        }
                      }
                    });

                    return TIME_SLOTS.map((t_slot, idx) => {
                      const info = dayOccupancy[t_slot];
                      const total = info?.total ?? 0;
                      const hasLarge = info?.hasLarge ?? false;
                      const isFull = hasLarge || total >= SLOT_CAPACITY;
                      const disabled = disabledSlots.has(t_slot);

                      return (
                        <button
                          key={t_slot}
                          onClick={() => setTime(t_slot)}
                          disabled={disabled}
                          className={cn(
                            "py-3 text-[11px] border transition-all uppercase tracking-widest relative overflow-hidden",
                            disabled
                              ? "bg-stone-800 text-stone-600 border-border pointer-events-none opacity-60"
                              : time === t_slot
                                ? "bg-gold text-dark border-gold font-bold"
                                : "bg-dark text-stone-500 border-border hover:border-gold hover:text-stone-300"
                          )}
                        >
                          {t_slot}
                          {disabled && (
                            <span aria-hidden className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.03) 0 4px, transparent 4px 8px)' }} />
                          )}
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>

              <div className="space-y-6">
                <label className="text-[10px] uppercase tracking-widest text-stone-500 block">{t.resPartySize}</label>
                <div className="flex gap-3 flex-wrap">
                  {[1,2,3,4,5,6,7,8,9,10].map((n) => (
                    <button
                      key={n}
                      onClick={() => setGuests(n)}
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
              </div>

              <button
                disabled={!time}
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
                          <p className="text-stone-200 text-lg">{time}</p>
                       </div>
                    </div>
                 </div>
              </div>

              <button
                onClick={() => {
                  setStep(1);
                  setFormData({ name: "", email: "", phone: "" });
                  setTime("");
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
