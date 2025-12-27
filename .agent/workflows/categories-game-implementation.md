---
description: Implementation plan for Categories multiplayer game
---

# Categories Game Implementation Plan

## Game Overview
Multiplayer word game where players fill categories with words starting with a random letter.

## Phase 1: Database Schema & Backend Setup

### 1.1 Database Tables
Create new tables in `database/init.ts`:

```sql
-- Categories Game Sessions
CREATE TABLE IF NOT EXISTS categories_sessions (
    session_id TEXT PRIMARY KEY,
    room_code TEXT NOT NULL,
    host_id TEXT NOT NULL,
    total_rounds INTEGER NOT NULL,
    round_duration INTEGER NOT NULL,
    current_round INTEGER DEFAULT 0,
    status TEXT DEFAULT 'waiting', -- waiting, active, finished
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(host_id) REFERENCES users(id)
);

-- Categories Configuration
CREATE TABLE IF NOT EXISTS categories_config (
    config_id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    category_name TEXT NOT NULL,
    category_order INTEGER NOT NULL,
    FOREIGN KEY(session_id) REFERENCES categories_sessions(session_id)
);

-- Round Data
CREATE TABLE IF NOT EXISTS categories_rounds (
    round_id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    round_number INTEGER NOT NULL,
    letter TEXT NOT NULL,
    started_at TEXT,
    ended_at TEXT,
    FOREIGN KEY(session_id) REFERENCES categories_sessions(session_id)
);

-- Player Answers
CREATE TABLE IF NOT EXISTS categories_answers (
    answer_id TEXT PRIMARY KEY,
    round_id TEXT NOT NULL,
    player_id TEXT NOT NULL,
    category_name TEXT NOT NULL,
    answer TEXT,
    points_awarded INTEGER DEFAULT 0,
    is_unique BOOLEAN DEFAULT 0,
    submitted_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(round_id) REFERENCES categories_rounds(round_id),
    FOREIGN KEY(player_id) REFERENCES users(id)
);

-- Round Scores
CREATE TABLE IF NOT EXISTS categories_round_scores (
    score_id TEXT PRIMARY KEY,
    round_id TEXT NOT NULL,
    player_id TEXT NOT NULL,
    total_points INTEGER DEFAULT 0,
    is_winner BOOLEAN DEFAULT 0,
    FOREIGN KEY(round_id) REFERENCES categories_rounds(round_id),
    FOREIGN KEY(player_id) REFERENCES users(id)
);
```

### 1.2 Game Manager Extension
Extend `lib/GameManager.ts` to support Categories game type:

```typescript
interface CategoriesGameState {
    sessionId: string;
    categories: string[];
    totalRounds: number;
    roundDuration: number;
    currentRound: number;
    currentLetter: string | null;
    roundStartTime: number | null;
    playerAnswers: Map<string, Map<string, string>>; // playerId -> category -> answer
    roundScores: Map<string, number>;
}
```

## Phase 2: Game Logic Implementation

### 2.1 Create CategoriesGameManager
File: `lib/CategoriesGameManager.ts`

Key methods:
- `createSession(hostId, config)` - Initialize game session
- `startRound()` - Generate random letter, start timer
- `submitAnswer(playerId, category, answer)` - Store player input
- `endRound()` - Calculate scores, determine uniqueness
- `calculateScores(roundId)` - Scoring algorithm
- `getLeaderboard(sessionId)` - Aggregate scores

### 2.2 Scoring Algorithm
```typescript
function calculateRoundScores(roundId: string) {
    // 1. Get all answers for the round
    // 2. Group by category
    // 3. For each category:
    //    - Count occurrences of each answer
    //    - Assign 10 points if unique
    //    - Assign 5 points if duplicate
    //    - Assign 0 points if empty/invalid
    // 4. Sum category scores per player
    // 5. Update database
}
```

### 2.3 Letter Generation
```typescript
const AVAILABLE_LETTERS = 'ABCDEFGHIJKLMNOPRSTUVW'; // Exclude Q, X, Y, Z
function getRandomLetter(): string {
    return AVAILABLE_LETTERS[Math.floor(Math.random() * AVAILABLE_LETTERS.length)];
}
```

## Phase 3: WebSocket Events

### 3.1 Socket Events (server.ts)
```typescript
socket.on('categories:create_session', (config, callback))
socket.on('categories:start_game', ({ sessionId }))
socket.on('categories:submit_answer', ({ sessionId, category, answer }))
socket.on('categories:round_complete', ({ sessionId }))
```

### 3.2 Client Events
```typescript
socket.emit('categories:round_started', { letter, duration, roundNumber })
socket.emit('categories:answer_submitted', { playerId, category })
socket.emit('categories:round_ended', { scores, answers, winner })
socket.emit('categories:game_ended', { finalLeaderboard })
```

## Phase 4: Frontend Implementation

### 4.1 Lobby Page
File: `pages/categories/index.tsx`
- Game setup form (host)
- Category configuration
- Round settings
- Start game button

### 4.2 Game Room
File: `pages/categories/room/[roomCode].tsx`

Components needed:
- Letter display (large, prominent)
- Category input fields (dynamic based on config)
- Timer countdown
- Submit button
- Round results modal
- Final leaderboard

### 4.3 Components
Create in `components/categories/`:
- `CategoryInput.tsx` - Single category input field
- `LetterDisplay.tsx` - Current letter showcase
- `RoundResults.tsx` - Show all answers and scores
- `CategoriesSettings.tsx` - Host configuration panel

## Phase 5: API Endpoints

### 5.1 REST Endpoints
```typescript
POST /api/categories/session - Create new session
GET /api/categories/session/:id - Get session details
POST /api/categories/round/start - Start new round
POST /api/categories/round/end - End current round
GET /api/categories/leaderboard/:sessionId - Get scores
```

## Phase 6: Integration

### 6.1 Main Lobby Integration
Update `pages/index.tsx`:
- Add Categories game card
- Link to `/categories` lobby

### 6.2 Leaderboard Integration
Update `lib/LeaderboardStore.ts`:
- Add Categories game type
- Track game-specific stats

## Phase 7: Testing

### 7.1 Test Cases
1. Host creates game with 4 categories, 3 rounds
2. Multiple players join
3. Round starts, letter is 'D'
4. Players submit answers
5. Timer expires
6. Scores calculated correctly:
   - Unique answers get 10 points
   - Duplicate answers get 5 points
   - Empty answers get 0 points
7. Next round starts with new letter
8. Final leaderboard shows correct totals

### 7.2 Edge Cases
- Player disconnects mid-round
- Empty submissions
- Special characters in answers
- Case sensitivity
- Whitespace handling

## Implementation Order

1. ✅ Create database schema
2. ✅ Implement CategoriesGameManager
3. ✅ Add WebSocket events to server
4. ✅ Create lobby page
5. ✅ Create game room page
6. ✅ Build UI components
7. ✅ Integrate with existing systems
8. ✅ Test and debug

## Estimated Time
- Backend: 3-4 hours
- Frontend: 4-5 hours
- Integration & Testing: 2-3 hours
- Total: 9-12 hours

## Notes
- Reuse existing GameManager patterns
- Follow VirtualGames design system
- Ensure mobile responsiveness
- Add sound effects for round start/end
- Consider adding dictionary API for validation (optional)
