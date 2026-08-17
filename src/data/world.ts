import type { MobilityRoute, RegionState } from '../simulation/types';

const seedRegion = (id: string, name: string, country: string, x: number, y: number, population: number, density: number, ageMedian: number, vaccinationCoverage: number, healthcareCapacity: number, contactIntensity: number, mobility: number): RegionState => ({
  id, name, country, x, y, population, density, ageMedian, vaccinationCoverage, healthcareCapacity, contactIntensity, mobility,
  susceptible: Math.round(population * (1 - vaccinationCoverage * 0.65)), exposed: 0, infectious: 0,
  recovered: Math.round(population * vaccinationCoverage * 0.65), deaths: 0, hospitalized: 0, cumulativeInfections: 0,
  cumulativeImported: 0, lastIncidence: 0, rt: 0,
});

export const createRegions = (): RegionState[] => [
  seedRegion('nyc','New York','United States',24,39,19500000,11000,38,0.42,52000,1.15,1.0),
  seedRegion('lon','London','United Kingdom',47,33,14200000,5700,40,0.48,33000,1.08,1.0),
  seedRegion('par','Paris','France',49,35,11100000,7300,42,0.51,29000,1.04,0.9),
  seedRegion('dub','Dubai','United Arab Emirates',60,47,3500000,860,33,0.39,7600,1.18,1.25),
  seedRegion('mum','Mumbai','India',68,55,20900000,21000,29,0.32,23000,1.32,0.85),
  seedRegion('tok','Tokyo','Japan',82,43,37400000,6400,48,0.56,88000,0.88,0.92),
  seedRegion('seo','Seoul','South Korea',78,41,26000000,16000,44,0.54,61000,0.96,0.88),
  seedRegion('sao','São Paulo','Brazil',35,73,22400000,7400,35,0.36,42000,1.14,0.72),
  seedRegion('lag','Lagos','Nigeria',52,57,15900000,6800,19,0.18,9800,1.28,0.62),
  seedRegion('jnb','Johannesburg','South Africa',56,77,10500000,3200,28,0.29,18000,1.05,0.65),
];

export const createRoutes = (): MobilityRoute[] => {
  const pairs: Array<[string, string, number]> = [
  ['nyc','lon',4200], ['lon','par',3600], ['lon','dub',2100], ['dub','mum',3900], ['tok','seo',3100], ['nyc','sao',1300], ['par','lag',900], ['lag','jnb',800], ['dub','jnb',1100], ['mum','tok',1200], ['seo','nyc',950]
];
  return pairs.flatMap(([from, to, passengersPerDay]) => ([{ from, to, passengersPerDay, restriction: 0 }, { from: to, to: from, passengersPerDay: passengersPerDay * 0.82, restriction: 0 }]));
};
