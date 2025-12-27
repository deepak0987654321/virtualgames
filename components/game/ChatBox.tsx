import { useRef, useEffect, useState } from 'react';
import { Send } from 'lucide-react';

interface ChatMessage {
  id: string;
  type: 'chat' | 'success' | 'warning' | 'info';
  text: string;
  playerName?: string;
}

interface ChatBoxProps {
  messages: ChatMessage[];
  onSendMessage: (msg: string) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  clearInputTrigger?: number; // When this changes, clear the input
}

export default function ChatBox({ messages, onSendMessage, className = '', placeholder = 'Type here...', disabled = false, clearInputTrigger }: ChatBoxProps) {
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Clear input when clearInputTrigger changes (e.g., new round starts)
  useEffect(() => {
    if (clearInputTrigger !== undefined) {
      setInput('');
    }
  }, [clearInputTrigger]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !disabled) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  return (
    <div className={`glass-panel ${className}`} style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '20px', minHeight: 0 }}>
      {/* ... messages ... */}
      <div className="messages" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '10px' }}>
        {messages.map((m) => (
          <div key={m.id || Math.random()} className={`message ${m.type || 'chat'}`}>
            {m.type === 'chat' && <strong>{m.playerName}: </strong>}
            {m.text}
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <form onSubmit={handleSubmit} style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '10px', display: 'flex', gap: '8px' }}>
        <input
          type="text"
          className="input-field"
          style={{ flex: 1, marginBottom: 0 }}
          placeholder={placeholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={disabled}
        />
        <button
            type="submit"
            className="btn-primary"
            disabled={disabled}
            style={{ padding: '0 15px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
            <Send size={18} />
        </button>
      </form>
    </div>
  );
}
