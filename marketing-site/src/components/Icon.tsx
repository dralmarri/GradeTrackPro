import {
  BookOpen,
  UserCheck,
  LineChart,
  FileSpreadsheet,
  ScanLine,
  Database,
  RefreshCw,
  Shield,
  Lock,
  ShieldCheck,
  EyeOff,
  type LucideProps,
} from "lucide-react";

// Maps the icon names used in content.ts to lucide-react components.
// Add more here if you extend content.ts with new feature icons.
const ICONS = {
  BookOpen,
  UserCheck,
  LineChart,
  FileSpreadsheet,
  ScanLine,
  Database,
  RefreshCw,
  Shield,
  Lock,
  ShieldCheck,
  EyeOff,
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({ name, ...props }: { name: IconName } & LucideProps) {
  const Component = ICONS[name];
  return <Component {...props} />;
}
