import { createRegions, createRoutes } from '../data/world';
import type { InterventionKey, InterventionState, RegionState, SimulationEvent, SimulationMetrics, SimulationState } from './types';

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
const sum = (regions: RegionState[], key: keyof RegionState) => regions.reduce((n, r) => n + Number(r[key]), 0);

export const defaultInterventions = (): InterventionState[] => [
  { key: 'vaccination', name: 'Targeted vaccination', coverage: 0.18, effectiveness: 0.72, compliance: 0.86, active: false, costPerDay: 8.2, socialDisruption: 0.05 },
  { key: 'masking', name: 'Masking campaign', coverage: 0.62, effectiveness: 0.38, compliance: 0.7, active: false, costPerDay: 1.4, socialDisruption: 0.16 },
  { key: 'testing', name: 'Testing + isolation', coverage: 0.35, effectiveness: 0.46, compliance: 0.64, active: false, costPerDay: 4.6, socialDisruption: 0.22 },
  { key: 'travelRestriction', name: 'Travel restrictions', coverage: 0.72, effectiveness: 0.8, compliance: 0.82, active: false, costPerDay: 3.1, socialDisruption: 0.42 },
  { key: 'healthcareExpansion', name: 'Healthcare expansion', coverage: 0.2, effectiveness: 0.55, compliance: 1, active: false, costPerDay: 9.5, socialDisruption: 0.08 },
];

export const createInitialSimulation = (): SimulationState => {
  const regions = createRegions();
  const london = regions.find(r => r.id === 'lon')!;
  london.exposed = 30; london.infectious = 12; london.susceptible -= 42; london.cumulativeInfections = 42; london.lastIncidence = 42;
  const state: SimulationState = { day: 0, regions, routes: createRoutes(), parameters: { model: 'SEIR', beta: 0.34, incubationDays: 4.2, infectiousDays: 6.5, asymptomaticTransmission: 0.45, hospitalizationProbability: 0.045, mortalityProbability: 0.009, immunityDays: 365, seed: 184729 }, interventions: defaultInterventions(), events: [], metrics: {} as SimulationMetrics, experimentName: 'Patient Zero: London' };
  state.events.push({ day: 0, regionId: 'lon', type: 'first-infection', title: 'First infections detected', detail: '42 simulated infections seeded in London.' });
  state.metrics = computeMetrics(state, 0);
  return state;
};

const activeEffect = (state: SimulationState, key: InterventionKey) => {
  const i = state.interventions.find(v => v.key === key);
  return i?.active ? i.coverage * i.effectiveness * i.compliance : 0;
};

