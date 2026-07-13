import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Youtube, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle,
  Tv,
  Calendar as CalendarIcon,
  Video,
  FileText,
  Clock,
  Edit3
} from 'lucide-react';
import { YouTubeChannel, ContentScheduleItem, DailyPlanningTask } from './types';
import ContentCalendar from './components/ContentCalendar';
import ContentScheduler from './components/ContentScheduler';
import DailyPlan from './components/DailyPlan';

// Simple starting seed data
const INITIAL_CHANNELS: YouTubeChannel[] = [
  { id: 'chan-1', name: 'TechBytes Hindi', handle: '@techbytes_hindi', avatarColor: '#6366f1' },
  { id: 'chan-2', name: 'Zesty Food & Travel', handle: '@zesty_vlogs', avatarColor: '#10b981' }
];

const INITIAL_CONTENT: ContentScheduleItem[] = [
  {
    id: 'sched-1',
    channelId: 'chan-1',
    date: '2026-07-16',
    thumbnail: '',
    title: 'Vite vs NextJS in 2026: Why Vite Wins!',
    description: 'Highlighting lightning-fast build speeds, seamless TypeScript type stripping, and why client-first setups rule modern React applets.',
    status: 'Scheduled'
  },
  {
    id: 'sched-2',
    channelId: 'chan-1',
    date: '2026-07-22',
    thumbnail: '',
    title: 'Ultimate CSS Tricks in Tailwind v4',
    description: 'Exploring new @theme configurations, custom Google Fonts integration, inline fluid typography, and custom transitions with motion.',
    status: 'Scripting'
  },
  {
    id: 'sched-3',
    channelId: 'chan-2',
    date: '2026-07-18',
    thumbnail: '',
    title: 'Exploring Old Delhi: 5 Hidden Street Food Spots!',
    description: 'A visual culinary journey through narrow ancient lanes, tasting generations-old recipes of seekh kababs, kachoris, and direct vendor stories.',
    status: 'Recording'
  }
];

const INITIAL_DAILY_TASKS: DailyPlanningTask[] = [
  { id: 't-1', channelId: 'chan-1', date: '2026-07-13', text: '📝 Research 3 hot topics for Vite vs NextJS video', isCompleted: true },
  { id: 't-2', channelId: 'chan-1', date: '2026-07-13', text: '🎥 Record A-Roll for the Tailwind v4 video', isCompleted: false },
  { id: 't-3', channelId: 'chan-1', date: '2026-07-16', text: '🎨 Design premium high-CTR thumbnail', isCompleted: false }
];

const PRESET_AVATAR_COLORS = [
  '#6366f1', // Indigo
  '#10b981', // Emerald
  '#ec4899', // Pink
  '#f59e0b', // Amber
  '#0ea5e9', // Sky
  '#a855f7', // Purple
  '#f43f5e', // Rose
];

