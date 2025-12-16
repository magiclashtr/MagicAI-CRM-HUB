import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Student, Course, Employee, Currency, EnrolledCourse, StudentSource, CourseTemplate } from '../types';
import { firestoreService } from '../services/firestoreService';
import { geminiService } from '../services/geminiService';
import { auth } from '../services/firebase';
import { formatCurrency } from '../constants';
import Button from '../components/Button';

type Tab = 'students' | 'employees' | 'courses';

// =============================================================================
// ICONS
// =============================================================================
const PhoneIcon: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" /></svg>;
const EmailIcon: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" /></svg>;
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
            setFormData(prev => ({ ...prev, biography: bio }));
        } catch (error) {
            console.error("Failed to generate bio:", error);
        } finally {
            setIsGeneratingBio(false);
        }
    };

    const handleSave = async (e: React.FormEvent | React.MouseEvent) => {
        if (e && e.preventDefault) e.preventDefault();

        // Basic validation check
        if (!formData.name || !formData.role) {
            alert("Name and Role are required!");
            return;
        }

        let finalData = { ...formData };

        if (imageFile) {
            try {
                const employeeId = 'id' in finalData ? finalData.id : `new_${Date.now()}`;
                const imagePath = `avatars/${employeeId}_${imageFile.name}`;
                const downloadURL = await firestoreService.uploadImage(imageFile, imagePath);
                finalData.avatar = downloadURL;
            } catch (error) {
                console.error("Image upload failed (likely CORS or permission):", error);
                alert("Image upload failed (CORS/Network). Saving employee with default avatar instead.");
                // Do NOT return. Proceed to save the employee data without the custom image.
            }
        }
        try {
            await onSave(finalData);
        } catch (error) {
            console.error("Failed to save employee:", error);
            alert("Failed to save employee. Please check the console for details.");
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4">
            <div className="bg-gray-800 p-8 rounded-lg w-full max-w-3xl max-h-[90vh] flex flex-col">
                <h2 className="text-2xl font-bold mb-6">{employee ? 'Редагувати співробітника' : 'Додати нового співробітника'}</h2>
                <div className="flex-1 overflow-y-auto pr-4 space-y-4">
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
                    <div className="flex justify-end space-x-4 pt-6 mt-4 border-t border-gray-700">
                        <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
                        <button
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                            type="button"
                            onClick={handleSave}
                        >
                            {employee ? 'Save Changes' : 'Add Employee'}
                        </button>
                    </div>
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
        return options.sort((a, b) => a.name.localeCompare(b.name));
    }, [courseTemplates, course]);

    useEffect(() => {
        if (course) setFormData(course);
    }, [course]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        if (name === 'teacherId') {
            const selectedTeacher = employees.find(emp => emp.id === value);
            setFormData(prev => ({ ...prev, teacherId: value, teacherName: selectedTeacher?.name || '' }));
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
            setFormData(prev => ({ ...prev, description: desc }));
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
                        <select name="type" value={formData.type} onChange={handleChange} className="w-full bg-gray-700 p-3 rounded">
                            <option value="Ochnyy">Face-to-Face</option>
                            <option value="Specialized">Specialized</option>
                            <option value="Online">Online</option>
                            <option value="Workshop">Workshop</option>
                        </select>
                    </div>
                    <div>
                        <textarea name="description" value={formData.description} onChange={handleChange} placeholder="Course Description" className="w-full bg-gray-700 p-3 rounded h-32" />
                        <Button type="button" variant="outline" size="sm" onClick={handleGenerateDescription} isLoading={isGeneratingDesc}>
                            Generate Description (AI)
                        </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <select name="teacherId" value={formData.teacherId} onChange={handleChange} className="w-full bg-gray-700 p-3 rounded">
                            <option value="">Select Teacher</option>
                            {employees.filter(e => e.role === 'Trainer' || e.role === 'Master').map(emp => (
                                <option key={emp.id} value={emp.id}>{emp.name}</option>
                            ))}
                        </select>
                        <input name="duration" value={formData.duration} onChange={handleChange} placeholder="Duration (e.g. 2 days)" className="w-full bg-gray-700 p-3 rounded" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input name="price" type="number" value={formData.price} onChange={handleChange} placeholder="Price" className="w-full bg-gray-700 p-3 rounded" />
                        <input name="startDate" type="date" value={formData.startDate} onChange={handleChange} className="w-full bg-gray-700 p-3 rounded" />
                    </div>
                </form>
                <div className="flex justify-end space-x-4 pt-6 mt-4 border-t border-gray-700">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button variant="primary" onClick={handleSave}>{course ? 'Save Changes' : 'Add Course'}</Button>
                </div>
            </div>
        </div>
    );
};

