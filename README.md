# Noob Skater

A multiplayer skateboarding game with Supabase server discovery.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up Supabase:
   - Create a new project at [Supabase](https://supabase.com)
   - Create a new table called `game_servers` with the following schema:

```sql
create table game_servers (
  id uuid default gen_random_uuid() primary key,
  host_peer_id text not null,
  server_code text not null,
  player_count integer not null default 1,
  created_at timestamp with time zone default now() not null
);

-- Add an index on the host_peer_id for faster lookups
create index game_servers_host_peer_id_idx on game_servers (host_peer_id);
```

3. Update the Supabase configuration:
   - Open `src/supabase.ts`
   - Replace `YOUR_SUPABASE_URL` with your project URL (found in Project Settings > API)
   - Replace `YOUR_SUPABASE_ANON_KEY` with your anon/public key (found in Project Settings > API)

## Development

Start the development server:

```bash
npm run dev
```

## Building for Production

```bash
npm run build
```

## Features

- P2P multiplayer using PeerJS
- Server discovery via Supabase
- Automatic server listing and joining
- Real-time player count updates
- Automatic cleanup of disconnected servers 