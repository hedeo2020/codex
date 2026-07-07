import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Clockwise | Secure Attendance", description: "Privacy-first employee attendance verification" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
