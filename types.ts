export interface AiTip {
  date: string; // YYYY-MM-DD
  title: string;
  tip: string;
  example?: string;
  proTip?: string;
}

export interface CalendarEvent {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  time?: string;
  notes?: string;
}

export type ViewTab = 'calendar' | 'tips';