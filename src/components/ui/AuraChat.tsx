import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '@/lib/api';
import ReactMarkdown from 'react-markdown';

interface AuraChatProps {
  onClose: () => void;
  onRefreshData: () => void;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function AuraChat({ onClose, onRefreshData }: AuraChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Halo! Saya AURA_CORE, asisten keuangan cerdas Anda. Ketikkan transaksi Anda (misal: 'Makan McD 50rb') atau tanyakan status budget Anda." }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await api.post('/ai/chat', { message: userMessage });
      const { markdown, jsonData } = response.data;
      
      setMessages(prev => [...prev, { role: 'assistant', content: markdown }]);
      
      // If there was a JSON action (like a logged transaction), refresh the dashboard
      if (jsonData && jsonData.transaction) {
        onRefreshData();
      }
      
    } catch (error) {
      console.error("AI Chat error:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: "Maaf, sistem AURA_CORE sedang mengalami gangguan." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-24 right-6 md:bottom-24 md:right-12 w-80 md:w-96 bg-white rounded-2xl shadow-2xl overflow-hidden z-50 flex flex-col h-[500px] max-h-[80vh] border border-gray-100">
      {/* Header */}
      <div className="bg-slate-900 px-4 py-3 flex items-center justify-between text-white shadow-md z-10">
        <div className="flex items-center gap-2">
          <div className="bg-cyan-500/20 p-1.5 rounded-lg">
            <Bot size={20} className="text-cyan-400" />
          </div>
          <div>
            <h3 className="font-bold text-sm tracking-wide text-cyan-50">AURA_CORE</h3>
            <p className="text-[10px] text-cyan-400/80 font-mono">FINANCIAL OS v2.0</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
          <X size={18} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 relative">
        {messages.map((msg, idx) => (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm
                ${msg.role === 'user' 
                  ? 'bg-slate-900 text-white rounded-br-none' 
                  : 'bg-white border border-gray-100 text-gray-800 rounded-bl-none markdown-body text-xs'
                }
              `}
            >
              {msg.role === 'assistant' ? (
                <div className="prose prose-sm prose-p:my-1 prose-h3:text-sm prose-h3:my-2 prose-table:my-2 max-w-none">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <p>{msg.content}</p>
              )}
            </div>
          </motion.div>
        ))}
        
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm flex items-center gap-2 text-xs text-gray-500 font-mono">
              <Loader2 size={14} className="animate-spin text-cyan-600" />
              <span>AURA_CORE IS THINKING...</span>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="p-3 bg-white border-t border-gray-100">
        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Log transaksi atau tanya AURA..."
            className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all placeholder:text-gray-400 text-slate-800"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 p-1.5 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50 disabled:hover:bg-cyan-600 transition-colors"
          >
            <Send size={16} className="ml-0.5" />
          </button>
        </div>
      </form>
    </div>
  );
}
