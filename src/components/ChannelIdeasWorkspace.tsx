import React, { useState, useEffect, useRef } from 'react';
import { 
  Lightbulb, 
  Plus, 
  Trash2, 
  ArrowLeft, 
  Cloud, 
  Loader2, 
  Check, 
  X, 
  Trash,
  HelpCircle
} from 'lucide-react';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  query, 
  where,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';
import { YouTubeChannel, ChannelIdea } from '../types';

interface ChannelIdeasWorkspaceProps {
  activeChannel: YouTubeChannel | null;
  onBack: () => void;
  triggerToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

interface ActiveCell {
  rowIndex: number;
  colKey: 'number' | 'title' | 'shortDescription';
}

export default function ChannelIdeasWorkspace({
  activeChannel,
  onBack,
  triggerToast
}: ChannelIdeasWorkspaceProps) {
  const [ideas, setIdeas] = useState<ChannelIdea[]>(() => {
    if (!activeChannel?.id) return [];
    try {
      const cached = localStorage.getItem(`cache_ideas_${activeChannel.id}`);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(() => {
    if (!activeChannel?.id) return false;
    try {
      const cached = localStorage.getItem(`cache_ideas_${activeChannel.id}`);
      return !cached;
    } catch {
      return true;
    }
  });
  const [isSaving, setIsSaving] = useState(false);

  // Grid columns widths in pixels
  const [colWidthA, setColWidthA] = useState(80); // S.No
  const [colWidthB, setColWidthB] = useState(280); // Idea Title
  const [colWidthC, setColWidthC] = useState(440); // Short Description

  // Active cell selection
  const [selectedCell, setSelectedCell] = useState<ActiveCell | null>(null);
  
  // Track if we are actively editing inline inside the cell
  const [inlineEditingCell, setInlineEditingCell] = useState<ActiveCell | null>(null);

  // Spreadsheet rows
  const [sheetRows, setSheetRows] = useState<Array<{
    tempId: string;
    id?: string;
    number: string;
    title: string;
    shortDescription: string;
  }>>([]);

  // Value in the Formula Bar at the bottom
  const [formulaValue, setFormulaValue] = useState('');
  const formulaInputRef = useRef<HTMLInputElement>(null);

  // Fetch ideas
  useEffect(() => {
    if (!activeChannel?.id) {
      setIdeas([]);
      setLoading(false);
      return;
    }

    // Try loading cached ideas first for lightning-fast (0ms) render
    try {
      const cached = localStorage.getItem(`cache_ideas_${activeChannel.id}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        setIdeas(parsed);
        setLoading(false);
      } else {
        setLoading(true);
      }
    } catch (e) {
      console.error(e);
      setLoading(true);
    }

    const q = query(
      collection(db, 'ideas'),
      where('channelId', '==', activeChannel.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: ChannelIdea[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as ChannelIdea);
      });
      
      // Sort ideas by number or creation timestamp
      list.sort((a, b) => {
        const numA = parseFloat(a.number) || 0;
        const numB = parseFloat(b.number) || 0;
        if (numA !== numB) return numA - numB;
        return a.createdAt.localeCompare(b.createdAt);
      });

      setIdeas(list);
      try {
        localStorage.setItem(`cache_ideas_${activeChannel.id}`, JSON.stringify(list));
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error loading ideas:", error);
      triggerToast("Failed to load ideas", "error");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [activeChannel?.id]);

  // Sync state with ideas
  useEffect(() => {
    const rows = ideas.map((idea, index) => ({
      tempId: `row-existing-${idea.id}`,
      id: idea.id,
      number: idea.number || String(index + 1),
      title: idea.title || '',
      shortDescription: idea.shortDescription || ''
    }));

    // Ensure we have at least 15 rows for that premium Google Sheets feeling
    const defaultLength = Math.max(15, rows.length + 5);
    while (rows.length < defaultLength) {
      const idx = rows.length;
      rows.push({
        tempId: `row-blank-${idx}-${Date.now()}`,
        number: String(idx + 1),
        title: '',
        shortDescription: ''
      });
    }

    setSheetRows(rows);
  }, [ideas]);

  // Sync Formula Bar value when cell selection changes
  useEffect(() => {
    if (selectedCell) {
      const row = sheetRows[selectedCell.rowIndex];
      if (row) {
        setFormulaValue(row[selectedCell.colKey]);
      }
    } else {
      setFormulaValue('');
    }
  }, [selectedCell, sheetRows]);

  // Commit changes to Firestore
  const commitCellChange = async (
    rowIndex: number,
    colKey: 'number' | 'title' | 'shortDescription',
    newValue: string
  ) => {
    if (!activeChannel) return;
    
    const targetRow = sheetRows[rowIndex];
    if (!targetRow) return;

    // Look up original value from the database source of truth (ideas)
    const originalIdea = targetRow.id ? ideas.find(i => i.id === targetRow.id) : null;
    const dbValue = originalIdea ? (originalIdea[colKey] || '') : '';

    if (dbValue === newValue) {
      return; // No change compared to database
    }

    // Local update first
    const updatedRows = [...sheetRows];
    updatedRows[rowIndex] = {
      ...targetRow,
      [colKey]: newValue
    };
    setSheetRows(updatedRows);

    const finalNumber = colKey === 'number' ? newValue.trim() : (targetRow.number || '').trim();
    const finalTitle = colKey === 'title' ? newValue.trim() : (targetRow.title || '').trim();
    const finalDesc = colKey === 'shortDescription' ? newValue.trim() : (targetRow.shortDescription || '').trim();

    const isRowTotallyEmpty = !finalTitle && !finalDesc;

    setIsSaving(true);
    try {
      if (targetRow.id) {
        if (isRowTotallyEmpty) {
          // Row became empty, delete doc
          await deleteDoc(doc(db, 'ideas', targetRow.id));
          triggerToast("Removed empty concept row", "info");
        } else {
          // Update existing
          await setDoc(doc(db, 'ideas', targetRow.id), {
            channelId: activeChannel.id,
            number: finalNumber || String(rowIndex + 1),
            title: finalTitle,
            shortDescription: finalDesc,
            createdAt: new Date().toISOString()
          }, { merge: true });
        }
      } else {
        // Create new
        if (!isRowTotallyEmpty) {
          const newIdeaId = `idea-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          await setDoc(doc(db, 'ideas', newIdeaId), {
            id: newIdeaId,
            channelId: activeChannel.id,
            number: finalNumber || String(rowIndex + 1),
            title: finalTitle,
            shortDescription: finalDesc,
            createdAt: new Date().toISOString()
          });
          
          updatedRows[rowIndex].id = newIdeaId;
          setSheetRows(updatedRows);
        }
      }
    } catch (err) {
      console.error("Save failed:", err);
      triggerToast("Failed to autosave changes", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Add new blank row
  const handleAddRow = () => {
    const nextIdx = sheetRows.length;
    setSheetRows(prev => [
      ...prev,
      {
        tempId: `row-blank-${nextIdx}-${Date.now()}`,
        number: String(nextIdx + 1),
        title: '',
        shortDescription: ''
      }
    ]);
    triggerToast("Added a new row", "success");
  };

  // Clear all ideas in the sheet
  const handleClearSheet = async () => {
    if (!activeChannel) return;
    const confirmClear = window.confirm("Are you sure you want to delete all spreadsheet entries for this channel? This cannot be undone.");
    if (!confirmClear) return;

    setIsSaving(true);
    try {
      const activeIdeas = ideas.filter(idea => idea.channelId === activeChannel.id);
      if (activeIdeas.length > 0) {
        const batch = writeBatch(db);
        activeIdeas.forEach(idea => {
          batch.delete(doc(db, 'ideas', idea.id));
        });
        await batch.commit();
      }
      setSelectedCell(null);
      setInlineEditingCell(null);
      triggerToast("Spreadsheet cleared", "success");
    } catch (err) {
      console.error(err);
      triggerToast("Failed to clear sheet", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Delete specified row
  const handleDeleteRow = async (rowIndex: number) => {
    const row = sheetRows[rowIndex];
    if (!row) return;

    if (row.id) {
      const confirmDelete = window.confirm(`Delete row ${row.number}: "${row.title || 'Untitled'}"?`);
      if (!confirmDelete) return;

      setIsSaving(true);
      try {
        await deleteDoc(doc(db, 'ideas', row.id));
        if (selectedCell?.rowIndex === rowIndex) {
          setSelectedCell(null);
          setInlineEditingCell(null);
        }
        triggerToast(`Row deleted`, "success");
      } catch (err) {
        console.error(err);
        triggerToast("Failed to delete row", "error");
      } finally {
        setIsSaving(false);
      }
    } else {
      const updated = [...sheetRows];
      updated.splice(rowIndex, 1);
      setSheetRows(updated);
      triggerToast("Removed row", "info");
    }
  };

  // Column resizing mouse & touch controller
  const handleResizeStart = (
    e: React.MouseEvent | React.TouchEvent,
    col: 'A' | 'B' | 'C'
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const startX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const startWidth = col === 'A' ? colWidthA : col === 'B' ? colWidthB : colWidthC;

    const handleResizeMove = (moveEvent: MouseEvent | TouchEvent) => {
      const currentX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
      const deltaX = currentX - startX;
      const calculatedWidth = Math.max(50, startWidth + deltaX);
      
      if (col === 'A') setColWidthA(calculatedWidth);
      else if (col === 'B') setColWidthB(calculatedWidth);
      else if (col === 'C') setColWidthC(calculatedWidth);
    };

    const handleResizeEnd = () => {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
      document.removeEventListener('touchmove', handleResizeMove);
      document.removeEventListener('touchend', handleResizeEnd);
    };

    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
    document.addEventListener('touchmove', handleResizeMove, { passive: false });
    document.addEventListener('touchend', handleResizeEnd);
  };

  // Commit from Formula Bar
  const handleFormulaCommit = () => {
    if (!selectedCell) return;
    commitCellChange(selectedCell.rowIndex, selectedCell.colKey, formulaValue);
    setInlineEditingCell(null);
    triggerToast("Cell updated", "success");
  };

  // Dismiss selection
  const handleFormulaCancel = () => {
    if (selectedCell) {
      const row = sheetRows[selectedCell.rowIndex];
      if (row) {
        setFormulaValue(row[selectedCell.colKey]);
      }
    }
    setInlineEditingCell(null);
  };

  // Determine total width
  const totalGridWidth = 48 + colWidthA + colWidthB + colWidthC + 60;

  const isColAActive = selectedCell?.colKey === 'number';
  const isColBActive = selectedCell?.colKey === 'title';
  const isColCActive = selectedCell?.colKey === 'shortDescription';

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6 pb-32">
      
      {/* --- PREMIUM RESPONSIVE HEADER --- */}
      <div className="bg-white border-2 border-slate-950 rounded-2xl p-4 md:p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-yellow-100 border-2 border-slate-950 rounded-2xl flex items-center justify-center text-yellow-600 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] shrink-0">
            <Lightbulb className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center flex-wrap gap-2">
              <h2 className="text-lg md:text-2xl font-black text-slate-950 uppercase tracking-tight">
                Ideas Spreadsheet
              </h2>
              {activeChannel && (
                <div 
                  className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest border-2 border-slate-950 shadow-sm"
                  style={{ backgroundColor: activeChannel.avatarColor + '20', borderColor: '#0f172a' }}
                >
                  <div 
                    className="w-2 h-2 rounded-full border border-slate-950" 
                    style={{ backgroundColor: activeChannel.avatarColor }}
                  />
                  <span className="text-slate-950">{activeChannel.name}</span>
                </div>
              )}
            </div>
            <p className="text-[11px] md:text-xs text-slate-500 font-semibold mt-1">
              Google Sheet-style grids. Drag column borders to resize. Double click to type inline or edit from the formula bar at the bottom.
            </p>
          </div>
        </div>

        {/* Back Button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border-2 border-slate-950 text-slate-950 rounded-xl font-black text-xs transition-all cursor-pointer active:scale-95 select-none shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] w-full md:w-auto justify-center"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" />
          <span>Back to Scheduler</span>
        </button>
      </div>

      {/* --- SHEET CONTAINER --- */}
      <div className="bg-white border-2 border-slate-950 rounded-2xl overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col">
        
        {/* Actions bar */}
        <div className="bg-slate-50 border-b-2 border-slate-950 p-3 md:p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 select-none">
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleAddRow}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 border-2 border-slate-950 text-indigo-900 rounded-lg font-black text-xs transition-all cursor-pointer active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Row</span>
            </button>
            <button
              onClick={handleClearSheet}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border-2 border-slate-950 text-rose-850 rounded-lg font-black text-xs transition-all cursor-pointer active:scale-95"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Sheet</span>
            </button>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3 text-[10px] font-black uppercase tracking-wider text-slate-500">
            {loading && (
              <div className="flex items-center gap-1.5 text-indigo-600">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                <span>Syncing...</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
                  <span className="text-indigo-600">Autosaving...</span>
                </>
              ) : (
                <>
                  <Cloud className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-600">Saved (Cloud Sync)</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Swipe Swipe Help for Mobile Users */}
        <div className="block md:hidden bg-indigo-50 border-y-2 border-slate-950 py-2 px-3 text-center text-[10px] font-black uppercase tracking-widest text-indigo-950 animate-pulse select-none">
          ↔ Swipe left or right to scroll columns on mobile
        </div>

        {/* Responsive Scrolling Area */}
        <div className="overflow-x-auto overflow-y-auto max-h-[500px] relative bg-slate-100 p-1 md:p-3">
          <div 
            className="border-2 border-slate-200 rounded-lg bg-white overflow-hidden select-none"
            style={{ width: `${totalGridWidth}px` }}
          >
            
            {/* GOOGLE SHEET HEADER ROW */}
            <div className="flex bg-slate-800 border-b border-slate-700 text-[11px] font-bold text-slate-200 h-9 items-stretch">
              
              {/* Corner blank cell */}
              <div className="w-12 border-r border-b border-slate-700 bg-slate-900 flex items-center justify-center shrink-0">
                
              </div>

              {/* Col A Header */}
              <div 
                className={`border-r border-b border-slate-700 flex items-center justify-between px-2 relative shrink-0 transition-colors duration-150 ${
                  isColAActive ? 'bg-sky-700 text-white font-black' : 'bg-slate-800 text-slate-300'
                }`}
                style={{ width: `${colWidthA}px` }}
              >
                <span className="mx-auto text-xs uppercase tracking-wider">A</span>
                {/* Touch-friendly Drag resize handle */}
                <div 
                  className="absolute right-0 top-0 bottom-0 w-5 cursor-col-resize flex items-center justify-center group active:bg-sky-500/20 z-20"
                  onMouseDown={(e) => handleResizeStart(e, 'A')}
                  onTouchStart={(e) => handleResizeStart(e, 'A')}
                  title="Drag to resize column A"
                >
                  <div className={`w-[3px] h-5 rounded-full transition-colors ${isColAActive ? 'bg-white' : 'bg-slate-500 group-hover:bg-sky-400'}`} />
                </div>
              </div>

              {/* Col B Header */}
              <div 
                className={`border-r border-b border-slate-700 flex items-center justify-between px-2 relative shrink-0 transition-colors duration-150 ${
                  isColBActive ? 'bg-sky-700 text-white font-black' : 'bg-slate-800 text-slate-300'
                }`}
                style={{ width: `${colWidthB}px` }}
              >
                <span className="mx-auto text-xs uppercase tracking-wider">B</span>
                {/* Touch-friendly Drag resize handle */}
                <div 
                  className="absolute right-0 top-0 bottom-0 w-5 cursor-col-resize flex items-center justify-center group active:bg-sky-500/20 z-20"
                  onMouseDown={(e) => handleResizeStart(e, 'B')}
                  onTouchStart={(e) => handleResizeStart(e, 'B')}
                  title="Drag to resize column B"
                >
                  <div className={`w-[3px] h-5 rounded-full transition-colors ${isColBActive ? 'bg-white' : 'bg-slate-500 group-hover:bg-sky-400'}`} />
                </div>
              </div>

              {/* Col C Header */}
              <div 
                className={`border-r border-b border-slate-700 flex items-center justify-between px-2 relative shrink-0 transition-colors duration-150 ${
                  isColCActive ? 'bg-sky-700 text-white font-black' : 'bg-slate-800 text-slate-300'
                }`}
                style={{ width: `${colWidthC}px` }}
              >
                <span className="mx-auto text-xs uppercase tracking-wider">C</span>
                {/* Touch-friendly Drag resize handle */}
                <div 
                  className="absolute right-0 top-0 bottom-0 w-5 cursor-col-resize flex items-center justify-center group active:bg-sky-500/20 z-20"
                  onMouseDown={(e) => handleResizeStart(e, 'C')}
                  onTouchStart={(e) => handleResizeStart(e, 'C')}
                  title="Drag to resize column C"
                >
                  <div className={`w-[3px] h-5 rounded-full transition-colors ${isColCActive ? 'bg-white' : 'bg-slate-500 group-hover:bg-sky-400'}`} />
                </div>
              </div>

              {/* Actions Header column */}
              <div className="w-[60px] bg-slate-800 border-b border-slate-700 flex items-center justify-center text-[10px] uppercase font-black tracking-wider text-slate-400 shrink-0">
                Actions
              </div>

            </div>

            {/* CELLS GRID */}
            {!activeChannel ? (
              <div className="py-24 text-center text-xs font-black text-slate-400 uppercase tracking-widest p-6">
                Please register a channel to load spreadsheet ideas.
              </div>
            ) : (
              <div className="divide-y divide-slate-150">
                
                {/* STATIC ROW 1: S.No/Number, Titles, Short Detail */}
                <div className="flex bg-white items-stretch min-h-12 relative border-b border-slate-200">
                  {/* Row Index 1 */}
                  <div className="w-12 bg-slate-800 text-slate-400 border-r border-b border-slate-700 text-[11px] font-black flex items-center justify-center select-none shrink-0 h-full">
                    1
                  </div>
                  
                  {/* Column A Title */}
                  <div 
                    className="border-r border-slate-200 px-3 py-2.5 text-xs font-black text-slate-700 bg-slate-50 shrink-0 flex items-center whitespace-normal break-words leading-relaxed select-none"
                    style={{ width: `${colWidthA}px` }}
                  >
                    Number
                  </div>

                  {/* Column B Title */}
                  <div 
                    className="border-r border-slate-200 px-3 py-2.5 text-xs font-black text-slate-700 bg-slate-50 shrink-0 flex items-center whitespace-normal break-words leading-relaxed select-none"
                    style={{ width: `${colWidthB}px` }}
                  >
                    Titles
                  </div>

                  {/* Column C Title */}
                  <div 
                    className="border-r border-slate-200 px-3 py-2.5 text-xs font-black text-slate-700 bg-slate-50 shrink-0 flex items-center whitespace-normal break-words leading-relaxed select-none"
                    style={{ width: `${colWidthC}px` }}
                  >
                    Short Detail
                  </div>

                  {/* Empty actions cell for Row 1 */}
                  <div className="w-[60px] bg-slate-50 shrink-0 border-b border-slate-200" />
                </div>

                {/* USER DATA ROWS (Mapped dynamically starting visually from Row 2) */}
                {sheetRows.map((row, rIdx) => {
                  const isRowActive = selectedCell?.rowIndex === rIdx;
                  return (
                    <div key={row.tempId} className="flex hover:bg-slate-50/50 items-stretch min-h-12 relative border-b border-slate-150">
                      
                      {/* Row Counter (Google Sheets index offset by 2) */}
                      <div className={`w-12 text-[11px] font-black flex items-center justify-center select-none shrink-0 border-r border-slate-300 transition-colors duration-150 ${
                        isRowActive 
                          ? 'bg-sky-600 text-white border-r-2 border-sky-400 font-extrabold shadow-inner' 
                          : 'bg-slate-800 text-slate-400 border-b border-slate-700'
                      }`}>
                        {rIdx + 2}
                      </div>

                      {/* Cell A: Number */}
                      <div 
                        className={`border-r border-slate-150 relative flex items-center shrink-0 min-h-12 ${
                          selectedCell?.rowIndex === rIdx && selectedCell?.colKey === 'number'
                            ? 'bg-sky-50/40 ring-2 ring-inset ring-sky-500 z-10'
                            : ''
                        }`}
                        style={{ width: `${colWidthA}px` }}
                        onClick={() => {
                          setSelectedCell({ rowIndex: rIdx, colKey: 'number' });
                          setInlineEditingCell({ rowIndex: rIdx, colKey: 'number' });
                        }}
                      >
                        {inlineEditingCell?.rowIndex === rIdx && inlineEditingCell?.colKey === 'number' ? (
                          <input
                            type="text"
                            value={row.number}
                            autoFocus
                            className="absolute inset-0 w-full h-full border-none focus:outline-none focus:ring-0 bg-white text-xs font-black px-3 z-20"
                            onChange={(e) => {
                              const updated = [...sheetRows];
                              updated[rIdx].number = e.target.value;
                              setSheetRows(updated);
                            }}
                            onBlur={(e) => {
                              commitCellChange(rIdx, 'number', e.target.value);
                              setInlineEditingCell(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                commitCellChange(rIdx, 'number', (e.target as HTMLInputElement).value);
                                setInlineEditingCell(null);
                              }
                            }}
                          />
                        ) : (
                          <div className="text-xs font-black text-slate-900 px-3 py-2.5 whitespace-normal break-words leading-relaxed w-full select-none">
                            {row.number || ''}
                          </div>
                        )}

                        {/* Blue cell outline border like premium Google Sheets */}
                        {selectedCell?.rowIndex === rIdx && selectedCell?.colKey === 'number' && (
                          <div className="absolute inset-[-1px] border-2 border-sky-500 pointer-events-none z-10">
                            {/* Blue dot corner resize handle */}
                            <div className="absolute right-[-4px] bottom-[-4px] w-[8px] h-[8px] bg-sky-500 border border-white rounded-full z-20 shadow-sm" />
                          </div>
                        )}
                      </div>

                      {/* Cell B: Title */}
                      <div 
                        className={`border-r border-slate-150 relative flex items-center shrink-0 min-h-12 ${
                          selectedCell?.rowIndex === rIdx && selectedCell?.colKey === 'title'
                            ? 'bg-sky-50/40 ring-2 ring-inset ring-sky-500 z-10'
                            : ''
                        }`}
                        style={{ width: `${colWidthB}px` }}
                        onClick={() => {
                          setSelectedCell({ rowIndex: rIdx, colKey: 'title' });
                          setInlineEditingCell({ rowIndex: rIdx, colKey: 'title' });
                        }}
                      >
                        {inlineEditingCell?.rowIndex === rIdx && inlineEditingCell?.colKey === 'title' ? (
                          <textarea
                            value={row.title}
                            autoFocus
                            placeholder="Type idea title..."
                            className="absolute inset-0 w-full h-full border-none focus:outline-none focus:ring-0 bg-white text-xs font-black p-3 z-20 resize-none leading-relaxed"
                            onChange={(e) => {
                              const updated = [...sheetRows];
                              updated[rIdx].title = e.target.value;
                              setSheetRows(updated);
                            }}
                            onBlur={(e) => {
                              commitCellChange(rIdx, 'title', e.target.value);
                              setInlineEditingCell(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                commitCellChange(rIdx, 'title', (e.target as HTMLTextAreaElement).value);
                                setInlineEditingCell(null);
                              }
                            }}
                          />
                        ) : (
                          <div className="text-xs font-black text-slate-900 px-3 py-2.5 whitespace-normal break-words leading-relaxed w-full select-none">
                            {row.title || <span className="text-slate-350 italic font-semibold">Empty cell...</span>}
                          </div>
                        )}

                        {/* Blue cell outline border like premium Google Sheets */}
                        {selectedCell?.rowIndex === rIdx && selectedCell?.colKey === 'title' && (
                          <div className="absolute inset-[-1px] border-2 border-sky-500 pointer-events-none z-10">
                            {/* Blue dot corner resize handle */}
                            <div className="absolute right-[-4px] bottom-[-4px] w-[8px] h-[8px] bg-sky-500 border border-white rounded-full z-20 shadow-sm" />
                          </div>
                        )}
                      </div>

                      {/* Cell C: Description */}
                      <div 
                        className={`border-r border-slate-150 relative flex items-center shrink-0 min-h-12 ${
                          selectedCell?.rowIndex === rIdx && selectedCell?.colKey === 'shortDescription'
                            ? 'bg-sky-50/40 ring-2 ring-inset ring-sky-500 z-10'
                            : ''
                        }`}
                        style={{ width: `${colWidthC}px` }}
                        onClick={() => {
                          setSelectedCell({ rowIndex: rIdx, colKey: 'shortDescription' });
                          setInlineEditingCell({ rowIndex: rIdx, colKey: 'shortDescription' });
                        }}
                      >
                        {inlineEditingCell?.rowIndex === rIdx && inlineEditingCell?.colKey === 'shortDescription' ? (
                          <textarea
                            value={row.shortDescription}
                            autoFocus
                            placeholder="Type short descriptions..."
                            className="absolute inset-0 w-full h-full border-none focus:outline-none focus:ring-0 bg-white text-xs font-semibold p-3 z-20 resize-none leading-relaxed text-slate-700"
                            onChange={(e) => {
                              const updated = [...sheetRows];
                              updated[rIdx].shortDescription = e.target.value;
                              setSheetRows(updated);
                            }}
                            onBlur={(e) => {
                              commitCellChange(rIdx, 'shortDescription', e.target.value);
                              setInlineEditingCell(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                commitCellChange(rIdx, 'shortDescription', (e.target as HTMLTextAreaElement).value);
                                setInlineEditingCell(null);
                              }
                            }}
                          />
                        ) : (
                          <div className="text-xs font-semibold text-slate-500 px-3 py-2.5 whitespace-normal break-words leading-relaxed w-full select-none">
                            {row.shortDescription || <span className="text-slate-200 italic font-semibold">Empty cell...</span>}
                          </div>
                        )}

                        {/* Blue cell outline border like premium Google Sheets */}
                        {selectedCell?.rowIndex === rIdx && selectedCell?.colKey === 'shortDescription' && (
                          <div className="absolute inset-[-1px] border-2 border-sky-500 pointer-events-none z-10">
                            {/* Blue dot corner resize handle */}
                            <div className="absolute right-[-4px] bottom-[-4px] w-[8px] h-[8px] bg-sky-500 border border-white rounded-full z-20 shadow-sm" />
                          </div>
                        )}
                      </div>

                      {/* Row Delete Button */}
                      <div className="w-[60px] bg-slate-50 flex items-center justify-center border-b border-slate-150 shrink-0">
                        <button
                          onClick={() => handleDeleteRow(rIdx)}
                          className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-md transition-all cursor-pointer"
                          title="Delete Row Idea"
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}

          </div>
        </div>

      </div>

      {/* --- FORMULA BAR AT THE BOTTOM (EXCELLENT FOR MOBILE USERS!) --- */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-slate-950 p-3 shadow-[0_-4px_10px_rgba(0,0,0,0.15)] z-40 animate-in slide-in-from-bottom duration-200">
        <div className="max-w-7xl mx-auto flex items-center gap-2">
          
          {/* Formula symbol */}
          <div className="px-2.5 py-1 bg-slate-100 border-2 border-slate-950 rounded-lg text-slate-500 font-serif font-black italic text-sm select-none">
            fx
          </div>

          {/* Target Cell Label */}
          <div className="px-2.5 py-1 bg-indigo-50 border-2 border-indigo-950 rounded-lg text-indigo-950 font-black text-xs select-none shrink-0 min-w-[45px] text-center">
            {selectedCell 
              ? `${selectedCell.colKey === 'number' ? 'A' : selectedCell.colKey === 'title' ? 'B' : 'C'}${selectedCell.rowIndex + 2}`
              : 'None'
            }
          </div>

          {/* Formula Bar Input */}
          <div className="flex-1 relative">
            <input
              ref={formulaInputRef}
              type="text"
              disabled={!selectedCell}
              placeholder={selectedCell ? "Type cell content (changes are saved automatically!)..." : "Select any grid cell above to write/edit details easily here..."}
              value={formulaValue}
              onChange={(e) => {
                setFormulaValue(e.target.value);
                if (selectedCell) {
                  // Instant preview updates in local state
                  const updated = [...sheetRows];
                  updated[selectedCell.rowIndex] = {
                    ...updated[selectedCell.rowIndex],
                    [selectedCell.colKey]: e.target.value
                  };
                  setSheetRows(updated);
                }
              }}
              onBlur={() => {
                if (selectedCell) {
                  commitCellChange(selectedCell.rowIndex, selectedCell.colKey, formulaValue);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleFormulaCommit();
                } else if (e.key === 'Escape') {
                  handleFormulaCancel();
                }
              }}
              className={`w-full px-3 py-2 border-2 border-slate-950 rounded-xl text-xs font-black text-slate-900 focus:outline-none focus:ring-0 bg-white ${
                !selectedCell ? 'bg-slate-50 cursor-not-allowed opacity-60' : ''
              }`}
            />
          </div>

          {/* Commit Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleFormulaCommit}
              disabled={!selectedCell}
              className={`p-2 bg-emerald-500 hover:bg-emerald-600 border-2 border-slate-950 text-white rounded-xl transition-all cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed`}
              title="Save changes (Enter)"
            >
              <Check className="w-4 h-4 stroke-[3px]" />
            </button>
            <button
              onClick={handleFormulaCancel}
              disabled={!selectedCell}
              className={`p-2 bg-slate-100 hover:bg-slate-200 border-2 border-slate-950 text-slate-700 rounded-xl transition-all cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed`}
              title="Cancel (Esc)"
            >
              <X className="w-4 h-4 stroke-[3px]" />
            </button>
          </div>

        </div>
      </div>

    </div>
  );
}
