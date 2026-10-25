import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'BUYWISE — Considered decisions',
  description:
    'Your purchases. Your priorities. An independent decision layer for thoughtful shopping.',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
