import { computeDisabledSlots } from './reservationUtils';

describe('computeDisabledSlots', () => {
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
