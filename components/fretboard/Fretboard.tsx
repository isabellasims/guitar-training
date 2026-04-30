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

type FretboardProps = {
  /** Highest fret wire drawn (inclusive). */
  maxFret?: number;
  /** Cells to emphasize (outline + fill). */
  highlights?: FretPosition[];
  /** Show pitch-class labels on fretted notes (not on open strings; open uses string names). */
  showNoteLabels?: boolean;
  /** Mirror horizontally for left-handed setting. */
  leftHanded?: boolean;
  className?: string;
  /** Called when user taps a fret cell (open = fret 0). */
  onFretTap?: (stringIndex: number, fret: number) => void;
  /** Optional label for screen readers. */
  "aria-label"?: string;
};

function logicalXForFret(fret: number): number {
  if (fret <= 0) return NUT_W * 0.38;
  return NUT_W + (fret - 0.5) * FRET_W;
}

function toScreenX(logicalX: number, leftHanded: boolean, innerW: number): number {
  const base = PAD_L + (leftHanded ? innerW - logicalX : logicalX);
  return base;
}

function isHighlighted(
  highlights: FretPosition[] | undefined,
  s: number,
  f: number,
): boolean {
  return highlights?.some((h) => h.stringIndex === s && h.fret === f) ?? false;
}

export function Fretboard({
  maxFret = DEFAULT_MAX_FRET,
  highlights = [],
  showNoteLabels = false,
  leftHanded = false,
  className,
  onFretTap,
  "aria-label": ariaLabel = "Guitar fretboard",
}: FretboardProps) {
  const innerW = NUT_W + maxFret * FRET_W;
  const innerH = (STRINGS - 1) * STRING_GAP;
  const width = PAD_L + innerW + PAD_R;
  const height = PAD_T + innerH + PAD_B;

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

      {/* Nut */}
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

      {/* Frets */}
      {Array.from({ length: maxFret }, (_, i) => i + 1).map((fretNum) => {
        const lx = NUT_W + fretNum * FRET_W;
        const x = toScreenX(lx, leftHanded, innerW);
        return (
          <line
            key={fretNum}
            x1={x}
            x2={x}
            y1={PAD_T}
            y2={PAD_T + innerH}
            stroke="var(--ink-soft)"
            strokeWidth={fretNum === 1 ? 1.35 : 1}
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

      {/* Fret markers (inlays) */}
      {INLAY_FRETS.filter((f) => f <= maxFret).map((f) => {
        const lx = logicalXForFret(f);
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

      {/* Tap targets + fretted note labels + highlights */}
      {Array.from({ length: STRINGS }, (_, s) =>
        Array.from({ length: maxFret + 1 }, (_, f) => {
          const lx = logicalXForFret(f);
          const cx = toScreenX(lx, leftHanded, innerW);
          const cy = stringY(s);
          const hl = isHighlighted(highlights, s, f);
          const midi = midiAtPosition(s, f, STANDARD_OPEN_MIDI);
          const label = midiToDiagramLabel(midi);
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
              {hl ? (
                <circle
                  cx={cx}
                  cy={cy}
                  r={7}
                  fill="var(--rust)"
                  fillOpacity={0.35}
                  stroke="var(--rust-deep)"
                  strokeWidth={1.5}
                />
              ) : null}
              {showNoteLabels && f > 0 ? (
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
                  {label}
                </text>
              ) : null}
            </g>
          );
        }),
      )}

      {/* Open-string names on top so hit-areas do not cover them */}
      {Array.from({ length: STRINGS }, (_, s) => {
        const lx = logicalXForFret(0);
        const cx = toScreenX(lx, leftHanded, innerW);
        const cy = stringY(s);
        const name = OPEN_STRING_LABELS[s];
        return (
          <text
            key={`open-${s}`}
            x={cx}
            y={cy + 4}
            textAnchor="middle"
            fill="var(--ink)"
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
    </svg>
  );
}
