export const SLOT_CAPACITY = 20;
export const FULL_SINGLE_THRESHOLD = 10;

export interface TableDef {
  id: string;
  name: string;
  seats: number;
  x: number;
  y: number;
  shape: "round" | "square" | "counter";
}

export interface TableSuggestion {
  tables: TableDef[];
  description: { es: string; pl: string };
  totalTables: number;
  peakGuests: number;
  peakTime: string;
  totalParties: number;
  hasLargeParty: boolean;
}

/**
 * Given a map of occupancy for a date (time -> { total, hasLarge }) and ordered timeSlots,
 * returns a Set of disabled slot strings (including follow-up blocked slots).
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

/**
 * Analyze confirmed reservations for a day and suggest the optimal table layout.
 *
 * Logic:
 *  - Find the peak time slot (maximum concurrent guests).
 *  - If any party >= FULL_SINGLE_THRESHOLD (10): create large table(s) at centre,
 *    and smaller tables around the edges. The room fits fewer total tables.
 *  - Otherwise: create one table per party, arranged in a grid, sized to fit.
 *  - If no reservations exist, return the default layout as-is.
 */
export function computeDayTableSuggestion(
  dayReservations: { guests: number; time: string; status: string }[],
  defaultTables: TableDef[]
): TableSuggestion {
  const confirmed = dayReservations.filter((r) => r.status === "confirmed");
  const empty: TableSuggestion = {
    tables: defaultTables,
    description: { es: "No hay reservas. Se muestra la configuración por defecto.", pl: "Brak rezerwacji. Domyślny układ." },
    totalTables: defaultTables.length,
    peakGuests: 0,
    peakTime: "",
    totalParties: 0,
    hasLargeParty: false,
  };

  if (confirmed.length === 0) return empty;

  // Group by time slot to find peak
  const slotGroups: Record<string, { guests: number; time: string }[]> = {};
  confirmed.forEach((r) => {
    if (!slotGroups[r.time]) slotGroups[r.time] = [];
    slotGroups[r.time].push(r);
  });

  let peakSlot = "";
  let peakTotal = 0;
  for (const [slot, group] of Object.entries(slotGroups)) {
    const total = group.reduce((s, r) => s + r.guests, 0);
    if (total > peakTotal) {
      peakTotal = total;
      peakSlot = slot;
    }
  }

  const peakParties = slotGroups[peakSlot] || [];
  const sorted = [...peakParties].sort((a, b) => b.guests - a.guests);
  const hasLarge = sorted.some((r) => r.guests >= FULL_SINGLE_THRESHOLD);

  const tables: TableDef[] = [];

  if (hasLarge) {
    // ── Large-party mode ──────────────────────────────────
    // A large (≥10) table takes extra floor space, so fewer tables fit.
    // Place the large table(s) in the centre, small tables around.
    const largeParties = sorted.filter((r) => r.guests >= FULL_SINGLE_THRESHOLD);
    const otherParties = sorted.filter((r) => r.guests < FULL_SINGLE_THRESHOLD);

    largeParties.forEach((p, i) => {
      const seats = Math.min(12, Math.max(10, Math.ceil(p.guests / 2) * 2));
      tables.push({
        id: `auto_large_${i}`,
        name: i === 0 ? "Mesa Privada" : "Mesa Grande",
        seats,
        x: 50,
        y: 25 + i * 20,
        shape: "square",
      });
    });

    otherParties.forEach((p, i) => {
      const seats = Math.min(6, Math.max(2, Math.ceil(p.guests / 2) * 2));
      tables.push({
        id: `auto_std_${i}`,
        name: `Mesa ${i + 1}`,
        seats,
        x: 20 + (i % 3) * 30,
        y: 70 + Math.floor(i / 3) * 5,
        shape: seats >= 4 ? "square" : "round",
      });
    });
  } else {
    // ── Standard mode ─────────────────────────────────────
    // Each party gets its own table, sized appropriately.
    const cols = Math.min(3, sorted.length);
    const spacing = cols > 1 ? Math.floor(70 / (cols - 1)) : 0;
    const yRows = [25, 50, 70];

    sorted.forEach((p, i) => {
      const col = i % cols;
      const row = Math.min(Math.floor(i / cols), yRows.length - 1);
      const seats = Math.min(6, Math.max(2, Math.ceil(p.guests / 2) * 2));
      tables.push({
        id: `auto_std_${i}`,
        name: `Mesa ${i + 1}`,
        seats,
        x: 15 + col * spacing,
        y: yRows[row],
        shape: seats >= 4 ? "square" : "round",
      });
    });
  }

  return {
    tables,
    description: {
      es: `${tables.length} mesas sugeridas para ${sorted.length} grupo(s) (${peakTotal} personas en hora punta a las ${peakSlot}).${hasLarge ? " Se ha reservado una mesa grande." : ""}`,
      pl: `Sugerowano ${tables.length} stolików dla ${sorted.length} grup(y) (${peakTotal} osób w szczycie o ${peakSlot}).${hasLarge ? " Zarezerwowano duży stół." : ""}`,
    },
    totalTables: tables.length,
    peakGuests: peakTotal,
    peakTime: peakSlot,
    totalParties: sorted.length,
    hasLargeParty: hasLarge,
  };
}

export default { computeDisabledSlots, isSlotFullInfo, computeDayTableSuggestion };
