import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CalendarDays, 
  Play, 
  Image as ImageIcon, 
  SlidersHorizontal, 
  ChevronRight, 
  Video, 
  X,
  Pencil,
  Save,
  FileSpreadsheet,
  Download,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  UploadCloud
} from 'lucide-react';
import { ContentScheduleItem, YouTubeChannel, DailyPlanningTask } from '../types';

interface DateRangeContentListProps {
  channels: YouTubeChannel[];
  items: ContentScheduleItem[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onUpdateItem?: (item: ContentScheduleItem) => void;
  dailyTasks?: DailyPlanningTask[];
}

type RangeOption = 'selected' | 'week' | 'month' | 'all';

export default function DateRangeContentList({
  channels,
  items,
  selectedDate,
  onSelectDate,
  onUpdateItem,
  dailyTasks = [],
}: DateRangeContentListProps) {
  const [rangeMode, setRangeMode] = useState<RangeOption>('week');
  const [selectedItemForPreview, setSelectedItemForPreview] = useState<ContentScheduleItem | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Local states for editing inside the modal
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStatus, setEditStatus] = useState<ContentScheduleItem['status']>('Draft');
  const [editChannelId, setEditChannelId] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editThumbnail, setEditThumbnail] = useState('');
  const [editDate, setEditDate] = useState('');

  // Drag and drop states for thumbnail upload in edit modal
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Downscale image helper for Edit Modal Thumbnail
  const processImageFile = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxW = 480;
        const maxH = 270;
        let width = img.width;
        let height = img.height;

        if (width > maxW) {
          height = Math.round((height * maxW) / width);
          width = maxW;
        }
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85);
          setEditThumbnail(compressedBase64);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processImageFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processImageFile(e.dataTransfer.files[0]);
    }
  };

  // Helper to parse dates securely
  const parseDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  // Check if a date falls within the range
  const isItemInRange = (itemDateStr: string) => {
    if (!itemDateStr) return false;
    
    const itemDate = parseDate(itemDateStr);
    const selDate = parseDate(selectedDate);

    if (rangeMode === 'selected') {
      return itemDateStr === selectedDate;
    }

    if (rangeMode === 'week') {
      // Show next 7 days starting from selected date (or 3 days before and 4 days after for context)
      const diffTime = itemDate.getTime() - selDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= -3 && diffDays <= 7;
    }

    if (rangeMode === 'month') {
      // Show same month and year
      return (
        itemDate.getMonth() === selDate.getMonth() &&
        itemDate.getFullYear() === selDate.getFullYear()
      );
    }

    return true; // 'all'
  };

  // Filter items that are in range, sorted chronologically
  const filteredItems = items
    .filter((item) => isItemInRange(item.date))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Get channel name and color
  const getChannelDetails = (channelId: string) => {
    const channel = channels.find((c) => c.id === channelId);
    return {
      name: channel ? channel.name : 'Unknown Channel',
      color: channel ? channel.avatarColor : '#64748b',
    };
  };

  // Status Badge Colors mapping
  const getStatusBadge = (status: ContentScheduleItem['status']) => {
    switch (status) {
      case 'Published':
        return {
          bg: 'bg-emerald-50 text-emerald-950 border-emerald-300',
          label: '🚀 Published',
        };
      case 'Scheduled':
        return {
          bg: 'bg-teal-50 text-teal-950 border-teal-300',
          label: '📅 Scheduled',
        };
      case 'Editing':
        return {
          bg: 'bg-sky-50 text-sky-950 border-sky-300',
          label: '✂️ Editing',
        };
      case 'Recording':
        return {
          bg: 'bg-rose-50 text-rose-950 border-rose-300',
          label: '🎥 Recording',
        };
      case 'Scripting':
        return {
          bg: 'bg-indigo-50 text-indigo-950 border-indigo-300',
          label: '📝 Scripting',
        };
      case 'Researching':
        return {
          bg: 'bg-amber-50 text-amber-950 border-amber-300',
          label: '💡 Researching',
        };
      default:
        return {
          bg: 'bg-slate-50 text-slate-950 border-slate-300',
          label: '📁 Draft',
        };
    }
  };

  const formatFriendlyDate = (dateStr: string) => {
    try {
      const [year, month, day] = dateStr.split('-').map(Number);
      const dateObj = new Date(year, month - 1, day);
      return dateObj.toLocaleDateString('hi-IN', {
        day: 'numeric',
        month: 'short',
        weekday: 'short',
      });
    } catch (e) {
      return dateStr;
    }
  };

  // Setup preview states
  const handleSelectForPreview = (item: ContentScheduleItem) => {
    setSelectedItemForPreview(item);
    setIsEditing(false); // Reset edit view
    setEditTitle(item.title || '');
    setEditDescription(item.description || '');
    setEditStatus(item.status || 'Draft');
    setEditChannelId(item.channelId || '');
    setEditNotes(item.notes || '');
    setEditThumbnail(item.thumbnail || '');
    setEditDate(item.date || '');
  };

  // Save the edited parameters
  const handleSaveEdit = () => {
    if (!selectedItemForPreview) return;
    const updatedItem: ContentScheduleItem = {
      ...selectedItemForPreview,
      title: editTitle,
      description: editDescription,
      status: editStatus,
      channelId: editChannelId,
      notes: editNotes,
      thumbnail: editThumbnail,
      date: editDate,
    };
    if (onUpdateItem) {
      onUpdateItem(updatedItem);
    }
    setSelectedItemForPreview(updatedItem);
    setIsEditing(false);
  };

  // Download absolutely all data (Videos, Tasks, Channels) in a structured CSV format
  const handleDownloadCSV = () => {
    const csvParts: string[] = [];

    // --- SECTION 1: YOUTUBE CHANNELS ---
    csvParts.push('=== SECTION 1: YOUTUBE CHANNELS ===');
    csvParts.push('Channel ID,Channel Name,Channel Handle,Avatar Color');
    channels.forEach(chan => {
      const id = (chan.id || '').replace(/"/g, '""');
      const name = (chan.name || '').replace(/"/g, '""');
      const handle = (chan.handle || '').replace(/"/g, '""');
      const color = (chan.avatarColor || '').replace(/"/g, '""');
      csvParts.push(`"${id}","${name}","${handle}","${color}"`);
    });

    csvParts.push(''); // Empty row divider
    csvParts.push(''); // Empty row divider

    // --- SECTION 2: VIDEO SCHEDULER & CONTENT PLANS ---
    csvParts.push('=== SECTION 2: ALL VIDEO CONTENT PLANS & STRATEGIES ===');
    csvParts.push('Video ID,Video Title,Channel Name,Scheduled Date,Status,Description,Notes,Thumbnail URL');
    items.forEach(item => {
      const channel = channels.find(c => c.id === item.channelId);
      const channelName = channel ? channel.name : 'Unknown Channel';
      
      const id = (item.id || '').replace(/"/g, '""');
      const title = (item.title || '').replace(/"/g, '""');
      const date = (item.date || '').replace(/"/g, '""');
      const status = (item.status || '').replace(/"/g, '""');
      const desc = (item.description || '').replace(/"/g, '""');
      const notes = (item.notes || '').replace(/"/g, '""');
      const thumb = (item.thumbnail || '').replace(/"/g, '""');

      csvParts.push(`"${id}","${title}","${channelName}","${date}","${status}","${desc}","${notes}","${thumb}"`);
    });

    csvParts.push(''); // Empty row divider
    csvParts.push(''); // Empty row divider

    // --- SECTION 3: DAILY PLANNING CHECKLIST (AAJ KA PLAN) ---
    csvParts.push('=== SECTION 3: DAILY PLANNING CHECKLIST (AAJ KA PLAN) ===');
    csvParts.push('Task ID,Task Text,Channel Name,Target Date,Completed Status');
    
    const tasksToExport = dailyTasks || [];
    tasksToExport.forEach(task => {
      const channel = channels.find(c => c.id === task.channelId);
      const channelName = channel ? channel.name : 'Unknown Channel';

      const id = (task.id || '').replace(/"/g, '""');
      const text = (task.text || '').replace(/"/g, '""');
      const date = (task.date || '').replace(/"/g, '""');
      const status = task.isCompleted ? 'Completed ✅' : 'Pending ⏳';

      csvParts.push(`"${id}","${text}","${channelName}","${date}","${status}"`);
    });

    const csvContent = csvParts.join('\n');
    // Indian friendly/global readable filename
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `YouTube_Master_Planner_Complete_Export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white border-2 border-slate-950 rounded-2xl p-4 md:p-6 shadow-sm space-y-4">
      {/* Box Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-slate-950 pb-4">
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <div 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-1.5 rounded-xl select-none transition-all min-w-0"
            title="Click to Collapse or Expand Videos"
          >
            <div className="p-1.5 bg-slate-100 hover:bg-slate-200 border-2 border-slate-950 rounded-lg flex items-center justify-center transition-all active:scale-90 shrink-0">
              {isCollapsed ? <ChevronDown className="w-4 h-4 text-slate-950" /> : <ChevronUp className="w-4 h-4 text-slate-950" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <h4 className="text-sm md:text-base font-black text-slate-950 uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap shrink-0">
                  <Video className="w-4 h-4 md:w-5 md:h-5 text-slate-950" />
                  <span>Video List</span>
                </h4>
                <span className="text-[9px] md:text-[10px] bg-slate-100 text-slate-900 px-2 py-0.5 rounded-full uppercase font-extrabold tracking-wider border border-slate-950 whitespace-nowrap">
                  {isCollapsed ? 'Closed' : 'Active'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Date Range Selector Tab */}
        {!isCollapsed && (
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl border-2 border-slate-950 shrink-0">
            <button
              onClick={() => setRangeMode('selected')}
              className={`px-3 py-1 text-[10px] md:text-xs font-black rounded-lg transition-all cursor-pointer ${
                rangeMode === 'selected'
                  ? 'bg-slate-950 text-white'
                  : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              Selected Date
            </button>
            <button
              onClick={() => setRangeMode('week')}
              className={`px-3 py-1 text-[10px] md:text-xs font-black rounded-lg transition-all cursor-pointer ${
                rangeMode === 'week'
                  ? 'bg-slate-950 text-white'
                  : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              7 Days Range
            </button>
            <button
              onClick={() => setRangeMode('month')}
              className={`px-3 py-1 text-[10px] md:text-xs font-black rounded-lg transition-all cursor-pointer ${
                rangeMode === 'month'
                  ? 'bg-slate-950 text-white'
                  : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => setRangeMode('all')}
              className={`px-3 py-1 text-[10px] md:text-xs font-black rounded-lg transition-all cursor-pointer ${
                rangeMode === 'all'
                  ? 'bg-slate-950 text-white'
                  : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              All Videos
            </button>
          </div>
        )}
      </div>

      {/* Horizontal Line List / Table Grid */}
      {!isCollapsed && (
        <>
          <div className="overflow-x-auto">
        <div className="min-w-[640px] divide-y divide-slate-200">
          
          {/* Table Header Row */}
          <div className="grid grid-cols-12 gap-4 pb-2 text-[10px] font-black uppercase tracking-wider text-slate-500 px-2">
            <div className="col-span-2">Thumbnail</div>
            <div className="col-span-6">Video Title / Channel Details</div>
            <div className="col-span-2">Schedule Date</div>
            <div className="col-span-2 text-right">Current Status</div>
          </div>

          {/* Table Body Content Rows */}
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs font-bold bg-slate-50 border-2 border-dashed border-slate-950 rounded-xl mt-2 px-4">
              <CalendarDays className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              Is select kiye gaye time/date range me koi bhi scheduled videos nahi hain.
              <p className="text-[10px] text-slate-400 mt-1 font-semibold">
                Calendar me doosri date select karein ya fir upar se "All Videos" option chunein.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 pt-2.5">
              {filteredItems.map((item) => {
                const badge = getStatusBadge(item.status);
                const channel = getChannelDetails(item.channelId);
                const isSelectedDay = item.date === selectedDate;

                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelectForPreview(item)}
                    className={`grid grid-cols-12 gap-4 items-center p-3 rounded-xl border-2 transition-all cursor-pointer hover:bg-slate-50 hover:translate-x-0.5 ${
                      isSelectedDay
                        ? 'border-slate-950 bg-slate-100/50 shadow-xs'
                        : 'border-slate-950 bg-white'
                    }`}
                  >
                    {/* Column 1: Thumbnail (Horizontal layout) */}
                    <div className="col-span-2">
                      {item.thumbnail ? (
                        <div className="relative group rounded-lg overflow-hidden border border-slate-950 shadow-xs aspect-[16/9] w-full max-w-[100px] bg-slate-950 flex items-center justify-center">
                          <img
                            src={item.thumbnail}
                            alt={item.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          />
                        </div>
                      ) : (
                        <div className="aspect-[16/9] w-full max-w-[100px] rounded-lg border border-slate-950 bg-slate-950/5 flex items-center justify-center text-slate-400 group-hover:text-slate-600 transition-colors">
                          <Play className="w-4 h-4 text-slate-950" />
                        </div>
                      )}
                    </div>

                    {/* Column 2: Video Title / Channel details */}
                    <div className="col-span-6 space-y-1 pr-2">
                      <h5 className="text-xs font-black text-slate-950 line-clamp-1 leading-snug">
                        {item.title || 'Untitled Strategy'}
                      </h5>
                      
                      <div className="flex items-center gap-2">
                        <span 
                          className="w-2.5 h-2.5 rounded-full border border-slate-950 shrink-0" 
                          style={{ backgroundColor: channel.color }}
                        />
                        <span className="text-[10px] font-bold text-slate-700 truncate max-w-[180px]">
                          {channel.name}
                        </span>
                        {item.notes && (
                          <>
                            <span className="text-[10px] text-slate-300">•</span>
                            <span className="text-[10px] text-slate-500 truncate max-w-[150px] italic">
                              {item.notes}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Column 3: Scheduled Date */}
                    <div className="col-span-2 text-xs font-bold text-slate-700">
                      <span>{formatFriendlyDate(item.date)}</span>
                    </div>

                    {/* Column 4: Current Status */}
                    <div className="col-span-2 text-right">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 text-[10px] font-black rounded-md border-2 border-slate-950 shadow-xs ${badge.bg}`}>
                        {badge.label}
                      </span>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>
      </div>

      {/* VIDEO PREVIEW & EDIT POPUP MODAL */}
      <AnimatePresence>
        {selectedItemForPreview && (() => {
          const currentChannel = getChannelDetails(selectedItemForPreview.channelId);
          const badge = getStatusBadge(selectedItemForPreview.status);
          
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
              {/* Backdrop Click */}
              <div 
                className="absolute inset-0" 
                onClick={() => setSelectedItemForPreview(null)} 
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="bg-white rounded-2xl shadow-xl border-2 border-slate-950 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] z-10"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="bg-slate-50 px-5 py-4 border-b-2 border-slate-950 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-slate-100 text-slate-900 rounded-xl border border-slate-950">
                      <Video className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                        {isEditing ? '🔴 Editing Mode' : 'Video Details Preview'}
                      </span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span 
                          className="w-2.5 h-2.5 rounded-full border border-slate-950" 
                          style={{ backgroundColor: currentChannel.color }} 
                        />
                        <span className="text-xs font-black text-slate-950">
                          {currentChannel.name}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {/* Pencil Edit Icon/Button */}
                    {!isEditing && (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-950 text-xs font-black rounded-lg border-2 border-slate-950 transition-all active:scale-95 cursor-pointer"
                        title="Edit details"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Edit Details</span>
                      </button>
                    )}
                    
                    <button
                      type="button"
                      onClick={() => setSelectedItemForPreview(null)}
                      className="p-1.5 text-slate-600 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all cursor-pointer border border-slate-950"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Body Content */}
                <div className="p-5 space-y-4 overflow-y-auto flex-1">
                  
                  {isEditing ? (
                    /* EDITING VIEW FORM */
                    <div className="space-y-4">
                      
                      {/* Edit Channel (Edit Channel Name option) */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                          Select YouTube Channel:
                        </label>
                        <select
                          value={editChannelId}
                          onChange={(e) => setEditChannelId(e.target.value)}
                          className="w-full px-3 py-2.5 bg-slate-50 border-2 border-slate-950 rounded-xl focus:outline-none focus:bg-white text-xs font-black text-slate-800 transition-all cursor-pointer"
                        >
                          {channels.map((chan) => (
                            <option key={chan.id} value={chan.id}>
                              {chan.name} ({chan.handle})
                            </option>
                          ))}
                        </select>
                        <p className="text-[10px] text-slate-400 font-semibold italic">
                          💡 Aap select list se kisi bhi doosre channel par is video ko assign kar sakte hain.
                        </p>
                      </div>

                      {/* Edit Title */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                          Video Title:
                        </label>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          placeholder="Video ka title likhein..."
                          className="w-full px-3 py-2.5 bg-slate-50 border-2 border-slate-950 rounded-xl focus:outline-none focus:bg-white text-xs font-semibold text-slate-800 transition-all"
                        />
                      </div>

                      {/* Grid Row: Date and Status */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                            Scheduled Date:
                          </label>
                          <input
                            type="date"
                            value={editDate}
                            onChange={(e) => setEditDate(e.target.value)}
                            className="w-full px-3 py-2.5 bg-slate-50 border-2 border-slate-950 rounded-xl focus:outline-none focus:bg-white text-xs font-bold text-slate-800 transition-all"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                            Video Status:
                          </label>
                          <select
                            value={editStatus}
                            onChange={(e) => setEditStatus(e.target.value as ContentScheduleItem['status'])}
                            className="w-full px-3 py-2.5 bg-slate-50 border-2 border-slate-950 rounded-xl focus:outline-none focus:bg-white text-xs font-black text-slate-800 transition-all cursor-pointer"
                          >
                            <option value="Researching">💡 Researching</option>
                            <option value="Scripting">📝 Scripting</option>
                            <option value="Recording">🎥 Recording</option>
                            <option value="Editing">✂️ Editing</option>
                            <option value="Scheduled">📅 Scheduled</option>
                            <option value="Published">🚀 Published</option>
                          </select>
                        </div>
                      </div>

                      {/* Edit Thumbnail */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                          <ImageIcon className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Video Thumbnail</span>
                        </label>
                        
                        {/* Drag & Drop Box */}
                        <div
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                          onClick={() => fileInputRef.current?.click()}
                          className={`relative border-2 border-dashed rounded-xl h-[120px] flex flex-col items-center justify-center cursor-pointer transition-all ${
                            isDragOver 
                              ? 'border-indigo-500 bg-indigo-50/50' 
                              : editThumbnail 
                              ? 'border-emerald-300 bg-emerald-50/10 hover:border-emerald-400' 
                              : 'border-slate-200 hover:border-slate-350 hover:bg-slate-50/50'
                          }`}
                        >
                          <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="image/*"
                            className="hidden"
                          />
                          {editThumbnail ? (
                            <div className="absolute inset-0 p-1 flex items-center justify-center">
                              <img 
                                src={editThumbnail} 
                                alt="Thumbnail Preview" 
                                className="h-full w-full object-cover rounded-lg aspect-[16/9]"
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute inset-0 bg-black/40 rounded-lg opacity-0 hover:opacity-100 transition-all flex items-center justify-center">
                                <span className="text-[10px] text-white font-bold">Change Image</span>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center px-4 flex flex-col items-center">
                              <UploadCloud className="w-6 h-6 text-slate-400 mb-1" />
                              <p className="text-[10px] font-bold text-slate-500">
                                Drag & Drop or <span className="text-indigo-600 font-black">Browse</span>
                              </p>
                              <p className="text-[8px] text-slate-400 mt-0.5">JPEG, PNG files</p>
                            </div>
                          )}
                        </div>

                        {/* Or URL input */}
                        <div className="space-y-1">
                          <span className="text-[9px] font-bold text-slate-400 block">
                            Or paste a Direct Image URL:
                          </span>
                          <input
                            type="text"
                            value={editThumbnail.startsWith('data:') ? '' : editThumbnail}
                            onChange={(e) => setEditThumbnail(e.target.value)}
                            placeholder="Ex: https://images.unsplash.com/... (optional)"
                            className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-950 rounded-xl focus:outline-none focus:bg-white text-xs font-semibold text-slate-800 transition-all"
                          />
                        </div>
                      </div>

                      {/* Edit Description */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                          Description & Script Outline:
                        </label>
                        <textarea
                          rows={4}
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          placeholder="Video script outline ya description details likhein..."
                          className="w-full px-3 py-2.5 bg-slate-50 border-2 border-slate-950 rounded-xl focus:outline-none focus:bg-white text-xs font-semibold text-slate-800 transition-all leading-relaxed"
                        />
                      </div>

                      {/* Edit Notes */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                          Quick Sticky Notes:
                        </label>
                        <input
                          type="text"
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          placeholder="Quick reminders, URLs, references..."
                          className="w-full px-3 py-2.5 bg-slate-50 border-2 border-slate-950 rounded-xl focus:outline-none focus:bg-white text-xs font-bold text-slate-800 transition-all"
                        />
                      </div>

                    </div>
                  ) : (
                    /* STATIC DETAILS VIEW */
                    <div className="space-y-4">
                      
                      {/* Thumbnail and Title */}
                      <div className="space-y-3">
                        {selectedItemForPreview.thumbnail ? (
                          <div className="w-full rounded-xl overflow-hidden border-2 border-slate-950 shadow-sm aspect-[16/9] bg-slate-950">
                            <img
                              src={selectedItemForPreview.thumbnail}
                              alt={selectedItemForPreview.title}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-full rounded-xl border-2 border-dashed border-slate-950 aspect-[16/9] bg-slate-50 flex flex-col items-center justify-center text-slate-500 gap-2">
                            <Play className="w-8 h-8 text-slate-950" />
                            <span className="text-xs font-bold">No Thumbnail Available</span>
                          </div>
                        )}

                        <div className="space-y-1">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                            Video Title
                          </span>
                          <h3 className="text-sm md:text-base font-black text-slate-950 leading-snug">
                            {selectedItemForPreview.title || 'Untitled Strategy'}
                          </h3>
                        </div>
                      </div>

                      <hr className="border-t-2 border-slate-100" />

                      {/* Metadata Row */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                            Schedule Date
                          </span>
                          <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <CalendarDays className="w-4 h-4 text-slate-700" />
                            <span>{formatFriendlyDate(selectedItemForPreview.date)}</span>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                            Current Status
                          </span>
                          <div>
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-black rounded-lg border-2 border-slate-950 shadow-xs ${badge.bg}`}>
                              {badge.label}
                            </span>
                          </div>
                        </div>
                      </div>

                      <hr className="border-t-2 border-slate-100" />

                      {/* Description / Content Details */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                          Description & Script Outline
                        </span>
                        <div className="p-3 bg-slate-50 rounded-xl border-2 border-slate-950 text-xs font-semibold text-slate-800 whitespace-pre-wrap leading-relaxed max-h-[160px] overflow-y-auto">
                          {selectedItemForPreview.description || 'Is video ke liye koi description nahi likha gaya hai.'}
                        </div>
                      </div>

                      {/* Micro-notes if present */}
                      {selectedItemForPreview.notes && (
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                            Extra Quick Notes
                          </span>
                          <div className="p-3 bg-amber-50/50 rounded-xl border-2 border-slate-950 text-xs font-bold text-slate-700 italic">
                            📌 {selectedItemForPreview.notes}
                          </div>
                        </div>
                      )}

                    </div>
                  )}

                </div>

                {/* Footer Action */}
                <div className="bg-slate-50 px-5 py-3 border-t-2 border-slate-950 flex justify-end gap-2.5">
                  {isEditing ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-950 text-xs font-black rounded-xl border-2 border-slate-950 cursor-pointer active:scale-95 transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveEdit}
                        className="flex items-center gap-1.5 px-5 py-2 bg-slate-950 hover:bg-slate-900 text-white text-xs font-black rounded-xl border border-slate-950 cursor-pointer active:scale-95 transition-all shadow-sm"
                      >
                        <Save className="w-4 h-4" />
                        <span>Save Changes</span>
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setSelectedItemForPreview(null)}
                      className="px-4 py-2 bg-slate-950 hover:bg-slate-900 text-white text-xs font-black rounded-xl border border-slate-950 cursor-pointer active:scale-95 transition-all"
                    >
                      Close Preview
                    </button>
                  )}
                </div>

              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
        </>
      )}

    </div>
  );
}
