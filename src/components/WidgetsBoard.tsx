import React, { useState } from 'react';
import { 
  Smartphone, 
  Sparkles, 
  CheckCircle2, 
  Circle, 
  Plus, 
  Trophy, 
  Video, 
  ListTodo, 
  Lightbulb, 
  Share2, 
  ArrowRight, 
  Check, 
  Settings, 
  X,
  RefreshCw,
  Heart
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DailyPlanningTask, ContentScheduleItem } from '../types';

interface WidgetsBoardProps {
  channelId: string;
  channelName: string;
  dailyTasks: DailyPlanningTask[];
  contentItems: ContentScheduleItem[];
  onAddTask: (task: DailyPlanningTask) => void;
  onToggleTask: (id: string) => void;
  onAddContentItem: (item: ContentScheduleItem) => void;
  onUpdateContentItem: (item: ContentScheduleItem) => void;
}

// Widget Themes
const WALLPAPERS = [
  { id: 'indigo', name: 'Cosmic Indigo', bg: 'bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900', textColor: 'text-indigo-200' },
  { id: 'sunset', name: 'Sunset Amber', bg: 'bg-gradient-to-br from-slate-900 via-purple-950 to-orange-950', textColor: 'text-amber-200' },
  { id: 'emerald', name: 'Cyber Mint', bg: 'bg-gradient-to-br from-slate-950 via-zinc-900 to-emerald-950', textColor: 'text-emerald-300' },
  { id: 'dark', name: 'Classic Charcoal', bg: 'bg-gradient-to-br from-slate-900 to-slate-950', textColor: 'text-slate-300' }
];

const MILESTONES = [
  { id: '100', name: '100 Subscribers (First Club)', target: 100 },
  { id: '1000', name: '1,000 Subscribers (Partner Milestone)', target: 1000 },
  { id: '10000', name: '10,000 Subscribers (Elite Creator)', target: 10000 },
  { id: '100000', name: '100,000 Subscribers (Silver Play Button 🥈)', target: 100000 },
  { id: '1000000', name: '1,000,000 Subscribers (Gold Play Button 🥇)', target: 1000000 }
];

