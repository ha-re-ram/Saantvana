# Saantvana (सांत्वना) — Feel Closer

A calm, consent-led connection and wellbeing Progressive Web Application (PWA) designed to foster emotional presence without pressure.

[![CI](https://github.com/ha-re-ram/Saantvana/actions/workflows/ci.yml/badge.svg)](https://github.com/ha-re-ram/Saantvana/actions/workflows/ci.yml)
[![Deploy to GitHub Pages](https://github.com/ha-re-ram/Saantvana/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/ha-re-ram/Saantvana/actions/workflows/deploy-pages.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## 🌟 Key Highlights

- **Private 1:1 Video Calls**: Direct peer-to-peer WebRTC video and audio calls with STUN assistance, in-call chat, screen sharing, and live reactions.
- **Google Meet Integration**: Launch instant Google Meet calls or connect to saved personal Meet links in one click, with automated invitation copying.
- **On-Device Depth View**: Optional subtle depth-layer effect rendered locally using client-side Transformers.js. Video frames are never uploaded to cloud inference servers.
- **Strict Two-Party Consent**: Depth view requires explicit remote participant approval and can be revoked at any moment.
- **Mindful Pauses**: Guided breathing exercises with customizable durations (1 min, 2 min, 3 min) and gentle synthesized audio chimes.
- **5-4-3-2-1 Sensory Grounding**: Step-by-step grounding tool to reset attention in moments of overwhelm.
- **Private by Default**: Saved contacts, check-ins, and reflections remain strictly in your device's browser storage (`localStorage`). No tracking or cloud databases.
- **Responsive Mobile Experience**: Dedicated thumb-friendly bottom navigation bar, dynamic viewport sizing (`100dvh`), and full PWA offline caching.

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
- **PWA**: Service Worker with offline app-shell caching

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20 or higher
- npm 10 or higher

### Installation

```bash
git clone https://github.com/ha-re-ram/Saantvana.git
cd Saantvana
npm install
```

### Development Mode

Start both Vite and the WebSocket signaling server in one command:

```bash
npm run dev
```

Open `http://localhost:4173` in your browser.

### Automated Test Suite

Run the native Node.js unit tests for all state machines:

```bash
npm test
```

### Production Build & Local Server

```bash
npm run build
npm start
```

---

## ☁️ Live Deployment

### Option 1: Cloudflare Pages (Recommended for Static CDN)

1. Log into your [Cloudflare Dashboard](https://dash.cloudflare.com/) and navigate to **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**.
2. Select repository `ha-re-ram/Saantvana`.
3. Configure the build settings:
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `/`
4. Click **Save and Deploy**.
5. The repository includes `public/_redirects` (for SPA client-side routing) and `public/_headers` (for caching and security headers).

*(Note: In static CDN deployments without a WebSocket backend, users can connect instantly via the built-in Google Meet integration, or specify a signaling server URL via the `VITE_SIGNAL_URL` environment variable).*

### Option 2: GitHub Pages (Automated via GitHub Actions)

1. In your GitHub repository at [https://github.com/ha-re-ram/Saantvana](https://github.com/ha-re-ram/Saantvana):
   - Go to **Settings** > **Pages**.
   - Under **Build and deployment** > **Source**, choose **GitHub Actions**.
2. Every push to the `main` branch automatically triggers `.github/workflows/deploy-pages.yml`, runs the test suite, builds the distribution bundle, and publishes the site live to `https://ha-re-ram.github.io/Saantvana/`.

### Option 3: Full-Stack Docker Deployment (Client + Signaling Server)

To deploy both the frontend and the real-time WebSocket signaling backend:

```bash
# Build the Docker image
docker build -t saantvana .

# Run the container
docker run -p 4173:4173 saantvana
```

This container can be deployed directly to cloud container providers such as Railway, Render, Fly.io, or any VPS.

---

## 👤 Author & Copyright

- **Author**: Hareram Kushwaha
- **GitHub**: [@ha-re-ram](https://github.com/ha-re-ram)
- **Email**: `23cs054@gmail.com`
- **Repository**: [https://github.com/ha-re-ram/Saantvana](https://github.com/ha-re-ram/Saantvana)

Copyright (c) 2026 Hareram Kushwaha. All rights reserved.

---

## 📄 License

This project is open-source software licensed under the [MIT License](LICENSE).
