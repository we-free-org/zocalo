import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { UserbackProvider } from "@/components/UserbackProvider";
import { StoreProvider } from "@/stores";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "COPAILOT - International expansion experts",
  description: "Expert-led international trade and export expansion platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <StoreProvider>
          <UserbackProvider>
            {children}
          </UserbackProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
