import { createRoot } from "react-dom/client";
import { PhotoGallery } from "@/components/ui/gallery";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <main className="mx-auto flex min-h-svh max-w-6xl items-center justify-center px-4 py-14">
    <PhotoGallery />
  </main>,
);
