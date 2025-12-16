export interface StudentSource {
  id: string;
  name: string;
}

// New type for editable course name templates
export interface CourseTemplate {
  id: string;
  name: string;
}

import { FunctionDeclaration, Type } from '@google/genai';

// FIX: Centralized global declarations here to avoid module conflicts.
// FIX: Moved AIStudio and ModelQuota to be global interfaces to resolve type conflicts.
declare global {
  interface ModelQuota {
    metricName: string;
    maxQuota: number;
    remainingQuota: number;
    quota: string;
    remaining: string;
  }

  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
    getHostUrl: () => Promise<string>;
    getModelQuota: (model: string) => Promise<ModelQuota>;
  }

  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
    aistudio?: AIStudio;
    // FIX: Add webkitAudioContext for Safari compatibility to resolve type errors.
    webkitAudioContext: typeof AudioContext;
  }
}

export type NavItem = 'dashboard' | 'training' | 'course-preparation' | 'finance' | 'tasks';
export type Currency = 'USD' | 'TRY';
export type UserRole = 'Director' | 'Admin' | 'Manager' | 'admin' | 'employee' | 'student' | 'guest';

export interface User {
  name: string;
  role: UserRole;
}

export interface Note {
  id: string;
  date: string;
  content: string;
}

export interface PaymentHistory {
  id: string;
  date: string;
  amount: number;
  method: string;
  courseName: string;
}

export interface EnrolledCourse {
  courseId: string;
  courseName: string;
  startDate: string;
  price: number;
  pricePaid: number;
  priceDue: number;
  paymentStatus: 'Paid' | 'Pending' | 'Overdue';
  progress: number;
  paymentHistory: PaymentHistory[];
}

export interface Student {
  id: string;
  name: string;
  email: string;
  phone: string;
  messenger: string;
  source: string;
  registrationDate: string;
  managerUid: string;
  status: 'Active' | 'Pending' | 'Graduated' | 'Dropped';
  notes: Note[];
  enrolledCourses: EnrolledCourse[];
  avatar?: string;
}

export interface Course {
  id: string;
  name: string;
  description: string;
  image: string;
  teacherId: string;
  teacherName: string;
  duration: string;
  price: number;
  startDate: string;
  type: 'Ochnyy' | 'Specialized' | 'Online' | 'Workshop';
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'Trainer' | 'Support' | 'Admin' | 'Master' | 'Manager' | 'Creator' | 'Master Artist' | 'Marketing Manager' | 'IT Support';
  salary: number;
  hireDate: string;
  biography: string;
  specializations: string[];
  avatar: string;
  status: 'Active' | 'On Leave' | 'Terminated';
  order: number;
}


export interface Task {
  id: string;
  title: string;
  details: string;
  assigneeId: string;
  assigneeName: string;
  dueDate: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'To Do' | 'In Progress' | 'Done';
}

export interface AdvisorSuggestion {
  id: string;
  title: string;
  description: string;
  type: 'student' | 'finance' | 'course' | 'task';
  // New fields for proactive actions
  studentId?: string;
  courseId?: string;
  actionType?: 'payment_reminder' | 'follow_up' | 'general' | 'notification';
}

export interface Expense {
  id: string;
  date: string;
  category: string;
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  paymentMethod: string;
  notes: string;
}

export interface Income {
  id: string;
  date: string;
  description: string;
  amount: number;
}

export interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
}

export interface CoursePreparation {
  id: string;
  courseId: string;
  courseName: string;
  startDate: string;
  teacherName: string;
  type: 'Ochnyy' | 'Specialized' | 'Online' | 'Workshop';
  progress: number;
  checklist: ChecklistItem[];
}

// For Gemini Service
export interface GeminiEntity {
  name: string;
  type: string;
  value: string;
}

export interface GeminiAnalysisResult {
  sentiment: 'positive' | 'negative' | 'neutral';
  entities: GeminiEntity[];
  suggestions: string[];
}

export interface ExpenseCategory {
  id: string;
  name: string;
  names: string[]; // List of specific expense names for this category
}

// New interface for getStudentDetails response
export interface StudentDetailsResponse {
  status: 'found' | 'not_found' | 'suggestions';
  details?: string; // If found, the full detailed string
  suggestions?: { name: string; id: string; }[]; // If suggestions, an array of { name, id }
  message: string; // User-friendly message
}

// FIX: Explicitly export an empty object to ensure this file is treated as a module,
// which resolves issues with global type augmentations.
export { };
