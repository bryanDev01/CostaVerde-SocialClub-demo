"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { BRAND } from "@/lib/branding";

const CAROUSEL_IMAGES = [
  {
    src: BRAND.images.heroFlyer,
    alt: `Aviso promocional del ${BRAND.name} con sus servicios, direccion y horarios`,
  },
  {
    src: BRAND.images.heroMap,
    alt: `Mapa de ubicacion del ${BRAND.name}`,
  },
  {
    src: BRAND.images.heroMenu,
    alt: `Panel de servicios del ${BRAND.name}: gastronomia, recreacion, belleza, eventos y entretenimiento`,
  },
];

export function HeroCarousel() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((value) => (value + 1) % CAROUSEL_IMAGES.length);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative h-[300px] w-full overflow-hidden sm:h-[380px] lg:h-[460px]">
      {CAROUSEL_IMAGES.map((image, index) => {
        const offset = (index - current + CAROUSEL_IMAGES.length) % CAROUSEL_IMAGES.length;
        const isFront = offset === 0;
        const isLeft = offset === CAROUSEL_IMAGES.length - 1;
        const isRight = offset === 1;

        return (
          <div
            key={image.src}
            aria-hidden={!isFront}
            className={[
              "absolute left-1/2 top-1/2 rounded-[2rem] border border-border bg-card shadow-[0_30px_80px_-30px_rgba(30,58,138,0.45)] transition-all duration-700 ease-out",
              isFront
                ? "z-30 -translate-x-1/2 -translate-y-1/2 scale-100 opacity-100"
                : isRight
                  ? "z-20 -translate-x-[-8%] -translate-y-1/2 scale-75 opacity-60 blur-[1px]"
                  : isLeft
                    ? "z-20 -translate-x-[108%] -translate-y-1/2 scale-75 opacity-60 blur-[1px]"
                    : "z-10 -translate-x-1/2 -translate-y-1/2 scale-[0.55] opacity-0 blur-[2px]",
            ].join(" ")}
            style={{ width: "min(72%, 620px)" }}
          >
            <Image
              src={image.src}
              alt={image.alt}
              width={1376}
              height={768}
              priority
              sizes="(max-width: 1024px) 100vw, 60vw"
              className="aspect-[16/9] h-auto w-full rounded-t-[2rem] object-cover"
            />
            <figcaption className="flex items-center gap-3 rounded-b-[2rem] border-t border-border px-5 py-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <span className="size-2 rounded-full bg-danger" aria-hidden />
              </span>
              <span className="block truncate text-sm font-medium text-foreground">
                {image.alt}
              </span>
            </figcaption>
          </div>
        );
      })}
    </div>
  );
}