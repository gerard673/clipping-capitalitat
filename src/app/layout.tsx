import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clipping Capitalitat",
  description: "Prototype clipping Capital Mundial de l'Arquitectura",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ca">
      <body>{children}</body>
    </html>
  );
}
