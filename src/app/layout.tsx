import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Luma — Lending, with a little more clarity",
  description: "A colorful lending workspace demo. Customers, loans, releases, and daily collections in one place. All records are fictional.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
