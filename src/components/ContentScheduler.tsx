import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, 
  Image as ImageIcon, 
  FileText, 
  Plus, 
  Trash2, 
  Edit3, 
  UploadCloud, 
  Clock,
  Youtube,
  Sparkles,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { ContentScheduleItem } from '../types';

interface ContentSchedulerProps {
  channelId: string;
  channelName: string;
  items: ContentScheduleItem[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onAddItem: (item: ContentScheduleItem) => void;
  onDeleteItem: (id: string) => void;
  onUpdateItem: (item: ContentScheduleItem) => void;
}

export const STATUS_OPTS = [
  { value: 'Draft', label: 'Draft', color: 'bg-slate-100 text-slate-800 border-slate-200' },
  { value: 'Researching', label: '💡 Idea / Research', color: 'bg-amber-50 text-amber-900 border-amber-200' },
  { value: 'Scripting', label: '📝 Scripting', color: 'bg-indigo-50 text-indigo-900 border-indigo-200' },
  { value: 'Recording', label: '🎥 Recording', color: 'bg-rose-50 text-rose-900 border-rose-200' },
  { value: 'Editing', label: '✂️ Editing', color: 'bg-sky-50 text-sky-900 border-sky-200' },
  { value: 'Scheduled', label: '📅 Scheduled', color: 'bg-emerald-50 text-emerald-900 border-emerald-200' },
  { value: 'Published', label: '🚀 Published', color: 'bg-teal-50 text-teal-900 border-teal-200' },
];

export default function ContentScheduler({
  channelId,
  channelName,
  items,
  selectedDate,
  onSelectDate,
  onAddItem,
  onDeleteItem,
  onUpdateItem,
}: ContentSchedulerProps) {
  // Form input state for scheduling (Add only)
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [thumbnail, setThumbnail] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [status, setStatus] = useState<ContentScheduleItem['status']>('Draft');

  const [isCompressing, setIsCompressing] = useState(false);
  const [isModalCompressing, setIsModalCompressing] = useState(false);

  // Drag and drop state for thumbnail
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit schedule modal state
  const [editingItem, setEditingItem] = useState<ContentScheduleItem | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editDescription, setEditDescription] = useState<string>('');
  const [editThumbnail, setEditThumbnail] = useState<string>('');
  const [editStatus, setEditStatus] = useState<ContentScheduleItem['status']>('Draft');
  const [editDate, setEditDate] = useState<string>('');

  // Drag and drop state for Edit Modal thumbnail
  const [isModalDragOver, setIsModalDragOver] = useState(false);
  const modalFileInputRef = useRef<HTMLInputElement>(null);

