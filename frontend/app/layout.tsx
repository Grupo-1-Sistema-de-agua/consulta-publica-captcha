import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Oficina de Agua Potable | Consulta de recibos",
  description:
    "Sistema institucional de consulta de recibos pendientes de la Oficina de Agua Potable.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
