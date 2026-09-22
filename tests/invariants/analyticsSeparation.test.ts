import { describe, it, expect } from 'vitest';
import {
  buildCompositeTelemetrySeries,
  FROZEN_WEEK_HISTORICAL,
  FROZEN_MONTH_HISTORICAL,
  FROZEN_QUARTER_HISTORICAL,
  FROZEN_YEAR_HISTORICAL,
} from '../../src/data/historicalTelemetry';

describe('Analytics & Telemetry Historical Separation Invariants', () => {
  it('freezes past historical data points regardless of current live workspace task counts', () => {
    // Scenario 1: Initial state (e.g. 50 tasks, 20 completed)
    const initialMonthSeries = buildCompositeTelemetrySeries('month', 50, 20);
    const initialWeekSeries = buildCompositeTelemetrySeries('week', 50, 20);
    const initialQuarterSeries = buildCompositeTelemetrySeries('quarter', 50, 20);
    const initialYearSeries = buildCompositeTelemetrySeries('year', 50, 20);

    // Scenario 2: Massive task completion or creation today (e.g. 100 tasks, 90 completed)
    const updatedMonthSeries = buildCompositeTelemetrySeries('month', 100, 90);
    const updatedWeekSeries = buildCompositeTelemetrySeries('week', 100, 90);
    const updatedQuarterSeries = buildCompositeTelemetrySeries('quarter', 100, 90);
    const updatedYearSeries = buildCompositeTelemetrySeries('year', 100, 90);

    // 1. In month view: Week 1, Week 2, Week 3 must be strictly identical
    const initialPastMonth = initialMonthSeries.filter((p) => !p.isLive);
    const updatedPastMonth = updatedMonthSeries.filter((p) => !p.isLive);
    expect(initialPastMonth).toEqual([...FROZEN_MONTH_HISTORICAL]);
    expect(updatedPastMonth).toEqual(initialPastMonth);

    // 2. In week view: Mon - Fri must be strictly identical
    const initialPastWeek = initialWeekSeries.filter((p) => !p.isLive);
    const updatedPastWeek = updatedWeekSeries.filter((p) => !p.isLive);
    expect(initialPastWeek).toEqual([...FROZEN_WEEK_HISTORICAL]);
    expect(updatedPastWeek).toEqual(initialPastWeek);

    // 3. In quarter view: Sprint 28 - Sprint 32 must be strictly identical
    const initialPastQuarter = initialQuarterSeries.filter((p) => !p.isLive);
    const updatedPastQuarter = updatedQuarterSeries.filter((p) => !p.isLive);
    expect(initialPastQuarter).toEqual([...FROZEN_QUARTER_HISTORICAL]);
    expect(updatedPastQuarter).toEqual(initialPastQuarter);

    // 4. In year view: Q1 - Q3 must be strictly identical
    const initialPastYear = initialYearSeries.filter((p) => !p.isLive);
    const updatedPastYear = updatedYearSeries.filter((p) => !p.isLive);
    expect(initialPastYear).toEqual([...FROZEN_YEAR_HISTORICAL]);
    expect(updatedPastYear).toEqual(initialPastYear);
  });

  it('accurately updates only the current live telemetry interval when state changes', () => {
    const series1 = buildCompositeTelemetrySeries('month', 42, 18);
    const livePoint1 = series1.find((p) => p.isLive);
    expect(livePoint1).toBeDefined();
    expect(livePoint1!.planned).toBe(42);
    expect(livePoint1!.completed).toBe(18);

    const series2 = buildCompositeTelemetrySeries('month', 45, 25);
    const livePoint2 = series2.find((p) => p.isLive);
    expect(livePoint2).toBeDefined();
    expect(livePoint2!.planned).toBe(45);
    expect(livePoint2!.completed).toBe(25);
  });
});
