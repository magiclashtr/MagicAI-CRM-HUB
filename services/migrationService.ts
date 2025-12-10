/**
 * Data Migration Script
 * 
 * This script migrates existing data to support the new role-based access control system.
 * It adds assignedEmployeeId to students, employeeId to financial records, etc.
 * 
 * Run this script once after deploying the authentication system.
 */

import { collection, getDocs, updateDoc, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

interface MigrationResult {
    collection: string;
    total: number;
    updated: number;
    errors: string[];
}

/**
 * Create admin user in Firestore (run this first!)
 * 
 * IMPORTANT: First create the user in Firebase Authentication Console,
 * then run this function with the user's UID.
 */
export const createAdminUser = async (
    userId: string,
    email: string = 'magiclash.tr@gmail.com',

    name: string = 'Маргарита Гуліна'
): Promise<void> => {
    await setDoc(doc(db, 'users', userId), {
        email,
        name,
        role: 'admin',
        createdAt: serverTimestamp()
    });
    console.log(`✅ Admin user created: ${name} (${email})`);
};

/**
 * Migrate students collection
 * Adds assignedEmployeeId field to all students
 */
export const migrateStudents = async (defaultEmployeeId: string): Promise<MigrationResult> => {
    const result: MigrationResult = {
        collection: 'students',
        total: 0,
        updated: 0,
        errors: []
    };

    try {
        const studentsSnapshot = await getDocs(collection(db, 'students'));
        result.total = studentsSnapshot.size;

        for (const studentDoc of studentsSnapshot.docs) {
            try {
                const data = studentDoc.data();

                // Skip if already has assignedEmployeeId
                if (data.assignedEmployeeId) {
                    continue;
                }

                // Assign to default employee (admin or first employee)
                await updateDoc(doc(db, 'students', studentDoc.id), {
                    assignedEmployeeId: defaultEmployeeId
                });

                result.updated++;
            } catch (err: any) {
                result.errors.push(`Student ${studentDoc.id}: ${err.message}`);
            }
        }
    } catch (err: any) {
        result.errors.push(`Failed to get students: ${err.message}`);
    }

    return result;
};

/**
 * Migrate income collection
 * Adds employeeId field to all income records
 */
export const migrateIncome = async (defaultEmployeeId: string): Promise<MigrationResult> => {
    const result: MigrationResult = {
        collection: 'income',
        total: 0,
        updated: 0,
        errors: []
    };

    try {
        const incomeSnapshot = await getDocs(collection(db, 'income'));
        result.total = incomeSnapshot.size;

        for (const incomeDoc of incomeSnapshot.docs) {
            try {
                const data = incomeDoc.data();

                if (data.employeeId) {
                    continue;
                }

                await updateDoc(doc(db, 'income', incomeDoc.id), {
                    employeeId: defaultEmployeeId
                });

                result.updated++;
            } catch (err: any) {
                result.errors.push(`Income ${incomeDoc.id}: ${err.message}`);
            }
        }
    } catch (err: any) {
        result.errors.push(`Failed to get income: ${err.message}`);
    }

    return result;
};

/**
 * Migrate expenses collection
 * Adds employeeId field to all expense records
 */
export const migrateExpenses = async (defaultEmployeeId: string): Promise<MigrationResult> => {
    const result: MigrationResult = {
        collection: 'expenses',
        total: 0,
        updated: 0,
        errors: []
    };

    try {
        const expensesSnapshot = await getDocs(collection(db, 'expenses'));
        result.total = expensesSnapshot.size;

        for (const expenseDoc of expensesSnapshot.docs) {
            try {
                const data = expenseDoc.data();

                if (data.employeeId) {
                    continue;
                }

                await updateDoc(doc(db, 'expenses', expenseDoc.id), {
                    employeeId: defaultEmployeeId
                });

                result.updated++;
            } catch (err: any) {
                result.errors.push(`Expense ${expenseDoc.id}: ${err.message}`);
            }
        }
    } catch (err: any) {
        result.errors.push(`Failed to get expenses: ${err.message}`);
    }

    return result;
};

/**
 * Migrate tasks collection
 * Ensures all tasks have assigneeId
 */
export const migrateTasks = async (defaultEmployeeId: string): Promise<MigrationResult> => {
    const result: MigrationResult = {
        collection: 'tasks',
        total: 0,
        updated: 0,
        errors: []
    };

    try {
        const tasksSnapshot = await getDocs(collection(db, 'tasks'));
        result.total = tasksSnapshot.size;

        for (const taskDoc of tasksSnapshot.docs) {
            try {
                const data = taskDoc.data();

                if (data.assigneeId) {
                    continue;
                }

                await updateDoc(doc(db, 'tasks', taskDoc.id), {
                    assigneeId: defaultEmployeeId
                });

                result.updated++;
            } catch (err: any) {
                result.errors.push(`Task ${taskDoc.id}: ${err.message}`);
            }
        }
    } catch (err: any) {
        result.errors.push(`Failed to get tasks: ${err.message}`);
    }

    return result;
};

/**
 * Run full migration
 */
export const runFullMigration = async (adminUserId: string): Promise<MigrationResult[]> => {
    console.log('🚀 Starting data migration...');

    const results: MigrationResult[] = [];

    // Migrate all collections
    results.push(await migrateStudents(adminUserId));
    results.push(await migrateIncome(adminUserId));
    results.push(await migrateExpenses(adminUserId));
    results.push(await migrateTasks(adminUserId));

    // Print summary
    console.log('\n📊 Migration Summary:');
    for (const result of results) {
        console.log(`  ${result.collection}: ${result.updated}/${result.total} updated`);
        if (result.errors.length > 0) {
            console.log(`    ⚠️ Errors: ${result.errors.length}`);
        }
    }

    console.log('\n✅ Migration complete!');

    return results;
};

export const migrationService = {
    createAdminUser,
    migrateStudents,
    migrateIncome,
    migrateExpenses,
    migrateTasks,
    runFullMigration
};
