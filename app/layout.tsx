import "./globals.css";
import BottomNav from "./components/BottomNav";
import { Kanit } from "next/font/google";

const kanit = Kanit({
  subsets: ["latin", "thai"],
  weight: ["400", "500", "600", "700"],
});

export const metadata = {
  title: "Paopao Racing Line OA Portal",
  description: "This site use for customer of Paopao Racing Shop",
};

export default function RootLayout({ children }) {
  return (
    <html lang="th" suppressHydrationWarning>
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
        />
      </head>
      <body className={kanit.className}>
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
