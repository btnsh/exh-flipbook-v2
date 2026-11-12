import { createRoot } from "react-dom/client";
import type { MouseEvent as ReactMouseEvent } from "react";
import { PhotoGallery } from "@/components/ui/gallery";
import "./styles.css";

const gallery = document.getElementById("root")!;
const reader = document.querySelector<HTMLIFrameElement>("#gallery-reader")!;
const readerHash = "#flipbook";
let opener: HTMLAnchorElement | null = null;

function syncReader() {
  const open = location.hash === readerHash;
  if (reader.classList.contains("is-open") === open) return;

  reader.classList.toggle("is-open", open);
  reader.inert = !open;
  gallery.inert = open;
  if (open) {
    reader.focus();
  } else {
    opener?.focus();
  }
}

function isPlainClick(event: MouseEvent | ReactMouseEvent) {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

function openReader(event: ReactMouseEvent<HTMLAnchorElement>) {
  if (!isPlainClick(event)) return;
  event.preventDefault();
  opener = event.currentTarget;
  history.pushState({ galleryOpenedReader: true }, "", readerHash);
  syncReader();
}

function closeReader(event: MouseEvent) {
  if (!isPlainClick(event)) return;
  event.preventDefault();
  reader.contentDocument?.querySelector<HTMLButtonElement>('#full[aria-pressed="true"]')?.click();
  if (history.state?.galleryOpenedReader) {
    history.back();
  } else {
    history.replaceState(history.state, "", location.pathname + location.search);
    syncReader();
  }
}

function bindReaderControls() {
  reader.contentDocument?.querySelectorAll<HTMLAnchorElement>("[data-close-reader]")
    .forEach(link => link.addEventListener("click", closeReader));
}

reader.addEventListener("load", bindReaderControls);
bindReaderControls();
window.addEventListener("hashchange", syncReader);
syncReader();

createRoot(gallery).render(
  <main className="mx-auto flex min-h-svh max-w-6xl items-center justify-center px-4 py-14">
    <PhotoGallery onOpen={openReader} />
  </main>,
);
