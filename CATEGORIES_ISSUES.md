# Categories Game - Known Issues & Fixes

## Issue: Game stuck on "Setting up game..."

### Root Cause
The socket event `categories:create_session` is not being triggered or the session is not being stored properly.

### Debug Steps
1. Check browser console for errors
2. Check if user is logged in (user.playerId must exist)
3. Verify socket connection is established
4. Check server logs for `[Categories] Creating session` message

### Temporary Workaround
The game requires a complete restart of the development server to clear any stale sessions.

## Recommended Fix
Implement a more robust session management system with:
1. Database persistence for sessions
2. Session recovery on page reload
3. Better error handling and user feedback
4. Player list showing who joined
5. Invite/share functionality

## Status
🔧 In Progress - Investigating socket event handling
