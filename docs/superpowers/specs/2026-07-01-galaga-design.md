# Galaga Online — Design Spec

**Date:** 2026-07-01
**Stack:** Phaser + Colyseus + TypeScript (monorepo)

---

## Overview

A browser-based multiplayer Galaga game supporting up to 8 players, with both collaborative and competitive modes. The visual style is classic arcade pixel art with a retro CRT aesthetic. Players can create private rooms with codes or join public matchmaking. Accounts are optional — unauthenticated players appear as "Anonymous."

---

## Architecture

Two packages in an npm workspace monorepo, sharing a third `shared` package for Colyseus schemas and TypeScript types.

```
galaga/
├── client/       # Phaser 3 + TypeScript, built with Vite
├── server/       # Colyseus + Express + Node.js + TypeScript
├── shared/       # Colyseus Schema classes + shared enums/types
└── package.json  # Workspace root
```

The server owns all authoritative game state. The client renders state and sends input events only — it never calculates game logic. This prevents cheating and creates a clean boundary for two developers to split work.

---

## Game Modes

### Collaborative Modes

Players choose one sub-type in the lobby before the match:

| Sub-type | Description |
|----------|-------------|
| **Shared Lives** | One life pool for the whole team. Team dies when the pool hits zero. |
| **Independent Lives + Shared Score** | Each player has their own lives; all kills contribute to one combined score/wave goal. |
| **Role Specialization** | Players pick a role: Shooter (standard), Shield (absorbs enemy fire, reduced attack), Bomber (slow fire, area damage). At least one of each role must be filled before the game can start; additional players beyond the first three default to Shooter. |

### Competitive Modes

Players choose one sub-type in the lobby before the match:

| Sub-type | Description |
|----------|-------------|
| **Score Race** | Same waves for all players; highest score at wave end wins. |
| **Last Ship Standing** | Friendly fire enabled; shoot enemies and other players; last ship alive wins. |
| **Territory** | The arena is divided into vertical scoring zones; kills in your zone score for you; players can move and shoot freely anywhere on screen — zones are scoring-only, not movement restrictions. |

### Scene Scaling

The game world always fills the player's screen (fullscreen). As more players join, the camera zooms out to reveal a larger battlefield. Enemy count and spread increase proportionally. Players move freely across the entire screen — no lanes or zones.

---

## Accounts & Leaderboards

**Auth:**
- Register with email + password, or log in to an existing account
- Players who skip login get an anonymous session and appear as "Anonymous" in-game and on leaderboards
- JWT-based sessions stored in localStorage; server validates on every connection

**Leaderboard:**
- Global persistent leaderboard in the database
- Tracked fields: player name, score, mode, sub-type, player count, date
- Separate views per mode (co-op vs competitive) and per sub-type
- Top 10 on the main menu; full leaderboard on a dedicated screen

**Account page (logged-in users only):**
- Personal best scores per mode
- Total games played, total enemies destroyed
- Username change

---

## Matchmaking & Lobby

**Private rooms:**
- Host creates a room and receives a 6-character code (e.g. `GAL-4X2`)
- Host selects mode (co-op or competitive) and sub-type before sharing the code
- Friends join by entering the code on the main menu
- Host can start with any number of joined players (min 1, max 8)
- Host can kick players

**Public matchmaking:**
- Players queue for co-op or competitive
- Room fills up to 8 players; starts when full or after a 30-second timeout
- Sub-type voted on in lobby; most votes wins, random tiebreak

**Lobby screen (both room types):**
- Connected players list: username or "Anonymous", ping, chosen role (co-op only)
- Countdown timer
- Pre-game chat box

---

## Technical Design

### Client — Phaser 3 + TypeScript + Vite

**Scene flow:** `BootScene` → `MenuScene` → `LobbyScene` → `GameScene` → `GameOverScene`

- `GameScene` listens to Colyseus state patches and re-renders; contains no game logic
- Input (keyboard) captured locally, sent to server as input events — server moves ships, client draws them
- Pixel art sprites in a single spritesheet; CRT scanline post-processing shader; screen shake and particle effects for hits and explosions
- Camera zooms out smoothly as players join, scaling Phaser world bounds dynamically

### Server — Colyseus + Express + Node.js + TypeScript

- Single `GalagaRoom` Colyseus room class handles all session types; mode config passed at room creation
- Fixed-timestep game loop at 60 ticks/sec: enemy AI, collision detection, bullet physics, scoring — all server-side
- Colyseus state patches broadcast automatically to all clients each tick
- REST endpoints via Express (same process): `/auth/register`, `/auth/login`, `/leaderboard`, `/account`
- SQLite via Prisma for accounts and leaderboard; designed to migrate to Postgres with minimal changes

### Shared Package

Imported by both client and server — the contract between the two developers:

- **Colyseus Schema classes:** `GameState`, `PlayerState`, `EnemyState`, `BulletState`
- **TypeScript enums/types:** `GameMode`, `CoopSubtype`, `CompetitiveSubtype`, `PlayerRole`

---

## Data Models

### User
```
id, email, passwordHash, username, createdAt
```

### LeaderboardEntry
```
id, userId (nullable), displayName, score, gameMode, subType, playerCount, playedAt
```

---

## Key Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Game framework | Phaser 3 | Battle-tested, great pixel art support, scene management built-in |
| Multiplayer | Colyseus | Enforced typed client/server boundary; ideal for two-dev split |
| Language | TypeScript throughout | Shared schemas act as a typed contract; catches bugs early |
| State authority | Server-authoritative | Prevents cheating; all collision/scoring logic server-side |
| Database | SQLite + Prisma | Simple local dev; Prisma makes Postgres migration straightforward |
| Auth | JWT + localStorage | Stateless, simple, sufficient for this scope |
