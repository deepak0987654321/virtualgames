import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import io from 'socket.io-client';
import { useAuth } from '../../hooks/useAuth';
import GameLobby, { RoomCreationParams } from '../../components/game/GameLobby';

const DEFAULT_CATEGORIES = ['Name', 'Place', 'Thing', 'Animal'];

export default function CategoriesLobby() {
  const { user } = useAuth();
  const router = useRouter();

  // Game Config State
  const [categories, setCategories] = useState<string[]>([...DEFAULT_CATEGORIES]);
  const [allowedLetters, setAllowedLetters] = useState('ABCDEFGHIJKLMNOPRSTUVW');
  const [socket, setSocket] = useState<any>(null);

  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);
    return () => { newSocket.close(); }
  }, []);

  // Config Handlers
  const addCategory = () => { if (categories.length < 6) setCategories([...categories, '']); };
  const removeCategory = (index: number) => { if (categories.length > 3) setCategories(categories.filter((_, i) => i !== index)); };
  const updateCategory = (index: number, val: string) => {
      const newCats = [...categories];
      newCats[index] = val;
      setCategories(newCats);
  };

  const toggleLetter = (char: string) => {
      if (allowedLetters.includes(char)) {
          if (allowedLetters.length > 1) {
              setAllowedLetters(allowedLetters.replace(char, ''));
          }
      } else {
          setAllowedLetters((allowedLetters + char).split('').sort().join(''));
      }
  };

  const handleCreateRoom = (params: RoomCreationParams) => {
      const validCategories = categories.filter(c => c.trim() !== '');
      if (validCategories.length < 3) {
          alert('Need at least 3 categories');
          return;
      }

      const pId = user?.playerId;

      socket.emit('categories:create_session', {
            roomCode: params.roomCode,
            hostId: pId,
            hostName: params.name,
            company: params.company,
            product: params.product,
            config: {
                categories: validCategories,
                totalRounds: Math.max(1, Math.floor((params.config.gameDuration * 60) / params.config.roundTime)),
                roundDuration: params.config.roundTime,
                allowedLetters: allowedLetters
            }
    }, (response: any) => {
      if (response.success) {
        router.push(`/categories/room/${params.roomCode}?sessionId=${response.sessionId}&name=${encodeURIComponent(params.name)}&avatar=${encodeURIComponent(params.avatar)}&playerId=${pId}`);
      } else {
        alert(response.error);
      }
    });
  };

  return (
      <GameLobby
          title="Categories"
          description="Name, Place, Thing, Animal - Fast Paced Fun!"
          gameType="categories"
          onCreateRoom={handleCreateRoom}
          additionalSettings={(
              <div style={{ textAlign: 'left', marginTop: '10px' }}>
                  <div style={{ marginBottom: '15px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                          <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#94a3b8' }}>CATEGORIES ({categories.length}/6)</label>
                          <button onClick={addCategory} disabled={categories.length >= 6} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '0.8rem' }}>+ ADD</button>
                      </div>
                       <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                           {categories.map((cat, i) => (
                               <div key={i} style={{ display: 'flex', gap: '5px' }}>
                                   <input
                                       value={cat}
                                       onChange={(e) => updateCategory(i, e.target.value)}
                                       className="input-field"
                                       style={{ padding: '8px', fontSize: '0.9rem' }}
                                   />
                                   {categories.length > 3 && (
                                       <button onClick={() => removeCategory(i)} style={{ color: '#ef4444', background: 'none' as 'none', border: 'none', cursor: 'pointer' }}>×</button>
                                   )}
                               </div>
                           ))}
                       </div>
                   </div>

                   {/* Suggestions Bar */}
                   <div style={{ marginTop: '10px' }}>
                        <label style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>
                            Quick Add Suggestions
                        </label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {['Food', 'Movies', 'Brand', 'Object', 'Software', 'Country', 'Cartoon', 'Superhero'].map(tag => (
                                <button
                                    key={tag}
                                    type="button"
                                    onClick={() => {
                                        if (categories.includes(tag)) return;
                                        const emptyIdx = categories.findIndex(c => c === '');
                                        if (emptyIdx !== -1) {
                                            updateCategory(emptyIdx, tag);
                                        } else if (categories.length < 6) {
                                            setCategories([...categories, tag]);
                                        }
                                    }}
                                    style={{
                                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                        color: '#94a3b8', padding: '4px 10px', borderRadius: '20px',
                                        fontSize: '0.7rem', cursor: 'pointer', transition: 'all 0.2s',
                                        fontWeight: 600
                                    }}
                                >
                                    + {tag}
                                </button>
                            ))}
                        </div>
                   </div>

                   {/* Allowed Letters Selector */}
                   <div style={{ marginTop: '15px', padding: '12px', background: 'rgba(0,0,0,0.15)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                           <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                               Allowed Letters ({allowedLetters.length})
                           </label>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(char => {
                                const isActive = allowedLetters.includes(char);
                                return (
                                    <button
                                       key={char}
                                       type="button"
                                       onClick={() => toggleLetter(char)}
                                       style={{
                                           width: '22px', height: '22px', borderRadius: '4px', border: isActive ? '1px solid #dbfd60' : '1px solid rgba(255,255,255,0.1)',
                                           background: isActive ? '#dbfd60' : 'transparent', color: isActive ? 'black' : '#64748b',
                                           fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s'
                                       }}
                                    >
                                        {char}
                                    </button>
                                );
                            })}
                        </div>
                   </div>
              </div>
          )}
          rules={[
            "A letter is chosen each round.",
            "Fill in words for each category.",
            "Words must start with the letter.",
            "Vote on answers to score points."
          ]}
      />
  );
}
