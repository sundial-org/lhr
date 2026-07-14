'use client';

import { useEffect, useMemo, useState } from 'react';

/* Solar geometry for a horizontal sundial at San Francisco. */
const LAT = 37.7749;
const LON = -122.4194;
const RAD = Math.PI / 180;
const PHI = LAT * RAD;

/* Plate coordinates: gnomon foot at origin, north = -y, east = +x. */
const W = 1240;
const FOOT = { x: 620, y: 545 };
const R_INNER = 74;
const R_HOUR = 445;
const R_TICK = 478;
const R_NUM = 508;
const GNOMON = 175; // nodus height, plate units

const NUMERALS = ['VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'I', 'II', 'III', 'IIII', 'V', 'VI'];

function declination(day: number) {
  return 23.45 * Math.sin(((284 + day) / 365) * 2 * Math.PI) * RAD;
}

function equationOfTime(day: number) {
  const b = ((day - 81) / 364) * 2 * Math.PI;
  return 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b); // minutes
}

function dayOfYearUTC(d: Date) {
  return Math.floor((d.getTime() - Date.UTC(d.getUTCFullYear(), 0, 0)) / 86400000);
}

/* Engraved hour-line angle from the noon line: tan θ = sin φ · tan H */
function hourLineAngle(hourAngleDeg: number) {
  const h = hourAngleDeg * RAD;
  return Math.atan2(Math.sin(PHI) * Math.sin(h), Math.cos(h));
}

function fromFoot(theta: number, r: number) {
  return { x: FOOT.x + r * Math.sin(theta), y: FOOT.y - r * Math.cos(theta) };
}

/* Shadow tip of the nodus for a given declination and hour angle. */
function nodusShadow(delta: number, hourAngleDeg: number) {
  const h = hourAngleDeg * RAD;
  const sinAlt = Math.sin(PHI) * Math.sin(delta) + Math.cos(PHI) * Math.cos(delta) * Math.cos(h);
  if (sinAlt <= 0.02) return null;
  const alt = Math.asin(sinAlt);
  const cosAz = (Math.sin(delta) - Math.sin(PHI) * sinAlt) / (Math.cos(PHI) * Math.cos(alt));
  let az = Math.acos(Math.min(1, Math.max(-1, cosAz)));
  if (h > 0) az = 2 * Math.PI - az; // afternoon: sun in the west
  const len = GNOMON / Math.tan(alt);
  const shadowAz = az + Math.PI;
  return { x: FOOT.x + len * Math.sin(shadowAz), y: FOOT.y - len * Math.cos(shadowAz) };
}

function seasonPath(delta: number) {
  const pts: string[] = [];
  for (let m = -6 * 60; m <= 6 * 60; m += 8) {
    const p = nodusShadow(delta, m / 4);
    if (!p) continue;
    pts.push(`${pts.length ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`);
  }
  return pts.join(' ');
}

function analemmaPath() {
  const pts: string[] = [];
  for (let day = 0; day <= 365; day += 3) {
    const p = nodusShadow(declination(day), equationOfTime(day) / 4);
    if (!p) continue;
    pts.push(`${pts.length ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`);
  }
  return pts.join(' ') + ' Z';
}

function sunriseSolarHour(day: number) {
  const delta = declination(day);
  const w = Math.acos(Math.min(1, Math.max(-1, -Math.tan(PHI) * Math.tan(delta))));
  return 12 - w / RAD / 15;
}

type Solar = {
  hourAngle: number; // degrees, 0 at solar noon in San Francisco
  up: boolean;
  apparent: string; // apparent solar time at the dial
  sunriseCivil: string; // San Francisco clock time of sunrise
};

