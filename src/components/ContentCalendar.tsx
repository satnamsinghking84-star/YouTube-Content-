import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus, Eye, Layers } from 'lucide-react';
import { ContentScheduleItem, DailyPlanningTask } from '../types';

interface ContentCalendarProps {
  channelId: string;
  items: ContentScheduleItem[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onQuickAddForDate: (date: string) => void;
  dailyTasks?: DailyPlanningTask[];
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function ContentCalendar({
  channelId,
  items,
  selectedDate,
  onSelectDate,
  onQuickAddForDate,
  dailyTasks = [],
}: ContentCalendarProps) {
  // Calendar mode: 'month' or 'week' (extremely good for mobile screens)
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');

  // Default date aligned with July 13, 2026 or current active state
  const [currentDate, setCurrentDate] = useState<Date>(() => {
    return new Date(2026, 6, 13); // July 13, 2026
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Helper to format date string (YYYY-MM-DD)
  const formatDateStr = (dYear: number, dMonth: number, dDay: number) => {
    const mm = String(dMonth + 1).padStart(2, '0');
    const dd = String(dDay).padStart(2, '0');
    return `${dYear}-${mm}-${dd}`;
  };

  // Filter items for active channel
  const activeChannelItems = items.filter(item => item.channelId === channelId);

  // Helper to find the dominant status color of a day
  const getDayStatusStyle = (dayItems: ContentScheduleItem[]) => {
    if (dayItems.length === 0) return 'bg-white hover:bg-slate-50/80 text-slate-800 border-slate-100';
    
    const statuses = dayItems.map(item => item.status);
    
    if (statuses.includes('Published')) {
      return 'bg-teal-50/90 border-l-4 border-l-teal-500 border-y border-r border-slate-200/60 text-teal-950 hover:bg-teal-100/80';
    }
    if (statuses.includes('Scheduled')) {
      return 'bg-emerald-50/90 border-l-4 border-l-emerald-500 border-y border-r border-slate-200/60 text-emerald-950 hover:bg-emerald-100/80';
    }
    if (statuses.includes('Editing')) {
      return 'bg-sky-50/90 border-l-4 border-l-sky-500 border-y border-r border-slate-200/60 text-sky-950 hover:bg-sky-100/80';
    }
    if (statuses.includes('Recording')) {
      return 'bg-rose-50/90 border-l-4 border-l-rose-500 border-y border-r border-slate-200/60 text-rose-950 hover:bg-rose-100/80';
    }
    if (statuses.includes('Scripting')) {
      return 'bg-indigo-50/90 border-l-4 border-l-indigo-500 border-y border-r border-slate-200/60 text-indigo-950 hover:bg-indigo-100/80';
    }
    if (statuses.includes('Researching')) {
      return 'bg-amber-50/90 border-l-4 border-l-amber-500 border-y border-r border-slate-200/60 text-amber-950 hover:bg-amber-100/80';
    }
    if (statuses.includes('Draft')) {
      return 'bg-slate-50 border-l-4 border-l-slate-400 border-y border-r border-slate-200/60 text-slate-800 hover:bg-slate-100/80';
    }
    
    return 'bg-white hover:bg-slate-50/80 text-slate-800 border-slate-100';
  };

  const getStatusBadgeDot = (status: string) => {
    switch (status) {
      case 'Published': return 'bg-teal-500';
      case 'Scheduled': return 'bg-emerald-500';
      case 'Editing': return 'bg-sky-500';
      case 'Recording': return 'bg-rose-500';
      case 'Scripting': return 'bg-indigo-500';
      case 'Researching': return 'bg-amber-500';
      case 'Draft': return 'bg-slate-400';
      default: return 'bg-slate-400';
    }
  };

  // Generate days based on viewMode ('month' or 'week')
  let displayDays: { 
    day: number; 
    dateStr: string; 
    isCurrentMonth: boolean; 
    isToday: boolean; 
    isSelected: boolean; 
    dayItems: ContentScheduleItem[];
    dayTasks: DailyPlanningTask[];
  }[] = [];

  if (viewMode === 'month') {
    // Standard 42-cell Month Grid
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthTotalDays = new Date(year, month, 0).getDate();

    // Prev month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const day = prevMonthTotalDays - i;
      const prevMonthIndex = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      const dateStr = formatDateStr(prevYear, prevMonthIndex, day);
      const dayItems = activeChannelItems.filter(item => item.date === dateStr);
      const dayTasks = dailyTasks.filter(task => task.channelId === channelId && task.date === dateStr);
      displayDays.push({ day, dateStr, isCurrentMonth: false, isToday: false, isSelected: selectedDate === dateStr, dayItems, dayTasks });
    }

    // Current month
    const today = new Date();
    for (let day = 1; day <= totalDays; day++) {
      const dateStr = formatDateStr(year, month, day);
      const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
      const dayItems = activeChannelItems.filter(item => item.date === dateStr);
      const dayTasks = dailyTasks.filter(task => task.channelId === channelId && task.date === dateStr);
      displayDays.push({ day, dateStr, isCurrentMonth: true, isToday, isSelected: selectedDate === dateStr, dayItems, dayTasks });
    }

    // Next month padding to fill complete 42-cell grid
    const remaining = 42 - displayDays.length;
    for (let day = 1; day <= remaining; day++) {
      const nextMonthIndex = month === 11 ? 0 : month + 1;
      const nextYear = month === 11 ? year + 1 : year;
      const dateStr = formatDateStr(nextYear, nextMonthIndex, day);
      const dayItems = activeChannelItems.filter(item => item.date === dateStr);
      const dayTasks = dailyTasks.filter(task => task.channelId === channelId && task.date === dateStr);
      displayDays.push({ day, dateStr, isCurrentMonth: false, isToday: false, isSelected: selectedDate === dateStr, dayItems, dayTasks });
    }
  } else {
    // Week View: Generate 7 days around the currently selected date or currentDate
    const centerDate = new Date(selectedDate || currentDate);
    const dayOfWeek = centerDate.getDay(); // 0 is Sunday, 6 is Saturday
    
    // Get Sunday of this week
    const sundayDate = new Date(centerDate);
    sundayDate.setDate(centerDate.getDate() - dayOfWeek);

    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(sundayDate);
      d.setDate(sundayDate.getDate() + i);
      const day = d.getDate();
      const dateStr = formatDateStr(d.getFullYear(), d.getMonth(), day);
      const isToday = today.getDate() === day && today.getMonth() === d.getMonth() && today.getFullYear() === d.getFullYear();
      const dayItems = activeChannelItems.filter(item => item.date === dateStr);
      const dayTasks = dailyTasks.filter(task => task.channelId === channelId && task.date === dateStr);
      displayDays.push({
        day,
        dateStr,
        isCurrentMonth: d.getMonth() === month,
        isToday,
        isSelected: selectedDate === dateStr,
        dayItems,
        dayTasks
      });
    }
  }

  // Change period handlers
  const handlePrev = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(year, month - 1, 1));
    } else {
      // Shift week back by 7 days
      const newD = new Date(currentDate);
      newD.setDate(currentDate.getDate() - 7);
      setCurrentDate(newD);
      // Automatically select the same day in the new week
      const targetDate = new Date(selectedDate);
      targetDate.setDate(targetDate.getDate() - 7);
      onSelectDate(formatDateStr(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()));
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(year, month + 1, 1));
    } else {
      // Shift week forward by 7 days
      const newD = new Date(currentDate);
      newD.setDate(currentDate.getDate() + 7);
      setCurrentDate(newD);
      // Automatically select the same day in the new week
      const targetDate = new Date(selectedDate);
      targetDate.setDate(targetDate.getDate() + 7);
      onSelectDate(formatDateStr(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()));
    }
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), today.getDate()));
    const todayStr = formatDateStr(today.getFullYear(), today.getMonth(), today.getDate());
    onSelectDate(todayStr);
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden" id="calendar-view-box">
      
      {/* Premium Header */}
      <div className="bg-slate-50/80 px-4 md:px-6 py-4 border-b border-slate-150 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center justify-between sm:justify-start gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm md:text-base">
                {MONTHS[month]} {year}
              </h3>
              <p className="text-[10px] md:text-xs text-slate-500 font-medium">Video Schedules & Strategy Planner</p>
            </div>
          </div>

          {/* Mobile view badge */}
          <div className="sm:hidden flex items-center gap-1.5 bg-indigo-50 text-indigo-700 text-[10px] px-2 py-1 rounded-lg font-bold">
            <Layers className="w-3.5 h-3.5" />
            <span>{viewMode === 'month' ? 'Month' : 'Week'} View</span>
          </div>
        </div>

        {/* Calendar controls & toggles */}
        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
          
          {/* View Mode Toggle Switch */}
          <div className="bg-slate-100 p-0.5 rounded-xl border border-slate-200/60 flex items-center">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                viewMode === 'month' 
                  ? 'bg-white text-slate-900 shadow-xs' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                viewMode === 'week' 
                  ? 'bg-white text-slate-900 shadow-xs' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Week
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToday}
              className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all cursor-pointer active:scale-95"
            >
              Today
            </button>
            
            <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5">
              <button
                onClick={handlePrev}
                className="p-1.5 text-slate-600 hover:text-slate-950 rounded-md hover:bg-slate-100 transition-all cursor-pointer"
                title="Previous"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="h-3.5 w-[1px] bg-slate-200" />
              <button
                onClick={handleNext}
                className="p-1.5 text-slate-600 hover:text-slate-950 rounded-md hover:bg-slate-100 transition-all cursor-pointer"
                title="Next"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Weekday indicator labels */}
      <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/30 text-center text-[10px] md:text-[11px] font-bold text-slate-400 py-2.5">
        {WEEKDAYS.map(day => (
          <div key={day} className="tracking-wider uppercase">{day}</div>
        ))}
      </div>

       {/* Calendar Grid with Premium Box-Colors based on status */}
      <div className={`grid grid-cols-7 divide-x divide-y divide-slate-100 border-b border-slate-100 ${
        viewMode === 'month' ? 'grid-rows-6' : 'grid-rows-1'
      }`}>
        {displayDays.map(({ day, dateStr, isCurrentMonth, isToday, isSelected, dayItems, dayTasks }, index) => {
          const hasItems = dayItems.length > 0;
          const cellColorClass = isCurrentMonth 
            ? getDayStatusStyle(dayItems) 
            : 'bg-slate-50/40 text-slate-300 border-slate-100';

          return (
            <div
              key={`${dateStr}-${index}`}
              onClick={() => onSelectDate(dateStr)}
              className={`p-1 md:p-2 flex flex-col justify-between group relative ${
                viewMode === 'month' ? 'min-h-[72px] sm:min-h-[114px]' : 'min-h-[76px] sm:min-h-[118px]'
              } ${cellColorClass} ${
                isSelected 
                  ? 'ring-2 ring-indigo-500 ring-inset z-10' 
                  : ''
              }`}
            >
              {/* Day Badge & Add quick icon */}
              <div className="flex items-center justify-between">
                <span className={`text-[10px] md:text-xs font-bold ${
                  isToday 
                    ? 'w-5 h-5 sm:w-6 sm:h-6 bg-rose-600 text-white rounded-full flex items-center justify-center font-black shadow-sm' 
                    : isSelected 
                    ? 'text-indigo-700 font-extrabold' 
                    : !isCurrentMonth 
                    ? 'text-slate-300' 
                    : 'text-slate-800'
                }`}>
                  {day}
                </span>

                {/* Quick Plus Action (desktop hover) */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onQuickAddForDate(dateStr);
                  }}
                  className="hidden md:block opacity-0 group-hover:opacity-100 p-0.5 hover:bg-white/90 border border-slate-200/50 text-indigo-600 rounded-md transition-all shadow-xs"
                  title="Plan video for this date"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Grid Contents - Responsive (Compact titles on both mobile and desktop) */}
              <div className="mt-1 flex-1 flex flex-col justify-end overflow-hidden w-full gap-1">
                {/* 1. Video Scheduled Items */}
                {hasItems && (
                  <div className="flex flex-col gap-0.5 w-full max-h-[46px] overflow-hidden">
                    {dayItems.map(item => (
                      <div
                        key={item.id}
                        className="text-[8px] leading-[10px] md:text-[9px] md:leading-[11px] px-1 md:px-1.5 py-0.5 rounded-md font-bold truncate border transition-all flex items-center gap-1 bg-white/95 shadow-3xs border-slate-200/40 hover:border-indigo-400 text-slate-800"
                        title={`🎥 Video: ${item.title} (${item.status})`}
                      >
                        <span className={`w-1 h-1 md:w-1.5 md:h-1.5 rounded-full shrink-0 ${getStatusBadgeDot(item.status)}`} />
                        <span className="truncate flex-1">{item.title}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* 2. Daily Planning Tasks */}
                {dayTasks && dayTasks.length > 0 && (
                  <div className="flex flex-col gap-0.5 w-full max-h-[46px] overflow-hidden">
                    {dayTasks.map(task => (
                      <div
                        key={task.id}
                        className={`text-[8px] leading-[10px] md:text-[9px] md:leading-[11px] px-1 md:px-1.5 py-0.5 rounded-md font-semibold truncate border transition-all flex items-center gap-1 shadow-3xs ${
                          task.isCompleted 
                            ? 'bg-emerald-50/70 border-emerald-100 text-emerald-800 line-through' 
                            : 'bg-indigo-50/70 border-indigo-100 text-indigo-950'
                        }`}
                        title={`📋 Task: ${task.text} (${task.isCompleted ? 'Completed' : 'Pending'})`}
                      >
                        <span className={`w-1 h-1 rounded-full shrink-0 ${task.isCompleted ? 'bg-emerald-500' : 'bg-indigo-500'}`} />
                        <span className="truncate flex-1">📋 {task.text}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend guide for colored boxes */}
      <div className="bg-slate-50/50 px-4 py-2.5 border-t border-slate-100 flex flex-wrap items-center gap-4 text-[10px] md:text-xs font-bold text-slate-500">
        <span className="text-slate-400">Box Colors:</span>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-teal-50 border-l-2 border-l-teal-500 border-y border-r border-slate-250" />
          <span className="text-teal-950">Published</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-emerald-50 border-l-2 border-l-emerald-500 border-y border-r border-slate-250" />
          <span className="text-emerald-950">Scheduled</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-sky-50 border-l-2 border-l-sky-500 border-y border-r border-slate-250" />
          <span className="text-sky-950">Editing</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-rose-50 border-l-2 border-l-rose-500 border-y border-r border-slate-250" />
          <span className="text-rose-950">Recording</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-indigo-50 border-l-2 border-l-indigo-500 border-y border-r border-slate-250" />
          <span className="text-indigo-950">Scripting</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-amber-50 border-l-2 border-l-amber-500 border-y border-r border-slate-250" />
          <span className="text-amber-950">Researching</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-slate-50 border-l-2 border-l-slate-400 border-y border-r border-slate-250" />
          <span className="text-slate-700">Draft</span>
        </div>
      </div>

    </div>
  );
}
