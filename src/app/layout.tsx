import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Poppins } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { Providers } from "@/components/providers/SessionProvider";
import ToastProvider from "@/components/providers/ToastProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ElectroLux - Electricity Distribution Management",
  description: "Modern electricity distribution management system with real-time monitoring and smart billing",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} ${poppins.variable} antialiased`}
      >
        <Providers>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} storageKey="electrolux-theme">
            {children}
            <ToastProvider />
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}

