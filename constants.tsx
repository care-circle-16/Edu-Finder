
import React from 'react';
import { ClassLevel } from './types';

export const CLASS_SUBJECTS: Record<ClassLevel, string[]> = {
  'Class 6': ['Science', 'Mathematics', 'English', 'Social Science', 'Hindi'],
  'Class 7': ['Science', 'Mathematics', 'English', 'Social Science', 'Hindi'],
  'Class 8': ['Science', 'Mathematics', 'English', 'Social Science', 'Hindi'],
  'Class 9': ['Science', 'Mathematics', 'English', 'Social Science', 'Hindi', 'Information Technology'],
  'Class 10': ['Science', 'Mathematics', 'English', 'Social Science', 'Hindi', 'Information Technology'],
  'Class 11': ['Physics', 'Chemistry', 'Biology', 'Mathematics', 'English', 'Accountancy', 'Business Studies', 'Economics', 'History', 'Geography', 'Political Science', 'Computer Science'],
  'Class 12': ['Physics', 'Chemistry', 'Biology', 'Mathematics', 'English', 'Accountancy', 'Business Studies', 'Economics', 'History', 'Geography', 'Political Science', 'Computer Science'],
};

export const CONTENT_TYPE_ICONS: Record<string, React.ReactNode> = {
  'MCQs': (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  ),
  'Quick Revision': (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};
