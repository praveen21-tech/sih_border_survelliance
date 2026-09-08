import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BorderEye AI — Border Surveillance Analytics",
  description:
    "Enterprise-grade border surveillance and threat detection platform powered by AI.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">{children}</body>
    </html>
  );
}
