import { motion, useReducedMotion } from "framer-motion";

const photos = [
  { file: "1.png", alt: "A waving child in a green cap", x: "-145%", y: "7%", tilt: -3 },
  { file: "2.png", alt: "A waving child in a pink sweater", x: "-73%", y: "15%", tilt: -2 },
  { file: "3.png", alt: "A waving child using a wheelchair", x: "0%", y: "4%", tilt: 2 },
  { file: "4.png", alt: "A waving child in a blue and white shirt", x: "73%", y: "10%", tilt: 3 },
  { file: "5.png", alt: "A waving child wearing sunglasses and holding a white cane", x: "145%", y: "20%", tilt: -2 },
];

export function PhotoGallery({ animationDelay = 0.5 }: { animationDelay?: number }) {
  const reduceMotion = useReducedMotion();

  return (
    <section aria-labelledby="gallery-title" className="relative isolate w-full text-center">
      <div
        aria-hidden="true"
        className="gallery-grid pointer-events-none absolute inset-x-0 top-36 -z-10 hidden h-72 opacity-20 md:block"
      />
      <div className="px-4 pt-8 sm:px-8 md:pt-12 md:pb-4">
        <h1 id="gallery-title" className="gallery-title mx-auto max-w-sm text-balance text-[clamp(2.5rem,10vw,3.5rem)] leading-[1.02] tracking-tight text-[#5f2d75] md:max-w-full md:text-[min(7.3vw,7.25rem)] md:whitespace-nowrap">
          New Everyday Life, By Design
        </h1>
        <p className="gallery-subtitle mt-4 inline-block translate-y-4 rounded-xl bg-[#e287b1] px-5 py-2 text-[1.2rem]/[1.83rem] text-[#5f2d75] md:mt-5 md:translate-y-[1.875rem] md:px-6 md:text-[1.55rem]/[2.43rem]">
          your exhibition guide
        </p>
      </div>

      <motion.div
        className="mx-auto mb-12 mt-12 w-fit md:mb-20 md:mt-16"
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: reduceMotion ? 0 : animationDelay, duration: reduceMotion ? 0 : 0.4 }}
      >
        <div className="photo-stack relative">
          {photos.map(({ file, alt, x, y, tilt }, index) => (
            <motion.div
              key={file}
              className="absolute inset-0 hover:z-20"
              initial={reduceMotion ? false : { x: "0%", y: "0%" }}
              animate={{ x, y }}
              transition={reduceMotion ? { duration: 0 } : {
                type: "spring",
                stiffness: 70,
                damping: 12,
                delay: animationDelay + 0.4 + index * 0.15,
              }}
            >
              <Photo file={file} alt={alt} tilt={tilt} reduceMotion={Boolean(reduceMotion)} />
            </motion.div>
          ))}
        </div>
      </motion.div>

      <a
        href="../"
        className="gallery-flipbook-link group inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-lg text-[#5f2d75] focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <span className="underline decoration-1 underline-offset-4">Open the flipbook</span>
        <span aria-hidden="true" className="motion-safe:transition-transform motion-safe:group-hover:translate-x-1 motion-safe:group-focus-visible:translate-x-1">→</span>
      </a>
    </section>
  );
}

function Photo({ file, alt, tilt, reduceMotion }: {
  file: string;
  alt: string;
  tilt: number;
  reduceMotion: boolean;
}) {
  return (
    <motion.div
      drag={reduceMotion ? false : "x"}
      dragConstraints={{ left: 0, right: 0 }}
      dragMomentum={false}
      initial={false}
      animate={{ rotate: tilt }}
      whileHover={reduceMotion ? undefined : { scale: 1.1, rotate: tilt * 1.5 }}
      whileTap={reduceMotion ? undefined : { scale: 1.12 }}
      className="relative aspect-square w-full touch-pan-y drop-shadow-md motion-safe:cursor-grab motion-safe:active:cursor-grabbing"
    >
      <img
        src={`${import.meta.env.BASE_URL}photos/${file}`}
        alt={alt}
        width={220}
        height={220}
        draggable={false}
        className="h-full w-full select-none object-contain"
      />
    </motion.div>
  );
}
