import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { Nav } from "@/components/Nav";

export const metadata: Metadata = {
  title: "AgroLink — Da fazenda à mesa, sem perder a carga no caminho",
  description:
    "Marketplace agrícola, logística rural e aluguel de máquinas numa só plataforma. Conectando agricultores, compradores, transportadores e cooperativas em Angola.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-AO">
      <body>
        <AuthProvider>
          <Nav />
          <main>{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
