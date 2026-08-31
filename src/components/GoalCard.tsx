import React from 'react';
import { 
  Check, 
  Trash2, 
  Edit3, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { Goal } from '../types/index';

interface GoalCardProps {
  goal: Goal;
  onEdit: (goal: Goal) => void;
  onDelete: (goal: Goal) => void;
  onToggleMilestone: (goal: Goal, milestoneId: string, currentStatus: boolean) => void;
}

export const getCategoryBadgeStyle = (category?: string) => {
  const norm = (category || '').toLowerCase();
  if (norm.includes('tech') || norm.includes('coding') || norm.includes('skill')) {
    return 'bg-[#D4AF37]/15 text-[#D4AF37] border-[#D4AF37]/30';
  }
  if (norm.includes('career') || norm.includes('promotion') || norm.includes('growth')) {
    return 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30';
  }
  if (norm.includes('system') || norm.includes('arch') || norm.includes('design')) {
    return 'bg-[#38BDF8]/15 text-[#38BDF8] border-[#38BDF8]/30';
  }
  if (norm.includes('open source') || norm.includes('project') || norm.includes('oss')) {
    return 'bg-[#818CF8]/15 text-[#818CF8] border-[#818CF8]/30';
  }
  if (norm.includes('interview') || norm.includes('prep')) {
    return 'bg-[#C084FC]/15 text-[#C084FC] border-[#C084FC]/30';
  }
  if (norm.includes('exec') || norm.includes('leader') || norm.includes('presence')) {
    return 'bg-[#F472B6]/15 text-[#F472B6] border-[#F472B6]/30';
  }
  return 'bg-[#181B28] text-[#D4AF37] border-[#2D3349]';
};

export const GoalCard: React.FC<GoalCardProps> = ({
  goal,
  onEdit,
  onDelete,
  onToggleMilestone,
}) => {
  const completedMilestones = (goal.milestones || []).filter(m => m.completed).length;
  const totalMilestones = goal.milestones?.length || 0;
  const isCompleted = goal.status === 'completed' || goal.progress === 100;

  return (
    <div 
      id={`goal-card-${goal.id}`}
      className="bg-[#12141F] border border-[#262A3C] hover:border-[#3D4460] rounded-2xl p-6 sm:p-7 space-y-6 shadow-xl transition-all"
    >
      {/* Goal Title & Progress Bar Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-[#232738] pb-5">
        <div className="space-y-2 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className={`px-2.5 py-0.5 rounded border text-[10px] font-mono uppercase font-semibold ${getCategoryBadgeStyle(goal.category)}`}>
              {goal.category}
            </span>
            <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono uppercase font-bold border ${
              isCompleted 
                ? 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30' 
                : 'bg-[#181B28] text-[#9E9A90] border-[#2D3349]'
            }`}>
              {isCompleted ? 'Completed' : 'In Progress'}
            </span>
            {goal.targetDate && (
              <span className="text-[11px] text-[#7A766E] font-mono flex items-center space-x-1">
                <Calendar className="w-3 h-3 text-[#7A766E]" />
                <span>Target: {new Date(goal.targetDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </span>
            )}
          </div>

          <h3 className="text-xl font-serif font-bold text-[#F5F2EB] tracking-tight">{goal.title}</h3>
          {goal.description && (
            <p className="text-xs text-[#9E9A90] leading-relaxed">{goal.description}</p>
          )}
        </div>

        {/* Edit / Delete Action Buttons */}
        <div className="flex items-center space-x-2 shrink-0 self-end sm:self-auto">
          <button
            type="button"
            id={`btn-edit-goal-${goal.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onEdit(goal);
            }}
            className="p-2.5 rounded-xl bg-[#161925] border border-[#262A3C] text-[#9E9A90] hover:text-[#F5F2EB] hover:border-[#3D4460] hover:bg-[#1C2030] transition-all cursor-pointer flex items-center space-x-1.5"
            title="Edit Goal & Milestones"
            aria-label="Edit Goal"
          >
            <Edit3 className="w-4 h-4" />
            <span className="text-xs font-semibold hidden sm:inline">Edit</span>
          </button>
          <button
            type="button"
            id={`btn-delete-goal-${goal.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(goal);
            }}
            className="p-2.5 rounded-xl bg-[#161925] border border-[#262A3C] text-[#7A766E] hover:text-red-400 hover:border-red-900/50 hover:bg-red-500/10 transition-all cursor-pointer flex items-center space-x-1.5"
            title="Delete Goal"
            aria-label="Delete Goal"
          >
            <Trash2 className="w-4 h-4" />
            <span className="text-xs font-semibold hidden sm:inline">Delete</span>
          </button>
        </div>
      </div>

      {/* Progress Slider Display */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs font-mono">
          <span className="text-[#9E9A90]">Milestone Completion</span>
          <span className="font-bold text-[#D4AF37]">{goal.progress}%</span>
        </div>
        <div className="w-full bg-[#181B28] rounded-full h-2.5 overflow-hidden border border-[#262A3C]">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isCompleted 
                ? 'bg-[#10B981]' 
                : 'bg-gradient-to-r from-[#D4AF37] to-[#10B981]'
            }`}
            style={{ width: `${goal.progress}%` }}
          />
        </div>
      </div>

      {/* Milestones Breakdown Checkboxes */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#7A766E] font-bold">
            Roadmap Checkpoints ({completedMilestones}/{totalMilestones})
          </span>
          {isCompleted && (
            <span className="text-[10px] font-mono text-[#10B981] font-bold flex items-center space-x-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>Goal Accomplished</span>
            </span>
          )}
        </div>

        <div className="space-y-2">
          {goal.milestones && goal.milestones.length > 0 ? (
            goal.milestones.map((m) => (
              <div
                key={m.id}
                id={`milestone-item-${m.id}`}
                onClick={() => onToggleMilestone(goal, m.id, m.completed)}
                className={`p-3.5 rounded-xl border transition-all flex items-start space-x-3 cursor-pointer select-none ${
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

                <div className="flex-1 min-w-0">
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
            <p className="text-xs text-[#7A766E] italic">No milestones defined yet. Click Edit to add checkpoints.</p>
          )}
        </div>
      </div>
    </div>
  );
};
