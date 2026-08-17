import { useEffect, useMemo, useState } from 'react';
import { createInitialSimulation, explainWhy, stepSimulation, toggleIntervention } from './simulation/engine';
import type { InterventionKey } from './simulation/types';
import './styles.css';

const fmt = (n: number) => Intl.NumberFormat('en', { maximumFractionDigits: 0 }).format(n);
const pct = (n: number) => `${(n * 100).toFixed(2)}%`;

export default function App() {
  const [sim, setSim] = useState(createInitialSimulation);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [selectedId, setSelectedId] = useState('lon');
  const [advanced, setAdvanced] = useState(false);
  const selected = sim.regions.find(r => r.id === selectedId)!;
  const why = useMemo(() => explainWhy(sim, selectedId), [sim, selectedId]);

  useEffect(() => {
    if (!playing) return;
    const ms = Math.max(80, 900 / speed);
    const id = window.setInterval(() => setSim(s => stepSimulation(s)), ms);
    return () => window.clearInterval(id);
  }, [playing, speed]);

  const reset = () => { setSim(createInitialSimulation()); setPlaying(false); setSelectedId('lon'); };

  return <main className="shell">
    <section className="worldPanel" aria-label="Interactive simulated world map">
      <header className="topbar">
        <div><p className="eyebrow">EPILAB · SIMULATED DATA · SYNTHETIC POPULATION</p><h1>Global Epidemiology Sandbox</h1></div>
        <div className="clock"><span>Day {sim.day}</span><strong>Rₜ {sim.metrics.rt.toFixed(2)}</strong></div>
      </header>
      <div className="map" role="application" aria-label="Pan and zoom style epidemiology world map">
        <div className="graticule" />
        <svg className="routes" viewBox="0 0 100 100" preserveAspectRatio="none">
          {sim.routes.filter((_, i) => i % 2 === 0).map(route => {
            const a = sim.regions.find(r => r.id === route.from)!; const b = sim.regions.find(r => r.id === route.to)!;
            const width = Math.max(0.4, Math.log(route.passengersPerDay) / 3) * (1 - route.restriction);
            return <line key={`${route.from}-${route.to}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} strokeWidth={width} />;
          })}
        </svg>
        {sim.regions.map(r => {
          const intensity = Math.min(1, r.infectious / (r.population * 0.012));
          const size = 1.4 + Math.sqrt(Math.max(1, r.population / 1_000_000)) + intensity * 8;
          return <button key={r.id} className={`region ${r.id === selectedId ? 'selected' : ''}`} onClick={() => setSelectedId(r.id)} style={{ left: `${r.x}%`, top: `${r.y}%`, width: `${size}rem`, height: `${size}rem`, '--hot': intensity } as React.CSSProperties} title={`${r.name}: ${fmt(r.infectious)} infectious`}>
            <span>{r.name}</span>
          </button>;
        })}
      </div>
      <div className="controls">
        <button onClick={() => setPlaying(!playing)}>{playing ? 'Pause' : 'Play'}</button><button onClick={() => setSim(s => stepSimulation(s))}>Step</button><button onClick={reset}>Run again</button>
        {[0.5,1,5,25,100].map(s => <button className={speed===s?'active':''} key={s} onClick={() => setSpeed(s)}>{s}×</button>)}
      </div>
    </section>
    <aside className="lab">
      <section className="metrics grid">
        <div><span>Infectious</span><strong>{fmt(sim.regions.reduce((n,r)=>n+r.infectious,0))}</strong></div><div><span>Incidence/day</span><strong>{fmt(sim.metrics.incidence)}</strong></div><div><span>Deaths</span><strong>{fmt(sim.metrics.deaths)}</strong></div><div><span>Attack rate</span><strong>{pct(sim.metrics.attackRate)}</strong></div>
      </section>
      <section className="card"><h2>{selected.name}</h2><p>{selected.country} · population {fmt(selected.population)} · density {fmt(selected.density)}/km²</p><div className="bars"><label>Susceptible <meter min="0" max={selected.population} value={selected.susceptible}/></label><label>Exposed <meter min="0" max={selected.population*.03} value={selected.exposed}/></label><label>Infectious <meter min="0" max={selected.population*.03} value={selected.infectious}/></label><label>Healthcare demand <meter min="0" max={selected.healthcareCapacity*1.5} value={selected.hospitalized}/></label></div></section>
      <section className="card"><h2>Interventions</h2>{sim.interventions.map(i => <button key={i.key} className={`intervention ${i.active?'active':''}`} onClick={() => setSim(s => toggleIntervention(s, i.key as InterventionKey))}><strong>{i.name}</strong><span>{i.active?'active':'inactive'} · coverage {Math.round(i.coverage*100)}% · disruption {Math.round(i.socialDisruption*100)}%</span></button>)}</section>
      <section className="card why"><h2>WHY?</h2>{why.map(item => <p key={item}>{item}</p>)}</section>
      <section className="card science"><h2>Scientific view <button onClick={() => setAdvanced(!advanced)}>{advanced?'Beginner':'Advanced'}</button></h2><p><b>Model:</b> {sim.parameters.model}; deterministic compartmental update; simplified mobility network; homogeneous mixing inside each region.</p><p><b>R₀:</b> {sim.metrics.r0.toFixed(2)} <b>Rₜ:</b> {selected.rt.toFixed(2)} <b>Seed:</b> #{sim.parameters.seed}</p>{advanced && <p><b>β:</b> {sim.parameters.beta} <b>γ:</b> {(1/sim.parameters.infectiousDays).toFixed(3)} <b>σ:</b> {(1/sim.parameters.incubationDays).toFixed(3)} <b>Mortality:</b> {pct(sim.parameters.mortalityProbability)}</p>}<small>Educational simulation only; not a real-world forecasting system.</small></section>
      <section className="timeline"><h2>Timeline</h2>{sim.events.slice(-7).reverse().map(e => <article key={`${e.day}-${e.title}`}><b>Day {e.day}</b><span>{e.title}</span><small>{e.detail}</small></article>)}</section>
    </aside>
  </main>;
}
