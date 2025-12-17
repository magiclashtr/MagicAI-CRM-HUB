import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Student, Course, Employee, Currency, PaymentHistory, Note, EnrolledCourse, StudentSource, CourseTemplate } from '../types';
import { firestoreService } from '../services/firestoreService';
import { geminiService } from '../services/geminiService';
import { formatCurrency, PAYMENT_METHODS } from '../constants';
import Button from '../components/Button';

type Tab = 'students' | 'employees' | 'courses';

// =============================================================================
// ICONS
// =============================================================================
const ChevronDownIcon: React.FC<{ className?: string }> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>;
const PhoneIcon: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" /></svg>;
const EmailIcon: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" /></svg>;
const MessageIcon: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.76 9.76 0 0 1-2.53-2.218l-1.002-1.002a2.25 2.25 0 0 0-3.182 0l-1.002 1.002A9.76 9.76 0 0 1 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" /></svg>;
const UserIcon: React.FC<{ className?: string }> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>;
const CourseIcon: React.FC<{ className?: string }> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}><path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 0 0-.491 6.347A48.627 48.627 0 0 1 12 20.902a48.627 48.627 0 0 1 8.232-4.408 60.426 60.426 0 0 0-.491-6.347m-15.482 0l1.391-.521A11.233 11.233 0 0 1 12 9.80c4.833 0 8.842 3.047 10.687 7.256v2.271m-15.482 0zM12 18.807v2.095m0-11.758V7.5M6 10.147l2.28-2.28m4.26-2.262 2.28 2.28M18 10.147l-2.28-2.28" /></svg>;
const EmployeeIcon: React.FC<{ className?: string }> = ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-4.663M12 12a4.5 4.5 0 0 1 4.5-4.5 4.5 4.5 0 0 1 4.5 4.5 4.5 4.5 0 0 1-4.5-4.5ZM12 12a2.25 2.25 0 0 0-2.25 2.25m2.25-2.25a2.25 2.25 0 0 0 2.25 2.25M12 12a2.25 2.25 0 0 0-2.25-2.25M12 12a2.25 2.25 0 0 0 2.25-2.25" /></svg>;
const TrashIcon: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.067-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>;
const EditIcon: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /></svg>;

// =============================================================================
// MODALS
// =============================================================================

