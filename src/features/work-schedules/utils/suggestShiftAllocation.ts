import { QuickArrangeShiftOption } from '../types/quickArrange.types';

type SuggestParams = {
  targetHours: number;
  shifts: QuickArrangeShiftOption[];
  maximumShiftCount: number;
  allowOverTargetHours: boolean;
};

type Candidate = {
  units: number;
  quantities: Record<number, number>;
  shiftCount: number;
};

const HOUR_UNIT = 2;

function toUnits(hours: number) {
  return Math.round(hours * HOUR_UNIT);
}

function isBetterCandidate(candidate: Candidate, current: Candidate | null, targetUnits: number, allowOverTargetHours: boolean) {
  if (!current) return true;

  if (!allowOverTargetHours) {
    if (candidate.units > targetUnits) return false;
    if (current.units > targetUnits) return true;
    if (candidate.units !== current.units) return candidate.units > current.units;
    return candidate.shiftCount < current.shiftCount;
  }

  const candidateDistance = Math.abs(candidate.units - targetUnits);
  const currentDistance = Math.abs(current.units - targetUnits);
  if (candidateDistance !== currentDistance) return candidateDistance < currentDistance;
  if (candidate.units !== current.units) return candidate.units < current.units;
  return candidate.shiftCount < current.shiftCount;
}

export function suggestShiftAllocation(params: SuggestParams): Record<number, number> {
  const { targetHours, shifts, maximumShiftCount, allowOverTargetHours } = params;
  const targetUnits = toUnits(targetHours);
  const maxUnits = allowOverTargetHours
    ? targetUnits + Math.max(...shifts.map(shift => toUnits(shift.paidWorkingHours)), 0)
    : targetUnits;

  let best: Candidate | null = null;

  const visit = (index: number, units: number, shiftCount: number, quantities: Record<number, number>) => {
    if (shiftCount > maximumShiftCount || units > maxUnits) return;

    const candidate: Candidate = { units, quantities, shiftCount };
    if (isBetterCandidate(candidate, best, targetUnits, allowOverTargetHours)) {
      best = candidate;
    }

    if (index >= shifts.length) return;

    const shift = shifts[index];
    const shiftUnits = toUnits(shift.paidWorkingHours);
    if (shiftUnits <= 0) {
      visit(index + 1, units, shiftCount, quantities);
      return;
    }

    const remainingSlots = maximumShiftCount - shiftCount;
    const maxQuantityByHours = Math.floor((maxUnits - units) / shiftUnits);
    const maxQuantity = Math.max(0, Math.min(remainingSlots, maxQuantityByHours));

    for (let quantity = 0; quantity <= maxQuantity; quantity += 1) {
      visit(index + 1, units + quantity * shiftUnits, shiftCount + quantity, {
        ...quantities,
        [shift.id]: quantity,
      });
    }
  };

  visit(0, 0, 0, {});

  return best?.quantities || {};
}
