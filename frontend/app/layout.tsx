import type { Metadata } from "next";
import "./globals.css";

import { CkbProvider } from "@/components/ckb-provider";

export const metadata: Metadata = {
  title: "CKB Vault",
  description: "Lock CKB for a fixed period of time.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">
        <CkbProvider>
          {children}
        </CkbProvider>
      </body>
    </html>
  );
}
