# Iskra Studio

Iskra Studio is a powerful AI-driven video generation and canvas editing platform. It leverages cutting-edge AI models to generate images and videos, allowing users to arrange, edit, and compose them on an infinite canvas.

## ✨ Key Features

- **AI Generation**: Generate high-quality images and videos using Fal.ai and Bria models.
- **Infinite Canvas**: Organize your assets on a drag-and-drop canvas powered by Konva.
- **Project Management**: Save and manage multiple projects with auto-saving capabilities.
- **User Authentication**: Secure sign-up and login via Clerk.
- **Subscription System**: Tiered access (Free, Pro) managed by Polar.
- **Asset Management**: Upload, store, and manage media assets with Convex storage.

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Database & Backend**: [Convex](https://convex.dev/)
- **Authentication**: [Clerk](https://clerk.com/)
- **AI Models**: [Fal.ai](https://fal.ai/), [Bria](https://bria.ai/)
- **Canvas**: [Konva](https://konvajs.org/) / [React Konva](https://konvajs.org/docs/react/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/), [Radix UI](https://www.radix-ui.com/)
- **Payments**: [Polar](https://polar.sh/)
- **Rate Limiting**: [Upstash](https://upstash.com/)

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+) or Bun
- npm or yarn or bun

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd iskra-studio
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   bun install
   ```

### Environment Setup

1. Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```

2. Fill in the required environment variables in `.env.local`:
   - **Convex**: Run `npx convex dev` to generate these automatically.
   - **Clerk**: Obtain keys from your Clerk dashboard.
   - **Fal.ai**: Add your API key for AI generation.
   - **Bria**: Add your API token for additional image features.
   - **Polar**: Configure for subscriptions (optional for dev).
   - **Upstash**: Configure for rate limiting (optional for dev).

### Running the App

1. Start the Convex backend (in a separate terminal):
   ```bash
   npx convex dev
   ```

2. Start the Next.js development server:
   ```bash
   npm run dev
   # or
   bun dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📂 Project Structure

- `src/app`: Next.js App Router pages and layouts.
- `src/components`: Reusable UI components.
- `src/features`: Feature-specific logic (e.g., generation).
- `src/hooks`: Custom React hooks.
- `convex`: Backend functions and database schema.
- `public`: Static assets.
