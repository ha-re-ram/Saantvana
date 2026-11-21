# Saantvana

A calm, consent-led connection and wellbeing Progressive Web Application (PWA) designed to foster emotional presence without pressure.

## Highlights

- **Private 1:1 Video Calls**: Direct peer-to-peer WebRTC video and audio calls with STUN assistance, in-call chat, screen sharing, and live reactions.
- **Google Meet Integration**: Launch instant Google Meet calls or connect to saved personal Meet links in one click, with automated invitation copying.
- **On-Device Depth View**: Optional subtle depth-layer effect rendered locally using client-side Transformers.js. Video frames are never uploaded to cloud inference servers.
- **Strict Two-Party Consent**: Depth view requires explicit remote participant approval and can be revoked at any moment.
- **Mindful Pauses**: Guided breathing exercises with customizable durations (1 min, 2 min, 3 min) and gentle synthesized audio chimes.
- **5-4-3-2-1 Sensory Grounding**: Step-by-step grounding tool to reset attention in moments of overwhelm.
- **Private by Default**: Saved contacts, check-ins, and reflections remain strictly in your device's browser storage (`localStorage`). No tracking or cloud databases.
- **Responsive Mobile Experience**: Dedicated thumb-friendly bottom navigation bar, dynamic viewport sizing (`100dvh`), and full PWA offline caching.

## Tech Stack

- **Frontend**: React 19, Vite, Lucide Icons
- **Signaling Server**: Node.js, WebSockets (`ws`)
- **State Orchestration**: Lightweight, zero-dependency Finite State Machines (`src/machines/`)
- **AI / ML**: `@huggingface/transformers` (`depth-anything-small-hf` with WebGPU / WASM execution)
- **Styling**: Pure CSS design system with custom properties and daylight / calm night modes

## Quick Start

### Prerequisites

- Node.js 20 or higher
- npm 10 or higher

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Visit `http://localhost:4173` in your browser.

### Unit Tests

Run the native Node.js test suite:

```bash
npm test
```

### Production Build & Serve

```bash
npm run build
npm start
```

## Docker Deployment

Build and run the container:

```bash
docker build -t saantvana .
docker run -p 4173:4173 saantvana
```

## License

MIT - see [LICENSE](LICENSE) for details.
