import type { ReactNode } from "react";
import { useLanguage } from "../context/LanguageContext";
import { Nav } from "./Nav";
import { Footer } from "./Footer";
import "../marketing.css";

/** Wraps every marketing page: sets dir=rtl/ltr, mounts Nav + Footer. */
export function MarketingLayout({ children }: { children: ReactNode }) {
  const { t } = useLanguage();
  return (
    <div dir={t.dir} className="gtp-marketing font-sans antialiased min-h-screen">
      <Nav />
      <main className="pt-24">{children}</main>
      <Footer />
    </div>
  );
}
