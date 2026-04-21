import type { Metadata } from "next";
import "./print.css";

export const metadata: Metadata = {
  title: "Knowsee Report",
  robots: { index: false, follow: false },
};

export default function PrintLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="knowsee-print-layout light">
      {/* Force light class on descendants so theme-scoped rules resolve to
          the light-mode branch, even if the root ThemeProvider has set
          `.dark` on <html> for the user's in-app preference. */}
      <script
        // biome-ignore lint/security/noDangerouslySetInnerHtml: trusted literal
        dangerouslySetInnerHTML={{
          __html: `document.documentElement.classList.remove("dark");document.documentElement.classList.add("light");`,
        }}
      />
      {children}
    </div>
  );
}
