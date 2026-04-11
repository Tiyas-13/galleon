# Galleon

A personal finance tracker with a Gryffindor soul. Track transactions, manage budgets, and get AI-powered insights — with floating embers and all.

Built with Next.js, Firebase, and Claude. Entirely vibe coded - the real magic?

[https://galleon-three.vercel.app/](https://galleon-three.vercel.app/)

## Features

### Core
- **Transactions** — log income, expenses, and transfers. Click any row to edit. Paginated, filterable, and fast
- **Split expenses** — paid for the group? Split by amount or equally (1/N), log only your share, and route the rest to a splits account. When someone pays you back, just transfer it back
- **Accounts** — track balances across checking, savings, cash, credit cards. Balances update automatically as you add transactions, and you can edit them inline at any time
- **Budget groups** — group categories under a monthly target. Progress bars, overspend alerts, and smart spend tracking that handles savings transfers and reversals correctly
- **Overview** — drag-and-drop widget grid. Add, remove, resize, and rearrange charts to build a dashboard that suits you. Layouts persist across sessions
- **Home** — vault summary, net worth, this month's snapshot, and rotating quotes that aren't all Harry Potter

### AI (✦ Assistant)
- **Natural language transactions** — describe a transaction in plain English from the floating ✦ button. It fills in the form, you confirm
- **Persistent chat** — a dedicated Assistant page with full conversation history saved to Firestore. The AI has context from past sessions, not just the current one
- **Vault analyser** — one tap for a full financial briefing. Balanced, specific, and aware of your personal context. Not just "you overspent" — actually useful
- **Personal context** — tell the AI about your life once (income, goals, perks, habits) and it factors it in across every response
- **Budget nudges** — after saving an expense, a notification drops in if you've crossed 75% of a budget group or gone over. Stays quiet when there's nothing worth saying

## Stack

- [Next.js](https://nextjs.org/) 13 (App Router)
- [Firebase](https://firebase.google.com/) — Auth + Firestore
- [Anthropic Claude](https://anthropic.com/) — Haiku via server-side API route
- [react-grid-layout](https://github.com/react-grid-layout/react-grid-layout) — widget grid
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
2. Enable **Google** authentication under Authentication → Sign-in method
3. Add your domain (e.g. `your-app.vercel.app`) under Authentication → Settings → Authorised domains
4. Create a **Firestore** database in production mode
5. Set Firestore security rules:

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

6. Copy your Firebase config and Anthropic (or any llm) API key into `.env.local`:

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
ANTHROPIC_API_KEY= #modify references if you use another name
```

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploying to Vercel

1. Push to GitHub
2. Import the repo at [vercel.com](https://vercel.com)
3. Add all environment variables (including `ANTHROPIC_API_KEY`) in Vercel's project settings
4. Deploy — every `git push` to `main` redeploys automatically
