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
