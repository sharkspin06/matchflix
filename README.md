# 🎬 MatchFlix

**A dating app for film lovers.** Show off your top four films, swipe through people nearby, and when you both like each other, start talking about movies in real time.

> *What's your Letterboxd?*

Available as a web app and as an Android app (built with Capacitor).

---

## ✨ Features

- **Film-first profiles**: pick your top 4 films (powered by TMDB search), plus photos, bio, interests, zodiac, education, pets, and drinking/smoking habits
- **Discover**: browse people filtered by gender preference, age range, and distance
- **Like or pass**: a match is made when two people like each other, with a match pop-up
- **Liked You**: see who has already liked you
- **Real-time chat**: instant messages, typing indicators, read receipts, and emoji reactions (Socket.IO)
- **Unread badges & notifications**: unread message counts and local notifications on Android
- **Date or Friend mode**: say whether you're looking for a date or someone to watch films with
- **Inclusive identity options**: multiple gender identities and sexual orientations
- **Safe sign-up**: age is worked out from your birthday (18+ only), and passwords must be strong
- **Light & dark mode**
- **Android app** with location and notification permissions

---

## 🛠 Tech Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 14 (App Router, static export), React 18, TypeScript, Tailwind CSS, Lucide icons |
| Mobile | Capacitor 8 (Android) |
| Backend | Node.js, Express, TypeScript, Socket.IO |
| Database | PostgreSQL (Supabase) with Prisma ORM |
| Storage | Supabase Storage for profile photos |
| Auth | JWT + bcrypt |
| Film data | [TMDB API](https://www.themoviedb.org/) |

---

## 📁 Project Structure

```
matchflix/
├── backend/            # Express API + Socket.IO server
│   ├── prisma/         # Database schema and migrations
│   └── src/
│       ├── controllers/
│       ├── routes/     # auth, profile, users, matches, messages, passes
│       ├── socket/     # real-time chat
│       └── utils/
├── frontend/           # Next.js app
│   ├── android/        # Capacitor Android project
│   └── src/
│       ├── app/        # pages: discover, matches, messages, liked-you, login, register…
│       ├── components/
│       └── lib/        # API client, socket, notifications
└── package.json        # npm workspaces
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- A PostgreSQL database (for example a free [Supabase](https://supabase.com/) project)
- A Supabase Storage bucket for photos
- *(For Android)* Android Studio with JDK 21

### 1. Clone and install

```bash
git clone https://github.com/sharkspin06/matchflix.git
cd matchflix
npm install
```

### 2. Set up environment variables

**`backend/.env`** (copy from `backend/.env.example`)

```env
DATABASE_URL="postgresql://username:password@host:5432/matchflix"
JWT_SECRET="a-long-random-secret"
PORT=5001
NODE_ENV=development

SUPABASE_URL="https://your-project-ref.supabase.co"
SUPABASE_SECRET_KEY="sb_secret_your-secret-key"
```

**`frontend/.env.local`** (copy from `frontend/.env.local.example`)

```env
NEXT_PUBLIC_API_URL=http://localhost:5001
NEXT_PUBLIC_SOCKET_URL=http://localhost:5001
```

### 3. Set up the database

```bash
cd backend
npx prisma migrate deploy
npx prisma generate
cd ..
```

### 4. Run it

```bash
npm run dev
```

This starts both apps:

- Frontend: http://localhost:3000
- Backend: http://localhost:5001

---

## 📱 Android App

```bash
cd frontend
npm run build:android   # builds the app and syncs it into the Android project
npm run open:android    # opens it in Android Studio
```

By default, the Android build talks to `http://10.0.2.2:5001`, which is your computer as seen from the Android emulator. To test on a real phone, use your computer's local IP address:

```bash
ANDROID_API_URL=http://192.168.1.10:5001 npm run build:android
```

---

## 🔌 API Overview

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Create an account |
| POST | `/api/auth/login` | Log in |
| GET | `/api/auth/check-email` | Check if an email is taken |
| GET / PUT | `/api/profile` | Get or update your profile |
| POST | `/api/profile/photos` | Add a photo |
| DELETE | `/api/profile/photo` | Remove a photo |
| GET | `/api/users/discover` | Get people to discover |
| POST | `/api/matches/like/:userId` | Like someone |
| POST | `/api/matches/pass/:userId` | Pass on someone |
| GET | `/api/matches` | Your matches |
| GET | `/api/matches/received` | People who liked you |
| GET | `/api/messages/conversations` | Your conversations |
| GET | `/api/messages/unread/count` | Unread message count |

**Socket events:** `join_match`, `send_message`, `typing`, `mark_read`, `react_message`

---

## 📜 Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Run frontend and backend together |
| `npm run build` | Build both apps |
| `npm run start` | Start the backend in production mode |
| `npm run prisma:studio --workspace=backend` | Browse the database in Prisma Studio |

---

## 👤 Author

Made with 🍿 by **[sharkspin06](https://github.com/sharkspin06)**