  // Downscale image helper for Add Thumbnail
  const processImageFile = (file: File) => {
    if (!file) return;
    setIsCompressing(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const maxW = 480;
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
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.80);
            setThumbnail(compressedBase64);
          }
        } catch (err) {
          console.error("Compression error:", err);
        } finally {
          setIsCompressing(false);
        }
      };
      img.onerror = () => {
        console.error("Image load failed");
        setIsCompressing(false);
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      console.error("FileReader failed");
      setIsCompressing(false);
    };
    reader.readAsDataURL(file);
  };

  // Downscale image helper for Edit Modal Thumbnail
  const processModalImageFile = (file: File) => {
    if (!file) return;
    setIsModalCompressing(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const maxW = 480;
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
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.80);
            setEditThumbnail(compressedBase64);
          }
        } catch (err) {
          console.error("Compression error:", err);
        } finally {
          setIsModalCompressing(false);
        }
      };
      img.onerror = () => {
        console.error("Image load failed");
        setIsModalCompressing(false);
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      console.error("FileReader failed");
      setIsModalCompressing(false);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processImageFile(e.target.files[0]);
    }
  };

  const handleModalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processModalImageFile(e.target.files[0]);
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

  const handleModalDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsModalDragOver(true);
  };

  const handleModalDragLeave = () => {
    setIsModalDragOver(false);
  };

  const handleModalDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsModalDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processModalImageFile(e.dataTransfer.files[0]);
    }
  };

  // Submit new schedule item (Add Form only)
  const handleSubmitSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newItem: ContentScheduleItem = {
      id: `sched-${Date.now()}`,
      channelId,
      date: selectedDate,
      thumbnail,
      title: title.trim(),
      description: description.trim(),
      status,
    };
    onAddItem(newItem);

    // Reset Add Form State
    setTitle('');
    setDescription('');
    setThumbnail('');
    setStatus('Draft');
  };

  // Submit strategy changes (Edit Modal only)
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim() || !editingItem) return;

    onUpdateItem({
      ...editingItem,
      date: editDate,
      thumbnail: editThumbnail,
      title: editTitle.trim(),
      description: editDescription.trim(),
      status: editStatus,
    });
    setEditingItem(null);
  };

  // Edit item action - Launches Modal
  const startEdit = (item: ContentScheduleItem) => {
    setEditingItem(item);
    setEditDate(item.date);
    setEditThumbnail(item.thumbnail);
    setEditTitle(item.title);
    setEditDescription(item.description);
    setEditStatus(item.status);
  };

  const cancelEdit = () => {
    setEditingItem(null);
  };

  // Selected date contents
  const selectedDateItems = items.filter(item => item.channelId === channelId && item.date === selectedDate);

  return (
    <div className="space-y-6" id="scheduler-form-section">
      
      {/* Dynamic unified header block for details scheduler */}
      <div className="bg-slate-900 border-2 border-slate-950 rounded-2xl p-4 md:px-6 md:py-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center justify-between sm:justify-start gap-3 w-full sm:w-auto cursor-pointer select-none min-w-0 flex-1"
          title="Click to Collapse or Expand Scheduler & Details"
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="p-1.5 bg-slate-800 border border-slate-700 rounded-lg flex items-center justify-center transition-all active:scale-90 shrink-0">
              {isCollapsed ? <ChevronDown className="w-4 h-4 text-white" /> : <ChevronUp className="w-4 h-4 text-white" />}
            </div>
            <div className="p-2 bg-rose-500/10 text-rose-400 rounded-xl shrink-0">
              <Youtube className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <h3 className="font-bold text-white text-sm md:text-base whitespace-nowrap shrink-0">
                  Video Strategy & Scheduler
                </h3>
                <span className="text-[9px] md:text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full uppercase font-extrabold tracking-wider border border-slate-700 whitespace-nowrap">
                  {isCollapsed ? 'Closed' : 'Active'}
                </span>
              </div>
              <p className="text-[10px] md:text-xs text-slate-400 font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                Create & manage plans for <span className="text-rose-400 font-bold">{channelName}</span> on {selectedDate}
              </p>
            </div>
          </div>
        </div>
      </div>

      {!isCollapsed && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* PANEL A: SELECTED DATE VIDEO STRATEGY LIST */}
        <div className="bg-white border-2 border-slate-950 rounded-2xl p-4 md:p-6 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-150 pb-3">
              <div>
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Youtube className="w-5 h-5 text-rose-600" />
                  <span>Video Strategy</span>
                </h4>
                <p className="text-[10px] md:text-xs text-slate-500 font-medium">
                  Selected Date: <span className="text-indigo-600 font-bold">{selectedDate}</span>
                </p>
              </div>
              <span className="text-xs font-bold bg-rose-50 text-rose-700 px-3 py-1 rounded-lg shrink-0">
                {selectedDateItems.length} Video{selectedDateItems.length === 1 ? '' : 's'}
              </span>
            </div>

            {selectedDateItems.length === 0 ? (
              <div className="py-24 text-center text-slate-400 text-xs font-bold flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-2xl p-4 bg-slate-50/10">
                <Youtube className="w-10 h-10 text-slate-300 mb-2" />
                Schedules empty on {selectedDate}. Use the form on the right to schedule a video strategy for this date!
              </div>
            ) : (
              <div className="space-y-4 max-h-[460px] overflow-y-auto pr-1">
                {selectedDateItems.map((item) => {
                  const statusInfo = STATUS_OPTS.find(s => s.value === item.status) || STATUS_OPTS[0];
                  return (
                    <div 
                      key={item.id} 
                      className="flex flex-col sm:flex-row items-stretch gap-3.5 bg-slate-50/50 border border-slate-150 rounded-xl p-3 hover:border-slate-300 transition-all shadow-2xs"
                    >
                      {/* Thumbnail column */}
                      <div className="w-full sm:w-32 shrink-0 aspect-[16/9] bg-slate-900 rounded-lg overflow-hidden relative shadow-inner">
                        {item.thumbnail ? (
                          <img 
                            src={item.thumbnail} 
                            alt="Thumbnail" 
                            className="w-full h-full object-cover" 
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-tr from-slate-800 to-slate-900 text-center p-2">
                            <span className="text-[8px] font-extrabold uppercase tracking-widest text-slate-500">No Thumbnail</span>
                            <Youtube className="w-5 h-5 text-slate-600 mt-1" />
                          </div>
                        )}
                      </div>

                      {/* Info details column */}
                      <div className="flex-1 flex flex-col justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <h5 className="font-bold text-slate-900 text-xs md:text-sm leading-snug">{item.title}</h5>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => startEdit(item)}
                                className="p-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg hover:text-indigo-600 hover:bg-indigo-50 transition-all cursor-pointer"
                                title="Edit schedule"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => onDeleteItem(item.id)}
                                className="p-1.5 bg-white border border-slate-250 text-slate-400 rounded-lg hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                                title="Delete schedule"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          <p className="text-[11px] text-slate-500 font-medium leading-relaxed bg-white p-2.5 rounded-lg border border-slate-100 line-clamp-3">
                            {item.description || 'No description provided.'}
                          </p>
                        </div>

                        <div className="flex items-center justify-between text-[10px] font-bold mt-1">
                          <span className={`px-2.5 py-1 rounded-md border text-[8px] uppercase tracking-wider font-black ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          <div className="pt-3 border-t border-slate-100 mt-4 text-[11px] font-medium text-slate-400 flex items-center justify-between">
            <span>💡 Tip: Click different calendar dates to view or edit their video strategies.</span>
          </div>
        </div>

        {/* PANEL B: SCHEDULER INPUT FORM (VERTICAL RIGHT TRAY) */}
        <div className="bg-white border-2 border-slate-950 rounded-2xl shadow-xs overflow-hidden flex flex-col justify-between">
          <div className="bg-slate-50/70 px-4 md:px-6 py-4 border-b border-slate-150 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-xs md:text-sm">
                  📅 Schedule New Video Strategy
                </h3>
                <p className="text-[10px] md:text-xs text-slate-500">
                  Channel: <span className="text-indigo-600 font-bold">{channelName}</span>
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmitSchedule} className="p-4 md:p-6 space-y-4 flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              
              {/* Field 1: Target Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Target Date</span>
                </label>
                <input
                  type="date"
                  required
                  value={selectedDate}
                  onChange={(e) => onSelectDate(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white font-medium text-slate-800 transition-all text-xs"
                />
              </div>

              {/* Field 2: Video Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Video Title</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Coding Tricks in React..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-xs font-semibold text-slate-800 transition-all placeholder:text-slate-400"
                />
              </div>

              {/* Field 3: Stage */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Production Stage</span>
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ContentScheduleItem['status'])}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-xs font-bold text-slate-700 transition-all cursor-pointer"
                >
                  {STATUS_OPTS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Field 4: Description & Hooks */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Hook / Subtopics</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Subtopics, tags, call to action, SEO keywords..."
                  rows={2}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-xs text-slate-600 transition-all resize-none min-h-[64px]"
                />
              </div>

              {/* Field 5: Video Thumbnail Image */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Thumbnail Preview</span>
                </label>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => !isCompressing && fileInputRef.current?.click()}
                  className={`relative border-2 border-dashed rounded-xl h-[100px] flex flex-col items-center justify-center cursor-pointer transition-all ${
                    isCompressing
                      ? 'border-indigo-400 bg-indigo-50/20 cursor-not-allowed'
                      : isDragOver 
                      ? 'border-indigo-500 bg-indigo-50/50' 
                      : thumbnail 
                      ? 'border-emerald-300 bg-emerald-50/10 hover:border-emerald-400' 
                      : 'border-slate-200 hover:border-slate-350 hover:bg-slate-50/50'
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    disabled={isCompressing}
                    className="hidden"
                  />
                  {isCompressing ? (
                    <div className="text-center px-4 flex flex-col items-center">
                      <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mb-1"></div>
                      <p className="text-[10px] font-black text-indigo-600 animate-pulse">Compressing...</p>
                    </div>
                  ) : thumbnail ? (
                    <div className="absolute inset-0 p-1 flex items-center justify-center">
                      <img 
                        src={thumbnail} 
                        alt="Thumbnail Preview" 
                        className="h-full w-full object-cover rounded-lg aspect-[16/9]"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-black/40 rounded-lg opacity-0 hover:opacity-100 transition-all flex items-center justify-center">
                        <span className="text-[10px] text-white font-bold">Change Thumbnail</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center px-4 flex flex-col items-center">
                      <UploadCloud className="w-6 h-6 text-slate-400 mb-1" />
                      <p className="text-[10px] font-bold text-slate-500">
                        Drag & Drop or <span className="text-indigo-600 font-black">Browse</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Form Actions */}
            <div className="pt-4 border-t border-slate-100 mt-4">
              <button
                type="submit"
                disabled={isCompressing}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 font-bold text-white rounded-xl transition-all shadow-md active:scale-95 whitespace-nowrap cursor-pointer bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCompressing ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                <span>{isCompressing ? 'Compressing Image...' : 'Schedule Video Strategy'}</span>
              </button>
            </div>
          </form>
        </div>

      </div>
      )}

      {/* EDIT MODAL DIALOG (FIX: Pencil edit icon now launches this highly interactive full-screen popup) */}
      <AnimatePresence>
        {editingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            {/* Backdrop click to cancel */}
            <div className="absolute inset-0" onClick={cancelEdit} />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] z-10"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="bg-slate-50 px-5 py-4 border-b border-slate-150 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                    <Edit3 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-xs md:text-sm">
                      ✏️ Edit Scheduled Video
                    </h3>
                    <p className="text-[10px] md:text-xs text-slate-500">
                      Channel: <span className="text-indigo-600 font-bold">{channelName}</span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="text-[11px] px-3 py-1.5 font-bold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>

              {/* Modal Form */}
              <form onSubmit={handleSaveEdit} className="p-5 space-y-4 overflow-y-auto flex-1">
                {/* Field 1: Target Date */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Target Date</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white font-medium text-slate-800 transition-all text-xs"
                  />
                </div>

                {/* Field 2: Video Title */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Video Title</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Ex: Coding Tricks in React..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-xs font-semibold text-slate-800 transition-all placeholder:text-slate-400"
                  />
                </div>

                {/* Field 3: Stage */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Production Stage</span>
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as ContentScheduleItem['status'])}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-xs font-bold text-slate-700 transition-all cursor-pointer"
                  >
                    {STATUS_OPTS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Field 4: Description & Hooks */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Hook / Subtopics</span>
                  </label>
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Ex: Subtopics, tags, call to action, SEO keywords..."
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-xs text-slate-600 transition-all resize-none min-h-[80px]"
                  />
                </div>

                {/* Field 5: Video Thumbnail Image */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Thumbnail Preview</span>
                  </label>
                  <div
                    onDragOver={handleModalDragOver}
                    onDragLeave={handleModalDragLeave}
                    onDrop={handleModalDrop}
                    onClick={() => !isModalCompressing && modalFileInputRef.current?.click()}
                    className={`relative border-2 border-dashed rounded-xl h-[120px] flex flex-col items-center justify-center cursor-pointer transition-all ${
                      isModalCompressing
                        ? 'border-indigo-400 bg-indigo-50/20 cursor-not-allowed'
                        : isModalDragOver 
                        ? 'border-indigo-500 bg-indigo-50/50' 
                        : editThumbnail 
                        ? 'border-emerald-300 bg-emerald-50/10 hover:border-emerald-400' 
                        : 'border-slate-200 hover:border-slate-350 hover:bg-slate-50/50'
                    }`}
                  >
                    <input
                      type="file"
                      ref={modalFileInputRef}
                      onChange={handleModalFileChange}
                      accept="image/*"
                      disabled={isModalCompressing}
                      className="hidden"
                    />
                    {isModalCompressing ? (
                      <div className="text-center px-4 flex flex-col items-center">
                        <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mb-1"></div>
                        <p className="text-[10px] font-black text-indigo-600 animate-pulse">Compressing...</p>
                      </div>
                    ) : editThumbnail ? (
                      <div className="absolute inset-0 p-1 flex items-center justify-center">
                        <img 
                          src={editThumbnail} 
                          alt="Thumbnail Preview" 
                          className="h-full w-full object-cover rounded-lg aspect-[16/9]"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-black/40 rounded-lg opacity-0 hover:opacity-100 transition-all flex items-center justify-center">
                          <span className="text-[10px] text-white font-bold">Change Thumbnail</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center px-4 flex flex-col items-center">
                        <UploadCloud className="w-6 h-6 text-slate-400 mb-1" />
                        <p className="text-[10px] font-bold text-slate-500">
                          Drag & Drop or <span className="text-indigo-600 font-black">Browse</span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Form Save Button */}
                <div className="pt-4 border-t border-slate-100 mt-4">
                  <button
                    type="submit"
                    disabled={isModalCompressing}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 font-bold text-white rounded-xl transition-all shadow-md active:scale-95 whitespace-nowrap cursor-pointer bg-amber-500 hover:bg-amber-600 shadow-amber-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isModalCompressing ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Edit3 className="w-4 h-4" />
                    )}
                    <span>{isModalCompressing ? 'Compressing Image...' : 'Save Strategy Changes'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
