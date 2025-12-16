import React, { useState, useEffect, useCallback } from 'react';
import { formatCurrency } from '../constants';
import { AdvisorSuggestion, CoursePreparation, Task, Currency, Student, Income, Course } from '../types';
import { firestoreService } from '../services/firestoreService';
import { geminiService } from '../services/geminiService';
import { useAuth } from '../src/contexts/AuthContext';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie
} from 'recharts';

interface DashboardProps {
  currency: Currency;
}

// Components
const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; trend?: string; color?: string }> = ({ title, value, icon, trend, color = "indigo" }) => (
  <motion.div
    whileHover={{ y: -5 }}
    className={`glass-panel p-6 flex items-center justify-between relative overflow-hidden group`}
  >
    <div className={`absolute -right-6 -top-6 w-24 h-24 bg-${color}-500/10 rounded-full blur-xl group-hover:bg-${color}-500/20 transition-all duration-500`}></div>

    <div>
      <p className="text-gray-400 text-sm font-medium uppercase tracking-wider">{title}</p>
      <div className="flex items-baseline gap-2 mt-1">
        <p className="text-3xl font-bold text-white">{value}</p>
        {trend && <span className="text-xs text-green-400 font-medium">{trend}</span>}
      </div>
    </div>
    <div className={`p-4 rounded-2xl bg-gradient-to-br from-${color}-500/20 to-${color}-600/20 text-${color}-400 ring-1 ring-inset ring-${color}-500/20`}>
      {icon}
    </div>
  </motion.div>
);

const SuggestionCard: React.FC<{
  suggestion: AdvisorSuggestion;
  onAction?: (suggestion: AdvisorSuggestion) => void;
  onDismiss?: (id: string) => void;
}> = ({ suggestion, onAction, onDismiss }) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    className="bg-white/5 border border-white/5 p-4 rounded-xl hover:bg-white/10 transition-colors group"
  >
    <div className="flex items-start space-x-4">
      <div className="flex-shrink-0 mt-1">
        {suggestion.type === 'student' ? (
          <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
            <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>
          </div>
        ) : suggestion.type === 'finance' ? (
          <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">
            <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-400">
            <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" /></svg>
          </div>
        )}
      </div>
      <div className="flex-1">
        <h4 className="font-bold text-gray-100 text-sm">{suggestion.title}</h4>
        <p className="text-xs text-gray-400 mt-1 leading-relaxed">{suggestion.description}</p>
        {suggestion.studentId && (
          <div className="mt-2 text-xs text-indigo-300/80 bg-indigo-500/10 px-2 py-1 rounded inline-block">
            Student: {suggestion.title.split(': ').pop()}
          </div>
        )}
      </div>
    </div>

    {suggestion.actionType && (
      <div className="flex gap-2 pt-3 pl-12 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onAction && onAction(suggestion)}
          className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg transition-colors"
        >
          Виконати дію
        </button>
        <button
          onClick={() => onDismiss && onDismiss(suggestion.id)}
          className="text-xs bg-white/5 hover:bg-white/10 text-gray-400 px-3 py-1.5 rounded-lg transition-colors"
        >
          Ігнорувати
        </button>
      </div>
    )}
  </motion.div>
);

const UpcomingTask: React.FC<{ task: Task }> = ({ task }) => (
  <div className="flex items-center gap-3 py-3 border-b border-white/5 last:border-b-0 hover:bg-white/5 p-2 rounded-lg transition-colors cursor-pointer">
    <div className={`w-2 h-2 rounded-full ${task.priority === 'High' ? 'bg-red-500' : task.priority === 'Medium' ? 'bg-yellow-500' : 'bg-blue-500'}`} />
    <div className="flex-1 min-w-0">
      <p className="text-white font-medium text-sm truncate">{task.title}</p>
      <p className="text-xs text-gray-500 truncate">{task.assigneeName} • {task.dueDate}</p>
    </div>
    <div className="text-xs text-gray-500 bg-white/5 px-2 py-1 rounded">
      {task.status}
    </div>
  </div>
);

