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
  ArrowRight,
  Copy,
  Check,
  Compass,
  Target,
  Users,
  BookOpen,
  MessageSquare
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { AIAdvisorMessage, ValidNavTab } from '../types/index';

export const AIAdvisorModal: React.FC = () => {
  const { currentUser } = useAuth();
  const { 
    isAdvisorModalOpen, 
    closeAdvisorModal, 
    advisorMessages, 
    setAdvisorMessages, 
    resetAdvisorChat,
    setActiveTab,
    showToast
  } = useApp();

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isAdvisorModalOpen) {
      scrollToBottom();
    }
  }, [advisorMessages, loading, isAdvisorModalOpen]);

  // Clean up abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  if (!isAdvisorModalOpen) return null;

  const VALID_NAV_TARGETS: readonly ValidNavTab[] = [
    'dashboard',
    'discover',
    'requests',
    'connections',
    'network',
    'goals',
    'library',
    'notifications',
    'profile',
    'admin',
  ] as const;

  const quickPrompts = [
    {
      icon: Users,
      label: '1:1 Mentorship Agenda',
      prompt: 'How should I structure my upcoming 30-minute mentorship session for maximum impact?'
    },
    {
      icon: Target,
      label: 'Milestone Execution',
      prompt: 'How can I break down my active goals into manageable weekly milestones?'
    },
    {
      icon: Compass,
      label: 'Find Right Mentors',
      prompt: 'How do I identify and reach out to the most relevant mentors for my background?'
    },
    {
      icon: BookOpen,
      label: 'System Design & Promos',
      prompt: 'What strategies and frameworks should I use to demonstrate senior engineering leadership?'
    }
  ];

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getTargetTabName = (tab: ValidNavTab): string => {
    switch (tab) {
      case 'dashboard': return 'Dashboard Overview';
      case 'discover': return 'Explore Mentors & Filters';
      case 'goals': return 'Active Goals & Milestones';
      case 'requests': return 'Mentorship Requests';
      case 'connections': return 'Active Connections & Syncs';
      case 'network': return 'Peer & Mentorship Network';
      case 'library': return 'Experience & Knowledge Library';
      case 'notifications': return 'System Notifications';
      case 'profile': return 'Your Profile Settings';
      case 'admin': return 'Admin Management Portal';
      default: return tab;
    }
  };

  const handleExecuteAction = (messageId: string, rawTarget: ValidNavTab) => {
    // 1. Strict Target Validation against registered MentorNexus routes
    if (!VALID_NAV_TARGETS.includes(rawTarget)) {
      showToast('error', 'Navigation Error', `Invalid navigation destination: "${rawTarget}"`);
      return;
    }

    let target: ValidNavTab = rawTarget;
    if (target === 'admin' && currentUser?.role !== 'admin') {
      target = 'dashboard';
    }

    // 2. Mark this specific message's action as consumed (one-time execution)
    setAdvisorMessages(prev =>
      prev.map(msg => (msg.id === messageId ? { ...msg, actionConsumed: true } : msg))
    );

    // 3. Directly navigate to target tab via application state router
    setActiveTab(target);

    // 4. Close the AI Advisor modal
    closeAdvisorModal();

    // 5. User feedback via toast
    showToast('info', 'Navigation', `Navigated to ${getTargetTabName(target)}`);
  };

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const userMsg: AIAdvisorMessage = {
      id: `msg_user_${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    // Capture snapshot of history
    const conversationHistory = [...advisorMessages];

    setAdvisorMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.sendAdvisorChatMessage(query, conversationHistory, controller.signal);
      
      const botMsg: AIAdvisorMessage = {
        id: `msg_bot_${Date.now()}`,
        sender: 'assistant',
        text: res.message,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        action: res.action || null,
      };

      setAdvisorMessages(prev => [...prev, botMsg]);
    } catch (err: any) {
      if (err.name === 'AbortError') return;

      const errorMessage = err?.message || 'Unable to retrieve AI advice at this time. Please try again.';
      const errorMsg: AIAdvisorMessage = {
        id: `msg_err_${Date.now()}`,
        sender: 'assistant',
        text: `**Advisor Notice**: ${errorMessage}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true
      };
      setAdvisorMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#050608]/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div 
        id="ai-advisor-dialog"
        className="bg-[#11131E] rounded-2xl max-w-3xl w-full shadow-2xl border border-[#262A3C] overflow-hidden flex flex-col h-[700px] max-h-[92vh] my-auto text-[#F5F2EB]"
      >
        {/* Header */}
        <div className="px-5 py-3.5 sm:px-6 sm:py-4 bg-[#161925] border-b border-[#232738] text-[#F5F2EB] flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] shadow-inner">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-[#D4AF37]" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-serif font-bold text-[#F5F2EB] flex items-center space-x-2">
                <span>MentorNexus AI Advisor</span>
                <span className="text-[10px] font-mono font-semibold uppercase tracking-wider bg-[#D4AF37]/15 border border-[#D4AF37]/30 px-2 py-0.5 rounded text-[#D4AF37]">
                  Continuous Context
                </span>
              </h3>
              <p className="text-[11px] sm:text-xs text-[#9E9A90] font-sans">
                Real-time career mentorship, 1:1 strategy, and app navigation
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-1.5">
            {advisorMessages.length > 1 && (
              <button
                type="button"
                onClick={resetAdvisorChat}
                title="Start a fresh conversation"
                className="p-1.5 px-2.5 rounded-lg text-[#7A766E] hover:text-[#F5F2EB] hover:bg-[#1C2030] cursor-pointer transition-colors flex items-center space-x-1 text-xs border border-transparent hover:border-[#262A3C]"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="font-mono text-[11px]">New Chat</span>
              </button>
            )}
            <button
              type="button"
              onClick={closeAdvisorModal}
              className="p-1.5 rounded-lg text-[#7A766E] hover:text-[#F5F2EB] hover:bg-[#1C2030] cursor-pointer transition-colors"
              title="Close Advisor"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Chat message stream */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 bg-[#0D0F17]">
          {advisorMessages.map((m) => {
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

                <div className={`max-w-[88%] sm:max-w-[82%] rounded-2xl p-4 text-xs leading-relaxed shadow-sm flex flex-col ${
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

                  {/* Retry button for error states */}
                  {isBot && m.isError && (
                    <button
                      type="button"
                      onClick={() => {
                        const idx = advisorMessages.findIndex(msg => msg.id === m.id);
                        const prevUserMsg = [...advisorMessages.slice(0, idx)].reverse().find(msg => msg.sender === 'user');
                        if (prevUserMsg) {
                          handleSend(prevUserMsg.text);
                        }
                      }}
                      className="mt-2.5 px-3 py-1 bg-red-900/40 hover:bg-red-900/70 border border-red-700/50 text-red-200 text-[11px] rounded-lg transition-colors cursor-pointer flex items-center space-x-1.5 w-fit"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Retry Question</span>
                    </button>
                  )}

                  {/* Structured Navigation Action Card */}
                  {isBot && m.action && m.action.type === 'navigate' && m.action.target && (
                    <div className="mt-3 pt-3 border-t border-[#232738] flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#181B28]/80 p-3 rounded-xl border border-[#2D3349]">
                      <div className="flex items-center space-x-2">
                        <Compass className={`w-4 h-4 shrink-0 ${m.actionConsumed ? 'text-[#9E9A90]' : 'text-[#D4AF37]'}`} />
                        <div>
                          <p className={`font-semibold text-[11px] ${m.actionConsumed ? 'text-[#9E9A90]' : 'text-white'}`}>
                            {m.action.label || `Suggested Location: ${getTargetTabName(m.action.target)}`}
                          </p>
                          <p className="text-[10px] text-[#9E9A90]">
                            Tab target: <code className="font-mono text-[#D4AF37]">{m.action.target}</code>
                          </p>
                        </div>
                      </div>

                      {m.actionConsumed ? (
                        <div className="px-3 py-1 bg-[#1C2030] text-[#9E9A90] border border-[#2D3349] font-mono text-[11px] rounded-lg flex items-center justify-center space-x-1.5 shrink-0 select-none">
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>Navigated ✓</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExecuteAction(m.id, m.action!.target);
                          }}
                          className="px-3 py-1.5 bg-[#D4AF37] hover:bg-[#C5A028] text-[#090A0F] font-bold rounded-lg text-xs flex items-center justify-center space-x-1.5 transition-all shadow-xs shrink-0 cursor-pointer"
                        >
                          <span>Go there now</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Message Footer: Timestamp & Action buttons */}
                  <div className={`flex items-center justify-between mt-2 pt-1.5 ${isBot ? 'text-[#7A766E]' : 'text-[#090A0F]/70'}`}>
                    <span className="text-[10px] font-mono">
                      {m.timestamp}
                    </span>

                    {isBot && !m.isError && (
                      <button
                        type="button"
                        onClick={() => handleCopy(m.id, m.text)}
                        className="p-1 hover:text-[#F5F2EB] hover:bg-[#1E2232] rounded transition-colors flex items-center space-x-1 text-[10px] font-mono cursor-pointer"
                        title="Copy message"
                      >
                        {copiedId === m.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-full bg-[#181B28] border border-[#343A52] text-[#D4AF37] flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-[#141622] border border-[#262A3C] rounded-2xl rounded-tl-xs p-4 text-[#9E9A90] text-xs flex items-center space-x-2.5 shadow-sm">
                <Loader2 className="w-4 h-4 animate-spin text-[#D4AF37]" />
                <span className="font-mono">Synthesizing context-aware guidance with conversation memory...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick prompt suggestions bar */}
        {advisorMessages.length <= 2 && !loading && (
          <div className="px-4 py-2.5 sm:px-6 bg-[#12141F] border-t border-[#232738] shrink-0">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#7A766E] mb-1.5 flex items-center space-x-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Suggested Career Topics:</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {quickPrompts.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSend(item.prompt)}
                    className="text-[11px] bg-[#161925] hover:bg-[#1C2030] text-[#9E9A90] hover:text-[#F5F2EB] border border-[#262A3C] hover:border-[#D4AF37]/40 px-3 py-1.5 rounded-lg transition-colors cursor-pointer text-left flex items-center space-x-2"
                  >
                    <Icon className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Input Bar */}
        <div className="p-3.5 sm:p-4 bg-[#141622] border-t border-[#232738] shrink-0">
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
              placeholder="Ask for 1:1 agendas, milestone reviews, or navigation guidance..."
              className="flex-1 px-4 py-2.5 bg-[#161925] border border-[#2D3349] rounded-xl text-xs text-[#F5F2EB] placeholder-[#5A574E] focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] focus:outline-hidden"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="p-2.5 bg-[#D4AF37] hover:bg-[#C5A028] disabled:opacity-40 text-[#090A0F] rounded-xl shadow-xs transition-colors cursor-pointer"
              title="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
