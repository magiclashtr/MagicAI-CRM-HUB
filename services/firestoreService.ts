import { db, storage } from './firebase';
import {
  collection,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  Student, Course, Employee, Note, PaymentHistory, EnrolledCourse,
  Income, Expense, Task, AdvisorSuggestion, CoursePreparation,
  ChecklistItem, StudentSource, ExpenseCategory, CourseTemplate, StudentDetailsResponse
} from '../types';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

const docToData = <T>(d: any): T => ({ id: d.id, ...d.data() } as T);
const docsToData = <T>(snapshot: any): T[] => snapshot.docs.map(docToData);

// =============================================================================
// COLLECTION REFERENCES
// =============================================================================

const studentsCol = collection(db, 'students');
const coursesCol = collection(db, 'courses');
const employeesCol = collection(db, 'employees');
const incomeCol = collection(db, 'income');
const expensesCol = collection(db, 'expenses');
const tasksCol = collection(db, 'tasks');
const advisorSuggestionsCol = collection(db, 'advisorSuggestions');
const coursePreparationsCol = collection(db, 'coursePreparations');
const studentSourcesCol = collection(db, 'studentSources');
const expenseCategoriesCol = collection(db, 'expenseCategories');
const courseTemplatesCol = collection(db, 'courseTemplates');
const ragKnowledgeCol = collection(db, 'ragKnowledge');
const dynamicMemoryCol = collection(db, 'dynamicMemory');


