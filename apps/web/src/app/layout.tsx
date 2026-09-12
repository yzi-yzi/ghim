import type { Metadata } from "next";
import type { ReactNode } from "react";

import { TooltipProvider } from "@ghim/ui/components/tooltip";

import "./globals.css";

export const metadata: Metadata = {
  description:
    "Ghim giúp người Việt ghi nhớ từ vựng tiếng Anh gặp trong nội dung thật.",
  title: "Ghim — Gặp từ nào, nhớ từ đó",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="vi">
      <body>
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
