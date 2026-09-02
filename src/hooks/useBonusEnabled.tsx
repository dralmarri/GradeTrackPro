import { useEffect, useState } from "react";

const KEY = "gtp-bonus-enabled";
const EVENT = "gtp-bonus-enabled-changed";

export function getBonusEnabled(): boolean {
  if (typeof window === "undefined") return false;
  const v = localStorage.getItem(KEY);
  return v === "1";
}

export function setBonusEnabledValue(enabled: boolean) {
  localStorage.setItem(KEY, enabled ? "1" : "0");
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function useBonusEnabled(): [boolean, (v: boolean) => void] {
  const [enabled, setEnabled] = useState<boolean>(getBonusEnabled);

  useEffect(() => {
    const onChange = () => setEnabled(getBonusEnabled());
    window.addEventListener(EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const setter = (v: boolean) => {
    setBonusEnabledValue(v);
    setEnabled(v);
  };

  return [enabled, setter];
}
