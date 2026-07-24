import type { Metadata, Viewport } from "next";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "VoidToInfinite",
  description: "VoidToInfinite — presente y futuro de un equipo creativo.",
  metadataBase: new URL("https://voidtoinfinite.com"),
  openGraph: {
    title: "VoidToInfinite",
    description: "VoidToInfinite — presente y futuro de un equipo creativo.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
