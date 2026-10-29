// Fractional ordering. Moving a task changes ONE row: its new position sits between its neighbours.

export const POSITION_STEP = 1024;
export const MIN_GAP = 1e-6;

export function positionAtEnd(positions: number[]): number {
    return positions.length === 0
        ? POSITION_STEP
        : Math.max(...positions) + POSITION_STEP;
}

// `before` / `after` are the positions of the neighbours in the NEW order (undefined = edge of list)
export function positionBetween(
    before: number | undefined,
    after: number | undefined,
): number {
    if (before === undefined && after === undefined) return POSITION_STEP;
    if (before === undefined) return (after as number) / 2;
    if (after === undefined) return before + POSITION_STEP;
    return (before + after) / 2;
}

// After many drags into the same gap, halves get too small to tell apart: renumber everything.
export function needsRebalance(
    before: number | undefined,
    after: number | undefined,
): boolean {
    if (after === undefined) return false;
    return after - (before ?? 0) < MIN_GAP;
}

export function rebalancedPositions(ids: string[]): { id: string; position: number }[] {
    return ids.map((id, i) => ({ id, position: (i + 1) * POSITION_STEP }));
}
