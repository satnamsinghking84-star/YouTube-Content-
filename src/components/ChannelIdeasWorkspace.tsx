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
  HelpCircle,
  FileSpreadsheet,
  Link2,
  RefreshCw,
  LogOut,
  Globe,
  Database
} from 'lucide-react';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  getDoc,
  deleteDoc, 
  query, 
  where,
  writeBatch
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut, User } from 'firebase/auth';
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
      if (!cached) return [];
      const parsed = JSON.parse(cached) as ChannelIdea[];
      parsed.sort((a, b) => {
        const compA = a.isCompleted ? 1 : 0;
        const compB = b.isCompleted ? 1 : 0;
        if (compA !== compB) return compA - compB;
        const numA = parseFloat(a.number) || 0;
        const numB = parseFloat(b.number) || 0;
        if (numA !== numB) return numA - numB;
        return (a.createdAt || '').localeCompare(b.createdAt || '');
      });
      return parsed;
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
    isCompleted?: boolean;
  }>>([]);

  // Value in the Formula Bar at the bottom
  const [formulaValue, setFormulaValue] = useState('');
  const formulaInputRef = useRef<HTMLInputElement>(null);
 
  // --- Google Sheets Integration States ---
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);
  const [googleSheetUrl, setGoogleSheetUrl] = useState('https://docs.google.com/spreadsheets/d/1dNtaSrKM7ymzolqw5paZuKlQ4CKGxRuMqK-3M8VN8Lw/edit?usp=drivesdk');
  const [isUrlEditing, setIsUrlEditing] = useState(false);
  const [tempUrlInput, setTempUrlInput] = useState('');
  const [sheetSyncing, setSheetSyncing] = useState(false);

  // --- Custom Confirmation Modal States ---
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Listen to Firebase Auth state for Google account connection
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (usr) => {
      setGoogleUser(usr);
    });
    return () => unsubscribe();
  }, []);

  // Fetch sheet URL config from Firestore if it exists
  useEffect(() => {
    if (!activeChannel?.id) return;
    
    const loadSheetConfig = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'channel_sheets', activeChannel.id));
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.url) {
            setGoogleSheetUrl(data.url);
          }
        } else {
          setGoogleSheetUrl('https://docs.google.com/spreadsheets/d/1dNtaSrKM7ymzolqw5paZuKlQ4CKGxRuMqK-3M8VN8Lw/edit?usp=drivesdk');
        }
      } catch (err: any) {
        // Log as a warning rather than a fatal error to handle transient connection delays gracefully
        console.warn("Could not load Google Sheet URL config from Firestore (falling back to default):", err);
      }
    };
    
    loadSheetConfig();
  }, [activeChannel?.id]);

  const handleConnectGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/spreadsheets');
    provider.addScope('https://www.googleapis.com/auth/userinfo.email');
    provider.addScope('https://www.googleapis.com/auth/userinfo.profile');
    
    try {
      setSheetSyncing(true);
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setGoogleAccessToken(credential.accessToken);
        setGoogleUser(result.user);
        triggerToast("Google Sheets connected successfully!", "success");
      } else {
        triggerToast("Connected, but could not retrieve access token.", "error");
      }
    } catch (err: any) {
      console.error("Google Auth failed:", err);
      if (err.code === 'auth/popup-closed-by-user' || String(err.message).includes('popup-closed-by-user')) {
        triggerToast("Login window closed. Please try again!", "error");
      } else if (err.code === 'auth/unauthorized-domain' || String(err.message).includes('unauthorized-domain')) {
        triggerToast("This domain is unauthorized. Please verify your OAuth setup.", "error");
      } else {
        triggerToast(`Connection failed: ${err.message}`, "error");
      }
    } finally {
      setSheetSyncing(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    try {
      await signOut(auth);
      setGoogleAccessToken(null);
      setGoogleUser(null);
      triggerToast("Disconnected from Google Sheets", "info");
    } catch (err: any) {
      console.error("Disconnect failed:", err);
      triggerToast("Disconnect failed", "error");
    }
  };

  const getSpreadsheetId = (url: string): string | null => {
    if (!url) return null;
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
  };

  const getFirstSheetName = async (spreadsheetId: string, token: string): Promise<string> => {
    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'Failed to fetch spreadsheet metadata');
    }
    const data = await response.json();
    if (data.sheets && data.sheets.length > 0) {
      return data.sheets[0].properties.title || 'Sheet1';
    }
    return 'Sheet1';
  };

  const handlePullFromSheet = async () => {
    if (!googleAccessToken) {
      triggerToast("Please authenticate/reconnect Google Sheets first!", "error");
      return;
    }
    const spreadsheetId = getSpreadsheetId(googleSheetUrl);
    if (!spreadsheetId) {
      triggerToast("Invalid Google Sheets URL format!", "error");
      return;
    }

    setSheetSyncing(true);
    try {
      const sheetName = await getFirstSheetName(spreadsheetId, googleAccessToken);
      // Fetch a wider range (columns A to Z, up to 1000 rows) to capture any custom sheet layouts
      const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A1:Z1000`, {
        headers: { 'Authorization': `Bearer ${googleAccessToken}` }
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || 'Failed to fetch sheet values');
      }
      const data = await response.json();
      const values: string[][] = data.values || [];
      if (values.length === 0) {
        triggerToast("No data found in the Google Sheet!", "info");
        setSheetSyncing(false);
        return;
      }
      
      // --- Smart Column Auto-Detection Engine ---
      let startIndex = 0;
      let titleColIndex = -1;
      let descColIndex = -1;
      let noColIndex = -1;
      let statusColIndex = -1;

      const firstRow = values[0];
      
      // Detect if first row is a header row
      const firstRowIsHeader = firstRow.some((cell) => {
        const lower = String(cell).toLowerCase().trim();
        return lower.includes('s.no') || lower.includes('serial') || lower.includes('title') || 
               lower.includes('description') || lower.includes('status') || lower.includes('completed') ||
               lower.includes('idea') || lower.includes('topic') || lower.includes('no');
      });

      if (firstRowIsHeader) {
        startIndex = 1;
        // Search headers for matching names
        firstRow.forEach((cell, idx) => {
          const lower = String(cell).toLowerCase().trim();
          if (lower.includes('title') || lower.includes('idea') || lower.includes('name') || lower.includes('topic') || lower === 'title' || lower === 'ideas') {
            if (titleColIndex === -1) titleColIndex = idx;
          } else if (lower.includes('desc') || lower.includes('detail') || lower.includes('about') || lower.includes('summary')) {
            if (descColIndex === -1) descColIndex = idx;
          } else if (lower.includes('status') || lower.includes('completed') || lower.includes('complete') || lower.includes('done')) {
            if (statusColIndex === -1) statusColIndex = idx;
          } else if (lower.includes('s.no') || lower.includes('serial') || lower.includes('number') || lower.includes('no') || lower === 'id') {
            if (noColIndex === -1) noColIndex = idx;
          }
        });
      }

      // Find the first row with actual data to assess columns
      const firstRowWithData = values[startIndex] || [];
      const colCount = firstRowWithData.length;

      // Heuristic fallback if Title Column index is not explicitly found by header
      if (titleColIndex === -1) {
        if (colCount === 1) {
          titleColIndex = 0;
        } else if (colCount === 2) {
          // Check if first column looks like a serial/ID
          const firstVal = String(firstRowWithData[0]).trim();
          const isFirstColNumeric = /^\d+$/.test(firstVal) || firstVal.toLowerCase() === 's.no' || firstVal.toLowerCase() === 'no';
          if (isFirstColNumeric) {
            noColIndex = 0;
            titleColIndex = 1;
          } else {
            titleColIndex = 0;
            descColIndex = 1;
          }
        } else {
          // 3 or more columns
          const firstVal = String(firstRowWithData[0]).trim();
          const isFirstColNumeric = /^\d+$/.test(firstVal) || firstVal.toLowerCase() === 's.no' || firstVal.toLowerCase() === 'no';
          if (isFirstColNumeric) {
            noColIndex = 0;
            titleColIndex = 1;
            descColIndex = colCount > 2 ? 2 : -1;
            statusColIndex = colCount > 3 ? 3 : -1;
          } else {
            titleColIndex = 0;
            descColIndex = 1;
            statusColIndex = colCount > 2 ? 2 : -1;
          }
        }
      }

      // Assign remaining unmapped columns dynamically to maximize data recovery
      if (descColIndex === -1 && colCount > titleColIndex + 1) {
        descColIndex = titleColIndex + 1;
      }
      if (statusColIndex === -1 && colCount > Math.max(titleColIndex, descColIndex) + 1) {
        statusColIndex = Math.max(titleColIndex, descColIndex) + 1;
      }

      // Ensure titleColIndex is valid and within range
      if (titleColIndex === -1 || titleColIndex >= colCount) {
        // Fallback to first available column
        titleColIndex = 0;
      }

      const importedIdeas: Omit<ChannelIdea, 'id'>[] = [];
      for (let i = startIndex; i < values.length; i++) {
        const row = values[i];
        if (!row || row.length === 0) continue;
        
        // Extract cells based on detected column indices
        const title = row[titleColIndex] ? String(row[titleColIndex]).trim() : '';
        const number = (noColIndex !== -1 && row[noColIndex]) 
          ? String(row[noColIndex]).trim() 
          : String(i + 1 - startIndex);
        const shortDescription = (descColIndex !== -1 && row[descColIndex]) 
          ? String(row[descColIndex]).trim() 
          : '';
        const statusStr = (statusColIndex !== -1 && row[statusColIndex]) 
          ? String(row[statusColIndex]).trim().toLowerCase() 
          : '';
        const isCompleted = statusStr === 'completed' || statusStr === 'done' || statusStr === 'yes' || statusStr === 'true';

        if (title) {
          importedIdeas.push({
            channelId: activeChannel!.id,
            number,
            title,
            shortDescription,
            isCompleted,
            createdAt: new Date().toISOString()
          });
        }
      }

      if (importedIdeas.length === 0) {
        triggerToast("No valid rows with 'Title' found in Google Sheet!", "info");
        setSheetSyncing(false);
        return;
      }

      setSheetSyncing(false);

      // Show modern confirmation dialog
      setConfirmModal({
        isOpen: true,
        title: "Pull Data from Sheet",
        message: `Found ${importedIdeas.length} ideas in Google Sheet (mapped title from column ${String.fromCharCode(65 + titleColIndex)}). This will overwrite your current ideas list for "${activeChannel?.name}" in this workspace. Are you sure you want to continue?`,
        onConfirm: async () => {
          setSheetSyncing(true);
          try {
            const batch = writeBatch(db);
            // 1. Delete existing ideas for active channel
            const currentActiveIdeas = ideas.filter(i => i.channelId === activeChannel!.id);
            currentActiveIdeas.forEach(i => {
              batch.delete(doc(db, 'ideas', i.id));
            });

            // 2. Add imported ideas
            importedIdeas.forEach((imp, index) => {
              const newId = `idea-${Date.now()}-${index}-${Math.floor(Math.random() * 100)}`;
              batch.set(doc(db, 'ideas', newId), {
                id: newId,
                ...imp
              });
            });

            await batch.commit();
            triggerToast(`Successfully pulled and synced ${importedIdeas.length} ideas from Google Sheet!`, "success");
          } catch (e: any) {
            console.error("Save pull data failed:", e);
            triggerToast(`Failed to save: ${e.message}`, "error");
          } finally {
            setSheetSyncing(false);
          }
        }
      });

    } catch (err: any) {
      console.error("Google Sheets Pull error:", err);
      triggerToast(`Pull failed: ${err.message}`, "error");
      setSheetSyncing(false);
    }
  };

  const handlePushToSheet = async () => {
    if (!googleAccessToken) {
      triggerToast("Please authenticate/reconnect Google Sheets first!", "error");
      return;
    }
    const spreadsheetId = getSpreadsheetId(googleSheetUrl);
    if (!spreadsheetId) {
      triggerToast("Invalid Google Sheets URL format!", "error");
      return;
    }

    const currentActiveIdeas = ideas.filter(i => i.channelId === activeChannel!.id);
    if (currentActiveIdeas.length === 0) {
      triggerToast("No ideas to sync to Google Sheets!", "info");
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: "Push Data to Sheet",
      message: `This will export your current ${currentActiveIdeas.length} ideas and completely overwrite the values on your connected Google Sheet. Are you sure you want to continue?`,
      onConfirm: async () => {
        setSheetSyncing(true);
        try {
          const sheetName = await getFirstSheetName(spreadsheetId, googleAccessToken);
          
          // Clear previous content
          const clearRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A1:D200:clear`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${googleAccessToken}`,
              'Content-Type': 'application/json'
            }
          });
          if (!clearRes.ok) {
            const err = await clearRes.json();
            throw new Error(err.error?.message || 'Failed to clear existing sheet data.');
          }

          // Format data
          const header = ["S.No", "Idea Title", "Short Description", "Status"];
          const rows = currentActiveIdeas.map((idea, index) => [
            idea.number || String(index + 1),
            idea.title || '',
            idea.shortDescription || '',
            idea.isCompleted ? 'Completed' : 'Pending'
          ]);
          const values = [header, ...rows];

          // Update values
          const updateRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A1:D${values.length}?valueInputOption=USER_ENTERED`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${googleAccessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              range: `${sheetName}!A1:D${values.length}`,
              majorDimension: 'ROWS',
              values
            })
          });

          if (!updateRes.ok) {
            const err = await updateRes.json();
            throw new Error(err.error?.message || 'Failed to update sheet values.');
          }

          triggerToast("Successfully pushed and synchronized all ideas to your Google Sheet!", "success");
        } catch (err: any) {
          console.error("Google Sheets Push error:", err);
          triggerToast(`Push failed: ${err.message}`, "error");
        } finally {
          setSheetSyncing(false);
        }
      }
    });
  };

  const handleSaveSheetUrl = async () => {
    if (!activeChannel?.id) return;
    try {
      await setDoc(doc(db, 'channel_sheets', activeChannel.id), {
        url: tempUrlInput.trim(),
        updatedAt: new Date().toISOString()
      }, { merge: true });
      setGoogleSheetUrl(tempUrlInput.trim());
      setIsUrlEditing(false);
      triggerToast("Google Sheet URL updated successfully!", "success");
    } catch (err: any) {
      console.error(err);
      triggerToast("Failed to save sheet URL", "error");
    }
  };

  const silentPushToGoogleSheet = async (latestIdeas: ChannelIdea[]) => {
    if (!googleAccessToken || !googleSheetUrl) return;
    const spreadsheetId = getSpreadsheetId(googleSheetUrl);
    if (!spreadsheetId) return;

    try {
      const sheetName = await getFirstSheetName(spreadsheetId, googleAccessToken);
      
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A1:D150:clear`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${googleAccessToken}`,
          'Content-Type': 'application/json'
        }
      });

      const header = ["S.No", "Idea Title", "Short Description", "Status"];
      const rows = latestIdeas.map((idea, index) => [
        idea.number || String(index + 1),
        idea.title || '',
        idea.shortDescription || '',
        idea.isCompleted ? 'Completed' : 'Pending'
      ]);
      const values = [header, ...rows];

      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A1:D${values.length}?valueInputOption=USER_ENTERED`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${googleAccessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          range: `${sheetName}!A1:D${values.length}`,
          majorDimension: 'ROWS',
          values
        })
      });
    } catch (err) {
      console.error("Background auto-sync to Google Sheet failed:", err);
    }
  };

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
        const parsed = JSON.parse(cached) as ChannelIdea[];
        parsed.sort((a, b) => {
          const compA = a.isCompleted ? 1 : 0;
          const compB = b.isCompleted ? 1 : 0;
          if (compA !== compB) return compA - compB;
          const numA = parseFloat(a.number) || 0;
          const numB = parseFloat(b.number) || 0;
          if (numA !== numB) return numA - numB;
          return (a.createdAt || '').localeCompare(b.createdAt || '');
        });
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
      
      // Sort ideas: incomplete (pending) ones first, then completed ones
      list.sort((a, b) => {
        const compA = a.isCompleted ? 1 : 0;
        const compB = b.isCompleted ? 1 : 0;
        if (compA !== compB) return compA - compB;
        
        const numA = parseFloat(a.number) || 0;
        const numB = parseFloat(b.number) || 0;
        if (numA !== numB) return numA - numB;
        return (a.createdAt || '').localeCompare(b.createdAt || '');
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
      shortDescription: idea.shortDescription || '',
      isCompleted: !!idea.isCompleted
    }));

    // Ensure we have at least 15 rows for that premium Google Sheets feeling
    const defaultLength = Math.max(15, rows.length + 5);
    while (rows.length < defaultLength) {
      const idx = rows.length;
      rows.push({
        tempId: `row-blank-${idx}-${Date.now()}`,
        number: String(idx + 1),
        title: '',
        shortDescription: '',
        isCompleted: false
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
            isCompleted: !!targetRow.isCompleted,
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
            isCompleted: !!targetRow.isCompleted,
            createdAt: new Date().toISOString()
          });
          
          updatedRows[rowIndex].id = newIdeaId;
          setSheetRows(updatedRows);
        }
      }

      // Trigger background push if Google Sheets is connected
      if (googleAccessToken && googleSheetUrl) {
        let nextIdeas = [...ideas];
        if (targetRow.id) {
          if (isRowTotallyEmpty) {
            nextIdeas = nextIdeas.filter(i => i.id !== targetRow.id);
          } else {
            nextIdeas = nextIdeas.map(i => i.id === targetRow.id ? {
              ...i,
              number: finalNumber || i.number,
              title: finalTitle,
              shortDescription: finalDesc
            } : i);
          }
        } else if (!isRowTotallyEmpty) {
          const tempNewIdea: ChannelIdea = {
            id: `idea-temp`,
            channelId: activeChannel.id,
            number: finalNumber || String(rowIndex + 1),
            title: finalTitle,
            shortDescription: finalDesc,
            isCompleted: !!targetRow.isCompleted,
            createdAt: new Date().toISOString()
          };
          nextIdeas = [...nextIdeas, tempNewIdea];
        }
        silentPushToGoogleSheet(nextIdeas.filter(i => i.channelId === activeChannel.id));
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

    setConfirmModal({
      isOpen: true,
      title: "Clear Spreadsheet",
      message: "Are you sure you want to delete all spreadsheet entries for this channel? This cannot be undone.",
      onConfirm: async () => {
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
      }
    });
  };

  // Delete specified row
  const handleDeleteRow = async (rowIndex: number) => {
    const row = sheetRows[rowIndex];
    if (!row) return;

    if (row.id) {
      setConfirmModal({
        isOpen: true,
        title: "Delete Row Idea",
        message: `Are you sure you want to delete row ${row.number}: "${row.title || 'Untitled'}"?`,
        onConfirm: async () => {
          setIsSaving(true);
          try {
            await deleteDoc(doc(db, 'ideas', row.id));
            if (selectedCell?.rowIndex === rowIndex) {
              setSelectedCell(null);
              setInlineEditingCell(null);
            }
            triggerToast(`Row deleted`, "success");

            // Trigger background push if Google Sheets is connected
            if (googleAccessToken && googleSheetUrl) {
              const nextIdeas = ideas.filter(i => i.id !== row.id);
              silentPushToGoogleSheet(nextIdeas.filter(i => i.channelId === activeChannel!.id));
            }
          } catch (err) {
            console.error(err);
            triggerToast("Failed to delete row", "error");
          } finally {
            setIsSaving(false);
          }
        }
      });
    } else {
      const updated = [...sheetRows];
      updated.splice(rowIndex, 1);
      setSheetRows(updated);
      triggerToast("Removed row", "info");
    }
  };

  // Toggle rows completed/pending status
  const toggleRowCompleted = async (rowIndex: number) => {
    if (!activeChannel) return;
    const targetRow = sheetRows[rowIndex];
    if (!targetRow) return;

    const newCompleted = !targetRow.isCompleted;

    // Local update first
    const updatedRows = [...sheetRows];
    updatedRows[rowIndex] = {
      ...targetRow,
      isCompleted: newCompleted
    };
    setSheetRows(updatedRows);

    setIsSaving(true);
    try {
      let nextIdeas = [...ideas];
      if (targetRow.id) {
        // Update existing document in Firestore
        await setDoc(doc(db, 'ideas', targetRow.id), {
          isCompleted: newCompleted
        }, { merge: true });
        triggerToast(newCompleted ? "Marked idea as completed" : "Marked idea as pending", "success");
        nextIdeas = ideas.map(i => i.id === targetRow.id ? { ...i, isCompleted: newCompleted } : i);
      } else {
        // If it's a blank row, save only if it has some entered content
        const finalNumber = (targetRow.number || '').trim();
        const finalTitle = (targetRow.title || '').trim();
        const finalDesc = (targetRow.shortDescription || '').trim();
        const hasContent = finalTitle || finalDesc;

        if (hasContent) {
          const newIdeaId = `idea-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          await setDoc(doc(db, 'ideas', newIdeaId), {
            id: newIdeaId,
            channelId: activeChannel.id,
            number: finalNumber || String(rowIndex + 1),
            title: finalTitle,
            shortDescription: finalDesc,
            isCompleted: newCompleted,
            createdAt: new Date().toISOString()
          });
          
          updatedRows[rowIndex].id = newIdeaId;
          setSheetRows(updatedRows);
          triggerToast(newCompleted ? "Marked idea as completed" : "Marked idea as pending", "success");
          
          const tempNewIdea: ChannelIdea = {
            id: newIdeaId,
            channelId: activeChannel.id,
            number: finalNumber || String(rowIndex + 1),
            title: finalTitle,
            shortDescription: finalDesc,
            isCompleted: newCompleted,
            createdAt: new Date().toISOString()
          };
          nextIdeas = [...nextIdeas, tempNewIdea];
        } else {
          // Empty row local-only toggle
          triggerToast("Fill details first to save completion status!", "info");
          return;
        }
      }

      // Trigger background push if Google Sheets is connected
      if (googleAccessToken && googleSheetUrl) {
        silentPushToGoogleSheet(nextIdeas.filter(i => i.channelId === activeChannel.id));
      }
    } catch (err) {
      console.error("Failed to toggle completion:", err);
      triggerToast("Failed to save completion status", "error");
    } finally {
      setIsSaving(false);
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
  const totalGridWidth = 48 + 40 + colWidthA + colWidthB + colWidthC + 60;

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

      {/* --- GOOGLE SHEETS SYNC CONTROL PANEL --- */}
      <div className="bg-slate-50 border-2 border-slate-950 rounded-2xl p-4 md:p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col gap-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-green-100 border-2 border-slate-950 rounded-xl flex items-center justify-center text-green-700 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-950 text-sm uppercase tracking-tight flex items-center gap-2">
                Google Sheets Sync
                {googleAccessToken ? (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-green-100 border border-green-600 text-green-700 animate-pulse">
                    Live Syncing
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-100 border border-amber-600 text-amber-700">
                    Offline
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                Link your Google Sheet with this Idea Spreadsheet to load ideas from the sheet or save them back in real-time.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 w-full md:w-auto">
            {!googleAccessToken ? (
              <button
                onClick={handleConnectGoogle}
                disabled={sheetSyncing}
                className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white border-2 border-slate-950 rounded-xl font-black text-xs transition-all cursor-pointer active:scale-95 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50"
              >
                {sheetSyncing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Globe className="w-4 h-4" />
                )}
                <span>Connect Google Sheets</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 w-full md:w-auto justify-between sm:justify-end">
                <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg border-2 border-dashed border-slate-300 hidden sm:inline-block">
                  Connected: <span className="font-black text-indigo-600">{googleUser?.email || 'Google User'}</span>
                </span>
                <button
                  onClick={handleDisconnectGoogle}
                  className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border-2 border-slate-950 rounded-xl font-black text-xs transition-all cursor-pointer active:scale-95 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  title="Disconnect Google Account"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* URL Configuration & Operations */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
          
          {/* Sheet URL Display / Input */}
          <div className="lg:col-span-2 bg-white border-2 border-slate-950 rounded-xl p-3 flex flex-col justify-between gap-2.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-indigo-500" />
                Connected Spreadsheet Link:
              </label>
              {!isUrlEditing ? (
                <button
                  onClick={() => {
                    setTempUrlInput(googleSheetUrl);
                    setIsUrlEditing(true);
                  }}
                  className="text-[10px] font-black text-indigo-600 hover:underline cursor-pointer"
                >
                  Change Link
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveSheetUrl}
                    className="text-[10px] font-black text-green-600 hover:underline cursor-pointer"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setIsUrlEditing(false)}
                    className="text-[10px] font-black text-slate-400 hover:underline cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {isUrlEditing ? (
              <input
                type="text"
                value={tempUrlInput}
                onChange={(e) => setTempUrlInput(e.target.value)}
                className="w-full text-xs font-bold text-slate-800 border-2 border-slate-950 rounded-lg p-2 focus:ring-1 focus:ring-slate-950 outline-none"
                placeholder="Paste Google Spreadsheet URL here..."
              />
            ) : (
              <a
                href={googleSheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-black text-slate-900 hover:text-indigo-600 underline truncate flex items-center gap-1.5"
              >
                {googleSheetUrl}
              </a>
            )}
          </div>

          {/* Core Operations (Pull/Push) */}
          <div className="flex items-center gap-2 bg-white border-2 border-slate-950 rounded-xl p-3">
            <button
              onClick={handlePullFromSheet}
              disabled={sheetSyncing || !googleAccessToken}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 text-indigo-950 border-2 border-slate-950 rounded-lg font-black text-xs transition-all cursor-pointer active:scale-95"
              title="Loads content from Google Sheets into this workspace"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${sheetSyncing ? 'animate-spin' : ''}`} />
              <span>Pull from Sheet</span>
            </button>
            <button
              onClick={handlePushToSheet}
              disabled={sheetSyncing || !googleAccessToken}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-green-50 hover:bg-green-100 disabled:opacity-50 text-green-950 border-2 border-slate-950 rounded-lg font-black text-xs transition-all cursor-pointer active:scale-95"
              title="Writes your current app's ideas spreadsheet to Google Sheets"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Push to Sheet</span>
            </button>
          </div>

        </div>

        {!googleAccessToken && (
          <p className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex flex-col gap-1">
            <span>
              ⚠️ <strong>Authentication Required:</strong> Please connect your Google account to authorize reading and writing to your Google Sheets. Once connected, changes you make in the app's grid below will also automatically sync to your Google Sheet in the background!
            </span>
            <span className="text-slate-500 mt-1">
              💡 <strong>Tip for Preview Mode:</strong> If the Google login window doesn't open or closes immediately, it's due to iframe popup restrictions. Simply click the <strong>"Open in New Tab"</strong> button in the top right of the screen and connect there!
            </span>
          </p>
        )}
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

              {/* Done Header Column */}
              <div className="w-10 bg-slate-800 border-r border-b border-slate-700 flex items-center justify-center text-[10px] font-black tracking-wider text-slate-400 shrink-0 select-none">
                <Check className="w-4 h-4 stroke-[2.5]" />
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

                  {/* Column Done Title */}
                  <div className="w-10 border-r border-slate-200 bg-slate-50 shrink-0 flex items-center justify-center select-none">
                    <Check className="w-3.5 h-3.5 text-slate-400" />
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
                    <div 
                      key={row.tempId} 
                      className={`flex items-stretch min-h-12 relative border-b transition-colors duration-150 ${
                        row.isCompleted 
                          ? 'bg-emerald-50/40 hover:bg-emerald-50/70 border-emerald-100' 
                          : 'hover:bg-slate-50/50 border-slate-150 bg-white'
                      }`}
                    >
                      
                      {/* Row Counter (Google Sheets index offset by 2) */}
                      <div className={`w-12 text-[11px] font-black flex items-center justify-center select-none shrink-0 border-r border-slate-300 transition-colors duration-150 ${
                        isRowActive 
                          ? 'bg-sky-600 text-white border-r-2 border-sky-400 font-extrabold shadow-inner' 
                          : 'bg-slate-800 text-slate-400 border-b border-slate-700'
                      }`}>
                        {rIdx + 2}
                      </div>

                      {/* Column Checkbox Cell */}
                      <div className={`w-10 border-r border-slate-150 flex items-center justify-center shrink-0 relative transition-colors duration-150 ${
                        row.isCompleted ? 'bg-emerald-50/60 border-emerald-100/40' : ''
                      }`}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleRowCompleted(rIdx);
                          }}
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                            row.isCompleted
                              ? 'bg-emerald-500 border-emerald-600 text-white shadow-sm'
                              : 'border-slate-300 hover:border-emerald-500 hover:bg-slate-50'
                          }`}
                          title={row.isCompleted ? "Mark as pending" : "Mark as completed"}
                        >
                          {row.isCompleted && (
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          )}
                        </button>
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
                          <div className={`text-xs font-black px-3 py-2.5 whitespace-normal break-words leading-relaxed w-full select-none transition-all ${
                            row.isCompleted ? 'text-emerald-700/60 line-through decoration-emerald-400' : 'text-slate-900'
                          }`}>
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
                          <div className={`text-xs font-black px-3 py-2.5 whitespace-normal break-words leading-relaxed w-full select-none transition-all ${
                            row.isCompleted ? 'text-emerald-800/60 line-through decoration-emerald-400/75' : 'text-slate-900'
                          }`}>
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
                          <div className={`text-xs font-semibold px-3 py-2.5 whitespace-normal break-words leading-relaxed w-full select-none transition-all ${
                            row.isCompleted ? 'text-emerald-600/60 line-through decoration-emerald-400/60' : 'text-slate-500'
                          }`}>
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
                      <div className={`w-[60px] flex items-center justify-center border-b shrink-0 transition-colors duration-150 ${
                        row.isCompleted ? 'bg-emerald-50/20 border-emerald-100' : 'bg-slate-50 border-slate-150'
                      }`}>
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

      {/* --- CUSTOM BEAUTIFUL CONFIRMATION MODAL --- */}
      {confirmModal && confirmModal.isOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white border-4 border-slate-950 rounded-3xl max-w-md w-full p-6 shadow-[8px_8px_0px_#020617] animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-black text-slate-900 border-b-4 border-slate-950 pb-2 mb-4">
              {confirmModal.title}
            </h3>
            <p className="text-sm font-bold text-slate-700 mb-6 leading-relaxed">
              {confirmModal.message}
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold border-2 border-slate-950 rounded-xl transition-all cursor-pointer active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal(null);
                }}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black border-2 border-slate-950 rounded-xl shadow-[2px_2px_0px_#020617] transition-all cursor-pointer active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
