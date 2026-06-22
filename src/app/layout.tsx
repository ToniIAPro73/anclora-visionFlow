import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AncloraVisionFlow · Tablero Visual Inteligente",
  description:
    "Convierte cualquier idea, proyecto o problema del ecosistema Anclora en un mapa visual interactivo con objetivos, pasos, riesgos, herramientas, costes, prioridades y próximos pasos.",
  keywords: [
    "Anclora",
    "VisionFlow",
    "mapa visual",
    "tablero inteligente",
    "Anclora Group",
    "planificación visual",
    "nodos",
  ],
  authors: [{ name: "Anclora Group" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "AncloraVisionFlow · Tablero Visual Inteligente",
    description:
      "Mapa visual interactivo para el ecosistema Anclora Group con generación automática de objetivos, pasos, riesgos, herramientas, costes y prioridades.",
    siteName: "AncloraVisionFlow",
    type: "website",
  },
};

const themeScript = `(function(){try{var t=localStorage.getItem('vf-theme');if(t==='light'){document.documentElement.classList.remove('dark')}else{document.documentElement.classList.add('dark')}}catch(e){document.documentElement.classList.add('dark')}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      {/* eslint-disable-next-line @next/next/no-head-element */}
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
