// app/layout.js
import { ThemeModeScript } from "flowbite-react";
import "./globals.css";

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
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
        />
        <ThemeModeScript />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
