import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Task, Employee } from '../types';
import { firestoreService } from '../services/firestoreService';
import { geminiService } from '../services/geminiService'; // Import geminiService
import Button from '../components/Button';

// Utility functions
const getPriorityClasses = (priority: 'High' | 'Medium' | 'Low') => {
  switch (priority) {
    case 'High':
      return 'bg-red-800 text-red-200';
    case 'Medium':
      return 'bg-yellow-800 text-yellow-200';
    case 'Low':
      return 'bg-blue-800 text-blue-200';
    default:
      return 'bg-gray-700 text-gray-300';
  }
};

const getStatusColor = (status: 'To Do' | 'In Progress' | 'Done') => {
  switch (status) {
    case 'To Do':
      return 'border-l-4 border-gray-500';
    case 'In Progress':
      return 'border-l-4 border-yellow-500';
    case 'Done':
      return 'border-l-4 border-green-500';
    default:
      return 'border-l-4 border-gray-500';
  }
};

// Task Card Component
const TaskCard: React.FC<{
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
}> = ({ task, onEdit, onDelete }) => {
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('taskId', task.id);
    e.dataTransfer.setData('taskStatus', task.status);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      className={`bg-gray-800 p-4 rounded-lg shadow-md ${getStatusColor(task.status)} cursor-grab`}
      draggable="true"
      onDragStart={handleDragStart}
    >
      <div className="flex justify-between items-start">
        <h3 className="text-lg font-bold text-white">{task.title}</h3>
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityClasses(task.priority)}`}>
          {task.priority}
        </span>
      </div>
      <p className="text-sm text-gray-300 mt-2">{task.details}</p>
      <div className="mt-4 flex justify-between items-center text-sm text-gray-400">
        <div>
          <p><strong>Виконавець:</strong> {task.assigneeName}</p>
        </div>
        <div>
          <p><strong>Термін:</strong> {task.dueDate}</p>
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <Button variant="secondary" size="sm" onClick={() => onEdit(task)}>Редагувати</Button>
        <Button variant="danger" size="sm" onClick={() => onDelete(task.id)}>Видалити</Button>
      </div>
    </div>
  );
};

// Task Modal Component
interface TaskModalProps {
  task: Task | null; // null for new task
  employees: Employee[];
  onClose: () => void;
  onSave: (task: Task | Omit<Task, 'id'>) => Promise<void>;
}

const TaskModal: React.FC<TaskModalProps> = ({ task, employees, onClose, onSave }) => {
  const [formData, setFormData] = useState<Task | Omit<Task, 'id'>>(() => {
    if (task) {
      return task;
    }
    const defaultAssignee = employees.find(emp => emp.name === 'Margarita Gulina');
    return {
      title: '',
      details: '',
      assigneeId: defaultAssignee?.id || '',
      assigneeName: defaultAssignee?.name || '',
      dueDate: new Date().toISOString().split('T')[0],
      priority: 'Medium',
      status: 'To Do',
    };
  });
  const [assigneeSearchTerm, setAssigneeSearchTerm] = useState(task?.assigneeName || formData.assigneeName || '');
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false); // New state for AI generation
  const [isPrioritizing, setIsPrioritizing] = useState(false);
  const [isSplitting, setIsSplitting] = useState(false);
  const [suggestedSubtasks, setSuggestedSubtasks] = useState<string[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (task) {
      setFormData(task);
      setAssigneeSearchTerm(task.assigneeName);
    } else {
      const defaultAssignee = employees.find(emp => emp.name === 'Margarita Gulina');
      setFormData({
        title: '',
        details: '',
        assigneeId: defaultAssignee?.id || '',
        assigneeName: defaultAssignee?.name || '',
        dueDate: new Date().toISOString().split('T')[0],
        priority: 'Medium',
        status: 'To Do',
      });
      setAssigneeSearchTerm(defaultAssignee?.name || '');
    }
  }, [task, employees]); // Added employees to dependency array

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const filteredAssignees = employees.filter(emp =>
    emp.name.toLowerCase().includes(assigneeSearchTerm.toLowerCase())
  );

  const handleAssigneeSelect = (employee: Employee) => {
    setFormData(prev => ({ ...prev, assigneeId: employee.id, assigneeName: employee.name }));
    setAssigneeSearchTerm(employee.name);
    setShowAssigneeDropdown(false);
  };

  const handleGenerateDescription = async () => {
    if (!formData.title.trim()) {
      alert('Будь ласка, введіть назву завдання для генерації опису.');
      return;
    }
    setIsGeneratingDescription(true);
    try {
      const generatedDescription = await geminiService.generateTaskDescription(formData.title);
      setFormData(prev => ({ ...prev, details: generatedDescription }));
    } catch (error) {
      console.error('Помилка генерації опису завдання AI:', error);
      alert('Не вдалося згенерувати опис завдання. Спробуйте ще раз.');
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  const handlePrioritize = async () => {
    if (!formData.title.trim() || !formData.details.trim()) {
      alert('Будь ласка, заповніть назву та деталі для аналізу пріоритету.');
      return;
    }
    setIsPrioritizing(true);
    try {
      const result = await geminiService.prioritizeTask(formData.title, formData.details, formData.dueDate);
      setFormData(prev => ({ ...prev, priority: result.priority }));
      alert(`AI визначив пріоритет: ${result.priority}\nПричина: ${result.reason}`);
    } catch (error) {
      console.error('AI Prioritization failed:', error);
      alert('Не вдалося визначити пріоритет.');
    } finally {
      setIsPrioritizing(false);
    }
  };

  const handleSplitTask = async () => {
    if (!formData.title.trim()) {
      alert('Будь ласка, введіть назву завдання.');
      return;
    }
    setIsSplitting(true);
    try {
      const subtasks = await geminiService.suggestTaskSplit(formData.title);
      setSuggestedSubtasks(subtasks);
    } catch (error) {
      console.error('AI Split failed:', error);
      alert('Не вдалося розділити завдання.');
    } finally {
      setIsSplitting(false);
    }
  };

  const addSubtaskToDetails = (subtask: string) => {
    setFormData(prev => ({ ...prev, details: prev.details ? `${prev.details}\n- ${subtask}` : `- ${subtask}` }));
    setSuggestedSubtasks(prev => prev.filter(s => s !== subtask));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.assigneeId || !formData.assigneeName.trim() || !formData.dueDate.trim()) {
      alert('Назва, виконавець та термін виконання обов\'язкові.');
      return;
    }
    await onSave(formData);
    onClose();
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowAssigneeDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4">
      <form onSubmit={handleSubmit} className="bg-gray-800 p-8 rounded-lg w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-6">{task ? 'Редагувати завдання' : 'Додати нове завдання'}</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Назва</label>
            <input name="title" value={formData.title} onChange={handleChange} placeholder="Назва завдання" className="w-full bg-gray-700 p-3 rounded border border-gray-600" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Деталі</label>
            <div className="flex items-start space-x-2">
              <textarea
                name="details"
                value={formData.details}
                onChange={handleChange}
                placeholder="Детальний опис завдання"
                className="w-full bg-gray-700 p-3 rounded border border-gray-600 h-24"
              />
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGenerateDescription}
                  isLoading={isGeneratingDescription}
                  disabled={!formData.title.trim() || isGeneratingDescription}
                  title="Згенерувати опис за допомогою AI"
                  size="sm"
                >
                  {isGeneratingDescription ? 'AI...' : 'Auto Desc'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSplitTask}
                  isLoading={isSplitting}
                  disabled={!formData.title.trim() || isSplitting}
                  title="Розбити на підзадачі"
                  size="sm"
                >
                  Split
                </Button>
              </div>
            </div>
            {suggestedSubtasks.length > 0 && (
              <div className="mt-2 p-2 bg-gray-700/50 rounded border border-gray-600">
                <p className="text-xs text-indigo-300 mb-1">AI пропонує підзадачі (натисніть, щоб додати):</p>
                <div className="flex flex-wrap gap-2">
                  {suggestedSubtasks.map((st, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => addSubtaskToDetails(st)}
                      className="text-xs bg-indigo-900/50 hover:bg-indigo-800 text-indigo-200 px-2 py-1 rounded border border-indigo-700/50 transition-colors text-left"
                    >
                      + {st}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="relative" ref={dropdownRef}>
            <label className="block text-sm font-medium text-gray-300 mb-1">Виконавець</label>
            <input
              type="text"
              name="assigneeName"
              value={assigneeSearchTerm}
              onChange={(e) => {
                setAssigneeSearchTerm(e.target.value);
                setShowAssigneeDropdown(true);
                // Also update formData.assigneeName temporarily for display while typing
                // Note: assigneeId will be validated on submit or when a selection is made
                setFormData(prev => ({ ...prev, assigneeName: e.target.value }));
              }}
              onFocus={() => setShowAssigneeDropdown(true)}
              placeholder="Виберіть виконавця"
              className="w-full bg-gray-700 p-3 rounded border border-gray-600"
              required
            />
            {showAssigneeDropdown && (assigneeSearchTerm.length > 0 || filteredAssignees.length > 0) && (
              <ul className="absolute z-10 w-full bg-gray-700 border border-gray-600 rounded-md mt-1 max-h-48 overflow-y-auto shadow-lg">
                {filteredAssignees.map(employee => (
                  <li
                    key={employee.id}
                    className="p-3 hover:bg-indigo-600 cursor-pointer flex items-center space-x-3"
                    onClick={() => handleAssigneeSelect(employee)}
                  >
                    <img src={employee.avatar || `https://i.pravatar.cc/30?u=${employee.id}`} alt={employee.name} className="w-8 h-8 rounded-full" />
                    <span>{employee.name} ({employee.role})</span>
                  </li>
                ))}
                {filteredAssignees.length === 0 && assigneeSearchTerm.length > 0 && (
                  <li className="p-3 text-gray-400">Немає співробітників за цим запитом.</li>
                )}
              </ul>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Термін виконання</label>
              <input type="date" name="dueDate" value={formData.dueDate} onChange={handleChange} className="w-full bg-gray-700 p-3 rounded border border-gray-600" required />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-300">Пріоритет</label>
                <button type="button" onClick={handlePrioritize} disabled={isPrioritizing} className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                  {isPrioritizing ? <span className="animate-spin">⟳</span> : <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3"><path fillRule="evenodd" d="M9 4.5a.75.75 0 0 1 .721.544l.813 2.846a3.75 3.75 0 0 0 2.576 2.576l2.846.813a.75.75 0 0 1 0 1.442l-2.846.813a3.75 3.75 0 0 0-2.576 2.576l-.813 2.846a.75.75 0 0 1-1.442 0l-.813-2.846a3.75 3.75 0 0 0-2.576-2.576l-2.846-.813a.75.75 0 0 1 0-1.442l2.846-.813a3.75 3.75 0 0 0 2.576-2.576l.813-2.846A.75.75 0 0 1 9 4.5ZM18 1.5a.75.75 0 0 1 .728.568l.258 1.036c.236.94.97 1.674 1.91 1.91l1.036.258a.75.75 0 0 1 0 1.456l-1.036.258c-.94.236-1.674.97-1.91 1.91l-.258 1.036a.75.75 0 0 1-1.456 0l-.258-1.036a2.625 2.625 0 0 0-1.91-1.91l-1.036-.258a.75.75 0 0 1 0-1.456l1.036-.258a2.625 2.625 0 0 0 1.91-1.91l.258-1.036A.75.75 0 0 1 18 1.5M16.5 15a.75.75 0 0 1 .712.513l.394 1.183c.15.447.5.799.948.948l1.183.395a.75.75 0 0 1 0 1.422l-1.183.395c-.447.15-.799.5-.948.948l-.395 1.183a.75.75 0 0 1-1.422 0l-.395-1.183a1.5 1.5 0 0 0-.948-.948l-1.183-.395a.75.75 0 0 1 0-1.422l1.183-.395c.447-.15.799-.5.948-.948l.395-1.183A.75.75 0 0 1 16.5 15Z" clipRule="evenodd" /></svg>}
                  AI Priority
                </button>
              </div>
              <select name="priority" value={formData.priority} onChange={handleChange} className="w-full bg-gray-700 p-3 rounded border border-gray-600">
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Статус</label>
            <select name="status" value={formData.status} onChange={handleChange} className="w-full bg-gray-700 p-3 rounded border border-gray-600">
              <option>To Do</option>
              <option>In Progress</option>
              <option>Done</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end space-x-4 pt-6">
          <Button type="button" variant="secondary" onClick={onClose}>Скасувати</Button>
          <Button type="submit" variant="primary">Зберегти завдання</Button>
        </div>
      </form>
    </div>
  );
};


