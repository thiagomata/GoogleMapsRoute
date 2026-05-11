# Plan: Staggered Start + Interactive Progress Scrubber

## Problem
All trucks start at the same time → visual overlap.
Old formula forced synchronized arrival (shorter routes waited).

## Solution: Same-speed movie model
Overall progress (0..1) is the independent variable.  
All trucks travel at the same speed: `maxDistance` meters per progress-unit.  
Each starts at its `startProgress` threshold and finishes when it covers its own route.

---

## Changes

### 1. `src/vehicles/vehicle.ts` ✓ DONE
- `VehicleOptions.startProgress?: number` (default 0)
- Stored as `readonly startProgress` in Vehicle constructor

### 2. `src/vehicles/fleet.ts` — needs update

**`getVehicleDistance`:**
```typescript
private getVehicleDistance(routeDistance: number, overallProgress: number, startProgress: number): number {
    if (overallProgress < startProgress) return 0
    const traveled = (overallProgress - startProgress) * this.maxDistance
    return Math.min(traveled, routeDistance)
}
```

**`allArrived`:** check each vehicle individually:
```typescript
allArrived(): boolean {
    const progress = this.getOverallProgress()
    return Array.from(this.vehicles.values()).every((v) => {
        const dist = this.getVehicleDistance(v.getTotalDistance(), progress, v.startProgress)
        return dist >= v.getTotalDistance()
    })
}
```

**`_tick` complete check:** use `allArrived()` instead of `currentProgress >= 1`

**Add `maxDistance` back** — computed in `startAll()`:
```typescript
startAll(): void {
    this.currentProgress = 0
    this.manualProgress = null
    this.maxDistance = 0
    this.vehicles.forEach((v) => {
        if (v.getTotalDistance() > this.maxDistance) this.maxDistance = v.getTotalDistance()
    })
    ...
}
```

**Fix fake-timer compat:** use `Date.now()` not `performance.now()`:
- `this.lastFrameTime = Date.now()`
- `requestAnimationFrame(() => this._tick(Date.now()))`

### 3. `index.html` ✓ DONE
Progress slider added (disabled until Go clicked)

### 4. `src/main.ts` ✓ DONE (minor update needed)
- Pass `startProgress: i * 0.001` per vehicle
- Wire slider events

### 5. `tests/integration/app-flow.test.ts`
- Change `vi.advanceTimersByTime(5000)` → `await vi.runAllTimersAsync()` (to account for ~30s trip at 1x speed)
