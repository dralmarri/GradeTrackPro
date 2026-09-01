# GradeTrackPro marketing site — React components

Production-ready React/TypeScript conversion of the 8 approved UX Pilot
pages (Home, Features, Pricing, Contact — English + Arabic), built from a
single bilingual content source instead of 8 duplicated HTML files.

## What's here

```
src/
  data/content.ts          all EN + AR copy, one object — edit text here
  context/LanguageContext.tsx   lang state (en/ar) + RTL/LTR
  components/
    Icon.tsx                lucide-react icon lookup by name
    Nav.tsx / Footer.tsx     shared header/footer, language + dark-mode toggle
    MarketingLayout.tsx      wraps every page (sets dir, mounts Nav/Footer)
  pages/
    Home.tsx / Features.tsx / Pricing.tsx / Contact.tsx
  MarketingRoutes.tsx        react-router-dom routes: /, /features, /pricing, /contact
  marketing.css              scoped theme tokens (won't collide with your app's theme)
```

One `Home.tsx` renders both languages by reading from `content.ts` — no
duplicated EN/AR files to keep in sync.

## Integrating into GradeTrackPro

1. **Copy `src/` into your project** (e.g. under `src/marketing/`), or hand
   these files to Lovable/your React app directly.
2. **Dependencies**: needs `react-router-dom` and `lucide-react`. Both are
   already standard in most Vite/shadcn React setups (Lovable projects
   included) — check `package.json` first, install only if missing.
3. **Mount the routes** in your app's router:
   ```tsx
   import { MarketingRoutes } from "./marketing/MarketingRoutes";
   // inside your <Routes>:
   <Route path="/*" element={<MarketingRoutes />} />
   ```
4. **Wire up real CTAs**: every `href="#"` (Try for Free, Get Started,
   Open Web App, App Store, form submit) is a placeholder — point these at
   your actual sign-up route, the App Store listing URL, and a real form
   handler (Supabase edge function, Formspree, or a `mailto:` fallback).
5. **Replace the placeholder visual blocks**: `Home.tsx` and `Features.tsx`
   have a few `<div>` blocks marked "Replace with a real app screenshot" —
   swap these for actual `<img>` screenshots of the product once available.
6. **Theming**: the site uses its own CSS variables scoped to `.gtp-marketing`
   (see `marketing.css`) so it won't fight your app's existing Tailwind/shadcn
   theme. Feel free to delete `marketing.css` and swap the `var(--accent)`
   etc. classes for your app's real design tokens instead, if you'd rather
   match your app's exact palette than keep this one self-contained.

## Content still owned by you

- **Privacy Policy** (`content.ts` → `contactPage.privacy`) is the exact
  official text already used on your Google Play listing — do not let any
  future redesign tool regenerate this section from scratch.
- **Pricing** intentionally has no paid tiers (the app is free) — if you
  ever introduce paid plans, edit `pricingPage` in `content.ts`.
