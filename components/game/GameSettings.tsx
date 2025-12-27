import React, { useState } from 'react';

interface GameSettingsProps {
    isHost: boolean;
    duration: number;
    setDuration: (val: number) => void;
    turnTime: number;
    setTurnTime: (val: number) => void;
    hardcore: boolean;
    setHardcore: (val: boolean) => void;
    teamMode: boolean;
    setTeamMode: (val: boolean) => void;
    videoEnabled?: boolean;
    setVideoEnabled?: (val: boolean) => void;
    onStart: () => void;
    isPlaying?: boolean;
    players?: any[]; // For team selection
    gameType?: 'draw' | 'rebus' | 'charades'; // To show correct rules
    setTeamConfig?: (config: any) => void; // Store manual team config
    teamConfig?: any; // Persist config
    onUpdateSettings?: (settings: any) => void;
}

export default function GameSettings({
    isHost, duration, setDuration, turnTime, setTurnTime,
    hardcore, setHardcore, teamMode, setTeamMode,
    videoEnabled = false, setVideoEnabled,
    onStart, isPlaying, players = [], gameType = 'draw', setTeamConfig, teamConfig, onUpdateSettings
}: GameSettingsProps) {
    if (!isHost) return null;

    // Logic for Start


    return (
        <div style={{ marginTop: 'auto', background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '12px', backdropFilter: 'blur(10px)' }}>
            <h3 style={{ marginBottom: '15px' }}>Game Settings</h3>

            {/* Settings removed - handled in Lobby */}
            {isPlaying && <div style={{ textAlign: 'center', opacity: 0.6, fontSize: '0.9rem' }}>Game in progress</div>}

            {!isPlaying && (
                <button onClick={onStart} className="btn-primary" style={{ width: '100%' }}>Start Game</button>
            )}

        </div>
    );
}
