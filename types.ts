
export type ClassLevel = 'Class 6' | 'Class 7' | 'Class 8' | 'Class 9' | 'Class 10' | 'Class 11' | 'Class 12';

export type ContentType = 'MCQs' | 'Quick Revision';

export interface StudyConfig {
  classLevel: ClassLevel | null;
  subject: string | null;
  contentType: ContentType | null;
  chapter: string | null;
  isTeacherMode: boolean;
}

export interface SearchResult {
  title: string;
  url: string;
  type: 'PDF' | 'Web' | 'Video';
  source: string;
  isDownloadable: boolean;
  relevanceScore?: number;
}

export enum AppStep {
  HOME = 0,
  CLASS_SELECT = 1,
  SUBJECT_SELECT = 2,
  CHAPTER_SELECT = 3,
  CONTENT_TYPE_SELECT = 4,
  RESULTS = 5
}
