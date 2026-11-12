import { cp } from "node:fs/promises";

const project = new URL("../", import.meta.url);
const readerFiles = [
  "index.html",
  "handbook.js",
  "reader.js",
  "reader.css",
  "reader-icons",
  "handbook-pages",
  "EXH Programme Handbook.pdf",
];

await Promise.all(
  readerFiles.map((path) =>
    cp(new URL(path, project), new URL(`dist/${path}`, project), { recursive: true }),
  ),
);
