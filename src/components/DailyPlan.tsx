import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ListTodo, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Sparkles,
  CalendarDays,
  X,
  ChevronDown,
  ChevronUp,
  Clock,
  Edit2,
  Save,
  Check
} from 'lucide-react';
import { DailyPlanningTask, YouTubeChannel } from '../types';

interface DailyPlanProps {
  channels: YouTubeChannel[];
  channelId: string;
  selectedDate: string;
  dailyTasks: DailyPlanningTask[];
  onAddTask: (task: DailyPlanningTask) => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
}

const QUICK_TASK_PRESETS = [
  { text: '📝 Write Script Draft', category: 'Scripting' },
  { text: '🎥 Record Video Footages', category: 'Recording' },
  { text: '✂️ Complete Video Editing', category: 'Editing' },
  { text: '🎨 Design CTR Thumbnail', category: 'Thumbnail' },
  { text: '🚀 Add SEO Tags & Description', category: 'SEO' },
];

export default function DailyPlan({
  channels,
  channelId,
  selectedDate,
  dailyTasks,
  onAddTask,
  onToggleTask,
  onDeleteTask,
}: DailyPlanProps) {
  const [customTaskText, setCustomTaskText] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedChannelIdForNewTask, setSelectedChannelIdForNewTask] = useState(channelId);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Quick-Add Presets State (Editable & Saved in localStorage)
  const [presets, setPresets] = useState<{ text: string; category?: string }[]>(() => {
    const saved = localStorage.getItem('custom_quick_presets');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return QUICK_TASK_PRESETS;
  });

  useEffect(() => {
    localStorage.setItem('custom_quick_presets', JSON.stringify(presets));
  }, [presets]);

  // Preset Editor UI States
  const [isPresetEditMode, setIsPresetEditMode] = useState(false);
  const [newPresetText, setNewPresetText] = useState('');
  const [editingPresetIndex, setEditingPresetIndex] = useState<number | null>(null);
  const [editingPresetText, setEditingPresetText] = useState('');

  // New task parameters
  const [targetTimeMode, setTargetTimeMode] = useState<'none' | '12:00 PM' | '2:00 PM' | '6:00 PM' | '9:00 PM' | 'custom'>('none');
  const [customTime, setCustomTime] = useState('12:00'); // HH:MM
  const [durationDaysMode, setDurationDaysMode] = useState<'1' | '3' | '5' | '7' | '15' | '30' | 'custom'>('1');
  const [customEndDate, setCustomEndDate] = useState('');

  // State for task editing inside the Daily Checklist
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskText, setEditingTaskText] = useState('');
  const [editingTaskTime, setEditingTaskTime] = useState('none');
  const [editingTaskCustomTime, setEditingTaskCustomTime] = useState('12:00');

  // State for task deletion confirmation
  const [deletingTask, setDeletingTask] = useState<DailyPlanningTask | null>(null);

  const handleStartEditTask = (task: DailyPlanningTask) => {
    setEditingTaskId(task.id);
    setEditingTaskText(task.text);
    if (!task.targetTime) {
      setEditingTaskTime('none');
    } else if (['12:00 PM', '2:00 PM', '6:00 PM', '9:00 PM'].includes(task.targetTime)) {
      setEditingTaskTime(task.targetTime);
    } else {
      setEditingTaskTime('custom');
      try {
        const match = task.targetTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (match) {
          let h = parseInt(match[1], 10);
          const m = match[2];
          const ampm = match[3].toUpperCase();
          if (ampm === 'PM' && h < 12) h += 12;
          if (ampm === 'AM' && h === 12) h = 0;
          const hStr = h.toString().padStart(2, '0');
          setEditingTaskCustomTime(`${hStr}:${m}`);
        } else {
          setEditingTaskCustomTime('12:00');
        }
      } catch (e) {
        setEditingTaskCustomTime('12:00');
      }
    }
  };

  const handleCancelEditTask = () => {
    setEditingTaskId(null);
  };

  const handleSaveEditTask = async (task: DailyPlanningTask) => {
    if (!editingTaskText.trim()) return;

    let finalTime = '';
    if (editingTaskTime === 'custom') {
      finalTime = formatTo12Hour(editingTaskCustomTime);
    } else if (editingTaskTime !== 'none') {
      finalTime = editingTaskTime;
    }

    const updatedTask: DailyPlanningTask = {
      ...task,
      text: editingTaskText.trim(),
      targetTime: finalTime || undefined
    };
    if (!finalTime) {
      delete updatedTask.targetTime;
    }

    await onAddTask(updatedTask);
    setEditingTaskId(null);
  };

  const handleInitiateDelete = (task: DailyPlanningTask) => {
    // Check if there are future occurrences with same text/channelId
    const futureOccurrences = dailyTasks.some(t => 
      t.channelId === task.channelId &&
      t.text.trim().toLowerCase() === task.text.trim().toLowerCase() &&
      t.date > task.date
    );

    if (futureOccurrences) {
      setDeletingTask(task);
    } else {
      onDeleteTask(task.id);
    }
  };

  const handleConfirmDelete = async (mode: 'single' | 'all-future') => {
    if (!deletingTask) return;
    try {
      if (mode === 'single') {
        await onDeleteTask(deletingTask.id);
      } else {
        const tasksToDelete = dailyTasks.filter(t => 
          t.channelId === deletingTask.channelId &&
          t.text.trim().toLowerCase() === deletingTask.text.trim().toLowerCase() &&
          t.date >= deletingTask.date
        );
        for (const t of tasksToDelete) {
          await onDeleteTask(t.id);
        }
      }
      setDeletingTask(null);
    } catch (e) {
      console.error(e);
    }
  };

  // Keep selected channel synchronized with active channel
  useEffect(() => {
    setSelectedChannelIdForNewTask(channelId);
  }, [channelId]);

  // Filter tasks for the selected date (across ALL channels)
  const selectedDateTasks = dailyTasks.filter(
    (task) => task.date === selectedDate
  );

  const totalTasksCount = selectedDateTasks.length;
  const completedTasksCount = selectedDateTasks.filter((t) => t.isCompleted).length;
  const taskCompletionPercentage =
    totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

  // Manage preset helper functions
  const handleAddPresetTemplate = () => {
    if (!newPresetText.trim()) return;
    setPresets([...presets, { text: newPresetText.trim() }]);
    setNewPresetText('');
  };

  const handleSavePresetTemplate = (index: number) => {
    if (!editingPresetText.trim()) return;
    const updated = [...presets];
    updated[index] = { ...updated[index], text: editingPresetText.trim() };
    setPresets(updated);
    setEditingPresetIndex(null);
  };

  const handleDeletePresetTemplate = (index: number) => {
    const updated = presets.filter((_, i) => i !== index);
    setPresets(updated);
    if (editingPresetIndex === index) {
      setEditingPresetIndex(null);
    }
  };

  // Helper to pre-fill/select preset text
  const handleSelectPreset = (text: string) => {
    setCustomTaskText(text);
  };

  const formatTo12Hour = (time24: string) => {
    if (!time24) return '';
    const [hoursStr, minutesStr] = time24.split(':');
    const hours = parseInt(hoursStr, 10);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${hours12}:${minutesStr} ${ampm}`;
  };

  // Add task with selected settings
  const handleAddCustomTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTaskText.trim()) return;

    // Calculate targetTime
    let finalTime = '';
    if (targetTimeMode === 'custom') {
      finalTime = formatTo12Hour(customTime);
    } else if (targetTimeMode !== 'none') {
      finalTime = targetTimeMode;
    }

    // Calculate dates list to add
    const datesToAdd: string[] = [];
    if (durationDaysMode === 'custom') {
      if (customEndDate && customEndDate >= selectedDate) {
        const start = new Date(selectedDate);
        const end = new Date(customEndDate);
        const temp = new Date(start);
        while (temp <= end) {
          datesToAdd.push(temp.toISOString().split('T')[0]);
          temp.setDate(temp.getDate() + 1);
        }
      } else {
        datesToAdd.push(selectedDate);
      }
    } else {
      const numDays = parseInt(durationDaysMode, 10);
      const start = new Date(selectedDate);
      for (let i = 0; i < numDays; i++) {
        const temp = new Date(start);
        temp.setDate(start.getDate() + i);
        datesToAdd.push(temp.toISOString().split('T')[0]);
      }
    }

    // Add for all target dates
    for (const dateVal of datesToAdd) {
      const newTask: DailyPlanningTask = {
        id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        channelId: selectedChannelIdForNewTask,
        date: dateVal,
        text: customTaskText.trim(),
        isCompleted: false,
        ...(finalTime ? { targetTime: finalTime } : {})
      };
      await onAddTask(newTask);
    }

    // Reset fields & close
    setCustomTaskText('');
    setTargetTimeMode('none');
    setDurationDaysMode('1');
    setIsAddModalOpen(false);
  };

  // Format date nicely for Indian / Global readability (e.g. Monday, 13 July 2026)
  const formatFriendlyDate = (dateStr: string) => {
    try {
      const [year, month, day] = dateStr.split('-').map(Number);
      const dateObj = new Date(year, month - 1, day);
      return dateObj.toLocaleDateString('hi-IN', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="bg-white border-2 border-slate-950 rounded-2xl p-4 md:p-6 shadow-sm flex flex-col justify-between">
      <div className="space-y-4">
        
        {/* Header with Progress Tracker */}
        <div className="border-b-2 border-slate-950 pb-3 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div 
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-1.5 rounded-xl select-none transition-all flex-1"
              title="Click to Collapse or Expand Aaj Ka Plan"
            >
              <div className="p-1.5 bg-slate-100 hover:bg-slate-200 border-2 border-slate-950 rounded-lg flex items-center justify-center transition-all active:scale-90">
                {isCollapsed ? <ChevronDown className="w-4 h-4 text-slate-950" /> : <ChevronUp className="w-4 h-4 text-slate-950" />}
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-950 uppercase tracking-wider flex items-center gap-2">
                  <ListTodo className="w-5 h-5 text-slate-950" />
                  <span>Aaj Ka Plan</span>
                  <span className="text-[10px] bg-slate-100 text-slate-900 px-2 py-0.5 rounded-full uppercase font-bold tracking-normal border border-slate-950">
                    Daily Checklist {isCollapsed ? ' [📁 Collapsed]' : ' [📖 Open]'}
                  </span>
                </h4>
                <p className="text-[11px] md:text-xs text-slate-600 font-semibold flex items-center gap-1.5 mt-1">
                  <CalendarDays className="w-3.5 h-3.5 text-slate-700" />
                  <span>Target Date: </span>
                  <span className="text-slate-950 font-bold">{formatFriendlyDate(selectedDate)}</span>
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-black text-slate-950 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-950">
                {completedTasksCount}/{totalTasksCount} Done
              </span>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-1 px-3 py-1.5 bg-slate-950 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition-all active:scale-95 shadow-sm cursor-pointer border border-slate-950"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Naya Task</span>
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          {!isCollapsed && totalTasksCount > 0 && (
            <div className="space-y-1 pt-1">
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                <span>Task Completion Progress</span>
                <span className="text-slate-950 font-extrabold">{taskCompletionPercentage}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-950">
                <div 
                  className="bg-slate-950 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${taskCompletionPercentage}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Collapsible Content */}
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4"
          >
            {/* Task List Container - Grouped by Channel */}
            <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
              {selectedDateTasks.length === 0 ? (
                <div className="py-10 text-center text-slate-500 text-xs font-bold border-2 border-dashed border-slate-950 rounded-2xl bg-slate-50/50 px-4">
                  <ListTodo className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  Is date ke liye kisi bhi channel par koi task nahi hai.
                  <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="mt-3 mx-auto flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-950 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-all active:scale-95 shadow-sm cursor-pointer border border-slate-950"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Naya Task Add Karein</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {channels.map((channel) => {
                    const channelTasks = selectedDateTasks.filter(t => t.channelId === channel.id);
                    // Sort channel tasks: pending tasks (isCompleted === false) first!
                    const sortedTasks = [...channelTasks].sort((a, b) => {
                      if (a.isCompleted === b.isCompleted) return 0;
                      return a.isCompleted ? 1 : -1; // false comes before true
                    });

                    return (
                      <div key={channel.id} className="border-2 border-slate-950 rounded-xl p-3 bg-slate-50/30 space-y-2 flex flex-col justify-between">
                        <div>
                          {/* Channel Group Header */}
                          <div className="flex items-center justify-between pb-2 border-b border-slate-950 mb-2">
                            <div className="flex items-center gap-1.5">
                              <span 
                                className="w-3 h-3 rounded-full border border-slate-950" 
                                style={{ backgroundColor: channel.avatarColor }} 
                              />
                              <span className="text-xs font-black text-slate-950 truncate max-w-[140px] md:max-w-xs">{channel.name}</span>
                            </div>
                            <span className="text-[9px] font-black text-slate-900 bg-white border border-slate-950 px-1.5 py-0.5 rounded-md">
                              {channelTasks.filter(t => t.isCompleted).length}/{channelTasks.length} Done
                            </span>
                          </div>

                          {/* Channel Tasks */}
                          <div className="space-y-2">
                            {sortedTasks.length === 0 ? (
                              <p className="text-[10px] text-slate-400 font-semibold italic py-4 text-center">
                                Is channel ke liye koi task nahi hai.
                              </p>
                            ) : (
                              <AnimatePresence initial={false}>
                                {sortedTasks.map((task) => {
                                  const isEditing = editingTaskId === task.id;
                                  return (
                                    <motion.div 
                                      key={task.id}
                                      initial={{ opacity: 0, y: 5 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      exit={{ opacity: 0, x: -10 }}
                                      className={`flex flex-col gap-2 p-2.5 rounded-lg border border-slate-950 transition-all ${
                                        task.isCompleted && !isEditing
                                          ? 'bg-slate-100 text-slate-400 line-through' 
                                          : 'bg-white text-slate-800 shadow-sm'
                                      }`}
                                    >
                                      {isEditing ? (
                                        <div className="w-full space-y-2 text-xs">
                                          <div className="flex items-center gap-2">
                                            <input
                                              type="text"
                                              value={editingTaskText}
                                              onChange={(e) => setEditingTaskText(e.target.value)}
                                              className="flex-1 px-2.5 py-1.5 bg-slate-50 border-2 border-slate-950 rounded-lg font-black text-slate-800 focus:outline-none"
                                              placeholder="Edit goal text..."
                                            />
                                          </div>
                                          <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-[9px] font-black uppercase text-slate-500">Deadline:</span>
                                            <select
                                              value={editingTaskTime}
                                              onChange={(e) => setEditingTaskTime(e.target.value)}
                                              className="px-2 py-1 bg-white border-2 border-slate-950 rounded-lg text-[10px] font-black focus:outline-none cursor-pointer"
                                            >
                                              <option value="none">No Limit</option>
                                              <option value="12:00 PM">12:00 PM</option>
                                              <option value="2:00 PM">2:00 PM</option>
                                              <option value="6:00 PM">6:00 PM</option>
                                              <option value="9:00 PM">9:00 PM</option>
                                              <option value="custom">Custom ⏱️</option>
                                            </select>
                                            {editingTaskTime === 'custom' && (
                                              <input
                                                type="time"
                                                value={editingTaskCustomTime}
                                                onChange={(e) => setEditingTaskCustomTime(e.target.value)}
                                                className="px-2 py-0.5 border-2 border-slate-950 rounded-lg text-[10px] font-black focus:outline-none"
                                              />
                                            )}
                                          </div>
                                          <div className="flex justify-end gap-1.5">
                                            <button
                                              type="button"
                                              onClick={handleCancelEditTask}
                                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-950 text-slate-700 text-[10px] font-bold rounded flex items-center gap-1 cursor-pointer"
                                            >
                                              <X className="w-3 h-3" />
                                              <span>Cancel</span>
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => handleSaveEditTask(task)}
                                              className="px-2.5 py-1 bg-slate-950 hover:bg-slate-900 text-white text-[10px] font-black rounded flex items-center gap-1 cursor-pointer"
                                            >
                                              <Check className="w-3 h-3" />
                                              <span>Save</span>
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="flex items-center justify-between gap-2.5 w-full">
                                          <button
                                            onClick={() => onToggleTask(task.id)}
                                            className="flex items-start gap-2.5 text-left flex-1 font-bold text-xs cursor-pointer"
                                          >
                                            {task.isCompleted ? (
                                              <CheckCircle2 className="w-5 h-5 text-slate-950 shrink-0 mt-0.5" />
                                            ) : (
                                              <div className="w-5 h-5 rounded border-2 border-slate-950 hover:bg-slate-100 shrink-0 mt-0.5 transition-colors bg-white" />
                                            )}
                                            <div className="flex flex-col">
                                              <span className="leading-snug">{task.text}</span>
                                              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                                <span className="text-[9px] text-slate-500 font-black tracking-wide">
                                                  📺 {channel.name}
                                                </span>
                                                {task.targetTime && (
                                                  <span className="text-[9px] font-black text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-300 inline-flex items-center gap-0.5">
                                                    ⏰ {task.targetTime} se pehle complete karein
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                          </button>
                                          <div className="flex items-center gap-1 shrink-0">
                                            <button
                                              onClick={() => handleStartEditTask(task)}
                                              className="text-slate-400 hover:text-indigo-600 p-1 rounded-md hover:bg-indigo-50 transition-all cursor-pointer"
                                              title="Edit task"
                                            >
                                              <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                              onClick={() => handleInitiateDelete(task)}
                                              className="text-slate-400 hover:text-rose-600 p-1 rounded-md hover:bg-rose-50 transition-all cursor-pointer"
                                              title="Delete task"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                    </motion.div>
                                  );
                                })}
                              </AnimatePresence>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Naya Task Add Button at the bottom as secondary trigger */}
            <div className="border-t-2 border-slate-950 pt-3">
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="w-full py-2.5 border-2 border-dashed border-slate-950 hover:bg-slate-50 text-slate-950 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                <Plus className="w-4 h-4 text-slate-950" />
                <span>Naya Task Add Karein</span>
              </button>
            </div>
          </motion.div>
        )}

      </div>

      {/* POPUP MODAL FOR ADDING TASK (Quick-add common goals + Custom task inputs are contained inside here) */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            {/* Backdrop click to cancel */}
            <div className="absolute inset-0" onClick={() => setIsAddModalOpen(false)} />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-2xl shadow-xl border-2 border-slate-950 w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] z-10"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="bg-slate-50 px-5 py-4 border-b-2 border-slate-950 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-slate-100 text-slate-900 rounded-xl border border-slate-950">
                    <ListTodo className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-950 text-xs md:text-sm uppercase tracking-wider">
                      🎯 Naya Daily Goal Add Karein
                    </h3>
                    <p className="text-[10px] md:text-xs text-slate-600 font-semibold">
                      Target Date: <span className="text-slate-950 font-bold">{formatFriendlyDate(selectedDate)}</span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1.5 text-slate-600 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all cursor-pointer border border-slate-950"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-5 space-y-5 overflow-y-auto flex-1">
                
                {/* Channel Selector for New Task */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Channel Select Karein:
                  </label>
                  <select
                    value={selectedChannelIdForNewTask}
                    onChange={(e) => setSelectedChannelIdForNewTask(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border-2 border-slate-950 rounded-xl focus:outline-none focus:bg-white text-xs font-black text-slate-800 transition-all cursor-pointer"
                  >
                    {channels.map((chan) => (
                      <option key={chan.id} value={chan.id}>
                        {chan.name} ({chan.handle})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Section 1: Quick-Add Presets */}
                <div className="space-y-2 border-2 border-slate-950 p-3 rounded-xl bg-slate-50">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>Quick-Add Common Goals:</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsPresetEditMode(!isPresetEditMode)}
                      className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 bg-white border border-slate-300 px-2 py-1 rounded hover:border-slate-950 transition-all cursor-pointer"
                    >
                      {isPresetEditMode ? 'Done' : '✏️ Presets Edit Karein'}
                    </button>
                  </div>

                  {isPresetEditMode ? (
                    <div className="space-y-2 pt-1">
                      {/* Add new preset template inline */}
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          placeholder="New preset text (e.g. 📝 Write script)"
                          value={newPresetText}
                          onChange={(e) => setNewPresetText(e.target.value)}
                          className="flex-1 px-2.5 py-1.5 bg-white border border-slate-950 rounded-lg text-[11px] font-semibold focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleAddPresetTemplate}
                          className="px-2.5 py-1.5 bg-slate-950 text-white rounded-lg text-[11px] font-black hover:bg-slate-900 border border-slate-950"
                        >
                          Add
                        </button>
                      </div>

                      <div className="max-h-[160px] overflow-y-auto space-y-1.5 pr-1">
                        {presets.map((preset, index) => (
                          <div key={index} className="flex items-center gap-1.5 bg-white p-1.5 rounded-lg border border-slate-200">
                            {editingPresetIndex === index ? (
                              <input
                                type="text"
                                value={editingPresetText}
                                onChange={(e) => setEditingPresetText(e.target.value)}
                                className="flex-1 px-2 py-1 border border-slate-950 rounded text-xs font-semibold focus:outline-none"
                                autoFocus
                              />
                            ) : (
                              <span className="flex-1 text-xs font-semibold text-slate-800 truncate">
                                {preset.text}
                              </span>
                            )}

                            <div className="flex items-center gap-1 shrink-0">
                              {editingPresetIndex === index ? (
                                <button
                                  type="button"
                                  onClick={() => handleSavePresetTemplate(index)}
                                  className="p-1 text-emerald-600 hover:bg-emerald-50 rounded text-[11px] font-bold"
                                >
                                  Save
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingPresetIndex(index);
                                    setEditingPresetText(preset.text);
                                  }}
                                  className="p-1 text-slate-500 hover:text-slate-950 rounded text-[11px] font-bold"
                                >
                                  Edit
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDeletePresetTemplate(index)}
                                className="p-1 text-rose-500 hover:bg-rose-50 rounded text-[11px] font-bold"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-1.5 pt-1">
                      {presets.map((preset, index) => (
                        <div
                          key={index}
                          className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between group shadow-2xs hover:bg-slate-100 transition-all"
                        >
                          <button
                            type="button"
                            onClick={() => handleSelectPreset(preset.text)}
                            className="flex items-center gap-2 flex-1 text-left cursor-pointer focus:outline-none"
                          >
                            <span className="shrink-0 text-sm">{preset.text.split(' ')[0]}</span>
                            <span className="text-xs font-bold text-slate-800">{preset.text.split(' ').slice(1).join(' ')}</span>
                          </button>
                          
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleSelectPreset(preset.text)}
                              className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded transition-all cursor-pointer flex items-center gap-0.5"
                              title="Select this goal"
                            >
                              <span>Select</span>
                              <span>✏️</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePresetTemplate(index)}
                              className="text-[10px] font-black text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-2 py-1 rounded transition-all cursor-pointer flex items-center gap-0.5"
                              title="Delete preset"
                            >
                              <span>Delete</span>
                              <span>🗑️</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t-2 border-slate-100"></div>
                  <span className="flex-shrink mx-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Configure Goal Details</span>
                  <div className="flex-grow border-t-2 border-slate-100"></div>
                </div>

                {/* Section 2: Custom input form & Config properties */}
                <form onSubmit={handleAddCustomTask} className="space-y-4">
                  {/* Goal Title Box */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                      Goal text (Aap edit bhi kar sakte hain):
                    </label>
                    <input
                      type="text"
                      required
                      value={customTaskText}
                      onChange={(e) => setCustomTaskText(e.target.value)}
                      placeholder="Ex: Record intro footage, reply to comments..."
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-950 rounded-xl focus:outline-none focus:bg-white text-xs font-black text-slate-800 transition-all placeholder:text-slate-400"
                    />
                  </div>

                  {/* Deadline selection */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-rose-500" />
                      <span>⏰ Completion Deadline (Kis time se pehle complete karna hai?):</span>
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { mode: 'none', label: 'No Limit' },
                        { mode: '12:00 PM', label: '12:00 PM' },
                        { mode: '2:00 PM', label: '2:00 PM' },
                        { mode: '6:00 PM', label: '6:00 PM' },
                        { mode: '9:00 PM', label: '9:00 PM' },
                        { mode: 'custom', label: 'Custom ⏱️' },
                      ].map((opt) => (
                        <button
                          key={opt.mode}
                          type="button"
                          onClick={() => setTargetTimeMode(opt.mode as any)}
                          className={`py-2 text-[10px] font-black rounded-xl border-2 transition-all cursor-pointer ${
                            targetTimeMode === opt.mode
                              ? 'bg-slate-950 text-white border-slate-950 shadow-sm'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>

                    {targetTimeMode === 'custom' && (
                      <div className="flex items-center gap-2 pt-1 animate-fadeIn">
                        <span className="text-[10px] font-black text-slate-500 uppercase">Select Time:</span>
                        <input
                          type="time"
                          value={customTime}
                          onChange={(e) => setCustomTime(e.target.value)}
                          className="px-3 py-1.5 border-2 border-slate-950 rounded-xl text-xs font-black bg-white focus:outline-none cursor-pointer"
                        />
                      </div>
                    )}
                  </div>

                  {/* Duration selection */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                      <CalendarDays className="w-3.5 h-3.5 text-indigo-500" />
                      <span>📅 Duration (Yeh goal kitne dino ke liye set karna hai?):</span>
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { mode: '1', label: '1 Din (Aaj)' },
                        { mode: '3', label: '3 Din (Daily)' },
                        { mode: '5', label: '5 Din (Daily)' },
                        { mode: '7', label: '7 Din (Weekly)' },
                        { mode: '30', label: '30 Din (Monthly)' },
                        { mode: 'custom', label: 'Custom Date 🗓️' },
                      ].map((opt) => (
                        <button
                          key={opt.mode}
                          type="button"
                          onClick={() => {
                            setDurationDaysMode(opt.mode as any);
                            if (opt.mode === 'custom' && !customEndDate) {
                              const start = new Date(selectedDate);
                              start.setDate(start.getDate() + 7);
                              setCustomEndDate(start.toISOString().split('T')[0]);
                            }
                          }}
                          className={`py-2 text-[10px] font-black rounded-xl border-2 transition-all cursor-pointer ${
                            durationDaysMode === opt.mode
                              ? 'bg-slate-950 text-white border-slate-950 shadow-sm'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>

                    {durationDaysMode === 'custom' && (
                      <div className="flex flex-col gap-1 pt-1 animate-fadeIn">
                        <label className="text-[10px] font-black text-slate-500 uppercase">Target End Date:</label>
                        <input
                          type="date"
                          value={customEndDate}
                          min={selectedDate}
                          onChange={(e) => setCustomEndDate(e.target.value)}
                          className="w-full px-3 py-2 border-2 border-slate-950 rounded-xl text-xs font-black bg-white focus:outline-none cursor-pointer"
                        />
                      </div>
                    )}
                  </div>

                  {/* Summary of what will happen */}
                  {customTaskText.trim() && (
                    <div className="p-3 bg-indigo-50 border-2 border-indigo-950 rounded-xl text-[11px] font-black text-indigo-950 leading-relaxed space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-indigo-700" />
                        <span>Action Summary:</span>
                      </div>
                      <p className="font-bold text-slate-700 leading-snug">
                        Goal <span className="text-slate-950 font-black">"{customTaskText}"</span> automatically schedule ho jayega{' '}
                        {durationDaysMode === 'custom' ? (
                          <span>custom date range tak</span>
                        ) : (
                          <span>agli <span className="text-indigo-700 font-black">{durationDaysMode} dino</span> ke liye</span>
                        )}{' '}
                        {targetTimeMode !== 'none' && (
                          <span>with daily completion target <span className="text-rose-700 font-black">{targetTimeMode === 'custom' ? formatTo12Hour(customTime) : targetTimeMode}</span>!</span>
                        )}
                      </p>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 font-black text-white bg-slate-950 hover:bg-slate-900 rounded-xl transition-all shadow-sm active:scale-95 whitespace-nowrap cursor-pointer text-xs border border-slate-950"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Goal Confirm Karke Add Karein</span>
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- TASK DELETE CONFIRMATION MODAL --- */}
      <AnimatePresence>
        {deletingTask && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border-2 border-slate-950 rounded-2xl shadow-xl max-w-md w-full overflow-hidden"
            >
              <div className="px-6 py-5 border-b border-slate-150 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2.5">
                  <Trash2 className="w-5 h-5 text-rose-600" />
                  <h3 className="font-black text-slate-950 text-sm md:text-base">Goal Delete Karein?</h3>
                </div>
                <button 
                  onClick={() => setDeletingTask(null)}
                  className="text-slate-400 hover:text-slate-600 font-bold text-xs px-2.5 py-1.5 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-xs font-bold text-slate-700 leading-relaxed">
                  Aapka goal <span className="font-black text-slate-950">"{deletingTask.text}"</span> aage ke calendar dates par bhi schedule kiya hua hai. Aap ise kis tarah hatana chahte hain?
                </p>

                <div className="space-y-2 pt-2">
                  <button
                    onClick={() => handleConfirmDelete('single')}
                    className="w-full text-left px-4 py-3 bg-white hover:bg-slate-50 text-slate-950 border-2 border-slate-950 rounded-xl transition-all font-black text-xs cursor-pointer flex items-center justify-between"
                  >
                    <span>📅 Sirf Aaj Se Delete Karein ({deletingTask.date})</span>
                    <span className="text-[10px] font-black text-slate-500">Only This Day</span>
                  </button>

                  <button
                    onClick={() => handleConfirmDelete('all-future')}
                    className="w-full text-left px-4 py-3 bg-rose-50 hover:bg-rose-100 text-rose-950 border-2 border-rose-950 rounded-xl transition-all font-black text-xs cursor-pointer flex items-center justify-between"
                  >
                    <span>🚀 Aaj Aur Aage Ke Sabhi Dino Se Hatayein</span>
                    <span className="text-[10px] font-black text-rose-700">Delete All Future</span>
                  </button>
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-50 border-t border-slate-150 flex justify-end">
                <button
                  onClick={() => setDeletingTask(null)}
                  className="px-4 py-2 bg-slate-950 hover:bg-slate-900 text-white text-xs font-black rounded-xl transition-all border border-slate-950 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
