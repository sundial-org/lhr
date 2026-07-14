'use client';

import { useEffect, useState } from 'react';
import './quiet.css';

/* The analemma itself: equation of time (west-east) against declination (south-north). */
function analemma(w: number, h: number) {
  const pts: string[] = [];
  for (let day = 0; day <= 365; day += 3) {
    const b = ((day - 81) / 364) * 2 * Math.PI;
    const eot = 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b); // ±16 min
    const dec = 23.45 * Math.sin(((284 + day) / 365) * 2 * Math.PI); // ±23.45°
    const x = w / 2 + (eot / 17) * (w / 2);
    const y = h / 2 - (dec / 24.5) * (h / 2);
    pts.push(`${pts.length ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return pts.join(' ') + ' Z';
}

export default function Quiet() {
  const [solar, setSolar] = useState<string | null>(null);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const day = Math.floor((now.getTime() - Date.UTC(now.getUTCFullYear(), 0, 0)) / 86400000);
      const b = ((day - 81) / 364) * 2 * Math.PI;
      const eot = 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
      const utc = now.getUTCHours() * 60 + now.getUTCMinutes();
      const m = (((utc + 4 * -122.4194 + eot) % 1440) + 1440) % 1440;
      setSolar(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(Math.floor(m % 60)).padStart(2, '0')}`);
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <main className="quiet">
      <div className="quiet-card">
        <span className="quiet-sun" aria-hidden>
          ☉
        </span>
        <h1>Long Horizon Research</h1>
        <p className="quiet-line">Infrastructure for meaningful work between humans and machines.</p>

        <nav className="quiet-index">
          <a href="https://sundialhub.com" target="_blank" rel="noreferrer">
            <span className="n">01</span>
            <span className="dots" />
            <span className="t">Sundial — the first instrument</span>
          </a>
          <a
            href="https://belindamo.com/b/infrastructure+for+meaningful+work"
            target="_blank"
            rel="noreferrer"
          >
            <span className="n">02</span>
            <span className="dots" />
            <span className="t">Manifesto</span>
          </a>
          <a href="mailto:team@longhorizonresearch.com">
            <span className="n">03</span>
            <span className="dots" />
            <span className="t">Write to us</span>
          </a>
        </nav>

        <svg className="quiet-mark" viewBox="0 0 40 90" aria-hidden>
          <path d={analemma(40, 86)} transform="translate(0,2)" stroke="#9c3a22" strokeWidth="0.9" fill="none" />
        </svg>

        <p className="quiet-foot">
          a small research lab · San Francisco
          {solar ? (
            <>
              <br />
              apparent solar time {solar}
            </>
          ) : null}
        </p>
      </div>
    </main>
  );
}
