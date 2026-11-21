# Saantvana Product and Build Guide

**Author & Maintainer:** Hareram Kushwaha ([@ha-re-ram](https://github.com/ha-re-ram)) · 2026  
**License:** MIT

## 1. Purpose
Saantvana is a mental wellbeing concept that aims to make remote conversations feel more emotionally present. Its starting point is a calm, consent-led way to connect with people a user already trusts. The source idea proposes 3D video calling through AI depth estimation, with AR and VR as later extensions.

This guide turns the concept into a working first-release web app. The attached concept PDF is source material, not implementation instructions. Product behavior and language here define the app.

## 2. Product principles
- **Human connection first:** make it easy to reach trusted people and community, without gamification or pressure.
- **Consent and control:** camera and microphone are opt-in. Depth processing requires the video sender's consent and can be revoked at any time.
- **Honest capability:** make clear which features work, what runs on device, and what still needs a later release.
- **Accessible calm:** readable contrast, keyboard access, reduced-motion support, clear focus, and responsive layouts.
- **Privacy by default:** do not collect or persist wellbeing answers or call recordings. Video is peer-to-peer when the network allows it; the app relays only WebRTC signaling messages.

## 3. Intended users and needs
People who feel isolated and want a warmer way to connect with friends, family, peers, or a support professional. The app should help them start a conversation without implying that loneliness is their fault or that an app replaces professional care.

## 4. Working MVP scope
### Included
- Responsive Home, Connections, and Wellbeing views, with editable local connections and group filters.
- One-to-one browser video and audio calls. A caller creates a private room and shares a link; one other participant can join. Microphone, camera, and end-call controls operate on the actual media tracks.
- The Node signaling service exchanges WebRTC connection setup messages. Call media is peer-to-peer when possible and is not recorded or passed through this service. STUN assists connectivity; restrictive networks may require a TURN service.
- Optional monocular depth estimation of the remote video. The video sender must approve each request and can revoke it at any time. The model is downloaded on first use from Hugging Face and runs in the viewing participant's browser with WebGPU where supported, otherwise WebAssembly. Video frames used for depth inference remain on that device. The effect is a depth-layer ambience, not stereoscopic 3D, AR, or VR.
- Optional local check-in controls, a reflective prompt, and a guided pause. Free-text reflections are not stored or transmitted.
- Installable PWA shell with manifest, icon, service worker, offline app-shell caching, and shareable invite URLs.

### Later work
- User accounts, contact discovery/sync, messaging, multi-person calls, production TURN infrastructure, call invitations/notifications, robust model hosting and offline model packaging, AR/VR, and professional care workflows.
- UCLA Loneliness Scale administration or scoring. The concept's “50% reduction” figure is an aspiration in the source, not a validated result or app claim.

## 5. UX and visual direction
- Warm, quiet, optimistic interface; deep ink text, soft lavender/blue surfaces, restrained coral accent, generous whitespace, rounded cards.
- Avoid clinical dashboard tropes, alarming red states, and manipulative streaks or notifications.
- Make it clear when sample connections are placeholders. A real call asks for camera/microphone permission only after the user starts or joins one.
- The call layout prioritizes faces and simple controls with visible states. Joining a room is limited to two participants.
- Desktop: left navigation and spacious content. Mobile: compact header and controls reachable by thumb.

## 6. Safety and wellbeing language
- Use supportive, non-diagnostic wording. Do not describe the app as treating or eliminating loneliness.
- Check-ins are optional and private in this app. Never imply that answers are monitored.
- Provide a gentle route to seek trusted human or professional support. Before any public launch, crisis guidance must be localized and reviewed by qualified experts.
- Do not present the UCLA Loneliness Scale without permission, validated implementation, scoring guidance, and appropriate review.
- Invite links grant room access to anyone holding the link. Users should share them only with someone they trust.

## 7. Technical guidelines
- Mobile-first React + Vite client; Node.js WebSocket signaling server.
- Use semantic HTML, accessible names, visible focus, keyboard-operable controls, and reduced-motion preferences.
- Use HTTPS outside localhost. Browser media access requires a secure context.
- WebRTC carries audio/video directly where possible. The included public STUN service does not guarantee connectivity through all corporate or restrictive NATs; configure TURN for dependable production use.
- Depth inference is opt-in, approved by the video sender, revocable during the call, and on-device. The first use downloads model/runtime files from Hugging Face; avoid enabling it on metered connections unless the user agrees. Do not transmit depth frames or use a remote inference API.
- PWA app-shell caches same-origin static files only, not rooms, reflections, or media. The app requires network access for signaling, calls, and the first model download.
- Connection names are stored in browser local storage on the device that added them. They are not synced to a service; starting a call sends the display name and room signaling needed for that call. Do not store sensitive wellbeing answers.

## 8. Acceptance criteria
- `npm run dev` starts the app and signaling service. `npm run build` creates a production client and `npm start` serves it with signaling.
- Layout is usable on narrow mobile and wide desktop screens.
- A caller can create and share a room link; a second browser can join. Camera/microphone permissions are requested on explicit action. Actual tracks can be muted/disabled, and ending a call stops local tracks.
- Depth inference can be enabled during a connected call and runs locally, or shows a clear fallback if the device cannot run it.
- Home, Connections, and Wellbeing views work; added connections persist locally and can be removed; group filters return matching connections; invite URLs show a join prompt.
- Manifest, icon, and service worker are present. Previously loaded app shell remains available offline; call/model features indicate their network needs.
- UI and documentation avoid presenting the source PDF's 50% target as an achieved outcome.
