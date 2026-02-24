import React, { useState, useEffect } from 'react';
import { User, Group } from '../types';
import { Plus, Search, Lock, Unlock, Users, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  user: User;
  onJoinGroup: (group: Group) => void;
}

export default function GroupList({ user, onJoinGroup }: Props) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupPass, setNewGroupPass] = useState('');
  const [loading, setLoading] = useState(false);
  const [joiningGroupId, setJoiningGroupId] = useState<string | null>(null);
  const [passwordInput, setPasswordInput] = useState('');

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    const res = await fetch('/api/groups');
    const data = await res.json();
    setGroups(data);
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newGroupName,
          description: newGroupDesc,
          password: newGroupPass,
          admin_id: user.id,
        }),
      });
      if (res.ok) {
        const newGroup = await res.json();
        setGroups([newGroup, ...groups]);
        setShowCreate(false);
        setNewGroupName('');
        setNewGroupDesc('');
        setNewGroupPass('');
        onJoinGroup(newGroup);
      }
    } catch (error) {
      console.error('Failed to create group:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinClick = (group: Group) => {
    if (group.password) {
      setJoiningGroupId(group.id);
      setPasswordInput('');
    } else {
      onJoinGroup(group);
    }
  };

  const verifyPasswordAndJoin = (group: Group) => {
    if (passwordInput === group.password) {
      onJoinGroup(group);
    } else {
      alert('Incorrect password');
    }
  };

  const filteredGroups = groups.filter(g => 
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    g.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">Chat Groups</h1>
          <p className="text-zinc-500">Discover and join secure conversations</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center justify-center gap-2 bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-emerald-600 transition-all shadow-sm shadow-emerald-500/20"
        >
          <Plus className="w-5 h-5" />
          Create Group
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
        <input
          type="text"
          placeholder="Search groups by name or description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-4 rounded-2xl border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all shadow-sm"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AnimatePresence>
          {filteredGroups.map((group) => (
            <motion.div
              key={group.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white p-5 rounded-2xl border border-zinc-200 hover:border-emerald-500/50 transition-all group cursor-pointer shadow-sm"
              onClick={() => handleJoinClick(group)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="bg-zinc-50 p-3 rounded-xl group-hover:bg-emerald-50 transition-colors">
                  <Users className="w-6 h-6 text-zinc-400 group-hover:text-emerald-500 transition-colors" />
                </div>
                {group.password ? (
                  <div className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-md">
                    <Lock className="w-3 h-3" />
                    SECURE
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                    <Unlock className="w-3 h-3" />
                    OPEN
                  </div>
                )}
              </div>
              
              <h3 className="text-lg font-bold text-zinc-900 group-hover:text-emerald-600 transition-colors">{group.name}</h3>
              <p className="text-zinc-500 text-sm line-clamp-2 mt-1 mb-4 h-10">
                {group.description || 'No description provided.'}
              </p>

              <div className="flex items-center justify-between pt-4 border-t border-zinc-50">
                <span className="text-xs text-zinc-400 font-medium">
                  Created {new Date(group.created_at).toLocaleDateString()}
                </span>
                <div className="flex items-center gap-1 text-emerald-600 font-bold text-sm">
                  Join Room
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>

              {joiningGroupId === group.id && (
                <div 
                  className="mt-4 p-4 bg-zinc-50 rounded-xl space-y-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Password Required</p>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      placeholder="Enter password"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-lg border border-zinc-200 focus:outline-none focus:border-emerald-500 text-sm"
                      autoFocus
                    />
                    <button
                      onClick={() => verifyPasswordAndJoin(group)}
                      className="bg-zinc-900 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-zinc-800"
                    >
                      Join
                    </button>
                    <button
                      onClick={() => setJoiningGroupId(null)}
                      className="text-zinc-400 hover:text-zinc-600 text-sm font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Create Group Modal */}
      <AnimatePresence>
        {showCreate && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <h2 className="text-2xl font-bold text-zinc-900 mb-2">Create New Group</h2>
                <p className="text-zinc-500 text-sm mb-6">Set up a new space for your community</p>

                <form onSubmit={handleCreateGroup} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Group Name</label>
                    <input
                      type="text"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      placeholder="e.g. Design Enthusiasts"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Description</label>
                    <textarea
                      value={newGroupDesc}
                      onChange={(e) => setNewGroupDesc(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none h-20"
                      placeholder="What is this group about?"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Password (Optional)</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                      <input
                        type="password"
                        value={newGroupPass}
                        onChange={(e) => setNewGroupPass(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                        placeholder="Leave blank for public access"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowCreate(false)}
                      className="flex-1 px-4 py-3 rounded-xl border border-zinc-200 font-semibold text-zinc-600 hover:bg-zinc-50 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading || !newGroupName.trim()}
                      className="flex-1 bg-zinc-900 text-white px-4 py-3 rounded-xl font-semibold hover:bg-zinc-800 disabled:opacity-50 transition-all"
                    >
                      {loading ? 'Creating...' : 'Create Group'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
