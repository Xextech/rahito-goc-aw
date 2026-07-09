export const SLOT_CAPACITY = 20;
export const FULL_SINGLE_THRESHOLD = 10;
// Cada reserva ocupa su mesa durante una franja mínima de 2 horas
export const RESERVATION_DURATION_MIN = 120;

export interface TableDef {
  id: string;
  name: string;
  seats: number;
  x: number;
  y: number;
  shape: "round" | "square" | "counter";
}

// Distribución inicial del restaurante: 5 mesas de 4 personas (20 pax interior)
export const DEFAULT_TABLES: TableDef[] = [
  { id: "mesa_1", name: "Mesa 1", seats: 4, x: 22, y: 25, shape: "square" },
  { id: "mesa_2", name: "Mesa 2", seats: 4, x: 50, y: 25, shape: "square" },
  { id: "mesa_3", name: "Mesa 3", seats: 4, x: 78, y: 25, shape: "square" },
  { id: "mesa_4", name: "Mesa 4", seats: 4, x: 35, y: 65, shape: "square" },
  { id: "mesa_5", name: "Mesa 5", seats: 4, x: 65, y: 65, shape: "square" },
];

export const FULL_RESTAURANT_LABEL = "Restaurante completo";

export interface ReservationSlot {
  time: string;
  guests: number;
  status: string;
  tableIds?: string[];
  tableId?: string;
  type?: string; // "table" | "event"
}

