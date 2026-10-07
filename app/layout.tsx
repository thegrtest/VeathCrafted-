import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Veath Crafted | Handmade soap for you",
  description: "Made-to-order handmade soap with transparent ingredients, personal choices, and an optional water check.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
