import { AiTip, CalendarEvent } from './types';
import { DEFAULT_TIPS } from './constants';

const EVENTS_KEY = 'calearner_events';
const TIPS_KEY = 'calearner_tips';

export const loadEvents = (): CalendarEvent[] => {
  try {
    const data = localStorage.getItem(EVENTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Failed to load events", e);
    return [];
  }
};

export const saveEvents = (events: CalendarEvent[]) => {
  localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
};

export const loadTips = (): AiTip[] => {
  try {
    const data = localStorage.getItem(TIPS_KEY);
    return data ? JSON.parse(data) : DEFAULT_TIPS;
  } catch (e) {
    console.error("Failed to load tips", e);
    return DEFAULT_TIPS;
  }
};

export const saveTips = (tips: AiTip[]) => {
  localStorage.setItem(TIPS_KEY, JSON.stringify(tips));
};

// CSV Format: date,title,tip,example,proTip
export const parseCSV = (csvText: string): AiTip[] => {
  const lines = csvText.split(/\r?\n/);
  const result: AiTip[] = [];

  // Simple CSV parser that handles quotes
  const parseLine = (text: string) => {
    const result: string[] = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '"') {
        inQuote = !inQuote;
      } else if (char === ',' && !inQuote) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += char;
      }
    }
    result.push(cur.trim());
    return result.map(s => s.replace(/^"|"$/g, '').replace(/""/g, '"'));
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Skip header if it exists
    if (line.toLowerCase().startsWith('date,title')) continue;

    const cols = parseLine(line);
    
    // Expect at least: date, title, tip
    if (cols.length >= 3) {
      result.push({
        date: cols[0],
        title: cols[1],
        tip: cols[2],
        example: cols[3] || undefined,
        proTip: cols[4] || undefined,
      });
    }
  }
  return result;
};