import React, { useState, useEffect, useMemo } from 'react';
import { 
  Target, 
  Plus, 
  Sparkles, 
  CheckCircle2, 
  Calendar, 
  Clock, 
  Trash2, 
  Edit3, 
  Award, 
  TrendingUp, 
  X,
  ListTodo,
  Check,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Filter
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { Goal, GoalMilestone } from '../types/index';
import { GoalCard, getCategoryBadgeStyle } from '../components/GoalCard';

export const GOAL_CATEGORIES = [
  'All',
  'Technical Depth',
  'Career & Promotion',
  'System Architecture',
  'Open Source & Projects',
  'Interview Preparation',
  'Executive Presence'
] as const;

/**
 * Normalizes category strings by removing punctuation, normalizing ampersands,
 * trimming whitespace, and converting to lowercase.
 */
export function normalizeCategory(category?: string): string {
  if (!category) return '';
  return category
    .toLowerCase()
    .replace(/&amp;/g, 'and')
    .replace(/&/g, 'and')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Maps any legacy or variant category name to canonical category keys
 */
export function getCategoryCanonicalKey(category?: string): string {
  const norm = normalizeCategory(category);
  if (!norm || norm === 'all') return 'all';

  if (norm.includes('tech') || norm.includes('coding') || norm.includes('skill')) {
    return 'technical_depth';
  }
  if (norm.includes('career') || norm.includes('promotion') || norm.includes('growth') || norm.includes('strategy') || norm.includes('promo')) {
    return 'career_promotion';
  }
  if (norm.includes('system') || norm.includes('architecture') || norm.includes('arch') || norm.includes('design')) {
    return 'system_architecture';
  }
  if (norm.includes('open source') || norm.includes('project') || norm.includes('oss') || norm.includes('portfolio')) {
    return 'open_source_projects';
  }
  if (norm.includes('interview') || norm.includes('prep') || norm.includes('algo') || norm.includes('leetcode')) {
    return 'interview_preparation';
  }
  if (norm.includes('exec') || norm.includes('leader') || norm.includes('presence') || norm.includes('management') || norm.includes('soft skill')) {
    return 'executive_presence';
  }

  return norm;
}

/**
 * Robust matcher checking if a goal belongs to the specified filter category
 */
export function doesGoalMatchCategory(goalCategory?: string, selectedFilter?: string): boolean {
  if (!selectedFilter || normalizeCategory(selectedFilter) === 'all') {
    return true;
  }
  if (!goalCategory) return false;

  const filterKey = getCategoryCanonicalKey(selectedFilter);
  const goalKey = getCategoryCanonicalKey(goalCategory);

  if (filterKey === goalKey) return true;

  // Direct normalized string match fallback
  const normFilter = normalizeCategory(selectedFilter);
  const normGoal = normalizeCategory(goalCategory);
  return normFilter === normGoal;
}

export const GoalsView: React.FC = () => {
  const { currentUser } = useAuth();
  const { showToast, triggerRefresh, refreshTrigger, setActiveTab } = useApp();

  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Category filter state
  const [filterCategory, setFilterCategory] = useState<string>('All');

  // Deletion confirmation modal state
  const [goalToDelete, setGoalToDelete] = useState<Goal | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Create / Edit modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>('Technical Depth');
  const [description, setDescription] = useState('');
  const [targetDate, setTargetDate] = useState(
    new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [milestones, setMilestones] = useState<{ id?: string; title: string; completed?: boolean; dueDate?: string }[]>([]);
  const [newMilestoneInput, setNewMilestoneInput] = useState('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiRecommendations, setAiRecommendations] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const loadGoals = async () => {
    if (!currentUser) return;
    try {
      setIsLoading(true);
      const data = await api.getGoals(currentUser.id);
      setGoals(data);
    } catch (err) {
      console.error('Error loading goals:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadGoals();
    const interval = setInterval(loadGoals, 4000);
    return () => clearInterval(interval);
  }, [currentUser, refreshTrigger]);

  // Compute category counts for tab badges
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: goals.length };
    GOAL_CATEGORIES.forEach((cat) => {
      if (cat === 'All') return;
      counts[cat] = goals.filter((g) => doesGoalMatchCategory(g.category, cat)).length;
    });
    return counts;
  }, [goals]);

  // Filtered goals based on current active category tab
  const filteredGoals = useMemo(() => {
    if (!filterCategory || normalizeCategory(filterCategory) === 'all') {
      return goals;
    }
    return goals.filter((g) => doesGoalMatchCategory(g.category, filterCategory));
  }, [goals, filterCategory]);

  const handleOpenCreateModal = (presetCategory?: string) => {
    setEditingGoalId(null);
    setTitle('');
    setCategory(presetCategory && presetCategory !== 'All' ? presetCategory : 'Technical Depth');
    setDescription('');
    setTargetDate(new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setMilestones([
      { title: 'Study production architectural patterns & core tradeoffs' },
      { title: 'Build proof-of-concept milestone repository' },
      { title: 'Conduct architecture & code review sync with mentor' }
    ]);
    setAiRecommendations([]);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (goal: Goal) => {
    setEditingGoalId(goal.id);
    setTitle(goal.title);
    setCategory(goal.category);
    setDescription(goal.description || '');
    setTargetDate(goal.targetDate.split('T')[0]);
    setMilestones(goal.milestones?.map(m => ({ id: m.id, title: m.title, completed: m.completed, dueDate: m.dueDate })) || []);
    setAiRecommendations([]);
    setIsModalOpen(true);
  };

  const handleAddMilestone = () => {
    if (!newMilestoneInput.trim()) return;
    setMilestones([...milestones, { id: `m-${Date.now()}`, title: newMilestoneInput.trim(), completed: false }]);
    setNewMilestoneInput('');
  };

  const handleRemoveMilestone = (idx: number) => {
    setMilestones(milestones.filter((_, i) => i !== idx));
  };

  const handleGenerateAiMilestones = async () => {
    if (!title.trim()) {
      showToast('error', 'Goal title required', 'Please enter a goal title first.');
      return;
    }

    try {
      setIsAiGenerating(true);
      const res = await api.generateGoalMilestonesAI({
        title,
        category,
        description,
      });

      if (res.milestones && res.milestones.length > 0) {
        setMilestones(res.milestones.map((m, i) => ({ id: `m-ai-${Date.now()}-${i}`, title: m.title, completed: false })));
        setAiRecommendations(res.recommendations || []);
        showToast('success', 'Milestone Roadmap Generated', 'AI outlined actionable progression steps.');
      }
    } catch (err: any) {
      showToast('error', 'AI Milestone Generator', err.message || 'Could not generate milestones');
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !currentUser) return;

    try {
      setIsSaving(true);
      const mappedMilestones = milestones.map((m, i) => ({
        id: m.id || `m-${Date.now()}-${i}`,
        title: m.title,
        completed: !!m.completed,
        dueDate: m.dueDate
      }));
      const completedCount = mappedMilestones.filter(m => m.completed).length;
      const progress = mappedMilestones.length > 0 ? Math.round((completedCount / mappedMilestones.length) * 100) : 0;
      const status = progress === 100 ? 'completed' : 'in_progress';

      if (editingGoalId) {
        const updated = await api.updateGoal(editingGoalId, {
          title,
          category,
          description,
          targetDate,
          progress,
          status,
          milestones: mappedMilestones
        });
        if (updated) {
          setGoals(prev => prev.map(g => g.id === editingGoalId ? updated : g));
        }
        showToast('success', 'Goal Updated', 'Your milestone roadmap has been updated.');
      } else {
        const created = await api.createGoal({
          userId: currentUser.id,
          title,
          category,
          description,
          targetDate,
          progress,
          status,
          milestones: mappedMilestones
        });
        if (created) {
          setGoals(prev => [created, ...prev.filter(g => g.id !== created.id)]);
        }
        showToast('success', 'Goal Created', `Added to ${category}.`);
      }

      setIsModalOpen(false);
      triggerRefresh();
    } catch (err: any) {
      showToast('error', 'Failed to save goal', err.message || 'Could not save development goal.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleMilestone = async (goal: Goal, milestoneId: string, currentStatus: boolean) => {
    try {
      const updatedMilestones = (goal.milestones || []).map(m => 
        m.id === milestoneId ? { ...m, completed: !currentStatus, completedAt: !currentStatus ? new Date().toISOString() : undefined } : m
      );

      const completedCount = updatedMilestones.filter(m => m.completed).length;
      const progress = updatedMilestones.length > 0 ? Math.round((completedCount / updatedMilestones.length) * 100) : 0;
      const status = progress === 100 ? 'completed' : 'in_progress';

      // Optimistic update
      const optimisticGoal = { ...goal, milestones: updatedMilestones, progress, status };
      setGoals(prev => prev.map(g => g.id === goal.id ? optimisticGoal : g));

      const updated = await api.updateGoal(goal.id, {
        milestones: updatedMilestones,
        progress,
        status,
      });

      if (updated) {
        setGoals(prev => prev.map(g => g.id === goal.id ? updated : g));
      }

      if (!currentStatus && progress === 100) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
        showToast('success', 'Goal Completed!', `Congratulations on achieving "${goal.title}"!`);
      } else if (!currentStatus) {
        showToast('success', 'Milestone Checked Off', 'Keep up the momentum!');
      }

      triggerRefresh();
    } catch (err: any) {
      showToast('error', 'Could not update milestone', err.message);
      loadGoals();
    }
  };

  /**
   * Triggers the deletion confirmation modal
   */
  const handleRequestDeleteGoal = (goal: Goal) => {
    setGoalToDelete(goal);
  };

  /**
   * Confirms and performs the goal deletion mutation
   */
  const handleConfirmDeleteGoal = async () => {
    if (!goalToDelete) return;
    const targetId = goalToDelete.id;
    const targetTitle = goalToDelete.title;

    try {
      setIsDeleting(true);

      // Optimistic UI removal
      setGoals(prev => prev.filter(g => g.id !== targetId));
      setGoalToDelete(null);

      // Backend & database mutation
      await api.deleteGoal(targetId);

      // Toast notification
      showToast('success', 'Goal Deleted', `"${targetTitle}" has been permanently removed.`);
      triggerRefresh();
    } catch (err: any) {
      showToast('error', 'Failed to delete goal', err.message || 'Could not delete goal from database.');
      loadGoals();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-[#F5F2EB]">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#232738] pb-6">
        <div className="space-y-2">
          <span className="text-[11px] uppercase font-mono tracking-widest text-[#D4AF37]">Growth & Milestones</span>
          <h1 className="text-3xl font-serif font-bold text-[#F5F2EB]">Your roadmap to mastery.</h1>
          <p className="text-xs text-[#9E9A90] max-w-xl">
            Break big ambitions into verifiable milestones. Connect goals to mentors for accountability and real-world feedback.
          </p>
        </div>

        <button
          id="btn-create-new-goal"
          onClick={() => handleOpenCreateModal(filterCategory !== 'All' ? filterCategory : undefined)}
          className="px-5 py-3 rounded-xl bg-[#D4AF37] hover:bg-[#C5A028] text-[#090A0F] text-xs font-bold uppercase tracking-wider transition-all flex items-center space-x-2 cursor-pointer shadow-lg shadow-[#D4AF37]/15 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Goal</span>
        </button>
      </div>

      {/* Filter Categories Bar */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2 overflow-x-auto pb-2 text-xs no-scrollbar">
          <div className="flex items-center space-x-1.5 text-[11px] font-mono uppercase text-[#7A766E] shrink-0 mr-1">
            <Filter className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Category:</span>
          </div>

          {GOAL_CATEGORIES.map((cat) => {
            const count = categoryCounts[cat] || 0;
            const isActive = filterCategory === cat;
            return (
              <button
                key={cat}
                id={`tab-category-${cat.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                type="button"
                onClick={() => setFilterCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-mono uppercase shrink-0 transition-all cursor-pointer flex items-center space-x-2 ${
                  isActive
                    ? 'bg-[#181B28] text-[#D4AF37] border border-[#D4AF37]/40 shadow-sm font-bold'
                    : 'bg-[#10121D] text-[#9E9A90] hover:text-[#F5F2EB] hover:bg-[#151826] border border-[#232738]'
                }`}
              >
                <span>{cat}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isActive 
                    ? 'bg-[#D4AF37]/20 text-[#D4AF37]' 
                    : 'bg-[#1A1D2C] text-[#6E6A62]'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Goals List / Empty State */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map(n => (
            <div key={n} className="bg-[#12141F] border border-[#262A3C] rounded-2xl p-6 h-48 animate-pulse" />
          ))}
        </div>
      ) : filteredGoals.length > 0 ? (
        <div className="space-y-6">
          {filteredGoals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onEdit={handleOpenEditModal}
              onDelete={handleRequestDeleteGoal}
              onToggleMilestone={handleToggleMilestone}
            />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-[#12141F] border border-[#262A3C] rounded-2xl p-12 text-center max-w-lg mx-auto space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-xl bg-[#1A1D2C] text-[#D4AF37] flex items-center justify-center mx-auto">
            <Target className="w-6 h-6" />
          </div>

          {filterCategory !== 'All' ? (
            <>
              <h3 className="text-lg font-serif font-bold text-[#F5F2EB]">
                No goals in {filterCategory} yet.
              </h3>
              <p className="text-xs text-[#9E9A90] leading-relaxed">
                Establish a targeted roadmap specifically for {filterCategory} or reset your filter to view all development tracks.
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setFilterCategory('All')}
                  className="px-4 py-2 rounded-lg bg-[#181B28] hover:bg-[#232738] text-[#F5F2EB] text-xs font-semibold uppercase tracking-wider border border-[#343A52] transition-all cursor-pointer"
                >
                  View All Goals ({goals.length})
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenCreateModal(filterCategory)}
                  className="px-5 py-2 rounded-lg bg-[#D4AF37] hover:bg-[#C5A028] text-[#090A0F] text-xs uppercase tracking-wider font-bold transition-all cursor-pointer inline-flex items-center space-x-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create in {filterCategory}</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <h3 className="text-lg font-serif font-bold text-[#F5F2EB]">Define where you want to go next.</h3>
              <p className="text-xs text-[#9E9A90] leading-relaxed">
                Create structured goals with actionable milestones. Then find the practitioners who have already walked that exact path.
              </p>
              <button
                type="button"
                onClick={() => handleOpenCreateModal()}
                className="px-6 py-2.5 rounded-lg bg-[#D4AF37] hover:bg-[#C5A028] text-[#090A0F] text-xs uppercase tracking-wider font-bold transition-all cursor-pointer inline-flex items-center space-x-2"
              >
                <span>Create Development Goal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      )}

      {/* Goal Deletion Confirmation Modal */}
      {goalToDelete && (
        <div className="fixed inset-0 z-50 bg-[#050608]/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div 
            id="modal-delete-goal-confirmation"
            className="bg-[#11131E] border border-red-900/40 rounded-2xl max-w-md w-full p-6 shadow-2xl text-[#F5F2EB] space-y-5"
          >
            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center shrink-0 text-red-400">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-widest text-red-400 font-bold">Confirm Deletion</span>
                <h3 className="text-lg font-serif font-bold text-[#F5F2EB]">Delete Development Goal?</h3>
              </div>
            </div>

            <div className="bg-[#161925] border border-[#262A3C] rounded-xl p-4 space-y-2 text-xs">
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold ${getCategoryBadgeStyle(goalToDelete.category)}`}>
                  {goalToDelete.category}
                </span>
                <span className="text-[#7A766E] font-mono text-[10px]">Progress: {goalToDelete.progress}%</span>
              </div>
              <p className="font-semibold text-[#F5F2EB] line-clamp-2">
                {goalToDelete.title}
              </p>
              <p className="text-[#9E9A90] text-[11px] leading-relaxed">
                This action cannot be undone. All milestones and tracking progress associated with this goal will be removed.
              </p>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                id="btn-cancel-delete-goal"
                onClick={() => setGoalToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2.5 rounded-xl bg-[#161925] hover:bg-[#1E2333] border border-[#262A3C] text-xs font-semibold text-[#9E9A90] hover:text-[#F5F2EB] cursor-pointer transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-confirm-delete-goal"
                onClick={handleConfirmDeleteGoal}
                disabled={isDeleting}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-red-600/20 transition-all cursor-pointer flex items-center space-x-2 disabled:opacity-50"
              >
                {isDeleting ? (
                  <span>Deleting...</span>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Goal</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Goal Modal (Create / Edit) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#050608]/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-[#11131E] border border-[#262A3C] rounded-2xl max-w-xl w-full p-6 sm:p-7 shadow-2xl text-[#F5F2EB] space-y-5 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-[#232738] pb-4">
              <div>
                <span className="text-[10px] uppercase font-mono tracking-widest text-[#D4AF37]">Roadmap Builder</span>
                <h3 className="text-xl font-serif font-bold text-[#F5F2EB]">
                  {editingGoalId ? 'Edit Development Goal' : 'Establish New Goal'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-[#9E9A90] hover:text-[#F5F2EB] hover:bg-[#181B28] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGoal} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-[#9E9A90] mb-1.5">Goal Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Master Distributed Consensus & Raft in Go"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-[#141622] border border-[#2D3349] rounded-xl px-3.5 py-2.5 text-xs text-[#F5F2EB] placeholder-[#6A665D] focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase text-[#9E9A90] mb-1.5">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-[#141622] border border-[#2D3349] rounded-xl px-3.5 py-2.5 text-xs text-[#F5F2EB] focus:outline-none focus:border-[#D4AF37]"
                  >
                    {GOAL_CATEGORIES.filter(c => c !== 'All').map(c => (
                      <option key={c} value={c} className="bg-[#141622] text-[#F5F2EB]">{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-[#9E9A90] mb-1.5">Target Completion Date</label>
                  <input
                    type="date"
                    required
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full bg-[#141622] border border-[#2D3349] rounded-xl px-3.5 py-2.5 text-xs text-[#F5F2EB] focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-[#9E9A90] mb-1.5">Description & Purpose</label>
                <textarea
                  rows={2}
                  placeholder="What will success look like? What specific challenge are you solving?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[#141622] border border-[#2D3349] rounded-xl p-3 text-xs text-[#F5F2EB] placeholder-[#6A665D] focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              {/* Milestone Generator Section */}
              <div className="space-y-3 pt-2 border-t border-[#232738]">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono uppercase text-[#9E9A90]">Milestones & Steps</label>
                  <button
                    type="button"
                    onClick={handleGenerateAiMilestones}
                    disabled={isAiGenerating}
                    className="text-xs text-[#D4AF37] hover:text-[#E6C258] flex items-center space-x-1 cursor-pointer disabled:opacity-50 font-mono"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isAiGenerating ? 'Generating...' : 'AI Breakdown'}</span>
                  </button>
                </div>

                {/* Milestones List */}
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {milestones.map((m, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-[#161925] border border-[#262A3C] text-xs">
                      <span className="text-[#F5F2EB] truncate">{m.title}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveMilestone(idx)}
                        className="text-[#7A766E] hover:text-red-400 cursor-pointer ml-2"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add Custom Milestone */}
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Add specific checkpoint..."
                    value={newMilestoneInput}
                    onChange={(e) => setNewMilestoneInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddMilestone(); } }}
                    className="flex-1 bg-[#141622] border border-[#2D3349] rounded-xl px-3 py-2 text-xs text-[#F5F2EB] placeholder-[#6A665D] focus:outline-none focus:border-[#D4AF37]"
                  />
                  <button
                    type="button"
                    onClick={handleAddMilestone}
                    className="px-3.5 py-2 bg-[#181B28] hover:bg-[#232738] border border-[#343A52] text-[#F5F2EB] rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-[#232738] flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-[#161925] border border-[#262A3C] text-xs font-semibold text-[#9E9A90] hover:text-[#F5F2EB] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-[#D4AF37] hover:bg-[#C5A028] text-[#090A0F] text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg shadow-[#D4AF37]/15 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : editingGoalId ? 'Update Roadmap' : 'Establish Roadmap'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
