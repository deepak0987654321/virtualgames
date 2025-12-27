import { useRouter } from 'next/router';
import io from 'socket.io-client';
import { useAuth } from '../../hooks/useAuth';
import GameLobby, { RoomCreationParams } from '../../components/game/GameLobby';

export default function CharadesLobby() {
  const { user } = useAuth();
  const router = useRouter();

  const handleCreateCharadesRoom = (params: RoomCreationParams) => {
      const socket = io();
      const pId = user?.playerId;

      socket.emit('create_room', {
            name: params.name,
            gameType: 'charades',
            company: params.company,
            product: params.product,
            avatar: params.avatar,
            playerId: pId,
            roomCode: params.roomCode,
            config: params.config
      }, (response: any) => {
        if (response.success) {
          // Charades needs explicit audio/video on by default
          router.push(`/charades/room/${response.roomCode}?name=${encodeURIComponent(params.name)}&avatar=${encodeURIComponent(params.avatar)}&playerId=${pId || ''}&audioOn=true&videoOn=true`);
        }
      });
  };

  return (
      <GameLobby
          title="Video Charades"
          description="Act it out directly on camera!"
          gameType="charades"
          gradient="linear-gradient(to right, #f472b6, #8b5cf6)"
          onCreateRoom={handleCreateCharadesRoom}
          rules={[
            "Act out the word on camera.",
            "Others guess in the chat.",
            "No talking allowed!",
            "Score points for fast guesses."
          ]}
      />
  );
}
