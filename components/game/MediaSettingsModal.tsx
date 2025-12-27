import React, { useEffect, useState } from 'react';
import { Mic, Video, Volume2, X } from 'lucide-react';

interface MediaSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onDeviceChange: (kind: 'video' | 'audio', deviceId: string) => void;
}

export default function MediaSettingsModal({ isOpen, onClose, onDeviceChange }: MediaSettingsModalProps) {
    const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
    const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedAudio, setSelectedAudio] = useState('');
    const [selectedVideo, setSelectedVideo] = useState('');
    const [volume, setVolume] = useState(50); // Mock output volume

    useEffect(() => {
        if (isOpen) {
            navigator.mediaDevices.enumerateDevices().then(devices => {
                const audio = devices.filter(d => d.kind === 'audioinput');
                const video = devices.filter(d => d.kind === 'videoinput');
                setAudioDevices(audio);
                setVideoDevices(video);

                // Set defaults if not set
                if (audio.length > 0 && !selectedAudio) setSelectedAudio(audio[0].deviceId);
                if (video.length > 0 && !selectedVideo) setSelectedVideo(video[0].deviceId);
            });
        }
    }, [isOpen]);

    const handleAudioChange = (id: string) => {
        setSelectedAudio(id);
        onDeviceChange('audio', id);
    };

    const handleVideoChange = (id: string) => {
        setSelectedVideo(id);
        onDeviceChange('video', id);
    };

    if (!isOpen) return null;

    return (
        <div className="overlay-backdrop">
            <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '25px', position: 'relative' }}>
                <button
                    onClick={onClose}
                    style={{ position: 'absolute', top: 15, right: 15, background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                >
                    <X size={24} />
                </button>

                <h2 style={{ marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <SettingsIcon /> Media Settings
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                    {/* AUDIO INPUT */}
                    <div>
                        <label style={{ marginBottom: '8px', fontWeight: 'bold', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Mic size={16} /> Microphone
                        </label>
                        <select
                            value={selectedAudio}
                            onChange={(e) => handleAudioChange(e.target.value)}
                            className="input-field"
                            style={{ width: '100%' }}
                        >
                            {audioDevices.map(d => (
                                <option key={d.deviceId} value={d.deviceId}>
                                    {d.label || `Microphone ${d.deviceId.slice(0, 5)}...`}
                                </option>
                            ))}
                        </select>
                        <div style={{ marginTop: '5px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            Input Level (Visualizer Placeholder)
                        </div>
                        <div style={{ width: '100%', height: '4px', background: '#334155', borderRadius: '2px', marginTop: '5px' }}>
                            <div style={{ width: '60%', height: '100%', background: '#22c55e', borderRadius: '2px' }} />
                        </div>
                    </div>

                    {/* VIDEO INPUT */}
                    <div>
                        <label style={{ marginBottom: '8px', fontWeight: 'bold', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Video size={16} /> Camera
                        </label>
                         <select
                            value={selectedVideo}
                            onChange={(e) => handleVideoChange(e.target.value)}
                            className="input-field"
                            style={{ width: '100%' }}
                        >
                            {videoDevices.map(d => (
                                <option key={d.deviceId} value={d.deviceId}>
                                    {d.label || `Camera ${d.deviceId.slice(0, 5)}...`}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* OUTPUT VOLUME (Local only) */}
                    <div>
                         <label style={{ marginBottom: '8px', fontWeight: 'bold', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Volume2 size={16} /> Incoming Volume
                        </label>
                        <input
                            type="range"
                            min="0" max="100"
                            value={volume}
                            onChange={(e) => setVolume(Number(e.target.value))}
                            style={{ width: '100%', cursor: 'pointer' }}
                        />
                    </div>

                </div>

                <div style={{ marginTop: '30px', textAlign: 'right' }}>
                    <button className="btn-primary" onClick={onClose}>
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}

function SettingsIcon() {
    return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    )
}
