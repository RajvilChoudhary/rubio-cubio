# 🧩 Interactive 3D Rubik's Cube Solver

### You can check out and use the project here: [https://rubio-cubio.vercel.app/](https://rubio-cubio.vercel.app/)

#### Here are some sample initial cube states you can use if you don't have one handy right now

```
FBBFUFFBUFUDDRRRBLRULLFRBBBDRUFDLFFUUDDLLDLRRLDRUBUBLD
DBLBURBRLDBFFRLRBRUUBUFDDLBFDUUDUBDULLLFLLRFRUDFFBRFRD
LBLBULRBDLUULRDRRDUUFFFDBRUDFFDDBUFRDDBULULRRBLBFBRFLF
BDDUULRRDLDRURUURLBBFDFRFLRUFBLDFBBFUFDDLFDURFRLBBBULL
BDULULFLFLUBRRURRRUFUDFBDDDLBBFDUBRFRBRDLLDUFLFUBBRDFL
FBUBURDBBDULRRRBFUFLRLFDBDDRFLDDLFUBUDRULULLUFRRFBBLFD
DBLDUULDRFFBBRFFDFBLUUFUURLBBDFDRFRURFUDLLDRRDLBLBBLUR
RDULUDFUBLFBFRLRBFLBDBFRULFRUDUDLBULBDUDLRUFFLRDFBBDRR
LDLUUFRBDFDULRLURFBDRFFULLLFDFUDBBBRDRDBLRUFDBRBFBUULR
DULLULLDRUFURRLLDFUBBRFBBDDLFFBDRRBRRUFFLFFUDBRBDBUULD
```

(Just paste one of these in the state string input box :-)  

A zero-friction web application to input, analyze, and solve any scrambled standard 3×3 Rubik's Cube. Everything runs entirely in your browser — no accounts, no backend, no data sent to a server.

---



## 🌟 Key Features



### 📋 Guided Face-by-Face Input

The app walks you through all six faces in a fixed order (White → Red → Green → Yellow → Orange → Blue):

- **Step-by-step prompts:** Each step tells you which face to scan and which color should be on top for consistent orientation.
- **Progress tracker:** A cube net and face list show which faces are done and let you jump back to any step.
- **State string:** Once all six faces are filled, the cube is encoded as a 54-character string you can also paste or edit directly.



### 📸 Camera Capture (Mobile)

On mobile devices, you can use the device camera to photograph each face:

- **Manual capture:** Start the camera, hold the cube steady, and tap **Capture** when ready.
- **Upload pipeline:** Captured frames are sent to the upload editor for crop alignment and color extraction — the same workflow as uploaded photos.

There is no automatic motion detection or live real-time scanning; you capture each frame yourself.

### 🖼️ Drag-and-Align Image Upload

Upload or drag-and-drop a photo of each face:

- **Precision calibration:** Align your image to an on-screen 3×3 grid using a draggable crop box.
- **Color extraction:** Nine cell centers are sampled, converted to HSV, and matched to the nearest cube color.
- **Per-sticker correction:** Tap any facelet to fix misclassified colors before confirming the face.



### 🎨 Manual Color Entry

Paint the cube by hand when photos aren't an option:

- **Interactive 3×3 grid:** Click cells and pick from six colors; the center sticker is locked to the face color.
- **Live sync:** Completed faces update the progress tracker and state string immediately.



### 🕹️ Interactive 3D Solution Player

After solving, step through the move sequence on a 3D cube before touching your physical one:

- **Virtual cube:** A Three.js 3D model reflects your scanned state.
- **Playback controls:** Step forward and backward through moves with a move counter.
- **Orbital camera:** Drag, zoom, and orbit to inspect the cube from any angle.



### 🧠 Local Solver

- **Kociemba two-phase algorithm** runs in a Web Worker via the bundled `cubejs` solver.
- **Validation before solve:** The app checks that each color appears exactly nine times and that center stickers are correct.
- **C++ solver** in `solvers/` is kept for a planned WebAssembly integration.

---



## 🔒 Privacy

- **No registration** — open the page and start solving.
- **Local processing only** — camera frames, uploaded images, and solve computation never leave your browser.

---

