import React, { ReactNode } from 'react';
import { Pencil, Video, Users, MessageSquare, Mic, MicOff, VideoOff, Settings, Shield } from 'lucide-react';
import GameHeader from './GameHeader';
import ChatBox from './ChatBox';
import PlayerList from './PlayerList';
import MediaSettingsModal from './MediaSettingsModal';

interface GameLayoutProps {
    // Header Data
    roomCode: string;
    timeLeft: number;
    headerCenter: ReactNode;

    // View State
    viewMode: 'game' | 'camera';
    setViewMode: (mode: 'game' | 'camera') => void;

    activeTab: 'players' | 'cameras' | 'chat' | null;
    setActiveTab: (tab: 'players' | 'cameras' | 'chat' | null) => void;

    // Media State
    isAudioEnabled: boolean;
    isVideoEnabled: boolean;
    toggleAudio: () => void;
    toggleVideo: () => void;

    // Data for Side Panels
    players: any[];
    currentDrawerId?: string;
    myId?: string;

    // Chat Data
    messages: any[];
    onSendMessage: (msg: string) => void;
    chatPlaceholder?: string;
    chatDisabled?: boolean;
    clearInputTrigger?: number; // Trigger to clear chat input

    // Components to render
    GameSettingsComponent: ReactNode;
    renderVideo: (props: { layout: 'grid' | 'list' }) => ReactNode;

    // Config
    mediaActive?: boolean; // If false, hide video tab and media controls
    forceVideoOn?: boolean; // If true, prevent disabling camera
    switchDevice?: (kind: 'video' | 'audio', deviceId: string) => void;

    // Main Game Content
    children: ReactNode;
    onOpenTeamSettings?: () => void;
}



