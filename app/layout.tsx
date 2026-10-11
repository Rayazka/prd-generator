/**
 * @file    app/layout.tsx
 * @brief   Define root HTML shell with global styles
 * @author  opencode
 * @created 2026-10-12
 * @todo    - Add ID/EN lang handling (T-12)
 */
import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "prd-generator",
  description: "Ubah cerita ide bebas menjadi PRD siap eksekusi.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
