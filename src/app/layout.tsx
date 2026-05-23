import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LEM app | Dr. Luiz Eduardo Mamede",
  description: "Plataforma de gestão de contratos e orçamentos cirúrgicos.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
      </body>
    </html>
  );
}