// Payment Modal
const PaymentModal: React.FC<{
    student: Student;
    course: EnrolledCourse;
    onClose: () => void;
    onSave: (amount: number, date: string, method: string) => Promise<void>;
    currency: Currency;
}> = ({ student, course, onClose, onSave, currency }) => {
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [method, setMethod] = useState('Cash');
    const [paymentCurrency, setPaymentCurrency] = useState<Currency>(currency);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // Convert to USD if paid in TRY for storage consistency, or keep as is if logic dictates.
        // The requirement is: main currency is TRY, USD is indicator/calc.
        // We will pass the raw amount and let the handler deal with conversion/storage logic based on the selected paymentCurrency.
        // For simplicity in this step, let's assume we store in USD.
        let finalAmount = Number(amount);
        if (paymentCurrency === 'TRY') {
            finalAmount = finalAmount / 32.83; // Approx rate, ideally use constant
        }
        await onSave(finalAmount, date, method);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4">
            <div className="bg-gray-800 p-8 rounded-lg w-full max-w-md">
                <h2 className="text-2xl font-bold mb-4">Add Payment</h2>
                <p className="text-gray-400 mb-6">{student.name} - {course.courseName}</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Amount</label>
                        <div className="flex gap-2">
                            <input
                                type="number"
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                className="w-full bg-gray-700 p-3 rounded text-white"
                                required
                                min="0.01"
                                step="any"
                            />
                            <select
                                value={paymentCurrency}
                                onChange={e => setPaymentCurrency(e.target.value as Currency)}
                                className="bg-gray-700 p-3 rounded text-white"
                            >
                                <option value="TRY">TRY</option>
                                <option value="USD">USD</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Date</label>
                        <input
                            type="date"
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            className="w-full bg-gray-700 p-3 rounded text-white"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Method</label>
                        <select
                            value={method}
                            onChange={e => setMethod(e.target.value)}
                            className="w-full bg-gray-700 p-3 rounded text-white"
                        >
                            <option value="Cash">Cash</option>
                            <option value="Card">Card</option>
                            <option value="Bank Transfer">Bank Transfer</option>
                            <option value="Crypto">Crypto</option>
                        </select>
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                        <Button variant="secondary" onClick={onClose}>Cancel</Button>
                        <Button variant="primary" type="submit">Confirm Payment</Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Update CourseStudentsModal to include Payment Trigger
const CourseStudentsModal: React.FC<{
    course: Course;
    students: Student[];
    onClose: () => void;
    onPay: (student: Student, course: EnrolledCourse) => void;
    currency: Currency;
}> = ({ course, students, onClose, onPay, currency }) => {
    const enrolledStudents = students.filter(s =>
        s.enrolledCourses.some(ec => ec.courseId === course.id)
    );

    const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);

    const toggleExpand = (id: string) => {
        setExpandedStudentId(prev => prev === id ? null : id);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4">
            <div className="bg-gray-800 p-8 rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-4">
                    <div>
                        <h2 className="text-2xl font-bold">{course.name}</h2>
                        <p className="text-gray-400 text-sm">Student List & Financials</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                    {enrolledStudents.length > 0 ? (
                        enrolledStudents.map(student => {
                            const courseData = student.enrolledCourses.find(ec => ec.courseId === course.id)!;
                            const isExpanded = expandedStudentId === student.id;

                            return (
                                <div key={student.id} className="bg-gray-700 rounded-lg overflow-hidden">
                                    <div className="p-4 flex items-center justify-between">
                                        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => toggleExpand(student.id)}>
                                            <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-600">
                                                {student.avatar ? (
                                                    <img src={student.avatar} alt={student.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <UserIcon className="w-full h-full p-2 text-gray-400" />
                                                )}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-white">{student.name}</h3>
                                                <p className="text-xs text-gray-400">{student.phone || student.email}</p>
                                            </div>
                                        </div>
                                        <div className="text-right flex items-center gap-4">
                                            <div>
                                                <div className="text-sm">
                                                    <span className="text-gray-400">Paid:</span>{' '}
                                                    <span className="text-green-400 font-medium">{formatCurrency(courseData.pricePaid, currency)}</span>
                                                    <span className="text-gray-500 mx-1">/</span>
                                                    <span className="text-gray-300">{formatCurrency(courseData.price, currency)}</span>
                                                </div>
                                                {courseData.priceDue > 0 ? (
                                                    <div className="text-red-400 font-bold text-sm mt-1">
                                                        Debt: {formatCurrency(courseData.priceDue, currency)}
                                                    </div>
                                                ) : (
                                                    <div className="text-green-500 font-bold text-xs mt-1 bg-green-500/10 px-2 py-0.5 rounded inline-block">
                                                        Paid in Full
                                                    </div>
                                                )}
                                            </div>
                                            <Button size="sm" onClick={() => onPay(student, courseData)}>Pay</Button>
                                        </div>
                                    </div>

                                    {/* Expanded History */}
                                    {isExpanded && (
                                        <div className="bg-gray-900/50 p-4 border-t border-gray-600">
                                            <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Payment History</h4>
                                            {courseData.paymentHistory && courseData.paymentHistory.length > 0 ? (
                                                <div className="space-y-2">
                                                    {courseData.paymentHistory.map((ph, idx) => (
                                                        <div key={idx} className="flex justify-between text-sm border-b border-gray-700/50 pb-1 last:border-0">
                                                            <span className="text-gray-300">{ph.date}</span>
                                                            <span className="text-gray-400">{ph.method}</span>
                                                            <span className="text-green-400 font-mono">{formatCurrency(ph.amount, currency)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-xs text-gray-500 italic">No payments recorded yet.</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-center text-gray-500 py-8">
                            No students enrolled in this course yet.
                        </div>
                    )}
                </div>

                <div className="flex justify-end pt-6 mt-4 border-t border-gray-700">
                    <Button variant="secondary" onClick={onClose}>Close</Button>
                </div>
            </div>
        </div>
    );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const Training: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>('students');
    const [students, setStudents] = useState<Student[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [courseTemplates, setCourseTemplates] = useState<CourseTemplate[]>([]);
    const [currency] = useState<Currency>('TRY'); // DEFAULT CURRENCY CHANGED TO TRY
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState<'student' | 'employee' | 'course' | 'courseStudents' | 'payment' | null>(null);
    const [selectedItem, setSelectedItem] = useState<any>(null); // Type could be Student | Employee | Course
    const [paymentData, setPaymentData] = useState<{ student: Student, course: EnrolledCourse } | null>(null);
    const [filterText, setFilterText] = useState('');
    // ... load data useEffect ... (unchanged)

    // ... handle delete/save student/employee/course ... (unchanged)

    const handleSavePayment = async (amount: number, date: string, method: string) => {
        if (!paymentData) return;
        const { student, course } = paymentData;

        try {
            // Update the specific enrolled course
            const updatedEnrolledCourses = student.enrolledCourses.map(ec => {
                if (ec.courseId === course.courseId) {
                    const newPricePaid = ec.pricePaid + amount;
                    const newPriceDue = Math.max(0, ec.price - newPricePaid);

                    const newPayment = {
                        id: Date.now().toString(),
                        date,
                        amount, // Stored in USD (assuming conversion happened in Modal)
                        method,
                        courseName: ec.courseName
                    };

                    return {
                        ...ec,
                        pricePaid: newPricePaid,
                        priceDue: newPriceDue,
                        paymentStatus: (newPriceDue === 0 ? 'Paid' : 'Pending') as 'Paid' | 'Pending',
                        paymentHistory: [...(ec.paymentHistory || []), newPayment]
                    };
                }
                return ec;
            });

            // Optimistic Update
            const updatedStudent = { ...student, enrolledCourses: updatedEnrolledCourses };
            setStudents(prev => prev.map(s => s.id === student.id ? updatedStudent as Student : s));

            // Persist
            await firestoreService.updateStudent(student.id, { enrolledCourses: updatedEnrolledCourses });

            setShowModal('courseStudents'); // Return to list
            setPaymentData(null);
        } catch (error) {
            console.error("Failed to save payment:", error);
            alert("Failed to save payment.");
        }
    };


    // Load data
    useEffect(() => {
        setLoading(true);
        Promise.all([
            firestoreService.getStudents(),
            firestoreService.getEmployees(),
            firestoreService.getCourses(),
            firestoreService.getCourseTemplates()
        ]).then(([s, e, c, ct]) => {
            setStudents(s);
            setEmployees(e);
            setCourses(c);
            setCourseTemplates(ct);
            setLoading(false);
        }).catch(err => {
            console.error("Failed to load data:", err);
            setLoading(false);
        });
    }, []);

    // Filter Logic
    const filteredStudents = useMemo(() => students.filter(s => s.name?.toLowerCase().includes(filterText.toLowerCase())), [students, filterText]);
    const filteredEmployees = useMemo(() => employees.filter(e => e.name?.toLowerCase().includes(filterText.toLowerCase())), [employees, filterText]);
    const filteredCourses = useMemo(() => courses.filter(c => c.name?.toLowerCase().includes(filterText.toLowerCase())), [courses, filterText]);

    // Handlers
    const handleDelete = async (type: Tab, id: string) => {
        if (!window.confirm("Are you sure?")) return;
        try {
            if (type === 'students') {
                await firestoreService.deleteStudent(id);
                setStudents(prev => prev.filter(s => s.id !== id));
            } else if (type === 'employees') {
                await firestoreService.deleteEmployee(id);
                setEmployees(prev => prev.filter(e => e.id !== id));
            } else if (type === 'courses') {
                await firestoreService.deleteCourse(id);
                setCourses(prev => prev.filter(c => c.id !== id));
            }
        } catch (error) {
            console.error("Delete failed:", error);
        }
    };

    const handleSaveStudent = async (data: Student | Omit<Student, 'id'>) => {
        try {
            if ('id' in data) {
                await firestoreService.updateStudent(data.id, data);
                setStudents(prev => prev.map(s => s.id === data.id ? data as Student : s));
            } else {
                const result = await firestoreService.addStudent(data as Omit<Student, 'id'>);
                if (result.success && result.id) {
                    setStudents(prev => [...prev, { ...data, id: result.id! } as Student]);
                } else {
                    console.error("Failed to add student:", result.message);
                }
            }
            setShowModal(null);
        } catch (error) { console.error("Save failed:", error); }
    };

    const handleSaveEmployee = async (data: Employee | Omit<Employee, 'id'>) => {
        try {
            if ('id' in data) {
                await firestoreService.updateEmployee(data.id, data);
                setEmployees(prev => prev.map(e => e.id === data.id ? data as Employee : e));
            } else {
                const result = await firestoreService.addEmployee(data as Omit<Employee, 'id'>);
                if (result.success && result.id) {
                    setEmployees(prev => [...prev, { ...data, id: result.id! } as Employee]);
                } else {
                    console.error("Failed to add employee:", result.message);
                }
            }
            setShowModal(null);
        } catch (error) { console.error("Save failed:", error); }
    };

    const handleSaveCourse = async (data: Course | Omit<Course, 'id'>) => {
        try {
            if ('id' in data) {
                await firestoreService.updateCourse(data.id, data);
                setCourses(prev => prev.map(c => c.id === data.id ? data as Course : c));
            } else {
                const result = await firestoreService.addCourse(data as Omit<Course, 'id'>);
                if (result.success && result.id) {
                    setCourses(prev => [...prev, { ...data, id: result.id! } as Course]);
                } else {
                    console.error("Failed to add course:", result.message);
                }
            }
            setShowModal(null);
        } catch (error) { console.error("Save failed:", error); }
    };

    const handleGetStudentAdvice = async (student: Student) => {
        const advice = await geminiService.getStudentAdvice(student);
        alert(`AI Advice for ${student.name}:\n\n${advice}`);
    };

    const handleGetEmployeeAdvice = async (employee: Employee) => {
        const advice = await geminiService.getEmployeeAdvice(employee);
        alert(`AI Advice for ${employee.name}:\n\n${advice}`);
    };

    const handleGetCourseAdvice = async (course: Course) => {
        const advice = await geminiService.getCourseAdvice(course, students);
        alert(`AI Advice for ${course.name}:\n\n${advice}`);
    };


    if (loading) return <div className="p-10 text-center text-white">Loading...</div>;

    return (
        <div className="p-6 text-white min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">Training Center</h1>
                <div className="flex gap-2">
                    {['students', 'employees', 'courses'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as Tab)}
                            className={`px-4 py-2 rounded-lg capitalize transition-colors ${activeTab === tab ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex justify-between items-center mb-6 bg-gray-800 p-4 rounded-lg shadow-md">
                <input
                    type="text"
                    placeholder={`Search ${activeTab}...`}
                    value={filterText}
                    onChange={e => setFilterText(e.target.value)}
                    className="bg-gray-700 text-white px-4 py-2 rounded-lg w-full max-w-md focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <Button onClick={() => { setSelectedItem(null); setShowModal(activeTab === 'students' ? 'student' : activeTab === 'employees' ? 'employee' : 'course'); }}>
                    + Add {activeTab === 'students' ? 'Student' : activeTab === 'employees' ? 'Employee' : 'Course'}
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeTab === 'students' && filteredStudents.map(student => {
                    // Calculate Debt
                    const totalDebt = student.enrolledCourses.reduce((acc, c) => acc + c.priceDue, 0);
                    return (
                        <div key={student.id} className="bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-700 hover:border-indigo-500 transition-all relative group">
                            <div className="flex items-center space-x-4 mb-4">
                                <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-700 border-2 border-indigo-500">
                                    {student.avatar ? <img src={student.avatar} alt={student.name} className="w-full h-full object-cover" /> : <UserIcon className="w-full h-full p-3 text-gray-400" />}
                                </div>
                                <div>
                                    <h3 className="font-bold text-xl">{student.name}</h3>
                                    <span className={`text-xs px-2 py-1 rounded-full ${student.status === 'Active' ? 'bg-green-900 text-green-300' : 'bg-gray-600'}`}>{student.status}</span>
                                </div>
                            </div>
                            <div className="space-y-2 text-sm text-gray-300 mb-4">
                                <div className="flex items-center"><EmailIcon /><span className="ml-2">{student.email || 'No email'}</span></div>
                                <div className="flex items-center"><PhoneIcon /><span className="ml-2">{student.phone || 'No phone'}</span></div>

                                {/* Enrolled Courses List */}
                                <div className="mt-3 pt-3 border-t border-gray-700">
                                    <p className="text-xs font-bold text-gray-500 uppercase mb-1">Enrolled Courses:</p>
                                    {student.enrolledCourses.length > 0 ? (
                                        <ul className="space-y-1">
                                            {student.enrolledCourses.map((ec, idx) => (
                                                <li key={idx} className="flex justify-between text-xs">
                                                    <span className="text-gray-200">{ec.courseName}</span>
                                                    <span className={`${ec.paymentStatus === 'Paid' ? 'text-green-400' : 'text-yellow-400'}`}>
                                                        {ec.paymentStatus}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-xs text-gray-600 italic">No active courses</p>
                                    )}
                                </div>

                                {totalDebt > 0 && (
                                    <div className="mt-3 bg-red-900/20 p-2 rounded border border-red-900/50">
                                        <div className="text-red-400 font-bold text-sm">Debt: {formatCurrency(totalDebt, 'USD')}</div>
                                        <div className="text-red-500/70 text-xs">({formatCurrency(totalDebt, 'TRY')})</div>
                                    </div>
                                )}
                            </div>
                            <div className="flex justify-between mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => { setSelectedItem(student); setShowModal('student'); }} className="p-2 bg-gray-700 rounded-full hover:bg-indigo-600"><EditIcon /></button>
                                <button onClick={() => handleGetStudentAdvice(student)} className="px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full text-xs font-bold hover:shadow-lg">AI Advice</button>
                                <button onClick={() => handleDelete('students', student.id)} className="p-2 bg-gray-700 rounded-full hover:bg-red-600"><TrashIcon /></button>
                            </div>
                        </div>
                    )
                })}

                {activeTab === 'employees' && filteredEmployees.map(employee => (
                    <div key={employee.id} className="bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-700 hover:border-cyan-500 transition-all relative group">
                        <div className="flex items-center space-x-4 mb-4">
                            <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-700 border-2 border-cyan-500">
                                {employee.avatar ? <img src={employee.avatar} alt={employee.name} className="w-full h-full object-cover" /> : <EmployeeIcon className="w-full h-full p-3 text-gray-400" />}
                            </div>
                            <div>
                                <h3 className="font-bold text-xl">{employee.name}</h3>
                                <p className="text-sm text-cyan-400">{employee.role}</p>
                            </div>
                        </div>
                        <div className="text-sm text-gray-400 mb-4">
                            <p>Specializations: {employee.specializations.join(', ')}</p>
                            <p className="mt-2 text-gray-500 line-clamp-3 italic">{employee.biography}</p>
                        </div>
                        <div className="flex justify-between mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => { setSelectedItem(employee); setShowModal('employee'); }} className="p-2 bg-gray-700 rounded-full hover:bg-indigo-600"><EditIcon /></button>
                            <button onClick={() => handleGetEmployeeAdvice(employee)} className="px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full text-xs font-bold hover:shadow-lg">AI Advice</button>
                            <button onClick={() => handleDelete('employees', employee.id)} className="p-2 bg-gray-700 rounded-full hover:bg-red-600"><TrashIcon /></button>
                        </div>
                    </div>
                ))}

                {activeTab === 'courses' && filteredCourses.map(course => {
                    const enrolledCount = students.filter(s => s.enrolledCourses.some(ec => ec.courseId === course.id)).length;
                    return (
                        <div key={course.id} className="bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-700 hover:border-purple-500 transition-all relative group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-purple-900 rounded-lg"><CourseIcon className="text-purple-300" /></div>
                                <span className="text-xl font-bold text-green-400">{formatCurrency(course.price, currency)}</span>
                            </div>
                            <h3 className="font-bold text-xl mb-2">{course.name}</h3>
                            <p className="text-sm text-gray-400 mb-2">{course.teacherName} | {course.startDate}</p>

                            {/* Enrolled Students Widget */}
                            <div
                                onClick={() => { setSelectedItem(course); setShowModal('courseStudents'); }}
                                className="flex items-center gap-2 mb-4 bg-gray-700/50 p-2 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors"
                            >
                                <UserIcon className="w-4 h-4 text-indigo-400" />
                                <span className="text-sm text-gray-200 font-medium">Enrolled: {enrolledCount}</span>
                                <span className="text-xs text-gray-500 ml-auto bg-gray-800 px-2 py-0.5 rounded">View List</span>
                            </div>

                            <p className="text-xs text-gray-500 line-clamp-2 mb-4">{course.description}</p>
                            <div className="flex justify-between mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => { setSelectedItem(course); setShowModal('course'); }} className="p-2 bg-gray-700 rounded-full hover:bg-indigo-600"><EditIcon /></button>
                                <button onClick={() => handleGetCourseAdvice(course)} className="px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full text-xs font-bold hover:shadow-lg">AI Advice</button>
                                <button onClick={() => handleDelete('courses', course.id)} className="p-2 bg-gray-700 rounded-full hover:bg-red-600"><TrashIcon /></button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {showModal === 'student' && <AddEditStudentModal student={selectedItem} courses={courses} onClose={() => setShowModal(null)} onSave={handleSaveStudent} currency={currency} />}
            {showModal === 'employee' && <AddEditEmployeeModal employee={selectedItem} onClose={() => setShowModal(null)} onSave={handleSaveEmployee} />}
            {showModal === 'course' && <CourseModal course={selectedItem} employees={employees} courseTemplates={courseTemplates} onClose={() => setShowModal(null)} onSave={handleSaveCourse} />}

            {showModal === 'courseStudents' && (
                <CourseStudentsModal
                    course={selectedItem}
                    students={students}
                    onClose={() => setShowModal(null)}
                    onPay={(student, course) => {
                        setPaymentData({ student, course });
                        setShowModal('payment');
                    }}
                    currency={currency}
                />
            )}

            {showModal === 'payment' && paymentData && (
                <PaymentModal
                    student={paymentData.student}
                    course={paymentData.course}
                    onClose={() => setShowModal('courseStudents')}
                    onSave={handleSavePayment}
                    currency={currency}
                />
            )}
        </div>
    );
};

export default Training;