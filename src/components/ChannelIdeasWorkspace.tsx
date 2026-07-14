import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Lightbulb, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  Sparkles,
  ArrowLeft,
  Calendar
} from 'lucide-react';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  query, 
  where 
} from 'firebase/firestore';
import { db } from '../firebase';
import { YouTubeChannel, ChannelIdea } from '../types';

interface ChannelIdeasWorkspaceProps {
  activeChannel: YouTubeChannel | null;
  triggerToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export default function ChannelIdeasWorkspace({
  activeChannel,
  triggerToast
}: ChannelIdeasWorkspaceProps) {
  const [ideas, setIdeas] = useState<ChannelIdea[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states for NEW idea
  const [newNumber, setNewNumber] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');

  // Row editing states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNumber, setEditNumber] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');

  // Fetch ideas for active channel
  useEffect(() => {
    if (!activeChannel?.id) {
      setIdeas([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, 'ideas'),
      where('channelId', '==', activeChannel.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: ChannelIdea[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as ChannelIdea);
      });
      
      // Sort list by number (converted to float if possible) or creation order
      list.sort((a, b) => {
        const numA = parseFloat(a.number) || 0;
        const numB = parseFloat(b.number) || 0;
        if (numA !== numB) return numA - numB;
        return a.createdAt.localeCompare(b.createdAt);
      });

      setIdeas(list);
      setLoading(false);
    }, (error) => {
      console.error("Error loading ideas:", error);
      triggerToast("Failed to load ideas", "error");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [activeChannel?.id]);

  // Handle adding a new idea
  const handleAddIdea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChannel) return;
    if (!newTitle.trim()) {
      triggerToast("Please enter an Idea Title!", "error");
      return;
    }

    const ideaId = `idea-${Date.now()}`;
    const newIdea: ChannelIdea = {
      id: ideaId,
      channelId: activeChannel.id,
      number: newNumber.trim() || String(ideas.length + 1),
      title: newTitle.trim(),
      shortDescription: newDesc.trim(),
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'ideas', ideaId), newIdea);
      setNewNumber('');
      setNewTitle('');
      setNewDesc('');
      triggerToast("Idea added successfully!", "success");
    } catch (err) {
      console.error(err);
      triggerToast("Failed to add idea", "error");
    }
  };

  // Start editing a row
  const startEditing = (idea: ChannelIdea) => {
    setEditingId(idea.id);
    setEditNumber(idea.number);
    setEditTitle(idea.title);
    setEditDesc(idea.shortDescription);
  };

  // Save edited row
  const handleSaveEdit = async (id: string) => {
    if (!editTitle.trim()) {
      triggerToast("Title cannot be empty!", "error");
      return;
    }

    try {
      const ref = doc(db, 'ideas', id);
      const original = ideas.find(i => i.id === id);
      if (!original) return;

      const updatedIdea: ChannelIdea = {
        ...original,
        number: editNumber.trim() || original.number,
        title: editTitle.trim(),
        shortDescription: editDesc.trim()
      };

      await setDoc(ref, updatedIdea);
      setEditingId(null);
      triggerToast("Idea updated successfully!", "success");
    } catch (err) {
      console.error(err);
      triggerToast("Failed to update idea", "error");
    }
  };

