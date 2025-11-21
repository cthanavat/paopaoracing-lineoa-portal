import "./globals.css";
import BottomNav from "./components/BottomNav";

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
      <body className="font-sans antialiased">
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
