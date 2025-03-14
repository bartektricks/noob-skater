# Noob Skater

A multiplayer skateboarding game with Supabase server discovery built entirely with Cursor and Claude 3.7. Code is probably bad but I didn't write a single line of code just to see how will it handle building something semi complex by itself.

## Setup

1. Install dependencies:
```bash
bun install
```

2. Set up Supabase:
   - Create a new project at [Supabase](https://supabase.com)
   - Create a new table called `noob-skater-server-list` with the following schema:

```sql
create table "noob-skater-server-list" (
  id uuid default gen_random_uuid() primary key,
  server_name text not null,
  player_count integer default 1,
  created_at timestamp with time zone default now() not null
);
```

3. Configure environment variables:
   - Create or update the `.env` file in the project root with your Supabase credentials:

```
VITE_SUPABASE_URL=YOUR_SUPABASE_URL
VITE_SUPABASE_PUBLIC_KEY=YOUR_SUPABASE_ANON_KEY
PROJECT_ID=YOUR_PROJECT_ID
```

   - Replace `YOUR_SUPABASE_URL` with your project URL (found in Project Settings > API)
   - Replace `YOUR_SUPABASE_ANON_KEY` with your anon/public key (found in Project Settings > API)
   - Replace `YOUR_PROJECT_ID` with your Supabase project ID (found in Project Settings)

## Development

Start the development server:

```bash
bun run dev
```

## Generate Supabase Types

To generate TypeScript types for your Supabase tables:

```bash
bun run generate:types
```

## Building for Production

```bash
bun run build
```

For faster builds without type checking (use with caution):

```bash
bun run build:dangerous
```

## Preview Production Build

```bash
bun run preview
```

## Features

- P2P multiplayer using PeerJS
- Server discovery via Supabase
- Skateboarding physics simulation
- Real-time player interactions
- 3D graphics with Three.js
- Tailwind CSS for styling
- P2P chat for player communication

## Controls

- WASD/Arrow Keys: Move the skateboard
- Space: Jump
- E: Do a kickflip
- Escape: Toggle pause menu
- T: Toggle chat interface
- Enter: Send chat message when chat is open
