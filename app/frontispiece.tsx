'use client';

import Lenis from 'lenis';
import { useEffect, useMemo, useRef, useState } from 'react';

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

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

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

/* Sun altitude and azimuth for a given declination and hour angle. */
function sunAltAz(delta: number, hourAngleDeg: number) {
  const h = hourAngleDeg * RAD;
  const sinAlt = Math.sin(PHI) * Math.sin(delta) + Math.cos(PHI) * Math.cos(delta) * Math.cos(h);
  const alt = Math.asin(Math.min(1, Math.max(-1, sinAlt)));
  const cosAz = (Math.sin(delta) - Math.sin(PHI) * sinAlt) / (Math.cos(PHI) * Math.cos(alt) || 1e-9);
  let az = Math.acos(Math.min(1, Math.max(-1, cosAz)));
  if (h > 0) az = 2 * Math.PI - az; // afternoon: sun in the west
  return { alt, az, sinAlt };
}

/* Shadow tip of the nodus for a given declination and hour angle. */
function nodusShadow(delta: number, hourAngleDeg: number) {
  const { alt, az, sinAlt } = sunAltAz(delta, hourAngleDeg);
  if (sinAlt <= 0.02) return null;
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

/* Apparent solar time at the dial, in minutes, no Intl — cheap enough per frame. */
function solarMinutesNow(now: Date) {
  const day = dayOfYearUTC(now);
  const utcMin =
    now.getUTCHours() * 60 +
    now.getUTCMinutes() +
    now.getUTCSeconds() / 60 +
    now.getUTCMilliseconds() / 60000;
  return (((utcMin + 4 * LON + equationOfTime(day)) % 1440) + 1440) % 1440;
}

/* The scrubbed day runs from before dawn to after dusk, in solar minutes. */
const SCRUB_PAD = 55;

export default function Frontispiece() {
  const [sunUp, setSunUp] = useState<boolean | null>(null);
  const [override, setOverride] = useState<'day' | 'night' | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<SVGPathElement>(null);
  const tipRef = useRef<SVGCircleElement>(null);
  const glowRef = useRef<SVGCircleElement>(null);
  const veilRef = useRef<HTMLDivElement>(null);
  const warmRef = useRef<HTMLDivElement>(null);
  const warmInnerRef = useRef<HTMLDivElement>(null);
  const numRefs = useRef<(SVGTextElement | null)[]>([]);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const m = solarMinutesNow(now);
      const rise = sunriseSolarHour(dayOfYearUTC(now)) * 60;
      setSunUp(m > rise && m < 1440 - rise);
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);

  const mode: 'day' | 'night' = override ?? (sunUp === false ? 'night' : 'day');

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
    return {
      hours,
      ticks,
      cancer: seasonPath(23.44 * RAD),
      equinox: seasonPath(0),
      capricorn: seasonPath(-23.44 * RAD),
      analemma: analemmaPath(),
    };
  }, []);

  /* Scroll is a day: a damped scrub of solar time across the pinned plate.
     Idle at the top, the dial settles back into a live instrument. */
  useEffect(() => {
    const region = scrollRef.current;
    if (!region) return;

    const day = dayOfYearUTC(new Date());
    const delta = declination(day);
    const rise = sunriseSolarHour(day) * 60;
    const t0 = rise - SCRUB_PAD;
    const t1 = 1440 - rise + SCRUB_PAD;

    /* Write one instant of the day into the DOM. */
    const apply = (tMin: number, p: number) => {
      const hourAngle = (tMin - 720) / 4;
      const { alt, az, sinAlt } = sunAltAz(delta, hourAngle);
      const altDeg = alt / RAD;
      const dayF = clamp01((altDeg + 1) / 5);

      // shadow of the gnomon, capped at the chapter ring
      const line = shadowRef.current;
      const tip = tipRef.current;
      if (sinAlt > 0.02) {
        const len = GNOMON / Math.tan(alt);
        const capped = Math.min(len, R_HOUR);
        const sAz = az + Math.PI;
        const ex = FOOT.x + capped * Math.sin(sAz);
        const ey = FOOT.y - capped * Math.cos(sAz);
        line?.setAttribute('d', `M${FOOT.x},${FOOT.y} L${ex.toFixed(1)},${ey.toFixed(1)}`);
        line?.setAttribute('stroke-opacity', (0.85 * clamp01((altDeg - 0.5) / 3)).toFixed(3));
        if (tip) {
          if (len <= R_HOUR) {
            tip.setAttribute('cx', (FOOT.x + len * Math.sin(sAz)).toFixed(1));
            tip.setAttribute('cy', (FOOT.y - len * Math.cos(sAz)).toFixed(1));
            tip.setAttribute('fill-opacity', clamp01((altDeg - 0.5) / 3).toFixed(3));
          } else {
            tip.setAttribute('fill-opacity', '0');
          }
        }
      } else {
        line?.setAttribute('stroke-opacity', '0');
        tip?.setAttribute('fill-opacity', '0');
      }

      // the sun itself, projected on the sky dome over the plate
      const glow = glowRef.current;
      if (glow) {
        const warm = Math.exp(-(((altDeg - 5) / 16) ** 2));
        glow.setAttribute('cx', (FOOT.x + 470 * Math.sin(az) * Math.cos(alt)).toFixed(1));
        glow.setAttribute('cy', (FOOT.y - 470 * sinAlt).toFixed(1));
        glow.setAttribute('opacity', (clamp01((altDeg + 8) / 10) * (0.14 + 0.18 * warm)).toFixed(3));
      }

      // the numeral the shadow is reading inks up in accent
      const hourF = tMin / 60;
      for (let i = 0; i < numRefs.current.length; i++) {
        const w = Math.exp(-(((hourF - (6 + i)) / 0.55) ** 2)) * dayF;
        numRefs.current[i]?.setAttribute('fill-opacity', w < 0.01 ? '0' : w.toFixed(3));
      }

      // ambient light: warm at the horizons, dark past them
      const ramp = clamp01(p / 0.06); // never veil the live instrument at rest
      const night = clamp01((2 - altDeg) / 9);
      const veilMax = document.documentElement.dataset.mode === 'night' ? 0.5 : 0.78;
      if (veilRef.current) veilRef.current.style.opacity = (ramp * night * veilMax).toFixed(3);
      if (warmRef.current && warmInnerRef.current) {
        const warm = Math.exp(-(((altDeg - 5) / 14) ** 2)) * clamp01((altDeg + 6) / 8);
        warmRef.current.style.opacity = (warm * 0.6).toFixed(3);
        const fx = 0.4 * Math.sin(az) * Math.cos(alt);
        warmInnerRef.current.style.transform = `translateX(${(fx * region.clientWidth).toFixed(1)}px)`;
      }
    };

    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const tickStatic = () => apply(solarMinutesNow(new Date()), 0);
      tickStatic();
      const id = setInterval(tickStatic, 30000);
      return () => clearInterval(id);
    }

    const lenis = new Lenis({ autoRaf: false, lerp: 0.09 });
    let displayed = solarMinutesNow(new Date());
    let scrubbing = false;
    let max = 1;
    const measure = () => {
      max = Math.max(1, region.offsetHeight - window.innerHeight);
    };
    measure();
    window.addEventListener('resize', measure);
    apply(displayed, 0);

    let last = performance.now();
    let raf = requestAnimationFrame(function frame(time: number) {
      raf = requestAnimationFrame(frame);
      lenis.raf(time);
      const dt = Math.min(Math.max(time - last, 0) / 1000, 0.05);
      last = time;

      const p = clamp01(window.scrollY / max);
      if (p > 0.03) scrubbing = true;
      else if (p < 0.005) scrubbing = false;
      const target = scrubbing ? t0 + (t1 - t0) * p : solarMinutesNow(new Date());

      const next = displayed + (target - displayed) * (1 - Math.exp(-6 * dt));
      if (Math.abs(target - displayed) < 0.05) return; // settled: no DOM writes
      displayed = next;
      apply(displayed, p);
    });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', measure);
      lenis.destroy();
    };
  }, []);

  return (
    <div className="hero-scroll" ref={scrollRef}>
      <header className="hero">
        <div className="scrub-warm" aria-hidden ref={warmRef}>
          <div className="scrub-warm-inner" ref={warmInnerRef} />
        </div>

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
              <radialGradient id="sunglow">
                <stop offset="0" stopColor="var(--glow)" stopOpacity="0.85" />
                <stop offset="0.55" stopColor="var(--glow)" stopOpacity="0.28" />
                <stop offset="1" stopColor="var(--glow)" stopOpacity="0" />
              </radialGradient>
            </defs>

            <g clipPath="url(#plate)">
              {/* the sun, riding the sky dome as the day is scrubbed */}
              <circle ref={glowRef} cx={FOOT.x} cy={FOOT.y - 470} r="430" fill="url(#sunglow)" opacity="0" />

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

              {/* the shadow: live at rest, scrubbed by scroll */}
              <path ref={shadowRef} stroke="var(--ink)" strokeOpacity="0" strokeWidth="2.2" strokeLinecap="round" />
              <circle ref={tipRef} r="3" fill="var(--accent)" fillOpacity="0" />
            </g>

            {/* numerals, with an accent twin the shadow inks up as it passes */}
            {geometry.hours.map((h, i) => {
              const p = fromFoot(h.theta, R_NUM);
              const y = Math.min(p.y, FOOT.y - 10);
              return (
                <g key={i}>
                  <text x={p.x} y={y} textAnchor="middle" dominantBaseline="middle" fill="var(--ink)" fillOpacity="0.75" fontSize="19" fontFamily="var(--font-display), Georgia, serif">
                    {NUMERALS[i]}
                  </text>
                  <text
                    ref={(el) => {
                      numRefs.current[i] = el;
                    }}
                    x={p.x}
                    y={y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="var(--accent)"
                    fillOpacity="0"
                    fontSize="19"
                    fontFamily="var(--font-display), Georgia, serif"
                  >
                    {NUMERALS[i]}
                  </text>
                </g>
              );
            })}

            {/* gnomon foot on the horizon */}
            <circle cx={FOOT.x} cy={FOOT.y} r="3" fill="var(--ink)" fillOpacity="0.8" />
            {/* horizon */}
            <line x1="0" y1={FOOT.y} x2={W} y2={FOOT.y} stroke="var(--ink)" strokeOpacity="0.45" strokeWidth="0.8" pathLength={1} className="dial-line" />
          </svg>
        </div>

        <div className="hero-captions">
          <span className="mono">Fig. I · Horizontal dial, lat. 37°46′ N · San Francisco</span>
        </div>

        <div className="scrub-veil" aria-hidden ref={veilRef} />
      </header>
    </div>
  );
}
