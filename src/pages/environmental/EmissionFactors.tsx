import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Edit2, Trash2, AlertTriangle, Calendar, BookOpen, Layers } from 'lucide-react';
import { environmentalService, EmissionFactor } from '../../services/environmentalService';
import { lookupsService } from '../../services/lookupsService';
import DataTable, { Column } from '../../components/ui-kit/DataTable';
import FormDrawer from '../../components/ui-kit/FormDrawer';
import StatusBadge, { StatusValue } from '../../components/ui-kit/StatusBadge';
import { useToast } from '../../components/ui-kit/Toast';

export default function EmissionFactors() {
  const { addToast } = useToast();
  
  // Data State
  const [factors, setFactors] = useState<EmissionFactor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Lookups lists
  const [categories, setCategories] = useState<string[]>([]);
  const [units, setUnits] = useState<string[]>([]);

  // Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingFactor, setEditingFactor] = useState<EmissionFactor | null>(null);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formScope, setFormScope] = useState<1 | 2 | 3>(1);
  const [formUnit, setFormUnit] = useState('');
  const [formFactor, setFormFactor] = useState<string>('');
  const [formSource, setFormSource] = useState('');
  const [formFrom, setFormFrom] = useState('');
  const [formTo, setFormTo] = useState('');

  // Form Validation / Warn State
  const [factorError, setFactorError] = useState<string | null>(null);
  const [hasOverlap, setHasOverlap] = useState(false);

  // Autocomplete state for Category
  const [categorySearch, setCategorySearch] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  // Load Initial Data
  const loadData = async () => {
    setLoading(true);
    try {
      const data = await environmentalService.getEmissionFactors();
      setFactors(data);
      
      const lookups = await lookupsService.getLookups();
      // Combine predefined categories and any unique categories in actual factors
      const allCats = Array.from(new Set([
        ...lookups.categories.environmental,
        'Electricity', 'Mobile Fuel', 'Stationary Fuel', 'Business Travel', 'Waste', 'Water', 'Paper', 'Logistics'
      ]));
      setCategories(allCats);
      setUnits(lookups.emissionUnits);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load emission factors');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Real-time overlap check whenever category, unit, dates or editingFactor changes
  useEffect(() => {
    if (!formCategory || !formUnit || !formFrom) {
      setHasOverlap(false);
      return;
    }

    const checkOverlap = async () => {
      const isOverlapping = await environmentalService.checkFactorOverlap(
        formCategory,
        formUnit,
        formFrom,
        formTo || null,
        editingFactor?.id
      );
      setHasOverlap(isOverlapping);
    };

    const timer = setTimeout(checkOverlap, 300);
    return () => clearTimeout(timer);
  }, [formCategory, formUnit, formFrom, formTo, editingFactor]);

  // Handle Factor input and error
  const handleFactorChange = (val: string) => {
    setFormFactor(val);
    const parsed = parseFloat(val);
    if (val === '') {
      setFactorError('Factor value is required');
    } else if (isNaN(parsed)) {
      setFactorError('Must be a valid number');
    } else if (parsed <= 0) {
      setFactorError('Factor value must be greater than 0');
    } else {
      setFactorError(null);
    }
  };

  // Check if form is dirty (modified from clean state)
  const isFormDirty = useMemo(() => {
    if (editingFactor) {
      return (
        formName !== editingFactor.name ||
        formCategory !== editingFactor.category ||
        formScope !== editingFactor.scope ||
        formUnit !== editingFactor.unit ||
        parseFloat(formFactor) !== editingFactor.factor ||
        formSource !== editingFactor.source ||
        formFrom !== editingFactor.effectiveFrom ||
        formTo !== (editingFactor.effectiveTo || '')
      );
    } else {
      return (
        formName !== '' ||
        formCategory !== '' ||
        formUnit !== '' ||
        formFactor !== '' ||
        formSource !== '' ||
        formFrom !== '' ||
        formTo !== ''
      );
    }
  }, [
    formName, formCategory, formScope, formUnit, formFactor, formSource, formFrom, formTo, editingFactor
  ]);

  // Open Drawer for Create
  const handleCreateOpen = () => {
    setEditingFactor(null);
    setFormName('');
    setFormCategory('');
    setCategorySearch('');
    setFormScope(1);
    setFormUnit(units[0] || 'kg CO2e/kWh');
    setFormFactor('');
    setFormSource('');
    // Default effective date to today
    const todayStr = new Date().toISOString().split('T')[0];
    setFormFrom(todayStr);
    setFormTo('');
    setFactorError(null);
    setHasOverlap(false);
    setIsDrawerOpen(true);
  };

  // Open Drawer for Edit
  const handleEditOpen = (factor: EmissionFactor) => {
    setEditingFactor(factor);
    setFormName(factor.name);
    setFormCategory(factor.category);
    setCategorySearch(factor.category);
    setFormScope(factor.scope);
    setFormUnit(factor.unit);
    setFormFactor(factor.factor.toString());
    setFormSource(factor.source);
    setFormFrom(factor.effectiveFrom);
    setFormTo(factor.effectiveTo || '');
    setFactorError(null);
    setHasOverlap(false);
    setIsDrawerOpen(true);
  };

  // Save Factor
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formCategory || !formUnit || !formFrom || !formSource) {
      addToast('Please fill out all required fields', 'warning');
      return;
    }

    const factorNum = parseFloat(formFactor);
    if (isNaN(factorNum) || factorNum <= 0) {
      setFactorError('Factor value must be greater than 0');
      addToast('Please fix validation errors before saving', 'warning');
      return;
    }

    try {
      const payload = {
        name: formName,
        category: formCategory,
        scope: formScope,
        factor: factorNum,
        unit: formUnit,
        effectiveFrom: formFrom,
        effectiveTo: formTo || null,
        source: formSource
      };

      await environmentalService.saveEmissionFactor(
        editingFactor ? { ...payload, id: editingFactor.id } : payload
      );

      addToast(
        editingFactor ? 'Emission factor updated successfully' : 'Emission factor created successfully',
        'success'
      );
      setIsDrawerOpen(false);
      loadData();
    } catch (err: any) {
      addToast(err.message || 'Failed to save emission factor', 'danger');
    }
  };

  // Delete Factor
  const handleDelete = async (factor: EmissionFactor) => {
    const confirmed = window.confirm(`Are you sure you want to delete "${factor.name}"?`);
    if (!confirmed) return;

    try {
      await environmentalService.deleteEmissionFactor(factor.id);
      addToast('Emission factor deleted successfully', 'success');
      loadData();
    } catch (err: any) {
      addToast(err.message || 'Failed to delete emission factor', 'danger');
    }
  };

  // Filter Categories autocomplete options
  const filteredCategoryOptions = useMemo(() => {
    if (!categorySearch) return categories;
    return categories.filter(c => c.toLowerCase().includes(categorySearch.toLowerCase()));
  }, [categorySearch, categories]);

  // Columns definition for DataTable
  const columns: Column<EmissionFactor>[] = [
    {
      key: 'name',
      header: 'Name / Category',
      sortable: true,
      render: (row) => (
        <div className="flex flex-col gap-1">
          <span className="font-bold text-neutral-text-dark text-xs lg:text-[13px]">{row.name}</span>
          <span className="text-[10px] text-neutral-text-muted font-black tracking-wider uppercase flex items-center gap-1">
            <BookOpen className="h-3 w-3" /> {row.category}
          </span>
        </div>
      )
    },
    {
      key: 'scope',
      header: 'Scope',
      sortable: true,
      render: (row) => {
        let badgeStyle: StatusValue = {
          code: 'scope1',
          label: 'Scope 1',
          color: 'bg-emerald-50 text-emerald-800 border-emerald-100'
        };
        if (row.scope === 2) {
          badgeStyle = {
            code: 'scope2',
            label: 'Scope 2',
            color: 'bg-blue-50 text-blue-800 border-blue-100'
          };
        } else if (row.scope === 3) {
          badgeStyle = {
            code: 'scope3',
            label: 'Scope 3',
            color: 'bg-amber-50 text-amber-800 border-amber-100'
          };
        }
        return <StatusBadge status={badgeStyle} />;
      }
    },
    {
      key: 'factor',
      header: 'Factor Value (Unit)',
      sortable: true,
      render: (row) => (
        <div className="flex flex-col items-end text-right">
          <span className="font-mono font-bold text-neutral-text-dark text-xs text-right">
            {row.factor.toFixed(6)}
          </span>
          <span className="text-[10px] text-neutral-text-muted font-bold">
            {row.unit}
          </span>
        </div>
      )
    },
    {
      key: 'effectiveFrom',
      header: 'Effective Dates',
      sortable: true,
      render: (row) => {
        const today = new Date().getTime();
        const start = new Date(row.effectiveFrom).getTime();
        const end = row.effectiveTo ? new Date(row.effectiveTo).getTime() : Infinity;
        
        const isActive = today >= start && today <= end;
        
        const badgeStyle: StatusValue = isActive 
          ? { code: 'active', label: 'Active', color: 'bg-emerald-100 text-emerald-800' }
          : { code: 'expired', label: 'Expired', color: 'bg-neutral-bg text-neutral-text-muted' };

        return (
          <div className="flex flex-col gap-1 items-start">
            <StatusBadge status={badgeStyle} />
            <span className="text-[10px] text-neutral-text-muted font-semibold flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {row.effectiveFrom} to {row.effectiveTo || '∞'}
            </span>
          </div>
        );
      }
    },
    {
      key: 'source',
      header: 'Source Reference',
      sortable: true,
      render: (row) => (
        <span className="text-neutral-text-muted italic max-w-[150px] truncate block" title={row.source}>
          {row.source}
        </span>
      )
    }
  ];

  const actions = [
    {
      label: 'Edit Factor',
      icon: <Edit2 className="h-3.5 w-3.5 text-primary-teal" />,
      onClick: (row: EmissionFactor) => handleEditOpen(row)
    },
    {
      label: 'Delete Factor',
      icon: <Trash2 className="h-3.5 w-3.5 text-red-500" />,
      onClick: (row: EmissionFactor) => handleDelete(row),
      className: 'text-red-600 hover:bg-red-50'
    }
  ];

  return (
    <div className="space-y-6" id="emission-factors-page">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-border pb-5">
        <div>
          <h1 className="text-2xl font-black text-neutral-text-dark tracking-tight font-sans">
            Emission Factors
          </h1>
          <p className="text-xs text-neutral-text-muted font-medium mt-1">
            Maintain and update precise carbon equivalent factors, versions, and reference datasets.
          </p>
        </div>
        <button
          onClick={handleCreateOpen}
          className="bg-primary-teal hover:bg-primary-teal-dark text-white font-black text-xs uppercase tracking-wider py-2.5 px-4 rounded-xl flex items-center gap-2 transition shadow-sm shrink-0 self-start sm:self-center"
          id="btn-new-factor"
        >
          <Plus className="h-4 w-4" />
          New Emission Factor
        </button>
      </div>

      {/* List / Table stage */}
      <DataTable<EmissionFactor>
        data={factors}
        columns={columns}
        keyExtractor={(row) => row.id}
        searchKey="name"
        searchPlaceholder="Search emission factors by name..."
        emptyTitle="No emission factors"
        emptyDescription="Get started by logging your organization's first environmental emission multiplier."
        emptyCtaLabel="Log First Factor"
        onEmptyCtaClick={handleCreateOpen}
        loading={loading}
        error={error}
        onRetry={loadData}
        actions={actions}
      />

      {/* Drawer Panel */}
      <FormDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={editingFactor ? 'Edit Emission Factor' : 'Create Emission Factor'}
        subtitle={editingFactor ? `Modifying version profile for ${editingFactor.name}` : 'Establish a new scope multiplier for carbon footprint snapshots.'}
        isDirty={isFormDirty}
        footerActions={
          <button
            onClick={handleSave}
            className="bg-primary-teal hover:bg-primary-teal-dark text-white font-black text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl transition shadow"
            id="btn-save-factor"
          >
            {editingFactor ? 'Update Profile' : 'Publish Factor'}
          </button>
        }
      >
        <form className="space-y-5" onSubmit={handleSave}>
          
          {/* Overlap Warning Banner */}
          {hasOverlap && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-left">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <h5 className="text-[11px] font-black text-amber-800 uppercase tracking-wider">Date Overlap Warning</h5>
                <p className="text-[10px] text-amber-700 leading-relaxed font-semibold mt-0.5">
                  The effective dates specify an interval that overlaps an existing version with the same category and unit. Please verify to prevent snapshot calculation collision.
                </p>
              </div>
            </div>
          )}

          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-neutral-text-muted tracking-wider">
              Factor Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Electricity (US Grid Average 2026)"
              value={formName}
              onChange={e => setFormName(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 border border-neutral-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-teal focus:border-primary-teal bg-white font-semibold"
            />
          </div>

          {/* Category Autocomplete Input */}
          <div className="space-y-1.5 relative">
            <label className="text-[10px] font-black uppercase text-neutral-text-muted tracking-wider">
              Category Autocomplete <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                placeholder="Search or type a new category..."
                value={categorySearch}
                onChange={e => {
                  setCategorySearch(e.target.value);
                  setFormCategory(e.target.value);
                  setShowCategoryDropdown(true);
                }}
                onFocus={() => setShowCategoryDropdown(true)}
                className="w-full text-xs px-3.5 py-2.5 border border-neutral-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-teal focus:border-primary-teal bg-white font-semibold"
              />
              {showCategoryDropdown && filteredCategoryOptions.length > 0 && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowCategoryDropdown(false)} />
                  <div className="absolute left-0 right-0 mt-1 bg-white border border-neutral-border shadow-lg rounded-xl max-h-40 overflow-y-auto py-1 z-20">
                    {filteredCategoryOptions.map((cat, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setFormCategory(cat);
                          setCategorySearch(cat);
                          setShowCategoryDropdown(false);
                        }}
                        className="w-full text-left px-3.5 py-2 text-xs font-semibold hover:bg-neutral-bg transition text-neutral-text-dark"
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Scope */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-neutral-text-muted tracking-wider flex items-center gap-1">
                <Layers className="h-3 w-3" /> Scope
              </label>
              <select
                value={formScope}
                onChange={e => setFormScope(Number(e.target.value) as 1 | 2 | 3)}
                className="w-full text-xs px-3.5 py-2.5 border border-neutral-border bg-white rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-teal focus:border-primary-teal font-semibold"
              >
                <option value={1}>Scope 1 - Direct</option>
                <option value={2}>Scope 2 - Indirect</option>
                <option value={3}>Scope 3 - Value Chain</option>
              </select>
            </div>

            {/* Unit Select */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-neutral-text-muted tracking-wider">
                Unit Select <span className="text-red-500">*</span>
              </label>
              <select
                value={formUnit}
                onChange={e => setFormUnit(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 border border-neutral-border bg-white rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-teal focus:border-primary-teal font-semibold"
              >
                {units.map((unit, idx) => (
                  <option key={idx} value={unit}>{unit}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Factor Value */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-neutral-text-muted tracking-wider">
              Factor Value <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 0.380420"
              value={formFactor}
              onChange={e => handleFactorChange(e.target.value)}
              className={`w-full font-mono text-xs px-3.5 py-2.5 border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-teal focus:border-primary-teal bg-white font-semibold ${
                factorError ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-neutral-border'
              }`}
            />
            {factorError && (
              <span className="text-[10px] text-red-500 font-bold tracking-tight block">
                {factorError}
              </span>
            )}
          </div>

          {/* Effective Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-neutral-text-muted tracking-wider">
                Effective From <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formFrom}
                onChange={e => setFormFrom(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 border border-neutral-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-teal focus:border-primary-teal bg-white font-semibold"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-neutral-text-muted tracking-wider">
                Effective To
              </label>
              <input
                type="date"
                value={formTo}
                onChange={e => setFormTo(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 border border-neutral-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-teal focus:border-primary-teal bg-white font-semibold"
              />
            </div>
          </div>

          {/* Source Reference */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-neutral-text-muted tracking-wider flex items-center gap-1">
              Source Reference <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. EPA Greenhouse Gas Inventory July 2025"
              value={formSource}
              onChange={e => setFormSource(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 border border-neutral-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-teal focus:border-primary-teal bg-white font-semibold"
            />
          </div>

        </form>
      </FormDrawer>
    </div>
  );
}
