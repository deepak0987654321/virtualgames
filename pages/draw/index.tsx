import { useRouter } from 'next/router';
import io from 'socket.io-client';
import { useAuth } from '../../hooks/useAuth';
import GameLobby, { RoomCreationParams } from '../../components/game/GameLobby';

export default function DrawLobby() {
  const { user } = useAuth();
  const router = useRouter();

  const handleCreateDrawRoom = (params: RoomCreationParams) => {
      const socket = io();
      const pId = user?.playerId;

      socket.emit('create_room', {
            name: params.name,
            gameType: 'draw',
            company: params.company,
            product: params.product,
            avatar: params.avatar,
            playerId: pId,
            roomCode: params.roomCode,
            config: params.config
      }, (response: any) => {
        if (response.success) {
          router.push(`/draw/room/${response.roomCode}?name=${encodeURIComponent(params.name)}&avatar=${encodeURIComponent(params.avatar)}&playerId=${pId || ''}`);
        }
      });
  };

  return (
      <GameLobby
          title="Draw & Guess"
          description="Sketch masterpieces. Guess the mess."
          gameType="draw"
          gradient="linear-gradient(to right, #22d3ee, #3b82f6)"
          onCreateRoom={handleCreateDrawRoom}
          rules={[
            "One player draws a word.",
            "Others try to guess it.",
            "Type your guess in chat to score.",
            "Draw quickly and clearly!"
          ]}
      />
  );
}
