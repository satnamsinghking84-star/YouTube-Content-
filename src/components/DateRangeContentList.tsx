import React, { useState } from 'react';
import { CalendarDays, Play, Image as ImageIcon, SlidersHorizontal, ChevronRight, Video } from 'lucide-react';
import { ContentScheduleItem, YouTubeChannel } from '../types';

interface DateRangeContentListProps {
  channels: YouTubeChannel[];
  items: ContentScheduleItem[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

type RangeOption = 'selected' | 'week' | 'month' | 'all';

export default function DateRangeContentList({
  channels,
  items,
  selectedDate,
  onSelectDate,
}: DateRangeContentListProps) {
  const [rangeMode, setRangeMode] = useState<RangeOption>('week');

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

  return (
    <div className="bg-white border-2 border-slate-950 rounded-2xl p-4 md:p-6 shadow-sm space-y-4">
      {/* Box Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-slate-950 pb-4">
        <div>
          <h4 className="text-sm font-black text-slate-950 uppercase tracking-wider flex items-center gap-2">
            <Video className="w-5 h-5 text-slate-950" />
            <span>Content Schedule Board</span>
            <span className="text-[10px] bg-slate-100 text-slate-900 px-2 py-0.5 rounded-full uppercase font-bold tracking-normal border border-slate-950">
              Horizontal Line-View
            </span>
          </h4>
          <p className="text-[11px] md:text-xs text-slate-600 font-semibold mt-1">
            Chuninda date range ke video videos ki direct horizontal details list
          </p>
        </div>

        {/* Date Range Selector Tab */}
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
      </div>

      {/* Horizontal Line List / Table Grid */}
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
                    onClick={() => onSelectDate(item.date)}
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

                    {/* Column 4: Current Status (Published, Scheduled, etc.) */}
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

    </div>
  );
}
