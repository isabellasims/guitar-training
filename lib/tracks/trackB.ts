import type { TrackNode } from "@/lib/tracks/tracks";

/**
 * Track B nodes aligned with `guitar-practice-plan.html` (#track-b).
 */
export const TRACK_B_NODES: TrackNode[] = [
  {
    id: "b-e-string",
    title: "Solidify the E string",
    summary:
      "Week 1: chromatic scale on the low E string daily — build automatic fret-to-name mapping.",
  },
  {
    id: "b-e-a-random",
    title: "Random recall on E and A",
    summary:
      "Weeks 2–3: called-out note names on E, then same pitch on A — no hesitation.",
  },
  {
    id: "b-c-all-strings",
    title: "C on all six strings",
    summary:
      "Week 4: random string + C; chromatic work on D, G, B, and high e incorporating C.",
  },
  {
    id: "b-f-g-spread",
    title: "Add F, then G",
    summary:
      "Weeks 5–6: after E, A, and C everywhere, add F and G across the neck.",
  },
  {
    id: "b-speed-two-per-week",
    title: "Speed phase — two notes per week",
    summary:
      "Weeks 7–9: D and A, then B and F sharp, then C sharp and remaining chromatic pairs.",
  },
  {
    id: "b-full-board",
    title: "Full fretboard random recall",
    summary:
      "Weeks 10–12: any note, any string, under ~2 seconds; then maintenance mode.",
  },
];
