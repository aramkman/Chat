import React, { useState } from 'react';
import { User } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { Camera, User as UserIcon, Check } from 'lucide-react';

interface Props {
  initialUser: User | null;
  onComplete: (user: User) => void;
}

export default function ProfileSetup({ initialUser, onComplete }: Props) {
  const [username, setUsername] = useState(initialUser?.username || '');
  const [bio, setBio] = useState(initialUser?.bio || '');
  const [avatar, setAvatar] = useState(initialUser?.avatar || '');
  const [loading, setLoading] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    setLoading(true);
    const id = initialUser?.id || uuidv4();
    const userData = { id, username, bio, avatar };

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
      if (res.ok) {
        onComplete(userData);
      }
    } catch (error) {
      console.error('Failed to save profile:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-3xl shadow-sm border border-zinc-200 overflow-hidden">
      <div className="p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-zinc-900 tracking-tight">Your Profile</h2>
          <p className="text-zinc-500 text-sm mt-1">Set up your identity for SecureChat</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col items-center gap-4">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full bg-zinc-100 border-2 border-zinc-200 flex items-center justify-center overflow-hidden">
                {avatar ? (
                  <img src={avatar} alt="Avatar Preview" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-10 h-10 text-zinc-300" />
                )}
              </div>
              <label className="absolute bottom-0 right-0 bg-emerald-500 p-2 rounded-full cursor-pointer shadow-lg hover:bg-emerald-600 transition-colors">
                <Camera className="w-4 h-4 text-white" />
                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
              </label>
            </div>
            <span className="text-xs text-zinc-400 font-medium uppercase tracking-wider">Profile Photo</span>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-zinc-700 ml-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. alex_secure"
              className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-zinc-700 ml-1">Bio (Optional)</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us a bit about yourself..."
              className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none h-24"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !username.trim()}
            className="w-full bg-zinc-900 text-white py-3 rounded-xl font-semibold hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {loading ? 'Saving...' : (
              <>
                <Check className="w-5 h-5" />
                Complete Profile
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
