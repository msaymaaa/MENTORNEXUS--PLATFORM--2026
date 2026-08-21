import React, { useState, useEffect } from 'react';
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
  ArrowRight
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { Goal, GoalMilestone } from '../types/index';

export const GoalsView: React.FC = () => {
  const { currentUser } = useAuth();
  const { showToast, triggerRefresh, refreshTrigger, setActiveTab } = useApp();

  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Create / Edit modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Technical Depth');
  const [description, setDescription] = useState('');
  const [targetDate, setTargetDate] = useState(
    new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [milestones, setMilestones] = useState<{ title: string; dueDate?: string }[]>([]);
  const [newMilestoneInput, setNewMilestoneInput] = useState('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiRecommendations, setAiRecommendations] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [filterCategory, setFilterCategory] = useState('All');

  const categories = [
    'All',
    'Technical Depth',
    'Career & Promotion',
    'System Architecture',
    'Open Source & Projects',
    'Interview Preparation',
    'Executive Presence'
  ];

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
  }, [currentUser, refreshTrigger]);

  const handleOpenCreateModal = () => {
    setEditingGoalId(null);
    setTitle('');
    setCategory('Technical Depth');
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
    setMilestones(goal.milestones?.map(m => ({ title: m.title, dueDate: m.dueDate })) || []);
    setAiRecommendations([]);
    setIsModalOpen(true);
  };

  const handleAddMilestone = () => {
    if (!newMilestoneInput.trim()) return;
    setMilestones([...milestones, { title: newMilestoneInput.trim() }]);
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
        setMilestones(res.milestones.map(m => ({ title: m.title })));
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
      if (editingGoalId) {
        await api.updateGoal(editingGoalId, {
          title,
          category,
          description,
          targetDate,
          milestones: milestones.map((m, i) => ({
            id: `m-${i + 1}`,
            title: m.title,
            completed: false,
            dueDate: m.dueDate
          }))
        });
        showToast('success', 'Goal Updated', 'Your milestone roadmap has been updated.');
      } else {
        await api.createGoal({
          userId: currentUser.id,
          title,
          category,
          description,
          targetDate,
          milestones: milestones.map((m, i) => ({
            id: `m-${Date.now()}-${i}`,
            title: m.title,
            completed: false,
            dueDate: m.dueDate
          }))
        });
        showToast('success', 'Goal Created', 'New development roadmap established.');
      }

      setIsModalOpen(false);
      triggerRefresh();
    } catch (err: any) {
      showToast('error', 'Failed to save goal', err.message);
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

      await api.updateGoal(goal.id, {
        milestones: updatedMilestones,
        progress,
        status,
      });

      if (!currentStatus && progress === 100) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
        showToast('success', 'Goal Completed!', `Congratulations on achieving ${goal.title}!`);
      } else if (!currentStatus) {
        showToast('success', 'Milestone Checked Off', 'Keep up the momentum!');
      }

      triggerRefresh();
    } catch (err: any) {
      showToast('error', 'Could not update milestone', err.message);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!confirm('Are you sure you want to delete this development goal?')) return;
    try {
      await api.deleteGoal(goalId);
      showToast('info', 'Goal Deleted', 'The goal has been removed.');
      triggerRefresh();
    } catch (err: any) {
      showToast('error', 'Failed to delete goal', err.message);
    }
  };

  const filteredGoals = goals.filter(g => filterCategory === 'All' || g.category === filterCategory);

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
          onClick={handleOpenCreateModal}
          className="px-5 py-3 rounded-xl bg-[#D4AF37] hover:bg-[#C5A028] text-[#090A0F] text-xs font-bold uppercase tracking-wider transition-all flex items-center space-x-2 cursor-pointer shadow-lg shadow-[#D4AF37]/15 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Goal</span>
        </button>
      </div>

      {/* Filter Categories Bar */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs">
        <span className="text-[11px] font-mono uppercase text-[#7A766E] shrink-0">Category:</span>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase shrink-0 transition-all cursor-pointer ${
              filterCategory === cat
                ? 'bg-[#181B28] text-[#D4AF37] border border-[#343A52] font-bold'
                : 'text-[#9E9A90] hover:text-[#F5F2EB] hover:bg-[#12141F]'
            }`}
          >
            {cat}
          </button>
        ))}
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
            <div
              key={goal.id}
              className="bg-[#12141F] border border-[#262A3C] rounded-2xl p-6 sm:p-7 space-y-6 shadow-xl"
            >
              {/* Goal Title & Progress Bar Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-[#232738] pb-5">
                <div className="space-y-1.5 max-w-2xl">
                  <div className="flex items-center space-x-2 text-xs">
                    <span className="px-2.5 py-0.5 rounded bg-[#181B28] border border-[#2D3349] text-[10px] font-mono uppercase text-[#D4AF37] font-semibold">
                      {goal.category}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold ${
                      goal.status === 'completed' ? 'bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30' : 'bg-[#181B28] text-[#9E9A90]'
                    }`}>
                      {goal.status === 'completed' ? 'Completed' : 'In Progress'}
                    </span>
                  </div>

                  <h3 className="text-xl font-serif font-bold text-[#F5F2EB]">{goal.title}</h3>
                  {goal.description && (
                    <p className="text-xs text-[#9E9A90] leading-relaxed">{goal.description}</p>
                  )}
                </div>

                {/* Edit / Delete Actions */}
                <div className="flex items-center space-x-2 shrink-0 self-end sm:self-auto">
                  <button
                    onClick={() => handleOpenEditModal(goal)}
                    className="p-2 rounded-lg bg-[#161925] border border-[#262A3C] text-[#9E9A90] hover:text-[#F5F2EB] hover:border-[#3D4460] transition-colors cursor-pointer"
                    title="Edit Goal"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteGoal(goal.id)}
                    className="p-2 rounded-lg bg-[#161925] border border-[#262A3C] text-[#7A766E] hover:text-red-400 hover:border-red-900 transition-colors cursor-pointer"
                    title="Delete Goal"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Progress Slider Display */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-[#9E9A90]">Milestone Completion</span>
                  <span className="font-bold text-[#D4AF37]">{goal.progress}%</span>
                </div>
                <div className="w-full bg-[#181B28] rounded-full h-2 overflow-hidden border border-[#262A3C]">
                  <div
                    className="bg-gradient-to-r from-[#D4AF37] to-[#10B981] h-full rounded-full transition-all duration-500"
                    style={{ width: `${goal.progress}%` }}
                  />
                </div>
              </div>

              {/* Milestones Breakdown Checkboxes */}
              <div className="space-y-3">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#7A766E] block font-bold">
                  Roadmap Checkpoints ({goal.milestones?.filter(m => m.completed).length || 0}/{goal.milestones?.length || 0})
                </span>

                <div className="space-y-2">
                  {goal.milestones && goal.milestones.length > 0 ? (
                    goal.milestones.map((m) => (
                      <div
                        key={m.id}
                        onClick={() => handleToggleMilestone(goal, m.id, m.completed)}
                        className={`p-3.5 rounded-xl border transition-all flex items-start space-x-3 cursor-pointer ${
                          m.completed
                            ? 'bg-[#101F18] border-[#10B981]/40 text-[#A3E635]'
                            : 'bg-[#141622] border-[#262A3C] hover:border-[#3D4460] text-[#F5F2EB]'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                          m.completed
                            ? 'bg-[#10B981] border-[#10B981] text-[#090A0F]'
                            : 'border-[#3D4460] bg-[#181B28]'
                        }`}>
                          {m.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>

                        <div className="flex-1">
                          <p className={`text-xs font-medium leading-relaxed ${m.completed ? 'line-through text-[#9E9A90]' : 'text-[#F5F2EB]'}`}>
                            {m.title}
                          </p>
                          {m.dueDate && (
                            <span className="text-[10px] text-[#7A766E] font-mono block mt-0.5">
                              Due: {new Date(m.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-[#7A766E] italic">No milestones defined yet.</p>
                  )}
                </div>
              </div>

            </div>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-[#12141F] border border-[#262A3C] rounded-2xl p-12 text-center max-w-lg mx-auto space-y-4">
          <div className="w-12 h-12 rounded-xl bg-[#1A1D2C] text-[#D4AF37] flex items-center justify-center mx-auto">
            <Target className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-serif font-bold text-[#F5F2EB]">Define where you want to go next.</h3>
          <p className="text-xs text-[#9E9A90] leading-relaxed">
            Create structured goals with actionable milestones. Then find the practitioners who have already walked that exact path.
          </p>
          <button
            onClick={handleOpenCreateModal}
            className="px-6 py-2.5 rounded-lg bg-[#D4AF37] hover:bg-[#C5A028] text-[#090A0F] text-xs uppercase tracking-wider font-bold transition-all cursor-pointer inline-flex items-center space-x-2"
          >
            <span>Create Development Goal</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
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
                    {categories.filter(c => c !== 'All').map(c => (
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
