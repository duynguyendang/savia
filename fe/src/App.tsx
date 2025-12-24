import { SaviaOrb } from './components/orb/SaviaOrb';
import { ChatInterface } from './components/chat/ChatInterface';
import { useSaviaBrain } from './hooks/useSaviaBrain';

function App() {
  const { state, transcript, lastTraceId, processInput } = useSaviaBrain();

  return (
    <div className="min-h-screen bg-background text-text flex flex-col font-sans">
      <header className="p-8 border-b border-white/5 bg-black/20 backdrop-blur-sm">
        <h1 className="text-4xl font-serif text-center text-accent tracking-[0.2em] mb-2">SAVIA</h1>
        <div className="text-center text-xs text-gray-500 font-mono tracking-widest uppercase opacity-70">Neuro-Symbolic Intelligence</div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-start p-4 gap-12 pt-12">
        <div className="w-full flex justify-center py-8">
          <SaviaOrb state={state} />
        </div>

        <div className="w-full px-4">
          <ChatInterface
            transcript={transcript}
            onSend={processInput}
            disabled={state === 'REASONING' || state === 'SPEAKING'}
          />
        </div>
      </main>

      <footer className="p-4 text-center border-t border-white/5 bg-black/40">
        <div className="flex justify-between items-center max-w-4xl mx-auto">
          <div className={`text-xs font-mono transition-colors duration-500 ${state === 'REASONING' ? 'text-purple-400' : 'text-gray-600'}`}>
            STATUS: <span className="uppercase">{state}</span>
          </div>

          <div className="text-xs font-mono text-gray-600">
            TRACE_ID: <span className="text-gray-500">{lastTraceId || "NULL"}</span>
          </div>
        </div>

        {state === 'REASONING' && (
          <div className="mt-2 text-accent text-xs animate-pulse font-mono tracking-widest">
             // ACCESSING MANGLEKIT KERNEL...
          </div>
        )}
      </footer>
    </div>
  );
}

export default App;
