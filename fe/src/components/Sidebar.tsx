import { Plus, History, Bookmark, Settings, HelpCircle, MoreVertical } from 'lucide-react';

interface SidebarProps {
  onSettingsClick?: () => void;
}

export default function Sidebar({ onSettingsClick }: SidebarProps) {
  return (
    <aside className="w-[280px] hidden md:flex flex-col border-r border-glass-border bg-black/10 flex-shrink-0 z-20">
      <div className="p-6 flex flex-col h-full justify-between">
        <div className="flex flex-col gap-8">
          {/* Branding */}
          <div className="flex items-center gap-3 px-2">
            <div 
              className="bg-center bg-no-repeat bg-cover rounded-xl h-10 w-10 shadow-lg shadow-accent/20" 
              style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDeYfTroBtkYL-wWPVskDOgTZ9ob3Ezx5eGgdOvw9qHYTF2uvbOQDnAsvFw1rojPd0NOnvYtE1QGJKTcQz_oX3hFrRUvaqz6JZImCF2QEcx8JSn0HSRT84KgrwGUi05Qk63xwuRiwO7nIyCLq3CivL0KkQCTCFFChvD35Idk3XQKCRlkGuIomsfkdsV6n-cmJCd62E43JLgIKyWNXNhtf2IbAOp8SNpJ1nkE7c3LW4yXvbjjqprkNcHHTOhiad0GeM6mYFHCLcH2w")' }}
            />
            <div className="flex flex-col">
              <h1 className="text-white text-lg font-bold leading-none tracking-tight">Savia</h1>
              <p className="text-text-dim text-xs font-medium pt-1">Neuro-symbolic AI</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex flex-col gap-2">
            <button className="flex items-center gap-3 px-4 py-3 rounded-xl bg-glass-bg text-white border border-glass-border shadow-lg transition-all hover:bg-white/20">
              <Plus size={20} className="text-accent" />
              <span className="text-sm font-semibold">New Chat</span>
            </button>

            <div className="pt-4 flex flex-col gap-1">
              <p className="px-4 text-xs font-semibold text-text-dim uppercase tracking-wider mb-2">Library</p>
              <button className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-white/5 text-text-dim hover:text-white transition-colors group">
                <History size={20} className="text-text-dim group-hover:text-accent transition-colors" />
                <span className="text-sm font-medium">History</span>
              </button>
              <button className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-white/5 text-text-dim hover:text-white transition-colors group">
                <Bookmark size={20} className="text-text-dim group-hover:text-accent transition-colors" />
                <span className="text-sm font-medium">Saved</span>
              </button>
            </div>

            <div className="pt-4 flex flex-col gap-1">
              <p className="px-4 text-xs font-semibold text-text-dim uppercase tracking-wider mb-2">System</p>
              <button onClick={onSettingsClick} className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-white/5 text-text-dim hover:text-white transition-colors group">
                <Settings size={20} className="text-text-dim group-hover:text-accent transition-colors" />
                <span className="text-sm font-medium">Settings</span>
              </button>
              <button className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-white/5 text-text-dim hover:text-white transition-colors group">
                <HelpCircle size={20} className="text-text-dim group-hover:text-accent transition-colors" />
                <span className="text-sm font-medium">Help & Support</span>
              </button>
            </div>
          </nav>
        </div>

        {/* User Profile */}
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-glass-border mt-auto cursor-pointer hover:border-accent/50 transition-colors">
          <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-purple-500 to-accent flex items-center justify-center text-xs font-bold text-white border-2 border-accent">JD</div>
          <div className="flex flex-col overflow-hidden">
            <p className="text-sm font-semibold text-white truncate">John Doe</p>
            <p className="text-xs text-text-dim truncate">Pro Plan</p>
          </div>
          <MoreVertical size={18} className="text-text-dim ml-auto" />
        </div>
      </div>
    </aside>
  );
}
