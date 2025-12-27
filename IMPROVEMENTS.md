# 🚀 Virtual Games - Improvement Roadmap

Here is a prioritized list of features and improvements to elevate the game to the next level.

## 1️⃣ Gameplay Enhancements (Fun Factor)
- [ ] **Sound Effects & Music**: Add audio feedback for key events:
    - *Timer Ticking* (last 10s suspense)
    - *Correct Guess* (Ding!)
    - *Turn Start/End*
    - *Background Music* (Chill Lo-Fi for drawing, upbeat for Rebus)
- [ ] **Advanced Drawing Tools** (Draw & Guess):
    - *Fill/Bucket Tool* (Essential for fast coloring)
    - *Undo/Redo* Actions
    - *Eraser* (separate form white color)
    - *Brush Size Slider* (instead of fixed presets)
- [ ] **Game Modes**:
    - *Team Battle*: 2v2 or 3v3. One draws, team guesses.
    - *Hardcore Mode*: No hints, shorter times.
    - *Daily Challenge*: Everyone gets the same 5 Rebus puzzles for the day. Global daily leaderboard.

## 2️⃣ User Experience (UX) & Polish
- [ ] **Visual Juiciness**:
    - *Confetti Explosion* when a player wins or guesses correctly.
    - *Shake Effect* on the timer when running low.
    - *Smooth Transitions* between lobby/game/round screens.
- [ ] **Avatars**: Allow users to pick an emoji or generated avatar to represent them in the lobby and leaderboard.
- [ ] **Lobby Chat**: Allow chatting before the game starts.
- [ ] **Spectator View**: Better UI for those joining late (just watching) without masking the answer if they can't play.

## 3️⃣ Infrastructure & Tech
- [ ] **Persistent Stats**: Integrate a database (Supabase/Postgres) to save user stats permanently (Wins, High Scores) across sessions.
- [ ] **User Accounts**: Simple auth (Google/Designated Guest ID) to track history.
- [ ] **Reconnect Handling**: robust handling if a socket disconnects briefly (allow 30s window to rejoin same seat).

## 4️⃣ Content Expansion
- [ ] **More Rebus Puzzles**: Expand the library from ~30 to 100+ to avoid repeats.
- [ ] **Custom Word Lists**: Allow hosts to input their own words/themes for Draw & Guess (great for office parties/classrooms).