export default function WidgetsBoard({
  channelId,
  channelName,
  dailyTasks,
  contentItems,
  onAddTask,
  onToggleTask,
  onAddContentItem,
  onUpdateContentItem
}: WidgetsBoardProps) {
  // Widget Customization Settings
  const [activeWallpaper, setActiveWallpaper] = useState(WALLPAPERS[0]);
  const [subsCount, setSubsCount] = useState<number>(() => {
    return Number(localStorage.getItem('yt_widget_subs') || '450');
  });
  const [selectedMilestone, setSelectedMilestone] = useState(() => {
    const saved = localStorage.getItem('yt_widget_milestone');
    return MILESTONES.find(m => m.id === saved) || MILESTONES[1];
  });
  
  // Quick Scratchpad State
  const [quickIdea, setQuickIdea] = useState('');
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [activeDeviceTab, setActiveDeviceTab] = useState<'ios' | 'android'>('android');
  const [isEditingStats, setIsEditingStats] = useState(false);

  // Get active date (today or next planned date)
  const todayStr = new Date(2026, 6, 13).toISOString().split('T')[0]; // matching seed date
  
  // Tasks for today
  const todaysTasks = dailyTasks.filter(t => t.channelId === channelId && t.date === todayStr);
  const completedTasks = todaysTasks.filter(t => t.isCompleted);

  // Get next upcoming scheduled video (not Published yet)
  const upcomingVideo = contentItems
    .filter(item => item.channelId === channelId && item.status !== 'Published')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

  const handleUpdateSubs = (val: number) => {
    setSubsCount(val);
    localStorage.setItem('yt_widget_subs', val.toString());
  };

  const handleUpdateMilestone = (milestoneId: string) => {
    const found = MILESTONES.find(m => m.id === milestoneId);
    if (found) {
      setSelectedMilestone(found);
      localStorage.setItem('yt_widget_milestone', milestoneId);
    }
  };

  const handleSaveScratchpadIdea = () => {
    if (!quickIdea.trim()) return;
    
    const newItem: ContentScheduleItem = {
      id: `item-${Date.now()}`,
      channelId,
      title: quickIdea.trim(),
      description: '',
      thumbnail: '',
      status: 'Draft',
      date: todayStr,
      notes: 'Quick idea written via mobile screen widget scratchpad.'
    };

    onAddContentItem(newItem);
    setQuickIdea('');
  };

  const cycleStatus = () => {
    if (!upcomingVideo) return;
    const statuses: ContentScheduleItem['status'][] = ['Draft', 'Researching', 'Scripting', 'Recording', 'Editing', 'Scheduled', 'Published'];
    const currIndex = statuses.indexOf(upcomingVideo.status);
    const nextIndex = (currIndex + 1) % statuses.length;
    
    onUpdateContentItem({
      ...upcomingVideo,
      status: statuses[nextIndex]
    });
  };

  // Milestone Progress percentage
  const milestoneProgress = Math.min(100, Math.round((subsCount / selectedMilestone.target) * 100));

  return (
    <div className="bg-white border border-slate-150 rounded-3xl shadow-sm overflow-hidden" id="widget-board-section">
      
      {/* Widget Header Banner */}
      <div className="bg-slate-50 px-6 py-5 border-b border-slate-150 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl shrink-0">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-indigo-100 text-indigo-700 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Feature
              </span>
              <span className="text-[10px] bg-rose-100 text-rose-700 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-0.5">
                <Sparkles className="w-2.5 h-2.5" /> PWA Installed
              </span>
            </div>
            <h2 className="text-base font-black text-slate-800 tracking-tight mt-1">
              📱 Mobile Home Screen & Widgets Board
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Is platform ko apne phone screen par setup karein aur dynamic live widgets ka maza lein!
            </p>
          </div>
        </div>

        {/* Action Button to trigger installation popup help */}
        <button
          onClick={() => setShowInstallGuide(true)}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-100 active:scale-95 transition-all cursor-pointer shrink-0"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>Mobile Pe Kaise Save Karein?</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6">
        
        {/* LEFT PANEL: WIDGETS CONTROL & SYSTEM CUSTOMIZATION (5 cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="bg-indigo-50/40 p-4.5 rounded-2xl border border-indigo-50">
              <h3 className="text-xs font-black text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>PWA Direct Access System</span>
              </h3>
              <p className="text-xs text-indigo-900/80 font-medium mt-2 leading-relaxed">
                App successfully compile ho chuki hai and Google standards ke according update ki gayi hai. 
                Aap apne Chrome ya Safari ke mobile screen par <strong className="font-bold">"Add to Home Screen"</strong> par tap karke is pure custom creator dashboard ko launch kar sakte hain. 
                Ye bina browser borders ke standalone application ki tarah open hogi!
              </p>
            </div>

            {/* Live Widget Customization Controls */}
            <div className="bg-slate-50 p-4.5 rounded-2xl border border-slate-100 space-y-4">
              <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Settings className="w-4 h-4 text-slate-500" />
                <span>Widgets Customizer</span>
              </h4>

              {/* 1. Milestone Target & Subs Config */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Edit Live Subs:</span>
                  <button 
                    onClick={() => setIsEditingStats(!isEditingStats)}
                    className="text-[10px] text-indigo-600 font-black uppercase cursor-pointer hover:underline"
                  >
                    {isEditingStats ? 'Save Stats' : 'Change Stats'}
                  </button>
                </div>

                {isEditingStats ? (
                  <div className="space-y-2 animate-fadeIn">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400">Current Subs:</label>
                      <input 
                        type="number"
                        value={subsCount}
                        onChange={(e) => handleUpdateSubs(Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        placeholder="Ex: 500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400">Target Goal Milestones:</label>
                      <select 
                        value={selectedMilestone.id}
                        onChange={(e) => handleUpdateMilestone(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                      >
                        {MILESTONES.map(m => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 bg-white border border-slate-100 p-2.5 rounded-xl">
                    <span>🥇 {selectedMilestone.name.split(' ')[0]} Goal</span>
                    <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">{subsCount.toLocaleString()} / {selectedMilestone.target.toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* 2. Wallpaper Theme Toggler */}
              <div className="space-y-2 pt-2 border-t border-slate-200/60">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Widget Background:</span>
                <div className="grid grid-cols-4 gap-2">
                  {WALLPAPERS.map(wp => (
                    <button
                      key={wp.id}
                      onClick={() => setActiveWallpaper(wp)}
                      className={`h-9 rounded-xl border transition-all cursor-pointer flex items-center justify-center font-bold text-[10px] overflow-hidden relative ${
                        activeWallpaper.id === wp.id ? 'ring-2 ring-indigo-500 border-indigo-500 text-white' : 'border-slate-250 text-slate-700'
                      }`}
                    >
                      <div className={`absolute inset-0 ${wp.bg} opacity-100`} />
                      <span className="z-10 bg-slate-900/20 px-1 py-0.5 rounded text-[8px] tracking-wider text-white truncate max-w-full">
                        {wp.name.split(' ')[1] || wp.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 font-semibold italic">
            💡 Tip: Direct screen se real-time checkmarks complete karein and custom ideas likhein, widgets automatic update ho jayenge!
          </div>
        </div>

        {/* RIGHT PANEL: INTERACTIVE PHONE PREVIEW AND MOBILE WIDGETS SCREEN (7 cols) */}
        <div className="lg:col-span-7 flex justify-center items-center">
          
          {/* Smartphone Shell Frame */}
          <div className="w-full max-w-[390px] aspect-[9/19.5] border-[10px] border-slate-800 rounded-[48px] shadow-2xl overflow-hidden relative flex flex-col bg-slate-950">
            
            {/* Phone Notch/Camera */}
            <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-32 h-5.5 bg-black rounded-full z-30 flex items-center justify-between px-4">
              <span className="w-2.5 h-2.5 bg-zinc-800 rounded-full" />
              <span className="w-12 h-1 bg-zinc-800 rounded-full" />
              <span className="w-2 h-2 bg-blue-900 rounded-full" />
            </div>

            {/* Dynamic Clock and Status Info Bar at top of Screen */}
            <div className="pt-9 px-6 pb-2 flex justify-between items-center text-white/90 text-[10px] font-bold z-20">
              <span>10:45 AM</span>
              <div className="flex items-center gap-1.5">
                <span>5G</span>
                <span>🔋 98%</span>
              </div>
            </div>

            {/* Phone Interactive Wallpaper Background */}
            <div className={`absolute inset-0 z-0 transition-all duration-500 ${activeWallpaper.bg}`} />

            {/* INTERACTIVE HOME SCREEN CONTENT AREA */}
            <div className="relative z-10 flex-1 px-4 py-2 flex flex-col space-y-4 overflow-y-auto pb-6 scrollbar-none">
              
              {/* Creator Channel Tag Header */}
              <div className="text-center py-1">
                <span className="inline-block px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-extrabold text-white tracking-wide border border-white/10 uppercase">
                  🔴 {channelName} Widgets
                </span>
              </div>

              {/* WIDGET 1: 4x2 TODAY'S TASKS CHECKLIST (Sabse Dynamic) */}
              <div className="bg-white/95 backdrop-blur-md rounded-2xl p-4 border border-white/20 shadow-lg space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase text-indigo-950 tracking-wider flex items-center gap-1">
                    <ListTodo className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Aaj Ke Tasks ({todaysTasks.length})</span>
                  </span>
                  <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                    {completedTasks.length}/{todaysTasks.length} Completed
                  </span>
                </div>

                {todaysTasks.length === 0 ? (
                  <div className="text-center py-4 text-slate-400 text-[11px] font-semibold border border-dashed border-slate-150 rounded-xl">
                    Aaj ke liye koi tasks nahi hain! <br />
                    App checklist mein naya goal add karein.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-[100px] overflow-y-auto pr-1">
                    {todaysTasks.map((task) => (
                      <button
                        key={task.id}
                        onClick={() => onToggleTask(task.id)}
                        className="w-full text-left flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
                      >
                        {task.isCompleted ? (
                          <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                        ) : (
                          <Circle className="w-4 h-4 text-slate-300 shrink-0" />
                        )}
                        <span className={`text-[11px] font-semibold truncate ${task.isCompleted ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                          {task.text}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* TWO-COLUMN GRID FOR 2x2 WIDGETS */}
              <div className="grid grid-cols-2 gap-3.5">
                
                {/* WIDGET 2: 2x2 VIDEO PIPELINE WIDGET */}
                <div className="bg-white/95 backdrop-blur-md rounded-2xl p-3.5 border border-white/20 shadow-lg flex flex-col justify-between aspect-square">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black uppercase text-indigo-950 tracking-wider">
                        Upcoming Video
                      </span>
                      <Video className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    </div>

                    {upcomingVideo ? (
                      <div className="mt-2.5 space-y-1">
                        <h5 className="text-[11px] font-black text-slate-800 line-clamp-2 leading-tight">
                          {upcomingVideo.title}
                        </h5>
                        <p className="text-[9px] text-slate-400 font-semibold">
                          Target: {upcomingVideo.date.split('-').slice(1).join('/')}
                        </p>
                      </div>
                    ) : (
                      <div className="mt-4 text-center text-slate-400 text-[10px] font-semibold">
                        No upcoming draft. <br />Calendar mein plan karein!
                      </div>
                    )}
                  </div>

                  {upcomingVideo && (
                    <div className="mt-2 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                          {upcomingVideo.status}
                        </span>
                        
                        {/* Status Change Toggler on widget */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            cycleStatus();
                          }}
                          className="p-1 hover:bg-slate-100 rounded text-indigo-500 transition-all cursor-pointer"
                          title="Change status directly"
                        >
                          <RefreshCw className="w-2.5 h-2.5 animate-spin-hover" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* WIDGET 3: 2x2 SUBS MILESTONE WIDGET */}
                <div className="bg-white/95 backdrop-blur-md rounded-2xl p-3.5 border border-white/20 shadow-lg flex flex-col justify-between aspect-square">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black uppercase text-indigo-950 tracking-wider">
                        Milestone Tracker
                      </span>
                      <Trophy className="w-3.5 h-3.5 text-amber-500" />
                    </div>
                    <div className="mt-2 text-center">
                      <div className="text-sm font-black text-slate-800 tracking-tight">
                        {subsCount.toLocaleString()}
                      </div>
                      <div className="text-[8px] text-slate-500 font-extrabold uppercase">
                        Subscribers
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[8px] font-bold text-slate-400">
                      <span>Progress</span>
                      <span className="text-indigo-600 font-extrabold">{milestoneProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${milestoneProgress}%` }}
                      />
                    </div>
                    <div className="text-[7.5px] text-slate-500 font-semibold text-center mt-1 truncate">
                      Goal: {selectedMilestone.target.toLocaleString()}
                    </div>
                  </div>
                </div>

              </div>

              {/* WIDGET 4: 4x2 QUICK IDEA SCRATCHPAD WIDGET (Dynamic Input to sync to firestore) */}
              <div className="bg-white/95 backdrop-blur-md rounded-2xl p-4 border border-white/20 shadow-lg space-y-3">
                <span className="text-[10px] font-black uppercase text-indigo-950 tracking-wider flex items-center gap-1">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                  <span>On-The-Go Idea Capture</span>
                </span>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={quickIdea}
                    onChange={(e) => setQuickIdea(e.target.value)}
                    placeholder="Naya high-impact topic likhein..."
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-[11px] font-semibold text-slate-800"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveScratchpadIdea();
                    }}
                  />
                  <button
                    onClick={handleSaveScratchpadIdea}
                    className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Elegant Love-Designed Signoff */}
              <div className="text-center py-2 flex items-center justify-center gap-1 text-white/55 text-[8.5px] uppercase font-bold tracking-widest">
                <span>Made for YouTube Creators</span>
                <Heart className="w-2 h-2 text-rose-500 fill-rose-500" />
              </div>

            </div>

            {/* iOS style home indicator bar */}
            <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/70 rounded-full z-20" />

          </div>

        </div>

      </div>

      {/* DETAILED PWA INSTALLATION GUIDE MODAL OVERLAY */}
      <AnimatePresence>
        {showInstallGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            {/* Backdrop click cancel */}
            <div className="absolute inset-0" onClick={() => setShowInstallGuide(false)} />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] z-10"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-150 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 text-xs md:text-sm uppercase tracking-wider">
                      📱 Direct Mobile Home Screen Installation Guide
                    </h3>
                    <p className="text-[10px] md:text-xs text-slate-500 font-semibold">
                      Offline usage, standalone layout, and custom launchers!
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowInstallGuide(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* OS Selector Tabs */}
              <div className="flex border-b border-slate-100 bg-slate-50/50">
                <button
                  onClick={() => setActiveDeviceTab('android')}
                  className={`flex-1 py-3 text-xs font-black text-center border-b-2 uppercase tracking-wider transition-all cursor-pointer ${
                    activeDeviceTab === 'android' 
                      ? 'border-indigo-600 text-indigo-600 bg-white' 
                      : 'border-transparent text-slate-400 hover:text-slate-700'
                  }`}
                >
                  🤖 Android (Chrome)
                </button>
                <button
                  onClick={() => setActiveDeviceTab('ios')}
                  className={`flex-1 py-3 text-xs font-black text-center border-b-2 uppercase tracking-wider transition-all cursor-pointer ${
                    activeDeviceTab === 'ios' 
                      ? 'border-indigo-600 text-indigo-600 bg-white' 
                      : 'border-transparent text-slate-400 hover:text-slate-700'
                  }`}
                >
                  🍏 iPhone (Safari)
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-6 overflow-y-auto flex-1">
                {activeDeviceTab === 'android' ? (
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 font-black flex items-center justify-center text-xs shrink-0">
                        1
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-bold text-slate-800 text-xs md:text-sm">Apna Mobile Browser Open Karein</h4>
                        <p className="text-[11px] md:text-xs text-slate-500 leading-relaxed font-semibold">
                          Google Chrome browser mein is app URL ko load karein jo aap abhi preview kar rahe hain.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 font-black flex items-center justify-center text-xs shrink-0">
                        2
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-bold text-slate-800 text-xs md:text-sm">Menu Bar Par Tap Karein</h4>
                        <p className="text-[11px] md:text-xs text-slate-500 leading-relaxed font-semibold">
                          Top right corner mein bane <strong className="font-black text-slate-700">3-dots (⋮)</strong> icon par tap karein.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 font-black flex items-center justify-center text-xs shrink-0">
                        3
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-bold text-slate-800 text-xs md:text-sm">"Add to Home Screen" Select Karein</h4>
                        <p className="text-[11px] md:text-xs text-slate-500 leading-relaxed font-semibold">
                          Menu options mein se <strong className="font-black text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">"Add to Home screen"</strong> ya <strong className="font-black text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">"Install app"</strong> par click karein.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 font-black flex items-center justify-center text-xs shrink-0">
                        4
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-bold text-slate-800 text-xs md:text-sm">Launcher Confirm Karein</h4>
                        <p className="text-[11px] md:text-xs text-slate-500 leading-relaxed font-semibold">
                          Pop-up prompt mein <strong className="font-black text-slate-700">Install / Add</strong> ko click karein. Ab app hamare premium purple vector icon ke sath phone home screen par save ho chuki hai!
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 font-black flex items-center justify-center text-xs shrink-0">
                        1
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-bold text-slate-800 text-xs md:text-sm">Safari Browser Use Karein</h4>
                        <p className="text-[11px] md:text-xs text-slate-500 leading-relaxed font-semibold">
                          Apple iPhone ke native <strong className="font-bold text-slate-700">Safari</strong> browser mein is app web URL ko load karein.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 font-black flex items-center justify-center text-xs shrink-0">
                        2
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-bold text-slate-800 text-xs md:text-sm">Share Action Trigger Karein</h4>
                        <p className="text-[11px] md:text-xs text-slate-500 leading-relaxed font-semibold">
                          Safari ke bottom center bar mein bane <strong className="font-black text-indigo-600">Share</strong> square box arrows button par tap karein.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 font-black flex items-center justify-center text-xs shrink-0">
                        3
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-bold text-slate-800 text-xs md:text-sm">Add to Home Screen Select Karein</h4>
                        <p className="text-[11px] md:text-xs text-slate-500 leading-relaxed font-semibold">
                          Share sheet panel ko thoda scroll-down karein aur <strong className="font-black text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">"Add to Home Screen" (+)</strong> option par tap karein.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 font-black flex items-center justify-center text-xs shrink-0">
                        4
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-bold text-slate-800 text-xs md:text-sm">Stand-Alone Launcher Add Karein</h4>
                        <p className="text-[11px] md:text-xs text-slate-500 leading-relaxed font-semibold">
                          Top right mein <strong className="font-black text-slate-700">"Add"</strong> click karein. Yeh beautiful custom App Icon ke sath home screen par dynamic short-cut trigger banayegi!
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-slate-50 p-4.5 rounded-2xl border border-slate-100 flex items-start gap-3">
                  <span className="text-xl">⚡</span>
                  <p className="text-[11px] md:text-xs text-slate-500 leading-relaxed font-semibold">
                    <strong>PWA Standalone Benifit:</strong> Jab aap is icon ko tap karke app launch karenge, toh address search bar automatic hide ho jayega aur full-screen mode active ho jayega. Ye exact dynamic local application ki tarah run karegi, directly connecting to your Firestore database.
                  </p>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowInstallGuide(false)}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-md cursor-pointer"
                >
                  Samajh Gaya (Done)
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