export const firestoreService = {
  // ===========================================================================
  // FILE UPLOADS
  // ===========================================================================
  uploadImage: async (file: File, path: string): Promise<string> => {
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  },

  // ===========================================================================
  // STUDENTS
  // ===========================================================================
  getStudents: async (): Promise<Student[]> => docsToData(await getDocs(studentsCol)),
  addStudent: async (data: Partial<Omit<Student, 'id'>>) => {
    const studentDefaults = {
      name: 'Unknown',
      email: '',
      phone: '',
      messenger: '',
      source: 'AI Assistant',
      registrationDate: new Date().toISOString().split('T')[0],
      managerUid: 'margarita-g-id',
      status: 'Pending' as const,
      notes: [],
      enrolledCourses: [],
      avatar: '',
    };

    // Filter out undefined values from the incoming data object to prevent Firestore errors.
    const cleanData = Object.entries(data).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        (acc as any)[key] = value;
      }
      return acc;
    }, {} as Partial<Omit<Student, 'id'>>);

    const finalStudentData = { ...studentDefaults, ...cleanData };

    // Ensure the 'name' field, which is required by the function's logic, is present.
    if (!finalStudentData.name || finalStudentData.name === 'Unknown') {
      return { success: false, message: "Cannot add student: a name is required." };
    }

    const ref = await addDoc(studentsCol, finalStudentData);
    return { success: true, message: `Student '${finalStudentData.name}' created successfully.`, id: ref.id };
  },
  updateStudent: async (id: string, data: Partial<Student>) => await updateDoc(doc(db, 'students', id), data),
  deleteStudent: async (id: string) => await deleteDoc(doc(db, 'students', id)),
  deleteStudentByName: async (name: string) => {
    const matching = await firestoreService.findStudentsByName(name);
    if (matching.length === 0) return { success: false, message: `Student '${name}' not found.` };
    if (matching.length > 1) return { success: false, message: 'Ambiguous name. Please be more specific.', suggestions: matching.map(s => s.name) };
    await deleteDoc(doc(db, 'students', matching[0].id));
    return { success: true, message: `Student '${name}' deleted.` };
  },

  addNoteToStudent: async (studentId: string, content: string): Promise<void> => {
    const studentRef = doc(db, 'students', studentId);
    const studentDoc = await getDoc(studentRef);
    if (studentDoc.exists()) {
      const studentData = studentDoc.data() as Student;
      const newNote: Note = {
        id: Date.now().toString(),
        date: new Date().toISOString().split('T')[0],
        content: content,
      };
      const updatedNotes = [...(studentData.notes || []), newNote];
      await updateDoc(studentRef, { notes: updatedNotes });
    }
  },
  addNoteToStudentByName: async (studentName: string, content: string) => {
    const matching = await firestoreService.findStudentsByName(studentName);
    if (matching.length === 0) return { success: false, message: `Student '${studentName}' not found.` };
    if (matching.length > 1) return { success: false, message: 'Ambiguous name. Please be more specific.', suggestions: matching.map(s => s.name) };
    await firestoreService.addNoteToStudent(matching[0].id, content);
    return { success: true, message: `Note added to ${matching[0].name}.` };
  },

  async addPaymentToStudent(studentId: string, courseId: string, payment: Omit<PaymentHistory, 'id'>): Promise<void> {
    const studentRef = doc(db, 'students', studentId);
    const studentDoc = await getDoc(studentRef);
    if (studentDoc.exists()) {
      const studentData = studentDoc.data() as Student;
      const updatedCourses = studentData.enrolledCourses.map(course => {
        if (course.courseId === courseId) {
          const newPayment: PaymentHistory = { ...payment, id: Date.now().toString() };
          const updatedHistory = [...course.paymentHistory, newPayment];
          const newPricePaid = Number(course.pricePaid) + Number(payment.amount);
          const newPriceDue = Number(course.price) - newPricePaid;
          const paymentStatus = newPriceDue <= 0 ? 'Paid' : 'Pending';
          return { ...course, pricePaid: newPricePaid, priceDue: newPriceDue, paymentStatus, paymentHistory: updatedHistory };
        }
        return course;
      });

      // Create a corresponding entry in the main income collection
      const incomeEntry: Omit<Income, 'id'> = {
        date: payment.date,
        description: `Оплата від ${studentData.name} за курс "${payment.courseName}"`,
        amount: payment.amount,
      };
      await addDoc(incomeCol, incomeEntry);

      await updateDoc(studentRef, { enrolledCourses: updatedCourses });
    }
  },

  async findStudents(filters: { status?: 'Active' | 'Pending' | 'Graduated' | 'Dropped'; hasDebt?: boolean; courseName?: string }): Promise<Student[]> {
    let students = await this.getStudents();

    if (filters.status) {
      students = students.filter(s => s.status === filters.status);
    }

    if (filters.hasDebt) {
      students = students.filter(s => s.enrolledCourses.some(c => Number(c.priceDue) > 0));
    }

    if (filters.courseName) {
      const courseNameLower = filters.courseName.toLowerCase();
      students = students.filter(s =>
        s.enrolledCourses.some(c => c.courseName.toLowerCase().includes(courseNameLower))
      );
    }

    return students;
  },

  async findStudentsByName(name: string): Promise<Student[]> {
    if (!name || name.trim() === '') return [];
    const allStudents = await this.getStudents();
    const searchTerm = name.toLowerCase();
    return allStudents.filter(s => s.name.toLowerCase().includes(searchTerm));
  },

  async getStudentDetailsByName(name: string): Promise<StudentDetailsResponse> {
    const matchingStudents = await this.findStudentsByName(name);

    if (matchingStudents.length === 0) {
      return { status: 'not_found', message: `Student '${name}' not found.` };
    }

    if (matchingStudents.length > 1) {
      return {
        status: 'suggestions',
        suggestions: matchingStudents.map(s => ({ name: s.name, id: s.id })),
        message: `I found several students matching '${name}'. Please be more specific.`
      };
    }

    const student = matchingStudents[0];
    const details = `
      Name: ${student.name}
      Status: ${student.status}
      Email: ${student.email || 'N/A'}
      Phone: ${student.phone || 'N/A'}
      Courses: ${student.enrolledCourses.map(c => `${c.courseName} (Status: ${c.paymentStatus})`).join(', ') || 'None'}
      Total Due: ${student.enrolledCourses.reduce((sum, c) => sum + c.priceDue, 0).toFixed(2)} USD
    `;
    return { status: 'found', details, message: 'Here are the details for the student.' };
  },

  async updateStudentDetailsByName(studentName: string, updates: Partial<Omit<Student, 'id' | 'enrolledCourses' | 'notes'>>): Promise<{ success: boolean; message: string; suggestions?: string[] }> {
    const matchingStudents = await this.findStudentsByName(studentName);
    if (matchingStudents.length === 0) {
      return { success: false, message: `Student '${studentName}' not found.` };
    }
    if (matchingStudents.length > 1) {
      return {
        success: false,
        message: `I found multiple students matching '${studentName}'. Which one did you mean?`,
        suggestions: matchingStudents.map(s => s.name),
      };
    }

    const student = matchingStudents[0];
    if (Object.prototype.hasOwnProperty.call(updates, 'newName')) {
      updates.name = (updates as any).newName;
      delete (updates as any).newName;
    }
    await updateDoc(doc(db, 'students', student.id), updates);
    return { success: true, message: `Successfully updated details for ${student.name}.` };
  },

  async enrollStudentInCourseByName(studentName: string, courseName: string): Promise<{ success: boolean; message: string; suggestions?: string[] }> {
    const matchingStudents = await this.findStudentsByName(studentName);
    if (matchingStudents.length === 0) {
      return { success: false, message: `Student '${studentName}' not found.` };
    }
    if (matchingStudents.length > 1) {
      return {
        success: false,
        message: `I found multiple students matching '${studentName}'. Please specify which student to enroll.`,
        suggestions: matchingStudents.map(s => s.name),
      };
    }
    const student = matchingStudents[0];

    const allCourses = await this.getCourses();
    const course = allCourses.find(c => c.name.toLowerCase() === courseName.toLowerCase());
    if (!course) {
      return { success: false, message: `Course '${courseName}' not found.` };
    }

    if (student.enrolledCourses.some(ec => ec.courseId === course.id)) {
      return { success: false, message: `${student.name} is already enrolled in ${courseName}.` };
    }

    const newEnrolledCourse: EnrolledCourse = {
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

    const updatedCourses = [...student.enrolledCourses, newEnrolledCourse];
    await updateDoc(doc(db, 'students', student.id), { enrolledCourses: updatedCourses });

    return { success: true, message: `Successfully enrolled ${student.name} in ${courseName}.` };
  },

  async recordPaymentByName(studentName: string, courseName: string, amount: number, method: string): Promise<{ success: boolean; message: string; suggestions?: string[] }> {
    const matchingStudents = await this.findStudentsByName(studentName);
    if (matchingStudents.length === 0) {
      return { success: false, message: `Student '${studentName}' not found.` };
    }
    if (matchingStudents.length > 1) {
      return {
        success: false,
        message: `I found multiple students matching '${studentName}'. Please specify for whom to record the payment.`,
        suggestions: matchingStudents.map(s => s.name),
      };
    }
    const student = matchingStudents[0];

    const targetCourse = student.enrolledCourses.find(c => c.courseName.toLowerCase() === courseName.toLowerCase());
    if (!targetCourse) {
      return { success: false, message: `${student.name} is not enrolled in a course named '${courseName}'.` };
    }

    const payment: Omit<PaymentHistory, 'id'> = {
      date: new Date().toISOString().split('T')[0],
      amount,
      method,
      courseName: targetCourse.courseName,
    };

    await this.addPaymentToStudent(student.id, targetCourse.courseId, payment);
    return { success: true, message: `Successfully recorded payment of ${amount} for ${student.name} for the course ${targetCourse.courseName}.` };
  },


  // ===========================================================================
  // STUDENT SOURCES
  // ===========================================================================
  getStudentSources: async (): Promise<StudentSource[]> => docsToData(await getDocs(studentSourcesCol)),
  addStudentSource: async (data: Omit<StudentSource, 'id'>) => await addDoc(studentSourcesCol, data),

  // ===========================================================================
  // COURSES
  // ===========================================================================
  getCourses: async (): Promise<Course[]> => docsToData(await getDocs(coursesCol)),
  addCourse: async (data: Omit<Course, 'id'>) => {
    const ref = await addDoc(coursesCol, data);
    return { success: true, message: `Course '${data.name}' created.`, id: ref.id };
  },
  addCourseFromAI: async (args: Partial<Course>) => {
    const teachers = await firestoreService.getEmployees();
    const teacher = teachers.find(t => t.name.toLowerCase() === args.teacherName?.toLowerCase() && t.role === 'Trainer');
    if (!teacher) return { success: false, message: `Teacher '${args.teacherName}' not found or is not a trainer.` };
    const courseData = {
      name: args.name,
      description: args.description || '',
      teacherId: teacher.id,
      teacherName: teacher.name,
      duration: args.duration || 'N/A',
      price: args.price || 0,
      startDate: new Date().toISOString().split('T')[0],
      type: 'Online',
      image: '',
    };
    await addDoc(coursesCol, courseData);
    return { success: true, message: `Course '${args.name}' created.` };
  },
  updateCourse: async (id: string, data: Partial<Course>) => await updateDoc(doc(db, 'courses', id), data),
  updateCourseByName: async (name: string, updates: Partial<Course>) => {
    const allCourses = await firestoreService.getCourses();
    const course = allCourses.find(c => c.name.toLowerCase() === name.toLowerCase());
    if (!course) return { success: false, message: `Course '${name}' not found.` };
    if (updates.teacherName) {
      const teacher = (await firestoreService.getEmployees()).find(e => e.name.toLowerCase() === updates.teacherName?.toLowerCase());
      if (!teacher) return { success: false, message: `Teacher '${updates.teacherName}' not found.` };
      updates.teacherId = teacher.id;
    }
    await updateDoc(doc(db, 'courses', course.id), updates);
    return { success: true, message: `Course '${name}' updated.` };
  },
  deleteCourse: async (id: string) => await deleteDoc(doc(db, 'courses', id)),
  deleteCourseByName: async (name: string) => {
    const allCourses = await firestoreService.getCourses();
    const course = allCourses.find(c => c.name.toLowerCase() === name.toLowerCase());
    if (!course) return { success: false, message: `Course '${name}' not found.` };
    await deleteDoc(doc(db, 'courses', course.id));
    return { success: true, message: `Course '${name}' deleted.` };
  },

  // ===========================================================================
  // COURSE TEMPLATES
  // ===========================================================================
  getCourseTemplates: async (): Promise<CourseTemplate[]> => docsToData(await getDocs(courseTemplatesCol)),
  addCourseTemplate: async (data: Omit<CourseTemplate, 'id'>) => await addDoc(courseTemplatesCol, data),
  updateCourseTemplate: async (id: string, data: Partial<CourseTemplate>) => await updateDoc(doc(db, 'courseTemplates', id), data),
  deleteCourseTemplate: async (id: string) => await deleteDoc(doc(db, 'courseTemplates', id)),

  // ===========================================================================
  // EMPLOYEES
  // ===========================================================================
  getEmployees: async (): Promise<Employee[]> => {
    const allEmployees = docsToData<Employee>(await getDocs(employeesCol));
    const needsMigration = allEmployees.some(emp => emp.order === undefined || emp.order === null);
    if (needsMigration) {
      console.log("Employee order migration needed. Assigning default order.");
      const batch = writeBatch(db);
      const sortedForMigration = allEmployees.sort((a, b) => a.hireDate.localeCompare(b.hireDate) || a.name.localeCompare(b.name));

      sortedForMigration.forEach((emp, index) => {
        if (emp.order === undefined || emp.order === null) {
          emp.order = index;
          const empRef = doc(db, 'employees', emp.id);
          batch.update(empRef, { order: index });
        }
      });
      await batch.commit();
      console.log("Employee order migration complete.");
    }
    allEmployees.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return allEmployees;
  },
  addEmployee: async (data: Partial<Omit<Employee, 'id'>>) => {
    const employeeDefaults = {
      name: 'Unknown',
      email: '',
      phone: '',
      role: 'Support' as const,
      salary: 0,
      hireDate: new Date().toISOString().split('T')[0],
      biography: '',
      specializations: [],
      avatar: `https://i.pravatar.cc/150?u=${Date.now()}`,
      status: 'Active' as const,
      order: 0,
    };

    const cleanData = Object.entries(data).reduce((acc, [key, value]) => {
      if (value !== undefined) { (acc as any)[key] = value; }
      return acc;
    }, {} as Partial<Omit<Employee, 'id'>>);

    const finalEmployeeData: any = { ...employeeDefaults, ...cleanData };

    if (finalEmployeeData.order === undefined) {
      const snapshot = await getDocs(employeesCol);
      finalEmployeeData.order = snapshot.size;
    }

    if (!finalEmployeeData.name || finalEmployeeData.name === 'Unknown' || !finalEmployeeData.role) {
      return { success: false, message: "Cannot add employee: name and role are required." };
    }

    const ref = await addDoc(employeesCol, finalEmployeeData);
    return { success: true, message: `Employee '${finalEmployeeData.name}' added.`, id: ref.id };
  },
  updateEmployee: async (id: string, data: Partial<Employee>) => await updateDoc(doc(db, 'employees', id), data),
  updateEmployeeByName: async (name: string, updates: Partial<Employee>) => {
    const employees = await firestoreService.getEmployees();
    const employee = employees.find(e => e.name.toLowerCase() === name.toLowerCase());
    if (!employee) return { success: false, message: `Employee '${name}' not found.` };
    await updateDoc(doc(db, 'employees', employee.id), updates);
    return { success: true, message: `Employee '${name}' updated.` };
  },
  deleteEmployee: async (id: string) => await deleteDoc(doc(db, 'employees', id)),
  deleteEmployeeByName: async (name: string) => {
    const employees = await firestoreService.getEmployees();
    const employee = employees.find(e => e.name.toLowerCase() === name.toLowerCase());
    if (!employee) return { success: false, message: `Employee '${name}' not found.` };
    await deleteDoc(doc(db, 'employees', employee.id));
    return { success: true, message: `Employee '${name}' deleted.` };
  },
  updateEmployeesOrder: async (orderedEmployees: { id: string; order: number }[]): Promise<void> => {
    const batch = writeBatch(db);
    orderedEmployees.forEach(emp => {
      const empRef = doc(db, 'employees', emp.id);
      batch.update(empRef, { order: emp.order });
    });
    await batch.commit();
  },

  // ===========================================================================
  // TASKS
  // ===========================================================================
  getTasks: async (): Promise<Task[]> => docsToData(await getDocs(tasksCol)),
  addTask: async (data: Omit<Task, 'id'>) => await addDoc(tasksCol, data),
  addTaskFromAI: async (args: Partial<Omit<Task, 'id' | 'assigneeId'>> & { assigneeName?: string }) => {
    const employees = await firestoreService.getEmployees();
    const assignee = employees.find(e => e.name.toLowerCase() === args.assigneeName?.toLowerCase()) || employees.find(e => e.name === 'Margarita Gulina');
    const taskData: Omit<Task, 'id'> = {
      title: args.title || 'Untitled Task',
      details: args.details || '',
      assigneeId: assignee?.id || '',
      assigneeName: assignee?.name || args.assigneeName || 'Margarita Gulina',
      dueDate: args.dueDate || new Date().toISOString().split('T')[0],
      priority: args.priority || 'Medium',
      status: 'To Do',
    };
    await addDoc(tasksCol, taskData);
    return { success: true, message: `Task "${taskData.title}" created.` };
  },
  updateTask: async (id: string, data: Partial<Task>) => await updateDoc(doc(db, 'tasks', id), data),
  updateTaskByName: async (title: string, updates: Partial<Task> & { assigneeName?: string }) => {
    const tasks = await firestoreService.getTasks();
    const task = tasks.find(t => t.title.toLowerCase() === title.toLowerCase());
    if (!task) return { success: false, message: `Task '${title}' not found.` };

    const { assigneeName, ...restUpdates } = updates;
    const finalUpdates: Partial<Task> = { ...restUpdates };

    if (assigneeName) {
      const assignee = (await firestoreService.getEmployees()).find(e => e.name.toLowerCase() === assigneeName.toLowerCase());
      if (!assignee) return { success: false, message: `Assignee '${assigneeName}' not found.` };
      finalUpdates.assigneeId = assignee.id;
      finalUpdates.assigneeName = assignee.name;
    }

    await updateDoc(doc(db, 'tasks', task.id), finalUpdates);
    return { success: true, message: `Task '${title}' updated.` };
  },
  deleteTask: async (id: string) => await deleteDoc(doc(db, 'tasks', id)),
  deleteTaskByName: async (title: string) => {
    const tasks = await firestoreService.getTasks();
    const task = tasks.find(t => t.title.toLowerCase() === title.toLowerCase());
    if (!task) return { success: false, message: `Task '${title}' not found.` };
    await deleteDoc(doc(db, 'tasks', task.id));
    return { success: true, message: `Task '${title}' deleted.` };
  },
  listTasks: async (filters: { assigneeName?: string; status?: 'To Do' | 'In Progress' | 'Done' }) => {
    let tasks = await firestoreService.getTasks();
    if (filters.assigneeName) {
      tasks = tasks.filter(t => t.assigneeName.toLowerCase() === filters.assigneeName?.toLowerCase());
    }
    if (filters.status) {
      tasks = tasks.filter(t => t.status === filters.status);
    }
    if (tasks.length === 0) return { message: 'No tasks found matching criteria.' };
    const taskList = tasks.map(t => `- "${t.title}" (assigned to ${t.assigneeName}, status: ${t.status})`).join('\n');
    return { message: `Found ${tasks.length} tasks:\n${taskList}` };
  },

  // ===========================================================================
  // INCOME & EXPENSES
  // ===========================================================================
  getIncome: async (): Promise<Income[]> => docsToData(await getDocs(incomeCol)),
  addIncome: async (data: Omit<Income, 'id'>) => {
    const ref = await addDoc(incomeCol, data);
    return { success: true, message: `Income of ${data.amount} for '${data.description}' recorded.`, id: ref.id };
  },
  updateIncome: async (id: string, data: Partial<Income>) => await updateDoc(doc(db, 'income', id), data),
  deleteIncome: async (id: string) => await deleteDoc(doc(db, 'income', id)),
  deleteIncomeByDescription: async (description: string) => {
    const allIncome = await firestoreService.getIncome();
    const income = allIncome.find(i => i.description.toLowerCase() === description.toLowerCase());
    if (!income) return { success: false, message: `Income record '${description}' not found.` };
    await deleteDoc(doc(db, 'income', income.id));
    return { success: true, message: `Income record '${description}' deleted.` };
  },

  syncLegacyPayments: async () => {
    const students = await firestoreService.getStudents();
    let syncedCount = 0;

    for (const student of students) {
      let studentModified = false;
      const updatedCourses = await Promise.all(student.enrolledCourses.map(async course => {
        let historyModified = false;
        const updatedHistory = await Promise.all((course.paymentHistory || []).map(async payment => {
          if (!payment.incomeId) {
            // Create Income
            const incomeEntry = {
              date: payment.date,
              amount: Number(payment.amount),
              description: `Payment from ${student.name} for course '${course.courseName}'`
            };
            const ref = await addDoc(incomeCol, incomeEntry);
            syncedCount++;
            historyModified = true;
            return { ...payment, incomeId: ref.id };
          }
          return payment;
        }));

        if (historyModified) {
          studentModified = true;
          return { ...course, paymentHistory: updatedHistory };
        }
        return course;
      }));

      if (studentModified) {
        await updateDoc(doc(db, 'students', student.id), { enrolledCourses: updatedCourses });
      }
    }
    return { success: true, message: `Synced ${syncedCount} legacy payments.` };
  },

  getExpenses: async (): Promise<Expense[]> => docsToData(await getDocs(expensesCol)),
  addExpense: async (data: Omit<Expense, 'id'>) => {
    await addDoc(expensesCol, data);
    return { success: true, message: `Expense '${data.name}' recorded.` };
  },
  updateExpense: async (id: string, data: Partial<Expense>) => await updateDoc(doc(db, 'expenses', id), data),
  deleteExpense: async (id: string) => await deleteDoc(doc(db, 'expenses', id)),
  deleteExpenseByName: async (name: string) => {
    const allExpenses = await firestoreService.getExpenses();
    const expense = allExpenses.find(e => e.name.toLowerCase() === name.toLowerCase());
    if (!expense) return { success: false, message: `Expense record '${name}' not found.` };
    await deleteDoc(doc(db, 'expenses', expense.id));
    return { success: true, message: `Expense record '${name}' deleted.` };
  },
  getFinancialSummary: async (days?: number) => {
    const income = await firestoreService.getIncome();
    const expenses = await firestoreService.getExpenses();
    const endDate = new Date();
    const startDate = new Date();
    if (days) {
      startDate.setDate(endDate.getDate() - days);
    } else {
      startDate.setFullYear(1970);
    }
    const filterByDate = (item: Income | Expense) => {
      const itemDate = new Date(item.date);
      return itemDate >= startDate && itemDate <= endDate;
    };
    const totalIncome = income.filter(filterByDate).reduce((sum, item) => sum + Number(item.amount), 0);
    const totalExpenses = expenses.filter(filterByDate).reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unitPrice)), 0);
    const netProfit = totalIncome - totalExpenses;
    return { success: true, message: `Financial summary for the last ${days || 'all time'} days:\n- Total Income: ${totalIncome.toFixed(2)} USD\n- Total Expenses: ${totalExpenses.toFixed(2)} USD\n- Net Profit: ${netProfit.toFixed(2)} USD` };
  },


  getExpenseCategories: async (): Promise<ExpenseCategory[]> => docsToData(await getDocs(expenseCategoriesCol)),
  addExpenseCategory: async (data: Omit<ExpenseCategory, 'id'>) => await addDoc(expenseCategoriesCol, data),
  updateExpenseCategory: async (id: string, data: Partial<ExpenseCategory>) => await updateDoc(doc(db, 'expenseCategories', id), data),
  deleteExpenseCategory: async (id: string) => await deleteDoc(doc(db, 'expenseCategories', id)),

  // ===========================================================================
  // DASHBOARD & PREPARATION
  // ===========================================================================
  getAdvisorSuggestions: async (): Promise<AdvisorSuggestion[]> => docsToData(await getDocs(advisorSuggestionsCol)),
  getCoursePreparations: async (): Promise<CoursePreparation[]> => docsToData(await getDocs(coursePreparationsCol)),
  addCoursePreparation: async (data: Omit<CoursePreparation, 'id'>) => await addDoc(coursePreparationsCol, data),
  updateCoursePreparation: async (id: string, data: Partial<CoursePreparation>) => await updateDoc(doc(db, 'coursePreparations', id), data),

  // ===========================================================================
  // RAG & MEMORY
  // ===========================================================================
  async rememberFact(fact: string, category: string = 'general') {
    await addDoc(dynamicMemoryCol, {
      fact,
      category,
      timestamp: new Date().toISOString()
    });
    return { success: true, message: "Факт успішно збережено в пам'яті." };
  },

  async fetchRAGKnowledge(): Promise<string> {
    const snapshot = await getDocs(ragKnowledgeCol);
    let staticKnowledge = "No knowledge base information available.";
    if (!snapshot.empty) {
      staticKnowledge = snapshot.docs[0].data().content || "";
    }

    // Fetch dynamic memory
    const memorySnapshot = await getDocs(dynamicMemoryCol);
    const memories = memorySnapshot.docs.map(d => `- ${d.data().fact} (Category: ${d.data().category})`).join('\n');

    return `${staticKnowledge}\n\n--- Dynamic Memories (User Preferences & New Facts) ---\n${memories}`;
  },

  async ensureMemoryInitialized() {
    const snapshot = await getDocs(dynamicMemoryCol);
    if (snapshot.empty) {
      console.log("Initializing dynamic memory collection...");
      await this.rememberFact("Memory module initialized", "system");
    }
  },

  async saveAdvisorSuggestions(suggestions: Omit<AdvisorSuggestion, 'id'>[]) {
    try {
      const batch = writeBatch(db);

      // Delete old suggestions
      const existingSnapshot = await getDocs(advisorSuggestionsCol);
      existingSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // Add new suggestions
      suggestions.forEach((suggestion) => {
        const newDocRef = doc(advisorSuggestionsCol);
        batch.set(newDocRef, suggestion);
      });

      await batch.commit();
      console.log("Advisor suggestions updated.");
    } catch (error) {
      console.error("Error saving advisor suggestions:", error);
      throw error;
    }
  },
};