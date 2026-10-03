<div align="center">

<pre>
███╗   ██╗ ██████╗ ████████╗██╗  ██╗    ██████╗ ██████╗ ███╗   ██╗███╗   ██╗███████╗ ██████╗████████╗
████╗  ██║██╔═══██╗╚══██╔══╝╚██╗██╔╝   ██╔════╝██╔═══██╗████╗  ██║████╗  ██║██╔════╝██╔════╝╚══██╔══╝
██╔██╗ ██║██║   ██║   ██║    ╚███╔╝    ██║     ██║   ██║██╔██╗ ██║██╔██╗ ██║█████╗  ██║        ██║
██║╚██╗██║██║   ██║   ██║    ██╔██╗    ██║     ██║   ██║██║╚██╗██║██║╚██╗██║██╔══╝  ██║        ██║
██║ ╚████║╚██████╔╝   ██║   ██╔╝ ██╗   ╚██████╗╚██████╔╝██║ ╚████║██║ ╚████║███████╗╚██████╗   ██║
╚═╝  ╚═══╝ ╚═════╝    ╚═╝   ╚═╝  ╚═╝    ╚═════╝ ╚═════╝ ╚═╝  ╚═══╝╚═╝  ╚═══╝╚══════╝ ╚═════╝   ╚═╝
</pre>

<h3>⚡ THE ZERO-BS CAMPUS EVENT & ASSOCIATION PLATFORM ⚡</h3>

<p>
<b>Cryptographic QR Passes • 200ms Camera Check-In • Publicly Verifiable Credentials • Neo-Brutalist Speed</b>
</p>

---

