import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

// Fonte self-hosted pelo Next (sem @import do Google Fonts em runtime → evita FOUT).
const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-outfit",
  display: "swap",
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.drluizedumamede.com.br";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: "LEM app | Dr. Luiz Eduardo Mamede",
  description: "Plataforma de gestão de contratos e orçamentos cirúrgicos.",
  openGraph: {
    title: "Dr. Luiz Eduardo Mamede",
    description: "Contratos e orçamentos cirúrgicos com segurança e praticidade.",
    type: "website",
    locale: "pt_BR",
    images: [{ url: "/logo.png", width: 1572, height: 655, alt: "Dr. Luiz Eduardo Mamede" }],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={outfit.variable}>
      <body>
        {children}
      </body>
    </html>
  );
}
