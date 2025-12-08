import { collection, getDocs, writeBatch, doc, addDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Student, Course, Employee, Income, Expense, ExpenseCategory, Task, StudentSource, CourseTemplate, AdvisorSuggestion } from '../types';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

// Fix: Add docToData and docsToData helpers to process Firestore results.
const docToData = <T>(d: any): T => ({ id: d.id, ...d.data() } as T);
const docsToData = <T>(snapshot: any): T[] => snapshot.docs.map(docToData);


// =============================================================================
// DATA TO SEED
// =============================================================================

const ragKnowledgeContent = `# MagicGenAI-CRM: Документація Застосунку та Помічника Mira

## 1. Огляд Застосунку

**MagicGenAI-CRM** — це передова CRM-система, розроблена спеціально для "Magic Lash Academy". В її основі лежить розумний AI-помічник **Mira**, що працює на базі Google Gemini AI, для оптимізації управління навчанням, фінансами та завданнями. Mira може розуміти як текстові, так і голосові команди для виконання будь-яких дій у системі.

### Ключові Особливості:
*   **Всемогутній AI-Помічник Mira**: Mira може створювати, читати, оновлювати та видаляти (CRUD) будь-які дані в системі: студентів, курси, співробітників, фінанси та завдання.
*   **Голосове Керування**: Повноцінна голосова взаємодія в реальному часі для виконання будь-яких команд без використання рук.
*   **RAG (Retrieval-Augmented Generation)**: Mira використовує цю документацію як свою "пам'ять", щоб точно відповідати на питання про свої можливості та функціонал CRM.

## 2. Можливості AI-Помічника Mira

Mira може виконувати широкий спектр завдань. Звертайтеся до неї за іменем або просто давайте команди.

### 2.1. Управління Студентами
*   **Створення**: \`"Створи нового студента з ім'ям Іван Петров, email ivan@example.com"\`
*   **Пошук та Перегляд**: \`"Знайди студентку Ярен"\` або \`"Яка інформація по Ніхал Язиджи?"\`
*   **Оновлення**: \`"Онови статус для Ярен на 'Active'"\` або \`"Зміни телефон для Ніхал на 12345"\`
*   **Видалення**: \`"Видали студентку Ярен"\`
*   **Нотатки**: \`"Додай нотатку для Ніхал: планує записатися на наступний курс"\`
*   **Запис на Курс**: \`"Запиши Ярен на курс Full Start"\`
*   **Реєстрація Оплати**: \`"Зареєструй оплату 100 доларів від Ніхал за курс Brow Bomber"\`
*   **Списки та Звіти**: \`"Покажи всіх студентів з боргами"\` або \`"Хто зі студентів має статус Pending?"\`

### 2.2. Управління Співробітниками
*   **Створення**: \`"Додай нового співробітника Марія Іванова на посаду Тренер з зарплатою 1500 доларів"\`
*   **Перегляд**: \`"Знайди інформацію про співробітника Маргарита"\`
*   **Оновлення**: \`"Онови зарплату для Маргарити до 2000 доларів"\`
*   **Видалення**: \`"Видали співробітника Марія Іванова"\`

### 2.3. Управління Курсами
*   **Створення**: \`"Створи новий курс 'Advanced Lamination' з викладачем Маргарита Гуліна та ціною 300 доларів"\`
*   **Перегляд**: \`"Які курси у нас є?"\`
*   **Оновлення**: \`"Зміни ціну курсу 'Full Start' на 850 доларів"\`
*   **Видалення**: \`"Видали курс 'Art Volume'"\`

#### 2.3.1. Поточний Каталог Курсів
Ось повний перелік доступних курсів з детальною інформацією:
*   **Full Start**: Комплексний базовий курс для початківців, що охоплює всі фундаментальні техніки нарощування вій.
    *   **Викладач**: Margarita Gulina
    *   **Тривалість**: 10 днів
    *   **Ціна**: 825 USD
*   **Full Start VIP**: Індивідуальний розширений курс "Full Start" з додатковими практичними заняттями та бізнес-модулем.
    *   **Викладач**: Margarita Gulina
    *   **Тривалість**: 12 днів
    *   **Ціна**: 1200 USD
*   **Art Volume**: Просунутий курс для майстрів, що хочуть освоїти техніки створення об'ємних вій.
    *   **Викладач**: Margarita Gulina
    *   **Тривалість**: 3 дні
    *   **Ціна**: 650 USD
*   **Brow Bomber**: Експрес-курс з ламінування та стилізації брів.
    *   **Викладач**: Nurgül Esenakunova
    *   **Тривалість**: 1 день
    *   **Ціна**: 75 USD
*   **Online 3in1**: Онлайн-курс, що поєднує три популярні техніки: ламінування вій, ламінування брів та ботокс вій.
    *   **Викладач**: Margarita Gulina
    *   **Тривалість**: 3 тижні
    *   **Ціна**: 480 USD

### 2.4. Управління Фінансами
*   **Доходи**: \`"Додай дохід 500 доларів з описом 'Продаж матеріалів'"\`
*   **Витрати**: \`"Додай витрату: категорія 'Оплата послуг', назва 'Реклама', ціна 250 доларів, кількість 1"\`
*   **Видалення**: \`"Видали дохід 'Продаж матеріалів'"\` або \`"Видали витрату 'Реклама'"\`
*   **Звіти**: \`"Покажи фінансовий звіт за останні 30 днів"\`

### 2.5. Управління Завданнями
*   **Створення**: \`"Створи завдання 'Підготувати матеріали для курсу' для Маргарити"\`
*   **Перегляд**: \`"Які завдання в роботі у Маргарити?"\` або \`"Покажи всі завдання зі статусом 'To Do'"\`
*   **Оновлення**: \`"Зміни статус завдання 'Підготувати матеріали' на 'Done'"\` або \`"Онови пріоритет завдання 'Зателефонувати клієнтам' на 'High'"\`
*   **Видалення**: \`"Видали завдання 'Підготувати матеріали'"\`

### 2.6. Питання про Систему
*   **Загальні питання**: \`"Mira, що ти вмієш робити?"\`
*   **Конкретні питання**: \`"Як мені додати нового студента?"\` або \`"Як змінити статус завдання?"\`

Mira використовує цю документацію для відповідей, тому вона завжди знає про свої актуальні можливості.
`;

