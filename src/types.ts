export interface User {
  id: string;
  username: string;
  bio: string;
  avatar: string;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  password?: string;
  admin_id: string;
  created_at: string;
}

export interface Message {
  id: string;
  group_id: string;
  user_id: string;
  content: string;
  type: 'text' | 'image';
  timestamp: string;
  username: string;
  avatar: string;
}

export type AppView = 'profile' | 'groups' | 'chat';