export default function App() {
  // --- Persistent States from Local Storage ---
  const [channels, setChannels] = useState<YouTubeChannel[]>(() => {
    const saved = localStorage.getItem('yt_channels');
    return saved ? JSON.parse(saved) : INITIAL_CHANNELS;
  });

  const [activeChannelId, setActiveChannelId] = useState<string>(() => {
    const saved = localStorage.getItem('yt_active_channel_id');
    if (saved) return saved;
    return INITIAL_CHANNELS[0]?.id || '';
  });

  const [contentItems, setContentItems] = useState<ContentScheduleItem[]>(() => {
    const saved = localStorage.getItem('yt_content_items');
    return saved ? JSON.parse(saved) : INITIAL_CONTENT;
  });

  const [dailyTasks, setDailyTasks] = useState<DailyPlanningTask[]>(() => {
    const saved = localStorage.getItem('yt_daily_tasks');
    return saved ? JSON.parse(saved) : INITIAL_DAILY_TASKS;
  });

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date(2026, 6, 13).toISOString().split('T')[0];
  });

  // --- UI Interactive States ---
  const [showAddChannelModal, setShowAddChannelModal] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelHandle, setNewChannelHandle] = useState('');
  const [selectedAvatarColor, setSelectedAvatarColor] = useState(PRESET_AVATAR_COLORS[0]);

  // Alert & Notification toast states
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // --- Save to Local Storage ---
  useEffect(() => {
    localStorage.setItem('yt_channels', JSON.stringify(channels));
  }, [channels]);

  useEffect(() => {
    localStorage.setItem('yt_active_channel_id', activeChannelId);
  }, [activeChannelId]);

  useEffect(() => {
    localStorage.setItem('yt_content_items', JSON.stringify(contentItems));
  }, [contentItems]);

  useEffect(() => {
    localStorage.setItem('yt_daily_tasks', JSON.stringify(dailyTasks));
  }, [dailyTasks]);

  // Custom Toast helper
  const triggerToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // --- Daily Planning Task Handlers ---
  const handleAddTask = (task: DailyPlanningTask) => {
    setDailyTasks(prev => [...prev, task]);
    triggerToast("Task added successfully!");
  };

  const handleToggleTask = (id: string) => {
    setDailyTasks(prev => prev.map(t => t.id === id ? { ...t, isCompleted: !t.isCompleted } : t));
  };

  const handleDeleteTask = (id: string) => {
    setDailyTasks(prev => prev.filter(t => t.id !== id));
    triggerToast("Task deleted.", "info");
  };

  // --- Multi Channel Handlers ---
  const handleAddChannel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;

    const newChannelId = `chan-${Date.now()}`;
    const handle = newChannelHandle.trim() 
      ? (newChannelHandle.startsWith('@') ? newChannelHandle : `@${newChannelHandle}`)
      : `@${newChannelName.toLowerCase().replace(/\s+/g, '')}`;

    const newChan: YouTubeChannel = {
      id: newChannelId,
      name: newChannelName.trim(),
      handle,
      avatarColor: selectedAvatarColor
    };

    setChannels([...channels, newChan]);
    setActiveChannelId(newChannelId);
    
    // Reset Form & Close
    setNewChannelName('');
    setNewChannelHandle('');
    setSelectedAvatarColor(PRESET_AVATAR_COLORS[Math.floor(Math.random() * PRESET_AVATAR_COLORS.length)]);
    setShowAddChannelModal(false);
    triggerToast(`"${newChan.name}" created successfully!`);
  };

  const handleDeleteChannel = (id: string, name: string) => {
    if (channels.length <= 1) {
      triggerToast("At least one active channel is required!", 'error');
      return;
    }

    if (window.confirm(`Are you sure you want to delete "${name}"? This will erase all its video strategies.`)) {
      const remainingChannels = channels.filter(c => c.id !== id);
      setChannels(remainingChannels);
      setContentItems(contentItems.filter(item => item.channelId !== id));

      if (activeChannelId === id) {
        setActiveChannelId(remainingChannels[0].id);
      }
      triggerToast(`Removed "${name}" workspace.`);
    }
  };

  // Get current active channel object
  const activeChannel = channels.find(c => c.id === activeChannelId) || channels[0];

  return (
    <div className="min-h-screen bg-[#faf9f6] flex flex-col font-sans selection:bg-indigo-100 antialiased pb-16 text-slate-800">
      
      {/* Toast Notification Banner */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.97 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-5 py-3 rounded-xl shadow-lg border text-sm font-semibold bg-white/95 backdrop-blur-md"
            style={{
              borderColor: toastMessage.type === 'success' ? '#10b981' : toastMessage.type === 'error' ? '#f43f5e' : '#6366f1'
            }}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            ) : toastMessage.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-500" />
            ) : (
              <CalendarIcon className="w-4 h-4 text-indigo-500" />
            )}
            <span>{toastMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- ELITE HEADER WITH "YOUTUBE STRATEGIST" AND CHANNEL MANAGER --- */}
      <header className="bg-white border-b border-slate-150 relative">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          
          {/* Main App Brand Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-600 text-white rounded-xl shadow-md shadow-rose-100 flex items-center justify-center shrink-0">
              <Youtube className="w-5.5 h-5.5" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-900">
                YouTube Strategist
              </h1>
              <p className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400">Content Scheduling Hub</p>
            </div>
          </div>

          {/* Inline Channel Selector and Add Button */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Custom styled select box */}
            <div className="relative">
              <select
                value={activeChannelId}
                onChange={(e) => {
                  setActiveChannelId(e.target.value);
                  triggerToast(`Switched channel to ${channels.find(c => c.id === e.target.value)?.name}`);
                }}
                className="pl-3 pr-8 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 font-bold text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer appearance-none min-w-[160px]"
              >
                {channels.map((chan) => (
                  <option key={chan.id} value={chan.id}>
                    {chan.name} {chan.handle}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-500">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                </svg>
              </div>
            </div>

            {/* Delete current channel button if there is > 1 */}
            {channels.length > 1 && (
              <button
                onClick={() => handleDeleteChannel(activeChannel.id, activeChannel.name)}
                className="p-2.5 text-slate-400 hover:text-rose-600 bg-slate-50 border border-slate-200 rounded-xl hover:bg-rose-50 hover:border-rose-100 transition-all cursor-pointer"
                title="Delete current channel"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            {/* Quick Add Channel Action */}
            <button
              onClick={() => setShowAddChannelModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 rounded-xl shadow-md shadow-indigo-100 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Channel</span>
            </button>

          </div>

        </div>
      </header>

      {/* --- ADD CHANNEL OVERLAY MODAL --- */}
      <AnimatePresence>
        {showAddChannelModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-200 rounded-2xl shadow-xl max-w-md w-full overflow-hidden"
            >
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2.5">
                  <Tv className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-bold text-slate-800 text-sm md:text-base">Register New YouTube Channel</h3>
                </div>
                <button 
                  onClick={() => setShowAddChannelModal(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold text-xs px-2.5 py-1.5 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Close
                </button>
              </div>

              <form onSubmit={handleAddChannel} className="p-6 space-y-5">
                
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Channel Name</label>
                  <input
                    type="text"
                    required
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    placeholder="Ex: Tech Bytes Hindi, Vlogs etc."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-xs font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Handle Username</label>
                  <input
                    type="text"
                    value={newChannelHandle}
                    onChange={(e) => setNewChannelHandle(e.target.value)}
                    placeholder="Ex: @vlogs"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-xs font-semibold"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Color Label</label>
                  <div className="grid grid-cols-7 gap-2">
                    {PRESET_AVATAR_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setSelectedAvatarColor(color)}
                        className={`w-9 h-9 rounded-xl border-2 transition-all cursor-pointer ${
                          selectedAvatarColor === color 
                            ? 'border-slate-800 scale-105 shadow' 
                            : 'border-transparent hover:scale-105'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4 flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowAddChannelModal(false)}
                    className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-md cursor-pointer"
                  >
                    Create Channel
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- MAIN STRATEGY CONTAINER (Daily Plan first, then Calendar, then Scheduler Details) --- */}
      <main className="max-w-7xl w-full mx-auto px-4 md:px-6 mt-6 space-y-6">
        
        {/* DAILY PLAN CHECKLIST SECTION (Sabse Upar) */}
        <section className="space-y-3">
          <DailyPlan
            channelId={activeChannelId}
            selectedDate={selectedDate}
            dailyTasks={dailyTasks}
            onAddTask={handleAddTask}
            onToggleTask={handleToggleTask}
            onDeleteTask={handleDeleteTask}
          />
        </section>

        {/* CALENDAR SECTION (Pura Box Ke Andar) */}
        <section className="space-y-3">
          <ContentCalendar
            channelId={activeChannelId}
            items={contentItems}
            selectedDate={selectedDate}
            dailyTasks={dailyTasks}
            onSelectDate={(date) => {
              setSelectedDate(date);
              // Scroll to details section smoothly
              const el = document.getElementById('scheduler-form-section');
              if (el) {
                el.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            onQuickAddForDate={(date) => {
              setSelectedDate(date);
              const el = document.getElementById('scheduler-form-section');
              if (el) {
                el.scrollIntoView({ behavior: 'smooth' });
              }
            }}
          />
        </section>

        {/* DETAILS SECTION (Dynamic scheduling planner & list for the selected calendar date) */}
        <section>
          <ContentScheduler
            channelId={activeChannelId}
            channelName={activeChannel?.name || 'My Channel'}
            items={contentItems}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onAddItem={(item) => {
              setContentItems([...contentItems, item]);
              triggerToast(`"${item.title}" scheduled successfully!`);
            }}
            onDeleteItem={(id) => {
              const itemToDelete = contentItems.find(item => item.id === id);
              setContentItems(contentItems.filter(item => item.id !== id));
              if (itemToDelete) {
                triggerToast(`Deleted "${itemToDelete.title}" strategy.`, 'info');
              }
            }}
            onUpdateItem={(updatedItem) => {
              setContentItems(contentItems.map(item => item.id === updatedItem.id ? updatedItem : item));
              triggerToast("Video details updated!");
            }}
          />
        </section>

      </main>
    </div>
  );
}