const Dashboard: React.FC<DashboardProps> = ({ currency }) => {
  const { user } = useAuth();
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

  // Helper for charts
  const getRevenueData = () => {
    // Group income by month (simplified)
    const data: any[] = [];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Mocking trend data + actual income integration
    // In real app, you'd aggregate `income` array by date
    months.forEach((m) => {
      data.push({ name: m, revenue: 1000 + Math.random() * 5000, projected: 1200 + Math.random() * 5500 });
    });
    return data;
  };

  const generateProactiveSuggestions = useCallback((studentData: Student[], taskData: Task[]): AdvisorSuggestion[] => {
    const suggestions: AdvisorSuggestion[] = [];
    const now = new Date();

    // 1. Pending Students Follow-up
    studentData.forEach(student => {
      const regDate = new Date(student.registrationDate);
      const diffTime = Math.abs(now.getTime() - regDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (student.status === 'Pending' && diffDays > 7) {
        suggestions.push({
          id: `pending-${student.id}`,
          title: `Потенційний клієнт: ${student.name}`,
          description: `Зареєстрований ${diffDays} днів тому. Необхідно зв'язатися.`,
          type: 'student',
          studentId: student.id,
          actionType: 'follow_up'
        });
      }
    });

    // 2. Overdue Tasks Reminder
    taskData.forEach(task => {
      if (task.status !== 'Done' && task.dueDate) {
        const dueDate = new Date(task.dueDate);
        if (dueDate < now) {
          suggestions.push({
            id: `task-overdue-${task.id}`,
            title: `🔥 Прострочене завдання: ${task.title}`,
            description: `Термін сплив ${task.dueDate}. Виконавець: ${task.assigneeName}.`,
            type: 'task',
            actionType: 'notification'
          });
        }
      }
    });

    // 3. Debtors Alert (NEW)
    studentData.forEach(student => {
      const totalDebt = student.enrolledCourses?.reduce((acc, ec) => acc + (ec.priceDue || 0), 0) || 0;
      if (totalDebt > 5) { // Threshold to avoid tiny debts
        const displayAmount = currency === 'TRY' ? totalDebt * 32.83 : totalDebt;
        suggestions.push({
          id: `debtor-${student.id}`,
          title: `💸 Заборгованість: ${student.name}`,
          description: `Студент має борг ${formatCurrency(displayAmount, currency)}.`,
          type: 'finance',
          studentId: student.id,
          actionType: 'payment_reminder'
        });
      }
    });

    return suggestions;
  }, [currency]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [studentData, courseData, incomeData, taskData, prepData, savedSuggestions] = await Promise.all([
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

        const proactiveSuggestions = generateProactiveSuggestions(studentData, taskData);
        setAdvisorSuggestions([...proactiveSuggestions, ...savedSuggestions]);

      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [generateProactiveSuggestions]); // Removed 'tasks' from dep array to avoid infinite loop if fetchData updates tasks. But fetchData is inside useEffect [], so it's fine.

  const fetchWelcomeMessage = useCallback(async () => {
    if (!user) {
      setAiWelcomeMessage("Привіт! Увійдіть, щоб побачити більше.");
      setLoadingWelcomeMessage(false);
      return;
    }
    setLoadingWelcomeMessage(true);
    try {
      const hour = new Date().getHours();
      const timeOfDay = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
      const message = await geminiService.generateWelcomeMessage(user.name, user.role, new Date().toISOString().split('T')[0], timeOfDay);
      setAiWelcomeMessage(message);
    } catch (error) {
      console.error("Welcome message generation failed:", error);
      setAiWelcomeMessage("Привіт! Ласкаво просимо на панель керування.");
    } finally {
      setLoadingWelcomeMessage(false);
    }
  }, [user]);

  useEffect(() => {
    fetchWelcomeMessage();
  }, [fetchWelcomeMessage]);

  const handleRegenerateSuggestions = async () => {
    setIsGeneratingSuggestions(true);
    try {
      const newAiSuggestions = await geminiService.generateAdvisorSuggestions(students, courses, income, tasks);
      await firestoreService.saveAdvisorSuggestions(newAiSuggestions);
      const proactiveSuggestions = generateProactiveSuggestions(students, tasks);
      setAdvisorSuggestions([...proactiveSuggestions, ...newAiSuggestions]);
    } catch (error) {
      console.error("Regenerating suggestions failed:", error);
      alert("Не вдалося оновити пропозиції.");
    } finally {
      setIsGeneratingSuggestions(false);
    }
  };

  const handleSuggestionAction = (suggestion: AdvisorSuggestion) => {
    if (suggestion.actionType === 'payment_reminder' || suggestion.actionType === 'follow_up') {
      const text = `Вітаємо, ${suggestion.title.split(': ').pop()}!`;
      navigator.clipboard.writeText(text);
      alert(`Текст нагадування скопійовано.`);
    }
  };

  const handleDismissSuggestion = async (id: string) => {
    // Optimistic UI update
    setAdvisorSuggestions(prev => prev.filter(s => s.id !== id));

    // If it's a persisted suggestion (not generated on the fly), remove from Firestore
    // Simple check: IDs starting with "pending-" or "task-" are likely generated on client
    if (!id.startsWith('pending-') && !id.startsWith('task-')) {
      // Ideally, we'd have a delete method in firestoreService
      // For now, we update the whole list minus this one
      const updatedSuggestions = advisorSuggestions.filter(s => s.id !== id);
      await firestoreService.saveAdvisorSuggestions(updatedSuggestions);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-[80vh] gap-4">
        <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-lg text-indigo-400 font-medium">Завантаження MagicAI...</p>
      </div>
    );
  }

  const activeStudents = students.filter(s => s.status === 'Active').length;
  // const upcomingTasks = tasks.filter(t => t.status !== 'Done').slice(0, 3);
  const upcomingTasks = tasks.filter(t => t.status !== 'Done' && (user ? t.assigneeId === user.id : true)).slice(0, 3);
  const totalIncome = income.reduce((sum, item) => sum + item.amount, 0);
  const canSeeFinance = user && ['admin', 'manager', 'creator', 'owner'].includes(user.role || '');

  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      {/* Welcome Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel p-6 rounded-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        <div className="relative z-10 flex items-start gap-5">
          <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-white"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" /></svg>
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white mb-2">Привіт, {user ? user.name : 'Гість'}! 👋</h1>
            {loadingWelcomeMessage ? (
              <div className="h-6 w-1/3 bg-white/10 rounded animate-pulse"></div>
            ) : (
              <p className="text-gray-300 leading-relaxed max-w-3xl">{aiWelcomeMessage}</p>
            )}
          </div>
          <button onClick={fetchWelcomeMessage} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-indigo-300">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
          </button>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Активні студенти" value={activeStudents} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M15 21a6 6 0 00-9-5.197m0 0A5.995 5.995 0 0112 12.75a5.995 5.995 0 01-3 5.053m0 0A5.995 5.995 0 0112 12.75a5.995 5.995 0 013 5.053m0 0A5.995 5.995 0 0112 12.75a5.995 5.995 0 01-3 5.053" /></svg>} color="indigo" />
        {canSeeFinance && (
          <StatCard title="Загальний дохід" value={formatCurrency(totalIncome, currency)} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} color="green" trend="+12.5%" />
        )}
        <StatCard title="Активні курси" value={courses.length} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>} color="purple" />
        <StatCard title="Завдання" value={tasks.filter(t => t.status !== 'Done').length} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>} color="pink" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart Area */}
        <div className="lg:col-span-2 space-y-6">
          {canSeeFinance && (
            <div className="glass-panel p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-bold text-white">Фінансовий огляд</h3>
                  <p className="text-sm text-gray-400">Дохід та прогнозування (AI)</p>
                </div>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={getRevenueData()}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorProjected" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                    <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                      itemStyle={{ color: '#e5e7eb' }}
                    />
                    <Area type="monotone" dataKey="projected" stroke="#34d399" fillOpacity={1} fill="url(#colorProjected)" name="Прогноз" strokeDasharray="5 5" />
                    <Area type="monotone" dataKey="revenue" stroke="#818cf8" fillOpacity={1} fill="url(#colorRevenue)" name="Дохід" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-panel p-6">
              <h3 className="text-lg font-bold text-white mb-4">Майбутні завдання</h3>
              <div className="space-y-2">
                {upcomingTasks.length > 0 ? upcomingTasks.map(task => (
                  <UpcomingTask key={task.id} task={task} />
                )) : <p className="text-gray-400 text-sm py-4">Немає термінових завдань.</p>}
              </div>
              <button className="w-full mt-4 py-2 border border-white/10 rounded-lg text-sm text-gray-300 hover:bg-white/5 transition-colors">
                Переглянути всі
              </button>
            </div>
            <div className="glass-panel p-6">
              <h3 className="text-lg font-bold text-white mb-4">Популярні курси</h3>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Base', value: 400 },
                        { name: 'Volume', value: 300 },
                        { name: 'Lami', value: 300 },
                      ]}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {[
                        { name: 'Base', value: 400 },
                        { name: 'Volume', value: 300 },
                        { name: 'Lami', value: 300 },
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={['#818cf8', '#c084fc', '#f472b6'][index % 3]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar: AI Advisor & Suggestions */}
        <div className="space-y-6">
          <div className="glass-panel p-0 overflow-hidden flex flex-col h-[600px]">
            <div className="p-6 border-b border-white/5 bg-gradient-to-r from-indigo-900/40 to-purple-900/40">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                  </span>
                  <h3 className="text-lg font-bold text-white">Magic Insights</h3>
                </div>
                <button
                  onClick={handleRegenerateSuggestions}
                  disabled={isGeneratingSuggestions}
                  className={`p-1.5 rounded-lg transition-all ${isGeneratingSuggestions ? 'bg-indigo-500/20 text-indigo-300' : 'hover:bg-white/10 text-gray-400 hover:text-white'}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-5 h-5 ${isGeneratingSuggestions ? 'animate-spin' : ''}`}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
                </button>
              </div>
              <p className="text-xs text-indigo-200/70">AI-powered recommendations</p>
            </div>

            <div className="flex-1 p-4 overflow-y-auto custom-scrollbar space-y-3 bg-black/10">
              {advisorSuggestions.length > 0 ? advisorSuggestions.map(suggestion => (
                <SuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  onAction={handleSuggestionAction}
                  onDismiss={handleDismissSuggestion}
                />
              )) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-6 text-gray-500">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 mb-3 opacity-20"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                  <p className="text-sm">Все спокійно. Гарна робота!</p>
                  <button onClick={handleRegenerateSuggestions} className="mt-4 text-xs text-indigo-400 hover:text-indigo-300 underline">Перевірити знову</button>
                </div>
              )}
            </div>
          </div>

          <div className="glass-panel p-6">
            <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-4">Підготовка курсів</h3>
            <div className="space-y-4">
              {coursePreparations.map(prep => (
                <div key={prep.courseId}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-200">{prep.courseName}</span>
                    <span className="text-xs font-bold text-indigo-400">{prep.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-700/50 rounded-full h-1.5">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${prep.progress}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="bg-gradient-to-r from-indigo-500 to-purple-500 h-1.5 rounded-full"
                    />
                  </div>
                </div>
              ))}
              {coursePreparations.length === 0 && <p className="text-xs text-gray-500">Немає активних підготовок.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;