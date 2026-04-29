import { PitchMicPanel } from "@/components/audio/PitchMicPanel";

export default function PitchTestPage() {
  return (
    <main className="px-4 py-8">
      <header className="mb-8">
        <p className="font-mono text-[10px] uppercase tracking-widest text-ink-mute">
          Dev
        </p>
        <h1 className="font-display text-3xl text-ink">Pitch lab</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Play A4 (440 Hz) after tapping the button. Uses Pitchy in the browser
          with a short listen window.
        </p>
      </header>
      <PitchMicPanel targetMidi={69} label="Play A on the 5th fret, high E string — or any A4." />
    </main>
  );
}