const fmt = (min: number) => {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

function computeSolar(now: Date): Solar {
  const day = dayOfYearUTC(now);
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes() + now.getUTCSeconds() / 60;
  const solarMinutes = (((utcMinutes + 4 * LON + equationOfTime(day)) % 1440) + 1440) % 1440;
  const hourAngle = (solarMinutes - 12 * 60) / 4;
  const rise = sunriseSolarHour(day) * 60;
  const up = solarMinutes > rise && solarMinutes < 1440 - rise;

  // San Francisco civil time, to report sunrise in clock terms
  const sf = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(now);
  const civilMinutes =
    Number(sf.find((p) => p.type === 'hour')?.value ?? 0) % 24 * 60 +
    Number(sf.find((p) => p.type === 'minute')?.value ?? 0);
  const civilOffset = civilMinutes - solarMinutes;

  return { hourAngle, up, apparent: fmt(solarMinutes), sunriseCivil: fmt(rise + civilOffset) };
}

export default function Frontispiece() {
  const [solar, setSolar] = useState<Solar | null>(null);
  const [override, setOverride] = useState<'day' | 'night' | null>(null);

  useEffect(() => {
    const tick = () => setSolar(computeSolar(new Date()));
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);

  const mode: 'day' | 'night' = override ?? (solar ? (solar.up ? 'day' : 'night') : 'day');

  useEffect(() => {
    document.documentElement.dataset.mode = mode;
  }, [mode]);

  const geometry = useMemo(() => {
    const hours: { d: string; theta: number }[] = [];
    const ticks: string[] = [];
    for (let h = 6; h <= 18; h++) {
      const theta = hourLineAngle((h - 12) * 15);
      const a = fromFoot(theta, R_INNER);
      const b = fromFoot(theta, R_HOUR);
      hours.push({ d: `M${a.x.toFixed(1)},${a.y.toFixed(1)} L${b.x.toFixed(1)},${b.y.toFixed(1)}`, theta });
      if (h < 18) {
        const th = hourLineAngle((h - 12) * 15 + 7.5);
        const t1 = fromFoot(th, R_HOUR);
        const t2 = fromFoot(th, R_TICK);
        ticks.push(`M${t1.x.toFixed(1)},${t1.y.toFixed(1)} L${t2.x.toFixed(1)},${t2.y.toFixed(1)}`);
      }
    }
    const labelAt = (delta: number, hourAngleDeg: number, dx: number, dy: number) => {
      const p = nodusShadow(delta, hourAngleDeg)!;
      return { x: p.x + dx, y: p.y + dy };
    };
    return {
      hours,
      ticks,
      cancer: seasonPath(23.44 * RAD),
      equinox: seasonPath(0),
      capricorn: seasonPath(-23.44 * RAD),
      analemma: analemmaPath(),
      cancerLabel: labelAt(23.44 * RAD, 38, 16, 14),
      equinoxLabel: labelAt(0, 42, 14, -10),
      capricornLabel: labelAt(-23.44 * RAD, 26, 18, -8),
    };
  }, []);

  const shadow = useMemo(() => {
    if (!solar || !solar.up || Math.abs(solar.hourAngle) > 88) return null;
    const now = new Date();
    const delta = declination(dayOfYearUTC(now));
    const tip = nodusShadow(delta, solar.hourAngle);
    if (!tip) return null;
    const len = Math.hypot(tip.x - FOOT.x, tip.y - FOOT.y);
    const capped = Math.min(len, R_HOUR);
    const end = {
      x: FOOT.x + ((tip.x - FOOT.x) / len) * capped,
      y: FOOT.y + ((tip.y - FOOT.y) / len) * capped,
    };
    return { end, tip: len <= R_HOUR ? tip : null };
  }, [solar]);

  const labelStyle = {
    fontSize: 12.5,
    fontStyle: 'italic' as const,
    fontFamily: 'var(--font-body), Georgia, serif',
    letterSpacing: 2.5,
  };

  return (
    <header className="hero">
      <nav className="nav">
        <span className="mono nav-left">A research lab · San Francisco</span>
        <div className="nav-right">
          <a className="mono-link" href="https://sundialhub.com" target="_blank" rel="noreferrer">
            Sundial ↗
          </a>
          <a
            className="mono-link"
            href="https://belindamo.com/b/infrastructure+for+meaningful+work"
            target="_blank"
            rel="noreferrer"
          >
            Manifesto ↗
          </a>
          <a className="mono-link" href="mailto:team@longhorizonresearch.com">
            Contact
          </a>
          <button
            className="mode-toggle"
            onClick={() => setOverride(mode === 'day' ? 'night' : 'day')}
            aria-label="Toggle day and night"
          >
            {mode === 'day' ? '☾' : '☉'}
          </button>
        </div>
      </nav>

      <div className="sun-mark" aria-hidden>
        ☉
      </div>
      <h1 className="wordmark">Long Horizon Research</h1>
      <p className="thesis">Infrastructure for meaningful work between humans and machines.</p>

      <div className="plate-wrap" aria-hidden>
        <svg viewBox={`0 0 ${W} 553`} fill="none">
          <defs>
            {/* the fan: everything engraved stays above the horizon, within the ring */}
            <clipPath id="plate">
              <path d={`M${FOOT.x - R_TICK - 4},${FOOT.y} A${R_TICK + 4},${R_TICK + 4} 0 0 1 ${FOOT.x + R_TICK + 4},${FOOT.y} Z`} />
            </clipPath>
          </defs>

          <g clipPath="url(#plate)">
            {/* chapter ring */}
            <circle cx={FOOT.x} cy={FOOT.y} r={R_INNER} stroke="var(--ink)" strokeOpacity="0.5" strokeWidth="0.7" pathLength={1} className="dial-line" />
            <circle cx={FOOT.x} cy={FOOT.y} r={R_HOUR} stroke="var(--ink)" strokeOpacity="0.35" strokeWidth="0.7" pathLength={1} className="dial-line" />
            <circle cx={FOOT.x} cy={FOOT.y} r={R_TICK} stroke="var(--ink)" strokeOpacity="0.35" strokeWidth="0.7" pathLength={1} className="dial-line" />

            {/* hour lines */}
            {geometry.hours.map((h, i) => (
              <path key={i} d={h.d} stroke="var(--ink)" strokeOpacity="0.62" strokeWidth="0.8" pathLength={1} className="dial-line" style={{ animationDelay: `${0.2 + i * 0.07}s` }} />
            ))}
            {geometry.ticks.map((d, i) => (
              <path key={i} d={d} stroke="var(--ink)" strokeOpacity="0.4" strokeWidth="0.6" pathLength={1} className="dial-line" style={{ animationDelay: `${0.9 + i * 0.05}s` }} />
            ))}

            {/* season lines: solstice hyperbolae in ink, equinox in accent */}
            <path d={geometry.cancer} stroke="var(--ink)" strokeOpacity="0.35" strokeWidth="0.7" pathLength={1} className="dial-line" style={{ animationDelay: '1.4s' }} />
            <path d={geometry.capricorn} stroke="var(--ink)" strokeOpacity="0.35" strokeWidth="0.7" pathLength={1} className="dial-line" style={{ animationDelay: '1.5s' }} />
            <path d={geometry.equinox} stroke="var(--accent)" strokeOpacity="0.85" strokeWidth="0.9" pathLength={1} className="dial-line" style={{ animationDelay: '1.6s' }} />

            {/* analemma at mean noon */}
            <path d={geometry.analemma} stroke="var(--accent)" strokeOpacity="0.8" strokeWidth="0.8" pathLength={1} className="dial-line" style={{ animationDelay: '1.8s' }} />

            {/* live shadow */}
            {shadow && (
              <g>
                <path
                  d={`M${FOOT.x},${FOOT.y} L${shadow.end.x.toFixed(1)},${shadow.end.y.toFixed(1)}`}
                  stroke="var(--ink)"
                  strokeOpacity="0.85"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
                {shadow.tip && <circle cx={shadow.tip.x} cy={shadow.tip.y} r="3" fill="var(--accent)" />}
              </g>
            )}
          </g>

          {/* numerals */}
          {geometry.hours.map((h, i) => {
            const p = fromFoot(h.theta, R_NUM);
            return (
              <text
                key={i}
                x={p.x}
                y={Math.min(p.y, FOOT.y - 10)}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="var(--ink)"
                fillOpacity="0.75"
                fontSize="19"
                fontFamily="var(--font-display), Georgia, serif"
              >
                {NUMERALS[i]}
              </text>
            );
          })}

          {/* labels, as on the old plates */}
          <text {...geometry.equinoxLabel} fill="var(--accent)" fillOpacity="0.9" {...labelStyle}>
            æquinoctialis
          </text>
          <text {...geometry.cancerLabel} fill="var(--ink)" fillOpacity="0.5" {...labelStyle}>
            tropicus cancri
          </text>
          <text {...geometry.capricornLabel} fill="var(--ink)" fillOpacity="0.5" {...labelStyle}>
            tropicus capricorni
          </text>

          {/* gnomon foot on the horizon */}
          <circle cx={FOOT.x} cy={FOOT.y} r="3" fill="var(--ink)" fillOpacity="0.8" />
          {/* horizon */}
          <line x1="0" y1={FOOT.y} x2={W} y2={FOOT.y} stroke="var(--ink)" strokeOpacity="0.45" strokeWidth="0.8" pathLength={1} className="dial-line" />
        </svg>
      </div>

      <div className="hero-captions">
        <span className="mono">
          Fig. I — Horizontal dial for lat. 37°46′ N · San Francisco
          <br />
          hour lines tan θ = sin φ · tan H · nodus at the gnomon tip
        </span>
        <span className="mono live">
          {solar ? (
            solar.up ? (
              <>
                apparent solar time <em>{solar.apparent}</em>
                <br />
                the shadow is live
              </>
            ) : (
              <>
                the sun is down over the Pacific
                <br />
                first light near <em>{solar.sunriseCivil}</em>
              </>
            )
          ) : (
            <>reading the sky…</>
          )}
        </span>
      </div>
    </header>
  );
}