// Add/Edit Student Modal
const AddEditStudentModal: React.FC<{
  student: Student | null;
  courses: Course[];
  onClose: () => void;
  onSave: (studentData: Student | Omit<Student, 'id'>) => Promise<void>;
  currency: Currency;
}> = ({ student, courses, onClose, onSave, currency }) => {
  const [formData, setFormData] = useState<any>(() => {
    const defaultData = {
      name: '', email: '', phone: '', messenger: '', source: '',
      registrationDate: new Date().toISOString().split('T')[0],
      managerUid: 'margarita-g-id', // Default manager
      status: 'Pending',
      notes: [],
      enrolledCourses: [],
      avatar: '',
    };
    const studentData = student ? { ...student } : defaultData;
    // FIX: Create a new object for the form state, combining student data with the UI-specific 'selectedCourseIds' property to resolve the type error.
    return {
      ...studentData,
      avatar: student?.avatar || '',
      selectedCourseIds: student?.enrolledCourses.map(c => c.courseId) || [],
    };
  });
  const [sources, setSources] = useState<StudentSource[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState(student?.avatar || '');

  useEffect(() => {
    firestoreService.getStudentSources().then(setSources);
  }, []);

  useEffect(() => {
    let objectUrl: string | null = null;
    if (imageFile) {
        objectUrl = URL.createObjectURL(imageFile);
        setPreviewUrl(objectUrl);
    }
    return () => {
        if (objectUrl) {
            URL.revokeObjectURL(objectUrl);
        }
    };
  }, [imageFile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            alert("File is too large. Please select an image smaller than 5MB.");
            return;
        }
        setImageFile(file);
    }
  };

  const handleRemoveImage = () => {
      setImageFile(null);
      setPreviewUrl('');
      setFormData((prev: any) => ({ ...prev, avatar: '' }));
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCourseChange = (courseId: string) => {
    setFormData((prev: any) => {
      const selectedCourseIds = prev.selectedCourseIds.includes(courseId)
        ? prev.selectedCourseIds.filter((id: string) => id !== courseId)
        : [...prev.selectedCourseIds, courseId];
      return { ...prev, selectedCourseIds };
    });
  };

  const handleSourceChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { value } = e.target;
    if (value === '--add-new--') {
      const newSourceName = window.prompt("Enter new source name:");
      if (newSourceName) {
        try {
          const newSourceRef = await firestoreService.addStudentSource({ name: newSourceName });
          const newSource = { id: newSourceRef.id, name: newSourceName };
          setSources(prev => [...prev, newSource]);
          setFormData((prev: any) => ({ ...prev, source: newSourceName }));
        } catch (error) {
          console.error("Error adding new source:", error);
        }
      }
    } else {
      handleChange(e);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    let finalStudentData = { ...formData };

    if (imageFile) {
        try {
            const studentId = student?.id || `new_student_${Date.now()}`;
            const imagePath = `avatars/students/${studentId}_${imageFile.name}`;
            const downloadURL = await firestoreService.uploadImage(imageFile, imagePath);
            finalStudentData.avatar = downloadURL;
        } catch (error) {
            console.error("Image upload failed:", error);
            alert("Could not upload the avatar. Please try again.");
            return;
        }
    }

    const { selectedCourseIds, ...studentData } = finalStudentData;
    const currentCourseIds = student?.enrolledCourses.map(c => c.courseId) || [];
    const coursesToAddIds = selectedCourseIds.filter((id: string) => !currentCourseIds.includes(id));
    
    const newEnrolledCourses: EnrolledCourse[] = coursesToAddIds.map((courseId: string) => {
      const course = courses.find(c => c.id === courseId);
      if (!course) throw new Error("Course not found during enrollment");
      return {
        courseId: course.id,
        courseName: course.name,
        startDate: course.startDate,
        price: course.price,
        pricePaid: 0,
        priceDue: course.price,
        paymentStatus: 'Pending',
        progress: 0,
        paymentHistory: [],
      };
    });
    
    studentData.enrolledCourses = [...(student?.enrolledCourses || []), ...newEnrolledCourses];
    await onSave(studentData);
  };

  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const availableCourses = courses.filter(course => new Date(course.startDate) >= fourteenDaysAgo);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4">
      <div className="bg-gray-800 p-8 rounded-lg w-full max-w-3xl max-h-[90vh] flex flex-col">
        <h2 className="text-2xl font-bold mb-6">{student ? 'Edit Student' : 'Register New Student'}</h2>
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto pr-4 space-y-4">
          <div className="flex flex-col items-center gap-4 mb-6">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageChange}
                accept="image/png, image/jpeg, image/gif"
                className="hidden"
            />
            <div className="relative">
                {previewUrl ? (
                    <img src={previewUrl} alt="Avatar Preview" className="w-24 h-24 rounded-full object-cover border-2 border-gray-600" />
                ) : (
                    <div className="w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center border-2 border-gray-600 border-dashed">
                        <UserIcon className="w-10 h-10 text-gray-500" />
                    </div>
                )}
                {previewUrl && (
                    <button 
                        type="button" 
                        onClick={handleRemoveImage}
                        className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-700 transition-colors shadow-sm"
                        title="Remove image"
                    >
                        &times;
                    </button>
                )}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                {previewUrl ? 'Change Photo' : 'Upload Photo'}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input name="name" value={formData.name} onChange={handleChange} placeholder="Full Name" className="w-full bg-gray-700 p-3 rounded" required />
            <input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="Email" className="w-full bg-gray-700 p-3 rounded" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input name="phone" value={formData.phone} onChange={handleChange} placeholder="Phone" className="w-full bg-gray-700 p-3 rounded" />
            <input name="messenger" value={formData.messenger} onChange={handleChange} placeholder="@username or link" className="w-full bg-gray-700 p-3 rounded" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select name="source" value={formData.source} onChange={handleSourceChange} className="w-full bg-gray-700 p-3 rounded">
              <option value="" disabled>Select a source</option>
              {sources.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              <option value="--add-new--" className="text-indigo-400">-- Add New Source --</option>
            </select>
            <select name="status" value={formData.status} onChange={handleChange} className="w-full bg-gray-700 p-3 rounded">
              <option>Active</option><option>Pending</option><option>Graduated</option><option>Dropped</option>
            </select>
          </div>
          <div>
            <h3 className="text-lg font-semibold my-4">Courses</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableCourses.map(course => (
                <label key={course.id} className="bg-gray-700 p-3 rounded-lg flex items-center space-x-3 cursor-pointer">
                  <input type="checkbox" checked={formData.selectedCourseIds.includes(course.id)} onChange={() => handleCourseChange(course.id)} className="w-5 h-5 bg-gray-600 border-gray-500 rounded text-indigo-500 focus:ring-indigo-600" />
                  <div>
                    <p className="font-bold">{course.name}</p>
                    <p className="text-xs text-gray-400">{course.teacherName} | {course.startDate}</p>
                    <p className="text-sm font-semibold text-indigo-400">{formatCurrency(course.price, currency)}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </form>
        <div className="flex justify-end space-x-4 pt-6 mt-4 border-t border-gray-700">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSave}>{student ? 'Save Changes' : 'Register Student'}</Button>
        </div>
      </div>
    </div>
  );
};


// Add/Edit Employee Modal
const AddEditEmployeeModal: React.FC<{
    employee: Employee | null;
    onClose: () => void;
    onSave: (employeeData: Employee | Omit<Employee, 'id'>) => Promise<void>;
}> = ({ employee, onClose, onSave }) => {
    const [formData, setFormData] = useState<Employee | Omit<Employee, 'id'>>(() =>
        employee || { name: '', email: '', phone: '', role: 'Trainer', salary: 0, hireDate: new Date().toISOString().split('T')[0], biography: '', specializations: [], avatar: '', status: 'Active', order: 0 }
    );
    const [isGeneratingBio, setIsGeneratingBio] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState(employee?.avatar || '');

    useEffect(() => {
        let objectUrl: string | null = null;
        if (imageFile) {
            objectUrl = URL.createObjectURL(imageFile);
            setPreviewUrl(objectUrl);
        }
        return () => {
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [imageFile]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        if (name === 'specializations') {
             setFormData(prev => ({ ...prev, [name]: value.split(',').map(s => s.trim()) }));
        } else {
             // Prevent NaN from being set in state, which Firestore rejects.
             setFormData(prev => ({ ...prev, [name]: type === 'number' ? (Number(value) || 0) : value }));
        }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                alert("File is too large. Please select an image smaller than 5MB.");
                return;
            }
            setImageFile(file);
        }
    };

    const triggerImageUpload = () => {
        fileInputRef.current?.click();
    };
    
    const handleGenerateBio = async () => {
        setIsGeneratingBio(true);
        try {
            const bio = await geminiService.generateEmployeeBio(formData.name, formData.role, formData.specializations);
            setFormData(prev => ({...prev, biography: bio}));
        } catch (error) {
            console.error("Failed to generate bio:", error);
        } finally {
            setIsGeneratingBio(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        let finalData = { ...formData };

        if (imageFile) {
            try {
                const employeeId = 'id' in finalData ? finalData.id : `new_${Date.now()}`;
                const imagePath = `avatars/${employeeId}_${imageFile.name}`;
                const downloadURL = await firestoreService.uploadImage(imageFile, imagePath);
                finalData.avatar = downloadURL;
            } catch (error) {
                console.error("Image upload failed:", error);
                alert("Could not upload the new avatar. Please try again.");
                return;
            }
        }
        await onSave(finalData);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4">
            <div className="bg-gray-800 p-8 rounded-lg w-full max-w-3xl max-h-[90vh] flex flex-col">
                <h2 className="text-2xl font-bold mb-6">{employee ? 'Редагувати співробітника' : 'Додати нового співробітника'}</h2>
                <form onSubmit={handleSave} className="flex-1 overflow-y-auto pr-4 space-y-4">
                    <div className="flex flex-col items-center gap-4 mb-4">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleImageChange}
                            accept="image/png, image/jpeg, image/gif"
                            className="hidden"
                        />
                        <div className="relative cursor-pointer" onClick={triggerImageUpload}>
                            {previewUrl ? (
                                <img src={previewUrl} alt="Avatar" className="w-24 h-24 rounded-full object-cover" />
                            ) : (
                                <div className="w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center">
                                    <UserIcon className="w-12 h-12 text-gray-500" />
                                </div>
                            )}
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={triggerImageUpload}>
                            Змінити фото
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input name="name" value={formData.name} onChange={handleChange} placeholder="Повне ім'я" className="w-full bg-gray-700 p-3 rounded" required />
                        <input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="Email" className="w-full bg-gray-700 p-3 rounded" />
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input name="phone" value={formData.phone} onChange={handleChange} placeholder="Phone" className="w-full bg-gray-700 p-3 rounded" />
                         <select name="role" value={formData.role} onChange={handleChange} className="w-full bg-gray-700 p-3 rounded">
                            <option>Trainer</option><option>Support</option><option>Admin</option><option>Master</option><option>Manager</option><option>Creator</option><option>Master Artist</option><option>Marketing Manager</option><option>IT Support</option>
                        </select>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input name="salary" type="number" value={formData.salary} onChange={handleChange} placeholder="Salary (USD/month)" className="w-full bg-gray-700 p-3 rounded" />
                        <input name="hireDate" type="date" value={formData.hireDate} onChange={handleChange} className="w-full bg-gray-700 p-3 rounded" />
                    </div>
                    <div>
                        <input name="specializations" value={formData.specializations.join(', ')} onChange={handleChange} placeholder="Specializations (comma-separated)" className="w-full bg-gray-700 p-3 rounded" />
                    </div>
                     <div>
                        <textarea name="biography" value={formData.biography} onChange={handleChange} placeholder="Biography" className="w-full bg-gray-700 p-3 rounded h-24" />
                        <Button type="button" variant="outline" size="sm" onClick={handleGenerateBio} isLoading={isGeneratingBio}>Generate Bio (AI)</Button>
                    </div>
                </form>
                <div className="flex justify-end space-x-4 pt-6 mt-4 border-t border-gray-700">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button variant="primary" onClick={handleSave}>{employee ? 'Save Changes' : 'Add Employee'}</Button>
                </div>
            </div>
        </div>
    );
};


// Add/Edit Course Modal
const CourseModal: React.FC<{
  course: Course | null;
  employees: Employee[];
  courseTemplates: CourseTemplate[];
  onClose: () => void;
  onSave: (courseData: Course | Omit<Course, 'id'>) => Promise<void>;
}> = ({ course, employees, courseTemplates, onClose, onSave }) => {
    const [formData, setFormData] = useState<Course | Omit<Course, 'id'>>(() => {
       const defaultName = courseTemplates.length > 0 ? courseTemplates[0].name : '';
       return course || {
            name: defaultName,
            description: '', image: '', teacherId: '', teacherName: '',
            duration: '', price: 0, startDate: new Date().toISOString().split('T')[0], type: 'Ochnyy'
       };
    });
    const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);

    const courseNameOptions = useMemo(() => {
        const options = [...courseTemplates];
        if (course && !options.some(t => t.name === course.name)) {
            // Add the current course's name to the list if it's not a standard template
            options.push({ id: course.id, name: course.name });
        }
        return options.sort((a,b) => a.name.localeCompare(b.name));
    }, [courseTemplates, course]);

    useEffect(() => {
        if (course) setFormData(course);
    }, [course]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        if (name === 'teacherId') {
            const selectedTeacher = employees.find(emp => emp.id === value);
            setFormData(prev => ({...prev, teacherId: value, teacherName: selectedTeacher?.name || '' }));
        } else {
             // Prevent NaN from being set in state, which Firestore rejects.
             setFormData(prev => ({ ...prev, [name]: type === 'number' ? (Number(value) || 0) : value }));
        }
    };
    
    const handleGenerateDescription = async () => {
        if (!formData.name) return;
        setIsGeneratingDesc(true);
        try {
            const desc = await geminiService.generateCourseDescription(formData.name);
            setFormData(prev => ({...prev, description: desc}));
        } catch (error) {
            console.error("Failed to generate description:", error);
        } finally {
            setIsGeneratingDesc(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSave(formData);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4">
            <div className="bg-gray-800 p-8 rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
                <h2 className="text-2xl font-bold mb-6">{course ? 'Edit Course' : 'Add New Course'}</h2>
                <form onSubmit={handleSave} className="flex-1 overflow-y-auto pr-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <select name="name" value={formData.name} onChange={handleChange} className="w-full bg-gray-700 p-3 rounded" required>
                             {courseNameOptions.map(template => <option key={template.id} value={template.name}>{template.name}</option>)}
                        </select>
                         <select name="teacherId" value={formData.teacherId} onChange={handleChange} className="w-full bg-gray-700 p-3 rounded" required>
                            <option value="" disabled>Select a Teacher</option>
                             {employees.filter(e => e.role === 'Trainer' || e.role === 'Master').map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                        </select>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <input name="price" type="number" value={formData.price} onChange={handleChange} placeholder="Price (USD)" className="w-full bg-gray-700 p-3 rounded" />
                        <input name="startDate" type="date" value={formData.startDate} onChange={handleChange} className="w-full bg-gray-700 p-3 rounded" />
                         <select name="type" value={formData.type} onChange={handleChange} className="w-full bg-gray-700 p-3 rounded">
                            <option>Ochnyy</option><option>Online</option><option>Specialized</option><option>Workshop</option>
                        </select>
                    </div>
                     <input name="duration" value={formData.duration} onChange={handleChange} placeholder="Duration (e.g., 5 days, 3 hours)" className="w-full bg-gray-700 p-3 rounded" />
                     <div>
                        <textarea name="description" value={formData.description} onChange={handleChange} placeholder="Description" className="w-full bg-gray-700 p-3 rounded h-24" />
                        <Button type="button" variant="outline" size="sm" onClick={handleGenerateDescription} isLoading={isGeneratingDesc}>Generate with AI</Button>
                    </div>
                </form>
                 <div className="flex justify-end space-x-4 pt-6 mt-4 border-t border-gray-700">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button variant="primary" onClick={handleSave}>{course ? 'Save Course' : 'Add Course'}</Button>
                </div>
            </div>
        </div>
    );
};


// Course Template Manager Modal
const CourseTemplateModal: React.FC<{
  templates: CourseTemplate[];
  onClose: () => void;
  onSave: (templates: CourseTemplate[]) => Promise<void>;
}> = ({ templates, onClose, onSave }) => {
    const [localTemplates, setLocalTemplates] = useState<CourseTemplate[]>(JSON.parse(JSON.stringify(templates)));
    const [newTemplateName, setNewTemplateName] = useState('');

    const handleNameChange = (id: string, newName: string) => {
        setLocalTemplates(prev => prev.map(t => t.id === id ? { ...t, name: newName } : t));
    };

    const handleAddTemplate = async () => {
        if (!newTemplateName.trim()) return;
        try {
            const newRef = await firestoreService.addCourseTemplate({ name: newTemplateName.trim() });
            setLocalTemplates(prev => [...prev, { id: newRef.id, name: newTemplateName.trim() }]);
            setNewTemplateName('');
        } catch (error) {
            console.error("Error adding template:", error);
        }
    };
    
    const handleUpdateTemplate = async (template: CourseTemplate) => {
       await firestoreService.updateCourseTemplate(template.id, { name: template.name });
    };

    const handleDeleteTemplate = async (id: string) => {
        if (window.confirm("Are you sure you want to delete this course name? This cannot be undone.")) {
            try {
                await firestoreService.deleteCourseTemplate(id);
                setLocalTemplates(prev => prev.filter(t => t.id !== id));
            } catch (error) {
                console.error("Error deleting template:", error);
            }
        }
    };
    
    const handleClose = () => {
        // Here we don't call the onSave prop because changes are made live.
        // The parent component should re-fetch.
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4">
            <div className="bg-gray-800 p-8 rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
                <h2 className="text-2xl font-bold mb-6">Manage Course Names List</h2>
                <div className="flex-1 overflow-y-auto space-y-3 pr-2 mb-4">
                    {localTemplates.map(template => (
                        <div key={template.id} className="flex items-center gap-2 bg-gray-700 p-2 rounded">
                            <input
                                type="text"
                                value={template.name}
                                onChange={e => handleNameChange(template.id, e.target.value)}
                                onBlur={() => handleUpdateTemplate(template)}
                                className="flex-grow bg-gray-600 p-2 rounded border border-gray-500"
                            />
                            <Button variant="danger" size="sm" onClick={() => handleDeleteTemplate(template.id)}><TrashIcon /></Button>
                        </div>
                    ))}
                </div>
                <div className="flex items-center gap-2 pt-4 border-t border-gray-700">
                    <input
                        type="text"
                        placeholder="Add new course name"
                        value={newTemplateName}
                        onChange={e => setNewTemplateName(e.target.value)}
                        className="flex-grow bg-gray-700 p-2 rounded"
                    />
                    <Button variant="primary" onClick={handleAddTemplate}>Add Name</Button>
                </div>
                 <div className="flex justify-end pt-6 mt-4 border-t border-gray-700">
                    <Button variant="secondary" onClick={handleClose}>Close</Button>
                </div>
            </div>
        </div>
    );
};



// Note Modal
const NoteModal: React.FC<{
  studentId: string;
  onClose: () => void;
  onSave: (studentId: string, content: string) => Promise<void>;
}> = ({ studentId, onClose, onSave }) => {
    const [content, setContent] = useState('');
    const handleSave = async () => {
        if (content.trim()) {
            await onSave(studentId, content.trim());
        }
    };
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4">
            <div className="bg-gray-800 p-8 rounded-lg w-full max-w-lg">
                <h2 className="text-2xl font-bold mb-6">Add New Note</h2>
                <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Note content..." className="w-full bg-gray-700 p-3 rounded h-32" />
                <div className="flex justify-end space-x-4 pt-4">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button variant="primary" onClick={handleSave}>Save Note</Button>
                </div>
            </div>
        </div>
    );
};

// Payment Modal
const PaymentModal: React.FC<{
  student: Student;
  enrolledCourse: EnrolledCourse;
  onClose: () => void;
  onSave: (studentId: string, courseIdentifier: string, payment: Omit<PaymentHistory, 'id'>) => Promise<void>;
  currency: Currency;
}> = ({ student, enrolledCourse, onClose, onSave, currency }) => {
    const [amount, setAmount] = useState(enrolledCourse.priceDue > 0 ? enrolledCourse.priceDue : 0);
    const [method, setMethod] = useState(PAYMENT_METHODS[0]);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    const handleSave = () => {
        if (amount > 0) {
            onSave(student.id, enrolledCourse.courseId, { date, amount, method, courseName: enrolledCourse.courseName });
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4">
            <div className="bg-gray-800 p-8 rounded-lg w-full max-w-lg">
                <h2 className="text-2xl font-bold mb-4">Record Payment</h2>
                 <div className="bg-gray-700 p-3 rounded-lg mb-6 text-sm">
                    <div className="flex justify-between items-center">
                        <span className="text-gray-400">Student:</span>
                        <span className="font-semibold text-white">{student.name}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-gray-400">Course:</span>
                        <span className="font-semibold text-white">{enrolledCourse.courseName}</span>
                    </div>
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-600">
                        <span className="text-gray-400">Amount Due:</span>
                        <span className="font-semibold text-red-400">{formatCurrency(Number(enrolledCourse.priceDue), currency)}</span>
                    </div>
                </div>
                <div className="space-y-4">
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-gray-700 p-3 rounded" />
                    <input type="number" value={amount} onChange={e => setAmount(parseFloat(e.target.value))} placeholder="Amount" className="w-full bg-gray-700 p-3 rounded" />
                    <select value={method} onChange={e => setMethod(e.target.value)} className="w-full bg-gray-700 p-3 rounded">
                        {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
                    </select>
                </div>
                <div className="flex justify-end space-x-4 pt-6 mt-4 border-t border-gray-700">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button variant="primary" onClick={handleSave}>Save Payment</Button>
                </div>
            </div>
        </div>
    );
};


// =============================================================================
// ACCORDION ITEMS
// =============================================================================

const StudentAccordionItem: React.FC<{
  student: Student;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: (student: Student) => void;
  onDelete: (id: string) => void;
  onAddNote: (id: string) => void;
  onAddPayment: (student: Student, enrolledCourse: EnrolledCourse) => void;
  currency: Currency;
}> = ({ student, isExpanded, onToggle, onEdit, onDelete, onAddNote, onAddPayment, currency }) => {
    const [showHistoryForCourse, setShowHistoryForCourse] = useState<string | null>(null);
    const [aiAdvice, setAiAdvice] = useState<string | null>(null);
    const [isLoadingAdvice, setIsLoadingAdvice] = useState(false);

    const consolidatedPaymentHistory = useMemo(() => {
        if (!student.enrolledCourses) {
            return [];
        }

        const allPayments = student.enrolledCourses.flatMap(course => course.paymentHistory);

        // Sort by date, most recent first
        return allPayments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [student.enrolledCourses]);

    const fetchAiAdvice = useCallback(async () => {
        setIsLoadingAdvice(true);
        setAiAdvice(null);
        try {
            const advice = await geminiService.getStudentAdvice(student);
            setAiAdvice(advice);
        } catch (error) {
            console.error("Failed to fetch AI advice:", error);
            setAiAdvice("An error occurred while generating advice. Please try again.");
        } finally {
            setIsLoadingAdvice(false);
        }
    }, [student]);

    return (
        <div className="bg-gray-800 rounded-lg">
            <div className="flex items-center p-4 cursor-pointer hover:bg-gray-700/50" onClick={onToggle}>
                {/* Avatar Display */}
                <div className="mr-4 flex-shrink-0">
                    {student.avatar ? (
                        <img src={student.avatar} alt={student.name} className="w-12 h-12 rounded-full object-cover border border-gray-600" />
                    ) : (
                        <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center border border-gray-600">
                            <span className="text-xl font-bold text-gray-400">{student.name.charAt(0).toUpperCase()}</span>
                        </div>
                    )}
                </div>
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${student.status === 'Graduated' ? 'bg-green-700 text-green-200' : student.status === 'Active' ? 'bg-blue-700 text-blue-200' : 'bg-yellow-700 text-yellow-200'}`}>
                    {student.status}
                </span>
                <div className="flex-1 ml-4">
                    <p className="font-bold text-white">{student.name}</p>
                    <p className="text-sm text-gray-400">{student.email}</p>
                </div>
                <ChevronDownIcon className={`w-6 h-6 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </div>
            {isExpanded && (
                <div className="p-6 border-t border-gray-700 space-y-6">
                    {/* Contact Info & Notes */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                         <div className="space-y-3">
                            <h4 className="text-lg font-semibold text-white border-b border-gray-600 pb-2">Контактна інформація</h4>
                            <div className="flex items-center gap-4 text-indigo-400">
                                <a href={`tel:${student.phone}`} title="Call" className={!student.phone ? "opacity-50 cursor-not-allowed" : "hover:text-indigo-300"}><PhoneIcon/></a>
                                <a href={`sms:${student.phone}`} title="SMS" className={!student.phone ? "opacity-50 cursor-not-allowed" : "hover:text-indigo-300"}><MessageIcon/></a>
                                <a href={`mailto:${student.email}`} title="Email" className={!student.email ? "opacity-50 cursor-not-allowed" : "hover:text-indigo-300"}><EmailIcon/></a>
                            </div>
                             <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                                <span className="text-gray-400">Телефон:</span><span className="text-white">{student.phone || 'N/A'}</span>
                                <span className="text-gray-400">Email:</span><span className="text-white">{student.email || 'N/A'}</span>
                                <span className="text-gray-400">Messenger:</span><span className="text-white">{student.messenger || 'N/A'}</span>
                                <span className="text-gray-400">Джерело:</span><span className="text-white">{student.source || 'N/A'}</span>
                                <span className="text-gray-400">Дата реєстрації:</span><span className="text-white">{student.registrationDate}</span>
                            </div>
                         </div>
                         <div className="space-y-3">
                            <div className="flex justify-between items-center border-b border-gray-600 pb-2">
                                <h4 className="text-lg font-semibold text-white">Нотатки</h4>
                                <Button size="sm" variant="outline" onClick={() => onAddNote(student.id)}>Додати нотатку</Button>
                            </div>
                             <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                                {student.notes.length > 0 ? student.notes.slice().reverse().map(note => (
                                    <div key={note.id} className="text-sm bg-gray-700/50 p-2 rounded">
                                        <p className="text-gray-400 text-xs">{note.date}</p>
                                        <p className="text-white">{note.content}</p>
                                    </div>
                                )) : <p className="text-sm text-gray-500 italic">Нотаток немає.</p>}
                            </div>
                         </div>
                    </div>
                    {/* Consolidated Payment History */}
                    <div>
                        <h4 className="text-lg font-semibold text-white border-b border-gray-600 pb-2 mb-4">Загальна історія платежів</h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                            {consolidatedPaymentHistory.length > 0 ? consolidatedPaymentHistory.map(payment => (
                                <div key={payment.id} className="grid grid-cols-4 gap-4 items-center text-sm bg-gray-900/50 p-2 rounded">
                                    <span className="text-gray-400">{payment.date}</span>
                                    <span className="font-semibold text-white col-span-2">{payment.courseName}</span>
                                    <span className="text-green-400 font-medium text-right">{formatCurrency(Number(payment.amount), currency)}</span>
                                </div>
                            )) : <p className="text-sm text-gray-500 italic">Історія платежів порожня.</p>}
                        </div>
                    </div>
                    {/* AI Advisor Section */}
                    <div>
                        <h4 className="text-lg font-semibold text-white border-b border-gray-600 pb-2 mb-4">Magic.Advisor Порада</h4>
                        {isLoadingAdvice ? (
                            <div className="text-center p-4">
                                <p className="text-sm text-gray-400 animate-pulse">Генерація поради...</p>
                            </div>
                        ) : aiAdvice ? (
                            <div className="text-sm bg-indigo-900/30 p-4 rounded-lg border border-indigo-700">
                                <p className="text-indigo-200 whitespace-pre-wrap">{aiAdvice}</p>
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500 italic text-center p-4">Натисніть кнопку "AI Поради", щоб отримати персоналізовану рекомендацію.</p>
                        )}
                    </div>
                    {/* Enrolled Courses */}
                    <div>
                        <h4 className="text-lg font-semibold text-white border-b border-gray-600 pb-2 mb-4">Записаний на курси</h4>
                        <div className="space-y-4">
                            {student.enrolledCourses.length > 0 ? student.enrolledCourses.map(course => (
                                <div key={course.courseId} className="bg-gray-900/50 p-4 rounded-lg">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                                        <div>
                                            <p className="font-bold text-white">{course.courseName}</p>
                                            <p className="text-xs text-gray-400">Дата старту: {course.startDate}</p>
                                        </div>
                                        <div className="text-sm">
                                            <div className="flex justify-between"><span className="text-gray-400">СПЛАЧЕНО</span> <span className="text-green-400 font-medium">{formatCurrency(Number(course.pricePaid), currency)}</span></div>
                                            <div className="flex justify-between"><span className="text-gray-400">БОРГ</span> <span className="text-red-400 font-medium">{formatCurrency(Number(course.priceDue), currency)}</span></div>
                                            <div className="flex justify-between"><span className="text-gray-400">СТАТУС</span> <span className={`font-bold ${course.paymentStatus === 'Paid' ? 'text-green-400' : 'text-yellow-400'}`}>{course.paymentStatus}</span></div>
                                            <div className="mt-2">
                                                <div className="flex justify-between text-xs mb-1"><span className="text-gray-400">Прогрес оплати</span> <span>{Math.round((Number(course.pricePaid) / Number(course.price)) * 100)}%</span></div>
                                                <div className="w-full bg-gray-700 rounded-full h-2"><div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${(Number(course.pricePaid) / Number(course.price)) * 100}%` }}></div></div>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2 justify-end">
                                            <Button size="sm" variant="primary" onClick={() => onAddPayment(student, course)}>Додати оплату</Button>
                                            <Button size="sm" variant="secondary" onClick={() => setShowHistoryForCourse(prev => prev === course.courseId ? null : course.courseId)}>Історія</Button>
                                        </div>
                                    </div>
                                    {showHistoryForCourse === course.courseId && (
                                        <div className="mt-4 pt-4 border-t border-gray-700">
                                            <h5 className="font-semibold mb-2">Історія платежів</h5>
                                            {course.paymentHistory.length > 0 ? course.paymentHistory.map(p => (
                                                <div key={p.id} className="flex justify-between text-sm py-1">
                                                    <span>{p.date} - {p.method}</span>
                                                    <span className="text-green-400">{formatCurrency(Number(p.amount), currency)}</span>
                                                </div>
                                            )) : <p className="text-sm text-gray-500 italic">Історія платежів порожня.</p>}
                                        </div>
                                    )}
                                </div>
                            )) : <p className="text-sm text-gray-500 italic">Не записаний на жодні курси.</p>}
                        </div>
                    </div>
                    {/* Actions */}
                     <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700">
                        <Button variant="outline" onClick={fetchAiAdvice} isLoading={isLoadingAdvice}>AI Поради</Button>
                        <Button variant="secondary" onClick={() => onEdit(student)}>Редагувати</Button>
                        <Button variant="danger" onClick={() => onDelete(student.id)}>Видалити</Button>
                    </div>
                </div>
            )}
        </div>
    );
};


const EmployeeAccordionItem: React.FC<{
  employee: Employee;
  courses: Course[];
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: (employee: Employee) => void;
  onDelete: (id: string) => void;
}> = ({ employee, courses, isExpanded, onToggle, onEdit, onDelete }) => {
    const today = new Date().toISOString().split('T')[0];
    const upcomingCourses = courses.filter(c => c.teacherId === employee.id && c.startDate >= today);
    const pastCourses = courses.filter(c => c.teacherId === employee.id && c.startDate < today);

    return (
        <div className="bg-gray-800 rounded-lg">
            <div className="flex items-center p-4 cursor-pointer hover:bg-gray-700/50" onClick={onToggle}>
                {employee.avatar ? (
                    <img src={employee.avatar} alt={employee.name} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
                        <UserIcon className="w-6 h-6 text-gray-500"/>
                    </div>
                )}
                <div className="flex-1 ml-4">
                    <p className="font-bold text-white">{employee.name}</p>
                    <p className="text-sm text-gray-400">{employee.role}</p>
                </div>
                <p className="text-indigo-400 font-semibold">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(employee.salary)} / month</p>
                <ChevronDownIcon className={`w-6 h-6 ml-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </div>
            {isExpanded && (
                <div className="p-6 border-t border-gray-700 space-y-4">
                    <p className="text-sm text-gray-300">{employee.biography}</p>
                    <div>
                        <h4 className="font-semibold">Upcoming Courses ({upcomingCourses.length})</h4>
                         {upcomingCourses.length > 0 ? (
                            <ul className="list-disc list-inside text-sm text-gray-400">
                                {upcomingCourses.map(c => <li key={c.id}>{c.name} ({c.startDate})</li>)}
                            </ul>
                        ) : <p className="text-sm text-gray-500 italic">No upcoming courses.</p>}
                    </div>
                     <div>
                        <h4 className="font-semibold">Past Courses ({pastCourses.length})</h4>
                        {pastCourses.length > 0 ? (
                             <ul className="list-disc list-inside text-sm text-gray-400">
                                {pastCourses.map(c => <li key={c.id}>{c.name}</li>)}
                            </ul>
                        ): <p className="text-sm text-gray-500 italic">No past courses.</p>}
                    </div>
                    <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700">
                        <Button variant="secondary" onClick={() => onEdit(employee)}>Edit</Button>
                        <Button variant="danger" onClick={() => onDelete(employee.id)}>Delete</Button>
                    </div>
                </div>
            )}
        </div>
    );
};


const CourseAccordionItem: React.FC<{
  course: Course;
  students: Student[];
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: (course: Course) => void;
  onDelete: (id: string, name: string) => void;
  currency: Currency;
}> = ({ course, students, isExpanded, onToggle, onEdit, onDelete, currency }) => {
    const enrolledStudents = useMemo(() => {
        return students.filter(s => s.enrolledCourses.some(ec => ec.courseId === course.id));
    }, [students, course.id]);

    return (
        <div className="bg-gray-800 rounded-lg">
            <div className="flex items-center p-4 cursor-pointer hover:bg-gray-700/50" onClick={onToggle}>
                <div className="flex-1">
                    <p className="font-bold text-white">{course.name}</p>
                    <p className="text-sm text-gray-400">{course.teacherName} | {course.startDate}</p>
                </div>
                <div className="text-sm text-gray-300 mr-4">{enrolledStudents.length} {enrolledStudents.length === 1 ? 'student' : 'students'}</div>
                <ChevronDownIcon className={`w-6 h-6 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </div>
            {isExpanded && (
                <div className="p-6 border-t border-gray-700">
                    <h4 className="font-semibold mb-3">Enrolled Students & Payments</h4>
                     {enrolledStudents.length > 0 ? (
                        <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
                            {enrolledStudents.map(student => {
                                const enrollmentDetails = student.enrolledCourses.find(ec => ec.courseId === course.id);
                                if (!enrollmentDetails) return null;
                                return (
                                    <div key={student.id} className="bg-gray-700/50 p-3 rounded">
                                        <p className="font-semibold text-white">{student.name}</p>
                                        <div className="text-xs text-gray-400">
                                            Total Paid: <span className="text-green-400">{formatCurrency(Number(enrollmentDetails.pricePaid), currency)}</span> | 
                                            Due: <span className="text-red-400">{formatCurrency(Number(enrollmentDetails.priceDue), currency)}</span>
                                        </div>
                                         {enrollmentDetails.paymentHistory.length > 0 && (
                                            <ul className="text-xs list-disc list-inside pl-2 mt-1">
                                                {enrollmentDetails.paymentHistory.map(p => (
                                                    <li key={p.id}>{p.date}: {formatCurrency(Number(p.amount), currency)} ({p.method})</li>
                                                ))}
                                            </ul>
                                         )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500 italic">No students enrolled.</p>
                    )}
                    <div className="flex justify-end space-x-3 pt-4 mt-4 border-t border-gray-700">
                        <Button variant="secondary" onClick={() => onEdit(course)}>Edit</Button>
                        <Button variant="danger" onClick={() => onDelete(course.id, course.name)}>Delete</Button>
                    </div>
                </div>
            )}
        </div>
    );
};


// =============================================================================
// MAIN COMPONENT
// =============================================================================

const Training: React.FC<{ currency: Currency }> = ({ currency }) => {
  // Data states
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [courseTemplates, setCourseTemplates] = useState<CourseTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  // UI states
  const [activeTab, setActiveTab] = useState<Tab>('students');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [studentStatusFilter, setStudentStatusFilter] = useState('All');
  const [courseDateFilter, setCourseDateFilter] = useState({ from: '', to: '' });
  const [courseViewMode, setCourseViewMode] = useState<'upcoming' | 'past' | 'all'>('upcoming'); // Default to upcoming
  
  // Modal states
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [noteForStudentId, setNoteForStudentId] = useState<string | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<{ student: Student; enrolledCourse: EnrolledCourse } | null>(null);
  const [isCourseTemplateModalOpen, setIsCourseTemplateModalOpen] = useState(false);

  // Drag and Drop refs
  const dragEmployeeId = useRef<string | null>(null);
  const dragOverEmployeeId = useRef<string | null>(null);


  const fetchInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const [studentsData, coursesData, employeesData, templatesData] = await Promise.all([
        firestoreService.getStudents(),
        firestoreService.getCourses(),
        firestoreService.getEmployees(),
        firestoreService.getCourseTemplates(),
      ]);
      setStudents(studentsData);
      setCourses(coursesData);
      setEmployees(employeesData);
      setCourseTemplates(templatesData.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) {
      console.error("Failed to fetch initial data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Handlers for Modals
  const openAddEditStudentModal = (student: Student | null) => { setEditingStudent(student); setIsStudentModalOpen(true); };
  const openAddEditEmployeeModal = (employee: Employee | null) => { setEditingEmployee(employee); setIsEmployeeModalOpen(true); };
  const openAddEditCourseModal = (course: Course | null) => { setEditingCourse(course); setIsCourseModalOpen(true); };
  const openNoteModal = (studentId: string) => { setNoteForStudentId(studentId); setIsNoteModalOpen(true); };
  const openPaymentModal = (student: Student, enrolledCourse: EnrolledCourse) => { setPaymentDetails({ student, enrolledCourse }); setIsPaymentModalOpen(true); };

  // Save Handlers
  const handleSaveStudent = async (studentData: Student | Omit<Student, 'id'>) => {
    if ('id' in studentData) {
      await firestoreService.updateStudent(studentData.id, studentData);
    } else {
      await firestoreService.addStudent(studentData);
    }
    await fetchInitialData();
    setIsStudentModalOpen(false);
  };
  
  const handleSaveEmployee = async (employeeData: Employee | Omit<Employee, 'id'>) => {
    if ('id' in employeeData) {
      await firestoreService.updateEmployee(employeeData.id, employeeData);
    } else {
      const newEmployeeData = { ...employeeData, order: employees.length };
      await firestoreService.addEmployee(newEmployeeData);
    }
    await fetchInitialData();
    setIsEmployeeModalOpen(false);
  };
  
  const handleSaveCourse = async (courseData: Course | Omit<Course, 'id'>) => {
    if ('id' in courseData) {
      await firestoreService.updateCourse(courseData.id, courseData);
    } else {
      await firestoreService.addCourse(courseData);
    }
    await fetchInitialData();
    setIsCourseModalOpen(false);
  };

  const handleSaveNote = async (studentId: string, content: string) => {
    await firestoreService.addNoteToStudent(studentId, content);
    await fetchInitialData();
    setIsNoteModalOpen(false);
  };

  const handleAddPayment = async (studentId: string, courseIdentifier: string, payment: Omit<PaymentHistory, 'id'>) => {
    await firestoreService.addPaymentToStudent(studentId, courseIdentifier, payment);
    await fetchInitialData();
    setIsPaymentModalOpen(false);
  };
  
  // Delete Handlers
  const handleDeleteStudent = async (id: string) => {
    if (window.confirm("Are you sure?")) {
      await firestoreService.deleteStudent(id);
      await fetchInitialData();
    }
  };
  
  const handleDeleteEmployee = async (id: string) => {
    if (window.confirm("Are you sure?")) {
      await firestoreService.deleteEmployee(id);
      await fetchInitialData();
    }
  };
  
  const handleDeleteCourse = async (courseId: string, courseName: string) => {
    if (window.confirm(`Are you sure you want to delete the course "${courseName}"? This will also un-enroll all students from it.`)) {
        try {
            setLoading(true);
            const studentsToUpdate = students.filter(s => s.enrolledCourses.some(ec => ec.courseId === courseId));
            
            const updatePromises = studentsToUpdate.map(student => {
                const updatedCourses = student.enrolledCourses.filter(ec => ec.courseId !== courseId);
                return firestoreService.updateStudent(student.id, { enrolledCourses: updatedCourses });
            });
            
            await Promise.all(updatePromises);
            await firestoreService.deleteCourse(courseId);
            
            alert(`Course "${courseName}" and all related enrollments have been deleted.`);
            await fetchInitialData();
        } catch (error) {
            console.error("Error deleting course:", error);
            alert("Failed to delete the course. Please check the console for details.");
        } finally {
            setLoading(false);
        }
    }
  };

  // Drag and Drop Handlers for Employees
  const handleEmployeeDragStart = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    dragEmployeeId.current = id;
    e.dataTransfer.effectAllowed = 'move';
  };
  
  const handleEmployeeDragEnter = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    dragOverEmployeeId.current = id;
  };
  
  const handleEmployeeDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!dragEmployeeId.current || !dragOverEmployeeId.current || dragEmployeeId.current === dragOverEmployeeId.current) {
        return;
    }
    const originalEmployees = [...employees];
    const dragIndex = originalEmployees.findIndex(emp => emp.id === dragEmployeeId.current);
    const hoverIndex = originalEmployees.findIndex(emp => emp.id === dragOverEmployeeId.current);

    if (dragIndex === -1 || hoverIndex === -1) { return; }
    
    const newEmployees = [...originalEmployees];
    const [draggedItem] = newEmployees.splice(dragIndex, 1);
    newEmployees.splice(hoverIndex, 0, draggedItem);
    
    setEmployees(newEmployees);

    try {
        const orderedEmployeesToUpdate = newEmployees.map((emp, index) => ({
            id: emp.id,
            order: index,
        }));
        await firestoreService.updateEmployeesOrder(orderedEmployeesToUpdate);
    } catch (error) {
        console.error("Failed to update employee order:", error);
        alert("Could not save the new order. Please try again.");
        setEmployees(originalEmployees); // Revert on error
    } finally {
        dragEmployeeId.current = null;
        dragOverEmployeeId.current = null;
    }
  };
  
  const handleEmployeeDragEnd = () => {
    dragEmployeeId.current = null;
    dragOverEmployeeId.current = null;
  };

  const handleDateFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCourseDateFilter(prev => ({ ...prev, [name]: value }));
  };

  // Filtering Logic
  const filteredStudents = useMemo(() => students
    .filter(s => (studentStatusFilter === 'All' || s.status === studentStatusFilter))
    .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())), [students, searchTerm, studentStatusFilter]);

  const filteredEmployees = useMemo(() => employees
    .filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase()) || e.role.toLowerCase().includes(searchTerm.toLowerCase())), [employees, searchTerm]);
    
  const filteredCourses = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return courses
    .filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.teacherName.toLowerCase().includes(searchTerm.toLowerCase()))
    .filter(c => {
        // View Mode Filter
        if (courseViewMode === 'upcoming') return c.startDate >= today;
        if (courseViewMode === 'past') return c.startDate < today;
        return true;
    })
    .filter(c => {
        // Date Range Filter
        if (!courseDateFilter.from && !courseDateFilter.to) return true;
        // Dates are stored as 'YYYY-MM-DD' strings, so direct string comparison works.
        if (courseDateFilter.from && c.startDate < courseDateFilter.from) {
            return false;
        }
        if (courseDateFilter.to && c.startDate > courseDateFilter.to) {
            return false;
        }
        return true;
    })
    .sort((a, b) => {
        // Sort logic: Past -> Descending (most recent first), Upcoming/All -> Ascending (nearest first)
        if (courseViewMode === 'past') {
            return b.startDate.localeCompare(a.startDate);
        }
        return a.startDate.localeCompare(b.startDate);
    });
  }, [courses, searchTerm, courseDateFilter, courseViewMode]);


  const renderHeader = () => {
    let title = ''; let description = ''; let buttonText = '';
    switch (activeTab) {
        case 'students':
            title = 'Керування студентами'; description = 'Переглядайте, додавайте та редагуйте інформацію про студентів.'; buttonText = 'Додати нового студента'; break;
        case 'employees':
            title = 'Керування співробітниками'; description = 'Переглядайте, додавайте та редагуйте інформацію про співробітників.'; buttonText = 'Додати співробітника'; break;
        case 'courses':
            title = 'Керування курсами'; description = 'Переглядайте, додавайте та редагуйте інформацію про курси.'; buttonText = 'Додати новий курс'; break;
    }
    return (
        <div className="bg-gray-800 p-4 rounded-lg flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
                <h1 className="text-2xl font-bold text-white">{title}</h1>
                <p className="text-sm text-gray-400">{description}</p>
            </div>
            <div className="flex gap-2">
                 {activeTab === 'courses' && <Button variant="secondary" onClick={() => setIsCourseTemplateModalOpen(true)}>Керувати списком</Button>}
                 <Button variant="primary" onClick={() => {
                    if (activeTab === 'students') openAddEditStudentModal(null);
                    if (activeTab === 'courses') openAddEditCourseModal(null);
                    if (activeTab === 'employees') openAddEditEmployeeModal(null);
                 }}>{buttonText}</Button>
            </div>
        </div>
    );
};

  return (
    <div className="flex flex-col h-full">
      {isStudentModalOpen && <AddEditStudentModal student={editingStudent} courses={courses} onClose={() => setIsStudentModalOpen(false)} onSave={handleSaveStudent} currency={currency} />}
      {isEmployeeModalOpen && <AddEditEmployeeModal employee={editingEmployee} onClose={() => setIsEmployeeModalOpen(false)} onSave={handleSaveEmployee} />}
      {isCourseModalOpen && <CourseModal course={editingCourse} employees={employees} courseTemplates={courseTemplates} onClose={() => setIsCourseModalOpen(false)} onSave={handleSaveCourse} />}
      {isNoteModalOpen && noteForStudentId && <NoteModal studentId={noteForStudentId} onClose={() => setIsNoteModalOpen(false)} onSave={handleSaveNote} />}
      {isPaymentModalOpen && paymentDetails && <PaymentModal {...paymentDetails} onClose={() => setIsPaymentModalOpen(false)} onSave={handleAddPayment} currency={currency} />}
      {isCourseTemplateModalOpen && <CourseTemplateModal templates={courseTemplates} onClose={async () => { setIsCourseTemplateModalOpen(false); await fetchInitialData(); }} onSave={async () => {}} />}
      
      <div className="shrink-0 space-y-4 p-1">
          {renderHeader()}
          <div className="flex border-b border-gray-700">
            {(['students', 'employees', 'courses'] as Tab[]).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 text-sm font-medium capitalize ${activeTab === tab ? 'border-b-2 border-indigo-500 text-white' : 'text-gray-400 hover:text-white'}`}>
                {tab}
              </button>
            ))}
          </div>
      </div>
      
      <div className="flex-1 overflow-y-auto mt-4 pr-2">
        {loading ? <p className="text-center p-8">Loading data...</p> : (
            <div>
                {activeTab === 'students' && (
                    <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row gap-4">
                            <input type="text" placeholder="Search by name..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full sm:flex-1 bg-gray-700 p-2 rounded" />
                            <select value={studentStatusFilter} onChange={e => setStudentStatusFilter(e.target.value)} className="w-full sm:w-auto bg-gray-700 p-2 rounded">
                                <option>All</option><option>Active</option><option>Pending</option><option>Graduated</option><option>Dropped</option>
                            </select>
                        </div>
                        {filteredStudents.map(student => (
                            <StudentAccordionItem key={student.id} student={student} isExpanded={expandedId === student.id} onToggle={() => setExpandedId(expandedId === student.id ? null : student.id)} onEdit={openAddEditStudentModal} onDelete={handleDeleteStudent} onAddNote={openNoteModal} onAddPayment={openPaymentModal} currency={currency} />
                        ))}
                    </div>
                )}
                {activeTab === 'employees' && (
                    <div className="space-y-4">
                        <input type="text" placeholder="Search by name or role..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="flex-1 bg-gray-700 p-2 rounded" />
                         <div onDrop={handleEmployeeDrop} onDragOver={(e) => e.preventDefault()} className="space-y-4">
                            {filteredEmployees.map(employee => (
                                <div
                                    key={employee.id}
                                    draggable
                                    onDragStart={e => handleEmployeeDragStart(e, employee.id)}
                                    onDragEnter={e => handleEmployeeDragEnter(e, employee.id)}
                                    onDragEnd={handleEmployeeDragEnd}
                                    className="cursor-move"
                                >
                                    <EmployeeAccordionItem
                                        employee={employee}
                                        courses={courses}
                                        isExpanded={expandedId === employee.id}
                                        onToggle={() => setExpandedId(expandedId === employee.id ? null : employee.id)}
                                        onEdit={openAddEditEmployeeModal}
                                        onDelete={handleDeleteEmployee}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {activeTab === 'courses' && (
                    <div className="space-y-4">
                         <div className="flex flex-col xl:flex-row gap-4 items-start xl:items-center bg-gray-800 p-4 rounded-lg">
                            <div className="flex bg-gray-700 rounded-lg p-1 shrink-0">
                                <button 
                                    onClick={() => setCourseViewMode('upcoming')}
                                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${courseViewMode === 'upcoming' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                                >
                                    Future
                                </button>
                                <button 
                                    onClick={() => setCourseViewMode('past')}
                                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${courseViewMode === 'past' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                                >
                                    Last
                                </button>
                                 <button 
                                    onClick={() => setCourseViewMode('all')}
                                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${courseViewMode === 'all' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                                >
                                    All
                                </button>
                            </div>

                            <input 
                                type="text" 
                                placeholder="Search by name or teacher..." 
                                value={searchTerm} 
                                onChange={e => setSearchTerm(e.target.value)} 
                                className="w-full xl:w-auto flex-1 bg-gray-700 p-2 rounded border border-gray-600 focus:border-indigo-500 focus:outline-none" 
                            />
                            
                            <div className="flex items-center gap-2 text-sm text-gray-300 w-full xl:w-auto">
                                <span className="whitespace-nowrap text-gray-400">Custom Date:</span>
                                <input 
                                    type="date" 
                                    name="from"
                                    value={courseDateFilter.from}
                                    onChange={handleDateFilterChange}
                                    className="bg-gray-700 p-2 rounded border border-gray-600 text-white w-full xl:w-36"
                                    aria-label="Filter courses from date"
                                />
                                <span className="text-gray-500">-</span>
                                <input 
                                    type="date" 
                                    name="to"
                                    value={courseDateFilter.to}
                                    onChange={handleDateFilterChange}
                                    className="bg-gray-700 p-2 rounded border border-gray-600 text-white w-full xl:w-36"
                                    aria-label="Filter courses to date"
                                />
                            </div>
                        </div>
                        {filteredCourses.length > 0 ? (
                            filteredCourses.map(course => (
                                <CourseAccordionItem key={course.id} course={course} students={students} isExpanded={expandedId === course.id} onToggle={() => setExpandedId(expandedId === course.id ? null : course.id)} onEdit={openAddEditCourseModal} onDelete={handleDeleteCourse} currency={currency}/>
                            ))
                        ) : (
                            <div className="text-center py-8 text-gray-500 bg-gray-800 rounded-lg">
                                No courses found for the selected criteria.
                            </div>
                        )}
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
};

export default Training;