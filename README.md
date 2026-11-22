# Saantvana (सांत्वना) — Feel Closer

A calm, consent-led connection and wellbeing web application designed to foster emotional presence without pressure.

[![Live on Custom Domain](https://img.shields.io/badge/Live%20App-hareramkushwaha.com.np-6e56cf?logo=google-chrome&logoColor=white)](https://hareramkushwaha.com.np/Saantvana/)
[![Live on GitHub Pages](https://img.shields.io/badge/Live%20App-GitHub%20Pages-2ea44f?logo=github)](https://ha-re-ram.github.io/Saantvana/)
[![CI](https://github.com/ha-re-ram/Saantvana/actions/workflows/ci.yml/badge.svg)](https://github.com/ha-re-ram/Saantvana/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## 🌟 Key Highlights

- **Direct Google Meet by Default**: Launch instant, high-definition Google Meet rooms in one click with automated invitation copying, WhatsApp direct sharing, and calm companion mode.
- **Works Universally on All Networks**: Zero dropped calls or carrier NAT blocks on 5G/4G cellular networks and strict Wi-Fi firewalls.
- **Calm Companion Experience**: Saantvana stays open during and after calls with a session timer, grounding reminders, and mindful pause options.
- **Mindful Pauses**: Guided breathing exercises with customizable durations (1 min, 2 min, 3 min) and gentle synthesized audio chimes.
- **5-4-3-2-1 Sensory Grounding**: Step-by-step somatic sensory grounding tool to reset attention in moments of stress or overwhelm.
- **Private by Default**: Saved contacts, check-ins, and reflections remain strictly in your device's browser storage (`localStorage`). No tracking or cloud databases.
- **Responsive Mobile Experience**: Clean bottom navigation bar, dynamic viewport sizing (`100dvh`), and offline app-shell caching.

---

## 🚀 Use Directly or Clone & Run

### 1. Use the Live Web Application
You can use the application immediately in any modern browser on mobile, tablet, or desktop:
- **Custom Domain**: [https://hareramkushwaha.com.np/Saantvana/](https://hareramkushwaha.com.np/Saantvana/)
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
2. **Mindful Breathing Machine (`breathingMachine.js`)**:
   Orchestrates 14-second therapeutic cycles (`INHALING` 4s ➔ `HOLDING` 7s ➔ `EXHALING` 3s) with pause/resume support and audio chimes.
3. **Sensory Grounding Machine (`groundingMachine.js`)**:
   Orchestrates 5-4-3-2-1 somatic sensory steps progression with calm resets.

---

## 🛠️ Tech Stack

- **Client**: React 19, Vite, Lucide Icons
- **Signaling Server**: Node.js, WebSockets (`ws`)
- **State Orchestration**: Deterministic Finite State Machines (`src/machines/`)
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
