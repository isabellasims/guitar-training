"use client";

import { useRef, useState } from "react";

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
import { db } from "@/lib/db/index";
import { ensureDbSeeded, ensureTrackProgressSeeded } from "@/lib/db/bootstrap";
import {
  downloadProgressExport,
  importProgress,
  parseImportFile,
} from "@/lib/db/progressExport";

export default function SettingsPage() {
  const { settings, hydrated, update } = useSettingsStore();
  const [resetting, setResetting] = useState(false);
  const [resetMsg, setResetMsg] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [transferMsg, setTransferMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const onExport = async () => {
    setExporting(true);
    setTransferMsg(null);
    try {
      await downloadProgressExport();
      setTransferMsg("Export downloaded.");
    } catch (err) {
      setTransferMsg(
        `Export failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setExporting(false);
    }
  };

  const onImportFile = async (file: File) => {
    setImporting(true);
    setTransferMsg(null);
    try {
      const payload = await parseImportFile(file);
      const ok = window.confirm(
        `Importing will overwrite everything currently saved on this device — progress, custom flashcards, stars, saved backing tracks, all of it. Continue?\n\nExported at ${payload.exportedAt ?? "(unknown)"}.`,
      );
      if (!ok) {
        setTransferMsg("Import cancelled.");
        return;
      }
      const { counts } = await importProgress(payload);
      // Reseed any tables the export left empty (e.g. settings).
      await Promise.all([ensureDbSeeded(), ensureTrackProgressSeeded()]);
      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      setTransferMsg(
        `Imported ${total} rows. Reload to pick up settings and progress changes.`,
      );
      window.dispatchEvent(new CustomEvent("tonic-track-progress-updated"));
      window.dispatchEvent(new CustomEvent("tonic-streak-updated"));
    } catch (err) {
      setTransferMsg(
        `Import failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const resetProgress = async () => {
    const ok = window.confirm(
      "Wipe all progress on this device? This clears every track, every review item, every session, your streak, and your starred cards. Settings are kept. This cannot be undone.",
    );
    if (!ok) return;
    setResetting(true);
    setResetMsg(null);
    try {
      await Promise.all([
        db.trackProgress.clear(),
        db.reviewItems.clear(),
        db.sessions.clear(),
        db.streak.clear(),
        db.starredCards?.clear?.(),
        db.customCards?.clear?.(),
        db.skippedCards?.clear?.(),
        db.backingTracks?.clear?.(),
      ]);
      await Promise.all([ensureDbSeeded(), ensureTrackProgressSeeded()]);
      setResetMsg("Progress wiped. Reload any open tabs.");
      window.dispatchEvent(new CustomEvent("tonic-track-progress-updated"));
      window.dispatchEvent(new CustomEvent("tonic-streak-updated"));
    } catch (err) {
      setResetMsg(
        `Reset failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setResetting(false);
    }
  };

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

        <Card>
          <CardHeader>
            <CardTitle>Move to another device</CardTitle>
            <CardDescription>
              No accounts — everything lives in your browser&apos;s IndexedDB.
              Export a JSON snapshot of your progress, custom flashcards,
              starred cards, saved backing tracks, and streak; import it on
              another device or browser to pick up where you left off.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={exporting}
                onClick={() => void onExport()}
              >
                {exporting ? "Exporting…" : "Export progress"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={importing}
                onClick={() => fileInputRef.current?.click()}
              >
                {importing ? "Importing…" : "Import progress"}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void onImportFile(f);
                }}
              />
            </div>
            {transferMsg ? (
              <p className="text-xs text-ink-mute">{transferMsg}</p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Danger zone</CardTitle>
            <CardDescription>
              Wipe local progress and start over. Settings are kept.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              type="button"
              variant="destructive"
              className="w-full"
              disabled={resetting}
              onClick={() => void resetProgress()}
            >
              {resetting ? "Resetting…" : "Reset all progress"}
            </Button>
            {resetMsg ? (
              <p className="text-xs text-ink-mute">{resetMsg}</p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
