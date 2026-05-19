"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Pencil,
  Play,
  Plus,
  Save,
  Square,
  Trash2,
} from "lucide-react";

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
import {
  startProgressionLooper,
  type ProgressionLooperHandle,
} from "@/lib/audio/progressionLooper";
import {
  deleteBackingTrack,
  getAllBackingTracks,
  saveBackingTrack,
} from "@/lib/db/index";
import type { BackingTrackRow, BackingTrackStep } from "@/lib/db/schema";
import {
  ROOT_CHOICES,
  diatonicChords,
  preferredSpellingForKey,
  type ChordQuality,
  type DiatonicChord,
} from "@/lib/music/chords";

// ─── helpers ────────────────────────────────────────────────────────────

function uid(): string {
  return crypto.randomUUID();
}

function chordToStep(c: DiatonicChord): BackingTrackStep {
  return {
    roman: c.roman,
    rootName: c.rootName,
    quality: c.quality,
    rootMidi: c.rootMidi,
    notes: c.notes,
  };
}

function keyLabel(rootName: string, mode: "major" | "minor"): string {
  return `${rootName} ${mode}`;
}

function chordCardLabel(step: BackingTrackStep): string {
  const q = step.quality as ChordQuality;
  const suffix = q === "M" ? "" : q === "m" ? "m" : "°";
  return `${step.rootName}${suffix}`;
}

// ─── Page ───────────────────────────────────────────────────────────────

