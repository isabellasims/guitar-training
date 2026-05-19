"use client";

import { cn } from "@/lib/utils";
import { midiToDiagramLabel } from "@/lib/audio/noteUtils";
import {
  INLAY_FRETS,
  OPEN_STRING_LABELS,
  type FretPosition,
  midiAtPosition,
  STANDARD_OPEN_MIDI,
} from "@/lib/fretboard/model";

const STRINGS = 6;
const DEFAULT_MAX_FRET = 15;

const NUT_W = 20;
const FRET_W = 36;
const STRING_GAP = 20;
const PAD_L = 10;
const PAD_R = 14;
const PAD_T = 12;
const PAD_B = 14;

/**
 * Visual variant for a highlighted fret cell.
 *
 *   - `primary` (default) — strong rust outline + light fill (current target).
 *   - `dim`               — hollow ink outline (upcoming / "play me later").
 *   - `success`           — gold filled (already played correctly).
 *   - `warning`           — rust-deep solid (hint flash).
 *   - `tonic`             — sage green filled (the pattern's root/tonic note,
 *                           drawn underneath primary/success so it's visible
 *                           as a reference while not interfering with the
 *                           current-target / played-correctly states).
 */
export type HighlightVariant =
  | "primary"
  | "dim"
  | "success"
  | "warning"
  | "tonic";

export type FretboardHighlight = FretPosition & {
  variant?: HighlightVariant;
  /**
   * Per-cell label override. When set, this string is rendered inside the
   * highlight regardless of `showNoteLabels`. Used by the Fingers / Scale
   * degrees label modes — the caller picks what to show; the Fretboard
   * just renders it.
   */
  label?: string;
};

type FretboardProps = {
  /**
   * Highest fret wire drawn (inclusive). Together with `startFret` defines
   * the window of the neck to draw.
   */
  maxFret?: number;
  /**
   * Lowest fret cell drawn (inclusive). Defaults to 0 — show the nut and
   * open-string column. When > 0, the diagram skips the nut and starts at
   * the requested fret, keeping the per-fret zoom level constant for
   * shapes that live up the neck. The leftmost edge is the wire of
   * `startFret` itself; the first cell is `startFret + 1`.
   */
  startFret?: number;
  /** Cells to emphasize. Accepts plain {string,fret} or with `variant`. */
  highlights?: FretboardHighlight[] | FretPosition[];
  /** Show pitch-class labels on fretted notes (not on open strings; open uses string names). */
  showNoteLabels?: boolean;
  /**
   * Render fret numbers in a row beneath the diagram. Defaults to true
   * when `startFret > 0` (so the user knows where on the neck they are),
   * false otherwise.
   */
  showFretNumbers?: boolean;
  /** Mirror horizontally for left-handed setting. */
  leftHanded?: boolean;
  className?: string;
  /** Called when user taps a fret cell (open = fret 0). */
  onFretTap?: (stringIndex: number, fret: number) => void;
  /** Optional label for screen readers. */
  "aria-label"?: string;
};

/**
 * Convert a fret number to its logical X coordinate. The coordinate
 * system shifts depending on whether we're rendering the open/nut column:
 *   - `startFret === 0` (open-position view): preserves the original
 *     layout — the nut occupies `NUT_W` on the left, the open column sits
 *     inside the nut, and fretted cells follow.
 *   - `startFret > 0` (windowed view): no nut. The leftmost edge is the
 *     wire of `startFret` (i.e. logicalX 0). Cells start at startFret+1.
 */
function logicalXForFret(fret: number, startFret: number): number {
  if (startFret === 0) {
    if (fret <= 0) return NUT_W * 0.38;
    return NUT_W + (fret - 0.5) * FRET_W;
  }
  // Windowed: cell `f` sits at (f - startFret - 0.5) * FRET_W.
  return (fret - startFret - 0.5) * FRET_W;
}

function toScreenX(logicalX: number, leftHanded: boolean, innerW: number): number {
  const base = PAD_L + (leftHanded ? innerW - logicalX : logicalX);
  return base;
}