[![React 19](https://img.shields.io/badge/React-19.0.1-000000?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![TypeScript 5.8](https://img.shields.io/badge/TypeScript-5.8.2-000000?style=for-the-badge&logo=typescript&logoColor=3178C6)](https://www.typescriptlang.org/)
[![Vite 6.2](https://img.shields.io/badge/Vite-6.2.3-000000?style=for-the-badge&logo=vite&logoColor=646CFF)](https://vitejs.dev/)
[![TailwindCSS 4](https://img.shields.io/badge/TailwindCSS-v4.1-000000?style=for-the-badge&logo=tailwindcss&logoColor=38B2AC)](https://tailwindcss.com/)
[![Firebase Firestore](https://img.shields.io/badge/Firebase-Firestore-000000?style=for-the-badge&logo=firebase&logoColor=FFCA28)](https://firebase.google.com/)
[![PWA Ready](https://img.shields.io/badge/PWA-iOS%20%26%20Android-000000?style=for-the-badge&logo=pwa&logoColor=F43F5E)](https://vite-pwa-org.netlify.app/)
[![License MIT](https://img.shields.io/badge/License-MIT-000000?style=for-the-badge&logo=open-source-initiative&logoColor=white)](LICENSE)

<br/>

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│  APP:       NotX Connect                                                     │
│  LIVE:      https://notx-saas.vercel.app/                                    │
│  MOTTO:     "Because paper attendance sheets belong in a museum."            │
│  STYLE:     Neo-Brutalist Industrial (Hard shadows, chunky ink, zero fluff)  │
└──────────────────────────────────────────────────────────────────────────────┘
```

</div>

---

## ☕ PROLOGUE: WHY DOES THIS EXIST?

> *"It is 9:02 AM. A college workshop has 180 students packed into the seminar hall. Two coordinators are passing around a single ballpoint pen and a crushed sheet of A4 ruled paper. By 9:45 AM, three different people named 'Rahul' have signed for five other Rahuls who are currently fast asleep in the canteen."*

**Enter NotX Connect.**  
Built out of sheer exhaustion with soggy paper passes, fake certificates edited in Canva with misspelled principal signatures, and chaotic Google Sheets with 34 conflicting edit histories.

NotX Connect turns college departments and student associations into ultra-slick digital command centers:
- **Zero fake attendance**: Cryptographic QR passes verified with hardware camera scanners in 200ms.
- **Zero forged certificates**: Tamper-proof Certificate IDs verifiable by any recruiter on earth with 1 click.
- **Zero lost data**: Real-time Firestore document storage with soft-delete safety vaults.
- **Zero app store nonsense**: Full Progressive Web App (PWA) that installs straight to any phone's homescreen.

---

## 🕹️ INTERACTIVE COMPONENTS SHOWCASE (TRY THE APP COMPONENTS)

Explore the actual interactive UI components of **NotX Connect** directly inside this README. Click each component to test its behavior and live states:

---

### 🎟️ COMPONENT 1: THE CRYPTOGRAPHIC DIGITAL PASS (`EventTicketModal`)
The actual digital ticket modal rendered when an attendee registers for an event.

<details open>
<summary><b>👉 [CLICK TO INSPECT PASS COMPONENT]</b></summary>

```text
┌────────────────────────────────────────────────────────────────────────┐
│  NOTX CONNECT • EVENT PASS                                 [CSE-AIML]  │
├────────────────────────────────────────────────────────────────────────┤
│  EVENT:       National Level GenAI Symposium 2026                      │
│  ATTENDEE:    Syed Sameer (23HM1A3354)                                 │
│  DEPARTMENT:  Artificial Intelligence & Machine Learning               │
│  REG ID:      REG-994821                                               │
│                                                                        │
│   ▄▄▄▄▄▄▄  ▄ ▄▄ ▄▄ ▄▄▄▄▄▄▄    CRYPTO CHECKSUM:   7e2b81fa              │
│   █ ▄▄▄ █ ▀█▄▀ ▀██ █ ▄▄▄ █    ALGORITHM:         HMAC-SHA256           │
│   █ ███ █ █ █ █▀ █ █ ███ █    SIGNATURE PAYLOAD: tenant+event+reg+roll │
│   █▄▄▄▄▄█ █ ▀ ▀ █▀ █▄▄▄▄▄█    STATUS:            🟢 CONFIRMED & VALID  │
│                                                                        │
│  [ DOWNLOAD PASS (PNG) ]          [ ADD TO APPLE / GOOGLE WALLET ]     │
└────────────────────────────────────────────────────────────────────────┘
```
> **What this does in the app**: Computes a salted 8-character SHA-256 HMAC hash on pass generation. If an attendee alters any data in the QR payload, the hardware scanner immediately rejects the pass.
</details>

---

### 📷 COMPONENT 2: REAL-TIME HARDWARE SCANNER HUD (`QRCameraScanner`)
The in-app optical scanner used by event coordinators to check in attendees. Click each state to preview real responses:

<details>
<summary><b>🟢 State A: First-time Valid Check-In (Click to preview)</b></summary>

```text
┌────────────────────────────────────────────────────────────────────────┐
│  CAMERA HUD: 60 FPS • 1080p OPTICAL FEED                  [AUTO-FOCUS] │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│                 ┌──────────────────────────┐                           │
│                 │   [SCAN RETICLE ACTIVE]  │                           │
│                 │      ▄▄▄▄▄▄▄   ▄▄▄▄▄▄▄   │                           │
│                 │      █ ▄▄▄ █   █ ▄▄▄ █   │                           │
│                 │      █▄▄▄▄▄█   █▄▄▄▄▄█   │                           │
│                 └──────────────────────────┘                           │
│                                                                        │
│  STATUS: ✅ CHECK-IN CONFIRMED (Latency: 142ms)                        │
│  STUDENT: Syed Sameer (23HM1A3354)                                     │
│  ACTION:  Recorded in Firestore • Attended at 08:59:41 AM              │
│  FEEDBACK: [AUDIO CHIME 🔔] + [HAPTIC VIBRATION 📳] + [GREEN FLASH 🟩]   │
└────────────────────────────────────────────────────────────────────────┘
```
</details>

<details>
<summary><b>🟡 State B: Duplicate Scan Attempt (Click to preview)</b></summary>

```text
┌────────────────────────────────────────────────────────────────────────┐
│  CAMERA HUD: 60 FPS • 1080p OPTICAL FEED                  [AUTO-FOCUS] │
├────────────────────────────────────────────────────────────────────────┤
│  STATUS: ⚠️ DUPLICATE PASS DETECTED!                                   │
│  ATTENDEE ALREADY CHECKED IN AT: 08:54:10 AM                           │
│  VERIFIED BY: Coordinator Naseer (UID: coord-04)                       │
│  FEEDBACK: [WARNING BUZZER 🚨] + [YELLOW WARNING BANNER 🟨]             │
│  ACTION: Attendance write aborted. Duplicate entry prevented.          │
└────────────────────────────────────────────────────────────────────────┘
```
</details>

<details>
<summary><b>🔴 State C: Forged / Counterfeit Ticket (Click to preview)</b></summary>

```text
┌────────────────────────────────────────────────────────────────────────┐
│  CAMERA HUD: 60 FPS • 1080p OPTICAL FEED                  [AUTO-FOCUS] │
├────────────────────────────────────────────────────────────────────────┤
│  STATUS: 🛑 INVALID CRYPTOGRAPHIC SIGNATURE!                           │
│  CHECKSUM: MISMATCH (Expected 7e2b81fa, received 99aa01bb)             │
│  REASON: Payload was modified or ticket does not exist in database.    │
│  FEEDBACK: [CRITICAL ALARM 🔊] + [RED SCREEN FLASH 🟥]                  │
└────────────────────────────────────────────────────────────────────────┘
```
</details>

---

### 🎓 COMPONENT 3: VERIFIED CREDENTIALS DESK (`CertificateVerificationModal`)
Public, unauthenticated verification portal for authenticating student certificates.

<details open>
<summary><b>👉 [CLICK TO INSPECT CERTIFICATE VERIFICATION]</b></summary>

```text
┌────────────────────────────────────────────────────────────────────────┐
│  NOTX CONNECT • PUBLIC CERTIFICATE VERIFICATION DESK                   │
├────────────────────────────────────────────────────────────────────────┤
│  VERIFICATION ID:   NX-CERT-2026-9912                                  │
│  ISSUED TO:         Syed Sameer                                        │
│  ROLL NUMBER:       23HM1A3354                                         │
│  ACHIEVEMENT:       1st Place Winner — State Level Hackathon           │
│  ISSUING AUTHORITY: Dept of CSE (AI & ML) • Academic Council           │
│  ISSUE DATE:        October 2026                                       │
│  VERIFICATION URL:  https://notx-saas.vercel.app/verify/NX-CERT-9912   │
│                                                                        │
│  STATUS:            🛡️ CRYPTOGRAPHICALLY AUTHENTICATED & RECORDED       │
└────────────────────────────────────────────────────────────────────────┘
```
> **What this does in the app**: Anyone (recruiters, professors, external judges) can open the public verification link and inspect the authentic issue record without creating an account or logging in.
</details>

---

### 🏆 COMPONENT 4: WALL OF CHAMPIONS PODIUM (`EventsView`)
The visual leaderboard and hall-of-fame celebrating event winners.

<details>
<summary><b>👉 [CLICK TO REVEAL PODIUM ROSTER]</b></summary>

```text
                           ┌───────────────┐
                           │      👑       │
                           │   1ST PLACE   │
                           │  TEAM NEURAL  │
           ┌───────────────┤  23HM1A3354   ├───────────────┐
           │   🥈 2ND      │  Cash: ₹10,000│   🥉 3RD      │
           │  BYTECRAFT    └───────────────┘  CODEFORGE    │
           │  23HM1A3312       [PROJECT]      23HM1A3345   │
           │  Cash: ₹5,000   [GITHUB REPO]    Cash: ₹2,500 │
           └───────────────┘               └───────────────┘
```
> **What this does in the app**: Dynamic awards showcase supporting project repository links, demo video embeds, cash prize tags, and winner roster cards.
</details>

---

### 🛡️ COMPONENT 5: ZERO-LOSS SAFETY VAULT (`SuperAdminDashboard`)
The cascade soft-delete recovery engine that prevents accidental catastrophic data wipes.

<details>
<summary><b>👉 [CLICK TO INSPECT VAULT LOGIC]</b></summary>

```text
┌────────────────────────────────────────────────────────────────────────┐
│  NOTX CONTROL PLANE • ZERO-LOSS SAFETY VAULT (deleted_backups)         │
├────────────────────────────────────────────────────────────────────────┤
│  [RESTORE]  Event: "AI Hackathon" (Staged with 48 registrations)       │
│  [RESTORE]  Tenant: "ECE-ROBOTICS" (Staged with 120 members)           │
│  [RESTORE]  Certificate Batch: "Symposium 2026" (180 certs)           │
│                                                                        │
│  SAFETY PROTOCOL:                                                      │
│  Deleting any document cascades all children into `deleted_backups`.   │
│  Super Admins can undo deletions with 1 click or permanently purge.    │
└────────────────────────────────────────────────────────────────────────┘
```
</details>

---

## 📱 ALL REAL MODULES IN NOTX CONNECT

```text
┌───────────────────────────┬────────────────────────────────────────────────────────┐
│ APP MODULE                │ REAL PRODUCTION FUNCTIONALITY                          │
├───────────────────────────┼────────────────────────────────────────────────────────┤
│ 📊 Student Command Deck   │ Live attendance meters, active passes wallet, next     │
│                           │ event countdowns, and quick-check-in shortcuts.        │
├───────────────────────────┼────────────────────────────────────────────────────────┤
│ 🎟️ Event Arena            │ Solo & team registration with atomic slot reservation, │
│                           │ capacity limit guards, and scannable QR generation.    │
├───────────────────────────┼────────────────────────────────────────────────────────┤
│ 📷 Optical Camera Scanner │ Direct browser camera stream via `html5-qrcode`. Zero  │
│                           │ app downloads required; works on mobile Safari/Chrome. │
├───────────────────────────┼────────────────────────────────────────────────────────┤
│ 🏆 Wall of Champions      │ Hall-of-fame podium celebrating 1st/2nd/3rd winners,   │
│                           │ team rosters, project GitHub links, and prize badges.  │
├───────────────────────────┼────────────────────────────────────────────────────────┤
│ 🎓 Verified Credentials   │ Instant digital certificate viewer with unique public  │
│                           │ verification URLs. Anyone can verify authenticity.     │
├───────────────────────────┼────────────────────────────────────────────────────────┤
│ 📢 Circulars & Bulletins  │ Markdown department circulars with category filters    │
│                           │ (Exam, Workshop, Result, Notice) & image attachments.  │
├───────────────────────────┼────────────────────────────────────────────────────────┤
│ 🖼️ Campus Memories        │ High-res photo gallery with full-screen lightbox for   │
│                           │ past tech symposiums, workshops, and hackathons.       │
├───────────────────────────┼────────────────────────────────────────────────────────┤
│ 👥 Association Directory  │ Searchable directory of students and faculty           │
│                           │ coordinators with badges and role tags.                │
├───────────────────────────┼────────────────────────────────────────────────────────┤
│ 🛠️ Multi-Tenant Admin     │ Independent workspaces for collegiate departments with │
│                           │ custom logos, accent themes, quotas, and audit logs.   │
├───────────────────────────┼────────────────────────────────────────────────────────┤
│ 📴 PWA Ready              │ Progressive Web App that works offline and installs    │
│                           │ natively to home screens without an app store.         │
└───────────────────────────┴────────────────────────────────────────────────────────┘
```

---

## 🏗️ DATA FLOW & VERIFICATION ARCHITECTURE

```mermaid
sequenceDiagram
    autonumber
    actor Student
    participant UI as NotX Connect Client
    participant FS as Cloud Firestore
    actor Coordinator
    participant Cam as QR Camera Scanner

    Student->>UI: Registers for Department Event
    UI->>FS: Query current registrations against maxCapacity
    alt Sold Out
        FS-->>UI: Capacity reached (Overbooking blocked)
        UI-->>Student: Displays "Sold Out" badge
    else Slot Available
        UI->>FS: Write /registrations record (status: 'Registered')
        FS-->>UI: Registration Confirmed
        UI->>UI: Compute HMAC-SHA256 signature (tenant:event:regId:roll)
        UI-->>Student: Renders Digital Pass with Encrypted QR
    end

    Note over Student,Coordinator: Check-in on Event Day
    Coordinator->>Cam: Points camera at Student QR Pass
    Cam->>Cam: Parse QR & verify 8-character cryptographic signature
    Cam->>FS: Query /registrations/{regId}
    alt Pass Already Scanned
        FS-->>Cam: ⚠️ ALREADY ATTENDED (Display previous timestamp)
        Cam-->>Coordinator: Red Warning + Duplicate Alarm
    else Valid & Unchecked
        Cam->>FS: Update status: 'Attended', attendedAt: ISO timestamp
        FS-->>Cam: ✅ Check-in Saved
        Cam-->>Coordinator: Green Flash + Audio Chime + Attendee Name
    end
```

---

## 🛡️ SECURITY & RBAC PERMISSION MATRIX

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│  SUPER ADMIN  : Full control across all departments, safety backups & system logs     │
│  TENANT ADMIN : Department-level sovereignty over events, coordinators & circulars     │
│  COORDINATOR  : Event management, QR pass scanning, and attendee check-in               │
│  STUDENT      : Event registration, digital pass wallet, and certificate viewer        │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

| FEATURE | SUPER ADMIN | TENANT ADMIN | COORDINATOR | STUDENT | PUBLIC |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Manage Department Tenants** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Restore Deleted Data from Vault** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Create & Publish Events** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Scan QR Passes & Mark Attendance** | ✅ | ✅ | ✅ | ❌ *(locked)* | ❌ |
| **Issue Verified Certificates** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Verify Certificate Authenticity** | ✅ | ✅ | ✅ | ✅ | ✅ *(open)* |
| **Register & Receive QR Passes** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **View Circulars & Photo Gallery** | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 🎨 THE NEO-BRUTALIST DESIGN SYSTEM

- **2px Solid Ink Borders**: `border: 2px solid var(--nb-ink)` for crisp, confident framing.
- **Hard Offset Drop Shadows**: `box-shadow: 3px 3px 0 var(--nb-ink)` (No blurry gradients!).
- **High-Contrast Palette**: Cyber Amber, Neo Emerald, Vibrant Rose, Electric Purple, Cobalt Tech.
- **Clean Profile Avatars**: Clean avatars with zero distracting decorative borders.
- **Tactile Button Clicks**: Active down-press physics (`translate-x-0.5 translate-y-0.5`).

---

## 💻 TECHNOLOGY STACK

```text
┌───────────────────┬───────────────────┬──────────────────────────────────────────┐
│ COMPONENT         │ TECHNOLOGY        │ WHY IT'S HERE                            │
├───────────────────┼───────────────────┼──────────────────────────────────────────┤
│ Frontend Core     │ React 19.0.1      │ Latest concurrent UI rendering engine    │
│ Language          │ TypeScript 5.8.2  │ 100% strict type safety across all views │
│ Build System      │ Vite 6.2.3        │ Lightning-fast HMR and bundle compilation│
│ CSS Framework     │ TailwindCSS v4    │ Modern zero-runtime design tokens        │
│ Icons             │ Lucide React      │ Minimalist, crisp vector icons           │
│ Camera Engine     │ HTML5-QRCode      │ Direct browser-level optical QR decoding │
│ Database          │ Google Firestore  │ Real-time multi-collection NoSQL sync    │
│ Authentication    │ Firebase Auth     │ Google OAuth & credential-based sign in  │
│ PWA Architecture  │ Vite Plugin PWA   │ Offline service worker & home screen app │
└───────────────────┴───────────────────┴──────────────────────────────────────────┘
```

---

## 🚀 5-STEP QUICKSTART GUIDE

Get NotX Connect running on your local machine in under 2 minutes:

```bash
# 1. Clone the repository
git clone https://github.com/ThinkBotz/notx-saas.git
cd notx-saas

# 2. Install dependencies
npm install

# 3. Configure environment variables (optional for local mock mode)
cp .env.example .env

# 4. Start the local development server
npm run dev

# 5. Open your browser
# Visit: http://localhost:3000
```

To run type checks and generate a production build:
```bash
npm run lint    # Executes strict tsc --noEmit
npm run build   # Produces optimized production bundle in /dist
```

---

## 🏆 CREATOR ROSTER

<table width="100%">
<tr>
<td width="100%" align="center">
<br/>
<b>SYED SAMEER</b><br/>
<code>23HM1A3354</code><br/>
<b>Lead Full-Stack Architect</b><br/>
<sub>Designed the architecture, real-time database schema, cryptographic verification engine & credentials desk.</sub><br/><br/>
<a href="mailto:syedsame2244@gmail.com">📧 Email</a> • <a href="https://github.com/samxiao0">🐙 GitHub</a>
<br/><br/>
</td>
</tr>
</table>

---

## 📜 LICENSE

Distributed under the **MIT License**.  
Free to use, inspect, customize, and deploy for educational institutions and student bodies.

```text
Copyright (c) 2026 NotX Connect / Department of CSE (AI & ML)
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction...
```

<div align="center">
  <b>Built with ⚡, caffeine, and zero tolerance for paper attendance sheets.</b><br/>
  <sub>NotX Connect • Powered by ThinkBotz</sub>
</div>
