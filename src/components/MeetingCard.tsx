import React, { useState } from 'react';
import { 
  Calendar, 
  Clock, 
  Video, 
  ExternalLink, 
  Check, 
  X, 
  FileText, 
  Plus, 
  Trash2, 
  User, 
  ChevronDown, 
  ChevronUp,
  Sparkles,
  Edit2,
  RotateCcw,
  AlertCircle
} from 'lucide-react';
import { MentorshipMeeting, MentorshipConnection } from '../types/index';
import { getMeetingCountdown, useMeetingTimer } from '../utils/meetingCountdown';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';

interface MeetingCardProps {
  meeting: MentorshipMeeting;
  connection?: MentorshipConnection | null;
  onUpdateMeeting?: (updated: MentorshipMeeting) => void;
  onDeleteMeeting?: (deletedId: string) => void;
  onRefresh?: () => void;
}

export const MeetingCard: React.FC<MeetingCardProps> = ({
  meeting,
  connection,
  onUpdateMeeting,
  onDeleteMeeting,
  onRefresh,
}) => {
  const { currentUser } = useAuth();
  const { showToast, triggerRefresh } = useApp();

  // Tick every 10s to dynamically update live countdowns without page refresh
  useMeetingTimer(10000);

  const [isNotesExpanded, setIsNotesExpanded] = useState(false);
  const [newSessionNote, setNewSessionNote] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [editingAgenda, setEditingAgenda] = useState(false);
  const [agendaDraft, setAgendaDraft] = useState(meeting.notes || '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const countdown = getMeetingCountdown(meeting.date, meeting.time, meeting.status);

  const isMentor = currentUser?.role === 'mentor';
  const partnerName = connection
    ? connection.mentorId === currentUser?.id
      ? connection.studentName
      : connection.mentorName
    : undefined;
  const partnerAvatar = connection
    ? connection.mentorId === currentUser?.id
      ? connection.studentAvatar
      : connection.mentorAvatar
    : undefined;
  const partnerTitle = connection
    ? connection.mentorId === currentUser?.id
      ? connection.studentTitle
      : connection.mentorTitle
    : undefined;

  const handleStatusChange = async (newStatus: 'scheduled' | 'completed' | 'cancelled') => {
    if (!connection) return;

    try {
      const updatedMtg = await api.updateMeeting(connection.id, meeting.id, {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      });

      const updatedObj = updatedMtg || { ...meeting, status: newStatus };
      if (onUpdateMeeting) onUpdateMeeting(updatedObj);

      const statusLabels = {
        completed: 'marked as Completed and moved to Past Sessions',
        scheduled: 're-scheduled as Active',
        cancelled: 'marked as Cancelled',
      };

      showToast('success', 'Session Updated', `Session "${meeting.title}" ${statusLabels[newStatus]}.`);
      if (onRefresh) onRefresh();
      triggerRefresh();
    } catch (err: any) {
      showToast('error', 'Update Failed', err.message || 'Could not update meeting status');
    }
  };

  const handleDeleteMeeting = async () => {
    if (!connection) return;
    setIsDeleting(true);
    try {
      await api.deleteMeeting(connection.id, meeting.id);
      showToast('info', 'Session Removed', `Session "${meeting.title}" deleted.`);
      if (onDeleteMeeting) onDeleteMeeting(meeting.id);
      if (onRefresh) onRefresh();
      triggerRefresh();
    } catch (err: any) {
      showToast('error', 'Delete Failed', err.message || 'Could not delete session');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleAddSessionNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSessionNote.trim() || !connection) return;

    setIsSavingNote(true);
    try {
      const noteContent = `[${new Date().toLocaleDateString([], { month: 'short', day: 'numeric' })}] ${newSessionNote.trim()}`;
      const existingSessionNotes = meeting.sessionNotes || [];
      const updatedSessionNotes = [noteContent, ...existingSessionNotes];

      const updatedMtg = await api.updateMeeting(connection.id, meeting.id, {
        sessionNotes: updatedSessionNotes,
        updatedAt: new Date().toISOString(),
      });

      const savedMtg = updatedMtg || { ...meeting, sessionNotes: updatedSessionNotes };
      if (onUpdateMeeting) onUpdateMeeting(savedMtg);

      setNewSessionNote('');
      showToast('success', 'Session Note Saved', 'Note recorded specifically for this meeting.');
      if (onRefresh) onRefresh();
      triggerRefresh();
    } catch (err: any) {
      showToast('error', 'Save Failed', err.message || 'Could not save session note');
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleDeleteSessionNote = async (indexToDelete: number) => {
    if (!connection || !meeting.sessionNotes) return;

    try {
      const updatedSessionNotes = meeting.sessionNotes.filter((_, idx) => idx !== indexToDelete);
      const updatedMtg = await api.updateMeeting(connection.id, meeting.id, {
        sessionNotes: updatedSessionNotes,
        updatedAt: new Date().toISOString(),
      });

      const savedMtg = updatedMtg || { ...meeting, sessionNotes: updatedSessionNotes };
      if (onUpdateMeeting) onUpdateMeeting(savedMtg);

      showToast('info', 'Note Removed', 'Session note was deleted.');
      if (onRefresh) onRefresh();
      triggerRefresh();
    } catch (err: any) {
      showToast('error', 'Delete Failed', err.message || 'Could not delete note');
    }
  };

  const handleSaveAgenda = async () => {
    if (!connection) return;
    try {
      const updatedMtg = await api.updateMeeting(connection.id, meeting.id, {
        notes: agendaDraft.trim(),
        updatedAt: new Date().toISOString(),
      });

      const savedMtg = updatedMtg || { ...meeting, notes: agendaDraft.trim() };
      if (onUpdateMeeting) onUpdateMeeting(savedMtg);

      setEditingAgenda(false);
      showToast('success', 'Agenda Updated', 'Meeting agenda & prep notes updated.');
      if (onRefresh) onRefresh();
      triggerRefresh();
    } catch (err: any) {
      showToast('error', 'Update Failed', err.message);
    }
  };

  return (
    <div
      id={`meeting-card-${meeting.id}`}
      className={`rounded-2xl border transition-all space-y-4 p-5 sm:p-6 ${
        meeting.status === 'completed'
          ? 'bg-[#10121D]/90 border-[#1E2232]'
          : meeting.status === 'cancelled'
          ? 'bg-[#181115]/60 border-[#341F27]'
          : countdown.isUrgent
          ? 'bg-[#151826] border-[#D4AF37]/70 shadow-lg ring-1 ring-[#D4AF37]/30'
          : 'bg-[#12141F] border-[#262A3C] hover:border-[#3D4460]'
      }`}
    >
      {/* Top Header: Title, Live Countdown Badge & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#232738] pb-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
            <h3 className="text-sm font-serif font-bold text-[#F5F2EB]">{meeting.title}</h3>
            
            {/* Live Countdown Badge */}
            <span
              id={`countdown-badge-${meeting.id}`}
              className={`text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full border transition-all ${countdown.badgeColor}`}
            >
              {countdown.label}
            </span>

            {/* Status indicator */}
            {meeting.status !== 'scheduled' && (
              <span
                className={`text-[9px] font-mono uppercase px-2.5 py-0.5 rounded-md font-semibold ${
                  meeting.status === 'completed'
                    ? 'bg-[#10B981]/20 text-[#34D399] border border-[#10B981]/40'
                    : 'bg-[#E11D48]/20 text-[#FB7185] border border-[#E11D48]/40'
                }`}
              >
                {meeting.status === 'completed' ? '✓ Past / Completed' : '✕ Cancelled'}
              </span>
            )}
          </div>

          {/* Scheduled Start Time & Time Zone */}
          <div className="flex items-center space-x-3 text-xs text-[#9E9A90] font-mono pt-0.5">
            <span className="flex items-center space-x-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>{countdown.formattedDateTime}</span>
            </span>
            {meeting.timeZone && (
              <span className="px-1.5 py-0.2 rounded bg-[#181B28] text-[10px] text-[#C5A880] border border-[#2D3349]">
                {meeting.timeZone}
              </span>
            )}
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center space-x-2 self-start sm:self-center flex-wrap gap-y-2">
          {meeting.meetingUrl && (
            <a
              id={`btn-join-call-${meeting.id}`}
              href={meeting.meetingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-sm ${
                meeting.status === 'scheduled'
                  ? 'bg-[#181B28] hover:bg-[#232738] text-[#38BDF8] border border-[#38BDF8]/40 hover:border-[#38BDF8]'
                  : 'bg-[#141622] hover:bg-[#1C2030] text-[#9E9A90] hover:text-[#38BDF8] border border-[#262A3C]'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              <span>{meeting.status === 'scheduled' ? 'Join Call' : 'Call Link'}</span>
              <ExternalLink className="w-3 h-3 ml-0.5" />
            </a>
          )}

          {meeting.status === 'scheduled' ? (
            <>
              <button
                type="button"
                id={`btn-complete-mtg-${meeting.id}`}
                onClick={() => handleStatusChange('completed')}
                title="Mark as Completed"
                className="p-2 bg-[#10B981]/15 hover:bg-[#10B981]/30 text-[#34D399] border border-[#10B981]/40 rounded-xl text-xs cursor-pointer transition-all flex items-center space-x-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold uppercase hidden sm:inline">Complete</span>
              </button>
              <button
                type="button"
                id={`btn-cancel-mtg-${meeting.id}`}
                onClick={() => handleStatusChange('cancelled')}
                title="Cancel Session"
                className="p-2 bg-[#E11D48]/15 hover:bg-[#E11D48]/30 text-[#FB7185] border border-[#E11D48]/40 rounded-xl text-xs cursor-pointer transition-all"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <button
              type="button"
              id={`btn-reopen-mtg-${meeting.id}`}
              onClick={() => handleStatusChange('scheduled')}
              title="Re-open / Reschedule Session"
              className="px-3 py-1.5 bg-[#181B28] hover:bg-[#262A3C] text-[#D4AF37] border border-[#D4AF37]/40 rounded-xl text-xs cursor-pointer transition-all flex items-center space-x-1.5"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="text-[10px] font-bold uppercase">Re-open</span>
            </button>
          )}

          {/* Delete Session Button (Only manually removes when user explicitly requests) */}
          <button
            type="button"
            id={`btn-delete-mtg-${meeting.id}`}
            onClick={() => setShowDeleteConfirm(true)}
            title="Delete Session Record"
            className="p-2 bg-[#181B28] hover:bg-[#2C1818] text-[#7A766E] hover:text-[#E11D48] border border-[#262A3C] hover:border-[#E11D48]/40 rounded-xl text-xs cursor-pointer transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Delete Confirmation Banner */}
      {showDeleteConfirm && (
        <div className="p-3.5 rounded-xl bg-[#2A151B] border border-[#E11D48]/40 flex items-center justify-between text-xs text-[#F5F2EB] animate-in fade-in">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-[#FB7185] shrink-0" />
            <span>Are you sure you want to permanently delete this meeting record?</span>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(false)}
              className="px-2.5 py-1 text-xs text-[#9E9A90] hover:text-[#F5F2EB] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={handleDeleteMeeting}
              className="px-3 py-1 bg-[#E11D48] hover:bg-[#BE123C] text-white text-xs font-bold rounded-lg cursor-pointer disabled:opacity-50"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      )}

      {/* Participants & Description / Agenda */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Participants Info */}
        {partnerName && (
          <div className="flex items-center space-x-3 p-3 rounded-xl bg-[#161925] border border-[#262A3C]">
            <img
              src={partnerAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
              alt={partnerName}
              className="w-10 h-10 rounded-xl object-cover border border-[#343A52]"
              referrerPolicy="no-referrer"
            />
            <div className="min-w-0">
              <span className="text-[9px] font-mono uppercase text-[#D4AF37] font-bold block">
                {isMentor ? 'Mentee Participant' : 'Mentor Participant'}
              </span>
              <h4 className="text-xs font-bold text-[#F5F2EB] truncate">{partnerName}</h4>
              <p className="text-[11px] text-[#9E9A90] truncate">{partnerTitle}</p>
            </div>
          </div>
        )}

        {/* Agenda / Prep Notes */}
        <div className="p-3 rounded-xl bg-[#161925] border border-[#262A3C] space-y-1.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-mono uppercase text-[#7A766E] font-bold flex items-center space-x-1">
              <FileText className="w-3 h-3 text-[#D4AF37]" />
              <span>Agenda & Preparation</span>
            </span>
            <button
              onClick={() => setEditingAgenda(!editingAgenda)}
              className="text-[10px] text-[#D4AF37] hover:text-[#E6C258] cursor-pointer flex items-center space-x-1"
            >
              <Edit2 className="w-2.5 h-2.5" />
              <span>{editingAgenda ? 'Cancel' : 'Edit'}</span>
            </button>
          </div>

          {editingAgenda ? (
            <div className="space-y-2 pt-1">
              <textarea
                rows={2}
                value={agendaDraft}
                onChange={(e) => setAgendaDraft(e.target.value)}
                placeholder="Add session agenda, topics to cover, or links..."
                className="w-full bg-[#0E1019] border border-[#2D3349] rounded-lg p-2 text-xs text-[#F5F2EB] focus:outline-none focus:border-[#D4AF37]"
              />
              <div className="flex justify-end">
                <button
                  onClick={handleSaveAgenda}
                  className="px-3 py-1 bg-[#D4AF37] text-[#090A0F] text-[10px] font-bold rounded-md uppercase tracking-wider cursor-pointer"
                >
                  Save Agenda
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-[#9E9A90] italic line-clamp-2">
              {meeting.notes || 'No specific agenda logged yet. Click edit to add topics.'}
            </p>
          )}
        </div>
      </div>

      {/* Session Notes Accordion & Real-time Management */}
      <div className="border-t border-[#232738] pt-3">
        <button
          type="button"
          onClick={() => setIsNotesExpanded(!isNotesExpanded)}
          className="w-full flex items-center justify-between text-xs font-semibold text-[#D4AF37] hover:text-[#E6C258] cursor-pointer py-1"
        >
          <span className="flex items-center space-x-2">
            <FileText className="w-3.5 h-3.5" />
            <span>
              Session Notes & Key Takeaways ({meeting.sessionNotes?.length || 0})
            </span>
          </span>
          {isNotesExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {isNotesExpanded && (
          <div className="mt-3 space-y-3 animate-in fade-in duration-150">
            {/* Add note input */}
            <form onSubmit={handleAddSessionNote} className="space-y-2">
              <textarea
                rows={2}
                placeholder="Record action items, design decisions, architectural feedback, or next steps from this 1:1 meeting..."
                value={newSessionNote}
                onChange={(e) => setNewSessionNote(e.target.value)}
                className="w-full bg-[#161925] border border-[#2D3349] rounded-xl p-3 text-xs text-[#F5F2EB] placeholder-[#6A665D] focus:outline-none focus:border-[#D4AF37] leading-relaxed"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSavingNote || !newSessionNote.trim()}
                  className="px-4 py-1.5 bg-[#D4AF37] hover:bg-[#C5A028] text-[#090A0F] text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isSavingNote ? 'Saving...' : 'Save Note'}</span>
                </button>
              </div>
            </form>

            {/* List of notes for this specific meeting */}
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {meeting.sessionNotes && meeting.sessionNotes.length > 0 ? (
                meeting.sessionNotes.map((note, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-[#161925] border border-[#262A3C] text-xs text-[#9E9A90] leading-relaxed flex items-start justify-between group"
                  >
                    <span className="flex-1">{note}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteSessionNote(idx)}
                      title="Delete note"
                      className="text-[#7A766E] hover:text-[#E11D48] ml-2 opacity-60 group-hover:opacity-100 transition-opacity cursor-pointer p-1"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-xs text-[#7A766E] italic text-center py-2">
                  No session notes added yet. Use the box above to log takeaways during or after this meeting.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

