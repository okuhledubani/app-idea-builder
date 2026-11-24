import { useState } from "react";

import { HAIR_COLOURS, HAIR_STYLES, type HairStyleId } from "@/lib/aura/data";
import { cn } from "@/lib/utils";

// Illustration-only fills for the SVG drawing.
const SKIN = "#a8704f";
const FEATURE = "#3a2228";

function curlRing() {
  const out: { cx: number; cy: number; r: number }[] = [];
  for (let a = 160; a <= 380; a += 16) {
    const rad = (a * Math.PI) / 180;
    out.push({ cx: 100 + Math.cos(rad) * 50, cy: 88 + Math.sin(rad) * 52, r: 15 });
  }
  for (let y = 100; y <= 150; y += 16) {
    out.push({ cx: 50, cy: y, r: 13 }, { cx: 150, cy: y, r: 13 });
  }
  return out;
}

function HairBack({ style, colour }: { style: HairStyleId; colour: string }) {
  switch (style) {
    case "bob":
      return <path d="M52 138 L54 86 Q56 34 100 34 Q144 34 146 86 L148 138 Q124 144 100 140 Q76 144 52 138Z" fill={colour} />;
    case "waves":
      return (
        <path
          d="M48 178 Q36 156 50 136 Q38 116 52 94 Q50 34 100 32 Q150 34 148 94 Q162 116 150 136 Q164 156 152 178 Q132 170 126 150 L74 150 Q68 170 48 178Z"
          fill={colour}
        />
      );
    case "braids":
      return (
        <g fill={colour}>
          <path d="M58 98 Q56 40 100 38 Q144 40 142 98 Q136 66 100 60 Q64 66 58 98Z" />
          {[56, 68, 132, 144].map((x) =>
            [100, 114, 128, 142, 156, 170, 184].map((y) => <ellipse key={`${x}-${y}`} cx={x} cy={y} rx={6} ry={8} />),
          )}
        </g>
      );
    case "curls":
      return (
        <g fill={colour}>
          {curlRing().map((c, i) => (
            <circle key={i} {...c} />
          ))}
        </g>
      );
    case "pixie":
      return <path d="M60 100 Q56 42 100 40 Q146 42 140 100 Q136 70 100 62 Q68 66 60 100Z" fill={colour} />;
  }
}

function HairFront({ style, colour }: { style: HairStyleId; colour: string }) {
  switch (style) {
    case "bob":
      return <path d="M60 92 Q62 50 100 48 Q138 50 140 92 Q122 66 96 66 Q76 68 60 92Z" fill={colour} />;
    case "waves":
      return <path d="M60 96 Q60 50 100 46 Q142 50 140 90 Q128 70 112 66 Q96 76 78 72 Q66 80 60 96Z" fill={colour} />;
    case "braids":
      return <path d="M62 84 Q70 52 100 50 L100 64 Q78 64 62 84Z M138 84 Q130 52 100 50 L100 64 Q122 64 138 84Z" fill={colour} />;
    case "curls":
      return (
        <g fill={colour}>
          {[70, 86, 102, 118, 132].map((x, i) => (
            <circle key={x} cx={x} cy={58 + (i % 2) * 6} r={11} />
          ))}
        </g>
      );
    case "pixie":
      return <path d="M62 84 Q74 48 124 52 Q110 62 98 76 Q84 68 62 84Z" fill={colour} />;
  }
}

export function HairPreview() {
  const [style, setStyle] = useState<HairStyleId>("waves");
  const [colourId, setColourId] = useState<string>("espresso");
  const colour = HAIR_COLOURS.find((c) => c.id === colourId)?.hex ?? "#4a2e22";
  const styleLabel = HAIR_STYLES.find((s) => s.id === style)?.label ?? "";
  const colourLabel = HAIR_COLOURS.find((c) => c.id === colourId)?.label ?? "";

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-xl bg-gold-soft">
        <span className="absolute left-2 top-2 rounded-full bg-card/90 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Illustration only
        </span>
        <svg viewBox="0 0 200 210" role="img" aria-label={`Illustration of ${styleLabel} in ${colourLabel}`} className="mx-auto block h-48 w-auto">
          <HairBack style={style} colour={colour} />
          <path d="M38 210 Q44 162 100 158 Q156 162 162 210Z" className="fill-plum" />
          <rect x="88" y="128" width="24" height="34" rx="10" fill={SKIN} />
          <ellipse cx="100" cy="94" rx="38" ry="46" fill={SKIN} />
          <ellipse cx="86" cy="96" rx="3.2" ry="4" fill={FEATURE} />
          <ellipse cx="114" cy="96" rx="3.2" ry="4" fill={FEATURE} />
          <path d="M90 118 Q100 126 110 118" stroke={FEATURE} strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <HairFront style={style} colour={colour} />
        </svg>
        <p className="pb-2 text-center text-sm font-medium">
          {styleLabel} · {colourLabel}
        </p>
      </div>

      <fieldset>
        <legend className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Style</legend>
        <div className="flex flex-wrap gap-1.5">
          {HAIR_STYLES.map((s) => (
            <button
              key={s.id}
              type="button"
              aria-pressed={style === s.id}
              onClick={() => setStyle(s.id)}
              className={cn(
                "min-h-11 rounded-full border px-3 text-sm transition-colors",
                style === s.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-accent",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Colour</legend>
        <div className="flex flex-wrap gap-2">
          {HAIR_COLOURS.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={colourId === c.id}
              aria-label={c.label}
              title={c.label}
              onClick={() => setColourId(c.id)}
              className={cn(
                "size-11 rounded-full border-2 transition-transform",
                colourId === c.id ? "scale-105 border-primary ring-2 ring-ring ring-offset-2 ring-offset-card" : "border-card",
              )}
              style={{ backgroundColor: c.hex }}
            />
          ))}
        </div>
      </fieldset>
    </div>
  );
}
