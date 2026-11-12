# Inclusive Exhibition Guide — Version 2

Independent copy of the flipbook website.

## Run locally

Use Node.js 22.12 or later with npm. From this directory, run the following commands.

```sh
npm ci
npm run build
npm run preview
```

Open http://127.0.0.1:4173/ and select **Photo gallery** in the reader controls.
The gallery is also available directly at http://127.0.0.1:4173/gallery/.

## Gallery structure

The reader uses the root `index.html` and `reader.css`. The gallery uses React,
TypeScript, and Tailwind CSS via Vite. Its global stylesheet is
`gallery/styles.css`. The `@` alias points to `gallery/`, so
`@/components/ui/gallery` resolves to `gallery/components/ui/gallery.tsx`.
Keeping the shared gallery and button in `components/ui` gives the shadcn CLI
and component imports a common destination.

The project already includes the Tailwind and TypeScript setup. To add more
shadcn components, run `npx shadcn@latest add <component>` from the project root.
For a fresh project, follow the [shadcn Vite setup](https://ui.shadcn.com/docs/installation/vite)
and [Tailwind Vite setup](https://tailwindcss.com/docs/installation/using-vite).

The build outputs both the original reader files and the compiled gallery to
`dist/`. Serve that directory as a static site.
