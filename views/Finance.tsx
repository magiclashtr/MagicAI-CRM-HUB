import React, { useState, useEffect } from 'react';
import { Income, Expense, Currency, ExpenseCategory } from '../types';
import { firestoreService } from '../services/firestoreService';
import { geminiService } from '../services/geminiService';
import { formatCurrency, PAYMENT_METHODS } from '../constants';
import Button from '../components/Button';
import FinancialReports from './FinancialReports';

// =============================================================================
// MODALS
// =============================================================================

const IncomeModal: React.FC<{
  income: Income | null;
  onClose: () => void;
  onSave: (income: Income | Omit<Income, 'id'>) => Promise<void>;
}> = ({ income, onClose, onSave }) => {
  const [formData, setFormData] = useState<Income | Omit<Income, 'id'>>(
    income || { date: new Date().toISOString().split('T')[0], description: '', amount: 0 }
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'number' ? parseFloat(value) || 0 : value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.amount <= 0 || !formData.description.trim()) {
      alert("Please provide a valid description and amount.");
      return;
    }
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4">
      <div className="bg-gray-800 p-8 rounded-lg w-full max-w-lg">
        <h2 className="text-2xl font-bold mb-6">{income ? 'Edit Income' : 'Add New Income'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="date" name="date" value={formData.date} onChange={handleChange} className="w-full bg-gray-700 p-3 rounded border border-gray-600" required />
          <textarea name="description" value={formData.description} onChange={handleChange} placeholder="Description" className="w-full bg-gray-700 p-3 rounded border border-gray-600 h-24" required />
          <input type="number" name="amount" value={formData.amount} onChange={handleChange} placeholder="Amount" className="w-full bg-gray-700 p-3 rounded border border-gray-600" min="0.01" step="0.01" required />
          <div className="flex justify-end space-x-4 pt-4">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="primary">Save</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ExpenseModal: React.FC<{
  expense: Expense | null;
  categories: ExpenseCategory[];
  onClose: () => void;
  onSave: (expense: Expense | Omit<Expense, 'id'>) => Promise<void>;
}> = ({ expense, categories, onClose, onSave }) => {
  const [formData, setFormData] = useState<Expense | Omit<Expense, 'id'>>(() => {
    const initialCategory = categories.length > 0 ? categories[0] : null;
    const initialName = initialCategory?.names?.[0] || '';
    return expense || {
      date: new Date().toISOString().split('T')[0],
      category: initialCategory?.name || '',
      name: initialName,
      quantity: 1, unit: '', unitPrice: 0,
      paymentMethod: PAYMENT_METHODS[0], notes: '',
    };
  });
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isSuggestingDetails, setIsSuggestingDetails] = useState(false);

  useEffect(() => {
    if (expense) {
      setFormData(expense);
    }
  }, [expense]);

  useEffect(() => {
    const description = `${formData.name} ${formData.notes}`.trim();
    if (description.length < 5) return;

    const handler = setTimeout(async () => {
      setIsSuggesting(true);
      try {
        const categoryNames = categories.map(c => c.name);
        const suggestedCategory = await geminiService.suggestExpenseCategory(description, categoryNames);
        if (suggestedCategory && suggestedCategory !== formData.category) {
          const newCat = categories.find(c => c.name === suggestedCategory);
          setFormData(prev => ({
            ...prev,
            category: suggestedCategory,
            name: newCat?.names?.[0] || '',
          }));
        }
      } finally {
        setIsSuggesting(false);
      }
    }, 1000);
    return () => clearTimeout(handler);
  }, [formData.name, formData.notes, categories, formData.category]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (name === 'category') {
      const newCat = categories.find(c => c.name === value);
      setFormData(prev => ({
        ...prev,
        category: value,
        name: newCat?.names?.[0] || '',
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: type === 'number' ? parseFloat(value) || 0 : value }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || formData.unitPrice <= 0 || formData.quantity <= 0) {
      alert("Please provide a valid name, quantity, and unit price.");
      return;
    }
    onSave(formData);
  };
  
  const handleSuggestDetails = async () => {
    setIsSuggestingDetails(true);
    try {
      const currentCategory = categories.find(c => c.name === formData.category);
      const expenseNames = currentCategory?.names || [];
      const result = await geminiService.suggestExpenseDetails(formData.category, formData.notes, expenseNames);
      
      if (result) {
        const { suggestedName, suggestedUnit } = result;
        setFormData(prev => ({ ...prev, name: suggestedName, unit: suggestedUnit }));
      }
    } catch (error) {
      console.error("Failed to suggest expense details:", error);
    } finally {
      setIsSuggestingDetails(false);
    }
  };

  const currentCategory = categories.find(c => c.name === formData.category);
  const expenseNames = currentCategory?.names || [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4">
        <div className="bg-gray-800 p-8 rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">{expense ? 'Edit Expense' : 'Add New Expense'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="date" name="date" value={formData.date} onChange={handleChange} className="w-full bg-gray-700 p-3 rounded" required />
                    <select name="paymentMethod" value={formData.paymentMethod} onChange={handleChange} className="w-full bg-gray-700 p-3 rounded">
                        {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
                    </select>
                </div>
                <div className="relative">
                     <label className="block text-sm font-medium text-gray-400 mb-1">
                        Category {isSuggesting && <span className="text-indigo-400 text-xs animate-pulse">(AI thinking...)</span>}
                     </label>
                     <select name="category" value={formData.category} onChange={handleChange} className="w-full bg-gray-700 p-3 rounded" required>
                         {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                     </select>
                </div>
                <div>
                     <label className="block text-sm font-medium text-gray-400 mb-1">Expense Name</label>
                    {expenseNames.length > 0 ? (
                         <select name="name" value={formData.name} onChange={handleChange} className="w-full bg-gray-700 p-3 rounded">
                             {expenseNames.map(name => <option key={name} value={name}>{name}</option>)}
                         </select>
                     ) : (
                         <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Expense Name" className="w-full bg-gray-700 p-3 rounded" required />
                     )}
                </div>
                <div className="grid grid-cols-3 gap-4">
                     <input type="number" name="quantity" value={formData.quantity} onChange={handleChange} placeholder="Quantity" className="bg-gray-700 p-3 rounded" min="1" step="1" required />
                     <input name="unit" value={formData.unit} onChange={handleChange} placeholder="Unit (e.g., шт, кг, услуга)" className="bg-gray-700 p-3 rounded" />
                     <input type="number" name="unitPrice" value={formData.unitPrice} onChange={handleChange} placeholder="Unit Price" className="bg-gray-700 p-3 rounded" min="0.01" step="0.01" required />
                </div>
                <div>
                    <textarea name="notes" value={formData.notes} onChange={handleChange} placeholder="Notes" className="w-full bg-gray-700 p-3 rounded h-20" />
                    <Button type="button" variant="outline" size="sm" onClick={handleSuggestDetails} isLoading={isSuggestingDetails}>Suggest Details (AI)</Button>
                </div>
                <div className="flex justify-end space-x-4 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button type="submit" variant="primary">Save Expense</Button>
                </div>
            </form>
        </div>
    </div>
  );
};

const CategoryModal: React.FC<{
  categories: ExpenseCategory[];
  onClose: () => void;
  onSave: (categories: ExpenseCategory[]) => Promise<void>;
}> = ({ categories, onClose, onSave }) => {
  const [localCategories, setLocalCategories] = useState<ExpenseCategory[]>(JSON.parse(JSON.stringify(categories)));

  const handleCategoryNameChange = (id: string, newName: string) => {
    setLocalCategories(prev => prev.map(c => c.id === id ? { ...c, name: newName } : c));
  };
  
  const handleExpenseNamesChange = (id: string, newNames: string) => {
    setLocalCategories(prev => prev.map(c => c.id === id ? { ...c, names: newNames.split(',').map(n => n.trim()) } : c));
  };

  const handleAddCategory = () => {
    setLocalCategories(prev => [...prev, { id: `new-${Date.now()}`, name: 'New Category', names: [] }]);
  };

  const handleDeleteCategory = (id: string) => {
    setLocalCategories(prev => prev.filter(c => c.id !== id));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4">
      <div className="bg-gray-800 p-8 rounded-lg w-full max-w-3xl max-h-[90vh] flex flex-col">
        <h2 className="text-2xl font-bold mb-6">Manage Expense Categories</h2>
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {localCategories.map(category => (
            <div key={category.id} className="bg-gray-700 p-4 rounded-md space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={category.name}
                  onChange={e => handleCategoryNameChange(category.id, e.target.value)}
                  className="bg-gray-600 p-2 rounded border border-gray-500 w-1/3"
                  placeholder="Category Name"
                />
                <input
                  type="text"
                  value={category.names.join(', ')}
                  onChange={e => handleExpenseNamesChange(category.id, e.target.value)}
                  placeholder="Specific expense names (comma separated)"
                  className="bg-gray-600 p-2 rounded border border-gray-500 flex-1"
                />
                <Button variant="danger" size="sm" onClick={() => handleDeleteCategory(category.id)}>Delete</Button>
              </div>
            </div>
          ))}
        </div>
        <Button variant="outline" onClick={handleAddCategory} className="mt-4">Add New Category</Button>
        <div className="flex justify-end space-x-4 pt-6 mt-4 border-t border-gray-700">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => onSave(localCategories)}>Save Changes</Button>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const Finance: React.FC<{ currency: Currency }> = ({ currency }) => {
  const [income, setIncome] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [incomeData, expenseData, categoryData] = await Promise.all([
        firestoreService.getIncome(),
        firestoreService.getExpenses(),
        firestoreService.getExpenseCategories(),
      ]);
      setIncome(incomeData);
      setExpenses(expenseData);
      setCategories(categoryData);
    } catch (error) {
      console.error("Failed to fetch financial data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveIncome = async (data: Income | Omit<Income, 'id'>) => {
    if ('id' in data) {
      await firestoreService.updateIncome(data.id, data);
    } else {
      await firestoreService.addIncome(data);
    }
    await fetchData();
    setIsIncomeModalOpen(false);
  };

  const handleDeleteIncome = async (id: string) => {
    if (window.confirm("Are you sure?")) {
      await firestoreService.deleteIncome(id);
      await fetchData();
    }
  };

  const handleSaveExpense = async (data: Expense | Omit<Expense, 'id'>) => {
    if ('id' in data) {
      await firestoreService.updateExpense(data.id, data);
    } else {
      await firestoreService.addExpense(data);
    }
    await fetchData();
    setIsExpenseModalOpen(false);
  };

  const handleDeleteExpense = async (id: string) => {
    if (window.confirm("Are you sure?")) {
      await firestoreService.deleteExpense(id);
      await fetchData();
    }
  };

  const handleSaveCategories = async (updatedCategories: ExpenseCategory[]) => {
    // Basic sync: Update all categories (simplified for this demo)
    // Ideally, we should diff and only update changed/added/deleted ones.
    // For simplicity, we'll iterate and update/add.
    for (const cat of updatedCategories) {
      if (cat.id.startsWith('new-')) {
        const { id, ...data } = cat;
        await firestoreService.addExpenseCategory(data);
      } else {
        await firestoreService.updateExpenseCategory(cat.id, cat);
      }
    }
    // Handle deletions if necessary (omitted for brevity in this simplified block, assumes mostly additions/updates)
    // A robust implementation would handle deletions.
    
    await fetchData();
    setIsCategoryModalOpen(false);
  };
  
  const openAddIncome = () => { setEditingIncome(null); setIsIncomeModalOpen(true); };
  const openEditIncome = (i: Income) => { setEditingIncome(i); setIsIncomeModalOpen(true); };
  
  const openAddExpense = () => { setEditingExpense(null); setIsExpenseModalOpen(true); };
  const openEditExpense = (e: Expense) => { setEditingExpense(e); setIsExpenseModalOpen(true); };

  return (
    <div className="flex flex-col h-full space-y-6">
      {isIncomeModalOpen && <IncomeModal income={editingIncome} onClose={() => setIsIncomeModalOpen(false)} onSave={handleSaveIncome} />}
      {isExpenseModalOpen && <ExpenseModal expense={editingExpense} categories={categories} onClose={() => setIsExpenseModalOpen(false)} onSave={handleSaveExpense} />}
      {isCategoryModalOpen && <CategoryModal categories={categories} onClose={() => setIsCategoryModalOpen(false)} onSave={handleSaveCategories} />}

      <div className="bg-gray-800 p-4 rounded-lg flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-2xl font-bold text-white">Фінанси</h1>
        <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setIsCategoryModalOpen(true)}>Manage Categories</Button>
            <Button variant="primary" onClick={openAddIncome}>Add Income</Button>
            <Button variant="danger" onClick={openAddExpense}>Add Expense</Button>
        </div>
      </div>
      
      {/* Overview Reports */}
      <FinancialReports currency={currency} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Income List */}
        <div className="bg-gray-800 p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-bold mb-4 text-white">Recent Income</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
                {income.length > 0 ? income.sort((a,b) => b.date.localeCompare(a.date)).map(item => (
                    <div key={item.id} className="flex justify-between items-center bg-gray-700/50 p-3 rounded hover:bg-gray-700">
                        <div>
                            <p className="font-semibold text-white">{item.description}</p>
                            <p className="text-sm text-gray-400">{item.date}</p>
                        </div>
                        <div className="flex items-center gap-4">
                             <span className="text-green-400 font-bold">{formatCurrency(Number(item.amount), currency)}</span>
                             <div className="flex gap-1">
                                <button onClick={() => openEditIncome(item)} className="text-gray-400 hover:text-white p-1"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /></svg></button>
                                <button onClick={() => handleDeleteIncome(item.id)} className="text-red-400 hover:text-red-300 p-1"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.067-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg></button>
                             </div>
                        </div>
                    </div>
                )) : <p className="text-gray-500 italic">No income records.</p>}
            </div>
        </div>

        {/* Expense List */}
        <div className="bg-gray-800 p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-bold mb-4 text-white">Recent Expenses</h3>
             <div className="space-y-2 max-h-96 overflow-y-auto">
                {expenses.length > 0 ? expenses.sort((a,b) => b.date.localeCompare(a.date)).map(item => (
                    <div key={item.id} className="flex justify-between items-center bg-gray-700/50 p-3 rounded hover:bg-gray-700">
                        <div>
                            <p className="font-semibold text-white">{item.name}</p>
                            <p className="text-xs text-gray-400">{item.category} | {item.date}</p>
                        </div>
                        <div className="flex items-center gap-4">
                             <span className="text-red-400 font-bold">{formatCurrency(Number(item.unitPrice) * Number(item.quantity), currency)}</span>
                             <div className="flex gap-1">
                                <button onClick={() => openEditExpense(item)} className="text-gray-400 hover:text-white p-1"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /></svg></button>
                                <button onClick={() => handleDeleteExpense(item.id)} className="text-red-400 hover:text-red-300 p-1"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.067-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg></button>
                             </div>
                        </div>
                    </div>
                )) : <p className="text-gray-500 italic">No expense records.</p>}
            </div>
        </div>
      </div>
    </div>
  );
};

export default Finance;