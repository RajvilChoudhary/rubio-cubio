# 🧩 Interactive 3D Rubik's Cube Solver

An intelligent, zero-friction web application designed to scan, analyze, and guide you through solving any scrambled standard 3x3 Rubik's Cube in seconds. Built to be entirely self-contained, everything happens right inside your browser with absolute processing privacy.

---

## 🌟 Key Features

### 📸 Real-Time Guided Scanning

Forget pressing a shutter button while struggling to hold your cube steady. The application acts as a smart director:

* **Interactive State Machine:** The interface tells you exactly which face to display first (e.g., "Show the White center face") and visually prompts you on how to rotate it next (e.g., "Rotate the cube right to show the Red face").
* **Chromatic Stability Engine:** The app continuously screens the video feed, ignoring motion blur or fast adjustments. The millisecond it detects the cube is held perfectly still, it automatically "snaps" and logs that face configuration.
* **Smart Face Validation:** Automatically verifies the center sticker color against the requested sequence to prevent out-of-order scans.

### 🖼️ Drag-and-Align Image Upload

For devices without a live camera feed or for users who prefer pre-taken photos:

* **Precision Calibration Interface:** Drop or upload pictures of individual cube faces into a dedicated calibration window.
* **Interactive Frame Adjustment:** Drag, pan, and zoom the uploaded image relative to an on-screen absolute 3x3 matrix alignment template to ensure accurate pixel assessment.

### 🎨 Manual Color Matrix Override

Ultimate fallback control over your cube state:

* **Interactive Grid Palette:** Toggle a 2D matrix map at any stage of the input process.
* **Click-to-Cycle Adjustment:** If tricky real-world lighting or heavy glares cause an incorrect scan, simply tap any individual facelet to manually adjust or paint the correct color assignment using an intuitive 6-color picker.

### 🕹️ Interactive 3D Simulation Player

Watch your custom solution play out on a digital twin before turning your physical cube:

* **Dynamic Virtual Twin:** A gorgeous, fully responsive 3D representation of your scanned Rubik's Cube built directly on the canvas viewport.
* **Granular Playback Controls:** Step through the generated optimal move sequence at your own pace with dedicated "Next Move", "Previous Move", and move counter indicators.
* **Orbital Camera Freedom:** Freely drag, swipe, zoom, and orbit around the 3D model to inspect active face adjustments from any physical perspective or viewing angle.

---

## 🔒 Zero Friction & Absolute Privacy

* **No Registration Required:** There are no sign-up forms, account setups, cookie confirmations, or social logins. Open the page and solve your cube immediately.
* **Local Processing Isolation:** Your camera streams and uploaded photos are parsed completely locally. No pixel data, image frames, or local files are ever transmitted to an external server or cloud database, guaranteeing complete data privacy.