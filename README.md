# Saantvana (सांत्वना) — Feel Closer

A calm, consent-led connection and wellbeing web application designed to foster emotional presence without pressure.

[![Live on Render](https://img.shields.io/badge/Live%20App-Render-46E3B7?logo=render&logoColor=black)](https://saantvana.onrender.com/)
[![Live on GitHub Pages](https://img.shields.io/badge/Live%20App-GitHub%20Pages-2ea44f?logo=github)](https://ha-re-ram.github.io/Saantvana/)
[![CI](https://github.com/ha-re-ram/Saantvana/actions/workflows/ci.yml/badge.svg)](https://github.com/ha-re-ram/Saantvana/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## 🌟 Key Highlights

- **Direct Google Meet by Default**: Launch instant, high-definition Google Meet rooms in one click with automated invitation copying and calm companion mode.
- **Private 1:1 Video Calls**: Direct peer-to-peer WebRTC video and audio calls with STUN assistance, in-call chat, screen sharing, and live reactions.
- **On-Device Depth View**: Optional subtle depth-layer effect rendered locally using client-side Transformers.js. Video frames are never uploaded to cloud inference servers.
- **Strict Two-Party Consent**: Depth view requires explicit remote participant approval and can be revoked at any moment.
- **Mindful Pauses**: Guided breathing exercises with customizable durations (1 min, 2 min, 3 min) and gentle synthesized audio chimes.
- **5-4-3-2-1 Sensory Grounding**: Step-by-step grounding tool to reset attention in moments of overwhelm.
- **Private by Default**: Saved contacts, check-ins, and reflections remain strictly in your device's browser storage (`localStorage`). No tracking or cloud databases.
- **Responsive Mobile Experience**: Clean bottom navigation bar, dynamic viewport sizing (`100dvh`), and offline app-shell caching.

---

## 🚀 Use Directly or Clone & Run

### 1. Use the Live Web Application
You can use the application immediately in any modern browser on mobile, tablet, or desktop:
- **Render (Full-Stack WebRTC + Signaling)**: [https://saantvana.onrender.com/](https://saantvana.onrender.com/)
- **GitHub Pages**: [https://ha-re-ram.github.io/Saantvana/](https://ha-re-ram.github.io/Saantvana/)

---

### 2. Clone and Setup Locally

#### Prerequisites
- Node.js 20 or higher
- npm 10 or higher

#### Clone & Install
```bash
git clone https://github.com/ha-re-ram/Saantvana.git
cd Saantvana
npm install
```

#### Run in Development Mode
Starts the client and WebSocket signaling service:
```bash
npm run dev
```
Open `http://localhost:4173` in your browser.

#### Run Automated Test Suites
Runs the zero-dependency test suite verifying state machines:
```bash
npm test
```

#### Build & Start Production Server
```bash
npm run build
npm start
```

---

## 📐 Architecture & State Machines

Saantvana eliminates implicit states and race conditions using deterministic, zero-dependency Finite State Machines (`src/machines/`):

1. **Call Session Machine (`callMachine.js`)**:
   `IDLE` ➔ `REQUESTING_MEDIA` ➔ `CONNECTING_SIGNAL` ➔ `ROOM_READY` ➔ `NEGOTIATING` ➔ `CONNECTED` ➔ `PEER_LEFT` ➔ `ENDED` (with structured `ERROR` recovery).
2. **On-Device Depth & Two-Party Consent Machine (`depthMachine.js`)**:
   Decouples the Viewer Pipeline (`DISABLED` ➔ `IDLE` ➔ `REQUESTING` ➔ `APPROVED` ➔ `LOADING_MODEL` ➔ `ACTIVE` / `PAUSED` / `REVOKED`) from the Consent Provider Pipeline (`IDLE` ➔ `PROMPTED` ➔ `GRANTED` / `DECLINED`).
3. **Mindful Breathing Machine (`breathingMachine.js`)**:
   Orchestrates 14-second therapeutic cycles (`INHALING` 4s ➔ `HOLDING` 7s ➔ `EXHALING` 3s) with pause/resume support and audio chimes.

---

## 🛠️ Tech Stack

- **Client**: React 19, Vite, Lucide Icons
- **Signaling Server**: Node.js, WebSockets (`ws`)
- **State Orchestration**: Deterministic Finite State Machines (`src/machines/`)
- **Inference**: `@huggingface/transformers` (`depth-anything-small-hf` with WebGPU / WASM execution)
- **Styling**: Pure responsive CSS with custom properties and daylight / calm night modes

---

## 👤 Author & Copyright

- **Author**: Hareram Kushwaha
- **GitHub**: [@ha-re-ram](https://github.com/ha-re-ram)
- **Email**: `hareramkushwaha054@gmail.com`
- **Repository**: [https://github.com/ha-re-ram/Saantvana](https://github.com/ha-re-ram/Saantvana)

Copyright (c) 2026 Hareram Kushwaha. All rights reserved.

---

## 📄 License

This project is open-source software licensed under the [MIT License](LICENSE).