const employeesData: Omit<Employee, 'id'>[] = [
    { name: 'Margarita Gulina', email: 'magiclash.tr@gmail.com', phone: '+905551234567', role: 'Trainer', salary: 75000, hireDate: '2023-01-15', biography: 'Founder and Head Trainer specializing in advanced lash techniques and business development.', specializations: ['VIP', 'Full Start', 'Online 3in1'], avatar: 'https://i.pravatar.cc/150?u=margarita', status: 'Active', order: 0 },
    { name: 'Nurgül Esenakunova', email: 'magiclash.tr1@gmail.com', phone: '+905551234568', role: 'Trainer', salary: 75000, hireDate: '2023-05-20', biography: 'Experienced trainer with a focus on beginner courses and foundational skills.', specializations: ['Full Start (Nurgül)'], avatar: 'https://i.pravatar.cc/150?u=nurgul', status: 'Active', order: 1 },
    { name: 'Alina Ternychenko', email: 'al6ka2@gmail.com', phone: '+905551234569', role: 'Master', salary: 60000, hireDate: '2024-02-10', biography: 'Master artist known for her precision in classic and volume lash applications.', specializations: [], avatar: 'https://i.pravatar.cc/150?u=alina', status: 'Active', order: 2 },
    { name: 'Murat Gurbanov', email: 'murat.ist@gmail.com', phone: '+905551234570', role: 'Marketing Manager', salary: 80000, hireDate: '2022-11-01', biography: 'Leads marketing and student acquisition strategies.', specializations: [], avatar: 'https://i.pravatar.cc/150?u=murat', status: 'Active', order: 3 },
    { name: 'Dilek Sultan Baltaş', email: 'dileksultanbeauty@gmail.com', phone: '+905551234571', role: 'Master', salary: 60000, hireDate: '2023-09-05', biography: 'A creative master artist specializing in brow and lash styling.', specializations: [], avatar: 'https://i.pravatar.cc/150?u=dilek', status: 'Active', order: 4 },
    { name: 'DV', email: 'dmitry.vasilievich@gmail.com', phone: '+905551234572', role: 'Creator', salary: 90000, hireDate: '2022-10-01', biography: 'The visionary behind the academy, overseeing operations and development.', specializations: [], avatar: 'https://i.pravatar.cc/150?u=dv', status: 'Active', order: 5 },
    { name: 'Gülcan Uzan', email: 'gulcanuzarozcan@gmail.com', phone: '+905551234573', role: 'Master Artist', salary: 60000, hireDate: '2024-01-20', biography: 'Specializing in classic extensions and creating perfect, natural looks.', specializations: [], avatar: 'https://i.pravatar.cc/150?u=gulcan', status: 'Active', order: 6 },
];
const coursesData: Omit<Course, 'id'>[] = [
    { name: 'Full Start', description: 'Комплексний базовий курс для початківців, що охоплює всі фундаментальні техніки нарощування вій.', image: '', teacherId: '', teacherName: 'Margarita Gulina', duration: '10 днів', price: 825, startDate: '2026-02-10', type: 'Ochnyy' },
    { name: 'Full Start VIP', description: 'Індивідуальний розширений курс "Full Start" з додатковими практичними заняттями та бізнес-модулем.', image: '', teacherId: '', teacherName: 'Margarita Gulina', duration: '12 днів', price: 1200, startDate: '2026-02-15', type: 'Ochnyy' },
    { name: 'Art Volume', description: 'Просунутий курс для майстрів, що хочуть освоїти техніки створення об\'ємних вій.', image: '', teacherId: '', teacherName: 'Margarita Gulina', duration: '3 дні', price: 650, startDate: '2026-03-05', type: 'Specialized' },
    { name: 'Brow Bomber', description: 'Експрес-курс з ламінування та стилізації брів.', image: '', teacherId: '', teacherName: 'Nurgül Esenakunova', duration: '1 день', price: 75, startDate: '2026-01-25', type: 'Workshop' },
    { name: 'Online 3in1', description: 'Онлайн-курс, що поєднує три популярні техніки: ламінування вій, ламінування брів та ботокс вій.', image: '', teacherId: '', teacherName: 'Margarita Gulina', duration: '3 тижні', price: 480, startDate: '2025-11-20', type: 'Online' },
];
const studentsData: Omit<Student, 'id'>[] = [
    { name: 'Nihal Yazıcı', email: 'nihalyazici555@gmail.com', phone: '(+90) 546699302', messenger: 'N/A', source: 'WhatsApp', registrationDate: '2025-03-20', managerUid: '', status: 'Graduated', notes: [], enrolledCourses: [ { courseId: '', courseName: 'Brow Bomber', startDate: '2026-01-25', price: 75, pricePaid: 75, priceDue: 0, paymentStatus: 'Paid', progress: 100, paymentHistory: [{ id: 'ph-nihal-3', date: '2025-03-20', amount: 75, method: 'Карта', courseName: 'Brow Bomber' }] } ] },
    { name: 'Yaren kılıç', email: 'yrenklc1999@gmail.com', phone: '5313788508', messenger: '', source: 'Instagram', registrationDate: new Date().toISOString().split('T')[0], managerUid: '', status: 'Active', notes: [], enrolledCourses: [] },
    { name: 'Мирон', email: 'feifhansued23@gamil.com', phone: '5438597922', messenger: '', source: 'IBAN', registrationDate: '2025-07-05', managerUid: '', status: 'Graduated', notes: [], enrolledCourses: [] }
];
const incomeData: Omit<Income, 'id'>[] = studentsData.flatMap(student => student.enrolledCourses.flatMap(course => course.paymentHistory.map(payment => ({ date: payment.date, description: `Payment from ${student.name} for ${course.courseName}`, amount: payment.amount, }))));