export default function GameLayout({
    roomCode, timeLeft, headerCenter,
    viewMode, setViewMode, activeTab, setActiveTab,
    isAudioEnabled, isVideoEnabled, toggleAudio, toggleVideo, switchDevice,
    players, currentDrawerId, myId,
    messages, onSendMessage, chatPlaceholder, chatDisabled, clearInputTrigger,
    GameSettingsComponent, renderVideo, mediaActive = true, forceVideoOn = false, children,
    onOpenTeamSettings
}: GameLayoutProps) {
    const [showSettings, setShowSettings] = React.useState(false);

    return (
        <div className="container" style={{ maxHeight: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
           {/* HEADER (Sticky) */}
           <GameHeader roomCode={roomCode} timeLeft={timeLeft}>
               {headerCenter}
           </GameHeader>

           <div className="game-layout" style={{ height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'row', gap: '0' }}>

                {/* NAV BAR (Leftmost Fixed) */}
                <div style={{
                    width: '64px',
                    background: '#1e293b', // Slate 800
                    borderRight: '1px solid #334155',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '16px 8px',
                    alignItems: 'center',
                    gap: '24px',
                    flexShrink: 0,
                    zIndex: 50
                }}>

                    {/* SIDE PANELS CONTROLS (Main Nav) */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', marginTop: '10px', flex: 1 }}>
                        <button
                            title="Player List"
                            onClick={() => {
                                setActiveTab('players');
                                if (viewMode === 'camera') setViewMode('game');
                            }}
                            style={{
                                padding: '12px',
                                borderRadius: '12px',
                                background: activeTab === 'players' ? 'var(--primary)' : 'transparent',
                                border: 'none',
                                color: activeTab === 'players' ? 'white' : '#94a3b8',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            <Users size={24} />
                        </button>

                        {mediaActive && (
                            <button
                                title="Video Feeds"
                                onClick={() => setActiveTab('cameras')}
                                style={{
                                    padding: '12px',
                                    borderRadius: '12px',
                                    background: activeTab === 'cameras' ? 'var(--primary)' : 'transparent',
                                    border: 'none',
                                    color: activeTab === 'cameras' ? 'white' : '#94a3b8',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <Video size={24} />
                            </button>
                        )}
                    </div>

                    {/* MY MEDIA CONTROLS (Bottom) */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', paddingTop: '20px', borderTop: '1px solid #334155', width: '100%' }}>

                        {/* Team Settings (Host Only) */}
                        {onOpenTeamSettings && (
                             <button
                                title="Team Settings"
                                onClick={onOpenTeamSettings}
                                style={{
                                    padding: '10px',
                                    borderRadius: '50%',
                                    background: 'transparent',
                                    border: '1px solid #334155',
                                    color: 'var(--accent)',
                                    cursor: 'pointer'
                                }}
                            >
                                <Shield size={20} />
                            </button>
                        )}

                        {mediaActive && (
                            <>
                             <button
                                title={isAudioEnabled ? "Mute Mic" : "Unmute Mic"}
                                onClick={toggleAudio}
                                style={{
                                    padding: '10px',
                                    borderRadius: '50%',
                                    background: isAudioEnabled ? '#334155' : 'var(--error)',
                                    border: 'none',
                                    color: 'white',
                                    cursor: 'pointer'
                                }}
                            >
                                {isAudioEnabled ? <Mic size={20} /> : <MicOff size={20} />}
                            </button>

                             <button
                                title={forceVideoOn ? "Camera Mandatory for this Game" : (isVideoEnabled ? "Turn Off Camera" : "Turn On Camera")}
                                onClick={() => {
                                    if (forceVideoOn) return;
                                    toggleVideo();
                                }}
                                style={{
                                    padding: '10px',
                                    borderRadius: '50%',
                                    background: isVideoEnabled ? '#334155' : 'var(--error)',
                                    border: 'none',
                                    color: 'white',
                                    cursor: forceVideoOn ? 'not-allowed' : 'pointer',
                                    opacity: forceVideoOn && !isVideoEnabled ? 0.6 : 1
                                }}
                            >
                                {isVideoEnabled ? <Video size={20} /> : <VideoOff size={20} />}
                            </button>

                            <button
                                title="Media Settings"
                                onClick={() => setShowSettings(true)}
                                style={{ padding: '8px', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                            >
                                <Settings size={20} />
                            </button>
                            </>
                        )}
                    </div>
                </div>

                {/* LEFT SIDE PANEL (Toggleable Content) */}
                {/* Always render sidebar structure if activeTab is set (players or cameras) */}
                {activeTab && activeTab !== 'chat' && (
                    <div className="glass-panel sidebar open" style={{ width: '280px', display: 'flex', flexDirection: 'column', gap: '15px', overflowY: 'auto', borderLeft: 'none', borderRadius: '0', borderRight: '1px solid #334155', padding: '15px' }}>

                        {activeTab === 'cameras' && mediaActive && (
                             <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                 <h3 style={{ margin: '0 0 15px 0' }}>Live Feeds</h3>

                                 {/* EXPAND BUTTON */}
                                 <button
                                    onClick={() => setViewMode(viewMode === 'game' ? 'camera' : 'game')}
                                    className="btn-secondary"
                                    style={{
                                        width: '100%',
                                        marginBottom: '15px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        padding: '10px'
                                    }}
                                 >
                                     {viewMode === 'game' ? <><Video size={16}/> Expand to Grid</> : <><Pencil size={16}/> Back to Game</>}
                                 </button>

                                 {viewMode === 'game' ? (
                                    renderVideo({ layout: 'list' })
                                 ) : (
                                     <div style={{ textAlign: 'center', padding: '20px', opacity: 0.5, fontSize: '0.9rem' }}>
                                         Viewing Full Grid
                                     </div>
                                 )}
                             </div>
                        )}

                        {activeTab === 'players' && (
                            <>
                            <h3 style={{ margin: '5px 0' }}>Players</h3>
                            <PlayerList players={players} currentDrawerId={currentDrawerId} myId={myId} myPlayerId={typeof window !== 'undefined' ? localStorage.getItem('playerId') || undefined : undefined} />
                            <div style={{ marginTop: 'auto' }}>
                                 {GameSettingsComponent}
                            </div>
                            </>
                        )}
                    </div>
                )}

                {/* MAIN STAGE */}
                {viewMode === 'camera' && mediaActive ? (
                    // CAMERA VIEW (Full Screen Grid)
                    <div style={{ flex: 1, padding: '20px', background: '#0f172a', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                         {renderVideo({ layout: 'grid' })}
                    </div>
                ) : (
                    // GAME VIEW (Children) - Also fallback if viewMode is camera but media inactive
                    <div className="glass-panel main-stage" style={{ flex: 1, padding: 0, display: 'flex', flexDirection: 'column', position: 'relative', margin: 0, width: '100%', borderRadius: 0, border: 'none' }}>
                        {children}
                    </div>
                )}

                {/* RIGHT SIDE PANEL (Persistent Chat) */}
                <div className="glass-panel sidebar right-fixed" style={{ width: '320px', display: 'flex', flexDirection: 'column', borderLeft: '1px solid #334155', borderRadius: '0', background: 'rgba(30, 41, 59, 0.4)', backdropFilter: 'blur(10px)', flexShrink: 0  }}>
                     <div style={{ padding: '15px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                         <MessageSquare size={20} />
                         <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Game Chat</h3>
                     </div>
                     <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                         {/* Pass height 100% to ensure chatbox fills it */}
                         <ChatBox
                            messages={messages}
                            onSendMessage={onSendMessage}
                            className="chat-box"
                            placeholder={chatPlaceholder || "Type here..."}
                            disabled={chatDisabled}
                            clearInputTrigger={clearInputTrigger}
                        />
                    </div>
                </div>

           </div>

           <MediaSettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} onDeviceChange={switchDevice || (() => {})} />
        </div>
    );
}
