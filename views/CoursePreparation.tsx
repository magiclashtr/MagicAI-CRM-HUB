import React, { useState, useEffect, useCallback } from 'react';
import { Course, CoursePreparation, ChecklistItem } from '../types';
import { firestoreService } from '../services/firestoreService';
import Button from '../components/Button';

const DEFAULT_CHECKLIST_ITEMS: Omit<ChecklistItem, 'id'>[] = [
  { label: 'Перевірити оплати студентів', checked: false },
  { label: 'Підготувати та роздрукувати навчальні матеріали', checked: false },
  { label: 'Підтвердити бронювання аудиторії/онлайн-платформи', checked: false },
  { label: 'Надіслати нагадування студентам про старт', checked: false },
  { label: 'Підтвердити готовність викладача', checked: false },
  { label: 'Перевірити наявність витратних матеріалів', checked: false },
];

const getStatusColor = (progress: number) => {
  if (progress === 100) return 'bg-green-500';
  if (progress > 0) return 'bg-yellow-500';
  return 'bg-red-500';
};

const CoursePreparationCard: React.FC<{
  prep: CoursePreparation;
  onUpdate: (id: string, checklist: ChecklistItem[]) => void;
}> = ({ prep, onUpdate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [newChecklistItemLabel, setNewChecklistItemLabel] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemLabel, setEditingItemLabel] = useState('');

  const calculateProgress = (checklist: ChecklistItem[]) => {
    const checkedCount = checklist.filter(item => item.checked).length;
    return Math.round((checkedCount / checklist.length) * 100) || 0;
  };

  const handleChecklistChange = (itemId: string) => {
    const updatedChecklist = prep.checklist.map(item =>
      item.id === itemId ? { ...item, checked: !item.checked } : item
    );
    onUpdate(prep.id, updatedChecklist);
  };

  const handleAddChecklistItem = () => {
    if (newChecklistItemLabel.trim()) {
      const newItem: ChecklistItem = {
        id: Date.now().toString(),
        label: newChecklistItemLabel.trim(),
        checked: false,
      };
      const updatedChecklist = [...prep.checklist, newItem];
      onUpdate(prep.id, updatedChecklist);
      setNewChecklistItemLabel('');
    }
  };

  const handleEditClick = (item: ChecklistItem) => {
    setEditingItemId(item.id);
    setEditingItemLabel(item.label);
  };

  const handleSaveEdit = (itemId: string) => {
    if (editingItemLabel.trim()) {
      const updatedChecklist = prep.checklist.map(item =>
        item.id === itemId ? { ...item, label: editingItemLabel.trim() } : item
      );
      onUpdate(prep.id, updatedChecklist);
      setEditingItemId(null);
      setEditingItemLabel('');
    } else {
      alert("Назва пункту не може бути порожньою.");
    }
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
    setEditingItemLabel('');
  };

  const handleDeleteChecklistItem = (itemId: string) => {
    if (window.confirm('Ви впевнені, що хочете видалити цей пункт чек-листа?')) {
      const updatedChecklist = prep.checklist.filter(item => item.id !== itemId);
      onUpdate(prep.id, updatedChecklist);
    }
  };

  const daysUntilStart = Math.ceil((new Date(prep.startDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className="bg-gray-800 rounded-lg shadow-md">
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-700"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-4">
          <div className={`w-3 h-3 rounded-full ${getStatusColor(prep.progress)}`}></div>
          <div>
            <h3 className="font-bold text-white">{prep.courseName}</h3>
            <p className="text-sm text-gray-400">
              Старт через {daysUntilStart} {daysUntilStart === 1 ? 'день' : 'днів'} ({prep.startDate})
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
            <span className="text-sm font-semibold text-indigo-400">{prep.progress}%</span>
            <svg className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
        </div>
      </div>
      {isOpen && (
        <div className="p-6 border-t border-gray-700">
            <h4 className="font-semibold mb-3">Чек-лист підготовки:</h4>
            <div className="space-y-2">
                {prep.checklist.map(item => (
                    <div key={item.id} className="flex items-center space-x-3 p-2 rounded hover:bg-gray-700/50">
                        <input
                            type="checkbox"
                            checked={item.checked}
                            onChange={() => handleChecklistChange(item.id)}
                            className="w-5 h-5 bg-gray-600 border-gray-500 rounded text-indigo-500 focus:ring-indigo-600"
                        />
                        {editingItemId === item.id ? (
                          <input
                            type="text"
                            value={editingItemLabel}
                            onChange={(e) => setEditingItemLabel(e.target.value)}
                            onBlur={() => handleSaveEdit(item.id)}
                            onKeyPress={(e) => { if (e.key === 'Enter') handleSaveEdit(item.id); }}
                            className="flex-1 bg-gray-600 p-1 rounded border border-gray-500 text-sm"
                            autoFocus
                          />
                        ) : (
                          <span className={`${item.checked ? 'text-gray-500 line-through' : 'text-gray-200'} flex-1`}>
                              {item.label}
                          </span>
                        )}
                        <div className="flex space-x-2">
                            {editingItemId === item.id ? (
                                <Button size="sm" variant="ghost" onClick={handleCancelEdit}>Скасувати</Button>
                            ) : (
                                <Button size="sm" variant="secondary" onClick={() => handleEditClick(item)}>Редагувати</Button>
                            )}
                            <Button size="sm" variant="danger" onClick={() => handleDeleteChecklistItem(item.id)}>Видалити</Button>
                        </div>
                    </div>
                ))}
            </div>
            <div className="flex items-center space-x-3 mt-4 pt-4 border-t border-gray-700">
                <input
                    type="text"
                    placeholder="Додати новий пункт..."
                    value={newChecklistItemLabel}
                    onChange={(e) => setNewChecklistItemLabel(e.target.value)}
                    onKeyPress={(e) => { if (e.key === 'Enter') handleAddChecklistItem(); }}
                    className="flex-1 bg-gray-700 p-2 rounded border border-gray-600 text-gray-100"
                />
                <Button variant="primary" onClick={handleAddChecklistItem}>Додати пункт</Button>
            </div>
        </div>
      )}
    </div>
  );
};

const CoursePreparationView: React.FC = () => {
  const [preparations, setPreparations] = useState<CoursePreparation[]>([]);
  const [loading, setLoading] = useState(true);

  const syncPreparations = useCallback(async () => {
    setLoading(true);
    try {
      const courses = await firestoreService.getCourses();
      const existingPreps = await firestoreService.getCoursePreparations();
      
      const upcomingCourses = courses.filter(course => {
        const startDate = new Date(course.startDate);
        const today = new Date();
        const fourteenDaysFromNow = new Date();
        fourteenDaysFromNow.setDate(today.getDate() + 14);
        return startDate >= today && startDate <= fourteenDaysFromNow;
      });

      const prepsToCreate = upcomingCourses.filter(
        course => !existingPreps.some(prep => prep.courseId === course.id)
      );

      if (prepsToCreate.length > 0) {
        const creationPromises = prepsToCreate.map(course => {
          const newPrep: Omit<CoursePreparation, 'id'> = {
            courseId: course.id,
            courseName: course.name,
            startDate: course.startDate,
            teacherName: course.teacherName,
            type: course.type,
            progress: 0,
            checklist: DEFAULT_CHECKLIST_ITEMS.map((item, index) => ({ ...item, id: `${Date.now()}-${index}` })),
          };
          return firestoreService.addCoursePreparation(newPrep);
        });
        await Promise.all(creationPromises);
      }

      // Fetch all preps again to get a fresh list
      const allPreps = await firestoreService.getCoursePreparations();
      // Filter only for courses that are still upcoming
      const relevantPreps = allPreps.filter(p => new Date(p.startDate) >= new Date());
      setPreparations(relevantPreps.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()));

    } catch (error) {
      console.error("Error syncing course preparations:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    syncPreparations();
  }, [syncPreparations]);

  const handleUpdateChecklist = async (prepId: string, updatedChecklist: ChecklistItem[]) => {
    const checkedCount = updatedChecklist.filter(item => item.checked).length;
    const newProgress = Math.round((checkedCount / (updatedChecklist.length || 1)) * 100); // Avoid division by zero
    
    // Optimistic UI update
    setPreparations(prev =>
      prev.map(p =>
        p.id === prepId ? { ...p, checklist: updatedChecklist, progress: newProgress } : p
      )
    );

    await firestoreService.updateCoursePreparation(prepId, {
      checklist: updatedChecklist,
      progress: newProgress,
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="bg-gray-800 p-4 rounded-lg shrink-0">
        <h2 className="text-xl font-bold mb-2">Підготовка до Курсів ("Світлофор")</h2>
        <p className="text-sm text-gray-400">
          Автоматизований контроль готовності до запуску курсів. Тут показані всі курси, що стартують протягом 14 днів.
        </p>
      </div>
      
      <div className="flex-1 overflow-y-auto mt-6 pr-2">
        {loading ? (
            <div className="text-center p-8">Синхронізація підготовки до курсів...</div>
        ) : preparations.length > 0 ? (
            <div className="space-y-4">
                {preparations.map(prep => (
                    <CoursePreparationCard key={prep.id} prep={prep} onUpdate={handleUpdateChecklist} />
                ))}
            </div>
        ) : (
            <div className="text-center bg-gray-800 p-8 rounded-lg">
                <p>Немає курсів, що потребують підготовки найближчим часом.</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default CoursePreparationView;
