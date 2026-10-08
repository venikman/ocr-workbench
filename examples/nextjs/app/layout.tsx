import "@local/ocr-workbench/styles.css";
import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Document workspace · Next.js component example",
  description: "OCR review embedded in a Next.js App Router application.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
