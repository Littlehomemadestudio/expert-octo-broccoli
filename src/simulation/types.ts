export type ModelKind = 'SIR' | 'SEIR';
export type InterventionKey = 'vaccination' | 'masking' | 'testing' | 'travelRestriction' | 'healthcareExpansion';

export interface RegionState {
  id: string; name: string; country: string; x: number; y: number; population: number; density: number;
  ageMedian: number; vaccinationCoverage: number; healthcareCapacity: number; contactIntensity: number; mobility: number;
  susceptible: number; exposed: number; infectious: number; recovered: number; deaths: number; hospitalized: number;
  cumulativeInfections: number; cumulativeImported: number; lastIncidence: number; rt: number;
}
export interface MobilityRoute { from: string; to: string; passengersPerDay: number; restriction: number; }
export interface PathogenParameters { model: ModelKind; beta: number; incubationDays: number; infectiousDays: number; asymptomaticTransmission: number; hospitalizationProbability: number; mortalityProbability: number; immunityDays: number; seed: number; }
export interface InterventionState { key: InterventionKey; name: string; coverage: number; effectiveness: number; compliance: number; active: boolean; costPerDay: number; socialDisruption: number; }
export interface SimulationEvent { day: number; regionId?: string; type: string; title: string; detail: string; }
export interface SimulationMetrics { r0: number; rt: number; incidence: number; prevalence: number; attackRate: number; hospitalDemand: number; deaths: number; peakInfections: number; cost: number; duration: number; }
export interface SimulationState { day: number; regions: RegionState[]; routes: MobilityRoute[]; parameters: PathogenParameters; interventions: InterventionState[]; events: SimulationEvent[]; metrics: SimulationMetrics; experimentName: string; }
