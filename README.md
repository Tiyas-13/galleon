# Galleon

A personal finance tracker with a Gryffindor soul. Track transactions, manage budgets, and watch your Galleons grow — with floating embers and all.

Built with Next.js, Firebase, and a touch of magic.

**Entirely vibe coded - the real magic?**

## Features

- **Transactions** — log income, expenses, and transfers across accounts
- **Overview** — charts and summaries of your spending - widget based
- **Budget** — set monthly budget groups by category with progress bars
- **Accounts** — view bank accounts, savings, cash, and credit cards (no connections needed)
- **Home page** — vault summary, rotating quotes, and a floating crest
- **Demo mode** — preview the app without signing in

## Stack

- [Next.js](https://nextjs.org/) 13 (App Router)
- [Firebase](https://firebase.google.com/) — Auth + Firestore
- [Vercel](https://vercel.com/) — hosting

## Getting started

### 1. Clone the repo

```bash
git clone https://github.com/Tiyas-13/galleon.git
cd galleon
npm install
```

### 2. Set up Firebase

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Email/Password** authentication
3. Create a **Firestore** database in production mode
4. Set Firestore security rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

5. Copy your Firebase config keys into `.env.local`:

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploying to Vercel

1. Push to GitHub
2. Import the repo at [vercel.com](https://vercel.com)
3. Add the same `NEXT_PUBLIC_FIREBASE_*` environment variables in Vercel's project settings
4. Deploy — every `git push` to `main` redeploys automatically
