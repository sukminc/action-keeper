import type { ReactNode } from "react";
import "./styles.css";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: "#030712" }}>
        {children}
      </body>
    </html>
  );
}