const expenseCategoriesData: Omit<ExpenseCategory, 'id'>[] = [
    { 
        name: 'Клиентские расходы', 
        names: ['Пакет 1 ученику', 'Канцтовары', 'Сертификаты', 'Учебные пособия', 'Подарки ученикам', 'Кофе-брейк', 'Шампанское', 'Фрукты', 'Вода для клиентов', 'Сладости'] 
    },
    { 
        name: 'Оплата услуг', 
        names: ['SMM', 'Реклама', 'Фотограф', 'Видеограф', 'Таргетолог', 'Уборка', 'Бухгалтер', 'Юрист', 'Курьер', 'Модель', 'Дизайнер', 'Разработка сайта', 'Техническая поддержка'] 
    },
    { 
        name: 'Зарплата', 
        names: ['Зарплата тренера', 'Зарплата администратора', 'Зарплата менеджера', 'Бонусы', 'Аванс', 'Премия', 'Отпускные'] 
    },
    { 
        name: 'Материалы', 
        names: ['Ресницы', 'Клей', 'Патчи', 'Пинцеты', 'Расходники (шапочки, простыни)', 'Препараты (обезжириватель, ремувер)', 'Лампы/Свет', 'Кушетки', 'Микробраши', 'Щеточки', 'Краска для бровей', 'Окислитель', 'Составы для ламинирования', 'Валики', 'Дезинфектор', 'Перчатки', 'Маски', 'Ватные диски', 'Ватные палочки', 'Стерилизация'] 
    },
    { 
        name: 'Аренда и офис', 
        names: ['Аренда помещения', 'Коммунальные услуги', 'Интернет', 'Вода/Кофе/Чай', 'Хозтовары', 'Мелкий ремонт', 'Мебель', 'Охрана', 'Вывоз мусора', 'Сигнализация', 'Канцелярия для офиса', 'Принтер/Краска', 'Мобильная связь'] 
    },
    { 
        name: 'Маркетинг', 
        names: ['Бюджет на таргет', 'Реклама у блогеров', 'Печатная продукция', 'Контекстная реклама', 'Сайт/Хостинг', 'SEO продвижение', 'SMS рассылка', 'Email рассылка', 'Визитки', 'Баннеры', 'Логотип/Брендинг'] 
    },
    { 
        name: 'Налоги и комиссии', 
        names: ['Единый налог', 'Комиссия банка', 'Обслуживание счета', 'Эквайринг', 'Налог на сотрудников', 'Пенсионный фонд'] 
    },
    {
        name: 'Обучение и развитие',
        names: ['Курсы повышения квалификации', 'Тренинги для персонала', 'Книги', 'Конференции']
    },
    {
        name: 'Прочее',
        names: ['Такси', 'Представительские расходы', 'Благотворительность', 'Непредвиденные расходы']
    }
];

