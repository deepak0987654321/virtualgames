import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import io from 'socket.io-client';
import { Pencil, PartyPopper } from 'lucide-react';
import GameLayout from '../../../components/game/GameLayout';
import PlayerList from '../../../components/game/PlayerList';
import GameSettings from '../../../components/game/GameSettings';
import GameOverLeaderboard from '../../../components/game/GameOverLeaderboard';
import VideoChat from '../../../components/video/VideoChat';
import JoinGameOverlay from '../../../components/game/JoinGameOverlay';
import TeamSettingsModal from '../../../components/game/TeamSettingsModal';
import { useWebRTC } from '../../../hooks/useWebRTC';

let socket: any;

export default function DrawGameRoom() {
  const router = useRouter();
  const { roomCode, name, audioOn, videoOn } = router.query;
  const [room, setRoom] = useState<any>(null);

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
  const [videoEnabledSetting, setVideoEnabledSetting] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);

  // UI State
  const [activeTab, setActiveTab] = useState<'players' | 'cameras' | 'chat' | null>('players');
  const [viewMode, setViewMode] = useState<'game' | 'camera'>('game');

  // Chat
  const [messages, setMessages] = useState<any[]>([]);
  const [roundCounter, setRoundCounter] = useState(0); // Track round changes to clear chat input

  // Canvas
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(5);

  const [socketInstance, setSocketInstance] = useState<any>(null);

  // WebRTC
  const {
      localStream,
      peers,
      toggleVideo,
      toggleAudio,
      isVideoEnabled,
      isAudioEnabled,
      permissionError
  } = useWebRTC(
      socketInstance,
      roomCode as string,
      name as string,
      videoOn === 'true',
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
        if (response.room.videoEnabled !== undefined) {
             setVideoEnabledSetting(response.room.videoEnabled);
        }

        // Auto-enable video if Host joined with video enabled
        const me = response.room.players.find((p:any) => p.id === socket.id);
        if (me && me.isHost && videoOn === 'true' && !response.room.videoEnabled) {
             socket.emit('update_settings', { roomCode, settings: { videoEnabled: true } });
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
      else if(updatedRoom.state === 'DRAWING') setGameState('DRAWING');
      else if(updatedRoom.state === 'ENDED') setGameState('GAME_OVER');
      else setGameState(updatedRoom.state);

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
       clearCanvas();
       setRoundTimeLeft(15);
       setRoundCounter(prev => prev + 1); // Increment to clear chat input
       addLog('System', `The drawer is choosing a word...`, 'system');
    });

    socket.on('your_turn_to_draw', (choices: any) => {
       setWordChoices(choices);
       setIsMyTurn(true);
    });

    socket.on('start_drawing_phase', ({ drawer, timeLeft, maskedAnswer, length }: any) => {
        setGameState('DRAWING');
        setMaskedWord(maskedAnswer);
        setRoundTimeLeft(timeLeft);
        setWordChoices([]);

        if (socket.id !== drawer) {
             addLog('System', `Guess the word! Length: ${length}`, 'system');
        } else {
             addLog('System', `Draw now!`, 'system');
        }
    });

    socket.on('draw_stroke', (data: any) => {
        drawStrokeOnCanvas(data);
    });

    socket.on('clear_canvas', () => {
        clearCanvas();
    });

    socket.on('canvas_history', (history: any) => {
        history.forEach((stroke: any) => drawStrokeOnCanvas(stroke));
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
    if (roundTimeLeft > 0 && (gameState === 'DRAWING' || gameState === 'SELECTING')) {
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

  // CANVAS LOGIC
  const getCanvasCoordinates = (e: any) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
          x: (clientX - rect.left) / rect.width,
          y: (clientY - rect.top) / rect.height
      };
  };

  const drawStrokeOnCanvas = (data: any) => {
      if (!data) return;
      const canvas = canvasRef.current;
      if(!canvas) return;

      if (data.type === 'clear') {
          clearCanvas();
          return;
      }
      if (data.x0 !== undefined) {
           drawStrokeBetter(data);
           return;
      }

      const ctx = canvas.getContext('2d');
      if(!ctx) return;
      const width = canvas.width;
      const height = canvas.height;
      if (data.x === undefined || data.y === undefined) return;
      const x = data.x * width;
      const y = data.y * height;
      ctx.lineWidth = data.lineWidth || 5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = data.color || '#000';
      if (data.type === 'start') {
          ctx.beginPath();
          ctx.moveTo(x, y);
      } else if (data.type === 'draw') {
          ctx.lineTo(x, y);
          ctx.stroke();
      }
  };

  const lastPos = useRef<{x:number, y:number}|null>(null);

  const startDrawingBetter = (e: any) => {
      if(!isMyTurn || gameState !== 'DRAWING') return;
      setIsDrawing(true);
      const { x, y } = getCanvasCoordinates(e);
      lastPos.current = { x, y };
      const data = { x0: x, y0: y, x1: x, y1: y, color, lineWidth };
      drawStrokeBetter(data);
      socket.emit('draw_stroke', { roomCode, data });
  };

  const stopDrawing = () => setIsDrawing(false);

  const drawBetter = (e: any) => {
       if(!isDrawing || !isMyTurn || gameState !== 'DRAWING' || !lastPos.current) return;
       e.preventDefault();
       const { x, y } = getCanvasCoordinates(e);
       const data = { x0: lastPos.current.x, y0: lastPos.current.y, x1: x, y1: y, color, lineWidth };
       drawStrokeBetter(data);
       socket.emit('draw_stroke', { roomCode, data });
       lastPos.current = { x, y };
  };

  const drawStrokeBetter = (data: any) => {
      const canvas = canvasRef.current;
      if(!canvas) return;
      const ctx = canvas.getContext('2d');
      if(!ctx) return;
      const w = canvas.width;
      const h = canvas.height;
      ctx.beginPath();
      ctx.moveTo(data.x0 * w, data.y0 * h);
      ctx.lineTo(data.x1 * w, data.y1 * h);
      ctx.strokeStyle = data.color;
      ctx.lineWidth = data.lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
  };

  const clearCanvas = () => {
      const canvas = canvasRef.current;
      if(!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
  };

  const startGame = () => {
    socket.emit('start_game', { roomCode, settings: { duration, turnTime, hardcore, teamMode, teamConfig, videoEnabled: videoEnabledSetting } });
  };

  const selectWord = (word: string) => {
      socket.emit('select_word', { roomCode, word });
      setCurrentWord(word);
      setGameState('DRAWING');
  };

  const addLog = (name: string, text: string, type = 'chat') => {
      setMessages(prev => [...prev, { id: Date.now(), playerName: name, text, type }]);
  };

  if (!room) {
    if (!name) {
      return (
          <JoinGameOverlay
            roomCode={roomCode as string}
            onJoin={(joinName: string, joinAvatar: string, audioOn: boolean, videoOn: boolean, pId?: string) => {
                router.replace({
                    pathname: `/draw/room/${roomCode}`,
                    query: {
                        ...router.query,
                        name: joinName,
                        avatar: joinAvatar,
                        playerId: pId,
                        audioOn: audioOn ? 'true' : 'false',
                        videoOn: videoOn ? 'true' : 'false'
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
  const drawerName = room.players.find((p:any) => p.id === room.currentDrawer)?.name || 'Drawer';

  const headerContent = (
      <div style={{ textAlign: 'center' }}>
           {gameState === 'DRAWING' && (
               <>
               <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>Round Timer</div>
               <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: roundTimeLeft < 10 ? 'var(--error)' : 'white' }}>{roundTimeLeft}s</div>
               </>
           )}
           {gameState === 'SELECTING' && <div>{drawerName} is choosing... ({roundTimeLeft}s)</div>}
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
          players={room.players}
          currentDrawerId={room.currentDrawer}
          myId={socket?.id}
          messages={messages}
          onSendMessage={(msg) => {
              if(isMyTurn && gameState === 'DRAWING') return;
              socket.emit('send_chat', { roomCode, message: msg });
          }}
          chatPlaceholder={isMyTurn && gameState === 'DRAWING' ? "You cannot guess while drawing!" : "Type your guess here..."}
          chatDisabled={isMyTurn && gameState === 'DRAWING'}
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
                isHost={isHost} players={room.players} gameType="draw"
                duration={duration} setDuration={setDuration}
                turnTime={turnTime} setTurnTime={setTurnTime}
                hardcore={hardcore} setHardcore={setHardcore}
                teamMode={teamMode} setTeamMode={setTeamMode}
                videoEnabled={videoEnabledSetting} setVideoEnabled={setVideoEnabledSetting}
                onStart={startGame} isPlaying={gameState !== 'LOBBY' && gameState !== 'GAME_OVER'}
                setTeamConfig={setTeamConfig} teamConfig={teamConfig}
                onUpdateSettings={(settings) => socket.emit('update_settings', { roomCode, settings })}
            />
          }
      >
             {/* MAIN GAME CONTENT (CANVAS) */}
             <div style={{
                 padding: '10px',
                 background: 'rgba(0,0,0,0.2)',
                 textAlign: 'center',
                 display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '5px'
             }}>
                 {isMyTurn && gameState === 'DRAWING' ? (
                     <span style={{ fontSize: '1.5rem', fontWeight: 'bold', letterSpacing: '3px', color: 'var(--accent)' }}>Draw: {currentWord}</span>
                 ) : (
                     <div style={{ textAlign: 'center' }}>
                         {gameState === 'SELECTING' ? (
                             <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{drawerName} is choosing a word...</div>
                         ) : (
                             <>
                             <div style={{ fontSize: '1.5rem', fontWeight: 'bold', letterSpacing: '3px' }}>{maskedWord || 'WAITING...'}</div>
                             {gameState === 'DRAWING' && (
                                <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                    <Pencil size={14} /> {drawerName} is drawing
                                </div>
                             )}
                             </>
                         )}
                     </div>
                 )}
                 {isMyTurn && gameState === 'DRAWING' && (
                    <button onClick={() => { clearCanvas(); socket.emit('draw_stroke', { roomCode, data: { type: 'clear' } }); }} style={{ fontSize: '0.8rem', padding: '5px 10px', background: 'var(--error)', border: 'none', borderRadius: '4px', color: 'white', marginTop: '5px' }}>Clear</button>
                 )}
             </div>

             {/* NOTIFICATION */}
             {notification && (
                <div style={{ position: 'absolute', top: '80px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(34, 197, 94, 0.95)', color: 'white', padding: '10px 25px', borderRadius: '50px', fontWeight: 'bold', zIndex: 100, animation: 'pulse 0.5s ease-in-out', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <PartyPopper size={24} /> {notification}
                </div>
             )}

             {/* CANVAS */}
             <div style={{ flex: 1, position: 'relative', cursor: isMyTurn ? 'crosshair' : 'default', touchAction: 'none' }}>
                  <canvas
                    ref={canvasRef}
                    width={800} height={600}
                    style={{ width: '100%', height: '100%', background: 'white', borderRadius: '0 0 12px 12px' }}
                    onMouseDown={startDrawingBetter} onMouseMove={drawBetter}
                    onMouseUp={stopDrawing} onMouseLeave={stopDrawing}
                    onTouchStart={startDrawingBetter} onTouchMove={drawBetter} onTouchEnd={stopDrawing}
                  />
                  {/* WORD SELECTION */}
                  {isMyTurn && gameState === 'SELECTING' && (
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                          <h2 style={{ marginBottom: '20px' }}>Choose a Word!</h2>
                          <div style={{ display: 'flex', gap: '20px' }}>
                              {wordChoices.map((choice:any) => (
                                  <button key={choice.word} onClick={() => selectWord(choice.word)} className="btn-primary" style={{ padding: '20px 40px', fontSize: '1.5rem', background: choice.difficulty === 1 ? '#22c55e' : (choice.difficulty === 2 ? '#eab308' : '#ef4444') }}>
                                      {choice.word}
                                      <div style={{ fontSize: '0.9rem', marginTop: '5px', opacity: 0.8 }}>{choice.difficulty === 1 ? 'Easy' : (choice.difficulty === 2 ? 'Medium' : 'Hard')}</div>
                                  </button>
                              ))}
                          </div>
                      </div>
                  )}

                  {/* GAME OVER OVERLAYS */}
                   {((gameState === 'ROUND_END' && roundResult) || (gameState === 'GAME_OVER' && gameOver)) && (
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 20 }}>
                          <h2>{gameState === 'GAME_OVER' ? 'Game Over!' : 'Round Over!'}</h2>
                          {gameState === 'ROUND_END' && roundResult && <h1 style={{ fontSize: '4rem', color: 'var(--accent)', margin: '10px 0' }}>{roundResult.answer}</h1>}
                           {gameState === 'GAME_OVER' && gameOver && (
                                <GameOverLeaderboard players={gameOver.players} teams={gameOver.teams} isHost={isHost} onRestart={startGame} />
                           )}
                      </div>
                   )}
              </div>

                 {/* Team Settings Modal */}
                 <TeamSettingsModal
                    isOpen={showTeamModal}
                    onClose={() => setShowTeamModal(false)}
                    onConfirm={(config) => {
                        setTeamConfig(config);
                        setShowTeamModal(false);
                    }}
                    players={room.players}
                    gameType="draw"
                    currentConfig={teamConfig}
                />

              {/* TOOLS */}
             {isMyTurn && gameState === 'DRAWING' && (
                 <div style={{ padding: '10px', background: '#333', display: 'flex', gap: '10px', justifyContent: 'center' }}>
                     {['#000000', '#ef4444', '#22c55e', '#3b82f6', '#eab308', '#a855f7', '#ec4899', '#ffffff'].map(c => (
                         <div key={c} onClick={() => setColor(c)} style={{ width: '30px', height: '30px', borderRadius: '50%', background: c, border: color === c ? '3px solid white' : '1px solid gray', cursor: 'pointer' }} />
                     ))}
                     <div style={{ width: '2px', background: 'gray', margin: '0 10px' }} />
                     {[2, 5, 10, 20].map(s => (
                         <div key={s} onClick={() => setLineWidth(s)} style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#555', display: 'flex', alignItems: 'center', justifyContent: 'center', border: lineWidth === s ? '2px solid white' : 'none', cursor: 'pointer' }}>
                             <div style={{ width: `${s}px`, height: `${s}px`, background: 'white', borderRadius: '50%' }} />
                         </div>
                     ))}
                 </div>
             )}
      </GameLayout>
  );
}
