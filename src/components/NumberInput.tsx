import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  className?: string;
  allowNegative?: boolean;
  placeholder?: string;
  showZero?: boolean;
}

/**
 * Free-text numeric input that:
 * - Lets the user type freely (incl. empty, partial, leading "-")
 * - Commits parsed number on every valid keystroke (without clamping mid-typing)
 * - Clamps only on blur, so e.g. typing "12" when max=20 won't snap to "1"
 * - Re-syncs with external prop changes only when the input is NOT focused
 */
export default function NumberInput({
  value,
  onChange,
  min,
  max,
  className,
  allowNegative = false,
  placeholder,
  showZero = false,
}: NumberInputProps) {
  const display = (v: number) => (v === 0 && !showZero ? "" : String(v));
  const [text, setText] = useState<string>(display(value));
  const focusedRef = useRef(false);

  useEffect(() => {
    if (!focusedRef.current) setText(display(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, showZero]);

  const sanitize = (raw: string) => {
    let s = raw.replace(/[^\d\-.]/g, "");
    if (!allowNegative) s = s.replace(/-/g, "");
    else {
      // keep only leading "-"
      const neg = s.startsWith("-");
      s = (neg ? "-" : "") + s.replace(/-/g, "");
    }
    // only one decimal
    const firstDot = s.indexOf(".");
    if (firstDot !== -1) {
      s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, "");
    }
    return s;
  };

  const clamp = (n: number) => {
    let v = n;
    if (typeof min === "number") v = Math.max(min, v);
    if (typeof max === "number") v = Math.min(max, v);
    return v;
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      pattern="[0-9]*"
      placeholder={placeholder}
      value={text}
      onFocus={() => {
        focusedRef.current = true;
      }}
      onChange={(e) => {
        const next = sanitize(e.target.value);
        setText(next);
        if (next === "" || next === "-" || next === ".") {
          onChange(0);
          return;
        }
        const n = Number(next);
        if (!Number.isNaN(n)) onChange(n);
      }}
      onBlur={() => {
        focusedRef.current = false;
        if (text === "" || text === "-" || text === ".") {
          setText(display(0));
          onChange(0);
          return;
        }
        const n = Number(text);
        if (Number.isNaN(n)) {
          setText(display(value));
          return;
        }
        const c = clamp(n);
        setText(display(c));
        if (c !== n) onChange(c);
      }}
      className={cn(
        "w-16 rounded-md border border-border bg-background px-2 py-1.5 text-center text-sm font-medium outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20",
        className,
      )}
    />
  );
}
