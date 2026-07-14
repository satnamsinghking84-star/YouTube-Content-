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
  Edit3,
  ChevronDown,
  ChevronUp,
  Edit2,
  Lightbulb
} from 'lucide-react';
import { YouTubeChannel, ContentScheduleItem, DailyPlanningTask } from './types';
import ContentCalendar from './components/ContentCalendar';
import ContentScheduler from './components/ContentScheduler';
import DailyPlan from './components/DailyPlan';
import DateRangeContentList from './components/DateRangeContentList';
import ChannelIdeasWorkspace from './components/ChannelIdeasWorkspace';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  writeBatch, 
  getDocs, 
  query 
} from 'firebase/firestore';
import { db } from './firebase';

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
  // --- Persistent States from Local Storage / Firebase ---
  const [channels, setChannels] = useState<YouTubeChannel[]>(() => {
    try {
      const cached = localStorage.getItem('cache_channels');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [activeChannelId, setActiveChannelId] = useState<string>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlChanId = urlParams.get('channelId');
    if (urlChanId) return urlChanId;
    return localStorage.getItem('yt_active_channel_id') || '';
  });
  const [contentItems, setContentItems] = useState<ContentScheduleItem[]>(() => {
    try {
      const cached = localStorage.getItem('cache_content_items');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [dailyTasks, setDailyTasks] = useState<DailyPlanningTask[]>(() => {
    try {
      const cached = localStorage.getItem('cache_daily_tasks');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date(2026, 6, 13).toISOString().split('T')[0];
  });
  const [loading, setLoading] = useState(() => {
    // If we have cached channels, we don't need a blocking loading screen!
    try {
      const cached = localStorage.getItem('cache_channels');
      return !cached;
    } catch {
      return true;
    }
  });

  // --- UI Interactive States ---
  const [showAddChannelModal, setShowAddChannelModal] = useState(false);
  const [isChannelDropdownOpen, setIsChannelDropdownOpen] = useState(false);
  
  // Check if we are inside the Ideas Workspace view from the URL parameter or state
  const [viewMode, setViewMode] = useState<'dashboard' | 'ideas'>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return (urlParams.get('view') === 'ideas') ? 'ideas' : 'dashboard';
  });

  const handleToggleView = (mode: 'dashboard' | 'ideas') => {
    setViewMode(mode);
    const url = new URL(window.location.href);
    if (mode === 'ideas') {
      url.searchParams.set('view', 'ideas');
      if (activeChannelId) {
        url.searchParams.set('channelId', activeChannelId);
      }
    } else {
      url.searchParams.delete('view');
    }
    window.history.pushState({}, '', url.toString());
  };

  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelHandle, setNewChannelHandle] = useState('');
  const [selectedAvatarColor, setSelectedAvatarColor] = useState(PRESET_AVATAR_COLORS[0]);

  // --- Channel Edit States ---
  const [showEditChannelModal, setShowEditChannelModal] = useState(false);
  const [editingChannelId, setEditingChannelId] = useState<string | null>(null);
  const [editChannelName, setEditChannelName] = useState('');
  const [editChannelHandle, setEditChannelHandle] = useState('');
  const [editSelectedAvatarColor, setEditSelectedAvatarColor] = useState(PRESET_AVATAR_COLORS[0]);
  const [channelToDelete, setChannelToDelete] = useState<{ id: string; name: string } | null>(null);

  const openEditChannelModal = (chan: YouTubeChannel) => {
    setEditingChannelId(chan.id);
    setEditChannelName(chan.name);
    setEditChannelHandle(chan.handle);
    setEditSelectedAvatarColor(chan.avatarColor);
    setShowEditChannelModal(true);
  };

  // Alert & Notification toast states
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // --- Initialize Firebase & Setup listeners ---
  useEffect(() => {
    let unsubscribeChannels: () => void;
    let unsubscribeContent: () => void;
    let unsubscribeTasks: () => void;

    let channelsDone = false;
    let contentDone = false;
    let tasksDone = false;

    const checkAllLoaded = () => {
      if (channelsDone && contentDone && tasksDone) {
        setLoading(false);
      }
    };

    // Setup realtime snapshots synchronously right away for ultra-fast loading
    unsubscribeChannels = onSnapshot(collection(db, 'channels'), (snapshot) => {
      const loadedChannels: YouTubeChannel[] = [];
      snapshot.forEach((doc) => {
        loadedChannels.push(doc.data() as YouTubeChannel);
      });
      if (loadedChannels.length > 0) {
        setChannels(loadedChannels);
        try {
          localStorage.setItem('cache_channels', JSON.stringify(loadedChannels));
        } catch (e) {
          console.error(e);
        }
        // If no active channel is selected yet, choose the first one
        setActiveChannelId(prev => {
          if (prev && loadedChannels.some(c => c.id === prev)) return prev;
          const fallbackId = loadedChannels[0]?.id || '';
          localStorage.setItem('yt_active_channel_id', fallbackId);
          return fallbackId;
        });
      }
      channelsDone = true;
      checkAllLoaded();
    }, (error) => {
      console.error("Channels snapshot error: ", error);
      channelsDone = true;
      checkAllLoaded();
    });

    unsubscribeContent = onSnapshot(collection(db, 'content_items'), (snapshot) => {
      const loadedContent: ContentScheduleItem[] = [];
      snapshot.forEach((doc) => {
        loadedContent.push(doc.data() as ContentScheduleItem);
      });
      setContentItems(loadedContent);
      try {
        localStorage.setItem('cache_content_items', JSON.stringify(loadedContent));
      } catch (e) {
        console.error(e);
      }
      contentDone = true;
      checkAllLoaded();
    }, (error) => {
      console.error("Content items snapshot error: ", error);
      contentDone = true;
      checkAllLoaded();
    });

    unsubscribeTasks = onSnapshot(collection(db, 'daily_tasks'), (snapshot) => {
      const loadedTasks: DailyPlanningTask[] = [];
      snapshot.forEach((doc) => {
        loadedTasks.push(doc.data() as DailyPlanningTask);
      });
      setDailyTasks(loadedTasks);
      try {
        localStorage.setItem('cache_daily_tasks', JSON.stringify(loadedTasks));
      } catch (e) {
        console.error(e);
      }
      tasksDone = true;
      checkAllLoaded();
    }, (error) => {
      console.error("Tasks snapshot error: ", error);
      tasksDone = true;
      checkAllLoaded();
    });

    // Run background seeding check asynchronously so it doesn't block UI load
    const checkAndSeed = async () => {
      try {
        const channelsRef = collection(db, 'channels');
        const querySnapshot = await getDocs(query(channelsRef));
        
        if (querySnapshot.empty) {
          console.log('Seeding initial data into Firestore in the background...');
          const batch = writeBatch(db);
          
          INITIAL_CHANNELS.forEach(chan => {
            batch.set(doc(db, 'channels', chan.id), chan);
          });
          
          INITIAL_CONTENT.forEach(item => {
            batch.set(doc(db, 'content_items', item.id), item);
          });
          
          INITIAL_DAILY_TASKS.forEach(task => {
            batch.set(doc(db, 'daily_tasks', task.id), task);
          });
          
          await batch.commit();
        }
      } catch (err) {
        console.error("Error seeding initial data: ", err);
      }
    };

    checkAndSeed();

    return () => {
      if (unsubscribeChannels) unsubscribeChannels();
      if (unsubscribeContent) unsubscribeContent();
      if (unsubscribeTasks) unsubscribeTasks();
    };
  }, []);

  // Save activeChannelId preference to local storage
  useEffect(() => {
    if (activeChannelId) {
      localStorage.setItem('yt_active_channel_id', activeChannelId);
    }
  }, [activeChannelId]);

  // Custom Toast helper
  const triggerToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // --- Daily Planning Task Handlers ---
  const handleAddTask = async (task: DailyPlanningTask) => {
    try {
      await setDoc(doc(db, 'daily_tasks', task.id), task);
      triggerToast("Task added successfully!");
    } catch (err) {
      console.error(err);
      triggerToast("Failed to add task", "error");
    }
  };

  const handleToggleTask = async (id: string) => {
    try {
      const task = dailyTasks.find(t => t.id === id);
      if (task) {
        await setDoc(doc(db, 'daily_tasks', id), { ...task, isCompleted: !task.isCompleted });
      }
    } catch (err) {
      console.error(err);
      triggerToast("Failed to update task", "error");
    }
  };

  const handleDeleteTask = async (idOrIds: string | string[]) => {
    try {
      if (Array.isArray(idOrIds)) {
        if (idOrIds.length === 0) return;
        const batch = writeBatch(db);
        idOrIds.forEach(id => {
          batch.delete(doc(db, 'daily_tasks', id));
        });
        await batch.commit();
        triggerToast(`${idOrIds.length} tasks deleted.`, "info");
      } else {
        await deleteDoc(doc(db, 'daily_tasks', idOrIds));
        triggerToast("Task deleted.", "info");
      }
    } catch (err) {
      console.error(err);
      triggerToast("Failed to delete task(s)", "error");
    }
  };

  // --- Multi Channel Handlers ---
  const handleAddChannel = async (e: React.FormEvent) => {
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

    try {
      await setDoc(doc(db, 'channels', newChannelId), newChan);
      setActiveChannelId(newChannelId);
      
      // Reset Form & Close
      setNewChannelName('');
      setNewChannelHandle('');
      setSelectedAvatarColor(PRESET_AVATAR_COLORS[Math.floor(Math.random() * PRESET_AVATAR_COLORS.length)]);
      setShowAddChannelModal(false);
      triggerToast(`"${newChan.name}" created successfully!`);
    } catch (err) {
      console.error(err);
      triggerToast("Failed to create channel", "error");
    }
  };

  const handleDeleteChannel = (id: string, name: string) => {
    if (channels.length <= 1) {
      triggerToast("Workspace ke liye kam se kam 1 channel hona zaroori hai! (At least one channel is required)", 'error');
      return;
    }
    setChannelToDelete({ id, name });
  };

  const confirmDeleteChannel = async () => {
    if (!channelToDelete) return;
    const { id, name } = channelToDelete;

    if (channels.length <= 1) {
      triggerToast("At least one active channel is required!", 'error');
      setChannelToDelete(null);
      return;
    }

    try {
      await deleteDoc(doc(db, 'channels', id));
      
      // Batch delete content items and daily tasks belonging to this channel
      const batch = writeBatch(db);
      contentItems.filter(item => item.channelId === id).forEach(item => {
        batch.delete(doc(db, 'content_items', item.id));
      });
      dailyTasks.filter(task => task.channelId === id).forEach(task => {
        batch.delete(doc(db, 'daily_tasks', task.id));
      });
      await batch.commit();

      if (activeChannelId === id) {
        const remaining = channels.filter(c => c.id !== id);
        if (remaining.length > 0) {
          setActiveChannelId(remaining[0].id);
        }
      }
      triggerToast(`Removed "${name}" workspace.`);
      setChannelToDelete(null);
    } catch (err) {
      console.error(err);
      triggerToast("Failed to delete channel", "error");
      setChannelToDelete(null);
    }
  };

  const handleUpdateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetId = editingChannelId || activeChannelId;
    if (!editChannelName.trim() || !targetId) return;

    const handle = editChannelHandle.trim() 
      ? (editChannelHandle.startsWith('@') ? editChannelHandle : `@${editChannelHandle}`)
      : `@${editChannelName.toLowerCase().replace(/\s+/g, '')}`;

    const updatedChan: YouTubeChannel = {
      id: targetId,
      name: editChannelName.trim(),
      handle,
      avatarColor: editSelectedAvatarColor
    };

    try {
      await setDoc(doc(db, 'channels', targetId), updatedChan);
      setShowEditChannelModal(false);
      setEditingChannelId(null);
      triggerToast(`"${updatedChan.name}" updated successfully!`);
    } catch (err) {
      console.error(err);
      triggerToast("Failed to update channel", "error");
    }
  };

  // Get current active channel object
  const activeChannel = channels.find(c => c.id === activeChannelId) || channels[0];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf9f6] flex flex-col items-center justify-center font-sans antialiased">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <div className="text-center">
            <h2 className="text-lg font-black text-slate-800">Saving & Loading Online...</h2>
            <p className="text-xs text-slate-500 font-semibold mt-1">Connecting to Google Cloud Firestore</p>
          </div>
        </div>
      </div>
    );
  }

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

          {/* Custom Channel Selector Container */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            {/* Inline Custom Channel Selector Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsChannelDropdownOpen(!isChannelDropdownOpen)}
                className="flex items-center gap-2.5 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border-2 border-slate-950 rounded-xl transition-all cursor-pointer select-none active:scale-95"
              >
                <div 
                  className="w-3.5 h-3.5 rounded-full shrink-0 border border-slate-950" 
                  style={{ backgroundColor: activeChannel?.avatarColor || '#6366f1' }}
                />
                <div className="flex flex-col text-left min-w-0">
                  <span className="text-xs font-black text-slate-950 truncate max-w-[120px] sm:max-w-[180px]">
                    {activeChannel?.name || 'Loading...'}
                  </span>
                  <span className="text-[10px] text-slate-500 font-bold tracking-tight truncate max-w-[120px]">
                    {activeChannel?.handle || ''}
                  </span>
                </div>
                {isChannelDropdownOpen ? (
                  <ChevronUp className="w-4 h-4 text-slate-950 shrink-0 ml-1" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-950 shrink-0 ml-1" />
                )}
              </button>

              {/* Dropdown Menu Popup */}
              <AnimatePresence>
                {isChannelDropdownOpen && (
                  <>
                    {/* Backdrop overlay to close when clicking outside */}
                    <div 
                      className="fixed inset-0 z-40 bg-transparent" 
                      onClick={() => setIsChannelDropdownOpen(false)} 
                    />
                    
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 5, scale: 0.95 }}
                      transition={{ duration: 0.12 }}
                      className="absolute right-0 mt-2 w-72 sm:w-80 bg-white border-2 border-slate-950 rounded-2xl shadow-xl z-50 overflow-hidden"
                    >
                      {/* Header */}
                      <div className="px-4 py-3 bg-slate-50 border-b-2 border-slate-950">
                        <span className="text-[10px] uppercase font-black tracking-wider text-slate-500">
                          Choose Channel Workspace
                        </span>
                      </div>

                      {/* Channel List */}
                      <div className="p-2 space-y-1 max-h-[240px] overflow-y-auto">
                        {channels.map((chan) => {
                          const isActive = chan.id === activeChannelId;
                          return (
                            <div
                              key={chan.id}
                              className={`group flex items-center justify-between p-2 rounded-xl transition-all border border-transparent ${
                                isActive 
                                  ? 'bg-indigo-50 border-indigo-200' 
                                  : 'hover:bg-slate-50'
                              }`}
                            >
                              {/* Clickable Area to Switch Channel */}
                              <div
                                onClick={() => {
                                  setActiveChannelId(chan.id);
                                  setIsChannelDropdownOpen(false);
                                  triggerToast(`Switched channel to ${chan.name}`);
                                }}
                                className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer text-left"
                              >
                                <div 
                                  className="w-4 h-4 rounded-full shrink-0 border border-slate-950 shadow-sm"
                                  style={{ backgroundColor: chan.avatarColor }}
                               />
                                <div className="min-w-0 flex-1">
                                  <p className={`text-xs truncate font-black ${isActive ? 'text-indigo-900' : 'text-slate-900'}`}>
                                    {chan.name}
                                  </p>
                                  <p className="text-[10px] text-slate-500 font-bold truncate">
                                    {chan.handle}
                                  </p>
                                </div>
                              </div>

                              {/* Row Action Buttons (Edit / Delete) */}
                              <div className="flex items-center gap-1 shrink-0 ml-2">
                                {/* Edit Button */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEditChannelModal(chan);
                                    setIsChannelDropdownOpen(false);
                                  }}
                                  className="p-1.5 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 text-slate-500 hover:text-indigo-600 transition-all cursor-pointer"
                                  title={`Edit ${chan.name}`}
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>

                                {/* Delete Button */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteChannel(chan.id, chan.name);
                                    setIsChannelDropdownOpen(false);
                                  }}
                                  className="p-1.5 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-100 text-slate-400 hover:text-rose-600 transition-all cursor-pointer"
                                  title={`Delete ${chan.name}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Footer - Add Channel Action */}
                      <div className="p-2 bg-slate-50 border-t-2 border-slate-950">
                        <button
                          onClick={() => {
                            setShowAddChannelModal(true);
                            setIsChannelDropdownOpen(false);
                          }}
                          className="w-full flex items-center justify-center gap-1.5 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-black text-xs rounded-xl shadow transition-all cursor-pointer border border-indigo-700"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Add New Channel</span>
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Idea Shortcut Button */}
            <button
              onClick={() => handleToggleView(viewMode === 'ideas' ? 'dashboard' : 'ideas')}
              className={`flex items-center gap-1.5 px-4 py-2.5 border-2 border-slate-950 text-slate-950 rounded-xl font-black text-xs transition-all cursor-pointer active:scale-95 select-none shrink-0 shadow-sm ${
                viewMode === 'ideas' ? 'bg-yellow-300 hover:bg-yellow-400 animate-none' : 'bg-yellow-50 hover:bg-yellow-100'
              }`}
              title="Channel brainstorming ideas grid"
            >
              <Lightbulb className={`w-4 h-4 text-yellow-600 shrink-0 ${viewMode === 'ideas' ? 'animate-bounce' : 'animate-pulse'}`} />
              <span>Idea</span>
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

      {/* --- EDIT CHANNEL OVERLAY MODAL --- */}
      <AnimatePresence>
        {showEditChannelModal && (
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
                  <h3 className="font-bold text-slate-800 text-sm md:text-base">Edit Channel Settings</h3>
                </div>
                <button 
                  onClick={() => setShowEditChannelModal(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold text-xs px-2.5 py-1.5 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Close
                </button>
              </div>

              <form onSubmit={handleUpdateChannel} className="p-6 space-y-5">
                
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Channel Name</label>
                  <input
                    type="text"
                    required
                    value={editChannelName}
                    onChange={(e) => setEditChannelName(e.target.value)}
                    placeholder="Ex: Tech Bytes Hindi, Vlogs etc."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-xs font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Handle Username</label>
                  <input
                    type="text"
                    value={editChannelHandle}
                    onChange={(e) => setEditChannelHandle(e.target.value)}
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
                        onClick={() => setEditSelectedAvatarColor(color)}
                        className={`w-9 h-9 rounded-xl border-2 transition-all cursor-pointer ${
                          editSelectedAvatarColor === color 
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
                    onClick={() => setShowEditChannelModal(false)}
                    className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-md cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- CONFIRM DELETE CHANNEL OVERLAY MODAL --- */}
      <AnimatePresence>
        {channelToDelete && (
          <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border-2 border-slate-950 rounded-2xl shadow-xl max-w-md w-full overflow-hidden"
            >
              <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-2.5 bg-rose-50 text-rose-950">
                <AlertCircle className="w-5 h-5 text-rose-650 animate-pulse" />
                <h3 className="font-black text-sm md:text-base text-rose-900">Channel Delete Karein?</h3>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-xs font-bold text-slate-600 leading-relaxed">
                  Kya aap sach mein <span className="text-slate-900 font-extrabold">"{channelToDelete.name}"</span> channel ko delete karna chahte hain?
                </p>
                <div className="p-3.5 bg-rose-50/50 rounded-xl border border-rose-100 text-rose-950 font-semibold text-[11px] leading-relaxed">
                  ⚠️ <span className="font-black text-rose-900">Warning:</span> Is channel ko delete karne par isse related sabhi <span className="font-black text-rose-900">video schedules</span> aur <span className="font-black text-rose-900">daily checklist tasks</span> permanently delete ho jayenge! Is action ko wapas nahi kiya ja sakta.
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setChannelToDelete(null)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded-xl transition-all cursor-pointer hover:bg-slate-100"
                >
                  Nahi, Cancel Karein
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteChannel}
                  className="px-5 py-2.5 text-xs font-black text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-all shadow-md cursor-pointer border border-rose-700"
                >
                  Haan, Sab Delete Karein
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- CONTENT WORKSPACE OR MAIN DASHBOARD CONTENT --- */}
      {viewMode === 'ideas' ? (
        <ChannelIdeasWorkspace
          activeChannel={activeChannel}
          onBack={() => handleToggleView('dashboard')}
          triggerToast={triggerToast}
        />
      ) : (
        <main className="max-w-7xl w-full mx-auto px-4 md:px-6 mt-6 space-y-6">
          
          {/* DAILY PLAN CHECKLIST SECTION (Sabse Upar) */}
          <section className="space-y-3" id="daily-plan-section">
            <DailyPlan
              channels={channels}
              channelId={activeChannelId}
              selectedDate={selectedDate}
              dailyTasks={dailyTasks}
              items={contentItems}
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
                // Scroll to today's plan checklist smoothly
                const el = document.getElementById('daily-plan-section');
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

          {/* DATE RANGE CONTENT LIST SECTION (Calender ke niche horizontal rows board) */}
          <section className="space-y-3">
            <DateRangeContentList
              channels={channels}
              items={contentItems}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              dailyTasks={dailyTasks}
              onUpdateItem={async (updatedItem) => {
                try {
                  await setDoc(doc(db, 'content_items', updatedItem.id), updatedItem);
                  triggerToast("Video details updated!");
                } catch (err) {
                  console.error(err);
                  triggerToast("Failed to update details", "error");
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
              onAddItem={async (item) => {
                try {
                  await setDoc(doc(db, 'content_items', item.id), item);
                  triggerToast(`"${item.title}" scheduled successfully!`);
                } catch (err) {
                  console.error(err);
                  triggerToast("Failed to save content item", "error");
                }
              }}
              onDeleteItem={async (id) => {
                const itemToDelete = contentItems.find(item => item.id === id);
                try {
                  await deleteDoc(doc(db, 'content_items', id));
                  if (itemToDelete) {
                    triggerToast(`Deleted "${itemToDelete.title}" strategy.`, 'info');
                  }
                } catch (err) {
                  console.error(err);
                  triggerToast("Failed to delete content item", "error");
                }
              }}
              onUpdateItem={async (updatedItem) => {
                try {
                  await setDoc(doc(db, 'content_items', updatedItem.id), updatedItem);
                  triggerToast("Video details updated!");
                } catch (err) {
                  console.error(err);
                  triggerToast("Failed to update details", "error");
                }
              }}
            />
          </section>

        </main>
      )}
    </div>
  );
}
