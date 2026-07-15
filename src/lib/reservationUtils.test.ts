import { describe, it, expect } from 'vitest';
import {
  computeDisabledSlots,
  autoAssignTables,
  computeDisabledSlotsForParty,
  hasFullDayEvent,
  isDayFullyBooked,
  DEFAULT_TABLES,
  FULL_RESTAURANT_LABEL,
  ReservationSlot,
} from './reservationUtils';

describe('computeDisabledSlots (legacy aggregate)', () => {
  it('blocks next 4 slots after a slot filled by total >= 20', () => {
    const timeSlots = ['08:00','08:30','09:00','09:30','10:00','10:30','11:00'];
    const occupancy: Record<string, { total: number; hasLarge: boolean }> = {
      '09:00': { total: 20, hasLarge: false }
    };
    const disabled = computeDisabledSlots(occupancy, timeSlots, 4);
    expect(disabled.has('09:00')).toBe(true);
    expect(disabled.has('09:30')).toBe(true);
    expect(disabled.has('10:00')).toBe(true);
    expect(disabled.has('10:30')).toBe(true);
    expect(disabled.has('11:00')).toBe(true);
  });

  it('treats single large reservation (hasLarge) as full and blocks follow-ups', () => {
    const timeSlots = ['08:00','08:30','09:00','09:30'];
    const occupancy: Record<string, { total: number; hasLarge: boolean }> = {
      '08:30': { total: 5, hasLarge: true }
    };
    const disabled = computeDisabledSlots(occupancy, timeSlots, 2);
    expect(disabled.has('08:30')).toBe(true);
    expect(disabled.has('09:00')).toBe(true);
    expect(disabled.has('09:30')).toBe(true);
  });
});

describe('DEFAULT_TABLES', () => {
  it('has 5 tables of 4 seats (20 pax total)', () => {
    expect(DEFAULT_TABLES).toHaveLength(5);
    expect(DEFAULT_TABLES.every(t => t.seats === 4)).toBe(true);
    expect(DEFAULT_TABLES.reduce((s, t) => s + t.seats, 0)).toBe(20);
  });
});

