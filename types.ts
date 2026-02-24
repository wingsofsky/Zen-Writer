
export interface WritingSession {
  id: string;
  title: string;
  content: string;
  lastUpdated: number;
}

export enum AppStatus {
  IDLE = 'idle',
  WRITING = 'writing',
  AI_THINKING = 'ai_thinking'
}
