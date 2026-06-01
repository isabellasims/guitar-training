/**
 * Injects level tables from lib/curriculum/levels.ts into guitar-practice-plan.html
 * between <!-- TONIC_CURRICULUM_AUTO --> markers. Run via predev/prebuild (sync-manual).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const htmlPath = join(root, "guitar-practice-plan.html");

const { LEVELS, getLevelsForTrack } = await import(
  "../lib/curriculum/levels.ts"
);

const TRACKS = [
  ["A", "Scale degrees"],
  ["B", "Note finding"],
  ["C", "Fretboard & CAGED"],
  ["D", "Chord changes"],
  ["E", "Intervals"],
  ["F", "Improvisation"],
];

function esc(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function tableForTrack(trackId, title) {
  const levels = getLevelsForTrack(trackId);
  const rows = levels
    .map((l) => {
      const prereq =
        l.prerequisiteLevelIds.length > 0
          ? l.prerequisiteLevelIds.map((p) => p.replace("-", "·")).join(", ")
          : "—";
      const typeLabel = l.type === "F" ? "Foundation" : "Practice";
      return `<tr><td class="level-id">${l.id.replace("-", "·")}</td><td>${typeLabel}</td><td>${esc(l.name)}</td><td>${prereq}</td></tr>`;
    })
    .join("\n");
  return `<h4 class="subhead-h">Track ${trackId} — ${title} (${levels.length} levels)</h4>
<div class="level-table-wrap">
<table class="level-table">
<thead><tr><th>Level</th><th>Type</th><th>Name</th><th>Requires</th></tr></thead>
<tbody>
${rows}
</tbody>
</table>
</div>`;
}

const body = `<p class="lead">The <strong>Tonic</strong> app implements this curriculum in <code>lib/curriculum/levels.ts</code>. Levels advance by <em>mastery</em> (sessions + accuracy), not calendar weeks. <strong>[F]</strong> = concept explainer first; <strong>[P]</strong> = practice only.</p>
<div class="cross-dep">
<strong>Track entry in the app:</strong> A, B, C from day one. <strong>D</strong> and <strong>E</strong> unlock after <strong>A·11</strong> (full major diatonic by ear). <strong>F</strong> unlocks after <strong>A·11</strong> and <strong>D·2</strong> (vi chord by ear). <strong>A·12</strong> (minor tonic) also requires <strong>C·2</strong> (open A minor shape). <strong>C·7</strong> requires <strong>A·4</strong> (major 3rd by ear).
</div>
<p class="lead"><strong>Completion:</strong> each level needs ≥3 sessions, ≥12 graded cards at ≥90% weighted accuracy (hints count half). Explainer-only levels <strong>A·1</strong> and <strong>A·12</strong> complete after the concept is seen.</p>
${TRACKS.map(([id, title]) => tableForTrack(id, title)).join("\n")}
<p style="font-size: 15px; color: var(--ink-mute); margin-top: 24px;">Regenerate this block: <code>npm run inject-manual</code> (runs automatically before dev/build).</p>`;

const START = "<!-- TONIC_CURRICULUM_AUTO -->";
const END = "<!-- /TONIC_CURRICULUM_AUTO -->";

let html = readFileSync(htmlPath, "utf8");
if (!html.includes(START)) {
  console.error("inject-manual-curriculum: markers not found in HTML");
  process.exit(1);
}
const re = new RegExp(
  `${START.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\S]*?${END.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
);
html = html.replace(re, `${START}\n${body}\n${END}`);
writeFileSync(htmlPath, html);
console.log("inject-manual-curriculum: updated", htmlPath);
