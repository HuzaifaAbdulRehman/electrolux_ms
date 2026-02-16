import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Electrolux EMS",
  description: "Electricity Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