const expensesData: Omit<Expense, 'id'>[] = [ { date: '2025-11-05', category: 'Клиентские расходы', name: 'Пакет 1 ученику', quantity: 5, unit: 'шт', unitPrice: 50, paymentMethod: 'Карта', notes: 'Для новой группы Full Start' }, { date: '2025-11-10', category: 'Оплата услуг', name: 'Реклама', quantity: 1, unit: 'campaign', unitPrice: 250, paymentMethod: 'Карта', notes: 'Рекламная кампания в Instagram' }, ];
const tasksData: Omit<Task, 'id'>[] = [ { title: 'Follow up with "VIP" course leads', details: 'Contact students who showed interest last month.', assigneeId: '', assigneeName: 'Murat Gurbanov', dueDate: '2025-07-18', priority: 'Medium', status: 'To Do' }, ];
const studentSourcesData: Omit<StudentSource, 'id'>[] = [ { name: 'Instagram' }, { name: 'Facebook' }, { name: 'Friend Referral' } ];
const courseTemplatesData: Omit<CourseTemplate, 'id'>[] = [ { name: 'Full Start' }, { name: 'Art Volume' }, { name: 'Brow Bomber' }, { name: 'Full Start VIP' }, { name: 'Online 3in1' } ];
const advisorSuggestionsData: Omit<AdvisorSuggestion, 'id'>[] = [
    { title: "Проаналізуйте витрати на рекламу", description: "Ваші витрати на 'Рекламу' значні. Перегляньте ефективність кампаній, щоб оптимізувати бюджет.", type: "finance" },
    { title: "Запропонуйте новий курс для Nihal Yazıcı", description: "Nihal Yazıcı успішно завершила курс 'Brow Bomber'. Запропонуйте їй курс 'Lash Filler' як наступний крок.", type: "student" },
    { title: "Підготуйтеся до курсу 'Full Start'", description: "Курс 'Full Start' скоро розпочнеться. Перевірте список підготовки, щоб переконатися, що все готово.", type: "course" }
];


