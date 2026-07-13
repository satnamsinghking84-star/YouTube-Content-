import React, { useState } from 'react';
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
import { DailyPlanningTask } from '../types';

interface DailyPlanProps {
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
  channelId,
  selectedDate,
  dailyTasks,
  onAddTask,
  onToggleTask,
  onDeleteTask,
}: DailyPlanProps) {
  const [customTaskText, setCustomTaskText] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Filter tasks for active channel and selected date
  const selectedDateTasks = dailyTasks.filter(
    (task) => task.channelId === channelId && task.date === selectedDate
  );

  const totalTasksCount = selectedDateTasks.length;
  const completedTasksCount = selectedDateTasks.filter((t) => t.isCompleted).length;
  const taskCompletionPercentage =
    totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

  // Add preset task
  const handleAddPresetTask = (text: string) => {
    const newTask: DailyPlanningTask = {
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      channelId,
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
      channelId,
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
    <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-6 shadow-xs flex flex-col justify-between">
      <div className="space-y-4">
        
        {/* Header with Progress Tracker */}
        <div className="border-b border-slate-150 pb-3 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-black text-indigo-950 uppercase tracking-wider flex items-center gap-2">
                <ListTodo className="w-5 h-5 text-indigo-600" />
                <span>Aaj Ka Plan</span>
                <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full lowercase font-bold tracking-normal">
                  daily checklist
                </span>
              </h4>
              <p className="text-[11px] md:text-xs text-slate-500 font-semibold flex items-center gap-1.5 mt-1">
                <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                <span>Target Date: </span>
                <span className="text-indigo-600 font-bold">{formatFriendlyDate(selectedDate)}</span>
              </p>
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg">
                {completedTasksCount}/{totalTasksCount} Done
              </span>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-all active:scale-95 shadow-sm hover:shadow-indigo-100 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Naya Task</span>
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          {totalTasksCount > 0 && (
            <div className="space-y-1 pt-1">
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                <span>Task Completion Progress</span>
                <span className="text-indigo-600 font-extrabold">{taskCompletionPercentage}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-100/50">
                <div 
                  className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${taskCompletionPercentage}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Task List Container */}
        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
          {selectedDateTasks.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-xs font-bold border border-dashed border-slate-200 rounded-2xl bg-slate-50/30 px-4">
              <ListTodo className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              Is date ke liye koi task nahi hai.
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="mt-3 mx-auto flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all active:scale-95 shadow-md shadow-indigo-100 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Naya Task Add Karein</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {selectedDateTasks.map((task) => (
                  <motion.div 
                    key={task.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition-all ${
                      task.isCompleted 
                        ? 'bg-slate-50 border-slate-200 text-slate-400 line-through' 
                        : 'bg-white border-slate-200 hover:border-slate-350 text-slate-800 shadow-2xs'
                    }`}
                  >
                    <button
                      onClick={() => onToggleTask(task.id)}
                      className="flex items-center gap-3 text-left flex-1 font-semibold text-xs cursor-pointer"
                    >
                      {task.isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-indigo-600 shrink-0" />
                      ) : (
                        <div className="w-5 h-5 rounded-md border-2 border-slate-300 hover:border-indigo-500 shrink-0 transition-colors bg-white" />
                      )}
                      <span className="leading-snug">{task.text}</span>
                    </button>
                    <button
                      onClick={() => onDeleteTask(task.id)}
                      className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                      title="Delete task"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Naya Task Add Button at the bottom as secondary trigger */}
        <div className="border-t border-slate-100 pt-3">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="w-full py-2.5 border border-dashed border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/20 text-indigo-600 hover:text-indigo-700 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-indigo-600" />
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
              className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] z-10"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="bg-slate-50 px-5 py-4 border-b border-slate-150 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                    <ListTodo className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 text-xs md:text-sm uppercase tracking-wider">
                      🎯 Naya Daily Goal Add Karein
                    </h3>
                    <p className="text-[10px] md:text-xs text-slate-500 font-semibold">
                      Target Date: <span className="text-indigo-600 font-bold">{formatFriendlyDate(selectedDate)}</span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-5 space-y-5 overflow-y-auto flex-1">
                {/* Section 1: Quick-Add Presets */}
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Quick-Add Common Goals:</span>
                  </span>
                  <div className="flex flex-col gap-1.5">
                    {QUICK_TASK_PRESETS.map((preset, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleAddPresetTask(preset.text)}
                        className="w-full text-left px-3.5 py-3 text-xs font-bold bg-indigo-50/50 hover:bg-indigo-100/85 text-indigo-950 border border-indigo-100/40 rounded-xl transition-all active:scale-98 cursor-pointer flex items-center justify-between group"
                      >
                        <span className="flex items-center gap-2">
                          <span className="shrink-0">{preset.text.split(' ')[0]}</span>
                          <span>{preset.text.split(' ').slice(1).join(' ')}</span>
                        </span>
                        <span className="text-[10px] font-black text-indigo-500 uppercase bg-white/80 px-2 py-0.5 rounded-md group-hover:bg-indigo-600 group-hover:text-white transition-all">
                          + Add
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-slate-150"></div>
                  <span className="flex-shrink mx-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ya fir custom likhein</span>
                  <div className="flex-grow border-t border-slate-150"></div>
                </div>

                {/* Section 2: Custom input form */}
                <form onSubmit={handleAddCustomTask} className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Apna custom goal likhein:
                    </label>
                    <input
                      type="text"
                      required
                      value={customTaskText}
                      onChange={(e) => setCustomTaskText(e.target.value)}
                      placeholder="Ex: Record intro footage, reply to comments..."
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-xs font-semibold text-slate-800 transition-all placeholder:text-slate-400"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-md hover:shadow-indigo-100 active:scale-95 whitespace-nowrap cursor-pointer text-xs"
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
