export type ChatRole = "system" | "user" | "assistant";

export interface ChatImageContent {
  data: string;
  mimeType: string;
  fileName?: string;
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  reasoningContent?: string;
  hasReasoning?: boolean;
  images?: ChatImageContent[];
  pageMeta?: {
    title: string;
    url: string;
    wordCount?: number;
    excerpt?: string;
    isWebPageReading?: boolean;
  };
  suggestedQuestions?: string[];
  createdAt: number;
  status?: "pending" | "streaming" | "completed" | "error";
  errorMessage?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}
