import React, { useState, useEffect, useCallback } from 'react';
import { formatCurrency, MOCK_CURRENT_USER } from '../constants';
import { AdvisorSuggestion, CoursePreparation, Task, Currency, Student, Income, Course } from '../types';
import { firestoreService } from '../services/firestoreService';
import { geminiService } from '../services/geminiService';
import Button from '../components/Button';

interface DashboardProps {
  currency: Currency;
}

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode }> = ({ title, value, icon }) => (
  <div className="bg-gray-800 p-6 rounded-lg shadow-md flex items-center">
    <div className="p-3 rounded-full bg-indigo-600 mr-4">
      {icon}
    </div>
    <div>
      <p className="text-gray-400 text-sm font-medium">{title}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  </div>
);

const SuggestionCard: React.FC<{ 
  suggestion: AdvisorSuggestion; 
  onAction?: (suggestion: AdvisorSuggestion) => void; 
  onDismiss?: (id: string) => void; 
}> = ({ suggestion, onAction, onDismiss }) => (
  <div className="bg-gray-700/50 border border-gray-700 p-4 rounded-lg flex flex-col space-y-3 hover:bg-gray-700 transition-colors">
    <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 mt-1">
        {suggestion.type === 'student' ? (
            <svg className="w-5 h-5 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>
        ) : suggestion.type === 'finance' ? (
            <svg className="w-5 h-5 text-green-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
        ) : (
            <svg className="w-5 h-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" /></svg>
        )}
        </div>
        <div className="flex-1">
            <h4 className="font-bold text-indigo-200">{suggestion.title}</h4>
            <p className="text-sm text-gray-300 mt-1">{suggestion.description}</p>
            {suggestion.studentId && (
                <div className="mt-2 text-xs text-gray-400">
                    <p>Студент: <span className="text-white">{suggestion.title.split(': ').pop()}</span></p>
                    {suggestion.courseName && <p>Курс: <span className="text-white">{suggestion.courseName}</span></p>}
                </div>
            )}
        </div>
    </div>
    
    {suggestion.actionType && (
        <div className="flex gap-3 pt-2">
            <button 
                onClick={() => onAction && onAction(suggestion)}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2 px-4 rounded transition-colors"
            >
                Нагадати про оплату
            </button>
            <button 
                onClick={() => onDismiss && onDismiss(suggestion.id)}
                className="flex-1 bg-gray-600 hover:bg-gray-500 text-white text-sm font-medium py-2 px-4 rounded transition-colors"
            >
                Відхилити
            </button>
        </div>
    )}
  </div>
);

const UpcomingTask: React.FC<{ task: Task }> = ({ task }) => (
    <div className="flex justify-between items-center py-2 border-b border-gray-700 last:border-b-0">
        <div>
            <p className="text-white font-medium">{task.title}</p>
            <p className="text-xs text-gray-400">Assignee: {task.assigneeName}</p>
        </div>
        <p className="text-sm text-gray-300">{task.dueDate}</p>
    </div>
);