  // Delete an idea
  const handleDeleteIdea = async (id: string, title: string) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete idea: "${title}"?`);
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, 'ideas', id));
      triggerToast("Idea deleted successfully!", "success");
    } catch (err) {
      console.error(err);
      triggerToast("Failed to delete idea", "error");
    }
  };

  const handleBackToDashboard = () => {
    // Navigate back to the dashboard by removing the 'view' query parameter
    window.location.search = '';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">
      
      {/* --- WORKSPACE HEADER CARD --- */}
      <div className="bg-white border-2 border-slate-950 rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-yellow-100 border-2 border-slate-950 rounded-2xl flex items-center justify-center text-yellow-600 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <Lightbulb className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center flex-wrap gap-2.5">
              <h2 className="text-xl md:text-2xl font-black text-slate-950 uppercase tracking-tight">
                Channel Ideas Workspace
              </h2>
              {activeChannel && (
                <div 
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border-2 border-slate-950 shadow-sm"
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
            <p className="text-xs text-slate-500 font-semibold mt-1">
              Brainstorm and document your upcoming video concepts in a spacious, dedicated list view.
            </p>
          </div>
        </div>

        {/* Action Button: Return to Dashboard */}
        <button
          onClick={handleBackToDashboard}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border-2 border-slate-950 text-slate-950 rounded-xl font-black text-xs transition-all cursor-pointer active:scale-95 select-none shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" />
          <span>Go back to Scheduler</span>
        </button>
      </div>

      {/* --- ADD NEW IDEA (SINGLE ROW / LINE FORM) --- */}
      <div className="bg-white border-2 border-slate-950 rounded-2xl p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="w-4.5 h-4.5 text-indigo-600" />
          <span className="text-xs font-black uppercase tracking-wider text-slate-750">Add New Idea Concept</span>
        </div>
        
        <form onSubmit={handleAddIdea} className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4 w-full">
          {/* Number Input */}
          <div className="flex flex-col gap-1.5 lg:w-24 shrink-0">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Number</span>
            <input
              type="text"
              placeholder="e.g. 1"
              value={newNumber}
              onChange={(e) => setNewNumber(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-950 rounded-xl text-xs font-black focus:outline-none focus:bg-white text-slate-950"
            />
          </div>

          {/* Title Input */}
          <div className="flex flex-col gap-1.5 lg:w-80 shrink-0">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Idea Title</span>
            <input
              type="text"
              placeholder="e.g. iPhone 17 First Look & Rumors"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-950 rounded-xl text-xs font-black focus:outline-none focus:bg-white text-slate-950"
            />
          </div>

          {/* Short Description Input */}
          <div className="flex flex-col gap-1.5 flex-1">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Short Description</span>
            <input
              type="text"
              placeholder="e.g. Discuss mockups, leaked cameras, chipsets, and price estimate..."
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-950 rounded-xl text-xs font-bold focus:outline-none focus:bg-white text-slate-950"
            />
          </div>

          {/* Add Button */}
          <button
            type="submit"
            className="px-6 py-3 bg-slate-950 hover:bg-slate-900 text-white rounded-xl text-xs font-black transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 border-2 border-slate-950 shrink-0 self-stretch lg:self-end shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] lg:mt-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Idea Concept</span>
          </button>
        </form>
      </div>

      {/* --- IDEAS LIST WORKSPACE --- */}
      <div className="bg-white border-2 border-slate-950 rounded-2xl overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <div className="px-6 py-4 bg-slate-50 border-b-2 border-slate-950 flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider text-slate-800">Saved Channel Concepts</span>
          <span className="text-[10px] font-black text-indigo-900 uppercase bg-indigo-50 px-3 py-1 rounded-full border-2 border-indigo-200">
            Total Concepts: {ideas.length}
          </span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-xs font-bold text-slate-500">Loading channel ideas...</div>
        ) : !activeChannel ? (
          <div className="py-16 text-center text-xs font-bold text-slate-500">Please select or register a channel from the top header selector to brainstorm ideas.</div>
        ) : ideas.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center bg-white p-6">
            <div className="w-12 h-12 bg-yellow-50 border-2 border-dashed border-yellow-300 rounded-full flex items-center justify-center text-yellow-500 mb-3">
              <Lightbulb className="w-6 h-6 animate-pulse" />
            </div>
            <p className="text-xs font-black text-slate-600 uppercase tracking-wider">No Ideas Saved for {activeChannel.name}</p>
            <p className="text-[11px] text-slate-500 mt-1.5 text-center font-semibold max-w-md leading-relaxed">
              Use the simple single-row form above to add your very first video concept. Ideas are automatically separated for each of your channels.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              
              {/* Table Headers */}
              <div className="flex items-center bg-slate-50 border-b-2 border-slate-950 text-[10px] font-black uppercase tracking-wider text-slate-500 px-6 py-3.5">
                <div className="w-20 shrink-0">Number</div>
                <div className="w-72 shrink-0">Idea Title</div>
                <div className="flex-1 min-w-0">Short Description</div>
                <div className="w-28 shrink-0 text-right">Actions</div>
              </div>

              {/* Table Body rows */}
              <div className="divide-y-2 divide-slate-150">
                {ideas.map((idea) => {
                  const isEditing = editingId === idea.id;

                  if (isEditing) {
                    return (
                      <div 
                        key={idea.id} 
                        className="flex items-center gap-4 px-6 py-3.5 bg-indigo-50/50"
                      >
                        {/* Number Input */}
                        <div className="w-20 shrink-0">
                          <input
                            type="text"
                            value={editNumber}
                            onChange={(e) => setEditNumber(e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border-2 border-slate-950 rounded-lg text-xs font-black"
                            placeholder="No."
                          />
                        </div>

                        {/* Title Input */}
                        <div className="w-72 shrink-0">
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border-2 border-slate-950 rounded-lg text-xs font-black"
                            placeholder="Title"
                          />
                        </div>

                        {/* Description Input */}
                        <div className="flex-1 min-w-0">
                          <input
                            type="text"
                            value={editDesc}
                            onChange={(e) => setEditDesc(e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border-2 border-slate-950 rounded-lg text-xs font-bold"
                            placeholder="Description"
                          />
                        </div>

                        {/* Actions */}
                        <div className="w-28 shrink-0 flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleSaveEdit(idea.id)}
                            className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg border-2 border-slate-950 cursor-pointer transition-all active:scale-90 flex items-center justify-center shadow-sm"
                            title="Save Idea"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg border-2 border-slate-950 cursor-pointer transition-all active:scale-90 flex items-center justify-center shadow-sm"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div 
                      key={idea.id} 
                      className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 transition-all"
                    >
                      {/* Number Badge */}
                      <div className="w-20 shrink-0">
                        <span className="text-xs font-black bg-slate-100 border-2 border-slate-950 text-slate-950 px-2.5 py-1 rounded-lg min-w-[36px] inline-block text-center shadow-sm">
                          {idea.number}
                        </span>
                      </div>

                      {/* Title */}
                      <div className="w-72 shrink-0 pr-2">
                        <span className="text-xs font-black text-slate-900 truncate block">
                          {idea.title}
                        </span>
                      </div>

                      {/* Short Description */}
                      <div className="flex-1 min-w-0 pr-4">
                        <span className="text-xs text-slate-600 font-semibold truncate block">
                          {idea.shortDescription || 'No description provided.'}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="w-28 shrink-0 flex items-center justify-end gap-2">
                        <button
                          onClick={() => startEditing(idea)}
                          className="p-2 hover:bg-indigo-50 border-2 border-transparent hover:border-slate-950 text-slate-500 hover:text-indigo-600 rounded-xl cursor-pointer transition-all active:scale-90 flex items-center justify-center"
                          title="Edit concept"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteIdea(idea.id, idea.title)}
                          className="p-2 hover:bg-rose-50 border-2 border-transparent hover:border-slate-950 text-slate-400 hover:text-rose-600 rounded-xl cursor-pointer transition-all active:scale-90 flex items-center justify-center"
                          title="Delete concept"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          </div>
        )}
      </div>

    </div>
  );
}
