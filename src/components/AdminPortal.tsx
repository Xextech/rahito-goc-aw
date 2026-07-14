import React, { useState, useEffect } from "react";
import { collection, query, onSnapshot, doc, updateDoc, serverTimestamp, orderBy } from "firebase/firestore";
import { signInWithPopup, signInWithCustomToken, GoogleAuthProvider, signOut } from "firebase/auth";
import { db, auth } from "../lib/firebase";
import { useLanguage } from "../context/LanguageContext";
import { Calendar as CalendarIcon, Users, Clock, Mail, Phone, Check, X, Shield, LogOut, ArrowRight, Table } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es, pl } from "date-fns/locale";
import { cn } from "../lib/utils";
import TableFlow from "./TableFlow";

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
  createdAt?: any;
}

export default function AdminPortal() {
  const { lang, t } = useLanguage();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passphrase, setPassphrase] = useState("");
  const [passphraseError, setPassphraseError] = useState(false);
  const [passphraseErrorMsg, setPassphraseErrorMsg] = useState<string | null>(null);
  const [passphraseLoading, setPassphraseLoading] = useState(false);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState<"list" | "tableflow">("list");
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const activeLocale = lang === "es" ? es : pl;

  // Track Auth state for Google Admin log-in AND passphrase-based custom-token
  // sign-in. Both paths result in a real Firebase Auth session so Firestore
  // security rules (which require request.auth) can trust either one —
  // the dashboard has no privileged path that bypasses the rules.
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setUserEmail(user.email);
        if (user.email === "bove.abt@gmail.com") {
          setIsAuthenticated(true);
          return;
        }
        try {
          const tokenResult = await user.getIdTokenResult();
          if (tokenResult.claims.owner === true) {
            setIsAuthenticated(true);
          }
        } catch (err) {
          console.error("Failed to read auth claims:", err);
        }
      } else {
        setUserEmail(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Passphrase login: verified server-side, never checked in client code.
  // Success mints a Firebase Auth custom token so the resulting session is
  // indistinguishable from a Google sign-in as far as Firestore rules go.
  const handlePassphraseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassphraseLoading(true);
    setPassphraseError(false);
    setPassphraseErrorMsg(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passphrase }),
      });
      if (!res.ok) {
        // Distinguish a genuinely wrong passphrase (401) from a server that
        // isn't ready yet (503) so the owner isn't misled into thinking the
        // password is wrong when the real issue is server configuration.
        const data = await res.json().catch(() => ({} as any));
        setPassphraseError(true);
        setPassphraseErrorMsg(res.status === 401 ? null : (data?.message || null));
        return;
      }
      const { token } = await res.json();
      await signInWithCustomToken(auth, token);
      // isAuthenticated is set by the onAuthStateChanged listener above
      // once it observes the `owner` claim on the resulting session.
    } catch (err) {
      console.error("Passphrase login failed:", err);
      setPassphraseError(true);
    } finally {
      setPassphraseLoading(false);
    }
  };

  // Google Login for bove.abt@gmail.com
  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      if (result.user?.email === "bove.abt@gmail.com") {
        setIsAuthenticated(true);
      } else {
        alert(t.adminGoogleOnlyAlert);
        await signOut(auth);
      }
    } catch (err) {
      console.error("Google Admin signin failed:", err);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setIsAuthenticated(false);
    setPassphrase("");
  };

  // Real-time listener for reservations when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;

    const reservationsRef = collection(db, "reservations");
    const q = query(reservationsRef, orderBy("date", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Reservation[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          name: data.name,
          email: data.email,
          phone: data.phone,
          date: data.date,
          time: data.time,
          guests: Number(data.guests),
          status: data.status || "confirmed",
          tableId: data.tableId || "",
          tableIds: Array.isArray(data.tableIds) ? data.tableIds : [],
          tableName: data.tableName || "",
          type: data.type || "table",
          createdAt: data.createdAt,
        });
      });
      setReservations(list);
    }, (err) => {
      console.error("Failed to load reservations in AdminPortal:", err);
    });

    return () => unsubscribe();
  }, [isAuthenticated]);

  // Update Reservation document in Firestore (used by TableFlow and others)
  const handleUpdateReservation = async (id: string, updates: Partial<Reservation>) => {
    const docRef = doc(db, "reservations", id);
    try {
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Error updating reservation:", err);
      alert(t.adminSaveTableError);
    }
  };

  // Update Status in Firestore
  const updateStatus = async (id: string, newStatus: "confirmed" | "cancelled") => {
    const docRef = doc(db, "reservations", id);
    try {
      await updateDoc(docRef, {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Error updating status:", err);
      alert(t.adminUpdateStatusError);
    }
  };

  // Stats Counters (Calculated for the currently selected date if filtered)
  const dayReservations = selectedDateFilter
    ? reservations.filter((r) => r.date === selectedDateFilter)
    : reservations;

  const stats = {
    total: dayReservations.length,
    pending: dayReservations.filter((r) => r.status === "pending").length,
    confirmed: dayReservations.filter((r) => r.status === "confirmed").length,
    cancelled: dayReservations.filter((r) => r.status === "cancelled").length,
  };

  // Filter list
  const filteredReservations = selectedDateFilter
    ? reservations.filter((r) => r.date === selectedDateFilter)
    : reservations;

  // Unique list of dates with reservations for the filter dropdown
  const uniqueDates = Array.from(new Set(reservations.map((r) => r.date))).sort();

  // Helper to change selectedDateFilter by offset (e.g. -1 day, +1 day)
  const handleDateOffset = (offset: number) => {
    const currentDate = selectedDateFilter ? new Date(`${selectedDateFilter}T12:00:00`) : new Date();
    const nextDate = new Date(currentDate.getTime() + offset * 24 * 60 * 60 * 1000);
    const nextDateStr = format(nextDate, "yyyy-MM-dd");
    setSelectedDateFilter(nextDateStr);
    setCalendarMonth(nextDate);
  };

  // Helper to generate calendar days for the mini-calendar grid
  const getCalendarDays = () => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const startOffset = (firstDay.getDay() + 6) % 7; // Monday = 0
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];

    // Fill in previous month trailing days
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = startOffset - 1; i >= 0; i--) {
      cells.push({
        day: prevMonthDays - i,
        isCurrentMonth: false,
        date: new Date(year, month - 1, prevMonthDays - i),
      });
    }

    // Fill in current month days
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({
        day: d,
        isCurrentMonth: true,
        date: new Date(year, month, d),
      });
    }

    // Fill in next month leading days to complete grid
    const totalCells = Math.ceil(cells.length / 7) * 7;
    const nextMonthDaysNeeded = totalCells - cells.length;
    for (let d = 1; d <= nextMonthDaysNeeded; d++) {
      cells.push({
        day: d,
        isCurrentMonth: false,
        date: new Date(year, month + 1, d),
      });
    }

    return cells;
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center px-6 py-20 relative overflow-hidden" id="admin-login-screen">
        <div className="absolute inset-0 bg-stone-900/10 z-0" />
        <div className="max-w-md w-full border border-border p-12 space-y-8 bg-stone-950 relative z-10">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 rounded-full border border-gold flex items-center justify-center text-gold mx-auto bg-gold/5">
              <Shield size={20} strokeWidth={1.5} />
            </div>
            <h2 className="text-3xl font-serif font-light tracking-tight italic text-stone-100">{t.adminTitle}</h2>
            <p className="text-[10px] uppercase tracking-[0.3em] text-stone-500">Głogów, Polska</p>
          </div>

          <form onSubmit={handlePassphraseSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-stone-500 block">{t.adminPasswordLabel}</label>
              <input
                required
                type="password"
                placeholder={t.adminPasswordPlaceholder}
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                className="w-full bg-stone-900 border border-border py-4 px-4 text-stone-200 focus:outline-none focus:border-gold transition-all font-mono text-center text-sm"
              />
              {passphraseError && (
                <p className="text-xs text-rose-500 font-light italic mt-1 text-center">{passphraseErrorMsg || t.adminInvalidPassword}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={passphraseLoading}
              className="w-full py-4 bg-stone-muted text-dark uppercase tracking-[0.3em] font-bold text-xs hover:bg-gold transition-colors disabled:opacity-50"
            >
              {t.adminBtnLogin}
            </button>
          </form>

          <div className="relative flex py-4 items-center">
            <div className="flex-grow border-t border-border"></div>
            <span className="flex-shrink mx-4 text-[9px] uppercase tracking-widest text-stone-600">{t.adminOrSeparator}</span>
            <div className="flex-grow border-t border-border"></div>
          </div>

          <button
            onClick={handleGoogleLogin}
            className="w-full py-4 border border-border text-stone-300 uppercase tracking-widest text-[9px] hover:border-gold hover:text-stone-100 transition-all flex items-center justify-center gap-3"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            {t.adminGoogleBtn}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark py-32 px-6 border-t border-border" id="admin-dashboard">
      <div className="max-w-7xl mx-auto space-y-16">
        
        {/* Header bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-border pb-10">
          <div className="space-y-2">
            <div className="flex items-center gap-3 font-serif italic text-gold text-sm uppercase tracking-widest text-emerald-500">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              {t.adminTitle}
            </div>
            <h1 className="text-4xl md:text-5xl font-serif font-light tracking-tight text-stone-100">Rahito Głogów</h1>
            <p className="text-[10px] text-stone-600 uppercase tracking-widest">
              {t.adminActiveSessionLabel} {userEmail ? `(${userEmail})` : `(${t.adminPassphraseSessionLabel})`}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="px-6 py-3 border border-border text-[9px] uppercase tracking-widest text-stone-500 hover:text-gold hover:border-gold transition-all flex items-center gap-2"
          >
            <LogOut size={12} />
            {t.adminBtnLogout}
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-10 items-start">
          
          {/* Left Column: Mini Calendar & Date Navigation */}
          <div className="w-full lg:w-80 shrink-0 space-y-6">
            <div className="border border-border p-6 bg-stone-950/60 space-y-6">
              <div className="flex justify-between items-center pb-4 border-b border-border">
                <h3 className="font-serif text-sm tracking-widest uppercase text-gold">
                  {lang === "es" ? "Calendario de Ocupación" : "Kalendarz obłożenia"}
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                    className="p-1 hover:text-gold transition-colors text-xs"
                  >
                    ◀
                  </button>
                  <span className="text-xs font-mono font-bold capitalize">
                    {lang === "es"
                      ? ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"][calendarMonth.getMonth()]
                      : ["Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec", "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"][calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
                  </span>
                  <button
                    onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                    className="p-1 hover:text-gold transition-colors text-xs"
                  >
                    ▶
                  </button>
                </div>
              </div>

              {/* Weekday headers */}
              <div className="grid grid-cols-7 gap-1 text-center">
                {(lang === "es" ? ["L", "M", "X", "J", "V", "S", "D"] : ["P", "W", "Ś", "C", "P", "S", "N"]).map((day) => (
                  <div key={day} className="text-[9px] text-stone-600 font-bold uppercase py-1">
                    {day}
                  </div>
                ))}
                
                {/* Calendar Days */}
                {getCalendarDays().map((cell, idx) => {
                  const dateStr = format(cell.date, "yyyy-MM-dd");
                  const isSelected = selectedDateFilter === dateStr;
                  const dayBookings = reservations.filter((r) => r.date === dateStr && r.status !== "cancelled");
                  const hasPrivateEvent = dayBookings.some((r) => r.type === "event");
                  const totalGuests = dayBookings.reduce((sum, r) => sum + r.guests, 0);

                  // Dot color determination
                  let dotColorClass = "";
                  if (hasPrivateEvent) {
                    dotColorClass = "bg-purple-500";
                  } else if (dayBookings.length >= 6 || totalGuests >= 20) {
                    dotColorClass = "bg-rose-500";
                  } else if (dayBookings.length >= 3) {
                    dotColorClass = "bg-amber-500";
                  } else if (dayBookings.length > 0) {
                    dotColorClass = "bg-emerald-500";
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        setSelectedDateFilter(dateStr);
                        setCalendarMonth(cell.date);
                      }}
                      className={cn(
                        "aspect-square text-xs transition-all relative flex flex-col items-center justify-center border",
                        cell.isCurrentMonth
                          ? isSelected
                            ? "border-gold text-gold font-bold bg-gold/10"
                            : "border-transparent text-stone-400 hover:border-gold/50"
                          : "border-transparent text-stone-700 hover:border-gold/30 opacity-40"
                      )}
                    >
                      <span>{cell.day}</span>
                      {dotColorClass && (
                        <span className={cn("w-1 h-1 rounded-full absolute bottom-1", dotColorClass)} />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-x-3 gap-y-1.5 pt-4 border-t border-border text-[9px] uppercase tracking-wider text-stone-500 justify-center">
                <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {lang === "es" ? "Bajo" : "Niski"}</div>
                <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> {lang === "es" ? "Medio" : "Średni"}</div>
                <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> {lang === "es" ? "Alto" : "Wysoki"}</div>
                <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-purple-500" /> {lang === "es" ? "Evento" : "Wydarzenie"}</div>
              </div>
            </div>

            {/* Date Display and Offset Buttons */}
            <div className="border border-border p-6 bg-stone-950/40 space-y-4">
              <div className="text-center space-y-1">
                <p className="text-[10px] uppercase tracking-widest text-stone-500">
                  {lang === "es" ? "Fecha Seleccionada" : "Wybrana data"}
                </p>
                <p className="font-serif text-base italic text-stone-200 capitalize">
                  {selectedDateFilter 
                    ? format(new Date(`${selectedDateFilter}T12:00:00`), "eeee, d 'de' MMMM", { locale: activeLocale })
                    : (lang === "es" ? "Ninguna" : "Brak")}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleDateOffset(-1)}
                  className="flex-1 py-2 border border-border text-xs hover:border-gold hover:text-gold transition-all"
                  title={lang === "es" ? "Día Anterior" : "Poprzedni dzień"}
                >
                  ◀
                </button>
                <button
                  onClick={() => {
                    const todayStr = format(new Date(), "yyyy-MM-dd");
                    setSelectedDateFilter(todayStr);
                    setCalendarMonth(new Date());
                  }}
                  className="px-4 py-2 border border-gold bg-gold/5 text-gold text-[10px] uppercase tracking-widest font-bold hover:bg-gold hover:text-dark transition-all"
                >
                  {lang === "es" ? "Hoy" : "Dziś"}
                </button>
                <button
                  onClick={() => handleDateOffset(1)}
                  className="flex-1 py-2 border border-border text-xs hover:border-gold hover:text-gold transition-all"
                  title={lang === "es" ? "Día Siguiente" : "Następny dzień"}
                >
                  ▶
                </button>
              </div>
              <div className="pt-2 border-t border-border flex justify-between items-center">
                <button
                  onClick={() => setSelectedDateFilter("")}
                  className="text-[9px] uppercase tracking-widest text-stone-500 hover:text-gold transition-colors mx-auto"
                >
                  {lang === "es" ? "📁 Ver todas las fechas" : "📁 Pokaż wszystkie daty"}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Dashboard Stats & Lists */}
          <div className="flex-1 w-full space-y-10">

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="border border-border p-6 bg-stone-900/10 space-y-3">
                <p className="text-[10px] uppercase tracking-widest text-stone-600">{t.adminHeaderStatTotal}</p>
                <p className="text-4xl font-serif text-stone-300 font-light">{stats.total}</p>
              </div>
              <div className="border border-border p-6 bg-stone-900/10 space-y-3">
                <p className="text-[10px] uppercase tracking-widest text-yellow-600">{t.adminHeaderStatPending}</p>
                <p className="text-4xl font-serif text-gold font-light">{stats.pending}</p>
              </div>
              <div className="border border-border p-6 bg-stone-900/10 space-y-3">
                <p className="text-[10px] uppercase tracking-widest text-emerald-600">{t.adminHeaderStatConfirmed}</p>
                <p className="text-4xl font-serif text-emerald-500 font-light">{stats.confirmed}</p>
              </div>
              <div className="border border-border p-6 bg-stone-900/10 space-y-3">
                <p className="text-[10px] uppercase tracking-widest text-rose-600">{t.adminHeaderStatCancelled}</p>
                <p className="text-4xl font-serif text-rose-500 font-light">{stats.cancelled}</p>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-border gap-6">
              <button
                onClick={() => setActiveTab("list")}
                className={cn(
                  "pb-4 text-xs font-serif uppercase tracking-widest font-bold border-b-2 transition-all flex items-center gap-2",
                  activeTab === "list"
                    ? "border-gold text-gold"
                    : "border-transparent text-stone-500 hover:text-stone-300"
                )}
              >
                📋 {t.adminTabListLabel}
              </button>
              <button
                onClick={() => {
                  setActiveTab("tableflow");
                  // TableFlow requires a reference date. If none is filtered, default to today
                  if (!selectedDateFilter) {
                    const todayStr = format(new Date(), "yyyy-MM-dd");
                    setSelectedDateFilter(todayStr);
                  }
                }}
                className={cn(
                  "pb-4 text-xs font-serif uppercase tracking-widest font-bold border-b-2 transition-all flex items-center gap-2",
                  activeTab === "tableflow"
                    ? "border-gold text-gold"
                    : "border-transparent text-stone-500 hover:text-stone-300"
                )}
              >
                📐 TableFlow ({t.adminTabFlowLabel})
              </button>
            </div>

            {activeTab === "list" ? (
              <div className="space-y-8">
                {/* Filters and View Toggles */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 bg-stone-900/20 p-6 border border-border">
                  <div className="flex items-center gap-4 flex-wrap">
                    <span className="text-[10px] uppercase tracking-widest text-stone-500">{lang === "es" ? "Filtro" : "Filtr"} / {t.resDate}:</span>
                    <select
                      value={selectedDateFilter}
                      onChange={(e) => setSelectedDateFilter(e.target.value)}
                      className="bg-stone-950 border border-border px-4 py-2 text-xs text-stone-300 focus:outline-none focus:border-gold capitalize"
                    >
                  <option value="">{t.adminAllDates}</option>
                  {uniqueDates.map((dateStr) => {
                    const parsedDate = new Date(`${dateStr}T12:00:00`);
                    return (
                      <option key={dateStr} value={dateStr}>
                        {format(parsedDate, "eeee, d MMMM yyyy", { locale: activeLocale })}
                      </option>
                    );
                  })}
                </select>
                {selectedDateFilter && (
                  <button 
                    onClick={() => setSelectedDateFilter("")}
                    className="text-[9px] uppercase tracking-widest text-gold hover:underline"
                  >
                    {t.adminClearFilter}
                  </button>
                )}
              </div>
            </div>

            {/* Main List */}
            <div className="border border-border bg-stone-950/40 overflow-hidden">
              {filteredReservations.length === 0 ? (
                <div className="py-24 text-center space-y-4">
                  <Table size={40} className="text-stone-700 mx-auto" />
                  <p className="text-stone-500 font-light text-sm italic">{t.adminNoReservations}</p>
                </div>
              ) : (
                <div>
                  {/* Desktop Table View */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-border bg-stone-900/20 text-stone-500 text-[10px] uppercase tracking-widest">
                          <th className="py-5 px-8 font-semibold">{t.adminColClient}</th>
                          <th className="py-5 px-8 font-semibold">{t.adminColDetails}</th>
                          <th className="py-5 px-8 font-semibold">{t.adminColStatus}</th>
                          <th className="py-5 px-8 text-right font-semibold">{t.adminColActions}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filteredReservations.map((res) => {
                          const parsedDate = new Date(`${res.date}T12:00:00`);
                          return (
                            <tr key={res.id} className="group hover:bg-stone-900/10 transition-colors">
                              <td className="py-6 px-8 space-y-2">
                                <h4 className="text-stone-200 font-serif text-base italic flex items-center gap-2">
                                  {res.name}
                                  {res.type === "event" && (
                                    <span className="text-[9px] font-sans font-bold uppercase bg-purple-500/10 text-purple-400 border border-purple-500/30 px-2 py-0.5 rounded-full">
                                      {t.adminBadgeEvent}
                                    </span>
                                  )}
                                  {res.tableName && (
                                    <span className="text-[9px] font-sans font-normal uppercase bg-gold/10 text-gold border border-gold/20 px-2 py-0.5 rounded-full">
                                      {res.tableName}
                                    </span>
                                  )}
                                </h4>
                                <div className="flex flex-col gap-1 text-[10px] text-stone-600 font-mono">
                                  <span className="flex items-center gap-1.5 hover:text-gold transition-colors">
                                    <Mail size={10} /> {res.email}
                                  </span>
                                  <span className="flex items-center gap-1.5 hover:text-gold transition-colors">
                                    <Phone size={10} /> {res.phone}
                                  </span>
                                </div>
                              </td>
                              <td className="py-6 px-8 space-y-2">
                                <div className="flex items-center gap-4 text-stone-300 text-sm">
                                  <span className="flex items-center gap-1.5 bg-stone-900 px-2.5 py-1 text-xs border border-border">
                                    <CalendarIcon size={12} className="text-gold" />
                                    <span className="capitalize">{format(parsedDate, "MMM d", { locale: activeLocale })}</span>
                                  </span>
                                  <span className="flex items-center gap-1.5 bg-stone-900 px-2.5 py-1 text-xs border border-border">
                                    <Clock size={12} className="text-gold" />
                                    {res.type === "event" ? t.resEventFullDay : res.time}
                                  </span>
                                  <span className="flex items-center gap-1.5 bg-stone-900 px-2.5 py-1 text-xs border border-border">
                                    <Users size={12} className="text-gold" />
                                    {res.guests} {t.adminGuestsUnit}
                                  </span>
                                </div>
                                <span className="text-[9px] uppercase text-stone-700 tracking-wider block font-mono">Ref ID: {res.id.slice(-8)}</span>
                              </td>
                              <td className="py-6 px-8">
                                <span className={cn(
                                  "inline-flex items-center gap-1.5 text-[9px] uppercase tracking-widest px-3 py-1.5 font-bold border rounded-full",
                                  res.status === "confirmed" 
                                    ? "bg-emerald-500/5 text-emerald-500 border-emerald-500/20" 
                                    : res.status === "cancelled" 
                                    ? "bg-rose-500/5 text-rose-500 border-rose-500/20" 
                                    : "bg-yellow-500/5 text-yellow-500 border-yellow-500/20"
                                )}>
                                  <span className={cn(
                                    "w-1 h-1 rounded-full",
                                    res.status === "confirmed" ? "bg-emerald-500" : res.status === "cancelled" ? "bg-rose-500" : "bg-gold"
                                  )} />
                                  {res.status === "confirmed"
                                    ? t.adminStatusConfirmed
                                    : res.status === "cancelled"
                                    ? t.adminStatusCancelled
                                    : t.adminStatusPending}
                                </span>
                              </td>
                              <td className="py-6 px-8 text-right">
                                <div className="inline-flex gap-3">
                                  {res.status !== "confirmed" && (
                                    <button
                                      onClick={() => updateStatus(res.id, "confirmed")}
                                      className="p-2 border border-border text-stone-600 hover:text-emerald-500 hover:border-emerald-500 transition-all rounded"
                                      title={t.adminBtnConfirm}
                                    >
                                      <Check size={14} />
                                    </button>
                                  )}
                                  {res.status !== "cancelled" && (
                                    <button
                                      onClick={() => updateStatus(res.id, "cancelled")}
                                      className="p-2 border border-border text-stone-600 hover:text-rose-500 hover:border-rose-500 transition-all rounded"
                                      title={t.adminBtnCancel}
                                    >
                                      <X size={14} />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Mobile Card View */}
                  <div className="md:hidden divide-y divide-border">
                    {filteredReservations.map((res) => {
                      const parsedDate = new Date(`${res.date}T12:00:00`);
                      return (
                        <div key={res.id} className="p-6 space-y-4 hover:bg-stone-900/10 transition-colors">
                          <div className="flex justify-between items-start gap-4">
                            <div className="space-y-1">
                              <h4 className="text-stone-200 font-serif text-base italic flex items-center gap-1.5 flex-wrap">
                                {res.name}
                                {res.type === "event" && (
                                  <span className="text-[9px] font-sans font-bold uppercase bg-purple-500/10 text-purple-400 border border-purple-500/30 px-2 py-0.5 rounded-full">
                                    {t.adminBadgeEvent}
                                  </span>
                                )}
                                {res.tableName && (
                                  <span className="text-[9px] font-sans font-normal uppercase bg-gold/10 text-gold border border-gold/20 px-2 py-0.5 rounded-full">
                                    {res.tableName}
                                  </span>
                                )}
                              </h4>
                              <div className="text-[10px] text-stone-600 font-mono space-y-1 mt-1">
                                <a href={`mailto:${res.email}`} className="flex items-center gap-1.5 hover:text-gold transition-colors">
                                  <Mail size={10} /> {res.email}
                                </a>
                                <a href={`tel:${res.phone}`} className="flex items-center gap-1.5 hover:text-gold transition-colors">
                                  <Phone size={10} /> {res.phone}
                                </a>
                              </div>
                            </div>
                            <span className={cn(
                              "inline-flex items-center gap-1 text-[9px] uppercase tracking-widest px-2.5 py-1 font-bold border rounded-full shrink-0",
                              res.status === "confirmed" 
                                ? "bg-emerald-500/5 text-emerald-500 border-emerald-500/20" 
                                : res.status === "cancelled" 
                                ? "bg-rose-500/5 text-rose-500 border-rose-500/20" 
                                : "bg-yellow-500/5 text-yellow-500 border-yellow-500/20"
                            )}>
                              <span className={cn(
                                "w-1 h-1 rounded-full",
                                res.status === "confirmed" ? "bg-emerald-500" : res.status === "cancelled" ? "bg-rose-500" : "bg-gold"
                              )} />
                              {res.status === "confirmed"
                                ? t.adminStatusConfirmedShort
                                : res.status === "cancelled"
                                ? t.adminStatusCancelledShort
                                : t.adminStatusPendingShort}
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-2 text-stone-300 text-[11px]">
                            <span className="flex items-center gap-1 bg-stone-900 px-2 py-0.5 border border-border rounded">
                              <CalendarIcon size={10} className="text-gold" />
                              <span className="capitalize">{format(parsedDate, "MMM d", { locale: activeLocale })}</span>
                            </span>
                            <span className="flex items-center gap-1 bg-stone-900 px-2 py-0.5 border border-border rounded">
                              <Clock size={10} className="text-gold" />
                              {res.type === "event" ? t.resEventFullDay : res.time}
                            </span>
                            <span className="flex items-center gap-1 bg-stone-900 px-2 py-0.5 border border-border rounded">
                              <Users size={10} className="text-gold" />
                              {res.guests} {t.adminGuestsUnitShort}
                            </span>
                          </div>

                          <div className="flex justify-between items-center pt-3 border-t border-border/40">
                            <span className="text-[9px] uppercase text-stone-700 tracking-wider font-mono">Ref: {res.id.slice(-8)}</span>
                            <div className="flex gap-2">
                              {res.status !== "confirmed" && (
                                <button
                                  onClick={() => updateStatus(res.id, "confirmed")}
                                  className="px-3 py-1.5 border border-border text-stone-400 hover:text-emerald-500 hover:border-emerald-500 transition-all rounded text-[10px] uppercase tracking-widest flex items-center gap-1"
                                >
                                  <Check size={11} />
                                  <span>{t.adminBtnConfirm}</span>
                                </button>
                              )}
                              {res.status !== "cancelled" && (
                                <button
                                  onClick={() => updateStatus(res.id, "cancelled")}
                                  className="px-3 py-1.5 border border-border text-stone-400 hover:text-rose-500 hover:border-rose-500 transition-all rounded text-[10px] uppercase tracking-widest flex items-center gap-1"
                                >
                                  <X size={11} />
                                  <span>{t.adminBtnCancel}</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <TableFlow 
            reservations={reservations} 
            selectedDate={selectedDateFilter || format(new Date(), "yyyy-MM-dd")} 
            onUpdateReservation={handleUpdateReservation} 
          />
        )}
        </div> {/* Closes flex-1 */}
        </div> {/* Closes flex columns wrapper */}
      </div>
    </div>
  );
}
