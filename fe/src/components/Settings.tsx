import { useState } from 'react';
import { X, Save, Key, Shield, ShieldOff } from 'lucide-react';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Settings({ isOpen, onClose }: SettingsProps) {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem('admin_mode') === 'true');
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    localStorage.setItem('gemini_api_key', apiKey);
    localStorage.setItem('admin_mode', isAdmin ? 'true' : 'false');
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md glass-panel rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Settings</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-text-dim hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-text-dim mb-2">
              <Key size={16} />
              Gemini API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your Google AI Studio API key"
              className="w-full bg-white/5 border border-glass-border rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all"
            />
            <p className="text-xs text-text-dim mt-2">
              Get your API key from{' '}
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                Google AI Studio
              </a>
            </p>
          </div>

          <div className="flex items-center justify-between p-3 bg-white/5 border border-glass-border rounded-xl">
            <div className="flex items-center gap-3">
              {isAdmin ? <Shield size={20} className="text-green-400" /> : <ShieldOff size={20} className="text-text-dim" />}
              <div>
                <p className="text-sm font-medium text-white">Admin Mode</p>
                <p className="text-xs text-text-dim">Allow access to sensitive data</p>
              </div>
            </div>
            <button
              onClick={() => setIsAdmin(!isAdmin)}
              className={`relative w-12 h-6 rounded-full transition-colors ${isAdmin ? 'bg-green-500' : 'bg-white/20'}`}
            >
              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${isAdmin ? 'translate-x-7' : 'translate-x-1'}`} />
            </button>
          </div>

          <button
            onClick={handleSave}
            className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-cyan-300 text-background-dark font-semibold py-3 rounded-xl transition-colors"
          >
            <Save size={18} />
            {saved ? 'Saved!' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}