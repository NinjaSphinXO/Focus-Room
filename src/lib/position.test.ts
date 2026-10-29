import { describe, expect, it } from "vitest";
import {
    MIN_GAP,
    POSITION_STEP,
    needsRebalance,
    positionAtEnd,
    positionBetween,
    rebalancedPositions,
} from "./position";

describe("positionAtEnd", () => {
    it("starts at one step for an empty list", () => {
        expect(positionAtEnd([])).toBe(POSITION_STEP);
    });
    it("goes one step after the largest position, whatever the order", () => {
        expect(positionAtEnd([3, 1024, 7])).toBe(1024 + POSITION_STEP);
    });
});

describe("positionBetween", () => {
    it("takes the midpoint between two neighbours", () => {
        expect(positionBetween(1024, 2048)).toBe(1536);
    });
    it("goes a step past the last item", () => {
        expect(positionBetween(2048, undefined)).toBe(2048 + POSITION_STEP);
    });
    it("goes before the first item (always above 0)", () => {
        expect(positionBetween(undefined, 1024)).toBe(512);
    });
    it("handles a single item or empty list", () => {
        expect(positionBetween(undefined, undefined)).toBe(POSITION_STEP);
    });
    it("always lands strictly between its neighbours", () => {
        const result = positionBetween(10, 11);
        expect(result).toBeGreaterThan(10);
        expect(result).toBeLessThan(11);
    });
});

describe("needsRebalance", () => {
    it("is false for a normal gap", () => {
        expect(needsRebalance(1024, 2048)).toBe(false);
    });
    it("is true when neighbours are too close to split again", () => {
        expect(needsRebalance(1, 1 + MIN_GAP / 2)).toBe(true);
    });
    it("is true when the first item is too close to zero", () => {
        expect(needsRebalance(undefined, MIN_GAP / 2)).toBe(true);
    });
    it("is false at the end of the list (no upper neighbour)", () => {
        expect(needsRebalance(5000, undefined)).toBe(false);
    });
    it("really does run out of room after many halvings", () => {
        let before = 1024;
        const after = 2048;
        let drags = 0;
        while (!needsRebalance(before, after)) {
            before = positionBetween(before, after); // keep dropping next to the same neighbour
            drags++;
            if (drags > 200) throw new Error("never needed a rebalance");
        }
        expect(drags).toBeGreaterThan(10); // plenty of room before it ever happens
    });
});

describe("rebalancedPositions", () => {
    it("renumbers in order with even spacing", () => {
        expect(rebalancedPositions(["a", "b", "c"])).toEqual([
            { id: "a", position: 1024 },
            { id: "b", position: 2048 },
            { id: "c", position: 3072 },
        ]);
    });
});
