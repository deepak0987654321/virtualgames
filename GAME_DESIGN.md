# Virtual Games - Game Design Document

## 1️⃣ GAME NAME IDEAS
1. Rebus Royale
2. Rebus Rush
3. Glyph Guess
4. Riddle Race
5. Symbol Solvers
6. PictoPlay
7. Mind Match
8. What's the Word?
9. Rebus Realm
10. Eye Say
11. Puzzle Pounce
12. Brainy Battle
13. Riddle Me This
14. Decipher Dash
15. Guess Quest

## 2️⃣ GAME CONCEPT SUMMARY
Rebus Royale is a fast-paced multiplayer web game where players compete to solve visual word puzzles (rebus puzzles). Players join a room using a unique code or create a new one. Once the game starts, a visual puzzle—using text position, size, orientation, and images—appears on screen. Players race to type the correct phrase into the chat. Points are awarded based on speed; the faster you solve it, the more points you get. The player with the most points after a set number of rounds is crowned the winner.

## 3️⃣ GAME OBJECTIVE
Decipher the visual clues to guess the hidden phrase before the time runs out and score more points than your opponents.

## 4️⃣ HOW TO PLAY — STEP BY STEP
1. **Join Room**: Enter your name and a room code, or create a new room.
2. **Lobby**: Wait for friends to join. Host clicks "Start Game".
3. **Round Starts**: A countdown begins.
4. **Puzzle Appears**: A visual riddle is shown (e.g., the word "STAND" under the letter "I").
5. **Guess Answer**: Type your guess in the chat box.
6. **Score Awarded**: If correct, you gain points and your answer is hidden from others.
7. **Next Puzzle**: After the timer or all players guess, the next round begins.

## 5️⃣ PUZZLE GENERATION FORMAT
Puzzles are text/symbol based.
**Format**:
- **Position**: words over/under/beside others.
- **Style**: Bold, Italic, Repeated, Reversed.
- **Content**: Words + Emojis.

### Example Puzzles (AI can generate these json objects)

1. **Puzzle**:
   ```
   STAND
   I
   ```
   **Answer**: I understand

2. **Puzzle**:
   ```
   VISION
   VISION
   ```
   **Answer**: Double vision

3. **Puzzle**:
   ```
   M
   I
   L
   L
   I
   O
   N
   ```
   **Answer**: One in a million

4. **Puzzle**:
   ```
   HISTORY
   HISTORY
   HISTORY
   ```
   **Answer**: History repeats itself

5. **Puzzle**:
   ```
   BAN ANA
   ```
   **Answer**: Banana split

6. **Puzzle**:
   ```
   TIMING TIMING TIMING
   ```
   **Answer**: Timing is everything

7. **Puzzle**:
   ```
   JOB
   ```
   (Written very small)
   **Answer**: Small job

8. **Puzzle**:
   ```
   CYCLE
   CYCLE
   CYCLE
   ```
   **Answer**: Tricycle

9. **Puzzle**:
   ```
   HEAD
   HEELS
   ```
   **Answer**: Head over heels

10. **Puzzle**:
    ```
    NOON GOOD
    ```
    **Answer**: Good afternoon

11. **Puzzle**:
    ```
    MAN
    BOARD
    ```
    **Answer**: Man overboard

12. **Puzzle**:
    ```
    MIN
    MIN
    ```
    **Answer**: Wait a minute (Weight on minute? No, just "Minute minute"? Maybe "Wait a minute") -> *Correction: "Two minutes" or similar. Let's use: "WAIT" written vertically.*
    **Puzzle**:
    ```
    W
    A
    I
    T
    ```
    **Answer**: Wait up (or just Vertical Wait)

13. **Puzzle**:
    ```
    T
    U
    O
    ```
    **Answer**: Inside out

14. **Puzzle**:
    ```
    ROOD
    ```
    **Answer**: Back door

15. **Puzzle**:
    ```
    P
    U
    M
    P
    ```
    **Answer**: Pump up

16. **Puzzle**:
    ```
    KNEE
    LIGHT
    ```
    **Answer**: Neon light (Knee on light)

17. **Puzzle**:
    ```
    ISSUE
    ISSUE
    ISSUE
    ISSUE
    ISSUE
    ISSUE
    ISSUE
    ISSUE
    ISSUE
    ISSUE
    ```
    **Answer**: Tennis shoes (Ten issues)

18. **Puzzle**:
    ```
    0
    M.D.
    Ph.D.
    B.S.
    ```
    **Answer**: Three degrees below zero

19. **Puzzle**:
    ```
    LEVEL
    ```
    (Written backwards)
    **Answer**: Split level? No, "Straight and level"? Actually "Level" is a palindrome.
    **Puzzle**:
    ```
    WOR
    LD
    ```
    **Answer**: Split world/World cracked? No.
    **Puzzle**:
    ```
    R
    O
    A
    D
    ```
    **Answer**: Cross road.

20. **Puzzle**:
    ```
    D ICE
    ```
    **Answer**: Paradise (Pair a dice - wait, needs two).
    **Puzzle**:
    ```
    DICE
    DICE
    ```
    **Answer**: Paradise

21. **Puzzle**:
    ```
    MIND
    MATTER
    ```
    **Answer**: Mind over matter

22. **Puzzle**:
    ```
    READING
    ```
    (Between two lines)
    **Answer**: Reading between the lines

