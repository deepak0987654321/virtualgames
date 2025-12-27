import { useAuth } from '../../../../hooks/useAuth';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import io from 'socket.io-client';
import { Clapperboard, PartyPopper, Video as VideoIcon } from 'lucide-react';
import GameLayout from '../../../../components/game/GameLayout';
import Link from 'next/link';
import GameSettings from '../../../../components/game/GameSettings';
import GameOverLeaderboard from '../../../../components/game/GameOverLeaderboard';
import { VideoTile } from '../../../../components/video/VideoChat'; // Named export now
import VideoChat from '../../../../components/video/VideoChat';
import VideoCarousel from '../../../../components/video/VideoCarousel';
import JoinGameOverlay from '../../../../components/game/JoinGameOverlay';
import TeamSettingsModal from '../../../../components/game/TeamSettingsModal';
import { useWebRTC } from '../../../../hooks/useWebRTC';

let socket: any;

export default function CharadesGameRoom() {
  const router = useRouter();
  const { user } = useAuth();
  const { roomCode, name, audioOn, videoOn } = router.query;
  const [room, setRoom] = useState<any>(null);

  // Auto-Login if Authenticated
  useEffect(() => {
     if (!router.isReady) return;
     if (!name && user) {
         const myAvatar = user.avatar || `https://api.dicebear.com/7.x/personas/svg?seed=${user.username}`;
         router.replace({
            pathname: router.pathname,
            query: {
                ...router.query,
                name: user.username,
                avatar: myAvatar,
            }
         });
     }
  }, [router.isReady, name, user]);

  // Game State
  const [gameState, setGameState] = useState('LOBBY');
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [wordChoices, setWordChoices] = useState<any[]>([]);
  const [currentWord, setCurrentWord] = useState('');
  const [maskedWord, setMaskedWord] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [roundTimeLeft, setRoundTimeLeft] = useState(0);
  const [roundResult, setRoundResult] = useState<any>(null);
  const [gameOver, setGameOver] = useState<any>(null);

  // Settings State
  const [duration, setDuration] = useState(5);
  const [turnTime, setTurnTime] = useState(60);
  const [hardcore, setHardcore] = useState(false);
  const [teamMode, setTeamMode] = useState(false);
  const [teamConfig, setTeamConfig] = useState<any>(null);
  const [notification, setNotification] = useState<string|null>(null);

  // Force video enabled for Charades
  const [videoEnabledSetting, setVideoEnabledSetting] = useState(true);
  const [showTeamModal, setShowTeamModal] = useState(false);

  // UI State
  const [activeTab, setActiveTab] = useState<'players' | 'cameras' | 'chat' | null>('players');
  const [viewMode, setViewMode] = useState<'game' | 'camera'>('game');

  // Chat
  const [messages, setMessages] = useState<any[]>([]);

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
      true, // Default video ON for charades
      audioOn === 'true'
  );

  useEffect(() => {
    if (!router.isReady) return;
    if (!name) return;

    if (socket && socket.connected) return;

    socket = io();
    setSocketInstance(socket);

    const { avatar, playerId } = router.query;
    socket.emit('join_room', { name, roomCode, avatar, playerId }, (response: any) => {
       if (response.success) {
        setRoom(response.room);
        // Force video enabled in room settings if not already
        if (response.room.videoEnabled !== undefined) {
             setVideoEnabledSetting(response.room.videoEnabled);
        } else {
             setVideoEnabledSetting(true);
        }

        setGameState(response.room.state === 'SELECTING_WORD' ? 'SELECTING' : response.room.state);
        if(response.room.maskedAnswer) setMaskedWord(response.room.maskedAnswer);
        if(response.room.timeLeft) setTimeLeft(response.room.timeLeft);
        if(response.room.roundTimeLeft) setRoundTimeLeft(response.room.roundTimeLeft);
        if(response.room.teamMode !== undefined) setTeamMode(response.room.teamMode);
        if(response.room.currentDrawer === socket.id) setIsMyTurn(true);
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

      if(updatedRoom.state === 'SELECTING_WORD') setGameState('SELECTING');
      else if(updatedRoom.state === 'ACTING' || updatedRoom.state === 'DRAWING') setGameState('ACTING');
      else if(updatedRoom.state === 'ENDED') setGameState('GAME_OVER');
      else setGameState(updatedRoom.state);

      if(updatedRoom.maskedAnswer) setMaskedWord(updatedRoom.maskedAnswer);
      if(updatedRoom.maskedAnswer) setMaskedWord(updatedRoom.maskedAnswer);
      if(updatedRoom.timeLeft) setTimeLeft(updatedRoom.timeLeft);
      if(updatedRoom.teamMode !== undefined) setTeamMode(updatedRoom.teamMode);
      if(updatedRoom.roundTimeLeft) setRoundTimeLeft(updatedRoom.roundTimeLeft);

      setIsMyTurn(updatedRoom.currentDrawer === socket.id);
    });

    socket.on('round_start_selecting', ({ drawer }: any) => {
       setIsMyTurn(socket.id === drawer);
       setGameState('SELECTING');
       setRoundResult(null);
       setGameOver(null);
       setRoundTimeLeft(15);
       addLog('System', `The actor is choosing a word...`, 'system');
    });

    socket.on('your_turn_to_draw', (choices: any) => {
       setWordChoices(choices);
       setIsMyTurn(true);
    });

    socket.on('start_drawing_phase', ({ drawer, timeLeft, maskedAnswer, length }: any) => {
        setGameState('ACTING');
        setMaskedWord(maskedAnswer);
        setRoundTimeLeft(timeLeft);
        setWordChoices([]);

        if (socket.id !== drawer) {
             addLog('System', `Guess the word! Length: ${length}`, 'system');
        } else {
             addLog('System', `Act now! Camera is ON.`, 'system');
             if (!isVideoEnabled) {
                 toggleVideo(); // Force video on if off
             }
        }
    });

    socket.on('chat_message', (msg: any) => {
        setMessages(prev => [...prev, msg]);
    });

    socket.on('correct_guess', ({ points }: any) => {
       addLog('Game', `Correct! You scored ${points} points!`, 'correct');
    });

    socket.on('player_guessed', ({ playerId, points }: any) => {
         const p = room?.players.find((pl:any) => pl.id === playerId);
         if(p) {
             addLog('System', `${p.name} guessed the word!`, 'success');
             setNotification(`${p.name} guessed the word!`);
             setTimeout(() => setNotification(null), 3000);
         }
    });

    socket.on('round_end', (data: any) => {
       setGameState('ROUND_END');
       setRoundResult(data);
       setWordChoices([]);
       setCurrentWord('');
       addLog('System', `Round Over! Answer: ${data.answer}`, 'system');
    });

    socket.on('game_over', (data: any) => {
        setGameState('GAME_OVER');
        setGameOver(data);
    });

    socket.on('system_message', (msg: string) => {
         addLog('Hint', msg, 'warning');
    });

    return () => socket.disconnect();
  }, [router.isReady, name, roomCode]);

  useEffect(() => {
    let roundTimer: any;
    if (roundTimeLeft > 0 && (gameState === 'ACTING' || gameState === 'SELECTING')) {
        roundTimer = setInterval(() => setRoundTimeLeft((t:any) => Math.max(0, t - 1)), 1000);
    }
    let globalTimer: any;
    if (timeLeft > 0 && gameState !== 'LOBBY' && gameState !== 'GAME_OVER') {
        globalTimer = setInterval(() => setTimeLeft((t:any) => Math.max(0, t - 1)), 1000);
    }
    return () => {
        if(roundTimer) clearInterval(roundTimer);
        if(globalTimer) clearInterval(globalTimer);
    };
  }, [roundTimeLeft > 0, timeLeft > 0, gameState]);

  const startGame = () => {
    console.log("Starting charades game...");
    socket.emit('start_game', { roomCode, settings: { duration, turnTime, hardcore, teamMode, teamConfig, videoEnabled: true } });
  };

  const selectWord = (word: string) => {
      socket.emit('select_word', { roomCode, word });
      setCurrentWord(word);
      setGameState('ACTING');
  };

  const addLog = (name: string, text: string, type = 'chat') => {
      setMessages(prev => [...prev, { id: Date.now(), playerName: name, text, type }]);
  };

  if (!room) {
    if (!name) {
      return (
          <JoinGameOverlay
            roomCode={roomCode as string}
            forceVideoOn={true}
            onJoin={(joinName: string, joinAvatar: string, audioOn: boolean, videoOn: boolean, pId?: string) => {
                router.replace({
                    pathname: router.pathname,
                    query: {
                        ...router.query,
                        name: joinName,
                        avatar: joinAvatar,
                        playerId: pId,
                        audioOn: String(audioOn),
                        videoOn: String(videoOn)
                    }
                });
            }}
          />
      );
    }
    return (
        <div className="overlay-backdrop">
            <div className="overlay-card" style={{ maxWidth: '300px' }}>
                <div className="countdown-ring" style={{ width: '50px', height: '50px', margin: '0 auto 20px', borderTopColor: 'var(--primary)' }} />
                <h3>Loading...</h3>
            </div>
        </div>
    );
  }

  const isHost = room.players.find((p: any) => p.name === name)?.isHost;
  const actorName = room.players.find((p:any) => p.id === room.currentDrawer)?.name || 'Actor';
  const actorId = room.currentDrawer;

  // Resolve Stream for Actor
  let actorStream = null;
  let actorIsLocal = false;
  let actorVideoEnabled = false;
  let actorAudioEnabled = false;

  if (gameState === 'ACTING' && actorId) {
       if (actorId === socket?.id) {
           actorStream = localStream;
           actorIsLocal = true;
           actorVideoEnabled = isVideoEnabled;
           actorAudioEnabled = isAudioEnabled;
       } else {
           const peer = peers.find(p => p.socketId === actorId);
           if (peer) {
               actorStream = peer.stream;
               actorVideoEnabled = peer.isVideoEnabled;
               actorAudioEnabled = peer.isAudioEnabled;
           }
       }
  }

  const headerContent = (
      <div style={{ textAlign: 'center' }}>
            {gameState === 'ACTING' && (
                <>
                <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>Round Timer</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: roundTimeLeft < 10 ? 'var(--error)' : 'white' }}>{roundTimeLeft}s</div>
                </>
            )}
            {gameState === 'SELECTING' && <div>{actorName} is choosing... ({roundTimeLeft}s)</div>}
            {gameState === 'LOBBY' && <div>Waiting to Start</div>}
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
          currentDrawerId={actorId}
          myId={socket?.id}
          messages={messages}
          onSendMessage={(msg) => {
              if(isMyTurn && gameState === 'ACTING') return;
              socket.emit('send_chat', { roomCode, message: msg });
          }}
          chatPlaceholder={isMyTurn && gameState === 'ACTING' ? "You cannot guess while acting!" : "Type your guess here..."}
          chatDisabled={isMyTurn && gameState === 'ACTING'}
          mediaActive={true} // Always show media controls for Charades
          forceVideoOn={true}
          onOpenTeamSettings={isHost && teamMode ? () => setShowTeamModal(true) : undefined}

          // Custom Side Panel could be Audience Grid?
          // For now, let's keep Audience in the `renderVideo` slot but using a custom implementation
          // Sidebar Video List hidden as requested to move to bottom slider
          renderVideo={() => null}

          GameSettingsComponent={
             <GameSettings
                isHost={isHost} players={room.players} gameType="charades"
                duration={duration} setDuration={setDuration}
                turnTime={turnTime} setTurnTime={setTurnTime}
                hardcore={hardcore} setHardcore={setHardcore}
                teamMode={teamMode} setTeamMode={setTeamMode}
                videoEnabled={true} setVideoEnabled={() => {}} // Forced ON
                onStart={startGame} isPlaying={gameState !== 'LOBBY' && gameState !== 'GAME_OVER'}
                setTeamConfig={setTeamConfig} teamConfig={teamConfig}
                onUpdateSettings={(settings) => socket.emit('update_settings', { roomCode, settings })}
            />
          }
      >
             {/* MAIN STAGE (ACTOR VIDEO) */}
             <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '10px' }}>

                 {/* INFO BAR */}
                 <div style={{
                     padding: '15px',
                     background: 'rgba(0,0,0,0.3)',
                     textAlign: 'center',
                     borderRadius: '12px',
                     display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px'
                 }}>
                     {isMyTurn && gameState === 'ACTING' ? (
                         <div style={{ fontSize: '1.8rem', fontWeight: 'bold', letterSpacing: '2px', color: 'var(--accent)', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                             Act Code: {currentWord}
                         </div>
                     ) : (
                         <div style={{ textAlign: 'center' }}>
                             {gameState === 'SELECTING' ? (
                                 <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{actorName} is choosing a word...</div>
                             ) : (
                                 <>
                                 <div style={{ fontSize: '1.8rem', fontWeight: 'bold', letterSpacing: '3px' }}>{maskedWord || 'WAITING...'}</div>
                                 {gameState === 'ACTING' && (
                                    <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                        <Clapperboard size={16} /> {actorName} is acting
                                    </div>
                                 )}
                                 </>
                             )}
                         </div>
                     )}
                 </div>

                 {/* STAGE AREA */}
                 <div style={{ flex: 1, position: 'relative', background: 'black', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 0 20px rgba(0,0,0,0.5)' }}>
                      {gameState === 'ACTING' && actorId ? (
                           <div style={{ width: '100%', height: '100%', display: 'flex' }}>
                                {actorStream ? (
                                    <VideoTile
                                        stream={actorStream}
                                        isLocal={actorIsLocal}
                                        name={actorName}
                                        avatar={room.players.find((p:any) => p.id === actorId)?.avatar}
                                        videoEnabled={true} // Mandate true for Charades Actor
                                        audioEnabled={actorAudioEnabled}
                                        style={{ height: '100%', aspectRatio: 'unset', flex: 1 }}
                                    />
                                ) : (
                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', background: 'black', color: 'white' }}>
                                        <div style={{ padding: '10px', opacity: 0.7 }}>Connecting to Actor...</div>
                                    </div>
                                )}
                           </div>
                       ) : gameState === 'LOBBY' ? (
                           <div style={{ width: '100%', height: '100%', padding: '20px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                                <h3 style={{ textAlign: 'center', marginBottom: '10px', opacity: 0.7 }}>Lobby - Waiting for Host to Start</h3>
                                <div style={{ flex: 1, overflow: 'hidden' }}>
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
                                        layout="grid"
                                    />
                                </div>
                           </div>
                       ) : (
                            // Placeholder when not acting
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', opacity: 0.5 }}>
                                 <VideoIcon size={64} style={{ marginBottom: '20px' }} />
                                 <h3>Waiting for performance...</h3>
                            </div>
                       )}

                      {/* OVERLAYS */}
                      {isMyTurn && gameState === 'SELECTING' && (
                          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                              <h2 style={{ marginBottom: '30px', fontSize: '2rem' }}>Choose your Scene!</h2>
                              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
                                  {wordChoices.map((choice:any) => (
                                      <button key={choice.word} onClick={() => selectWord(choice.word)} className="btn-primary" style={{ padding: '20px 40px', fontSize: '1.5rem', background: choice.difficulty === 1 ? '#22c55e' : (choice.difficulty === 2 ? '#eab308' : '#ef4444') }}>
                                          {choice.word}
                                          <div style={{ fontSize: '0.9rem', marginTop: '5px', opacity: 0.8 }}>{choice.difficulty === 1 ? 'Easy' : (choice.difficulty === 2 ? 'Medium' : 'Hard')}</div>
                                      </button>
                                  ))}
                              </div>
                          </div>
                      )}

                       {((gameState === 'ROUND_END' && roundResult) || (gameState === 'GAME_OVER' && gameOver)) && (
                          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.90)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 20 }}>
                              <h2>{gameState === 'GAME_OVER' ? 'Game Over!' : 'Round Over!'}</h2>
                              {gameState === 'ROUND_END' && roundResult && <h1 style={{ fontSize: '4rem', color: 'var(--accent)', margin: '10px 0' }}>{roundResult.answer}</h1>}
                               {gameState === 'GAME_OVER' && gameOver && (
                                    <GameOverLeaderboard players={gameOver.players} teams={gameOver.teams} isHost={isHost} onRestart={startGame} />
                               )}
                          </div>
                       )}
                 </div>

                 {/* NOTIFICATION */}
                 {notification && (
                    <div style={{ position: 'absolute', top: '150px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(34, 197, 94, 0.95)', color: 'white', padding: '10px 25px', borderRadius: '50px', fontWeight: 'bold', zIndex: 100, animation: 'pulse 0.5s ease-in-out', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                        <PartyPopper size={24} /> {notification}
                    </div>
                 )}


             {/* AUDIENCE CAROUSEL (Bottom) */}
             {gameState !== 'LOBBY' && (
                 <VideoCarousel
                     players={room.players}
                     peers={peers}
                     localStream={localStream}
                     myName={name as string}
                     toggleVideo={toggleVideo}
                     toggleAudio={toggleAudio}
                     isVideoEnabled={isVideoEnabled}
                     isAudioEnabled={isAudioEnabled}
                     actorId={actorId}
                     myId={socket?.id}
                 />
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
                gameType="charades"
                currentConfig={teamConfig}
            />

       </div>
      </GameLayout>
  );
}
