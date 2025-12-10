import { Student } from '../../types';
import { firestoreService } from '../../services/firestoreService';

/**
 * Handles AI function calls and returns tool responses.
 * Maps function names to their corresponding firestoreService methods.
 */
export async function handleFunctionCall(functionCalls: any[]): Promise<any[]> {
    const toolResponses: any[] = [];

    for (const call of functionCalls) {
        try {
            const { id, name, args } = call;
            if (!id) {
                console.warn('Received function call without ID, skipping:', call);
                continue;
            }

            let result: any;

            // ===== MEMORY =====
            if (name === 'rememberFact') {
                result = await firestoreService.rememberFact(args.fact, args.category);
            }

            // ===== STUDENT =====
            else if (name === 'listStudents') {
                const students: Student[] = await firestoreService.findStudents(args);
                if (students.length === 0) {
                    result = { message: "I couldn't find any students matching those criteria." };
                } else {
                    const studentList = students.map(s => {
                        const debt = s.enrolledCourses.reduce((acc, c) => acc + Number(c.priceDue), 0);
                        return `- ${s.name} (${s.status})${debt > 0 ? ` - Owes ${debt.toFixed(2)} USD` : ''}`;
                    }).join('\n');
                    result = { message: `I found ${students.length} student(s):\n${studentList}` };
                }
            } else if (name === 'getStudentDetailsByName') {
                result = await firestoreService.getStudentDetailsByName(args.name);
            } else if (name === 'updateStudentDetails') {
                const { studentName, ...updates } = args;
                const cleanUpdates = Object.entries(updates).reduce((acc, [key, value]) => {
                    if (value !== undefined) {
                        acc[key] = value;
                    }
                    return acc;
                }, {} as any);
                result = await firestoreService.updateStudentDetailsByName(studentName, cleanUpdates);
            } else if (name === 'enrollStudentInCourse') {
                result = await firestoreService.enrollStudentInCourseByName(args.studentName, args.courseName);
            } else if (name === 'recordStudentPayment') {
                result = await firestoreService.recordPaymentByName(
                    args.studentName,
                    args.courseName,
                    args.amount,
                    args.paymentMethod || 'Карта'
                );
            } else if (name === 'addStudent') {
                result = await firestoreService.addStudent(args);
            } else if (name === 'deleteStudent') {
                result = await firestoreService.deleteStudentByName(args.name);
            } else if (name === 'addNoteToStudent') {
                result = await firestoreService.addNoteToStudentByName(args.studentName, args.content);
            }

            // ===== TASK =====
            else if (name === 'addTask') {
                result = await firestoreService.addTaskFromAI(args);
            } else if (name === 'updateTask') {
                result = await firestoreService.updateTaskByName(args.taskTitle, args);
            } else if (name === 'deleteTask') {
                result = await firestoreService.deleteTaskByName(args.title);
            } else if (name === 'listTasks') {
                result = await firestoreService.listTasks(args);
            }

            // ===== EMPLOYEE =====
            else if (name === 'addEmployee') {
                result = await firestoreService.addEmployee(args);
            } else if (name === 'updateEmployee') {
                result = await firestoreService.updateEmployeeByName(args.name, args);
            } else if (name === 'deleteEmployee') {
                result = await firestoreService.deleteEmployeeByName(args.name);
            }

            // ===== COURSE =====
            else if (name === 'addCourse') {
                result = await firestoreService.addCourseFromAI(args);
            } else if (name === 'updateCourse') {
                result = await firestoreService.updateCourseByName(args.name, args);
            } else if (name === 'deleteCourse') {
                result = await firestoreService.deleteCourseByName(args.name);
            }

            // ===== FINANCE =====
            else if (name === 'addIncome') {
                result = await firestoreService.addIncome({
                    ...args,
                    date: new Date().toISOString().split('T')[0]
                });
            } else if (name === 'addExpense') {
                result = await firestoreService.addExpense({
                    ...args,
                    date: new Date().toISOString().split('T')[0],
                    unit: args.unit || 'unit',
                    paymentMethod: 'Card'
                });
            } else if (name === 'deleteIncome') {
                result = await firestoreService.deleteIncomeByDescription(args.description);
            } else if (name === 'deleteExpense') {
                result = await firestoreService.deleteExpenseByName(args.name);
            } else if (name === 'getFinancialSummary') {
                result = await firestoreService.getFinancialSummary(args.days);
            }

            // ===== UNKNOWN =====
            else {
                result = { error: 'Unknown function' };
            }

            toolResponses.push({
                id,
                name,
                response: { result }
            });

        } catch (error: any) {
            console.error(`Error executing function call "${call.name}":`, error);
            if (call.id) {
                toolResponses.push({
                    id: call.id,
                    name: call.name,
                    response: { error: `Function execution failed: ${error.message}` }
                });
            }
        }
    }

    return toolResponses;
}

/**
 * Format tool responses into a user-friendly message
 */
export function formatToolResponses(toolResponses: any[]): string {
    return toolResponses.map(tr => {
        const res = tr.response.result;
        if (res.suggestions && res.suggestions.length > 0) {
            const suggestionsList = res.suggestions.map((s: any) => `- ${s.name || s}`).join('\n');
            return `${res.message}\n${suggestionsList}`;
        }
        return res.message || `Action ${tr.name} performed.`;
    }).join('\n');
}