// =============================================================================
// SEEDING LOGIC
// =============================================================================
const seedCollection = async <T extends object>(collectionName: string, data: T[], dependsOn?: { name: string, data: any[] }) => {
    const collectionRef = collection(db, collectionName);
    const snapshot = await getDocs(collectionRef);

    if (snapshot.empty) {
        console.log(`Seeding ${collectionName}...`);
        const batch = writeBatch(db);
        data.forEach((item: any) => {
            if (dependsOn && item[dependsOn.name]) {
                const dependency = dependsOn.data.find(d => d.name === item[dependsOn.name]);
                if (dependency) {
                    item[dependsOn.name.replace('Name', 'Id')] = dependency.id;
                }
            }
            const docRef = doc(collectionRef);
            batch.set(docRef, item);
        });
        await batch.commit();
        console.log(`${collectionName} seeded successfully.`);
    } else {
        console.log(`${collectionName} collection not empty, skipping seed.`);
    }
};

const seedRagKnowledge = async () => {
    const collectionRef = collection(db, 'ragKnowledge');
    const snapshot = await getDocs(collectionRef);
    // Always overwrite the RAG knowledge to ensure it's up to date
    if (!snapshot.empty) {
        const batch = writeBatch(db);
        snapshot.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
        console.log("Cleared old RAG knowledge.");
    }
    console.log("Seeding RAG knowledge...");
    // Fix: addDoc was not imported.
    await addDoc(collectionRef, { content: ragKnowledgeContent });
    console.log("RAG knowledge seeded.");
};


export const seedDatabase = async () => {
    try {
        console.log("Checking database for seeding...");
        
        await seedCollection('employees', employeesData);
        // Fix: docsToData was not defined.
        const seededEmployees = await getDocs(collection(db, 'employees')).then(docsToData);

        const coursesWithTeacherIds = coursesData.map(course => {
            const teacher = seededEmployees.find(e => e.name === course.teacherName);
            return { ...course, teacherId: teacher?.id || '' };
        });
        await seedCollection('courses', coursesWithTeacherIds);

        const studentsWithManagerIds = studentsData.map(student => {
             const manager = seededEmployees.find(e => e.name === student.managerUid); // This is a bug, should be manager name
             return { ...student, managerUid: manager?.id || '' };
        });
        await seedCollection('students', studentsWithManagerIds);
        
        await seedCollection('income', incomeData);
        await seedCollection('expenseCategories', expenseCategoriesData);
        await seedCollection('expenses', expensesData);
        
        const tasksWithAssigneeIds = tasksData.map(task => {
            const assignee = seededEmployees.find(e => e.name === task.assigneeName);
            return { ...task, assigneeId: assignee?.id || '' };
        });
        await seedCollection('tasks', tasksWithAssigneeIds);
        
        await seedCollection('studentSources', studentSourcesData);
        await seedCollection('courseTemplates', courseTemplatesData);
        await seedCollection('advisorSuggestions', advisorSuggestionsData);

        // Always update RAG knowledge
        await seedRagKnowledge();

    } catch (error) {
        console.error('Error seeding database:', error);
    }
};