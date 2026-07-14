import type { Metadata } from 'next';
import { Instrument_Serif, Newsreader, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

const display = Instrument_Serif({
  weight: '400',
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-display',
});

const body = Newsreader({
  weight: ['300', '400', '500'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-body',
});

const mono = IBM_Plex_Mono({
  weight: ['300', '400'],
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'Long Horizon Research',
  description:
    'A research lab in San Francisco studying how humans and agents do meaningful work together. First instrument: Sundial.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-mode="day"
      className={`${display.variable} ${body.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <body>{children}</body>
    </html>
  );
}
