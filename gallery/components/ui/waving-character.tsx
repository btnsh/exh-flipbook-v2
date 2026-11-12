import { useEffect, useRef } from "react";

// Bounds in the original 917 × 917 illustrations, ending at the wrist.
export type HandBounds = readonly [left: number, top: number, right: number, wrist: number];

const sourceSize = 917;

function smoothstep(value: number) {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}

export function WavingCharacter({ src, hand, waving }: {
  src: string;
  hand: HandBounds;
  waving: boolean;
}) {
  const image = useRef<HTMLImageElement>(null);
  const patch = useRef<HTMLCanvasElement>(null);
  const [left, top, right, wrist] = hand;
  const width = right - left;
  const height = wrist - top;

  useEffect(() => {
    const art = image.current;
    const canvas = patch.current;
    const context = canvas?.getContext("2d");
    if (!waving || !art || !canvas || !context) return;

    let cancelled = false;
    let frame = 0;
    void art.decode().then(() => {
      if (cancelled) return;
      context.drawImage(art, left, top, width, height, 0, 0, width, height);
      const source = context.getImageData(0, 0, width, height).data;
      const output = context.createImageData(width, height);
      const horizontal = Array.from({ length: width }, (_, x) =>
        smoothstep(x / 20) * smoothstep((width - 1 - x) / 20)
      );
      const vertical = Array.from({ length: height }, (_, y) =>
        smoothstep(y / 16) * smoothstep((height - 1 - y) / (height * 0.65))
      );
      canvas.hidden = false;
      const start = performance.now();

      function render(now: number) {
        const elapsed = now - start;
        const sway = 17 * smoothstep(elapsed / 180) * Math.sin(elapsed * 2 * Math.PI / 760);
        for (let y = 0; y < height; y++) {
          const row = y * width;
          const offset = sway * vertical[y];
          for (let x = 0; x < width; x++) {
            // Feather the displacement to zero at the patch edges and wrist.
            const sample = Math.max(0, Math.min(width - 1, x - offset * horizontal[x]));
            const floor = Math.floor(sample);
            const from = (row + floor) * 4;
            const next = (row + Math.min(floor + 1, width - 1)) * 4;
            const pixel = (row + x) * 4;
            for (let channel = 0; channel < 4; channel++) {
              const base = source[from + channel];
              output.data[pixel + channel] = base + (source[next + channel] - base) * (sample - floor);
            }
          }
        }
        context!.putImageData(output, 0, 0);
        frame = requestAnimationFrame(render);
      }

      frame = requestAnimationFrame(render);
    }).catch(() => { canvas.hidden = true; });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      canvas.hidden = true;
    };
  }, [src, left, top, width, height, waving]);

  return (
    <>
      <img ref={image} src={src} alt="" width={220} height={220} draggable={false} className="character-card-art" />
      <canvas
        ref={patch}
        hidden
        aria-hidden="true"
        className="character-wave-patch"
        width={width}
        height={height}
        style={{
          left: `${left / sourceSize * 100}%`,
          top: `${top / sourceSize * 100}%`,
          width: `${width / sourceSize * 100}%`,
          height: `${height / sourceSize * 100}%`,
        }}
      />
    </>
  );
}
