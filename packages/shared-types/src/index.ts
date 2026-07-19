// User Profiles
export interface UserProfile {
  id: string;
  displayName: string | null;
  createdAt: string;
}

// Structured Script JSON within ReferenceScript
export interface StructuredScriptPreview {
  chapters: number;
  characters: string[];
  endings: number;
  overview?: string;
}

export interface ReferenceScript {
  id: string;
  title: string;
  genre: string;
  subgenre?: string | null;
  tags: string[];
  rawText: string;
  structured: StructuredScriptPreview;
  createdAt: string;
}

export interface IngestScriptRequest {
  title: string;
  genre: string;
  subgenre?: string;
  rawText: string;
  tags?: string[];
}

// Project Domain Models
export interface ProjectMetadata {
  tone?: string;
  targetLength?: string;
  platform?: string;
  referenceGames?: string[];
  endingsCount?: number;
  [key: string]: unknown;
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  idea: string;
  genre: string | null;
  metadata: ProjectMetadata;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectAsset {
  id: string;
  projectId: string;
  assetName: string; // e.g. "STORY.md", "CHARACTERS.md"
  content: string;
  version: number;
  createdAt: string;
}

export interface ProjectMemory {
  id: string;
  projectId: string;
  key: string; // e.g. "character:detective_reyes"
  value: Record<string, unknown>;
  updatedAt: string;
}

// Generation & Revision DTOs
export interface GenerateScriptRequest {
  idea: string;
  genre?: string;
  tone?: string;
  targetLength?: string;
  platform?: string;
  referenceGames?: string[];
  endingsCount?: number;
}

export interface GenerationJobStatus {
  jobId: string;
  projectId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number; // 0 - 100
  currentStep?: string;
  error?: string;
  assets?: string[];
  retrievedReferences?: string[];
}

export interface ReviseAssetRequest {
  instructions: string;
}

// API Generic Response Wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}
