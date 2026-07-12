import React, { useState, useEffect, useMemo } from 'react';
import { 
  FolderTree, Plus, Search, Edit, Trash2, Heart, Award, Shield, Sparkles, 
  Settings, Check, LayoutGrid, CheckSquare, Layers, HelpCircle, Palette, ChevronRight
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../components/ui-kit/Toast';
import FormDrawer from '../../components/ui-kit/FormDrawer';
import ConfirmDialog from '../../components/ui-kit/ConfirmDialog';
import StatusBadge from '../../components/ui-kit/StatusBadge';

interface CategoryItem {
  id: string;
  type: 'csr' | 'challenge';
  name: string;
  code: string;
  description: string;
  color: string;
  icon: string;
  status: 'Active' | 'Inactive';
}

const DEFAULT_CATEGORIES: CategoryItem[] = [
  // CSR
  { id: 'cat-1', type: 'csr', name: 'Carbon Offsetting', code: 'OFFSET', description: 'Projects focused on neutralizing greenhouse gas emissions.', color: '#0EA5E9', icon: 'Leaf', status: 'Active' },
  { id: 'cat-2', type: 'csr', name: 'Zero Waste Initiatives', code: 'ZEROWASTE', description: 'Reducing plastic consumption and optimizing corporate recycling.', color: '#10B981', icon: 'Trash2', status: 'Active' },
  { id: 'cat-3', type: 'csr', name: 'Clean Energy Integration', code: 'CLEANENERGY', description: 'Transitioning workspace grids to solar, wind, or hydropower.', color: '#F59E0B', icon: 'Sun', status: 'Active' },
  { id: 'cat-4', type: 'csr', name: 'Employee Wellness', code: 'WELLNESS', description: 'Health, wellness, and mental fitness programs across business units.', color: '#EC4899', icon: 'Heart', status: 'Active' },
  { id: 'cat-5', type: 'csr', name: 'Community Impact', code: 'COMMUNITY', description: 'Local neighborhood outreach, planting, and volunteering activities.', color: '#8B5CF6', icon: 'Users', status: 'Active' },
  
  // Challenge
  { id: 'cat-6', type: 'challenge', name: 'Pillar Challenge', code: 'PILLAR', description: 'Core strategic compliance campaigns aligning directly with ESG targets.', color: '#10B981', icon: 'Award', status: 'Active' },
  { id: 'cat-7', type: 'challenge', name: 'Monthly Blitz', code: 'BLITZ', description: 'Short high-intensity sprints driving healthy department competition.', color: '#EF4444', icon: 'Zap', status: 'Active' },
  { id: 'cat-8', type: 'challenge', name: 'Habit Builder', code: 'HABIT', description: 'Recurring micro-activities building lasting green routines.', color: '#3B82F6', icon: 'Activity', status: 'Active' },
  { id: 'cat-9', type: 'challenge', name: 'Department Quest', code: 'QUEST', description: 'Collaborative team missions focused on specific branch operations.', color: '#F59E0B', icon: 'Flag', status: 'Active' }
];

const PRESET_COLORS = [
  '#10B981', // Emerald
  '#0EA5E9', // Sky
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#6B7280'  // Gray
];

const PRESET_ICONS = [
  'Leaf', 'Sun', 'Trash2', 'Heart', 'Users', 'Zap', 'Award', 'Activity', 'Flag', 'Shield', 'Globe', 'BookOpen'
];

export default function Categories() {
  const { role } = useApp();
  const { addToast } = useToast();

  // State
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<'csr' | 'challenge'>('csr');
  const [searchQuery, setSearchQuery] = useState('');

  // Form Drawer state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form inputs
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formColor, setFormColor] = useState('#10B981');
  const [formIcon, setFormIcon] = useState('Leaf');
  const [formStatus, setFormStatus] = useState<boolean>(true);

  // Confirm delete dialog state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<CategoryItem | null>(null);

  // Initial Load
  useEffect(() => {
    const stored = localStorage.getItem('ecosphere_categories');
    if (stored) {
      setCategories(JSON.parse(stored));
    } else {
      localStorage.setItem('ecosphere_categories', JSON.stringify(DEFAULT_CATEGORIES));
      setCategories(DEFAULT_CATEGORIES);
    }
  }, []);

  const saveCategories = (updated: CategoryItem[]) => {
    localStorage.setItem('ecosphere_categories', JSON.stringify(updated));
    setCategories(updated);
  };

  // Unique Code Validation
  const codeError = useMemo(() => {
    if (!formCode) return null;
    const duplicate = categories.some(cat => 
      cat.code.toUpperCase() === formCode.toUpperCase() && 
      cat.id !== editingId &&
      cat.type === activeTab
    );
    return duplicate ? 'Category code must be unique in this tab' : null;
  }, [formCode, editingId, categories, activeTab]);

  // Open creation drawer
  const handleOpenCreate = () => {
    setFormMode('create');
    setEditingId(null);
    setFormName('');
    setFormCode('');
    setFormDescription('');
    setFormColor('#10B981');
    setFormIcon('Leaf');
    setFormStatus(true);
    setIsFormOpen(true);
  };

  // Open edit drawer
  const handleOpenEdit = (cat: CategoryItem) => {
    setFormMode('edit');
    setEditingId(cat.id);
    setFormName(cat.name);
    setFormCode(cat.code);
    setFormDescription(cat.description);
    setFormColor(cat.color);
    setFormIcon(cat.icon);
    setFormStatus(cat.status === 'Active');
    setIsFormOpen(true);
  };

  // Save Category item
  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formCode || !formDescription) {
      addToast('Please fill in all required fields', 'warning');
      return;
    }

    if (codeError) {
      addToast('Please fix the validation errors first', 'warning');
      return;
    }

    if (formMode === 'create') {
      const newItem: CategoryItem = {
        id: `cat-${Date.now()}`,
        type: activeTab,
        name: formName,
        code: formCode.toUpperCase().replace(/\s+/g, ''),
        description: formDescription,
        color: formColor,
        icon: formIcon,
        status: formStatus ? 'Active' : 'Inactive'
      };
      const updated = [newItem, ...categories];
      saveCategories(updated);
      addToast('Category created successfully', 'success');
    } else {
      const updated = categories.map(cat => {
        if (cat.id === editingId) {
          return {
            ...cat,
            name: formName,
            code: formCode.toUpperCase().replace(/\s+/g, ''),
            description: formDescription,
            color: formColor,
            icon: formIcon,
            status: (formStatus ? 'Active' : 'Inactive') as 'Active' | 'Inactive'
          };
        }
        return cat;
      });
      saveCategories(updated);
      addToast('Category updated successfully', 'success');
    }

    setIsFormOpen(false);
  };

  // Delete category attempt
  const handleDeleteAttempt = (cat: CategoryItem) => {
    setItemToDelete(cat);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!itemToDelete) return;
    const updated = categories.filter(cat => cat.id !== itemToDelete.id);
    saveCategories(updated);
    addToast('Category deleted successfully', 'success');
    setIsDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  // Filter categories by search and active tab type
  const filteredCategories = useMemo(() => {
    return categories.filter(cat => {
      if (cat.type !== activeTab) return false;
      const search = searchQuery.toLowerCase();
      return (
        cat.name.toLowerCase().includes(search) ||
        cat.code.toLowerCase().includes(search) ||
        cat.description.toLowerCase().includes(search)
      );
    });
  }, [categories, activeTab, searchQuery]);

  return (
    <div className="space-y-6" id="categories-page">
      {/* Header action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-border pb-5">
        <div>
          <h1 className="text-2xl font-black text-neutral-text-dark tracking-tight font-sans">
            Categories Registry
          </h1>
          <p className="text-xs text-neutral-text-muted font-medium mt-1">
            Configure social CSR classifications and challenge structures. Shared parameters utilized across goals.
          </p>
        </div>
        {role === 'Admin' && (
          <button
            onClick={handleOpenCreate}
            className="bg-primary-teal hover:bg-primary-teal-dark text-white font-black text-xs uppercase tracking-wider py-2.5 px-4 rounded-xl flex items-center gap-2 transition shadow-sm shrink-0 self-start sm:self-center"
            id="btn-new-category"
          >
            <Plus className="h-4 w-4" />
            Add {activeTab === 'csr' ? 'CSR Category' : 'Challenge Category'}
          </button>
        )}
      </div>

      {/* Tabs list switch bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-neutral-border p-3.5 rounded-2xl shadow-xs">
        <div className="flex items-center gap-1.5 bg-neutral-bg p-1 rounded-xl shrink-0 self-stretch sm:self-auto">
          <button
            onClick={() => {
              setActiveTab('csr');
              setSearchQuery('');
            }}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition ${
              activeTab === 'csr'
                ? 'bg-white text-primary-teal shadow-xs'
                : 'text-neutral-text-muted hover:text-neutral-text-dark'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            CSR Categories
          </button>
          <button
            onClick={() => {
              setActiveTab('challenge');
              setSearchQuery('');
            }}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition ${
              activeTab === 'challenge'
                ? 'bg-white text-primary-teal shadow-xs'
                : 'text-neutral-text-muted hover:text-neutral-text-dark'
            }`}
          >
            <Award className="h-3.5 w-3.5" />
            Challenge Categories
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:max-w-xs">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="h-4 w-4 text-neutral-text-muted" />
          </span>
          <input
            type="text"
            placeholder="Search categories..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-9 pr-4 py-2 border border-neutral-border rounded-xl bg-neutral-bg/30 font-semibold focus:outline-none focus:ring-1 focus:ring-primary-teal"
          />
        </div>
      </div>

      {/* Categories Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredCategories.length === 0 ? (
          <div className="col-span-full bg-white border border-neutral-border rounded-2xl p-8 text-center text-neutral-text-muted space-y-2">
            <FolderTree className="h-10 w-10 text-neutral-border mx-auto" />
            <p className="text-xs font-bold text-neutral-text-dark">No Categories Found</p>
            <p className="text-[11px] max-w-sm mx-auto">Create a new category master item to build structures for CSR initiatives or challenge badges.</p>
          </div>
        ) : (
          filteredCategories.map(cat => (
            <div 
              key={cat.id}
              className="bg-white border border-neutral-border rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-neutral-border-dark transition relative overflow-hidden"
              style={{ borderLeft: `4px solid ${cat.color}` }}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] bg-neutral-bg border border-neutral-border px-2 py-0.5 rounded font-black text-neutral-text-muted">
                    {cat.code}
                  </span>
                  <StatusBadge 
                    status={
                      cat.status === 'Active' 
                        ? { code: 'active', label: 'Active', color: 'bg-emerald-50 text-emerald-800 border-emerald-100' }
                        : { code: 'inactive', label: 'Inactive', color: 'bg-neutral-bg text-neutral-text-muted border-neutral-border' }
                    } 
                  />
                </div>
                
                <div className="space-y-1">
                  <h3 className="text-sm font-black text-neutral-text-dark flex items-center gap-2">
                    <span 
                      className="w-2.5 h-2.5 rounded-full" 
                      style={{ backgroundColor: cat.color }}
                    />
                    {cat.name}
                  </h3>
                  <p className="text-[11px] text-neutral-text-muted leading-relaxed font-semibold">
                    {cat.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-neutral-border/60 pt-3 mt-1">
                <span className="text-[9px] uppercase tracking-wider font-bold text-neutral-text-muted">
                  Type: {cat.type === 'csr' ? 'Social Pillar' : 'Gamification'}
                </span>
                {role === 'Admin' && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEdit(cat)}
                      className="p-1.5 hover:bg-neutral-bg text-neutral-text-muted hover:text-neutral-text-dark rounded-lg transition"
                      title="Edit Category"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteAttempt(cat)}
                      className="p-1.5 hover:bg-red-50 text-neutral-text-muted hover:text-red-600 rounded-lg transition"
                      title="Delete Category"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* CREATE/EDIT FormDrawer */}
      <FormDrawer
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={formMode === 'create' ? 'Create Category' : 'Edit Category'}
        subtitle={formMode === 'create' ? 'Establish a new shared classification item' : `Modify category properties for ${formName}`}
      >
        <form onSubmit={handleSaveCategory} className="space-y-5 p-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-neutral-text-muted tracking-wider">Category Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Clean Energy Solutions"
              value={formName}
              onChange={e => setFormName(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 border border-neutral-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-teal font-semibold text-neutral-text-dark"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-neutral-text-muted tracking-wider">Unique Code</label>
            <input
              type="text"
              required
              placeholder="e.g. CLEANGRIDS"
              value={formCode}
              onChange={e => setFormCode(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 border border-neutral-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-teal font-mono uppercase font-black text-neutral-text-dark"
            />
            {codeError && (
              <span className="text-[10px] font-bold text-red-600 flex items-center gap-1 mt-1">
                <Shield className="h-3 w-3 shrink-0" />
                {codeError}
              </span>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-neutral-text-muted tracking-wider">Description</label>
            <textarea
              required
              rows={3}
              placeholder="Provide a clear, brief operational definition for this category..."
              value={formDescription}
              onChange={e => setFormDescription(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 border border-neutral-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-teal font-semibold text-neutral-text-dark leading-relaxed"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-neutral-text-muted tracking-wider flex items-center gap-1">
              <Palette className="h-3.5 w-3.5 text-primary-teal" />
              Theme Color Accent
            </label>
            <div className="flex flex-wrap gap-2.5 p-1">
              {PRESET_COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormColor(color)}
                  className="w-7 h-7 rounded-full flex items-center justify-center transition border border-transparent shadow-xs hover:scale-105"
                  style={{ backgroundColor: color }}
                >
                  {formColor === color && (
                    <Check className="h-4.5 w-4.5 text-white stroke-[3]" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-neutral-text-muted tracking-wider">Visual Glyph Icon</label>
            <div className="grid grid-cols-4 gap-2 border border-neutral-border rounded-xl p-3 bg-neutral-bg/20">
              {PRESET_ICONS.map(iconName => (
                <button
                  key={iconName}
                  type="button"
                  onClick={() => setFormIcon(iconName)}
                  className={`p-2.5 rounded-lg border text-xs font-bold transition flex flex-col items-center gap-1 ${
                    formIcon === iconName
                      ? 'bg-primary-teal text-white border-primary-teal'
                      : 'bg-white text-neutral-text-muted border-neutral-border hover:bg-neutral-bg'
                  }`}
                >
                  <Sparkles className="h-4 w-4 shrink-0" />
                  <span className="text-[8px] truncate max-w-full">{iconName}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between bg-neutral-bg/40 p-4 rounded-xl border border-neutral-border/60">
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-neutral-text-dark">Category Status</h4>
              <p className="text-[10px] text-neutral-text-muted">Active categories can be attached to new initiatives and goals</p>
            </div>
            <button
              type="button"
              onClick={() => setFormStatus(!formStatus)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                formStatus ? 'bg-primary-teal' : 'bg-neutral-border'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  formStatus ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="pt-3 border-t border-neutral-border flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="border border-neutral-border text-neutral-text-dark hover:bg-neutral-bg text-xs font-bold uppercase tracking-wider py-2.5 px-4 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-primary-teal hover:bg-primary-teal-dark text-white text-xs font-bold uppercase tracking-wider py-2.5 px-4 rounded-xl"
            >
              Save Category
            </button>
          </div>
        </form>
      </FormDrawer>

      {/* CONFIRM DELETE DIALOG */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Confirm Deletion"
        description={`Are you absolutely sure you want to delete the category "${itemToDelete?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        isDestructive={true}
      />
    </div>
  );
}
