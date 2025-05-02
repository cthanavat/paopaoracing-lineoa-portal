// app/layout.js
import { ThemeModeScript } from "flowbite-react";
import "./globals.css";

export const metadata = {
  title: "Paopao Racing Line OA Portal",
  description: "This site use for customer of Paopao Racing Shop",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeModeScript />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
