import { useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';

const STUN_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' }
    ]
};

export interface Peer {
    socketId: string;
    stream: MediaStream;
    isVideoEnabled: boolean;
    isAudioEnabled: boolean;
}

export const useWebRTC = (socket: Socket | null, roomCode: string, name: string, initialVideo: boolean = false, initialAudio: boolean = true) => {
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [peers, setPeers] = useState<Peer[]>([]);

    // Refs for state that doesn't trigger re-renders or needed inside callbacks
    const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
    const streamsRef = useRef<Map<string, MediaStream>>(new Map());
    const userMediaStatusRef = useRef<Map<string, {video: boolean, audio: boolean}>>(new Map()); // Track mute status

    const [permissionError, setPermissionError] = useState(false);
    const [isVideoEnabled, setIsVideoEnabled] = useState(initialVideo);
    const [isAudioEnabled, setIsAudioEnabled] = useState(initialAudio);

    useEffect(() => {
        if (!socket || !roomCode) return;

        // 1. Get Local Media
        const getMedia = async () => {
             if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                console.error("Media Devices API not available. Ensure you are using HTTPS or localhost.");
                setPermissionError(true);
                return;
            }

            try {
                // If initial video is false, ONLY request audio to avoid turning on camera light
                const constraints = { video: initialVideo, audio: initialAudio };

                // If BOTH are false, we do NOT request media yet.
                if(!initialVideo && !initialAudio) {
                    setIsVideoEnabled(false);
                    setIsAudioEnabled(false);
                    return;
                }

                const stream = await navigator.mediaDevices.getUserMedia(constraints);

                // Explicitly set track enabled state based on preferences
                // access tracks directly to ensure they match desired initial state
                if(stream.getVideoTracks().length > 0) {
                     stream.getVideoTracks()[0].enabled = initialVideo;
                }
                if(stream.getAudioTracks().length > 0) {
                     stream.getAudioTracks()[0].enabled = initialAudio;
                }

                setLocalStream(stream);
                // We set internal state to what we desired, as we have the tracks (or tried to)
                setIsVideoEnabled(initialVideo && stream.getVideoTracks().length > 0);
                setIsAudioEnabled(initialAudio && stream.getAudioTracks().length > 0);

            } catch (err) {
                console.warn("Media request failed, retrying with Audio Only...", err);
                try {
                    // Fallback to Audio Only if video failed
                    const stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
                    stream.getAudioTracks().forEach(t => t.enabled = initialAudio);

                    setLocalStream(stream);
                    setIsVideoEnabled(false);
                    setIsAudioEnabled(initialAudio);
                } catch (err2) {
                     console.error("Failed to get media", err2);
                     setPermissionError(true);
                }
            }
        };

        getMedia().then(() => {
             // Only broadcast initial state if it's ON. If OFF, defaults handle it.
             // We do this to ensure late joiners or peers know we have entered with camera ON.
             if(socket?.connected) {
                 if(initialVideo) socket.emit('toggle_media', { roomCode, kind: 'video', status: true });
                 if(initialAudio) socket.emit('toggle_media', { roomCode, kind: 'audio', status: true });
             }
        });

        return () => {
             localStream?.getTracks().forEach(t => t.stop());
             peersRef.current.forEach(pc => pc.close());
             peersRef.current.clear();
         };
    }, [socket, roomCode, initialVideo, initialAudio]);

    const candidatesQueue = useRef<Map<string, RTCIceCandidate[]>>(new Map());

    // Handle Signaling (Same as before)
    useEffect(() => {
        if (!socket) return;

        const createPeer = (targetId: string, initiator: boolean) => {
            if (peersRef.current.has(targetId)) return peersRef.current.get(targetId);

            const pc = new RTCPeerConnection(STUN_SERVERS);
            peersRef.current.set(targetId, pc);

            // Add local tracks IF available
            if (localStream) {
                localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
            }

            // On Ice Candidate
            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    socket.emit('signal', { targetId, signal: { type: 'candidate', candidate: event.candidate } });
                }
            };

            // On Remote Stream
            pc.ontrack = (event) => {
                const stream = event.streams[0];
                streamsRef.current.set(targetId, stream);
                updatePeersState();
            };

            // Negotiation Needed (for initiator)
            if (initiator) {
                pc.createOffer()
                    .then(offer => pc.setLocalDescription(offer))
                    .then(() => {
                        socket.emit('signal', { targetId, signal: { type: 'offer', sdp: pc.localDescription } });
                    });
            }

            return pc;
        };

        const processCandidateQueue = async (targetId: string, pc: RTCPeerConnection) => {
             const queue = candidatesQueue.current.get(targetId) || [];
             for (const candidate of queue) {
                 try {
                     await pc.addIceCandidate(candidate);
                 } catch (e) {
                     console.error("Error processing queued candidate", e);
                 }
             }
             candidatesQueue.current.delete(targetId);
        };

        // When a new user joins, we exchange "welcome" to handle discovery and prevent glare
        const handleUserJoined = ({ socketId }: any) => {
            if (!socket?.id) return;
            console.log("New User Joined Video:", socketId, "My ID:", socket.id);

            // 1. Announce presence to the new user (so they know 'Old' users exist)
            socket.emit('signal', { targetId: socketId, signal: { type: 'welcome' } });

            // 2. Deterministic Tie-Breaker: Only lower ID initiates
            if (socket.id < socketId) {
                console.log(`[Timer-Breaker] I (${socket.id}) am LOWER than ${socketId}. Initiating Offer.`);
                createPeer(socketId, true);
            } else {
                console.log(`[Tie-Breaker] I (${socket.id}) am HIGHER than ${socketId}. Waiting for offer.`);
            }
        };

        const handleSignal = async ({ senderId, signal }: any) => {
            if (signal.type === 'welcome') {
                console.log("Received WELCOME from:", senderId);
                // "old" user is saying hi.
                // If I am the lower ID, I should have initiated on 'join', but I might not have seen 'join' if I am the new one.
                // Or if it was simultaneous.

                // If I am Lower AND I haven't created a peer yet, Initiate.
                if (socket?.id && socket.id < senderId) {
                     if (!peersRef.current.has(senderId)) {
                         console.log(`[Welcome-Trigger] I (${socket.id}) am LOWER than ${senderId} and no PC exists. Initiating Offer.`);
                         createPeer(senderId, true);
                     } else {
                         console.log(`[Welcome-Trigger] Already have PC for ${senderId}. Ignoring.`);
                     }
                }
                return;
            }

            const pc = peersRef.current.get(senderId) || createPeer(senderId, false);
            if(!pc) return;

            if (signal.type === 'offer') {
                console.log("Received OFFER from:", senderId);
                // If we are getting an offer, we might have collisions, but standard mesh handles this by 'polite' peer or just accepting.
                // Reset queue for new offer?
                await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                socket.emit('signal', { targetId: senderId, signal: { type: 'answer', sdp: pc.localDescription } });

                // Process any queued candidates now that remote desc is set
                await processCandidateQueue(senderId, pc);
            }
            else if (signal.type === 'answer') {
                console.log("Received ANSWER from:", senderId);
                await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
                await processCandidateQueue(senderId, pc);
            }
            else if (signal.type === 'candidate') {
                const candidate = new RTCIceCandidate(signal.candidate);
                if (pc.remoteDescription) {
                    try {
                        await pc.addIceCandidate(candidate);
                    } catch(e) { console.error("Error adding candidate", e); }
                } else {
                    // Queue it
                    const q = candidatesQueue.current.get(senderId) || [];
                    q.push(candidate);
                    candidatesQueue.current.set(senderId, q);
                }
            }
        };

        const updatePeersState = () => {
             const newPeers: Peer[] = [];
             streamsRef.current.forEach((stream, socketId) => {
                 const status = userMediaStatusRef.current.get(socketId) || { video: true, audio: true };
                 newPeers.push({
                     socketId,
                     stream,
                     isVideoEnabled: status.video,
                     isAudioEnabled: status.audio
                 });
             });
             setPeers(newPeers);
        };

        const handlePeerMediaUpdate = ({ socketId, kind, status }: any) => {
             const existing = userMediaStatusRef.current.get(socketId) || { video: true, audio: true };
             if(kind === 'video') existing.video = status;
             if(kind === 'audio') existing.audio = status;
             userMediaStatusRef.current.set(socketId, existing);
             updatePeersState();
        };

        socket.on('user_joined_video', handleUserJoined);
        socket.on('signal', handleSignal);
        socket.on('peer_media_update', handlePeerMediaUpdate);

        // JOIN VIDEO NOW that listeners are ready
        socket.emit('join_video', { roomCode });

        return () => {
            socket.off('user_joined_video', handleUserJoined);
            socket.off('signal', handleSignal);
            socket.off('peer_media_update', handlePeerMediaUpdate);
        };
    }, [socket, localStream]);

    // Controls
    const toggleVideo = async () => {
        // CASE 1: LocalStream exists and HAS Video Track -> Turn it OFF (Stop Hardware)
        // We stop hardware to ensure the privacy light goes off.
        if(localStream) {
            const videoTrack = localStream.getVideoTracks()[0];
            if(videoTrack) {
                videoTrack.stop(); // Turn off camera light
                localStream.removeTrack(videoTrack); // Remove from stream so we know to re-request

                setIsVideoEnabled(false);
                socket?.emit('toggle_media', { roomCode, kind: 'video', status: false });

                // Force re-render with new stream reference (Audio only now)
                setLocalStream(new MediaStream(localStream.getTracks()));
                return;
            }
        }

        // CASE 2: No Video Track (Lazy Load) -> Turn it ON
        if (!isVideoEnabled) {
            try {
                const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
                const newVideoTrack = videoStream.getVideoTracks()[0];

                if(newVideoTrack) {
                   let updatedStream = localStream;
                   if (localStream) {
                        localStream.addTrack(newVideoTrack);
                        updatedStream = localStream;
                   } else {
                        updatedStream = new MediaStream([newVideoTrack]);
                   }

                   // New Reference
                   const newStreamRef = new MediaStream(updatedStream!.getTracks());
                   setLocalStream(newStreamRef);

                   // Add/Replace Track in Peer Connections
                   peersRef.current.forEach(async (pc, targetId) => {
                       const senders = pc.getSenders();
                       const videoSender = senders.find(s => s.track && s.track.kind === 'video');
                       if(videoSender) {
                           videoSender.replaceTrack(newVideoTrack).catch(e => console.error("Replace Track Error", e));
                       } else {
                           pc.addTrack(newVideoTrack, newStreamRef);
                           // Added a new track where none existed. MUST Renegotiate.
                           try {
                               const offer = await pc.createOffer();
                               await pc.setLocalDescription(offer);
                               socket?.emit('signal', { targetId, signal: { type: 'offer', sdp: pc.localDescription } });
                           } catch (err) {
                               console.error("Renegotiation failed", err);
                           }
                       }
                   });

                   setIsVideoEnabled(true);
                   socket?.emit('toggle_media', { roomCode, kind: 'video', status: true });
                }
            } catch(e) {
                console.error("Failed to enable video:", e);
                alert("Could not access camera.");
            }
        }
    };

    const toggleAudio = async () => {
         // CASE 1: LocalStream exists
         if(localStream) {
            const audioTrack = localStream.getAudioTracks()[0];
            if(audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsAudioEnabled(audioTrack.enabled);
                socket?.emit('toggle_media', { roomCode, kind: 'audio', status: audioTrack.enabled });
                setLocalStream(new MediaStream(localStream.getTracks()));
                return;
            }
        }

         // CASE 2: No Track or No Stream
         if (!isAudioEnabled) {
             try {
                const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const newAudioTrack = audioStream.getAudioTracks()[0];
                if(newAudioTrack) {
                   let updatedStream = localStream;
                   if (localStream) {
                        localStream.addTrack(newAudioTrack);
                        updatedStream = localStream;
                   } else {
                        updatedStream = new MediaStream([newAudioTrack]);
                   }

                   const newStreamRef = new MediaStream(updatedStream!.getTracks());
                   setLocalStream(newStreamRef);

                   peersRef.current.forEach(async (pc, targetId) => {
                       pc.addTrack(newAudioTrack, newStreamRef);
                       // Audio track added effectively requires renegotiation if it wasn't there
                        try {
                               const offer = await pc.createOffer();
                               await pc.setLocalDescription(offer);
                               socket?.emit('signal', { targetId, signal: { type: 'offer', sdp: pc.localDescription } });
                           } catch (err) {
                               console.error("Renegotiation audio failed", err);
                           }
                   });

                   setIsAudioEnabled(true);
                   socket?.emit('toggle_media', { roomCode, kind: 'audio', status: true });
                }
            } catch(e) {
                console.error("Failed to enable audio:", e);
            }
         }
    };

