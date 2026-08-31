import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  Sparkles, 
  X, 
  Send, 
  Bot, 
  User, 
  Lightbulb, 
  Loader2, 
  RotateCcw,
  AlertCircle,
  MessageSquareQuote
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';

export interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  isError?: boolean;
}

export const AIAdvisorModal: React.FC = () => {
  const { currentUser } = useAuth();
  const { isAdvisorModalOpen, closeAdvisorModal } = useApp();

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const getInitialGreeting = (): Message => ({
    id: 'init',
    sender: 'assistant',
    text: `Hello ${currentUser?.name || 'there'}! I am your **MentorNexus AI Career & Mentorship Advisor**.\n\nI have full conversational memory for this session, so feel free to ask questions, explore scenarios, ask for specific examples, or refine any topic step-by-step.\n\nHow can I help accelerate your growth today?`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });

  const [messages, setMessages] = useState<Message[]>([getInitialGreeting()]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isAdvisorModalOpen) {
      scrollToBottom();
    }
  }, [messages, loading, isAdvisorModalOpen]);

  if (!isAdvisorModalOpen) return null;

  const quickPrompts = [
    'How do I structure my first 30-minute mentorship session?',
    'What strategic questions should I ask a Staff Systems Architect?',
    'How can I break down a 60-day goal into weekly deliverables?',
    'Frameworks for navigating promotions to senior engineering roles'
  ];

  const handleResetChat = () => {
    setMessages([getInitialGreeting()]);
    setInput('');
  };

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const userMsg: Message = {
      id: `msg_user_${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // Capture the snapshot of all preceding messages as conversation history
    const conversationHistory = [...messages];

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Pass the entire conversation history along with the new query
      const res = await api.getCareerAdviceAI(query, conversationHistory);
      
      const botMsg: Message = {
        id: `msg_bot_${Date.now()}`,
        sender: 'assistant',
        text: res.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (err: any) {
      const errorMessage = err?.message || 'Unable to retrieve AI advice at this time. Please try again.';
      const errorMsg: Message = {
        id: `msg_err_${Date.now()}`,
        sender: 'assistant',
        text: `**Advisor Notice**: ${errorMessage}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#050608]/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
      <div 
        id="ai-advisor-dialog"
        className="bg-[#11131E] rounded-2xl max-w-2xl w-full shadow-2xl border border-[#262A3C] overflow-hidden flex flex-col h-[650px] max-h-[90vh] my-auto text-[#F5F2EB]"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-[#161925] border-b border-[#232738] text-[#F5F2EB] flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37]">
              <Sparkles className="w-4 h-4 text-[#D4AF37]" />
            </div>
            <div>
              <h3 className="text-base font-serif font-bold text-[#F5F2EB] flex items-center space-x-2">
                <span>MentorNexus AI Advisor</span>
                <span className="text-[10px] font-mono font-semibold uppercase tracking-wider bg-[#D4AF37]/15 border border-[#D4AF37]/30 px-2 py-0.5 rounded text-[#D4AF37]">
                  Multi-Turn Memory
                </span>
              </h3>
              <p className="text-xs text-[#9E9A90] font-sans">
                Context-aware guidance for 1:1 sessions, goal breakdown & career roadmaps
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-1.5">
            {messages.length > 1 && (
              <button
                onClick={handleResetChat}
                title="Reset conversation memory"
                className="p-1.5 rounded-lg text-[#7A766E] hover:text-[#F5F2EB] hover:bg-[#1C2030] cursor-pointer transition-colors flex items-center space-x-1 text-xs"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="hidden sm:inline font-mono text-[11px]">New Chat</span>
              </button>
            )}
            <button
              onClick={closeAdvisorModal}
              className="p-1.5 rounded-lg text-[#7A766E] hover:text-[#F5F2EB] hover:bg-[#1C2030] cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Chat message list */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-[#0D0F17]">
          {messages.map((m) => {
            const isBot = m.sender === 'assistant';
            return (
              <div
                key={m.id}
                className={`flex items-start space-x-3 ${isBot ? 'justify-start' : 'justify-end flex-row-reverse space-x-reverse'}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${
                  isBot 
                    ? m.isError ? 'bg-red-950/40 border-red-800/60 text-red-400' : 'bg-[#181B28] border-[#343A52] text-[#D4AF37]' 
                    : 'bg-[#D4AF37] border-[#D4AF37] text-[#090A0F]'
                }`}>
                  {isBot ? (
                    m.isError ? <AlertCircle className="w-4 h-4" /> : <Bot className="w-4 h-4" />
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                </div>

                <div className={`max-w-[84%] rounded-2xl p-4 text-xs leading-relaxed shadow-sm ${
                  isBot 
                    ? m.isError
                      ? 'bg-red-950/20 text-red-200 border border-red-900/40 rounded-tl-xs'
                      : 'bg-[#141622] text-[#F5F2EB] border border-[#262A3C] rounded-tl-xs' 
                    : 'bg-[#D4AF37] text-[#090A0F] font-medium rounded-tr-xs'
                }`}>
                  {isBot ? (
                    <div className="markdown-body space-y-2 [&_h1]:text-sm [&_h1]:font-bold [&_h1]:text-[#D4AF37] [&_h2]:text-xs [&_h2]:font-bold [&_h2]:text-[#D4AF37] [&_h3]:text-xs [&_h3]:font-semibold [&_h3]:text-[#F5F2EB] [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:my-1 [&_p]:my-1.5 [&_strong]:text-[#D4AF37] [&_code]:bg-[#1D2132] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:font-mono [&_code]:text-[11px] [&_blockquote]:border-l-2 [&_blockquote]:border-[#D4AF37]/50 [&_blockquote]:pl-3 [&_blockquote]:italic">
                      <ReactMarkdown>{m.text}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{m.text}</p>
                  )}
                  <span className={`text-[10px] block mt-2 font-mono ${isBot ? 'text-[#7A766E]' : 'text-[#090A0F]/70 text-right'}`}>
                    {m.timestamp}
                  </span>
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-full bg-[#181B28] border border-[#343A52] text-[#D4AF37] flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-[#141622] border border-[#262A3C] rounded-2xl rounded-tl-xs p-4 text-[#9E9A90] text-xs flex items-center space-x-2.5">
                <Loader2 className="w-4 h-4 animate-spin text-[#D4AF37]" />
                <span className="font-mono">Synthesizing context-aware advice with conversation memory...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick prompt suggestions */}
        {messages.length <= 3 && !loading && (
          <div className="px-6 py-2.5 bg-[#12141F] border-t border-[#232738] shrink-0">
            <div className="text-[11px] font-mono uppercase tracking-wider text-[#7A766E] mb-1.5 flex items-center space-x-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Suggested Starter Prompts:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {quickPrompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(p)}
                  className="text-[11px] bg-[#161925] hover:bg-[#1C2030] text-[#9E9A90] hover:text-[#F5F2EB] border border-[#262A3C] hover:border-[#D4AF37]/40 px-2.5 py-1 rounded-lg transition-colors cursor-pointer text-left"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Bar */}
        <div className="p-4 bg-[#141622] border-t border-[#232738] shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center space-x-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question or follow-up on previous advice..."
              className="flex-1 px-4 py-2.5 bg-[#161925] border border-[#2D3349] rounded-xl text-xs text-[#F5F2EB] placeholder-[#5A574E] focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] focus:outline-hidden"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="p-2.5 bg-[#D4AF37] hover:bg-[#C5A028] disabled:opacity-40 text-[#090A0F] rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
