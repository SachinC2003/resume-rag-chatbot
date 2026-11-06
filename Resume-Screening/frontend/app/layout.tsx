import type { Metadata } from "next";
import Script from "next/script";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToaster } from "@/components/theme-toaster";
import "./globals.css";

export const metadata: Metadata = {
  title: "TalentDesk | Resume screening",
  description: "Search and shortlist candidates across your resume library.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Script id="theme-init" strategy="beforeInteractive">
          {`try {
  const savedTheme = localStorage.getItem("talentdesk-theme") || "dark";
  const isDark = savedTheme !== "light";
  document.documentElement.classList.toggle("dark", isDark);
  document.documentElement.style.colorScheme = isDark ? "dark" : "light";
} catch (error) {
  console.warn("Could not restore the selected theme.", error);
}`}
        </Script>
        <ThemeProvider>
          {children}
          <ThemeToaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
