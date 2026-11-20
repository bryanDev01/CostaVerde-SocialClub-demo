import { Sparkle } from "lucide-react";

const BANNER_TEXTS = [
  "Sabor, deporte y comunidad en un solo lugar",
  "Tu espacio, tu gente, tu diversión",
  "23 razones para quedarte",
  "Vive el círculo, siente la comunidad",
  "El corazón social de tu barrio",
  "Todo lo que quieres, todo lo que somos",
];

export function MarqueeBanner() {
  const track = (
    <div className="flex shrink-0 items-center">
      {BANNER_TEXTS.map((text) => (
        <span key={text} className="flex shrink-0 items-center">
          <span className="whitespace-nowrap font-display text-sm font-medium uppercase tracking-[0.18em] text-white sm:text-[15px]">
            {text}
          </span>
          <Sparkle
            className="mx-8 size-4 shrink-0 text-white/70"
            aria-hidden
            strokeWidth={1.75}
          />
        </span>
      ))}
    </div>
  );

  return (
    <div className="relative z-40 overflow-hidden border-b border-primary bg-primary">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-primary to-transparent sm:w-28"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-primary to-transparent sm:w-28"
      />

      <div className="flex w-max animate-marquee py-3 motion-reduce:animate-none hover:[animation-play-state:paused]">
        {track}
        {track}
      </div>
    </div>
  );
}