import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "OpenComputer Lovable POC",
  description: "A local SDK-based durable agent sessions app builder proof of concept",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
