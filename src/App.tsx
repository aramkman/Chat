import React, { useState, useEffect } from 'react';
import { User, Group, AppView } from './types';
import ProfileSetup from './components/ProfileSetup';
import GroupList from './components/GroupList';
import ChatRoom from './components/ChatRoom';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, User as UserIcon, MessageSquare } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<AppView>('profile');
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUserId = localStorage.getItem('chat_user_id');
    if (savedUserId) {
      fetch(`/api/users/${savedUserId}`)
        .then(res => res.json())
        .then(data => {
          if (data) {
            setUser(data);
            setView('groups');
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const handleProfileComplete = (newUser: User) => {
    setUser(newUser);
    localStorage.setItem('chat_user_id', newUser.id);
    setView('groups');
  };

  const handleJoinGroup = (group: Group) => {
    setSelectedGroup(group);
    setView('chat');
  };

  const handleLogout = () => {
    localStorage.removeItem('chat_user_id');
    setUser(null);
    setView('profile');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="animate-pulse text-zinc-400 font-medium">Loading SecureChat...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans">
      {/* Navigation Bar */}
      {user && (
        <nav className="bg-white border-b border-zinc-200 px-4 py-3 sticky top-0 z-50">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div 
              className="flex items-center gap-2 cursor-pointer" 
              onClick={() => setView('groups')}
            >
              <div className="bg-emerald-500 p-1.5 rounded-lg">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg tracking-tight">SecureChat</span>
            </div>
            
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setView('profile')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors ${view === 'profile' ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-500 hover:text-zinc-900'}`}
              >
                <img 
                  src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} 
                  alt="Avatar" 
                  className="w-6 h-6 rounded-full border border-zinc-200"
                />
                <span className="text-sm font-medium hidden sm:inline">{user.username}</span>
              </button>
              
              <button 
                onClick={handleLogout}
                className="p-2 text-zinc-400 hover:text-red-500 transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </nav>
      )}

      <main className="max-w-5xl mx-auto p-4 sm:p-6">
        <AnimatePresence mode="wait">
          {view === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <ProfileSetup 
                initialUser={user} 
                onComplete={handleProfileComplete} 
              />
            </motion.div>
          )}

          {view === 'groups' && user && (
            <motion.div
              key="groups"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <GroupList 
                user={user} 
                onJoinGroup={handleJoinGroup} 
              />
            </motion.div>
          )}

          {view === 'chat' && user && selectedGroup && (
            <motion.div
              key="chat"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="h-[calc(100vh-120px)]"
            >
              <ChatRoom 
                user={user} 
                group={selectedGroup} 
                onBack={() => setView('groups')} 
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
