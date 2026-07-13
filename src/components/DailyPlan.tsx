import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ListTodo, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Sparkles,
  CalendarDays,
  X
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

  // Add preset task
  const handleAddPresetTask = (text: string) => {
    const newTask: DailyPlanningTask = {
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      channelId: selectedChannelIdForNewTask,
      date: selectedDate,
      text,
      isCompleted: false,
    };
    onAddTask(newTask);
    setIsAddModalOpen(false); // Auto-close modal when preset is clicked
  };

  // Add custom task
  const handleAddCustomTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTaskText.trim()) return;

    const newTask: DailyPlanningTask = {
      id: `task-${Date.now()}`,
      channelId: selectedChannelIdForNewTask,
      date: selectedDate,
      text: customTaskText.trim(),
      isCompleted: false,
    };
    onAddTask(newTask);
    setCustomTaskText('');
    setIsAddModalOpen(false); // Auto-close modal when custom task is added
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
            <div>
              <h4 className="text-sm font-black text-slate-950 uppercase tracking-wider flex items-center gap-2">
                <ListTodo className="w-5 h-5 text-slate-950" />
                <span>Aaj Ka Plan</span>
                <span className="text-[10px] bg-slate-100 text-slate-900 px-2 py-0.5 rounded-full uppercase font-bold tracking-normal border border-slate-950">
                  Daily Checklist
                </span>
              </h4>
              <p className="text-[11px] md:text-xs text-slate-600 font-semibold flex items-center gap-1.5 mt-1">
                <CalendarDays className="w-3.5 h-3.5 text-slate-700" />
                <span>Target Date: </span>
                <span className="text-slate-950 font-bold">{formatFriendlyDate(selectedDate)}</span>
              </p>
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
          {totalTasksCount > 0 && (
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
                            {sortedTasks.map((task) => (
                              <motion.div 
                                key={task.id}
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className={`flex items-center justify-between gap-2.5 p-2.5 rounded-lg border border-slate-950 transition-all ${
                                  task.isCompleted 
                                    ? 'bg-slate-100 text-slate-400 line-through' 
                                    : 'bg-white text-slate-800 shadow-sm hover:translate-x-0.5'
                                }`}
                              >
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
                                    <span className="text-[9px] text-slate-500 font-black tracking-wide mt-1">
                                      📺 {channel.name}
                                    </span>
                                  </div>
                                </button>
                                <button
                                  onClick={() => onDeleteTask(task.id)}
                                  className="text-slate-400 hover:text-rose-600 p-1 rounded-md hover:bg-rose-50 transition-all cursor-pointer shrink-0"
                                  title="Delete task"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </motion.div>
                            ))}
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
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Quick-Add Common Goals:</span>
                  </span>
                  <div className="flex flex-col gap-1.5">
                    {QUICK_TASK_PRESETS.map((preset, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleAddPresetTask(preset.text)}
                        className="w-full text-left px-3.5 py-3 text-xs font-bold bg-slate-50 hover:bg-slate-100 text-slate-950 border-2 border-slate-950 rounded-xl transition-all active:scale-98 cursor-pointer flex items-center justify-between group shadow-xs"
                      >
                        <span className="flex items-center gap-2">
                          <span className="shrink-0">{preset.text.split(' ')[0]}</span>
                          <span>{preset.text.split(' ').slice(1).join(' ')}</span>
                        </span>
                        <span className="text-[9px] font-black text-white bg-slate-950 border border-slate-950 px-2 py-0.5 rounded-md transition-all">
                          + Add
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t-2 border-slate-200"></div>
                  <span className="flex-shrink mx-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ya fir custom likhein</span>
                  <div className="flex-grow border-t-2 border-slate-200"></div>
                </div>

                {/* Section 2: Custom input form */}
                <form onSubmit={handleAddCustomTask} className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                      Apna custom goal likhein:
                    </label>
                    <input
                      type="text"
                      required
                      value={customTaskText}
                      onChange={(e) => setCustomTaskText(e.target.value)}
                      placeholder="Ex: Record intro footage, reply to comments..."
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-950 rounded-xl focus:outline-none focus:bg-white text-xs font-semibold text-slate-800 transition-all placeholder:text-slate-400"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 font-black text-white bg-slate-950 hover:bg-slate-900 rounded-xl transition-all shadow-sm active:scale-95 whitespace-nowrap cursor-pointer text-xs border border-slate-950"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Naya Custom Task Add Karein</span>
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