function highlightAt(
  highlights: (FretboardHighlight | FretPosition)[] | undefined,
  s: number,
  f: number,
): FretboardHighlight | null {
  if (!highlights) return null;
  // Walk last → first so later entries override earlier ones for the same cell.
  for (let i = highlights.length - 1; i >= 0; i--) {
    const h = highlights[i]!;
    if (h.stringIndex === s && h.fret === f) {
      return h as FretboardHighlight;
    }
  }
  return null;
}

const VARIANT_STYLE: Record<
  HighlightVariant,
  {
    fill: string;
    fillOpacity: number;
    stroke: string;
    strokeWidth: number;
    radius: number;
  }
> = {
  primary: {
    fill: "var(--rust)",
    fillOpacity: 0.35,
    stroke: "var(--rust-deep)",
    strokeWidth: 1.5,
    radius: 7,
  },
  dim: {
    fill: "var(--ink)",
    fillOpacity: 0.08,
    stroke: "var(--ink-mute)",
    strokeWidth: 1,
    radius: 6.5,
  },
  success: {
    fill: "var(--gold)",
    fillOpacity: 0.85,
    stroke: "var(--burgundy)",
    strokeWidth: 1.5,
    radius: 7.5,
  },
  warning: {
    fill: "var(--rust-deep)",
    fillOpacity: 0.7,
    stroke: "var(--rust)",
    strokeWidth: 1.75,
    radius: 8,
  },
  tonic: {
    fill: "var(--sage)",
    fillOpacity: 0.85,
    stroke: "var(--sage-soft)",
    strokeWidth: 1.5,
    radius: 7.5,
  },
};

