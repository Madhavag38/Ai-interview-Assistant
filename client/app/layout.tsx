import type { Metadata } from "next";
// @ts-ignore: allow side-effect CSS import without type declarations
import "./globals.css";

import { AuthProvider } from "@/context/Authcontext";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "AI Interview Assistant",
  description: "AI-powered mock interview platform with voice support",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans antialiased">
        <AuthProvider>
          <Navbar />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}