const PreparationProgress: React.FC<{ prep: CoursePreparation }> = ({ prep }) => (
    <div>
        <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium text-gray-200">{prep.courseName}</span>
            <span className="text-sm font-medium text-indigo-400">{prep.progress}%</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2.5">
            <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${prep.progress}%` }}></div>
        </div>
    </div>
);

const Dashboard: React.FC<DashboardProps> = ({ currency }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [income, setIncome] = useState<Income[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [coursePreparations, setCoursePreparations] = useState<CoursePreparation[]>([]);
  const [advisorSuggestions, setAdvisorSuggestions] = useState<AdvisorSuggestion[]>([]);
  const [aiWelcomeMessage, setAiWelcomeMessage] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [loadingWelcomeMessage, setLoadingWelcomeMessage] = useState(true);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);

  const generateProactiveSuggestions = useCallback((studentData: Student[]): AdvisorSuggestion[] => {
    const suggestions: AdvisorSuggestion[] = [];
    const now = new Date();

    studentData.forEach(student => {
        // Check 1: Registered > 7 days ago AND (Status Pending OR Pending Payment)
        const regDate = new Date(student.registrationDate);
        const diffTime = Math.abs(now.getTime() - regDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Logic A: Pending status for too long
        if (student.status === 'Pending' && diffDays > 7) {
            suggestions.push({
                id: `pending-${student.id}`,
                title: `Подальша дія для потенційного студента: ${student.name}`,
                description: `Студент ${student.name} зареєструвався ${diffDays} днів тому, але статус все ще "Pending".`,
                type: 'student',
                studentId: student.id,
                actionType: 'follow_up'
            });
        }

        // Logic B: Enrolled but pending payment > 7 days (or just generically pending)
        student.enrolledCourses.forEach(course => {
            if (course.paymentStatus === 'Pending' && diffDays > 7) {
                 suggestions.push({
                    id: `payment-${student.id}-${course.courseId}`,
                    title: `Подальша дія для потенційного студента: ${student.name}`,
                    description: `Студент ${student.name} записався на курс "${course.courseName}" більше 7 днів тому, але оплата ще не підтверджена.`,
                    type: 'student',
                    studentId: student.id,
                    courseName: course.courseName,
                    actionType: 'payment_reminder'
                });
            }
        });
    });

    return suggestions;
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [
          studentData,
          courseData,
          incomeData,
          taskData,
          prepData,
          savedSuggestions
        ] = await Promise.all([
          firestoreService.getStudents(),
          firestoreService.getCourses(),
          firestoreService.getIncome(),
          firestoreService.getTasks(),
          firestoreService.getCoursePreparations(),
          firestoreService.getAdvisorSuggestions(),
        ]);
        
        setStudents(studentData);
        setCourses(courseData);
        setIncome(incomeData);
        setTasks(taskData);
        setCoursePreparations(prepData);

        // Merge saved AI suggestions with fresh proactive algorithmic suggestions
        const proactiveSuggestions = generateProactiveSuggestions(studentData);
        // Prioritize proactive suggestions
        setAdvisorSuggestions([...proactiveSuggestions, ...savedSuggestions]);

      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [generateProactiveSuggestions]);

  const fetchWelcomeMessage = useCallback(async () => {
      setLoadingWelcomeMessage(true);
      try {
        const hour = new Date().getHours();
        const timeOfDay = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
        const message = await geminiService.generateWelcomeMessage(
          MOCK_CURRENT_USER.name,
          MOCK_CURRENT_USER.role,
          new Date().toISOString().split('T')[0],
          timeOfDay
        );
        setAiWelcomeMessage(message);
      } catch (error) {
        console.error("Failed to generate AI welcome message:", error);
        setAiWelcomeMessage("Привіт! Ласкаво просимо на панель керування.");
      } finally {
        setLoadingWelcomeMessage(false);
      }
  }, []);

  useEffect(() => {
    fetchWelcomeMessage();
  }, [fetchWelcomeMessage]);

  const handleRegenerateSuggestions = async () => {
    setIsGeneratingSuggestions(true);
    try {
        // 1. Generate new strategic advice from AI
        const newAiSuggestions = await geminiService.generateAdvisorSuggestions(students, courses, income, tasks);
        await firestoreService.saveAdvisorSuggestions(newAiSuggestions);
        
        // 2. Re-calculate proactive suggestions locally
        const proactiveSuggestions = generateProactiveSuggestions(students);
        
        // 3. Combine
        setAdvisorSuggestions([...proactiveSuggestions, ...newAiSuggestions]);
    } catch (error) {
        console.error("Error regenerating suggestions:", error);
        alert("Не вдалося оновити пропозиції.");
    } finally {
        setIsGeneratingSuggestions(false);
    }
  };

  const handleSuggestionAction = (suggestion: AdvisorSuggestion) => {
      if (suggestion.actionType === 'payment_reminder' || suggestion.actionType === 'follow_up') {
          const text = `Вітаємо, ${suggestion.title.split(': ').pop()}! Нагадуємо про оплату курсу "${suggestion.courseName || 'вашого курсу'}". Будь ласка, зв'яжіться з нами для уточнення деталей.`;
          navigator.clipboard.writeText(text);
          alert(`Текст нагадування скопійовано в буфер обміну:\n\n"${text}"`);
      }
  };

  const handleDismissSuggestion = (id: string) => {
      setAdvisorSuggestions(prev => prev.filter(s => s.id !== id));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <p className="text-lg">Loading Dashboard...</p>
      </div>
    );
  }

  const activeStudents = students.filter(s => s.status === 'Active').length;
  const upcomingTasks = tasks.filter(t => t.status !== 'Done').slice(0, 3);
  const totalIncome = income.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="space-y-8">
      {/* AI Welcome Message */}
      <div className="bg-gray-800 p-6 rounded-lg shadow-md flex items-center space-x-4">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-indigo-400 flex-shrink-0">
          <path strokeLinecap="round" strokeLinejoin="round" d="m9 11.25 3-3m0 0 3 3m-3-3v8.25M12 18a.75.75 0 0 1-.75.75H5.25A2.25 2.25 0 0 1 3 16.5V5.25A2.25 2.25 0 0 1 5.25 3h13.5A2.25 2.25 0 0 1 21 5.25v6.75A2.25 2.25 0 0 1 18.75 14.25H13.5a.75.75 0 0 1-.75-.75V18Z" />
        </svg>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white mb-1">Вітання від Mira!</h2>
            <button onClick={fetchWelcomeMessage} className="text-gray-400 hover:text-white transition-colors" title="Оновити привітання">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            </button>
          </div>
          {loadingWelcomeMessage ? (
            <p className="text-gray-300 animate-pulse">Генерація привітання...</p>
          ) : (
            <p className="text-gray-300">{aiWelcomeMessage}</p>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Active Students" value={activeStudents} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M15 21a6 6 0 00-9-5.197m0 0A5.995 5.995 0 0112 12.75a5.995 5.995 0 01-3 5.053m0 0A5.995 5.995 0 0112 12.75a5.995 5.995 0 013 5.053m0 0A5.995 5.995 0 0112 12.75a5.995 5.995 0 01-3 5.053" /></svg>} />
        <StatCard title="Total Students" value={students.length} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>} />
        <StatCard title="Courses Offered" value={courses.length} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-12v4m-2-2h4m5 10v4m-2-2h4M5 3a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2H5z" /></svg>} />
        <StatCard title="Total Revenue" value={formatCurrency(totalIncome, currency)} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>} />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Advisor Suggestions */}
        <div className="lg:col-span-2 bg-gray-800 p-6 rounded-lg shadow-md flex flex-col h-full">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white">Magic.Advisor: Проактивні пропозиції</h2>
            <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRegenerateSuggestions} 
                isLoading={isGeneratingSuggestions}
                icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" /></svg>}
            >
                Refresh with AI
            </Button>
          </div>
          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {advisorSuggestions.length > 0 ? advisorSuggestions.map(suggestion => (
              <SuggestionCard 
                key={suggestion.id} 
                suggestion={suggestion} 
                onAction={handleSuggestionAction}
                onDismiss={handleDismissSuggestion}
              />
            )) : (
              <div className="text-center py-8 text-gray-400">
                <p>На даний момент немає термінових пропозицій.</p>
                <p className="text-sm mt-2">Натисніть "Refresh with AI", щоб отримати стратегічні поради.</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Course Preparation & Tasks */}
        <div className="space-y-6">
            <div className="bg-gray-800 p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold text-white mb-4">Course Preparation</h2>
                <div className="space-y-4">
                    {coursePreparations.map(prep => (
                        <PreparationProgress key={prep.courseId} prep={prep} />
                    ))}
                </div>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold text-white mb-4">Upcoming Tasks</h2>
                <div className="space-y-2">
                    {upcomingTasks.length > 0 ? upcomingTasks.map(task => (
                        <UpcomingTask key={task.id} task={task} />
                    )) : <p className="text-gray-400">No upcoming tasks.</p>}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;