export function Fretboard({
  maxFret = DEFAULT_MAX_FRET,
  startFret = 0,
  highlights = [],
  showNoteLabels = false,
  showFretNumbers,
  leftHanded = false,
  className,
  onFretTap,
  "aria-label": ariaLabel = "Guitar fretboard",
}: FretboardProps) {
  // Defensive clamp: a windowed view must always show at least 1 cell.
  const safeMaxFret = Math.max(maxFret, startFret + 1);
  const fretCount = safeMaxFret - startFret;
  const isWindowed = startFret > 0;
  // First cell that participates in the cell loop. In open-position view
  // we start at fret 0 (the open-string column); in windowed view we
  // start one fret to the right of the leftmost wire.
  const firstCellFret = isWindowed ? startFret + 1 : 0;

  // Inner width: nut + frets (open-position) or just frets (windowed).
  const innerW = (isWindowed ? 0 : NUT_W) + fretCount * FRET_W;
  const innerH = (STRINGS - 1) * STRING_GAP;
  // Auto-default: number the frets when we're not rendering the nut, so
  // the user has a positional anchor.
  const renderFretNumbers = showFretNumbers ?? isWindowed;
  const NUMBERS_H = renderFretNumbers ? 16 : 0;
  const width = PAD_L + innerW + PAD_R;
  const height = PAD_T + innerH + PAD_B + NUMBERS_H;

  const stringY = (s: number) => PAD_T + s * STRING_GAP;

  const nutScreenLeft = toScreenX(0, leftHanded, innerW);
  const nutScreenRight = toScreenX(NUT_W, leftHanded, innerW);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn("w-full max-w-full select-none text-ink", className)}
      role="img"
      aria-label={ariaLabel}
    >
      <defs>
        <linearGradient id="neckWood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--paper-deep)" />
          <stop offset="100%" stopColor="var(--paper-soft)" />
        </linearGradient>
      </defs>

      {/* Fingerboard */}
      <rect
        x={PAD_L}
        y={PAD_T}
        width={innerW}
        height={innerH}
        rx={4}
        fill="url(#neckWood)"
        stroke="var(--rule)"
        strokeWidth={1}
      />

      {/* Nut — only rendered in open-position view. In windowed view the
          leftmost edge is just the wire of `startFret` (drawn below). */}
      {isWindowed ? null : (
        <rect
          x={Math.min(nutScreenLeft, nutScreenRight)}
          y={PAD_T}
          width={Math.abs(nutScreenRight - nutScreenLeft)}
          height={innerH}
          fill="var(--paper)"
          stroke="var(--ink-mute)"
          strokeWidth={1}
          opacity={0.95}
        />
      )}

      {/* Frets. Each entry is the wire at fret `fretNum`. In open-position
          view we draw wires 1..maxFret; in windowed view we additionally
          draw the leftmost wire (the `startFret` edge) and continue
          through `maxFret`. */}
      {Array.from({ length: fretCount + (isWindowed ? 1 : 0) }, (_, i) =>
        isWindowed ? startFret + i : i + 1,
      ).map((fretNum) => {
        const lx = isWindowed
          ? (fretNum - startFret) * FRET_W
          : NUT_W + fretNum * FRET_W;
        const x = toScreenX(lx, leftHanded, innerW);
        // Emphasize the first wire in either view (the nut analogue).
        const isFirstWire = isWindowed ? fretNum === startFret : fretNum === 1;
        return (
          <line
            key={fretNum}
            x1={x}
            x2={x}
            y1={PAD_T}
            y2={PAD_T + innerH}
            stroke="var(--ink-soft)"
            strokeWidth={isFirstWire ? 1.35 : 1}
            opacity={0.95}
          />
        );
      })}

      {/* Strings — strong contrast vs fingerboard */}
      {Array.from({ length: STRINGS }, (_, s) => {
        const y = stringY(s);
        const w = 1.35 + s * 0.28;
        return (
          <line
            key={s}
            x1={PAD_L}
            x2={PAD_L + innerW}
            y1={y}
            y2={y}
            stroke="var(--ink)"
            strokeWidth={w}
            strokeLinecap="round"
            opacity={0.92}
          />
        );
      })}

      {/* Fret markers (inlays) — filtered to the current window. */}
      {INLAY_FRETS.filter((f) => f >= firstCellFret && f <= safeMaxFret).map((f) => {
        const lx = logicalXForFret(f, startFret);
        const cx = toScreenX(lx, leftHanded, innerW);
        const cy = PAD_T + innerH / 2;
        const isDouble = f > 0 && f % 12 === 0;
        const dotFill = "var(--ink)";
        const dotOpacity = 0.22;
        const dotStroke = "var(--paper-soft)";
        const dotStrokeOp = 0.7;
        if (isDouble) {
          const off = STRING_GAP * 0.85;
          return (
            <g key={`inlay-${f}`}>
              <circle
                cx={cx}
                cy={cy - off}
                r={4}
                fill={dotFill}
                fillOpacity={dotOpacity}
                stroke={dotStroke}
                strokeOpacity={dotStrokeOp}
                strokeWidth={0.75}
              />
              <circle
                cx={cx}
                cy={cy + off}
                r={4}
                fill={dotFill}
                fillOpacity={dotOpacity}
                stroke={dotStroke}
                strokeOpacity={dotStrokeOp}
                strokeWidth={0.75}
              />
            </g>
          );
        }
        return (
          <circle
            key={`inlay-${f}`}
            cx={cx}
            cy={cy}
            r={4.5}
            fill={dotFill}
            fillOpacity={dotOpacity}
            stroke={dotStroke}
            strokeOpacity={dotStrokeOp}
            strokeWidth={0.75}
          />
        );
      })}

      {/* Tap targets + fretted note labels + highlights. We only render
          cells inside the current window — anything below `firstCellFret`
          or above `safeMaxFret` is silently clipped (highlights outside
          the window are dropped, which is the desired behavior for shape
          views that intentionally don't show the full neck). */}
      {Array.from({ length: STRINGS }, (_, s) =>
        Array.from(
          { length: safeMaxFret - firstCellFret + 1 },
          (_, i) => firstCellFret + i,
        ).map((f) => {
          const lx = logicalXForFret(f, startFret);
          const cx = toScreenX(lx, leftHanded, innerW);
          const cy = stringY(s);
          const hl = highlightAt(highlights, s, f);
          const variantKey: HighlightVariant = hl?.variant ?? "primary";
          const variant = hl ? VARIANT_STYLE[variantKey] : null;
          const midi = midiAtPosition(s, f, STANDARD_OPEN_MIDI);
          const noteLabel = midiToDiagramLabel(midi);
          /**
           * Label precedence:
           *   1. explicit per-highlight `label` (Fingers / Degrees toggle)
           *   2. global `showNoteLabels` falls back to the note name
           *   3. nothing
           * If `showNoteLabels` is on but a highlight has `label: ""` we
           * treat that as "intentionally blank" and skip rendering, which
           * lets the practice-card "None" mode keep the fretboard clean.
           */
          const cellLabel: string | null = hl
            ? hl.label !== undefined
              ? hl.label === ""
                ? null
                : hl.label
              : showNoteLabels
                ? noteLabel
                : null
            : showNoteLabels
              ? noteLabel
              : null;
          const cellW = f === 0 ? NUT_W * 0.75 : FRET_W;
          const hitHalfW = f === 0 ? cellW / 2 : FRET_W / 2;

          return (
            <g key={`cell-${s}-${f}`}>
              {onFretTap ? (
                <rect
                  x={cx - hitHalfW}
                  y={cy - STRING_GAP / 2}
                  width={hitHalfW * 2}
                  height={STRING_GAP}
                  fill="transparent"
                  className="cursor-pointer"
                  onClick={() => onFretTap(s, f)}
                  aria-hidden
                />
              ) : null}
              {variant ? (
                <circle
                  cx={cx}
                  cy={cy}
                  r={variant.radius}
                  fill={variant.fill}
                  fillOpacity={variant.fillOpacity}
                  stroke={variant.stroke}
                  strokeWidth={variant.strokeWidth}
                />
              ) : null}
              {cellLabel && f > 0 ? (
                <text
                  x={cx}
                  y={cy + 4}
                  textAnchor="middle"
                  fill="var(--burgundy)"
                  stroke="var(--paper-soft)"
                  strokeWidth={2.2}
                  paintOrder="stroke fill"
                  fontFamily="var(--font-jetbrains), ui-monospace, monospace"
                  fontSize={10}
                  fontWeight={700}
                  pointerEvents="none"
                >
                  {cellLabel}
                </text>
              ) : null}
            </g>
          );
        }),
      )}

      {/* Open-string names — only rendered in open-position view (no nut
          column exists in windowed view). A highlight with an explicit
          label at fret 0 overrides the open-string letter so Fingers /
          Degrees modes work on shapes that include open strings. */}
      {isWindowed
        ? null
        : Array.from({ length: STRINGS }, (_, s) => {
            const lx = logicalXForFret(0, 0);
            const cx = toScreenX(lx, leftHanded, innerW);
            const cy = stringY(s);
            const hl = highlightAt(highlights, s, 0);
            const override = hl?.label;
            const name =
              override !== undefined && override !== ""
                ? override
                : override === ""
                  ? null
                  : OPEN_STRING_LABELS[s];
            if (name == null) return null;
            return (
              <text
                key={`open-${s}`}
                x={cx}
                y={cy + 4}
                textAnchor="middle"
                fill={override !== undefined ? "var(--burgundy)" : "var(--ink)"}
                stroke="var(--paper-soft)"
                strokeWidth={2.5}
                paintOrder="stroke fill"
                fontFamily="var(--font-jetbrains), ui-monospace, monospace"
                fontSize={11}
                fontWeight={700}
                pointerEvents="none"
              >
                {name}
              </text>
            );
          })}

      {/* Fret-number row beneath the diagram. Each number sits centered
          under the cell it labels, so the user can tell at a glance which
          fret is which when the diagram is windowed up the neck. */}
      {renderFretNumbers
        ? Array.from(
            { length: safeMaxFret - firstCellFret + 1 },
            (_, i) => firstCellFret + i,
          ).map((f) => {
            const lx = logicalXForFret(f, startFret);
            const cx = toScreenX(lx, leftHanded, innerW);
            const y = PAD_T + innerH + PAD_B + 2;
            return (
              <text
                key={`fretnum-${f}`}
                x={cx}
                y={y}
                textAnchor="middle"
                fill="var(--ink-mute)"
                fontFamily="var(--font-jetbrains), ui-monospace, monospace"
                fontSize={9}
                fontWeight={600}
                pointerEvents="none"
              >
                {f}
              </text>
            );
          })
        : null}
    </svg>
  );
}