export default function ChordExplorerPage() {
  // Key state. Default to C major.
  const [tonicMidi, setTonicMidi] = useState<number>(60);
  const [tonicPc, setTonicPc] = useState<number>(0);
  const [mode, setMode] = useState<"major" | "minor">("major");

  // Sequence + playback settings.
  const [sequence, setSequence] = useState<BackingTrackStep[]>([]);
  const [beatsPerChord, setBeatsPerChord] = useState<number>(4);
  const [tempoBpm, setTempoBpm] = useState<number>(80);
  const [loop, setLoop] = useState<boolean>(true);
  const [metronome, setMetronome] = useState<boolean>(false);

  // Playback state.
  const [playing, setPlaying] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number | null>(null);
  const looperRef = useRef<ProgressionLooperHandle | null>(null);
  const auditionRef = useRef<ProgressionLooperHandle | null>(null);

  // Persistence.
  const [saved, setSaved] = useState<BackingTrackRow[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null);
  const [trackName, setTrackName] = useState<string>("");

  const loadSaved = useCallback(async () => {
    try {
      const rows = await getAllBackingTracks();
      setSaved(rows);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[chord-explorer] getAllBackingTracks failed", err);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    void loadSaved();
  }, [loadSaved]);

  // Stop any audio + dispose synths when the page unmounts.
  useEffect(() => {
    return () => {
      looperRef.current?.cancel();
      auditionRef.current?.cancel();
    };
  }, []);

  const chords = useMemo(
    () => diatonicChords(tonicMidi, mode),
    [tonicMidi, mode],
  );

  const tonicName = useMemo(() => {
    const choice = ROOT_CHOICES.find((r) => r.pc === tonicPc) ?? ROOT_CHOICES[0]!;
    const spelling = preferredSpellingForKey(tonicPc, mode);
    return spelling === "flat" ? choice.flatName : choice.sharpName;
  }, [tonicPc, mode]);

  // ─── Key picker ──────────────────────────────────────────────────────

  const pickRoot = useCallback((choice: (typeof ROOT_CHOICES)[number]) => {
    setTonicMidi(choice.midi);
    setTonicPc(choice.pc);
  }, []);

  // ─── Auditioning + adding chords ────────────────────────────────────

  const auditionChord = useCallback((c: DiatonicChord) => {
    auditionRef.current?.cancel();
    // Use the same engine the looper uses so the audition sounds like
    // what you'll hear once the chord is in the backing track. Two beats
    // at 80 BPM ≈ 1.5s per audition.
    const handle = startProgressionLooper({
      chords: [c.notes],
      bpm: 80,
      beatsPerChord: 2,
      loop: false,
      metronome: false,
    });
    auditionRef.current = handle;
  }, []);

  const addChord = useCallback((c: DiatonicChord) => {
    setSequence((prev) => [...prev, chordToStep(c)]);
  }, []);

  const removeAt = useCallback((index: number) => {
    setSequence((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const moveStep = useCallback((index: number, delta: -1 | 1) => {
    setSequence((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      const tmp = next[index]!;
      next[index] = next[target]!;
      next[target] = tmp;
      return next;
    });
  }, []);

  const clearSequence = useCallback(() => {
    setSequence([]);
    setEditingTrackId(null);
    setTrackName("");
  }, []);

  // ─── Playback ────────────────────────────────────────────────────────

  const stopPlayback = useCallback(() => {
    looperRef.current?.cancel();
    looperRef.current = null;
    setPlaying(false);
    setCurrentStep(null);
  }, []);

  const startPlayback = useCallback(() => {
    if (sequence.length === 0) return;
    looperRef.current?.cancel();
    auditionRef.current?.cancel();
    const handle = startProgressionLooper({
      chords: sequence.map((s) => s.notes),
      bpm: tempoBpm,
      beatsPerChord,
      loop,
      metronome,
      onStep: (i) => setCurrentStep(i),
    });
    looperRef.current = handle;
    setPlaying(true);
    if (!loop) {
      handle.promise
        .catch(() => {
          /* swallow — cancel races are normal */
        })
        .finally(() => {
          // Only flip state off if the *current* handle is the one that
          // finished naturally (user may have started a new loop already).
          if (looperRef.current === handle) {
            looperRef.current = null;
            setPlaying(false);
            setCurrentStep(null);
          }
        });
    }
  }, [sequence, tempoBpm, beatsPerChord, loop, metronome]);

  // Stop playback if the sequence becomes empty mid-play.
  useEffect(() => {
    if (playing && sequence.length === 0) stopPlayback();
  }, [playing, sequence.length, stopPlayback]);

  // Restart playback when playback settings change mid-loop so the new
  // tempo / beats-per-chord take effect immediately.
  useEffect(() => {
    if (!playing) return;
    stopPlayback();
    // Defer one tick so the cancel flushes before we restart.
    const id = window.setTimeout(() => startPlayback(), 50);
    return () => window.clearTimeout(id);
    // We intentionally re-run on the playback knobs. `startPlayback` is
    // stable-ish (depends on sequence + settings); restarting on its
    // identity captures all of them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tempoBpm, beatsPerChord, loop, metronome]);

  // ─── Persistence ─────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (sequence.length === 0) return;
    const trimmed = trackName.trim();
    if (!trimmed) return;
    const now = new Date().toISOString();
    const id = editingTrackId ?? uid();
    const existing = saved.find((t) => t.id === id);
    const row: BackingTrackRow = {
      id,
      name: trimmed,
      tonicMidi,
      tonicPc,
      mode,
      keyLabel: keyLabel(tonicName, mode),
      steps: sequence,
      beatsPerChord,
      tempoBpm,
      loop,
      metronome,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    await saveBackingTrack(row);
    setEditingTrackId(id);
    await loadSaved();
  }, [
    sequence,
    trackName,
    editingTrackId,
    saved,
    tonicMidi,
    tonicPc,
    mode,
    tonicName,
    beatsPerChord,
    tempoBpm,
    loop,
    metronome,
    loadSaved,
  ]);

  const handleLoad = useCallback(
    (row: BackingTrackRow) => {
      stopPlayback();
      setTonicMidi(row.tonicMidi);
      setTonicPc(row.tonicPc);
      setMode(row.mode);
      setSequence(row.steps);
      setBeatsPerChord(row.beatsPerChord);
      setTempoBpm(row.tempoBpm);
      setLoop(row.loop);
      setMetronome(row.metronome);
      setEditingTrackId(row.id);
      setTrackName(row.name);
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    },
    [stopPlayback],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteBackingTrack(id);
      if (editingTrackId === id) {
        setEditingTrackId(null);
        setTrackName("");
      }
      await loadSaved();
    },
    [editingTrackId, loadSaved],
  );

  // ─── Render ──────────────────────────────────────────────────────────

  const playingChord = currentStep != null ? sequence[currentStep] : null;

  return (
    <main className="px-4 py-8">
      <header className="mb-8">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.28em] text-rust">
          Tool
        </p>
        <h1 className="font-display text-3xl text-ink">Chord Explorer</h1>
        <p className="mt-2 max-w-xl text-sm text-ink-soft">
          Pick a key, hear every diatonic chord, and stack them into a
          looping backing track you can solo over.
        </p>
      </header>

      {/* ─── now playing banner ──────────────────────────────────── */}
      {playing && playingChord ? (
        <Card className="mb-6 border-rust/40 bg-paper-soft">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div className="min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-rust">
                Now playing · {keyLabel(tonicName, mode)}
              </p>
              <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <p className="font-display text-3xl text-ink">
                  {playingChord.roman}
                </p>
                <p className="font-display text-2xl text-ink-soft">
                  {chordCardLabel(playingChord)}
                </p>
              </div>
              <p className="mt-1 text-xs text-ink-mute">
                Step {(currentStep ?? 0) + 1} of {sequence.length} ·{" "}
                {beatsPerChord} {beatsPerChord === 1 ? "beat" : "beats"} @{" "}
                {tempoBpm} BPM
              </p>
            </div>
            <Button
              type="button"
              variant="rust"
              size="sm"
              onClick={stopPlayback}
              className="shrink-0"
            >
              <Square className="mr-1 h-4 w-4" strokeWidth={1.75} />
              Stop
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* ─── key picker ─────────────────────────────────────────── */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Key</CardTitle>
          <CardDescription>
            Currently in {keyLabel(tonicName, mode)}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {ROOT_CHOICES.map((c) => {
              const sel = c.pc === tonicPc;
              const label =
                preferredSpellingForKey(c.pc, mode) === "flat"
                  ? c.flatName
                  : c.sharpName;
              return (
                <Button
                  key={c.pc}
                  type="button"
                  size="sm"
                  variant={sel ? "rust" : "outline"}
                  onClick={() => pickRoot(c)}
                >
                  {label}
                </Button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={mode === "major" ? "rust" : "outline"}
              onClick={() => setMode("major")}
            >
              Major
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mode === "minor" ? "rust" : "outline"}
              onClick={() => setMode("minor")}
            >
              Minor
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ─── diatonic chord grid ────────────────────────────────── */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Diatonic chords</CardTitle>
          <CardDescription>
            Hear a chord, then add it to your backing track.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {chords.map((c) => (
              <div
                key={c.degreeIndex}
                className="flex flex-col gap-3 rounded-md border border-rule bg-paper-soft p-4"
              >
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-rust">
                    {c.roman}
                  </p>
                  <p className="mt-1 font-display text-2xl text-ink">
                    {chordCardLabel(chordToStep(c))}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-mute">
                    {c.qualityLabel}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    variant="rust"
                    size="sm"
                    className="w-full"
                    onClick={() => addChord(c)}
                    aria-label={`Add ${c.rootName} ${c.qualityLabel} to backing track`}
                  >
                    <Plus className="h-4 w-4" strokeWidth={1.75} />
                    Add to track
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => auditionChord(c)}
                    aria-label={`Hear ${c.rootName} ${c.qualityLabel}`}
                  >
                    <Play className="h-4 w-4" strokeWidth={1.75} />
                    Hear it
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ─── sequence + playback ────────────────────────────────── */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Backing track</CardTitle>
          <CardDescription>
            {sequence.length === 0
              ? "Empty — add chords from the grid above to get started."
              : `${sequence.length} chord${
                  sequence.length === 1 ? "" : "s"
                } in this loop.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Playback settings */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="bpm">Tempo (BPM)</Label>
                <Input
                  id="bpm"
                  type="number"
                  min={40}
                  max={240}
                  value={tempoBpm}
                  onChange={(e) =>
                    setTempoBpm(
                      Math.max(
                        40,
                        Math.min(240, Number(e.target.value) || 80),
                      ),
                    )
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="beats">Beats per chord</Label>
                <Input
                  id="beats"
                  type="number"
                  min={1}
                  max={16}
                  value={beatsPerChord}
                  onChange={(e) =>
                    setBeatsPerChord(
                      Math.max(
                        1,
                        Math.min(16, Number(e.target.value) || 4),
                      ),
                    )
                  }
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <label
                htmlFor="loop"
                className="flex cursor-pointer items-center gap-2 text-sm text-ink"
              >
                <input
                  id="loop"
                  type="checkbox"
                  checked={loop}
                  onChange={(e) => setLoop(e.target.checked)}
                  className="h-4 w-4"
                />
                Loop
              </label>
              <label
                htmlFor="metro"
                className="flex cursor-pointer items-center gap-2 text-sm text-ink"
              >
                <input
                  id="metro"
                  type="checkbox"
                  checked={metronome}
                  onChange={(e) => setMetronome(e.target.checked)}
                  className="h-4 w-4"
                />
                Metronome click
              </label>
            </div>
          </div>

          {/* Sequence list */}
          {sequence.length > 0 ? (
            <ul className="space-y-2">
              {sequence.map((step, i) => {
                const isCur = playing && currentStep === i;
                return (
                  <li
                    key={`${i}-${step.roman}-${step.rootName}`}
                    className={[
                      "flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md border px-3 py-2",
                      isCur
                        ? "border-rust bg-rust/10"
                        : "border-rule bg-paper-soft",
                    ].join(" ")}
                  >
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-mute">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      <span className="mr-2 font-mono text-sm text-rust">
                        {step.roman}
                      </span>
                      <span className="font-display text-lg text-ink">
                        {chordCardLabel(step)}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => moveStep(i, -1)}
                        disabled={i === 0 || playing}
                        aria-label="Move up"
                        className="px-2"
                      >
                        <ArrowUp className="h-4 w-4" strokeWidth={1.75} />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => moveStep(i, 1)}
                        disabled={i === sequence.length - 1 || playing}
                        aria-label="Move down"
                        className="px-2"
                      >
                        <ArrowDown className="h-4 w-4" strokeWidth={1.75} />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => removeAt(i)}
                        disabled={playing}
                        aria-label="Remove step"
                        className="px-2 text-rust"
                      >
                        <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                      </Button>
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : null}

          {/* Play / Stop / Clear */}
          {sequence.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              {playing ? (
                <Button
                  type="button"
                  variant="rust"
                  onClick={stopPlayback}
                  aria-label="Stop"
                >
                  <Square className="mr-1 h-4 w-4" strokeWidth={1.75} />
                  Stop
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="rust"
                  onClick={startPlayback}
                  aria-label="Play"
                >
                  <Play className="mr-1 h-4 w-4" strokeWidth={1.75} />
                  Play
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={clearSequence}
                disabled={playing}
              >
                Clear
              </Button>
            </div>
          ) : null}

          {/* Save */}
          {sequence.length > 0 ? (
            <div className="rounded-md border border-rule bg-paper px-3 py-3">
              <Label htmlFor="trackName" className="text-xs text-ink-mute">
                {editingTrackId ? "Save changes to" : "Save as"}
              </Label>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Input
                  id="trackName"
                  value={trackName}
                  onChange={(e) => setTrackName(e.target.value)}
                  placeholder="Name your track"
                  className="max-w-xs flex-1"
                />
                <Button
                  type="button"
                  variant="rust"
                  size="sm"
                  onClick={() => void handleSave()}
                  disabled={!trackName.trim()}
                >
                  <Save className="mr-1 h-4 w-4" strokeWidth={1.75} />
                  {editingTrackId ? "Update" : "Save"}
                </Button>
                {editingTrackId ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingTrackId(null);
                      setTrackName("");
                    }}
                  >
                    Stop editing
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* ─── saved tracks ────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Saved tracks</CardTitle>
          <CardDescription>
            {!hydrated
              ? "Loading…"
              : saved.length === 0
                ? "You haven't saved any tracks yet."
                : `${saved.length} saved track${
                    saved.length === 1 ? "" : "s"
                  }.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {saved.length > 0 ? (
            <ul className="space-y-2">
              {saved.map((row) => (
                <li
                  key={row.id}
                  className="flex flex-col gap-2 rounded-md border border-rule bg-paper-soft px-3 py-3 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-base text-ink">
                      {row.name}
                    </p>
                    <p className="text-xs text-ink-mute">
                      {row.keyLabel} · {row.steps.length} chord
                      {row.steps.length === 1 ? "" : "s"} · {row.tempoBpm}{" "}
                      BPM · {row.beatsPerChord}{" "}
                      {row.beatsPerChord === 1 ? "beat" : "beats"} / chord
                    </p>
                    <p className="mt-1 truncate font-mono text-[11px] text-ink-soft">
                      {row.steps.map((s) => s.roman).join(" → ")}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleLoad(row)}
                      aria-label={`Load ${row.name}`}
                    >
                      <Pencil className="mr-1 h-3.5 w-3.5" strokeWidth={1.75} />
                      Load
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="px-2 text-rust"
                      onClick={() => void handleDelete(row.id)}
                      aria-label={`Delete ${row.name}`}
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
