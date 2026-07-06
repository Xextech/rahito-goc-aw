export const SLOT_CAPACITY = 20;
export const FULL_SINGLE_THRESHOLD = 10;

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

export default { computeDisabledSlots, isSlotFullInfo };
