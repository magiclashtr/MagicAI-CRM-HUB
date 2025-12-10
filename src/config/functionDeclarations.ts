import { FunctionDeclaration, Type } from '@google/genai';

/**
 * Function declarations for AI assistant (Mira) CRM operations.
 * These define the tools available to the Gemini model for function calling.
 */
export const functionDeclarations: FunctionDeclaration[] = [
    // --- MEMORY ---
    {
        name: 'rememberFact',
        parameters: {
            type: Type.OBJECT,
            description: "Store a new fact, preference, or rule in long-term memory. Use this when the user explicitly asks to remember something or provides important context that should persist (e.g., 'My name is X', 'I prefer Y', 'We don't work on Sundays').",
            properties: {
                fact: { type: Type.STRING, description: 'The content of the fact to remember.' },
                category: { type: Type.STRING, description: "A category for the fact (e.g., 'user_preference', 'business_rule', 'general'). Defaults to 'general'." }
            },
            required: ['fact']
        }
    },

    // --- STUDENT MANAGEMENT ---
    {
        name: 'addStudent',
        parameters: {
            type: Type.OBJECT,
            description: 'Create a new student in the CRM.',
            properties: {
                name: { type: Type.STRING, description: 'The full name of the student.' },
                email: { type: Type.STRING, description: "The student's email address." },
                phone: { type: Type.STRING, description: "The student's phone number." },
                source: { type: Type.STRING, description: 'How the student was acquired (e.g., Instagram).' }
            },
            required: ['name']
        }
    },
    {
        name: 'deleteStudent',
        parameters: {
            type: Type.OBJECT,
            description: 'Delete a student from the CRM by their name.',
            properties: {
                name: { type: Type.STRING, description: 'The full or partial name of the student to delete.' }
            },
            required: ['name']
        }
    },
    {
        name: 'addNoteToStudent',
        parameters: {
            type: Type.OBJECT,
            description: "Add a note to a specific student's profile.",
            properties: {
                studentName: { type: Type.STRING, description: 'The full or partial name of the student.' },
                content: { type: Type.STRING, description: 'The content of the note.' }
            },
            required: ['studentName', 'content']
        }
    },
    {
        name: 'listStudents',
        parameters: {
            type: Type.OBJECT,
            description: 'List students based on optional filters like status, debt, or course enrollment. Shows all students if no filters are provided.',
            properties: {
                status: { type: Type.STRING, enum: ['Active', 'Pending', 'Graduated', 'Dropped'], description: 'Filter students by their status.' },
                hasDebt: { type: Type.BOOLEAN, description: 'Filter for students who have an outstanding balance.' },
                courseName: { type: Type.STRING, description: 'Filter students by a specific course they are enrolled in.' }
            }
        }
    },
    {
        name: 'getStudentDetailsByName',
        parameters: {
            type: Type.OBJECT,
            description: "Get a student's details by their full or partial name. Returns suggestions if the name is ambiguous.",
            properties: {
                name: { type: Type.STRING, description: 'The full or partial name of the student to search for.' }
            },
            required: ['name']
        }
    },
    {
        name: 'updateStudentDetails',
        parameters: {
            type: Type.OBJECT,
            description: "Update a student's details like name, email, phone, status, or source. Can search by partial name.",
            properties: {
                studentName: { type: Type.STRING, description: 'The full or partial name of the student to update.' },
                newName: { type: Type.STRING, description: "The student's new full name." },
                email: { type: Type.STRING, description: "The student's new email." },
                phone: { type: Type.STRING, description: "The student's new phone number." },
                messenger: { type: Type.STRING, description: "The student's new messenger contact." },
                source: { type: Type.STRING, description: "The student's new source." },
                status: { type: Type.STRING, enum: ['Active', 'Pending', 'Graduated', 'Dropped'], description: "The student's new status." }
            },
            required: ['studentName']
        }
    },
    {
        name: 'enrollStudentInCourse',
        parameters: {
            type: Type.OBJECT,
            description: 'Enroll an existing student in a new course. Can search by partial student name.',
            properties: {
                studentName: { type: Type.STRING, description: 'The full or partial name of the student to enroll.' },
                courseName: { type: Type.STRING, description: 'The name of the course to enroll the student in.' }
            },
            required: ['studentName', 'courseName']
        }
    },
    {
        name: 'recordStudentPayment',
        parameters: {
            type: Type.OBJECT,
            description: 'Record a payment from a student for a specific course. Can search by partial student name.',
            properties: {
                studentName: { type: Type.STRING, description: 'The full or partial name of the student making the payment.' },
                courseName: { type: Type.STRING, description: 'The name of the course for which the payment is being made.' },
                amount: { type: Type.NUMBER, description: 'The amount of the payment.' },
                paymentMethod: { type: Type.STRING, enum: ['Карта', 'Наличные', 'IBAN', 'Криптовалюта', 'Другое'], description: "The method of payment. Defaults to 'Карта'." }
            },
            required: ['studentName', 'courseName', 'amount']
        }
    },

    // --- TASK MANAGEMENT ---
    {
        name: 'addTask',
        parameters: {
            type: Type.OBJECT,
            description: 'Create a new task in the system.',
            properties: {
                title: { type: Type.STRING, description: 'The title of the task.' },
                details: { type: Type.STRING, description: 'Optional details about the task.' },
                assigneeName: { type: Type.STRING, description: "The name of the employee assigned to the task. Defaults to 'Margarita Gulina'." },
                dueDate: { type: Type.STRING, description: "The due date in YYYY-MM-DD format. Defaults to today's date." },
                priority: { type: Type.STRING, enum: ['High', 'Medium', 'Low'], description: "The task priority. Defaults to 'Medium'." }
            },
            required: ['title']
        }
    },
    {
        name: 'updateTask',
        parameters: {
            type: Type.OBJECT,
            description: 'Update an existing task by its title.',
            properties: {
                taskTitle: { type: Type.STRING, description: 'The title of the task to update.' },
                newTitle: { type: Type.STRING, description: 'The new title for the task.' },
                status: { type: Type.STRING, enum: ['To Do', 'In Progress', 'Done'], description: 'The new status of the task.' },
                assigneeName: { type: Type.STRING, description: 'The new assignee for the task.' },
                dueDate: { type: Type.STRING, description: 'The new due date in YYYY-MM-DD format.' },
                priority: { type: Type.STRING, enum: ['High', 'Medium', 'Low'], description: 'The new priority for the task.' }
            },
            required: ['taskTitle']
        }
    },
    {
        name: 'deleteTask',
        parameters: {
            type: Type.OBJECT,
            description: 'Delete a task by its title.',
            properties: {
                title: { type: Type.STRING, description: 'The title of the task to delete.' }
            },
            required: ['title']
        }
    },
    {
        name: 'listTasks',
        parameters: {
            type: Type.OBJECT,
            description: 'List tasks, optionally filtered by assignee or status.',
            properties: {
                assigneeName: { type: Type.STRING, description: 'Filter tasks by the name of the assignee.' },
                status: { type: Type.STRING, enum: ['To Do', 'In Progress', 'Done'], description: 'Filter tasks by their status.' }
            }
        }
    },

    // --- EMPLOYEE MANAGEMENT ---
    {
        name: 'addEmployee',
        parameters: {
            type: Type.OBJECT,
            description: 'Add a new employee to the CRM.',
            properties: {
                name: { type: Type.STRING, description: 'Full name.' },
                email: { type: Type.STRING, description: 'Email address.' },
                phone: { type: Type.STRING, description: 'Phone number.' },
                role: { type: Type.STRING, description: 'Role (e.g., Trainer, Manager).' },
                salary: { type: Type.NUMBER, description: 'Monthly salary in USD.' }
            },
            required: ['name', 'role']
        }
    },
    {
        name: 'updateEmployee',
        parameters: {
            type: Type.OBJECT,
            description: "Update an employee's details by name.",
            properties: {
                name: { type: Type.STRING, description: 'The name of the employee to update.' },
                newName: { type: Type.STRING, description: "The employee's new name." },
                email: { type: Type.STRING, description: 'New email.' },
                phone: { type: Type.STRING, description: 'New phone.' },
                role: { type: Type.STRING, description: 'New role.' },
                salary: { type: Type.NUMBER, description: 'New salary.' },
                status: { type: Type.STRING, enum: ['Active', 'On Leave', 'Terminated'], description: 'New status.' }
            },
            required: ['name']
        }
    },
    {
        name: 'deleteEmployee',
        parameters: {
            type: Type.OBJECT,
            description: 'Delete an employee by name.',
            properties: {
                name: { type: Type.STRING, description: 'The name of the employee to delete.' }
            },
            required: ['name']
        }
    },

    // --- COURSE MANAGEMENT ---
    {
        name: 'addCourse',
        parameters: {
            type: Type.OBJECT,
            description: 'Add a new course to the catalog.',
            properties: {
                name: { type: Type.STRING, description: 'Name of the course.' },
                description: { type: Type.STRING, description: 'A short description.' },
                teacherName: { type: Type.STRING, description: 'Name of the assigned teacher.' },
                duration: { type: Type.STRING, description: 'Duration (e.g., 5 days).' },
                price: { type: Type.NUMBER, description: 'Price in USD.' }
            },
            required: ['name', 'teacherName', 'price']
        }
    },
    {
        name: 'updateCourse',
        parameters: {
            type: Type.OBJECT,
            description: "Update a course's details by name.",
            properties: {
                name: { type: Type.STRING, description: 'The name of the course to update.' },
                newName: { type: Type.STRING, description: 'The new name for the course.' },
                description: { type: Type.STRING, description: 'New description.' },
                teacherName: { type: Type.STRING, description: "New teacher's name." },
                price: { type: Type.NUMBER, description: 'New price in USD.' }
            },
            required: ['name']
        }
    },
    {
        name: 'deleteCourse',
        parameters: {
            type: Type.OBJECT,
            description: 'Delete a course by name.',
            properties: {
                name: { type: Type.STRING, description: 'The name of the course to delete.' }
            },
            required: ['name']
        }
    },

    // --- FINANCIAL MANAGEMENT ---
    {
        name: 'addIncome',
        parameters: {
            type: Type.OBJECT,
            description: 'Record a new income entry.',
            properties: {
                description: { type: Type.STRING, description: 'Description of the income.' },
                amount: { type: Type.NUMBER, description: 'Amount in USD.' }
            },
            required: ['description', 'amount']
        }
    },
    {
        name: 'addExpense',
        parameters: {
            type: Type.OBJECT,
            description: 'Record a new expense entry.',
            properties: {
                category: { type: Type.STRING, description: 'The category of the expense.' },
                name: { type: Type.STRING, description: 'A specific name for the expense.' },
                unitPrice: { type: Type.NUMBER, description: 'The price per unit in USD.' },
                quantity: { type: Type.NUMBER, description: 'The quantity.' }
            },
            required: ['category', 'name', 'unitPrice', 'quantity']
        }
    },
    {
        name: 'deleteIncome',
        parameters: {
            type: Type.OBJECT,
            description: 'Delete an income record by its description.',
            properties: {
                description: { type: Type.STRING, description: 'The description of the income record to delete.' }
            },
            required: ['description']
        }
    },
    {
        name: 'deleteExpense',
        parameters: {
            type: Type.OBJECT,
            description: 'Delete an expense record by its name.',
            properties: {
                name: { type: Type.STRING, description: 'The name of the expense record to delete.' }
            },
            required: ['name']
        }
    },
    {
        name: 'getFinancialSummary',
        parameters: {
            type: Type.OBJECT,
            description: 'Get a financial summary for a given period.',
            properties: {
                days: { type: Type.NUMBER, description: 'The number of past days to summarize (e.g., 30 for the last month).' }
            }
        }
    }
];
