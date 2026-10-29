// Launch-week hub sections (Phase 2 step 4). Mirrors nexzy-api
// src/game-hub-social/game-hub-social.types.ts. Keep in lockstep.

export interface HubPerson {
  id: string;
  username: string;
  avatarUrl: string | null;
}

export interface HubThreadComment {
  id: string;
  content: string;
  createdAt: string;
  deleted: boolean;
  edited: boolean;
  author: HubPerson | null;
  replies: HubThreadComment[];
}

export interface HubThread {
  post: {
    id: string;
    content: string;
    createdAt: string;
    author: HubPerson;
    commentCount: number;
  };
  comments: HubThreadComment[];
  nextCursor: string | null;
}

export interface HubPlayer extends HubPerson {
  dayOne: boolean;
  rated: boolean;
  following: boolean;
  isMe: boolean;
}

export interface HubPlayersPage {
  count: number;
  items: HubPlayer[] | null;
  nextCursor: string | null;
}

export const THREAD_REPLY_MAX = 1000;
