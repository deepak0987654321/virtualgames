# WebRTC Implementation Plan for VirtualGames

## 1. Overview
Real-time video and audio communication using WebRTC Mesh architecture with Socket.io signaling.

## 2. Database Schema Changes

### `rooms` Table
- `video_enabled` (BOOLEAN, default 0)
- `audio_enabled` (BOOLEAN, default 0)
- `required_mode` (TEXT: 'none' | 'audio' | 'video_audio', default 'none')

### `users` Table
- `video_status` (BOOLEAN, default 0) - Last known preference
- `audio_status` (BOOLEAN, default 0) - Last known preference
- `hardware_available` (BOOLEAN, default 0)

## 3. Signaling Implementation (Socket.io)

### Events
- `join_video_room`: User joins the media channel.
- `user_connected_video`: Notify others in room.
- `offer`: WebRTC offer from Peer A to Peer B.
- `answer`: WebRTC answer from Peer B to Peer A.
- `ice_candidate`: ICE candidates exchange.
- `media_toggle`: User muted/unmuted video/audio.

## 4. Frontend Architecture

### `hooks/useWebRTC.ts`
- Manages local stream.
- Manages `RTCPeerConnection` pool (Mesh topology).
- Handles signaling events.

### Components
- `VideoGrid.tsx`: Grid layout of `VideoTile` components.
- `VideoTile.tsx`: Individual player video/avatar fallback.
- `VideoControls.tsx`: Mute/Unmute/Camera toggle buttons.

## 5. Security & Permissions
- Room settings dictate allowed media types.
- Encryption: WebRTC uses DTLS/SRTP by default.
- Host Controls: Host can emit `force_mute` event to server, which server propagates to target client to stop tracking.

## 6. Test Plan
1.  **2 Users**: Basic P2P connection. Verify Video/Audio flow.
2.  **3-5 Users**: Mesh connectivity. Verify all peers see each other.
3.  **Reconnect**: Refresh page and rejoin.
4.  **Permissions**: Host mutes user -> User stream stops.

## 7. TURN/STUN
- Use public STUN servers (Google/Mozilla) for development.
- For production, a TURN server (e.g., coturn) is recommended if behind symmetric NATs.

```typescript
// STUN Config
const rtcConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' }
    ]
};
```
