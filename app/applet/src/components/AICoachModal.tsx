import React, { useState } from 'react';
import { X, Sparkles, Send, Bot, User, Award, Zap } from 'lucide-react';

interface AICoachModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentScore: number;
  speed: number;
  obstaclesDodged: number;
  gameMode: string;
}

export const AICoachModal: React.FC<AICoachModalProps> = ({
  isOpen,
  onClose,
  currentScore,
  speed,
  obstaclesDodged,
  gameMode
}) => {
  const [messages, setMessages] = useState<Array<{ sender: 'ai' | 'user'; text: string }>>([
    {
      sender: 'ai',
      text: `Hello, Runner! I am your Gemini AI Dino Coach powered by High Thinking Mode (model: gemini-4-carbon). Ask me for tactical advice, jump timing tips, or lore about surviving the meteorite storm!`
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputQuery.trim() || loading) return;

    const userText = inputQuery.trim();
    setInputQuery('');
    setMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setLoading(true);

    try {
      const res = await fetch('/api/ai-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          score: currentScore,
          speed,
          obstaclesDodged,
          gameMode,
          question: userText
        })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { sender: 'ai', text: data.advice || "Keep running and jump with precise timing!" }]);
    } catch (err) {
      setMessages(prev => [...prev, { sender: 'ai', text: "🦖 Coach Connection Error: Unable to reach Gemini AI right now. Remember: anticipation is key when speed exceeds 12!" }]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAsk = (question: string) => {
    setInputQuery(question);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-900/50 via-slate-900 to-indigo-900/50 p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-white flex items-center gap-2">
                Gemini AI Dino Coach
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono">
                  High Thinking Mode
                </span>
              </h2>
              <p className="text-xs text-slate-400">Powered by Gemini AI (model: gemini-4-carbon)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Pill */}
        <div className="bg-slate-950/50 px-4 py-2 border-b border-slate-800 flex items-center justify-around text-xs text-slate-300">
          <div>Score: <span className="text-emerald-400 font-mono font-bold">{currentScore}</span></div>
          <div>Speed: <span className="text-cyan-400 font-mono font-bold">{speed.toFixed(1)}</span></div>
          <div>Dodged: <span className="text-amber-400 font-mono font-bold">{obstaclesDodged}</span></div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex items-start gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                msg.sender === 'user' ? 'bg-emerald-600 text-white' : 'bg-purple-600/30 border border-purple-500/40 text-purple-300'
              }`}>
                {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div className={`max-w-[80%] p-3.5 rounded-2xl text-sm leading-relaxed shadow-md ${
                msg.sender === 'user'
                  ? 'bg-emerald-600 text-white rounded-tr-none'
                  : 'bg-slate-800/90 border border-slate-700/80 text-slate-200 rounded-tl-none'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300 animate-pulse">
                <Sparkles className="w-4 h-4 animate-spin" />
              </div>
              <div className="bg-slate-800/90 border border-slate-700/80 p-3.5 rounded-2xl rounded-tl-none text-slate-400 text-sm flex items-center gap-2">
                <Zap className="w-4 h-4 text-purple-400 animate-bounce" />
                <span>Gemini AI is analyzing game physics with High Thinking Mode...</span>
              </div>
            </div>
          )}
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-4 py-2 bg-slate-950/40 border-t border-slate-800 flex gap-2 overflow-x-auto">
          <button
            onClick={() => handleQuickAsk("How do I time jumps over fast pterodactyls?")}
            className="text-xs px-3 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/30 whitespace-nowrap transition-colors"
          >
            pterodactyl timing tips
          </button>
          <button
            onClick={() => handleQuickAsk("What's the best strategy for high speeds above 15?")}
            className="text-xs px-3 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/30 whitespace-nowrap transition-colors"
          >
            high speed survival strategy
          </button>
          <button
            onClick={() => handleQuickAsk("Analyze my current run performance!")}
            className="text-xs px-3 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/30 whitespace-nowrap transition-colors"
          >
            analyze my current run
          </button>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSendMessage} className="p-4 bg-slate-900 border-t border-slate-800 flex gap-2">
          <input
            type="text"
            value={inputQuery}
            onChange={e => setInputQuery(e.target.value)}
            placeholder="Ask your AI Coach anything about the game..."
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-purple-500 transition-colors"
          />
          <button
            type="submit"
            disabled={loading || !inputQuery.trim()}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-500/20 transition-all flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            <span>Send</span>
          </button>
        </form>
      </div>
    </div>
  );
};