export const stepSimulation = (state: SimulationState): SimulationState => {
  const next = clone(state); next.day += 1;
  const p = next.parameters, sigma = 1 / p.incubationDays, gamma = 1 / p.infectiousDays;
  const transmissionCut = Math.min(0.85, activeEffect(next, 'masking') + activeEffect(next, 'testing') * 0.7);
  const vaccBoost = activeEffect(next, 'vaccination');
  const mortalityCut = activeEffect(next, 'healthcareExpansion') * 0.45;
  const importByRegion: Record<string, number> = {};
  for (const route of next.routes) {
    const from = next.regions.find(r => r.id === route.from)!;
    const travelCut = activeEffect(next, 'travelRestriction');
    route.restriction = travelCut;
    const prevalence = from.infectious / from.population;
    const imported = Math.min(from.infectious, route.passengersPerDay * (1 - travelCut) * from.mobility * prevalence);
    from.infectious -= imported; importByRegion[route.to] = (importByRegion[route.to] ?? 0) + imported;
  }
  const events: SimulationEvent[] = [];
  for (const r of next.regions) {
    const imported = importByRegion[r.id] ?? 0; r.exposed += imported; r.cumulativeImported += imported;
    if (imported >= 1 && state.regions.find(old => old.id === r.id)!.cumulativeImported < 1) events.push({ day: next.day, regionId: r.id, type: 'imported-outbreak', title: `Imported infections in ${r.name}`, detail: `${Math.round(imported)} exposed travelers arrived through the mobility network.` });
    const effectiveSusceptible = Math.max(0, r.susceptible * (1 - vaccBoost));
    const beta = p.beta * r.contactIntensity * (1 - transmissionCut);
    const newExposed = Math.min(r.susceptible, beta * r.infectious * effectiveSusceptible / r.population);
    const newInfectious = Math.min(r.exposed, sigma * r.exposed);
    const resolved = Math.min(r.infectious, gamma * r.infectious);
    const deaths = resolved * p.mortalityProbability * Math.max(0.2, 1 - mortalityCut) * (r.hospitalized > r.healthcareCapacity ? 1.8 : 1);
    r.susceptible -= newExposed; r.exposed += newExposed - newInfectious; r.infectious += newInfectious - resolved; r.recovered += resolved - deaths; r.deaths += deaths;
    r.hospitalized = r.infectious * p.hospitalizationProbability; r.lastIncidence = newExposed + imported; r.cumulativeInfections += newExposed + imported;
    r.rt = (beta / gamma) * (r.susceptible / r.population);
    if (r.hospitalized > r.healthcareCapacity && !state.events.some(e => e.type === 'healthcare-strain' && e.regionId === r.id)) events.push({ day: next.day, regionId: r.id, type: 'healthcare-strain', title: `${r.name} healthcare strained`, detail: `Hospital demand ${Math.round(r.hospitalized)} exceeds capacity ${r.healthcareCapacity}.` });
  }
  next.events.push(...events); next.metrics = computeMetrics(next, state.metrics.peakInfections); return next;
};

export const toggleIntervention = (state: SimulationState, key: InterventionKey): SimulationState => {
  const next = clone(state); const i = next.interventions.find(v => v.key === key)!; i.active = !i.active;
  next.events.push({ day: next.day, type: 'intervention', title: `${i.active ? 'Activated' : 'Paused'} ${i.name}`, detail: `Coverage ${Math.round(i.coverage*100)}%, effectiveness ${Math.round(i.effectiveness*100)}%, compliance ${Math.round(i.compliance*100)}%.` });
  return next;
};

export const computeMetrics = (state: SimulationState, previousPeak = 0): SimulationMetrics => {
  const pop = sum(state.regions, 'population'), infectious = sum(state.regions, 'infectious'), incidence = sum(state.regions, 'lastIncidence');
  const rt = state.regions.reduce((n, r) => n + r.rt * r.population, 0) / pop;
  const r0 = state.parameters.beta * state.parameters.infectiousDays;
  const cost = state.interventions.filter(i => i.active).reduce((n, i) => n + i.costPerDay, 0) * state.day;
  return { r0, rt, incidence, prevalence: infectious / pop, attackRate: sum(state.regions, 'cumulativeInfections') / pop, hospitalDemand: sum(state.regions, 'hospitalized'), deaths: sum(state.regions, 'deaths'), peakInfections: Math.max(previousPeak, infectious), cost, duration: state.day };
};

export const explainWhy = (state: SimulationState, regionId: string) => {
  const r = state.regions.find(v => v.id === regionId)!;
  const drivers = [`Rₜ is ${r.rt.toFixed(2)}, computed from β, infectious period, contact intensity, and susceptible share.`];
  if (r.contactIntensity > 1.1) drivers.push('High contact intensity is amplifying β in this region.');
  if (r.vaccinationCoverage < 0.35) drivers.push('Low vaccination leaves a large susceptible pool.');
  if (r.cumulativeImported > 5) drivers.push(`${Math.round(r.cumulativeImported)} imported infections seeded additional transmission chains.`);
  if (r.hospitalized > r.healthcareCapacity) drivers.push('Healthcare saturation is increasing modeled mortality.');
  return drivers;
};
