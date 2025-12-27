import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import io from 'socket.io-client';
import { PartyPopper } from 'lucide-react';
import GameLayout from '../game/GameLayout';
import PlayerList from '../game/PlayerList';
import GameSettings from '../game/GameSettings';
import GameOverLeaderboard from '../game/GameOverLeaderboard';
import VideoChat from '../video/VideoChat';
import JoinGameOverlay from '../game/JoinGameOverlay';
import TeamSettingsModal from '../game/TeamSettingsModal';
import { useWebRTC } from '../../hooks/useWebRTC';

let socket: any;

export default function RebusGame({ roomCode, name, audioOn, videoOn }: any) {
  const router = useRouter();
  const [room, setRoom] = useState<any>(null);

  // Game UI State
  const [gameState, setGameState] = useState('LOBBY');
  const [viewMode, setViewMode] = useState<'game' | 'camera'>('game');
  const [activeTab, setActiveTab] = useState<'players' | 'cameras' | 'chat' | null>('players');

  // Rebus Specific State
  const [messages, setMessages] = useState<any[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [puzzle, setPuzzle] = useState<any>(null);
  const [maskedAnswer, setMaskedAnswer] = useState('');
  const [roundResult, setRoundResult] = useState<any>(null);
  const [gameOver, setGameOver] = useState<any>(null);
  const [duration, setDuration] = useState(5);
  const [puzzleDuration, setPuzzleDuration] = useState(30);
  const [puzzleTimeLeft, setPuzzleTimeLeft] = useState(0);
  const [roundCounter, setRoundCounter] = useState(0); // Track round changes to clear chat input

  // Settings
  const [hardcore, setHardcore] = useState(false);
  const [teamMode, setTeamMode] = useState(false);
  const [teamConfig, setTeamConfig] = useState<any>(null);
  const [notification, setNotification] = useState<string|null>(null);
  const [videoEnabledSetting, setVideoEnabledSetting] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);

  const [socketInstance, setSocketInstance] = useState<any>(null);

  // WebRTC
  const {
      localStream,
      peers,
      toggleVideo,
      toggleAudio,
      isVideoEnabled,
      isAudioEnabled,
      permissionError,
      switchDevice
  } = useWebRTC(
      socketInstance,
      roomCode as string,
      name as string,
      videoOn === 'true',
      audioOn === 'true'
  );

  useEffect(() => {
    // If props missing, wait
    if (!name || !roomCode) return;
    if (socket && socket.connected) return;

    socket = io();
    setSocketInstance(socket);

    const { avatar, playerId, tenantSlug } = router.query;

    // Join Room
    socket.emit('join_room', { name, roomCode, avatar, playerId }, (response: any) => {
      if (response.success) {
        setRoom(response.room);
        if (response.room.videoEnabled !== undefined) {
             setVideoEnabledSetting(response.room.videoEnabled);
        }

        // Auto-enable video if Host joined with video enabled
        const me = response.room.players.find((p:any) => p.id === socket.id);
        if (me && me.isHost && videoOn === 'true' && !response.room.videoEnabled) {
             socket.emit('update_settings', { roomCode, settings: { videoEnabled: true } });
        }

        if (response.room.maskedAnswer) setMaskedAnswer(response.room.maskedAnswer);
        if (response.room.timeLeft !== undefined) setTimeLeft(response.room.timeLeft);
        if (response.room.puzzleTimeLeft) setPuzzleTimeLeft(response.room.puzzleTimeLeft);
        if (response.room.puzzleTimeLimit) setPuzzleDuration(response.room.puzzleTimeLimit);
        if (response.room.teamMode !== undefined) setTeamMode(response.room.teamMode);
      } else {
        alert(response.error);
        router.push('/');
      }
    });

    socket.on('update_room', (updatedRoom: any) => {
      setRoom(updatedRoom);
      if (updatedRoom.videoEnabled !== undefined) {
          setVideoEnabledSetting(updatedRoom.videoEnabled);
      }
      if (updatedRoom.maskedAnswer) setMaskedAnswer(updatedRoom.maskedAnswer);
      if (updatedRoom.maskedAnswer) setMaskedAnswer(updatedRoom.maskedAnswer);
      if (updatedRoom.timeLeft !== undefined) setTimeLeft(updatedRoom.timeLeft);
      if (updatedRoom.teamMode !== undefined) setTeamMode(updatedRoom.teamMode);
    });

    socket.on('round_start', (data: any) => {
      setPuzzle(data.puzzle);
      setMaskedAnswer(data.maskedAnswer);
      setTimeLeft(data.timeLeft);
      setPuzzleTimeLeft(data.puzzleTime);
      setRoundResult(null);
      setGameOver(null);
      setRoundCounter(prev => prev + 1); // Increment to clear chat input
      addLog('System', `Puzzle ${data.round} started!`, 'system');
    });

    socket.on('round_end', (data: any) => {
       if (data.reason === 'timeout') {
            addLog('System', `Time's Up! Answer: ${data.answer}`, 'error');
       } else {
            addLog('System', `Solved! Answer: ${data.answer}`, 'system');
       }
       setPuzzle(null);
       setRoundResult(data);
    });

    socket.on('player_guessed', ({ playerId, points }: any) => {
        const p = room?.players.find((pl:any) => pl.id === playerId);
        if(p) {
             setNotification(`${p.name} guessed correctly!`);
             setTimeout(() => setNotification(null), 3000);
        }
    });

    socket.on('correct_guess', ({ points }: any) => {
       addLog('Game', `Correct! You scored ${points} points!`, 'correct');
    });

    socket.on('chat_message', (msg: any) => {
      setMessages(prev => [...prev, msg]);
    });

    socket.on('game_over', (data: any) => {
        addLog('System', `Game Over! Winner: ${data.players[0].name}`, 'system');
        setRoundResult(null);
        setGameOver(data);
    });

    return () => {
      socket.disconnect();
    };
  }, [name, roomCode]);

  // Global Timer
  useEffect(() => {
    let timer: any;
    if (timeLeft > 0 && room?.state === 'PLAYING') {
        timer = setInterval(() => setTimeLeft((t:any) => t - 1), 1000);
    }
    return () => { if(timer) clearInterval(timer); }
  }, [timeLeft, room?.state]);

  // Puzzle Timer
  useEffect(() => {
    let timer: any;
    if (puzzleTimeLeft > 0 && room?.state === 'PLAYING' && puzzle) {
        timer = setInterval(() => setPuzzleTimeLeft((t:any) => t - 1), 1000);
    }
    return () => { if(timer) clearInterval(timer); }
  }, [puzzleTimeLeft, room?.state, puzzle]);

  const startGame = () => {
    socket.emit('start_game', { roomCode, settings: { duration: Number(duration), puzzleTime: Number(puzzleDuration), hardcore, teamMode, teamConfig, videoEnabled: videoEnabledSetting } });
  };

  const addLog = (name: string, text: string, type = 'chat') => {
      setMessages(prev => [...prev, { id: Date.now(), playerName: name, text, type }]);
  };

  if (!room) {
    return <div className="center-content">Loading...</div>;
  }

  const isHost = room.players.find((p: any) => p.name === name)?.isHost;

  const headerContent = (
      <div style={{ textAlign: 'center' }}>
            {room.state === 'LOBBY' && (
                <span className="badge">Waiting for players ({room.players.length})</span>
            )}
            {room.state === 'PLAYING' && (
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                    <span>Puzzle #{room.currentRound}</span>
                </div>
            )}
      </div>
  );

  return (
      <GameLayout
          roomCode={room.code}
          timeLeft={timeLeft}
          headerCenter={headerContent}
          viewMode={viewMode}
          setViewMode={setViewMode}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isAudioEnabled={isAudioEnabled}
          toggleAudio={toggleAudio}
          isVideoEnabled={isVideoEnabled}
          toggleVideo={toggleVideo}
          switchDevice={switchDevice}
          players={room.players}
          myId={socket?.id}
          messages={messages}
          onSendMessage={(msg) => socket.emit('send_chat', { roomCode, message: msg })}
          chatPlaceholder="Type your answer or chat..."
          clearInputTrigger={roundCounter}
          mediaActive={videoEnabledSetting}
          onOpenTeamSettings={isHost && teamMode ? () => setShowTeamModal(true) : undefined}

          renderVideo={(props: { layout: 'grid' | 'list' }) => (
              socketInstance && room && room.videoEnabled && (
                  <VideoChat
                      roomCode={roomCode as string}
                      myName={name as string}
                      myAvatar={room.players.find((p:any) => p.name === name)?.avatar || ''}
                      players={room.players}
                      localStream={localStream}
                      peers={peers}
                      toggleVideo={toggleVideo}
                      toggleAudio={toggleAudio}
                      isVideoEnabled={isVideoEnabled}
                      isAudioEnabled={isAudioEnabled}
                      permissionError={permissionError}
                      layout={props.layout}
                  />
              )
          )}

          GameSettingsComponent={
               <GameSettings
                    isHost={isHost}
                    duration={duration}
                    setDuration={setDuration}
                    turnTime={puzzleDuration}
                    setTurnTime={setPuzzleDuration}
                    hardcore={hardcore}
                    setHardcore={setHardcore}
                    teamMode={teamMode}
                    setTeamMode={setTeamMode}
                    videoEnabled={videoEnabledSetting}
                    setVideoEnabled={setVideoEnabledSetting}
                    onStart={startGame}
                    isPlaying={room.state !== 'LOBBY' && room.state !== 'ENDED'}
                    players={room.players}
                    gameType="rebus"
                    setTeamConfig={setTeamConfig}
                    teamConfig={teamConfig}
                    onUpdateSettings={(settings) => {
                        socket.emit('update_settings', { roomCode, settings });
                    }}
               />
          }
      >
        <div style={{ padding: '20px', height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>

            {/* GAME OVER MODAL */}
            {gameOver && (
                <div className="overlay-backdrop">
                    <div className="overlay-card" style={{ maxWidth: '600px' }}>
                        <GameOverLeaderboard
                                players={gameOver.players}
                                teams={gameOver.teams}
                                isHost={isHost}
                                onRestart={() => socket.emit('restart_game', { roomCode })}
                            />
                    </div>
                </div>
            )}

            {/* ROUND RESULT OVERLAY */}
            {roundResult && !gameOver && (
                <div className="overlay-backdrop">
                    <div className="overlay-card">
                        <h2 style={{ color: 'var(--text-muted)' }}>Solved!</h2>
                        <h1 style={{ fontSize: '3rem', margin: '20px 0', background: 'linear-gradient(to right, #22d3ee, #d946ef)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            {roundResult.answer}
                        </h1>
                        <div className="countdown-ring">
                            Next Puzzle...
                        </div>
                    </div>
                </div>
            )}

            {room.state === 'PLAYING' && puzzle ? (
                <>
                <div
                    className="rebus-card"
                    style={{
                        flexDirection: puzzle.type === 'text' ? 'column' : 'row',
                        gap: '20px',
                        maxWidth: '800px',
                        width: '100%',
                        margin: '0 auto'
                    }}
                >
                    {puzzle.type === 'text' && (
                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{puzzle.content}</pre>
                    )}
                    {puzzle.type === 'icon' && (
                        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                            {puzzle.content.map((icon: string, idx: number) => (
                                <span key={idx} style={{ fontSize: '4rem' }}>{icon}</span>
                            ))}
                        </div>
                    )}
                    {puzzle.type === 'html' && (
                        <div dangerouslySetInnerHTML={{ __html: puzzle.content }} />
                    )}

                    {!puzzle.type && puzzle.puzzle}
                </div>

                {maskedAnswer && (
                    <div style={{
                        marginTop: '30px',
                        fontSize: '2.5rem',
                        letterSpacing: '8px',
                        fontFamily: 'monospace',
                        color: 'var(--accent)',
                        textShadow: '0 0 15px rgba(34, 211, 238, 0.4)',
                        fontWeight: 'bold'
                    }}>
                        {maskedAnswer}
                    </div>
                )}
                </>
            ) : (
                <div style={{ textAlign: 'center', fontSize: '1.5rem', opacity: 0.5, marginTop: '100px' }}>
                    {room.state === 'ENDED' ? 'Game Over!' : 'Get Ready!'}
                </div>
            )}

            {room.state === 'PLAYING' && puzzle && (
                <div style={{ width: '100%', maxWidth: '400px', margin: '20px auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <span>Time Limit</span>
                        <span style={{ color: puzzleTimeLeft < 10 ? 'var(--error)' : 'white' }}>{puzzleTimeLeft}s</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{
                            width: `${(puzzleTimeLeft / puzzleDuration) * 100}%`,
                            height: '100%',
                            background: puzzleTimeLeft < 10 ? 'var(--error)' : 'var(--accent)',
                            transition: 'width 1s linear'
                        }} />
                    </div>
                </div>
            )}

            {puzzle && (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '20px' }}>
                    Hint: {puzzle.hint}
                </div>
            )}

            {/* Notification */}
            {notification && (
                <div style={{ position: 'fixed', bottom: '100px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(34, 197, 94, 0.95)', color: 'white', padding: '10px 25px', borderRadius: '50px', fontWeight: 'bold', zIndex: 100, animation: 'pulse 0.5s ease-in-out', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <PartyPopper size={24} /> {notification}
                </div>
            )}

            {/* Team Settings Modal */}
            <TeamSettingsModal
                isOpen={showTeamModal}
                onClose={() => setShowTeamModal(false)}
                onConfirm={(config) => {
                    setTeamConfig(config);
                    setShowTeamModal(false);
                }}
                players={room.players}
                gameType="rebus"
                currentConfig={teamConfig}
            />

        </div>
      </GameLayout>
  );
}
