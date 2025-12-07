import React, { useState, useEffect } from 'react';
import { Calendar, BookOpen, Sparkles } from 'lucide-react';
import CalendarScreen from './components/CalendarScreen';
import TipsScreen from './components/TipsScreen';
import { AiTip, CalendarEvent, ViewTab } from './types';
import { loadTips, saveTips, loadEvents, saveEvents } from './utils';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ViewTab>('calendar');
  const [tips, setTips] = useState<AiTip[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  // Load data on mount
  useEffect(() => {
    setTips(loadTips());
    setEvents(loadEvents());
  }, []);

  // Handler for importing new tips
  const handleImportTips = (newTips: AiTip[]) => {
    // Merge strategy: Replace duplicates based on date, keep others
    const mergedTips = [...tips];
    newTips.forEach(newTip => {
      const idx = mergedTips.findIndex(t => t.date === newTip.date);
      if (idx >= 0) {
        mergedTips[idx] = newTip;
      } else {
        mergedTips.push(newTip);
      }
    });
    setTips(mergedTips);
    saveTips(mergedTips);
  };

  // Handler for adding events
  const handleAddEvent = (event: CalendarEvent) => {
    const updatedEvents = [...events, event];
    setEvents(updatedEvents);
    saveEvents(updatedEvents);
  };

  return (
    <div className="min-h-screen bg-slate-50 max-w-md mx-auto relative shadow-2xl overflow-hidden flex flex-col">
      
      {/* Top Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="bg-gradient-to-tr from-violet-600 to-cyan-400 p-1.5 rounded-lg shadow-lg shadow-violet-500/20">
            <Sparkles size={20} className="text-white" />
          </div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-700 via-fuchsia-600 to-cyan-600 tracking-tight">
            CaLearner - AI
          </h1>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto no-scrollbar scroll-smooth">
        {activeTab === 'calendar' ? (
          <CalendarScreen tips={tips} events={events} onAddEvent={handleAddEvent} />
        ) : (
          <TipsScreen tips={tips} onImport={handleImportTips} />
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="bg-white border-t border-slate-200 px-6 py-3 flex justify-around items-center z-40">
        <button 
          onClick={() => setActiveTab('calendar')}
          className={`flex flex-col items-center gap-1 transition-all duration-300 ${activeTab === 'calendar' ? 'text-violet-600 scale-105' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <div className={`p-1 rounded-full ${activeTab === 'calendar' ? 'bg-violet-50' : 'bg-transparent'}`}>
            <Calendar size={24} strokeWidth={activeTab === 'calendar' ? 2.5 : 2} />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider font-heading">Calendar</span>
        </button>
        
        <button 
          onClick={() => setActiveTab('tips')}
          className={`flex flex-col items-center gap-1 transition-all duration-300 ${activeTab === 'tips' ? 'text-violet-600 scale-105' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <div className={`p-1 rounded-full ${activeTab === 'tips' ? 'bg-violet-50' : 'bg-transparent'}`}>
            <BookOpen size={24} strokeWidth={activeTab === 'tips' ? 2.5 : 2} />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider font-heading">Tips Library</span>
        </button>
      </div>
    </div>
  );
};

export default App;