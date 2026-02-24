import React, { useState, useEffect, useRef } from 'react';
import { User, Group, Message } from '../types';
import { Send, Image as ImageIcon, ArrowLeft, Trash2, Shield, Info, Unlock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  user: User;
  group: Group;
  onBack: () => void;
}

export default function ChatRoom({ user, group, onBack }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch initial messages
    fetch(`/api/groups/${group.id}/messages`)
      .then(res => res.json())
      .then(data => setMessages(data));

    // Setup WebSocket
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}`);
    
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'join', groupId: group.id, userId: user.id }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'chat') {
        setMessages(prev => [...prev, data.payload]);
      } else if (data.type === 'delete_message') {
        setMessages(prev => prev.filter(m => m.id !== data.payload.messageId));
      }
    };

    setSocket(ws);

    return () => ws.close();
  }, [group.id, user.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || !socket) return;

    socket.send(JSON.stringify({
      type: 'chat',
      content: input,
      msgType: 'text'
    }));
    setInput('');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && socket) {
      const reader = new FileReader();
      reader.onloadend = () => {
        socket.send(JSON.stringify({
          type: 'chat',
          content: reader.result as string,
          msgType: 'image'
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteMessage = (messageId: string) => {
    if (socket) {
      socket.send(JSON.stringify({
        type: 'delete_message',
        messageId,
        adminId: user.id
      }));
    }
  };

  const isAdmin = user.id === group.admin_id;

  return (
    <div className="flex flex-col h-full bg-white rounded-3xl shadow-sm border border-zinc-200 overflow-hidden">
      {/* Chat Header */}
      <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 -ml-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50 rounded-full transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-zinc-900">{group.name}</h2>
              {isAdmin && <Shield className="w-3.5 h-3.5 text-emerald-500" title="You are the admin" />}
            </div>
            <p className="text-xs text-zinc-400 font-medium">
              {messages.length} messages • {group.password ? 'Secure' : 'Public'}
            </p>
          </div>
        </div>
        <button 
          onClick={() => setShowInfo(!showInfo)}
          className={`p-2 rounded-full transition-all ${showInfo ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-400 hover:text-zinc-900'}`}
        >
          <Info className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="bg-zinc-50 p-4 rounded-full mb-4">
                <Send className="w-8 h-8 text-zinc-300" />
              </div>
              <h3 className="text-zinc-900 font-bold">No messages yet</h3>
              <p className="text-zinc-400 text-sm max-w-[200px] mt-1">Be the first to start the conversation in this group!</p>
            </div>
          )}
          
          {messages.map((msg, idx) => {
            const isMe = msg.user_id === user.id;
            const showAvatar = idx === 0 || messages[idx - 1].user_id !== msg.user_id;
            
            return (
              <div 
                key={msg.id} 
                className={`flex items-end gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <div className={`w-8 h-8 rounded-full flex-shrink-0 bg-zinc-100 border border-zinc-200 overflow-hidden ${!showAvatar && 'opacity-0'}`}>
                  <img 
                    src={msg.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.username}`} 
                    alt={msg.username} 
                    className="w-full h-full object-cover"
                  />
                </div>
                
                <div className={`flex flex-col max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
                  {showAvatar && (
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1 px-1">
                      {isMe ? 'You' : msg.username}
                    </span>
                  )}
                  
                  <div className="group relative">
                    <div className={`
                      px-4 py-2.5 rounded-2xl text-sm shadow-sm
                      ${isMe 
                        ? 'bg-zinc-900 text-white rounded-br-none' 
                        : 'bg-zinc-50 text-zinc-800 border border-zinc-100 rounded-bl-none'}
                    `}>
                      {msg.type === 'text' ? (
                        <p className="leading-relaxed">{msg.content}</p>
                      ) : (
                        <img 
                          src={msg.content} 
                          alt="Shared" 
                          className="rounded-lg max-w-full cursor-pointer hover:opacity-95 transition-opacity" 
                          onClick={() => window.open(msg.content)}
                        />
                      )}
                    </div>
                    
                    {isAdmin && (
                      <button 
                        onClick={() => handleDeleteMessage(msg.id)}
                        className={`
                          absolute top-1/2 -translate-y-1/2 p-1.5 bg-white border border-zinc-200 rounded-full text-red-500 shadow-lg opacity-0 group-hover:opacity-100 transition-all
                          ${isMe ? '-left-10' : '-right-10'}
                        `}
                        title="Delete message"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  
                  <span className="text-[9px] text-zinc-400 mt-1 px-1">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Group Info Sidebar */}
        <AnimatePresence>
          {showInfo && (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="absolute right-0 top-0 bottom-0 w-72 bg-zinc-50 border-l border-zinc-100 z-20 p-6 shadow-xl"
            >
              <h3 className="font-bold text-zinc-900 mb-4">Group Information</h3>
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Description</label>
                  <p className="text-sm text-zinc-600 leading-relaxed">{group.description || 'No description provided.'}</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Privacy</label>
                  <div className="flex items-center gap-2 text-sm text-zinc-600">
                    {group.password ? <Shield className="w-4 h-4 text-amber-500" /> : <Unlock className="w-4 h-4 text-emerald-500" />}
                    {group.password ? 'Password Protected' : 'Public Access'}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Created By</label>
                  <p className="text-sm text-zinc-600">Admin ID: {group.admin_id.slice(0, 8)}...</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-zinc-100 bg-white">
        <form onSubmit={handleSendMessage} className="flex items-center gap-3">
          <label className="p-3 text-zinc-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-xl cursor-pointer transition-all flex-shrink-0">
            <ImageIcon className="w-5 h-5" />
            <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
          </label>
          
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 bg-zinc-50 border border-zinc-100 px-4 py-3 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-sm"
          />
          
          <button
            type="submit"
            disabled={!input.trim()}
            className="p-3 bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm flex-shrink-0"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