export interface TableAssignment {
  tableIds: string[];
  tableName: string;
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Una mesa ocupada por una reserva que empieza a `existingTime` permanece
 * bloqueada durante los `durationMin` (2h) siguientes. La franja se
 * bloquea únicamente hacia ADELANTE: una reserva a las 21:00 no impide
 * reservar la misma mesa a las 19:00 (esa reserva anterior ya habría
 * liberado la mesa antes de las 21:00).
 */
export function blocksSlot(existingTime: string, candidateTime: string, durationMin = RESERVATION_DURATION_MIN): boolean {
  const existing = timeToMinutes(existingTime);
  const candidate = timeToMinutes(candidateTime);
  return candidate >= existing && candidate < existing + durationMin;
}

export function isActiveReservation(r: { status: string }): boolean {
  return r.status !== "cancelled";
}

export function getReservationTableIds(r: ReservationSlot): string[] {
  if (Array.isArray(r.tableIds) && r.tableIds.length > 0) return r.tableIds;
  if (r.tableId) return [r.tableId];
  return [];
}

/** Un evento privado reserva el restaurante entero y bloquea el día completo. */
export function hasFullDayEvent(dayReservations: ReservationSlot[]): boolean {
  return dayReservations.some((r) => isActiveReservation(r) && r.type === "event");
}

/**
 * Mesas ocupadas para una hora dada, considerando la ventana de 2 horas.
 * Un grupo grande (>= 10) o un evento bloquean todas las mesas: las 2 mesas
 * restantes no se pueden usar por falta de espacio.
 */
export function getOccupiedTableIds(
  dayReservations: ReservationSlot[],
  time: string,
  tables: TableDef[]
): Set<string> {
  const occupied = new Set<string>();
  for (const r of dayReservations) {
    if (!isActiveReservation(r)) continue;
    if (r.type === "event") {
      tables.forEach((t) => occupied.add(t.id));
      continue;
    }
    if (!blocksSlot(r.time, time)) continue;
    if (r.guests >= FULL_SINGLE_THRESHOLD) {
      tables.forEach((t) => occupied.add(t.id));
      continue;
    }
    getReservationTableIds(r).forEach((id) => occupied.add(id));
  }
  return occupied;
}

/** Elige el mínimo de mesas libres que acomode al grupo (mejor ajuste). */
function pickTables(freeTables: TableDef[], guests: number): TableDef[] | null {
  // 1. La mesa individual más pequeña donde quepa el grupo
  const single = freeTables
    .filter((t) => t.seats >= guests)
    .sort((a, b) => a.seats - b.seats)[0];
  if (single) return [single];

  // 2. Combinar mesas (las más grandes primero) hasta cubrir el grupo
  const sorted = [...freeTables].sort((a, b) => b.seats - a.seats);
  const picked: TableDef[] = [];
  let capacity = 0;
  for (const t of sorted) {
    picked.push(t);
    capacity += t.seats;
    if (capacity >= guests) return picked;
  }
  return null;
}

/**
 * Asigna automáticamente mesa(s) a una nueva reserva.
 *
 *  - Respeta la franja de 2 horas: una mesa reservada no se libera hasta
 *    2 horas después de la hora de la reserva.
 *  - Grupos >= 10 necesitan el restaurante entero (las mesas sobrantes
 *    quedan bloqueadas por falta de espacio).
 *  - Un evento privado bloquea el día completo.
 *
 * Devuelve null si no hay disponibilidad.
 */
export function autoAssignTables(
  dayReservations: ReservationSlot[],
  tables: TableDef[],
  time: string,
  guests: number
): TableAssignment | null {
  if (tables.length === 0 || guests <= 0) return null;

  const active = dayReservations.filter(isActiveReservation);
  if (active.some((r) => r.type === "event")) return null;

  const occupied = getOccupiedTableIds(active, time, tables);
  let free = tables.filter((t) => !occupied.has(t.id));

  // Reservas solapadas sin mesa asignada (p. ej. antiguas): reservarles
  // capacidad virtualmente para no sobrevender el salón.
  const unassignedOverlapping = active.filter(
    (r) =>
      r.type !== "event" &&
      r.guests < FULL_SINGLE_THRESHOLD &&
      blocksSlot(r.time, time) &&
      getReservationTableIds(r).length === 0
  );
  for (const r of unassignedOverlapping) {
    const virtual = pickTables(free, r.guests);
    if (!virtual) return null; // salón sobrevendido: no aceptar más
    const virtualIds = new Set(virtual.map((t) => t.id));
    free = free.filter((t) => !virtualIds.has(t.id));
  }

  if (guests >= FULL_SINGLE_THRESHOLD) {
    // El grupo grande ocupa el restaurante entero: todas las mesas libres
    if (free.length !== tables.length) return null;
    return {
      tableIds: tables.map((t) => t.id),
      tableName: FULL_RESTAURANT_LABEL,
    };
  }

  const picked = pickTables(free, guests);
  if (!picked) return null;
  return {
    tableIds: picked.map((t) => t.id),
    tableName: picked.map((t) => t.name).join(" + "),
  };
}

export function canFitParty(
  dayReservations: ReservationSlot[],
  tables: TableDef[],
  time: string,
  guests: number
): boolean {
  return autoAssignTables(dayReservations, tables, time, guests) !== null;
}

/**
 * Horas deshabilitadas para un grupo dado: aquellas en las que ninguna
 * combinación de mesas libres puede acomodarlo (ventana de 2h incluida).
 */
export function computeDisabledSlotsForParty(
  dayReservations: ReservationSlot[],
  tables: TableDef[],
  timeSlots: string[],
  guests: number
): Set<string> {
  const disabled = new Set<string>();
  for (const slot of timeSlots) {
    if (!canFitParty(dayReservations, tables, slot, guests)) disabled.add(slot);
  }
  return disabled;
}

/** Día completo sin hueco para el grupo: se marca ocupado en el calendario. */
export function isDayFullyBooked(
  dayReservations: ReservationSlot[],
  tables: TableDef[],
  timeSlots: string[],
  guests: number
): boolean {
  return timeSlots.every((slot) => !canFitParty(dayReservations, tables, slot, guests));
}

/**
 * (Legado) Ocupación agregada por franjas: una franja llena bloquea también
 * las 4 siguientes (2 horas).
 */
export function computeDisabledSlots(
  dayOccupancy: Record<string, { total: number; hasLarge: boolean }>,
  timeSlots: string[],
  followUpSlots = 4
): Set<string> {
  const disabled = new Set<string>();
  timeSlots.forEach((slot, idx) => {
    const info = dayOccupancy[slot];
    const total = info?.total ?? 0;
    const hasLarge = info?.hasLarge ?? false;
    const isFull = hasLarge || total >= SLOT_CAPACITY;
    if (isFull) {
      disabled.add(slot);
      for (let k = 1; k <= followUpSlots; k++) {
        const next = timeSlots[idx + k];
        if (next) disabled.add(next);
      }
    }
  });
  return disabled;
}

export function isSlotFullInfo(info?: { total: number; hasLarge: boolean }) {
  if (!info) return false;
  return info.hasLarge || info.total >= SLOT_CAPACITY;
}

export default {
  computeDisabledSlots,
  isSlotFullInfo,
  autoAssignTables,
  canFitParty,
  computeDisabledSlotsForParty,
  isDayFullyBooked,
  hasFullDayEvent,
  getOccupiedTableIds,
  getReservationTableIds,
  blocksSlot,
  timeToMinutes,
};
