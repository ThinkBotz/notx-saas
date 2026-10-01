# ⚡ NOTX Connect — Department of CSE (AI & ML) Ecosystem

<div align="center">

![React 19](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6.2-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![TailwindCSS v4](https://img.shields.io/badge/TailwindCSS-v4.0-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-Firestore%20%26%20Auth-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)
![PWA Ready](https://img.shields.io/badge/PWA-iOS%20%26%20Android-F43F5E?style=for-the-badge&logo=pwa&logoColor=white)
![Vercel Ready](https://img.shields.io/badge/Vercel-Deployed-000000?style=for-the-badge&logo=vercel&logoColor=white)

<p align="center">
  <b>A modern, high-performance web & mobile association portal for the Department of Computer Science & Engineering (AI & ML).</b>
</p>

</div>

---

## 📖 Overview

**NOTX Connect** is an all-in-one ecosystem designed for students, faculty, and student association coordinators. It delivers a unified digital experience for event registration, QR code verification, bulletin notices, photo galleries, student directory, certificate verification, and real-time peer-to-peer messaging.

The platform features a **Plum Velvet & Rose-Coral UI theme**, floating pill navigation bar, ambient atmospheric depth, and full PWA installation capabilities on both iOS and Android.

---

## ✨ Key Features

- 🏆 **Wall of Champions**: Dynamic homepage spotlight showcasing hackathon winners, quiz podium finishes, and competition champions.
- ⚡ **Events Arena & QR Tickets**: Interactive event discovery, team or individual registration, digital QR ticket generation, and CSV participant export.
- 📢 **Bulletin Board & Circulars**: Rich markdown announcements with category filters (Exams, Workshops, Results, Notices).
- 💬 **Peer-to-Peer Messaging**: Real-time student messaging system with collaboration request workflows.
- 🖼️ **Gallery Memory Albums**: Photo archives with high-resolution lightbox previews and photo management.
- 🎓 **Verified Certificate System**: Digital credentials verification desk for department hackathons and workshops.
- 📱 **Cross-Platform PWA**: Fully installable as a native-feeling app on **iOS** (*Safari Share → Add to Home Screen*) and **Android/Desktop** with offline mode indicator.
- 🔐 **Role-Based Security**: Multilevel access control for Admins, Associates, Coordinators, and Students.
- 🎨 **Dynamic Branding Customizer**: Admins can customize the application name, logo, subtitle badges, and accent themes live in real-time.

---

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Core Framework** | [React 19](https://react.dev/), [TypeScript 5](https://www.typescriptlang.org/) |
| **Build Tool** | [Vite 6](https://vitejs.dev/) |
| **Styling System** | [TailwindCSS v4](https://tailwindcss.com/), Vanilla CSS design tokens |
| **Icons & Micro-Interactions** | [Lucide React](https://lucide.dev/), Framer Motion |
| **Database & Auth** | [Firebase Cloud Firestore](https://firebase.google.com/), Firebase Authentication |
| **Media Hosting** | [Cloudinary](https://cloudinary.com/) (unsigned upload presets) |
| **PWA & Offline Support** | [Vite PWA Plugin](https://vite-pwa-org.netlify.app/), Workbox |
| **Deployment** | [Vercel](https://vercel.com/) |

---

## ⚙️ Environment Variables Reference

Create a `.env` file in the project root:

```env
# Admin Default Credentials
VITE_ADMIN_USERNAME=admin
VITE_ADMIN_PASSWORD=your_secure_password

# Cloudinary Setup for Image Uploads
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_unsigned_preset
```

---

## 🚀 Quick Start (Run Locally)

### Prerequisites
- **Node.js**: `v18.0.0` or higher
- **npm** or **bun**

### 1. Clone the repository
```bash
git clone https://github.com/ThinkBotz/better-cse-aiml.git
cd better-cse-aiml
```

### 2. Install dependencies
```bash
npm install
```

### 3. Start development server
```bash
npm run dev
```
Open [http://localhost:3000/](http://localhost:3000/) in your browser.

### 4. Build for production
```bash
npm run build
```

---

## 🌐 Deploying to Vercel

1. Push your code to GitHub.
2. Import the repository in [Vercel Dashboard](https://vercel.com/new).
3. Vercel automatically detects the build settings:
   - **Framework**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add your `.env` variables under **Vercel → Project Settings → Environment Variables**.
5. Add your Vercel URL (e.g. `your-app.vercel.app`) to **Firebase Console → Authentication → Authorized Domains**.

*Note: SPA routing is pre-configured via `vercel.json`.*

---

## 👤 Contributor

Developed and maintained by **[samxiao0](https://github.com/samxiao0)** for the **Department of CSE (AI & ML) Association**.

---

<div align ="center">
  <sub>Built with ❤️ for the CSE (AI & ML) Department Community</sub>
</div>
