"use client";

import { useEffect } from "react";

import { ensureDbSeeded } from "@/lib/db/bootstrap";
import { useSettingsStore } from "@/lib/store/settingsStore";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const hydrate = useSettingsStore((s) => s.hydrate);

  useEffect(() => {
    void (async () => {
      await ensureDbSeeded();
      await hydrate();
    })();
  }, [hydrate]);

  return <>{children}</>;
}
