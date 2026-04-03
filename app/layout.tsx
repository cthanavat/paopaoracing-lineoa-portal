import "./globals.css";
import BottomNav from "./components/BottomNav";
import DevServiceWorkerReset from "./components/DevServiceWorkerReset";
import { Kanit } from "next/font/google";
import type { ReactNode } from "react";

const kanit = Kanit({
  subsets: ["latin", "thai"],
  weight: ["400", "500", "600", "700"],
});

export const metadata = {
  title: "Paopao Racing Line OA Portal",
  description: "This site use for customer of Paopao Racing Shop",
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="th" suppressHydrationWarning>
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
        />
      </head>
      <body className={kanit.className}>
        <DevServiceWorkerReset />
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
