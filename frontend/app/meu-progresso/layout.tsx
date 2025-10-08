import { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Meu Progresso - Team Cruz",
  description: "Acompanhe seu progresso de graduação no Brazilian Jiu-Jitsu",
};

export const viewport: Viewport = {
  themeColor: "#1a202c",
  width: "device-width",
  initialScale: 1,
};

export default function MeuProgressoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
