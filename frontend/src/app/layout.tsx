import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "भारत सरकार • BorderEye AI — Strategic Border Surveillance Platform",
  description:
    "Ministry of Home Affairs, Government of India — Enterprise Multi-Camera Vision, Acoustic UAV Detection, Biometric & Forensic Intelligence Platform.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="light">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Noto+Sans+Devanagari:wght@400;500;600;700&family=Roboto+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
