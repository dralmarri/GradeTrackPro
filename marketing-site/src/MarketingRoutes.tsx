import { Routes, Route } from "react-router-dom";
import { LanguageProvider } from "./context/LanguageContext";
import Home from "./pages/Home";
import Features from "./pages/Features";
import Pricing from "./pages/Pricing";
import Contact from "./pages/Contact";

/**
 * Drop this into your app's router, e.g.:
 *
 *   import { MarketingRoutes } from "./marketing-site/src/MarketingRoutes";
 *   <Route path="/*" element={<MarketingRoutes />} />
 *
 * The language switcher in the Nav toggles English/Arabic client-side.
 * If you'd rather have separate /ar URLs for SEO, wrap two <Routes> trees
 * with LanguageProvider initialLang="en" / "ar" under /  and /ar instead.
 */
export function MarketingRoutes() {
  return (
    <LanguageProvider initialLang="en">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/features" element={<Features />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/contact" element={<Contact />} />
      </Routes>
    </LanguageProvider>
  );
}