// Main Tasks Component
const Tasks: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [draggedOverColumn, setDraggedOverColumn] = useState<'To Do' | 'In Progress' | 'Done' | null>(null); // State for visual feedback on drag over
  const [statusFilter, setStatusFilter] = useState('All');
  const [assigneeFilter, setAssigneeFilter] = useState('All'); // 'All' or employee.id

  const fetchTasksAndEmployees = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [taskData, employeeData] = await Promise.all([
        firestoreService.getTasks(),
        firestoreService.getEmployees(),
      ]);
      setEmployees(employeeData);

      if (taskData.length === 0) {
        // Map employee names to IDs for mock tasks
        const margarita = employeeData.find(e => e.name === 'Margarita Gulina');
        const murat = employeeData.find(e => e.name === 'Murat Gurbanov');
        const alina = employeeData.find(e => e.name === 'Alina Ternychenko');
        const dv = employeeData.find(e => e.name === 'DV');

        // FIX: Ensure mock tasks are added only once by checking if tasks already exist
        const initialMockTasks: Omit<Task, 'id'>[] = [
          { title: 'Prepare "Full Start" Course Materials', details: 'Update presentation slides and print handouts.', assigneeId: margarita?.id || '', assigneeName: margarita?.name || 'Margarita Gulina', dueDate: '2025-07-15', priority: 'High', status: 'In Progress' },
          { title: 'Follow up with "VIP" course leads', details: 'Contact students who showed interest last month.', assigneeId: murat?.id || '', assigneeName: murat?.name || 'Murat Gurbanov', dueDate: '2025-07-18', priority: 'Medium', status: 'To Do' },
          { title: 'Order new lash supplies', details: 'Restock glue, primer, and eye patches.', assigneeId: alina?.id || '', assigneeName: alina?.name || 'Alina Ternychenko', dueDate: '2025-07-20', priority: 'Medium', status: 'To Do' },
          { title: 'Finalize Q3 marketing budget', details: 'Review ad spend and plan for upcoming promotions.', assigneeId: dv?.id || '', assigneeName: dv?.name || 'DV', dueDate: '2025-07-25', priority: 'Low', status: 'Done' },
        ];

        const existingTitles = new Set(taskData.map(t => t.title));
        const tasksToAdd = initialMockTasks.filter(mockTask => !existingTitles.has(mockTask.title));

        if (tasksToAdd.length > 0) {
          const addPromises = tasksToAdd.map(task => firestoreService.addTask(task));
          await Promise.all(addPromises);
          const updatedTaskData = await firestoreService.getTasks(); // Fetch again to get new IDs
          setTasks(updatedTaskData);
        } else {
          setTasks(taskData);
        }
      } else {
        setTasks(taskData);
      }
    } catch (err) {
      console.error("Failed to fetch tasks or employees:", err);
      setError("Не вдалося завантажити завдання або співробітників. Будь ласка, спробуйте пізніше.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasksAndEmployees();
  }, [fetchTasksAndEmployees]);

  const filteredTasks = useMemo(() => {
    return tasks
      .filter(task => statusFilter === 'All' || task.status === statusFilter)
      .filter(task => assigneeFilter === 'All' || task.assigneeId === assigneeFilter);
  }, [tasks, statusFilter, assigneeFilter]);


  const handleAddTask = () => {
    setEditingTask(null);
    setIsTaskModalOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsTaskModalOpen(true);
  };

  const handleSaveTask = async (taskData: Task | Omit<Task, 'id'>) => {
    try {
      if ('id' in taskData) {
        await firestoreService.updateTask(taskData.id, taskData);
      } else {
        await firestoreService.addTask(taskData);
      }
      fetchTasksAndEmployees(); // Re-fetch to update the list
    } catch (err) {
      console.error("Помилка збереження завдання:", err);
      setError("Не вдалося зберегти завдання.");
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (window.confirm('Ви впевнені, що хочете видалити це завдання?')) {
      try {
        await firestoreService.deleteTask(taskId);
        fetchTasksAndEmployees(); // Re-fetch to update the list
      } catch (err) {
        console.error("Помилка видалення завдання:", err);
        setError("Не вдалося видалити завдання.");
      }
    }
  };

  // Drag-and-Drop Handlers
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, status: 'To Do' | 'In Progress' | 'Done') => {
    e.preventDefault(); // Allows drop
    e.dataTransfer.dropEffect = 'move';
    setDraggedOverColumn(status);
  };

  const handleDragLeave = (_e: React.DragEvent<HTMLDivElement>) => {
    setDraggedOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, targetStatus: 'To Do' | 'In Progress' | 'Done') => {
    e.preventDefault();
    setDraggedOverColumn(null); // Clear highlight

    const taskId = e.dataTransfer.getData('taskId');
    const currentStatus = e.dataTransfer.getData('taskStatus') as 'To Do' | 'In Progress' | 'Done';

    if (currentStatus === targetStatus) {
      return; // No status change, do nothing
    }

    const taskToUpdate = tasks.find(task => task.id === taskId);
    if (taskToUpdate) {
      // Optimistic UI update
      setTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === taskId ? { ...task, status: targetStatus } : task
        )
      );

      try {
        await firestoreService.updateTask(taskId, { status: targetStatus });
        // No need to re-fetch if optimistic update is sufficient,
        // but re-fetch can ensure full data consistency.
        // For this app, let's re-fetch to simplify state management after d&d.
        fetchTasksAndEmployees();
      } catch (err) {
        console.error("Помилка оновлення статусу завдання:", err);
        setError("Не вдалося оновити статус завдання.");
        // Optionally revert UI on error
        setTasks(prevTasks =>
          prevTasks.map(task =>
            task.id === taskId ? { ...task, status: currentStatus } : task
          )
        );
      }
    }
  };

  const tasksToDo = filteredTasks.filter(t => t.status === 'To Do');
  const tasksInProgress = filteredTasks.filter(t => t.status === 'In Progress');
  const tasksDone = filteredTasks.filter(t => t.status === 'Done');

  if (loading) {
    return <div className="text-center p-8">Завантаження завдань...</div>;
  }

  if (error) {
    return <div className="text-center p-8 text-red-500">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-white shrink-0">Управління Завданнями</h1>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-gray-700 p-2 rounded border border-gray-600 text-white"
            aria-label="Filter tasks by status"
          >
            <option value="All">All Statuses</option>
            <option value="To Do">To Do</option>
            <option value="In Progress">In Progress</option>
            <option value="Done">Done</option>
          </select>
          <select
            value={assigneeFilter}
            onChange={e => setAssigneeFilter(e.target.value)}
            className="bg-gray-700 p-2 rounded border border-gray-600 text-white"
            aria-label="Filter tasks by assignee"
          >
            <option value="All">All Assignees</option>
            {employees.filter(e => e.status === 'Active').map(emp => (
              <option key={emp.id} value={emp.id}>{emp.name}</option>
            ))}
          </select>
          <Button variant="primary" onClick={handleAddTask}>Додати нове завдання</Button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* To Do Column */}
        <div
          className={`bg-gray-900 p-4 rounded-lg min-h-[300px] flex flex-col ${draggedOverColumn === 'To Do' ? 'ring-2 ring-indigo-500' : ''}`}
          onDragOver={(e) => handleDragOver(e, 'To Do')}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, 'To Do')}
        >
          <h2 className="text-xl font-semibold mb-4 text-white">До виконання ({tasksToDo.length})</h2>
          <div className="space-y-4 flex-1">
            {tasksToDo.map(task => <TaskCard key={task.id} task={task} onEdit={handleEditTask} onDelete={handleDeleteTask} />)}
          </div>
          {tasksToDo.length === 0 && <p className="text-gray-500 text-center py-4">Немає завдань</p>}
        </div>

        {/* In Progress Column */}
        <div
          className={`bg-gray-900 p-4 rounded-lg min-h-[300px] flex flex-col ${draggedOverColumn === 'In Progress' ? 'ring-2 ring-indigo-500' : ''}`}
          onDragOver={(e) => handleDragOver(e, 'In Progress')}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, 'In Progress')}
        >
          <h2 className="text-xl font-semibold mb-4 text-white">В процесі ({tasksInProgress.length})</h2>
          <div className="space-y-4 flex-1">
            {tasksInProgress.map(task => <TaskCard key={task.id} task={task} onEdit={handleEditTask} onDelete={handleDeleteTask} />)}
          </div>
          {tasksInProgress.length === 0 && <p className="text-gray-500 text-center py-4">Немає завдань</p>}
        </div>

        {/* Done Column */}
        <div
          className={`bg-gray-900 p-4 rounded-lg min-h-[300px] flex flex-col ${draggedOverColumn === 'Done' ? 'ring-2 ring-indigo-500' : ''}`}
          onDragOver={(e) => handleDragOver(e, 'Done')}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, 'Done')}
        >
          <h2 className="text-xl font-semibold mb-4 text-white">Виконано ({tasksDone.length})</h2>
          <div className="space-y-4 flex-1">
            {tasksDone.map(task => <TaskCard key={task.id} task={task} onEdit={handleEditTask} onDelete={handleDeleteTask} />)}
          </div>
          {tasksDone.length === 0 && <p className="text-gray-500 text-center py-4">Немає завдань</p>}
        </div>
      </div>

      {isTaskModalOpen && (
        <TaskModal
          task={editingTask}
          employees={employees}
          onClose={() => setIsTaskModalOpen(false)}
          onSave={handleSaveTask}
        />
      )}
    </div>
  );
};

export default Tasks;