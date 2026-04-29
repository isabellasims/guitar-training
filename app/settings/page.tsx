"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useSettingsStore } from "@/lib/store/settingsStore";

export default function SettingsPage() {
  const { settings, hydrated, update } = useSettingsStore();

  if (!hydrated) {
    return (
      <main className="px-4 py-8">
        <p className="text-sm text-ink-mute">Loading settings…</p>
      </main>
    );
  }

  return (
    <main className="px-4 py-8">
      <header className="mb-8">
        <p className="font-mono text-[10px] uppercase tracking-widest text-ink-mute">
          Settings
        </p>
        <h1 className="font-display text-3xl text-ink">Preferences</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Stored locally in IndexedDB on this device only.
        </p>
      </header>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Session</CardTitle>
            <CardDescription>Routine targets (session builder uses these later).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mins">Target minutes</Label>
              <Input
                id="mins"
                type="number"
                min={5}
                max={120}
                value={settings.targetSessionMinutes}
                onChange={(e) =>
                  void update({
                    targetSessionMinutes: Math.max(
                      5,
                      Math.min(120, parseInt(e.target.value, 10) || 5),
                    ),
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="days">Days per week</Label>
              <Input
                id="days"
                type="number"
                min={1}
                max={7}
                value={settings.daysPerWeek}
                onChange={(e) =>
                  void update({
                    daysPerWeek: Math.max(
                      1,
                      Math.min(7, parseInt(e.target.value, 10) || 1),
                    ),
                  })
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Audio</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-ink">Pitch detection</p>
                <p className="text-xs text-ink-mute">
                  Turn off in noisy rooms; self-rating fallback applies per card
                  when disabled.
                </p>
              </div>
              <Switch
                checked={settings.pitchDetectionEnabled}
                onCheckedChange={(checked) =>
                  void update({ pitchDetectionEnabled: checked })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vol">Drone volume (0–1)</Label>
              <Input
                id="vol"
                type="number"
                step="0.05"
                min={0.05}
                max={1}
                value={settings.droneVolume}
                onChange={(e) =>
                  void update({
                    droneVolume: Math.min(
                      1,
                      Math.max(0.05, parseFloat(e.target.value) || 0.65),
                    ),
                  })
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fretboard</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-ink">Left-handed</p>
                <p className="text-xs text-ink-mute">Mirror diagrams when wired.</p>
              </div>
              <Switch
                checked={settings.leftHanded}
                onCheckedChange={(checked) => void update({ leftHanded: checked })}
              />
            </div>
          </CardContent>
        </Card>

        <p className="px-1 font-mono text-[10px] text-ink-mute">
          No accounts. Export/import JSON can be added later for a second
          device.
        </p>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled
        >
          Export progress (soon)
        </Button>
      </div>
    </main>
  );
}
