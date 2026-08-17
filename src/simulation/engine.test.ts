import { describe, expect, it } from 'vitest';
import { createInitialSimulation, stepSimulation, toggleIntervention } from './engine';

describe('epidemiology engine', () => {
  it('advances real compartment values and metrics', () => {
    const start = createInitialSimulation();
    const next = stepSimulation(start);
    expect(next.day).toBe(1);
    expect(next.metrics.incidence).toBeGreaterThan(0);
    expect(next.metrics.r0).toBeCloseTo(start.parameters.beta * start.parameters.infectiousDays);
  });
  it('travel restrictions reduce route flow capacity', () => {
    let sim = createInitialSimulation();
    sim = toggleIntervention(sim, 'travelRestriction');
    sim = stepSimulation(sim);
    expect(sim.routes.some(r => r.restriction > 0)).toBe(true);
  });
});