describe('autoAssignTables', () => {
  it('assigns the smallest single table that fits an empty day', () => {
    const result = autoAssignTables([], DEFAULT_TABLES, '19:00', 2);
    expect(result).not.toBeNull();
    expect(result!.tableIds).toHaveLength(1);
  });

  it('combines two tables for a party of 5-8', () => {
    const result = autoAssignTables([], DEFAULT_TABLES, '19:00', 6);
    expect(result).not.toBeNull();
    expect(result!.tableIds).toHaveLength(2);
    expect(result!.tableName).toContain('+');
  });

  it('does not reuse a table within the 2-hour window after its reservation', () => {
    const existing: ReservationSlot[] = [
      { time: '19:00', guests: 4, status: 'confirmed', tableIds: ['mesa_1'] },
    ];
    const at2030 = autoAssignTables(existing, DEFAULT_TABLES, '20:30', 4);
    expect(at2030).not.toBeNull();
    expect(at2030!.tableIds).not.toContain('mesa_1');

    // 21:00 is exactly 2h later: mesa_1 is free again
    const at2100 = autoAssignTables(existing, DEFAULT_TABLES, '21:00', 4);
    expect(at2100).not.toBeNull();
  });

  it('only blocks forward: a table booked at 19:00 stays available earlier the same day', () => {
    const existing: ReservationSlot[] = [
      { time: '19:00', guests: 4, status: 'confirmed', tableIds: ['mesa_1'] },
      { time: '19:00', guests: 4, status: 'confirmed', tableIds: ['mesa_2'] },
      { time: '19:00', guests: 4, status: 'confirmed', tableIds: ['mesa_3'] },
      { time: '19:00', guests: 4, status: 'confirmed', tableIds: ['mesa_4'] },
      { time: '19:00', guests: 4, status: 'confirmed', tableIds: ['mesa_5'] },
    ];
    // Earlier slots (17:00, 17:30) are NOT blocked by a later 19:00 booking:
    // the 2-hour hold only projects forward from a reservation's start time.
    expect(autoAssignTables(existing, DEFAULT_TABLES, '17:30', 2)).not.toBeNull();
    expect(autoAssignTables(existing, DEFAULT_TABLES, '17:00', 2)).not.toBeNull();
    // 19:00 itself, and anything up to (but excluding) 21:00, stays blocked.
    expect(autoAssignTables(existing, DEFAULT_TABLES, '19:00', 2)).toBeNull();
    expect(autoAssignTables(existing, DEFAULT_TABLES, '20:30', 2)).toBeNull();
  });

  it('a party of 17+ takes the whole restaurant and blocks remaining tables', () => {
    const result = autoAssignTables([], DEFAULT_TABLES, '19:00', 18);
    expect(result).not.toBeNull();
    expect(result!.tableIds).toHaveLength(5);
    expect(result!.tableName).toBe(FULL_RESTAURANT_LABEL);

    // Once a large party is booked, nothing else fits in the window
    const existing: ReservationSlot[] = [
      { time: '19:00', guests: 18, status: 'confirmed', tableIds: result!.tableIds },
    ];
    expect(autoAssignTables(existing, DEFAULT_TABLES, '19:30', 2)).toBeNull();
    expect(autoAssignTables(existing, DEFAULT_TABLES, '21:00', 2)).not.toBeNull();
  });

  it('rejects a 17+ party when any table is already taken', () => {
    const existing: ReservationSlot[] = [
      { time: '19:00', guests: 2, status: 'confirmed', tableIds: ['mesa_3'] },
    ];
    expect(autoAssignTables(existing, DEFAULT_TABLES, '19:00', 18)).toBeNull();
  });

  it('assigns progressive tables based on capacity', () => {
    const result = autoAssignTables([], DEFAULT_TABLES, '19:00', 10);
    expect(result).not.toBeNull();
    expect(result!.tableIds).toHaveLength(3);

    const existing: ReservationSlot[] = [
      { time: '19:00', guests: 10, status: 'confirmed', tableIds: result!.tableIds },
    ];
    const secondResult = autoAssignTables(existing, DEFAULT_TABLES, '19:00', 4);
    expect(secondResult).not.toBeNull();
    expect(secondResult!.tableIds).toHaveLength(1);
  });

  it('ignores cancelled reservations', () => {
    const existing: ReservationSlot[] = [
      { time: '19:00', guests: 10, status: 'cancelled', tableIds: ['mesa_1','mesa_2','mesa_3','mesa_4','mesa_5'] },
    ];
    expect(autoAssignTables(existing, DEFAULT_TABLES, '19:00', 4)).not.toBeNull();
  });

  it('reserves capacity for overlapping reservations without assigned table', () => {
    const existing: ReservationSlot[] = [
      { time: '19:00', guests: 4, status: 'confirmed' },
      { time: '19:00', guests: 4, status: 'confirmed' },
      { time: '19:00', guests: 4, status: 'confirmed' },
      { time: '19:00', guests: 4, status: 'confirmed' },
    ];
    // 16 virtual guests leave one free table of 4
    const ok = autoAssignTables(existing, DEFAULT_TABLES, '19:00', 4);
    expect(ok).not.toBeNull();
    const tooMany = autoAssignTables([...existing, { time: '19:00', guests: 4, status: 'confirmed' }], DEFAULT_TABLES, '19:00', 2);
    expect(tooMany).toBeNull();
  });

  it('blocks the entire day when a private event exists', () => {
    const existing: ReservationSlot[] = [
      { time: '00:00', guests: 20, status: 'confirmed', type: 'event' },
    ];
    expect(hasFullDayEvent(existing)).toBe(true);
    expect(autoAssignTables(existing, DEFAULT_TABLES, '13:00', 2)).toBeNull();
    expect(autoAssignTables(existing, DEFAULT_TABLES, '21:00', 2)).toBeNull();
  });
});

describe('computeDisabledSlotsForParty / isDayFullyBooked', () => {
  const timeSlots = ['18:00','18:30','19:00','19:30','20:00','20:30','21:00'];

  it('disables slots overlapping a full house', () => {
    const existing: ReservationSlot[] = [
      { time: '19:00', guests: 12, status: 'confirmed', tableIds: DEFAULT_TABLES.map(t => t.id) },
    ];
    const disabled = computeDisabledSlotsForParty(existing, DEFAULT_TABLES, timeSlots, 2);
    // Forward-only: slots before the 19:00 booking remain free.
    expect(disabled.has('18:00')).toBe(false);
    expect(disabled.has('18:30')).toBe(false);
    expect(disabled.has('19:00')).toBe(true);
    expect(disabled.has('20:30')).toBe(true);
    expect(disabled.has('21:00')).toBe(false);
  });

  it('marks a day with an event as fully booked', () => {
    const existing: ReservationSlot[] = [
      { time: '00:00', guests: 20, status: 'confirmed', type: 'event' },
    ];
    expect(isDayFullyBooked(existing, DEFAULT_TABLES, timeSlots, 2)).toBe(true);
  });
});