// Add deviceId state to hook
    const [selectedVideoDeviceId, setSelectedVideoDeviceId] = useState<string>('');
    const [selectedAudioDeviceId, setSelectedAudioDeviceId] = useState<string>('');

    // ... inside getMedia ...
    const constraints = {
        video: initialVideo ? {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            deviceId: selectedVideoDeviceId ? { exact: selectedVideoDeviceId } : undefined
        } : false,
        audio: initialAudio ? {
            deviceId: selectedAudioDeviceId ? { exact: selectedAudioDeviceId } : undefined
        } : true
    };

    // ...

    // New Function: Switch Device
    const switchDevice = async (kind: 'video' | 'audio', deviceId: string) => {
        if(kind === 'video') setSelectedVideoDeviceId(deviceId);
        if(kind === 'audio') setSelectedAudioDeviceId(deviceId);

        // We need to restart the stream with new constraints
        // Stop old tracks of that kind
        if (localStream) {
            if (kind === 'video') {
                localStream.getVideoTracks().forEach(t => t.stop());
                // ... re-request video with new deviceId ...
                // This logic is complex to inline.
                // A simpler way: Just call toggleVideo logic but with specific device?
                // Or better: Re-run getMedia-like logic for just that track.

                try {
                    const newStream = await navigator.mediaDevices.getUserMedia({
                        video: { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
                    });
                    const newTrack = newStream.getVideoTracks()[0];
                    if(newTrack) {
                        const oldTrack = localStream.getVideoTracks()[0];
                        localStream.removeTrack(oldTrack);
                        localStream.addTrack(newTrack);

                        // Replace in peers
                        peersRef.current.forEach(pc => {
                            const sender = pc.getSenders().find(s => s.track?.kind === 'video');
                            if(sender) sender.replaceTrack(newTrack);
                        });
                        setLocalStream(new MediaStream(localStream.getTracks())); // force render
                        setIsVideoEnabled(true);
                    }
                } catch(e) { console.error("Failed to switch video", e); }
            } else {
                 localStream.getAudioTracks().forEach(t => t.stop());
                 try {
                    const newStream = await navigator.mediaDevices.getUserMedia({
                        audio: { deviceId: { exact: deviceId } }
                    });
                    const newTrack = newStream.getAudioTracks()[0];
                    if(newTrack) {
                        const oldTrack = localStream.getAudioTracks()[0];
                        localStream.removeTrack(oldTrack);
                        localStream.addTrack(newTrack);

                        // Replace in peers
                        peersRef.current.forEach(pc => {
                            const sender = pc.getSenders().find(s => s.track?.kind === 'audio');
                            if(sender) sender.replaceTrack(newTrack);
                        });
                        setLocalStream(new MediaStream(localStream.getTracks()));
                        setIsAudioEnabled(true);
                    }
                } catch(e) { console.error("Failed to switch audio", e); }
            }
        }
    };

    return {
        localStream,
        peers,
        toggleVideo,
        toggleAudio,
        isVideoEnabled,
        isAudioEnabled,
        permissionError,
        switchDevice // Export this
    };
};
