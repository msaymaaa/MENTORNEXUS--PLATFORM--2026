import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Search, 
  Plus, 
  Sparkles, 
  Clock, 
  User, 
  Tag, 
  Star, 
  X, 
  ChevronRight, 
  CheckCircle2, 
  BookMarked,
  Award,
  ArrowRight,
  Shield
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { ExperienceResource } from '../types/index';

export const ExperienceLibraryView: React.FC = () => {
  const { currentUser } = useAuth();
  const { showToast, triggerRefresh, refreshTrigger } = useApp();

  const [resources, setResources] = useState<ExperienceResource[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Article reading modal
  const [readingArticle, setReadingArticle] = useState<ExperienceResource | null>(null);

  // Contribute modal
  const [isContributeModalOpen, setIsContributeModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<'Career Advice' | 'Technical Growth' | 'Mentorship Stories' | 'Leadership' | 'Industry Insights'>('Career Advice');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = [
    'All',
    'Career Advice',
    'Technical Growth',
    'Mentorship Stories',
    'Leadership',
    'Industry Insights'
  ];

  const loadResources = async () => {
    try {
      setIsLoading(true);
      const list = await api.getResources({
        category: selectedCategory,
        search: searchQuery,
      });
      setResources(list);
    } catch (err) {
      console.error('Error fetching resources:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadResources();
  }, [selectedCategory, searchQuery, refreshTrigger]);

  const handlePublishResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || !currentUser) return;

    try {
      setIsSubmitting(true);
      await api.createResource({
        title,
        category,
        summary: summary || content.slice(0, 160) + '...',
        content,
        authorId: currentUser.id,
        authorName: currentUser.name,
        authorTitle: currentUser.title,
        authorAvatar: currentUser.avatar,
        readTimeMinutes: Math.max(2, Math.ceil(content.split(' ').length / 180)),
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        featured: currentUser.role === 'admin',
      });

      showToast('success', 'Article Published', 'Your insight has been added to the Experience Library.');
      setIsContributeModalOpen(false);
      setTitle('');
      setSummary('');
      setContent('');
      setTags('');
      triggerRefresh();
    } catch (err: any) {
      showToast('error', 'Failed to publish article', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-[#F5F2EB]">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#232738] pb-6">
        <div className="space-y-2">
          <span className="text-[11px] uppercase font-mono tracking-widest text-[#D4AF37]">Knowledge Repository</span>
          <h1 className="text-3xl font-serif font-bold text-[#F5F2EB]">The Experience Library.</h1>
          <p className="text-xs text-[#9E9A90] max-w-xl">
            Practical playbooks, architectural retrospectives, and career frameworks written by seasoned practitioners.
          </p>
        </div>

        {currentUser?.role === 'mentor' || currentUser?.role === 'admin' ? (
          <button
            onClick={() => setIsContributeModalOpen(true)}
            className="px-5 py-3 rounded-xl bg-[#D4AF37] hover:bg-[#C5A028] text-[#090A0F] text-xs font-bold uppercase tracking-wider transition-all flex items-center space-x-2 cursor-pointer shadow-lg shadow-[#D4AF37]/15 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Publish Playbook</span>
          </button>
        ) : null}
      </div>

      {/* Search & Category Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#7A766E] absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Search playbooks, architectural patterns, topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#12141F] border border-[#262A3C] rounded-xl pl-10 pr-10 py-3 text-xs text-[#F5F2EB] placeholder-[#6A665D] focus:outline-none focus:border-[#D4AF37]"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3.5 top-3 text-[#7A766E] hover:text-[#F5F2EB]">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Categories Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-mono uppercase shrink-0 transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-[#181B28] text-[#D4AF37] border border-[#343A52] font-bold'
                  : 'bg-[#12141F] border border-[#262A3C] text-[#9E9A90] hover:text-[#F5F2EB]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Resources Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(n => (
            <div key={n} className="bg-[#12141F] border border-[#262A3C] rounded-2xl p-6 h-64 animate-pulse" />
          ))}
        </div>
      ) : resources.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {resources.map((article) => (
            <div
              key={article.id}
              onClick={() => setReadingArticle(article)}
              className="bg-[#12141F] border border-[#262A3C] hover:border-[#D4AF37]/50 rounded-2xl p-6 transition-all cursor-pointer flex flex-col justify-between group space-y-4 shadow-lg"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="px-2.5 py-0.5 rounded bg-[#181B28] border border-[#2D3349] text-[10px] font-mono uppercase text-[#D4AF37] font-semibold">
                    {article.category}
                  </span>
                  <span className="text-[11px] text-[#7A766E] font-mono flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    {article.readTimeMinutes} min read
                  </span>
                </div>

                <h3 className="text-lg font-serif font-bold text-[#F5F2EB] group-hover:text-[#D4AF37] transition-colors leading-snug">
                  {article.title}
                </h3>

                <p className="text-xs text-[#9E9A90] line-clamp-3 leading-relaxed">
                  {article.summary}
                </p>
              </div>

              <div className="pt-4 border-t border-[#232738] flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <img
                    src={article.authorAvatar || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150'}
                    alt={article.authorName}
                    className="w-7 h-7 rounded-lg object-cover border border-[#343A52]"
                    referrerPolicy="no-referrer"
                  />
                  <div className="text-[11px]">
                    <span className="text-[#F5F2EB] font-medium block">{article.authorName}</span>
                    <span className="text-[#7A766E] block text-[10px]">{article.authorTitle}</span>
                  </div>
                </div>

                <ChevronRight className="w-4 h-4 text-[#7A766E] group-hover:text-[#D4AF37] group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-[#12141F] border border-[#262A3C] rounded-2xl p-12 text-center max-w-lg mx-auto space-y-4">
          <div className="w-12 h-12 rounded-xl bg-[#1A1D2C] text-[#D4AF37] flex items-center justify-center mx-auto">
            <BookOpen className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-serif font-bold text-[#F5F2EB]">No articles match your query.</h3>
          <p className="text-xs text-[#9E9A90] leading-relaxed">
            Try adjusting your search terms or browsing across all experience categories.
          </p>
        </div>
      )}

      {/* Reading Article Modal */}
      {readingArticle && (
        <div className="fixed inset-0 z-50 bg-[#050608]/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-[#11131E] border border-[#262A3C] rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl text-[#F5F2EB] space-y-6 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-[#232738] pb-4">
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded bg-[#181B28] border border-[#2D3349] text-[10px] font-mono uppercase text-[#D4AF37] font-semibold">
                  {readingArticle.category}
                </span>
                <span className="text-xs text-[#7A766E] font-mono">
                  {readingArticle.readTimeMinutes} min read
                </span>
              </div>
              <button
                onClick={() => setReadingArticle(null)}
                className="p-1.5 rounded-lg text-[#9E9A90] hover:text-[#F5F2EB] hover:bg-[#181B28] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-serif font-bold text-[#F5F2EB] leading-tight">
                {readingArticle.title}
              </h2>

              <div className="flex items-center space-x-3 py-2 border-y border-[#232738]">
                <img
                  src={readingArticle.authorAvatar || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150'}
                  alt={readingArticle.authorName}
                  className="w-10 h-10 rounded-xl object-cover border border-[#343A52]"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <h4 className="text-xs font-bold text-[#F5F2EB]">{readingArticle.authorName}</h4>
                  <p className="text-[11px] text-[#9E9A90]">{readingArticle.authorTitle}</p>
                </div>
              </div>

              <div className="text-xs text-[#C8C5BD] leading-relaxed space-y-4 whitespace-pre-line bg-[#141622] p-5 rounded-xl border border-[#262A3C]">
                {readingArticle.content}
              </div>
            </div>

            <div className="pt-2 border-t border-[#232738] flex justify-end">
              <button
                onClick={() => setReadingArticle(null)}
                className="px-5 py-2 rounded-xl bg-[#181B28] hover:bg-[#232738] text-[#F5F2EB] text-xs font-semibold uppercase tracking-wider cursor-pointer"
              >
                Close Article
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Contribute Playbook Modal */}
      {isContributeModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#050608]/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-[#11131E] border border-[#262A3C] rounded-2xl max-w-xl w-full p-6 sm:p-7 shadow-2xl text-[#F5F2EB] space-y-5 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-[#232738] pb-4">
              <div>
                <span className="text-[10px] uppercase font-mono tracking-widest text-[#D4AF37]">Experience Authoring</span>
                <h3 className="text-xl font-serif font-bold text-[#F5F2EB]">Publish a Mentorship Playbook</h3>
              </div>
              <button
                onClick={() => setIsContributeModalOpen(false)}
                className="p-1.5 rounded-lg text-[#9E9A90] hover:text-[#F5F2EB] hover:bg-[#181B28] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePublishResource} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-[#9E9A90] mb-1.5">Article Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Navigating Senior to Staff: The 3 Architectural Pivot Points"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-[#141622] border border-[#2D3349] rounded-xl px-3.5 py-2.5 text-xs text-[#F5F2EB] placeholder-[#6A665D] focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-[#9E9A90] mb-1.5">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full bg-[#141622] border border-[#2D3349] rounded-xl px-3.5 py-2.5 text-xs text-[#F5F2EB] focus:outline-none focus:border-[#D4AF37]"
                >
                  {categories.filter(c => c !== 'All').map((c) => (
                    <option key={c} value={c} className="bg-[#141622] text-[#F5F2EB]">{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-[#9E9A90] mb-1.5">Brief Summary</label>
                <input
                  type="text"
                  placeholder="1-2 sentences summarizing the core takeaway..."
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  className="w-full bg-[#141622] border border-[#2D3349] rounded-xl px-3.5 py-2.5 text-xs text-[#F5F2EB] placeholder-[#6A665D] focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-[#9E9A90] mb-1.5">Playbook Content</label>
                <textarea
                  rows={6}
                  required
                  placeholder="Write actionable advice, mental models, real-world case studies, or checklists..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full bg-[#141622] border border-[#2D3349] rounded-xl p-3 text-xs text-[#F5F2EB] placeholder-[#6A665D] focus:outline-none focus:border-[#D4AF37] leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-[#9E9A90] mb-1.5">Tags (comma separated)</label>
                <input
                  type="text"
                  placeholder="e.g. Architecture, Leadership, Promotions"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="w-full bg-[#141622] border border-[#2D3349] rounded-xl px-3.5 py-2.5 text-xs text-[#F5F2EB] placeholder-[#6A665D] focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="pt-3 border-t border-[#232738] flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsContributeModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-[#161925] border border-[#262A3C] text-xs font-semibold text-[#9E9A90] hover:text-[#F5F2EB] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-[#D4AF37] hover:bg-[#C5A028] text-[#090A0F] text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg shadow-[#D4AF37]/15 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Publishing...' : 'Publish Guide'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
