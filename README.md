# Iskra Studio 💥

**Iskra Studio** is an AI image and video generator that is designed for quick exploration. The word 'iskra' means 'spark' in Slovak. With just one click, it creates different camera angles, styles, characters, lighting, emotions and storylines based on the reference image = no prompts needed!

## Key Features

- **AI Generation**: Generate high-quality images and videos using fal.ai and BRIA APIs.
- **Infinite Canvas**: Organize your assets on a drag-and-drop canvas powered by Konva.
- **Project Management**: Save and manage multiple projects with auto-saving capabilities.
- **User Authentication**: Secure sign-up and login via Clerk.
- **Subscription System**: Tiered access (Free, Pro) managed by Polar.
- **Asset Management**: Upload, store, and manage media assets with Convex storage.

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Database & Backend**: [Convex](https://convex.dev/)
- **Authentication**: [Clerk](https://clerk.com/)
- **AI Tools**: [fal.ai](https://fal.ai/), [BRIA](https://bria.ai/)
- **Canvas**: [Konva](https://konvajs.org/) / [React Konva](https://konvajs.org/docs/react/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/), [Radix UI](https://www.radix-ui.com/)
- **Payments**: [Polar](https://polar.sh/)
- **Rate Limiting**: [Upstash](https://upstash.com/)

## Getting Started

### Prerequisites

- Node.js (v18+) or Bun
- npm or bun

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
   - **fal.ai**: Add your API key for AI generation.
   - **BRIA**: Add your API token for additional image features.
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

## FIBO Model Integration

Iskra Studio uses the **BRIA FIBO** (Foundation Image-to-Image Base Orchestrator) model for intelligent image analysis and variation generation. FIBO provides structured understanding of images, enabling contextually-aware transformations.

### How FIBO Works

1. **Image Analysis**: When generating variations, FIBO analyzes the source image to extract a structured prompt containing:
   - Scene composition and subject matter
   - Lighting conditions and direction
   - Color palette and mood/atmosphere
   - Photographic characteristics (focal length, depth of field)
   - Artistic style and visual aesthetics

2. **Prompt Refinement**: The structured FIBO analysis is refined with variation-specific instructions:
   - **Director Mode**: Applies cinematic styles (e.g., "Make it look as if shot by Christopher Nolan")
   - **Camera Angle Mode**: Applies perspective changes (e.g., "Re-render from a low angle")

3. **Style Preservation**: A "Vibe Lock" constraint ensures the original image's color grading, lighting mood, and visual continuity are preserved across all variations.

### Key Components

| Component | Location | Purpose |
|-----------|----------|---------|
| FIBO Constants | `src/constants/fibo.ts` | Timeout and generation parameters |
| Image Analyzer | `src/lib/services/fibo-image-analyzer.ts` | Analyzes images via BRIA API |
| Variation Service | `src/lib/services/fibo-variation-service.ts` | Generates refined prompts |
| Analysis Adapter | `src/lib/adapters/fibo-to-analysis-adapter.ts` | Transforms FIBO output to internal schema |
| Variation Handler | `src/lib/handlers/unified-image-variation-handler.ts` | Orchestrates the full workflow |

### Variation Types

- **Director Variations**: Applies famous director/cinematographer visual styles
- **Camera Angle Variations**: Changes perspective using predefined camera directives from `src/constants/camera-variations.ts`

### Configuration

FIBO analysis can be toggled via the `isFiboAnalysisEnabled` flag in the variation handler. When disabled, the system falls back to direct prompt-based generation.

## Project Structure

```
├── convex/              # Convex backend (schema, mutations, queries)
├── public/              # Static assets
├── src/
│   ├── app/             # Next.js App Router pages and layouts
│   ├── components/      # Reusable UI components (canvas, auth, layout)
│   ├── constants/       # Configuration constants (FIBO, camera variations)
│   ├── features/        # Feature-specific logic (generation)
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Core libraries
│   │   ├── adapters/    # Data transformation adapters
│   │   ├── api/         # API helpers and variation handlers
│   │   ├── handlers/    # Business logic handlers
│   │   └── services/    # External service integrations (FIBO, BRIA)
│   ├── providers/       # React context providers
│   ├── server/          # Server-side utilities
│   ├── store/           # Jotai atoms for global state
│   ├── types/           # TypeScript type definitions
│   └── utils/           # Utility functions
└── tasks/               # PRD and task documentation
```
