# 🧩 Rubio-Cubio — Interactive 3D Rubik's Cube Solver

### Live Demo: [https://rubio-cubio.vercel.app/](https://rubio-cubio.vercel.app/)

A zero-friction, fully client-side web application to input, analyze, and solve any scrambled 3×3 Rubik's Cube. Everything runs entirely in your browser — no accounts, no backend, no data ever sent to a server.

---

## ⚙️ How It Works

1. **Input your cube** — scan each of the 6 faces using a photo upload, your device camera, or by painting colors manually.
2. **Hit Solve** — a C++ Kociemba two-phase solver compiled to **WebAssembly** runs inside a Web Worker thread, keeping the UI fully responsive.
3. **Follow the solution** — an interactive Three.js 3D simulation plays back the solution move-by-move so you can follow along before touching your physical cube.

---

## 🌟 Features

### 📸 Three Ways to Input Your Cube
- **Photo Upload** — drag and drop an image, align a crop box to the 3×3 face, and colors are automatically extracted using HSV color matching.
- **Camera Capture** — on mobile, use your device camera to photograph each face directly.
- **Manual Entry** — click cells on an interactive 3×3 grid and paint colors by hand; the center sticker is locked to maintain correct orientation.

### 🧠 WebAssembly Solver
- The **Kociemba two-phase algorithm** (industry-standard for optimal cube solving) is compiled from C++ into a **WebAssembly binary** and executed inside a **Web Worker** thread.
- The UI never freezes during solving — the search runs on a separate CPU thread.
- Validation checks are run before solving: each color must appear exactly 9 times and center stickers must be correctly oriented.

### 🕹️ Interactive 3D Solution Player
- A **Three.js** 3D Rubik's Cube model is colored to match your scanned state.
- Step forward and backward through moves with animated 90°/180° layer rotations.
- Drag, zoom, and orbit the cube freely to inspect it from any angle.

### 🔄 State String
- The full cube state is encoded as a 54-character string (Kociemba notation) — you can paste it directly to skip scanning, or share it.
- Sample states you can paste and try immediately:
```
FBBFUFFBUFUDDRRRBLRULLFRBBBDRUFDLFFUUDDLLDLRRLDRUBUBLD
DBLBURBRLDBFFRLRBRUUBUFDDLBFDUUDUBDULLLFLLRFRUDFFBRFRD
BDDUULRRDLDRURUURLBBFDFRFLRUFBLDFBBFUFDDLFDURFRLBBBULL
```

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| UI Framework | React + TypeScript (Vite) |
| Solver Engine | C++ Kociemba → WebAssembly (`kociemba-wasm`) |
| Threading | Web Worker (dedicated OS thread) |
| 3D Rendering | Three.js + OrbitControls |
| Color Detection | HTML5 Canvas + HSV distance metric |
| Deployment | Vercel |

---

## 🔒 Privacy

No registration required. Camera frames, uploaded images, and all solve computation stay entirely within your browser tab.
