import { useState, useRef } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ChatStream from './components/ChatStream';
import InputComposer from './components/InputComposer';
import Settings from './components/Settings';
import type { Message } from './types';
import { api } from './services/api';
import { speak } from './services/elevenlabs';
import { Menu } from 'lucide-react';

interface MessageWithAudio extends Message {
  audioUrl?: string;
  audioError?: string;
}

export default function App() {
  const [showSettings, setShowSettings] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [messages, setMessages] = useState<MessageWithAudio[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I am Savia. Please add your Gemini API key in Settings first, then ask me anything!',
      timestamp: new Date(),
    }
  ]);
  const [isThinking, setIsThinking] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const chatRef = useRef<number>(0);

const toggleVoiceMode = () => {
    setIsVoiceMode(prev => !prev);
  };

  const handleSend = async (text: string) => {
    const userMsg: MessageWithAudio = {
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

      const assistantMsg: MessageWithAudio = {
        id: (++chatRef.current).toString(),
        role: 'assistant',
        content: data.text,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMsg]);
      setIsThinking(false);

      const { url, error } = await speak(data.text, data.voice_instruction as "stable" | "expressive");
      if (url) {
        setMessages(prev => prev.map(m =>
          m.id === assistantMsg.id ? { ...m, audioUrl: url, audioError: undefined } : m
        ));
      } else if (error) {
        setMessages(prev => prev.map(m =>
          m.id === assistantMsg.id ? { ...m, audioUrl: undefined, audioError: error } : m
        ));
      }
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
    <div className="h-screen w-full flex items-center justify-center p-0 sm:p-4 md:p-6 lg:p-8">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setShowSidebar(true)}
        className="fixed top-4 left-4 z-30 p-2 rounded-lg bg-white/10 backdrop-blur-md border border-glass-border text-white md:hidden"
      >
        <Menu size={24} />
      </button>

      {/* Sidebar Overlay */}
      {showSidebar && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setShowSidebar(false)}
        />
      )}

      {/* Sidebar for Mobile */}
      <div className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 md:hidden ${showSidebar ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-full">
          <Sidebar onSettingsClick={() => { setShowSidebar(false); setShowSettings(true); }} />
        </div>
      </div>

      {/* Main Chat Panel */}
      <div className="w-full h-full sm:max-w-4xl sm:max-h-[90vh] sm:rounded-3xl glass-panel rounded-none sm:flex overflow-hidden shadow-2xl">
        {/* Desktop Sidebar - hidden on mobile */}
        <div className="hidden md:block">
          <Sidebar onSettingsClick={() => setShowSettings(true)} />
        </div>

        <main className="flex-1 flex flex-col relative h-full">
          <Header title="Savia" onToggleVoice={toggleVoiceMode} onSettingsClick={() => setShowSettings(true)} />
          <ChatStream messages={messages} isThinking={isThinking} />
          <InputComposer onSend={handleSend} disabled={isThinking} isVoiceMode={isVoiceMode} onVoiceModeToggle={toggleVoiceMode} />
          <Settings isOpen={showSettings} onClose={() => setShowSettings(false)} />
        </main>
      </div>
    </div>
  );
}