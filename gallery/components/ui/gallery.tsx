import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState, type CSSProperties, type MouseEventHandler } from "react";
import { WavingCharacter, type HandBounds } from "./waving-character";

const photos = [
  { file: "1.png", alt: "A waving child in a green cap", x: "-145%", y: "7%", tilt: -3, hand: [231, 200, 352, 313] satisfies HandBounds },
  { file: "2.png", alt: "A waving child in a pink sweater", x: "-73%", y: "15%", tilt: -2, hand: [548, 227, 659, 327] satisfies HandBounds },
  { file: "3.png", alt: "A waving child using a wheelchair", x: "0%", y: "4%", tilt: 2, hand: [245, 290, 360, 410] satisfies HandBounds },
  { file: "4.png", alt: "A waving child in a blue and white shirt", x: "73%", y: "10%", tilt: 3, hand: [549, 219, 664, 328] satisfies HandBounds },
  { file: "5.png", alt: "A waving child wearing sunglasses and holding a white cane", x: "145%", y: "20%", tilt: -2, hand: [550, 265, 666, 374] satisfies HandBounds },
];

export function PhotoGallery({ animationDelay = 0.5, onOpen }: {
  animationDelay?: number;
  onOpen: MouseEventHandler<HTMLAnchorElement>;
}) {
  const reduceMotion = useReducedMotion();
  const stack = useRef<HTMLDivElement>(null);
  const [activeCardIndex, setActiveCardIndex] = useState<number | null>(null);
  const [hoveredCardIndex, setHoveredCardIndex] = useState<number | null>(null);

  useEffect(() => {
    if (activeCardIndex === null) return;
    const dismissOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !stack.current?.contains(event.target)) setActiveCardIndex(null);
    };
    const dismissOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveCardIndex(null);
    };
    document.addEventListener("pointerdown", dismissOutside);
    document.addEventListener("keydown", dismissOnEscape);
    return () => {
      document.removeEventListener("pointerdown", dismissOutside);
      document.removeEventListener("keydown", dismissOnEscape);
    };
  }, [activeCardIndex]);

  return (
    <section aria-labelledby="gallery-title" className="w-full text-center">
      <div className="px-4 pt-8 sm:px-8 md:pt-12 md:pb-4">
        <h1 id="gallery-title" className="gallery-title mx-auto max-w-sm text-balance text-[clamp(2.75rem,11.5vw,4rem)] leading-[1.02] tracking-tight text-[#5f2d75] md:max-w-full md:text-[min(7.3vw,7.25rem)] md:whitespace-nowrap">
          New Everyday Life, By Design
        </h1>
        <p className="gallery-subtitle mt-4 inline-block translate-y-4 rounded-xl bg-[#e287b1] px-5 py-2 text-[1rem]/[1.45rem] text-[#5f2d75] md:mt-5 md:translate-y-[1.875rem] md:px-6 md:text-[1.55rem]/[2.43rem]">
          Your Guide to an Inclusive Carriage
        </p>
      </div>

      <motion.div
        className="mx-auto mb-12 mt-12 w-fit md:mb-20 md:mt-16"
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: reduceMotion ? 0 : animationDelay, duration: reduceMotion ? 0 : 0.4 }}
      >
        <div ref={stack} className="photo-stack relative">
          {photos.map(({ file, alt, x, y, tilt, hand }, index) => (
            <motion.div
              key={file}
              className="character-card absolute inset-0"
              data-active={activeCardIndex === index}
              data-hovered={hoveredCardIndex === index}
              style={{
                "--card-tilt": tilt + "deg",
              } as CSSProperties}
              initial={reduceMotion ? false : { x: "0%", y: "0%" }}
              animate={{ x, y }}
              transition={reduceMotion ? { duration: 0 } : {
                type: "spring",
                stiffness: 70,
                damping: 12,
                delay: animationDelay + 0.4 + index * 0.15,
              }}
            >
              <button
                type="button"
                className="character-card-button"
                aria-label={alt + ". Wave hi"}
                aria-pressed={activeCardIndex === index}
                onPointerEnter={event => {
                  if (event.pointerType === "mouse" && matchMedia("(hover: hover) and (pointer: fine)").matches) {
                    setHoveredCardIndex(index);
                    setActiveCardIndex(null);
                  }
                }}
                onPointerLeave={() => setHoveredCardIndex(current => current === index ? null : current)}
                onClick={event => {
                  if (event.detail > 0 && event.nativeEvent instanceof PointerEvent &&
                      event.nativeEvent.pointerType === "mouse" && hoveredCardIndex === index) return;
                  setHoveredCardIndex(null);
                  setActiveCardIndex(current => current === index ? null : index);
                }}
              >
                <WavingCharacter
                  src={import.meta.env.BASE_URL + "photos/" + file}
                  hand={hand}
                  waving={!reduceMotion && (hoveredCardIndex === index || activeCardIndex === index)}
                />
              </button>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <a
        href="../"
        onClick={onOpen}
        className="gallery-flipbook-link group inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-lg text-[#5f2d75] focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <span className="underline decoration-1 underline-offset-4">Open the flipbook</span>
        <span aria-hidden="true" className="motion-safe:transition-transform motion-safe:group-hover:translate-x-1 motion-safe:group-focus-visible:translate-x-1">→</span>
      </a>
    </section>
  );
}

