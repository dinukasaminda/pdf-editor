# SignPDF

A clean web app for placing your signature on a PDF.

Upload a document and a signature image, remove the white background, adjust ink color / brightness / contrast, drag the sign onto any page, preview full screen, and save a new PDF — all in the browser.

Repo: [https://github.com/dinukasaminda/pdf-editor](https://github.com/dinukasaminda/pdf-editor)

---

## Features

- Upload any PDF and signature image
- Automatic white-background removal (ink becomes one adjustable color)
- Ink color, brightness, contrast, and background-cut controls
- Drag, move, resize, and delete signature placements
- Full-screen scrollable preview with placed signatures
- Export a new signed PDF (`Save as PDF`)
- Runs fully locally in your browser — files stay on your machine

---

## Prerequisites

Install these before you start:

| Tool | Version | Why you need it |
|------|---------|-----------------|
| **Node.js** | **18+** (20 or 22 LTS recommended) | Runs the app and install scripts |
| **npm** | Comes with Node.js | Installs packages |
| **Git** *(optional)* | Any recent version | Clone the project |
| A modern browser | Chrome, Firefox, Edge, or Safari | Open the app |

### Check your setup

```bash
node -v
npm -v
```

If `node` is missing, install Node.js from [https://nodejs.org](https://nodejs.org) (LTS), then open a new terminal and check again.

---

## Quick start

### 1. Get the project

**Option A — clone with Git**

```bash
git clone https://github.com/dinukasaminda/pdf-editor.git
cd pdf-editor
```

**Option B — download ZIP**

1. Open [https://github.com/dinukasaminda/pdf-editor](https://github.com/dinukasaminda/pdf-editor)
2. Click **Code → Download ZIP**
3. Unzip it and open a terminal in the project folder

### 2. Install dependencies

```bash
npm install
```

### 3. Start the app

```bash
npm run dev
```

### 4. Open in your browser

Vite will print a local URL, usually:

```text
http://localhost:5173
```

Open that link. You should see the SignPDF helper screen.

Stop the server anytime with `Ctrl + C`.

---

## How to use

1. Click **Upload PDF** and choose your document  
2. Click **Upload sign** and choose your signature image  
   - Tip: a signature on a plain white background works best  
3. Adjust **Ink color**, **Brightness**, **Contrast**, and **Background cut** if needed  
4. Drag the signature preview onto a PDF page  
5. Move or resize it; use the red **×** to delete a placement  
6. Click **Preview** for a full-screen scrollable view  
7. Click **Save as PDF** to download `signed-document.pdf`

---

## Useful scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build in `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |

### Production build example

```bash
npm run build
npm run preview
```

Then open the URL shown in the terminal (often `http://localhost:4173`).

---

## Project structure

```text
pdf-editor/
├── public/
│   └── pdf.worker.min.mjs   # PDF.js worker (required for rendering)
├── src/
│   ├── components/          # UI: sidebar, pages, preview, empty state
│   ├── utils/               # Signature processing + PDF load/export
│   ├── App.tsx              # Main app logic
│   ├── index.css            # Tailwind + theme
│   └── types.ts             # Shared types
├── package.json
└── README.md
```

---

## Tech stack

- **React 19** + **TypeScript**
- **Vite 7**
- **Tailwind CSS v4**
- **pdfjs-dist** — render PDF pages
- **pdf-lib** — write signatures into the exported PDF
- **react-rnd** — drag and resize placements

---

## Troubleshooting

**`npm install` fails**  
- Confirm Node.js 18+ with `node -v`  
- Delete `node_modules` and try again:  
  ```bash
  rm -rf node_modules package-lock.json
  npm install
  ```

**Port already in use**  
- Vite will pick another port (for example `5174`), or stop the other process using `5173`

**PDF stays on “Rendering…”**  
- Hard refresh the browser (`Cmd+Shift+R` / `Ctrl+Shift+R`)  
- Make sure `public/pdf.worker.min.mjs` exists  
- Restart with `npm run dev`

**Signature background not removed cleanly**  
- Use a clearer white background image  
- Raise **Background cut** in the sidebar  
- Adjust brightness / contrast after changing ink color

**Export button disabled**  
- You need a loaded PDF **and** at least one placed signature

---

## Privacy

Everything runs in your browser. PDFs and signature images are not uploaded to a server by this app.

---

## License

Private project — update this section if you publish or share the repo.
