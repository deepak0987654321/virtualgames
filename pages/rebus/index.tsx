import { useRouter } from 'next/router';
import io from 'socket.io-client';
import { useAuth } from '../../hooks/useAuth';
import GameLobby, { RoomCreationParams } from '../../components/game/GameLobby';

export default function RebusLobby() {
  const { user } = useAuth();
  const router = useRouter();

  const handleCreateRebusRoom = (params: RoomCreationParams) => {
      const socket = io();
      const pId = user?.playerId;
      // Rebus uses standard create_room, letting server generate code if needed,
      // but GameLobby generates one. We can pass it or let server do it?
      // Rebus implementation in server.ts expects `create_room` callback.
      // GameLobby generates `params.roomCode`.
      // Server `create_room` generates its own unless we modify it.
      // Actually server `create_room` IGNORES forced code unless we hacked it.
      // But we modified `gameManager.createRoom` to accept forcedCode.
      // So we can update client `create_room` payload to include it if we want?
      // Or just let Standard Create Room work as is.

      // Let's use the standard flow:
      socket.emit('create_room', {
            name: params.name,
            gameType: 'rebus',
            company: params.company,
            product: params.product,
            avatar: params.avatar,
            playerId: pId,
            roomCode: params.roomCode,
            config: params.config
      }, (response: any) => {
        if (response.success) {
          router.push(`/rebus/room/${response.roomCode}?name=${encodeURIComponent(params.name)}&avatar=${encodeURIComponent(params.avatar)}&playerId=${pId || ''}`);
        }
      });
  };

  return (
      <GameLobby
          title="Word Guess Game"
          description="Decipher the visual riddles using brainpower!"
          gameType="rebus"
          gradient="linear-gradient(to right, #ec4899, #8b5cf6)"
          onCreateRoom={handleCreateRebusRoom}
          rules={[
            "Decode the visual puzzle (images, symbols).",
            "Type your answer in the chat box.",
            "Faster answers get more points.",
            "Use hints if you get stuck (costs points).",
            "Highest score after all rounds wins!"
          ]}
      />
  );
}
