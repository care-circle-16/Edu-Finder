
import { ChapterPerformance, QuizAttempt, ClassLevel } from "../types";

const PERFORMANCE_KEY = 'edufinder_user_performance';

export const saveQuizPerformance = (
  classLevel: ClassLevel,
  subject: string,
  chapter: string,
  score: number,
  total: number
) => {
  try {
    const dataString = localStorage.getItem(PERFORMANCE_KEY);
    let performanceData: ChapterPerformance[] = dataString ? JSON.parse(dataString) : [];

    const attempt: QuizAttempt = {
      date: Date.now(),
      score,
      total,
      percentage: (score / total) * 100
    };

    const existingIndex = performanceData.findIndex(
      p => p.chapter === chapter && p.subject === subject && p.classLevel === classLevel
    );

    if (existingIndex > -1) {
      performanceData[existingIndex].attempts.push(attempt);
      // Keep only last 10 attempts for calculation
      if (performanceData[existingIndex].attempts.length > 10) {
        performanceData[existingIndex].attempts.shift();
      }
      const sum = performanceData[existingIndex].attempts.reduce((acc, curr) => acc + curr.percentage, 0);
      performanceData[existingIndex].averagePercentage = sum / performanceData[existingIndex].attempts.length;
    } else {
      performanceData.push({
        chapter,
        subject,
        classLevel,
        attempts: [attempt],
        averagePercentage: attempt.percentage
      });
    }

    localStorage.setItem(PERFORMANCE_KEY, JSON.stringify(performanceData));
  } catch (error) {
    console.error("Failed to save performance:", error);
  }
};

export const getPracticeSuggestions = (): ChapterPerformance[] => {
  try {
    const dataString = localStorage.getItem(PERFORMANCE_KEY);
    if (!dataString) return [];
    
    const performanceData: ChapterPerformance[] = JSON.parse(dataString);
    
    // Sort by average percentage (lowest first) and filter topics below 80%
    return performanceData
      .filter(p => p.averagePercentage < 80)
      .sort((a, b) => a.averagePercentage - b.averagePercentage)
      .slice(0, 3);
  } catch (error) {
    return [];
  }
};

export const getGlobalPerformance = () => {
  try {
    const dataString = localStorage.getItem(PERFORMANCE_KEY);
    if (!dataString) return { avg: 0, totalQuizzes: 0 };
    
    const performanceData: ChapterPerformance[] = JSON.parse(dataString);
    const totalAttempts = performanceData.reduce((acc, curr) => acc + curr.attempts.length, 0);
    const avgSum = performanceData.reduce((acc, curr) => acc + curr.averagePercentage, 0);
    
    return {
      avg: performanceData.length > 0 ? avgSum / performanceData.length : 0,
      totalQuizzes: totalAttempts
    };
  } catch (error) {
    return { avg: 0, totalQuizzes: 0 };
  }
};