23. **Puzzle**:
    ```
    BREAD
    ```
    (Written in cat shape? No text only).
    **Puzzle**:
    ```
    CAT
    ```
    (With '9' next to it)
    **Answer**: Nine lives

24. **Puzzle**:
    ```
    COVER
    ```
    (Written 4 times: COVER COVER COVER COVER)
    **Answer**: Discover (This cover? No). Four cover?
    **Puzzle**:
    ```
    DISC
    ```
    (Over 'VER')
    **Answer**: Discover

25. **Puzzle**:
    ```
    G GIVE GIVE GIVE GIVE G
    ```
    **Answer**: Forgive and forget (Four give and four get? No).
    **Puzzle**:
    ```
    GIVE GIVE GIVE GIVE
    GET GET GET GET
    ```
    **Answer**: Forgive and forget

26. **Puzzle**:
    ```
    ME
    QUIT
    ```
    (Me beside Quit?)
    **Answer**: Quit following me (if ME is after QUIT)

27. **Puzzle**:
    ```
    JACK
    BOX
    ```
    **Answer**: Jack in the box

28. **Puzzle**:
    ```
    YOUR PANTS
    ANTS
    ```
    **Answer**: Ants in your pants

29. **Puzzle**:
    ```
    B
    L
    O
    U
    S
    E
    ```
    **Answer**: See-through blouse? (If transparent).
    **Puzzle**:
    ```
    O_ER_T_O_
    ```
    **Answer**: Painless operation (Operation with no pain/pane? No).

30. **Puzzle**:
    ```
    ONCE
    TIME
    ```
    **Answer**: Once upon a time

## 6️⃣ GAME FLOW LOGIC
1. **Lobby**: Players join. Host settings (Round time: 30s, Rounds: 5).
2. **Start**: Host starts game.
3. **Turn Loop**:
   - Server selects random puzzle.
   - Timer starts (e.g. 30s).
   - Players guess.
   - **Correct Guess**: Player gets points (100 * (TimeLeft/TotalTime)). Player name turns green in list. Chat shows "Player guessed the word!".
   - **Wrong Guess**: Chat shows the guess (unless strict mode where close guesses are masked).
4. **End of Round**: Answer revealed. Leaderboard shown for 5s.
5. **Game Over**: Final podium + Celebration. Back to Lobby.

## 7️⃣ GAME RULES
- Don't spam the chat.
- Don't share answers in external calls.
- First to guess gets the most points.
- Spelling counts!

## 8️⃣ SCORING SYSTEM
- **Base Score**: 100 points.
- **Time Factor**: Points = Floor(Base * (TimeLeft / RoundTime)).
- **Streak Bonus**: +10 points for 3 correct in a row.
- **First Bonus**: +50 points for being first in the round.

## 9️⃣ MULTIPLAYER ROOM SYSTEM
- **Room Code**: 4-letter random code (e.g., A7X2).
- **Limit**: 10 players max.
- **Spectator**: Join active game -> auto-spectate until next round or just watch.
- **Reconnect**: Allow rejoin with same name/session ID if within 1 min (optional MVP).

## 🔟 CHAT + GUESSING FILTER
- **Correct Filter**: If guess == answer, block message, show "Guessed proper! (+Pts)" to everyone.
- **Close Guess**: If Levenshtein distance < 2, show "You are close!".

## 1️⃣1️⃣ TIMER + ROUND MECHANICS
- Default 30s per puzzle.
- If everyone guesses, round ends early.
- Overtime? No, speed is key.

## 1️⃣2️⃣ USER INTERFACE LAYOUT
- **Web/Mobile**: Responsive.
- **Top**: Progress Bar (Round X/Y), Score of top players.
- **Center**: The Puzzle Canvas. Large, clear typography.
- **Bottom**: Chat/Guess Input.
- **Right (Desktop) / Drawer (Mobile)**: Leading Player List.
- **Style**: "Glassmorphism" - semi-transparent backgrounds, blurs, vibrant gradients (Purple/Blue/Pink).

## 1️⃣3️⃣ DATABASE STRUCTURE (Ephemeral/In-Memory for MVP or SQL)
- `Room`: { id, code, players: [], state, currentRound, config }
- `Player`: { id, name, score, avatar, socketId }
- `Message`: { player, text, type (chat/system) }

## 1️⃣4️⃣ API / BACKEND STRUCTURE
- **WebSockets** (Socket.io) are essential for this real-time speed.
- `connect`: Handshake.
- `join_room`: { name, roomCode }
- `submit_guess`: { guess }
- `game_event`: { type: 'new_round', data: puzzle }

## 1️⃣5️⃣ TECHNOLOGY RECOMMENDATIONS
- **Frontend**: Next.js (React) - Great for routing and UI.
- **Styling**: Vanilla CSS (CSS Modules) or Tailwind. *We will use Vanilla CSS for full custom control.*
- **Backend Service**: Custom Node.js server with Socket.io (Next.js custom server).
- **Deployment**: Vercel (requires serverless socket adaptors) or Railway/Render (better for stateful socket servers). *For this scratchpad, we run locally.*

## 1️⃣6️⃣ ANTI CHEAT PROTECTION
- Answers are **never** sent to the client until the round ends.
- Validation happens on server.
- Rate limit guesses (1 per 500ms).

## 1️⃣7️⃣ EXPANSION FEATURES
- User drawing mode (classic Skribbl).
- Daily rebus puzzle.
- Team mode.
