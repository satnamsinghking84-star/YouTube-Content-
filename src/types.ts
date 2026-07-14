export interface YouTubeChannel {
  id: string;
  name: string;
  handle: string;
  avatarColor: string;
}

export interface ContentScheduleItem {
  id: string;
  channelId: string;
  date: string; // YYYY-MM-DD
  thumbnail: string; // base64 string or empty
  title: string;
  description: string;
  status: 'Draft' | 'Researching' | 'Scripting' | 'Recording' | 'Editing' | 'Scheduled' | 'Published';
  notes?: string;
}

export interface DailyPlanningTask {
  id: string;
  channelId: string;
  date: string; // YYYY-MM-DD
  text: string;
  isCompleted: boolean;
  targetTime?: string; // Optional daily deadline/target time (e.g. "12:00 PM")
}

export interface ChannelIdea {
  id: string;
  channelId: string;
  number: string; // User-inputted number
  title: string;
  shortDescription: string;
  createdAt: string; // Timestamp
  isCompleted?: boolean;
}

