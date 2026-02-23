# Tars Chat - Real-time Messaging App

A full-featured real-time chat application built for the Tars Full Stack Engineer Internship Coding Challenge 2026.

## Tech Stack

- **Frontend:** Next.js 16 (App Router) + TypeScript
- **Backend/Database:** Convex (real-time subscriptions)
- **Authentication:** Clerk
- **Styling:** Tailwind CSS + shadcn/ui

## Features

### Core Features (1-10)
1. **Authentication** - Sign up/in with email or social login via Clerk, user profiles stored in Convex
2. **User List & Search** - Browse all users, search by name, click to start a conversation
3. **One-on-One DMs** - Real-time private messaging with Convex subscriptions
4. **Message Timestamps** - Smart formatting: time only for today, date+time for older, year for different year
5. **Empty States** - Helpful messages for no conversations, no messages, no search results
6. **Responsive Layout** - Desktop sidebar+chat, mobile full-screen views with back navigation
7. **Online/Offline Status** - Green indicator for online users, updates in real-time
8. **Typing Indicator** - "User is typing..." with animated dots, auto-clears after 2s
9. **Unread Message Count** - Badge on conversations, clears when opened
10. **Smart Auto-Scroll** - Auto-scrolls for new messages, "New messages" button when scrolled up

### Bonus Features (11-14)
11. **Delete Own Messages** - Soft delete with "This message was deleted" placeholder
12. **Message Reactions** - React with 👍 ❤️ 😂 😮 😢, toggle on/off, shows counts
13. **Loading & Error States** - Skeleton loaders, error banners with retry for failed messages
14. **Group Chat** - Create groups with name and multiple members

## Getting Started

### Prerequisites
- Node.js 18+
- A [Convex](https://convex.dev) account (free)
- A [Clerk](https://clerk.com) account (free)

### Setup

1. **Clone the repository:**
   ```bash
   git clone <repo-url>
   cd TarsAssingment
   npm install
   ```

2. **Set up Clerk:**
   - Create a new application at [clerk.com](https://clerk.com)
   - Enable Email and/or Social login providers
   - Copy your publishable key and secret key

3. **Set up Convex:**
   ```bash
   npx convex dev
   ```
   - This will prompt you to log in and create a project
   - It will create a `.env.local` with `CONVEX_DEPLOYMENT` and `NEXT_PUBLIC_CONVEX_URL`

4. **Configure environment variables:**
   Update `.env.local` with your Clerk keys:
   ```
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   ```

5. **Set Clerk Issuer URL in Convex Dashboard:**
   - Go to your Convex dashboard → Settings → Environment Variables
   - Add `CLERK_ISSUER_URL` = `https://your-clerk-domain.clerk.accounts.dev`
   - (Find this in Clerk Dashboard → API Keys → Issuer URL)

6. **Run the development server:**
   ```bash
   npm run dev
   ```
   This starts both the Next.js frontend and Convex backend.

### Deployment to Vercel

1. Push to GitHub
2. Import to Vercel
3. Add all environment variables from `.env.local` in Vercel's project settings
4. Deploy

## Project Structure

```
├── convex/                  # Backend (Convex)
│   ├── schema.ts           # Database schema
│   ├── users.ts            # User queries & mutations
│   ├── conversations.ts    # Conversation management
│   ├── messages.ts         # Message CRUD
│   ├── typing.ts           # Typing indicators
│   └── auth.config.ts      # Clerk auth configuration
├── src/
│   ├── app/
│   │   ├── layout.tsx      # Root layout with providers
│   │   ├── page.tsx        # Main chat page
│   │   ├── providers.tsx   # Clerk + Convex providers
│   │   ├── sign-in/        # Clerk sign-in page
│   │   └── sign-up/        # Clerk sign-up page
│   ├── components/
│   │   ├── chat/
│   │   │   ├── ChatLayout.tsx       # Main layout (sidebar + chat)
│   │   │   ├── Sidebar.tsx          # Conversation list & user search
│   │   │   ├── ChatArea.tsx         # Message view & input
│   │   │   └── CreateGroupDialog.tsx # Group creation modal
│   │   └── ui/             # shadcn/ui components
│   ├── hooks/
│   │   └── useStoreUser.ts # User sync & online status hooks
│   ├── lib/
│   │   └── utils.ts        # Utility functions (cn, formatMessageTime)
│   └── middleware.ts       # Clerk auth middleware
```

## Schema Design

- **users** - Clerk-synced profiles with online status
- **conversations** - Both DMs and groups with last message preview
- **conversationMembers** - Many-to-many with last read time for unread tracking
- **messages** - Content, soft-delete flag, reactions array
- **typingIndicators** - Ephemeral records with expiration timestamps
