import { useState, useRef } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ChatStream from './components/ChatStream';
import InputComposer from './components/InputComposer';
import VoiceModeOverlay from './components/VoiceModeOverlay';
import Settings from './components/Settings';
import type { Message } from './types';
import { api } from './services/api';
import { speak } from './services/elevenlabs';

export default function App() {
  const [showSettings, setShowSettings] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I am Savia. Please add your Gemini API key in Settings first, then ask me anything!',
      timestamp: new Date(),
    }
  ]);
  const [isThinking, setIsThinking] = useState(false);
  const chatRef = useRef<number>(0);

  const handleSend = async (text: string) => {
    const userMsg: Message = {
      id: (++chatRef.current).toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setIsThinking(true);

    try {
      const { data } = await api.post('/v1/reason', {
        user_id: "demo_user",
        message: text
      });

      const assistantMsg: Message = {
        id: (++chatRef.current).toString(),
        role: 'assistant',
        content: data.text,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMsg]);
      setIsThinking(false);

      await speak(data.text, data.voice_instruction as "stable" | "expressive");
    } catch (error) {
      console.error('Chat error:', error);
      setIsThinking(false);
      const errorMsg = error instanceof Error ? error.message : 'Connection failed. Check API key in Settings.';
      setMessages(prev => [...prev, {
        id: (++chatRef.current).toString(),
        role: 'assistant',
        content: errorMsg,
        timestamp: new Date(),
      }]);
    }
  };

  return (
    <div className="h-screen w-full flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-6xl h-full max-h-[800px] glass-panel rounded-[32px] flex overflow-hidden shadow-2xl">
        <Sidebar onSettingsClick={() => setShowSettings(true)} />
        <main className="flex-1 flex flex-col relative h-full">
          <Header title="Savia Assistant" onToggleVoice={() => setIsVoiceMode(true)} />
          <ChatStream messages={messages} isThinking={isThinking} />
          <InputComposer onSend={handleSend} disabled={isThinking} onVoiceMode={() => setIsVoiceMode(true)} />
          <Settings isOpen={showSettings} onClose={() => setShowSettings(false)} />
        </main>
      </div>

      <VoiceModeOverlay isOpen={isVoiceMode} onClose={() => setIsVoiceMode(false)} />
    </div>
  );
}