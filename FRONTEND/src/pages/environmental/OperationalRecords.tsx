import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Leaf, Plus, FileSpreadsheet, ArrowRightLeft, Sparkles, AlertTriangle, 
  Search, Filter, Play, CheckCircle, Info, Calendar, Building, InfoIcon,
  Activity, ArrowDownToLine, Zap, Trash2, Check, Upload
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../components/ui-kit/Toast';
import FormDrawer from '../../components/ui-kit/FormDrawer';
import ConfirmDialog from '../../components/ui-kit/ConfirmDialog';
import StatusBadge from '../../components/ui-kit/StatusBadge';
import SelectField from '../../components/ui/select-field';
import { environmentalService, EmissionFactor } from '../../services/environmentalService';
import { reference } from '../../services/referenceData';

export interface OperationalRecord {
  id: string;
  date: string;
  activityDescription: string;
  emissionFactorId: string;
  quantity: number;
  unit: string;
  department: string; // Department Name (e.g., "Operations")
  status: 'Calculated' | 'Uncalculated';
  calculatedCo2e?: number;
}

const INITIAL_OPERATIONAL_RECORDS: OperationalRecord[] = [
  { id: 'op-1', date: '2026-06-01', activityDescription: 'HQ Central Grid Electricity Usage', emissionFactorId: 'ef-1b', quantity: 18500, unit: 'kWh', department: 'Operations', status: 'Calculated', calculatedCo2e: 7030 },
  { id: 'op-2', date: '2026-06-02', activityDescription: 'Fleet Delivery Logistics Diesel', emissionFactorId: 'ef-2', quantity: 640, unit: 'liters', department: 'Logistics', status: 'Calculated', calculatedCo2e: 1715.2 },
  { id: 'op-3', date: '2026-06-05', activityDescription: 'Server Room Cooling Power Load', emissionFactorId: 'ef-1b', quantity: 12400, unit: 'kWh', department: 'Engineering', status: 'Uncalculated' },
  { id: 'op-4', date: '2026-06-08', activityDescription: 'Executive Commute Travel (Direct)', emissionFactorId: 'ef-4', quantity: 3800, unit: 'km', department: 'Procurement', status: 'Uncalculated' },
  { id: 'op-5', date: '2026-06-10', activityDescription: 'Bulk Workspace Waste Incineration', emissionFactorId: 'ef-6', quantity: 1500, unit: 'kg', department: 'Human Resources', status: 'Uncalculated' }
];

const STORAGE_KEY = 'ecosphere_operational_records';

export default function OperationalRecords() {
  const { role } = useApp();
  const { addToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  const [records, setRecords] = useState<OperationalRecord[]>([]);
  const [emissionFactors, setEmissionFactors] = useState<EmissionFactor[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [autoCalc, setAutoCalc] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');

  // Log drawer state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formDescription, setFormDescription] = useState('');
  const [formFactorId, setFormFactorId] = useState('');
  const [formQuantity, setFormQuantity] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formDeptName, setFormDeptName] = useState('');

  // CSV Import Modal state
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvContent, setCsvContent] = useState<string>(
    `Date,ActivityDescription,EmissionFactorId,Quantity,Department\n` +
    `2026-06-12,Boiler Room Natural Gas Burner,ef-3,4500,Operations\n` +
    `2026-06-14,Sales Team Regional Flights,ef-5,12000,Human Resources\n` +
    `2026-06-15,Facilities Water Treatment Intake,ef-7,120,Operations`
  );

  // Initial Load
  useEffect(() => {
    // Check if status is passed in query params
    const statusParam = searchParams.get('status');
    if (statusParam) {
      setSelectedStatus(statusParam);
    }

    // Load operational records
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setRecords(JSON.parse(stored));
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_OPERATIONAL_RECORDS));
      setRecords(INITIAL_OPERATIONAL_RECORDS);
    }

    // Load emission factors
    environmentalService.getEmissionFactors().then(factors => {
      setEmissionFactors(factors);
      setLoading(false);
    });
    reference.departments().then((d) => setDepartments(d.map((x) => ({ id: x.id, name: x.name })))).catch(() => {});
  }, [searchParams]);

  const saveRecords = (updated: OperationalRecord[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setRecords(updated);
  };

  // Toggle global auto-calc
  const handleToggleAutoCalc = () => {
    const nextVal = !autoCalc;
    setAutoCalc(nextVal);
    addToast(
      nextVal 
        ? 'Auto-Emission calculation is now ENABLED. New records convert instantly.' 
        : 'Auto-Emission calculation is now DISABLED. New records will queue as Uncalculated.',
      'info'
    );
  };

  // Convert unit display helper
  const getFactorUnit = (factorId: string) => {
    const ef = emissionFactors.find(f => f.id === factorId);
    return ef ? ef.unit : 'units';
  };

  // Manual Calculation Trigger
  const handleCalculateEmissions = async (record: OperationalRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const factor = emissionFactors.find(f => f.id === record.emissionFactorId);
    if (!factor) {
      addToast('Cannot calculate — linked emission factor not found in registry', 'danger');
      return;
    }

    // Compute CO2e
    const computedCo2e = parseFloat((record.quantity * factor.factor).toFixed(2));

    // Save to carbon transaction ledger
    try {
      await environmentalService.saveCarbonTransaction({
        date: record.date,
        department: record.department,
        emissionFactorId: record.emissionFactorId,
        quantity: record.quantity,
        mode: 'Manual',
        notes: `Calculated from raw operational record logs. Activity: ${record.activityDescription}`
      });

      // Update state
      const updated = records.map(r => {
        if (r.id === record.id) {
          return {
            ...r,
            status: 'Calculated' as const,
            calculatedCo2e: computedCo2e
          };
        }
        return r;
      });
      saveRecords(updated);

      addToast(
        `Emissions calculated successfully! ${computedCo2e.toLocaleString()} kg CO₂e appended to Ledger.`,
        'success'
      );
    } catch (err) {
      console.error(err);
      addToast('Failed to append carbon transaction to database.', 'danger');
    }
  };

  // Log Raw record
  const handleLogRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDescription || !formFactorId || !formQuantity || !formDeptName) {
      addToast('Please complete all form inputs', 'warning');
      return;
    }

    const qty = parseFloat(formQuantity);
    const factor = emissionFactors.find(f => f.id === formFactorId);
    if (!factor) return;

    let computedCo2e: number | undefined;
    let status: 'Calculated' | 'Uncalculated' = 'Uncalculated';

    if (autoCalc) {
      status = 'Calculated';
      computedCo2e = parseFloat((qty * factor.factor).toFixed(2));
      
      // Save carbon transaction instantly
      await environmentalService.saveCarbonTransaction({
        date: formDate,
        department: formDeptName,
        emissionFactorId: formFactorId,
        quantity: qty,
        mode: 'Auto',
        notes: `Auto-calculated raw logs. Activity: ${formDescription}`
      });
    }

    const newRecord: OperationalRecord = {
      id: `op-${Date.now()}`,
      date: formDate,
      activityDescription: formDescription,
      emissionFactorId: formFactorId,
      quantity: qty,
      unit: factor.unit,
      department: formDeptName,
      status,
      calculatedCo2e: computedCo2e
    };

    saveRecords([newRecord, ...records]);
    setIsFormOpen(false);

    // Reset inputs
    setFormDescription('');
    setFormFactorId('');
    setFormQuantity('');
    setFormDeptName('');

    addToast(
      autoCalc 
        ? `Operational record saved & CO₂e calculated instantly!` 
        : `Operational record queued as Uncalculated.`,
      'success'
    );
  };

  // CSV Import parser simulation
  const handleImportCsv = async () => {
    try {
      const lines = csvContent.trim().split('\n');
      if (lines.length <= 1) {
        addToast('No CSV data rows found to import', 'warning');
        return;
      }

      const headers = lines[0].split(',');
      const rows = lines.slice(1);
      const newImportedRecords: OperationalRecord[] = [];

      for (let i = 0; i < rows.length; i++) {
        const columns = rows[i].split(',');
        if (columns.length < 5) continue;

        const date = columns[0].trim();
        const activityDescription = columns[1].trim();
        const emissionFactorId = columns[2].trim();
        const quantity = parseFloat(columns[3].trim());
        const department = columns[4].trim();

        const factor = emissionFactors.find(f => f.id === emissionFactorId);
        if (!factor) continue;

        let computedCo2e: number | undefined;
        let status: 'Calculated' | 'Uncalculated' = 'Uncalculated';

        if (autoCalc) {
          status = 'Calculated';
          computedCo2e = parseFloat((quantity * factor.factor).toFixed(2));
          
          // Save carbon transaction instantly
          await environmentalService.saveCarbonTransaction({
            date,
            department,
            emissionFactorId,
            quantity,
            mode: 'Auto',
            notes: `Auto-calculated via CSV bulk loader. Activity: ${activityDescription}`
          });
        }

        newImportedRecords.push({
          id: `op-${Date.now()}-${i}`,
          date,
          activityDescription,
          emissionFactorId,
          quantity,
          unit: factor.unit,
          department,
          status,
          calculatedCo2e: computedCo2e
        });
      }

      if (newImportedRecords.length === 0) {
        addToast('No valid rows could be imported. Check emission factor IDs.', 'warning');
        return;
      }

      saveRecords([...newImportedRecords, ...records]);
      setIsCsvModalOpen(false);
      addToast(
        `Bulk Import Successful! ${newImportedRecords.length} raw records added in ${autoCalc ? 'Auto-Calculated' : 'Uncalculated'} mode.`,
        'success'
      );
    } catch (err) {
      addToast('Failed to parse CSV string. Ensure proper layout formats.', 'danger');
    }
  };

  // Delete Record
  const handleDeleteRecord = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = records.filter(r => r.id !== id);
    saveRecords(updated);
    addToast('Raw record log deleted', 'success');
  };

  // Filtered operational records list computation
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      // Search
      const search = searchQuery.toLowerCase();
      if (search && !r.activityDescription.toLowerCase().includes(search) && !r.department.toLowerCase().includes(search) && !r.unit.toLowerCase().includes(search)) {
        return false;
      }

      // Department filter
      if (selectedDept !== 'All' && r.department !== selectedDept) return false;

      // Status filter
      if (selectedStatus !== 'All' && r.status !== selectedStatus) return false;

      return true;
    });
  }, [records, searchQuery, selectedDept, selectedStatus]);

  return (
    <div className="space-y-6" id="operational-records-page">
      {/* Header action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-border pb-5">
        <div>
          <h1 className="text-2xl font-black text-neutral-text-dark tracking-tight font-sans flex items-center gap-2">
            Operational Records
          </h1>
          <p className="text-xs text-neutral-text-muted font-medium mt-1">
            Raw utilization log records (kWh, liters, km) captured before greenhouse conversion calculations.
          </p>
        </div>
        
        {/* Actions layout column */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start sm:self-center">
          {/* Global Auto-Calc Switcher */}
          <div className="flex items-center gap-2 bg-neutral-bg border border-neutral-border py-1.5 px-3.5 rounded-xl text-xs font-semibold shadow-xs">
            <span className="text-neutral-text-dark">Auto-Calc CO₂e</span>
            <button
              onClick={handleToggleAutoCalc}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                autoCalc ? 'bg-primary-teal' : 'bg-neutral-border'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  autoCalc ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <button
            onClick={() => setIsCsvModalOpen(true)}
            className="border border-neutral-border hover:bg-neutral-bg text-neutral-text-dark font-black text-xs uppercase tracking-wider py-2.5 px-3.5 rounded-xl flex items-center gap-1.5 transition shadow-sm"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            CSV Import
          </button>

          <button
            onClick={() => setIsFormOpen(true)}
            className="bg-primary-teal hover:bg-primary-teal-dark text-white font-black text-xs uppercase tracking-wider py-2.5 px-4 rounded-xl flex items-center gap-2 transition shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Log Raw Activity
          </button>
        </div>
      </div>

      {/* Filter panel */}
      <div className="bg-white border border-neutral-border p-4 rounded-2xl shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Search */}
        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase text-neutral-text-muted tracking-wider">Search activity description</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="h-4 w-4 text-neutral-text-muted" />
            </span>
            <input
              type="text"
              placeholder="e.g. Server, heating, fleets..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-9 pr-4 py-2 border border-neutral-border rounded-xl bg-neutral-bg/30 font-semibold focus:outline-none"
            />
          </div>
        </div>

        {/* Department filter */}
        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase text-neutral-text-muted tracking-wider">Department Allocation</label>
          <SelectField
            value={selectedDept}
            onValueChange={setSelectedDept}
            options={[
              { value: 'All', label: 'All Departments' },
              ...departments.map((department) => ({
                value: department.name,
                label: department.name,
              })),
            ]}
            triggerClassName="w-full h-9 text-xs px-3 py-2 font-semibold text-neutral-text-dark"
          />
        </div>

        {/* Status filter */}
        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase text-neutral-text-muted tracking-wider">Calculation Status</label>
          <SelectField
            value={selectedStatus}
            onValueChange={setSelectedStatus}
            options={[
              { value: 'All', label: 'All Statuses' },
              { value: 'Calculated', label: 'Calculated Only' },
              { value: 'Uncalculated', label: 'Uncalculated Only' },
            ]}
            triggerClassName="w-full h-9 text-xs px-3 py-2 font-semibold text-neutral-text-dark"
          />
        </div>
      </div>

      {/* Operational Records DataTable */}
      <div className="bg-white border border-neutral-border rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-bg/60 border-b border-neutral-border text-[10px] font-black uppercase text-neutral-text-muted tracking-wider">
                <th className="py-3.5 px-6">Log Date</th>
                <th className="py-3.5 px-4">Activity Description</th>
                <th className="py-3.5 px-4 text-right">Raw Log Quantity</th>
                <th className="py-3.5 px-4">Department Allocation</th>
                <th className="py-3.5 px-4">Conversion Status</th>
                <th className="py-3.5 px-4 text-right">Computed CO₂e</th>
                <th className="py-3.5 px-6 text-right">Row Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-border text-xs">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-neutral-text-muted space-y-2">
                    <Activity className="h-8 w-8 text-neutral-border mx-auto animate-pulse" />
                    <p className="font-bold">No Operational Records Found</p>
                    <p className="text-[10px]">Adjust filters or log a new raw metric log above.</p>
                  </td>
                </tr>
              ) : (
                filteredRecords.map(record => (
                  <tr key={record.id} className="hover:bg-neutral-bg/30 transition">
                    <td className="py-3.5 px-6 font-mono text-neutral-text-muted">
                      {record.date}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-neutral-text-dark">
                      <div className="flex flex-col">
                        <span>{record.activityDescription}</span>
                        <span className="text-[9px] text-neutral-text-muted font-bold font-mono uppercase tracking-wide mt-0.5">
                          Factor ID: {record.emissionFactorId}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-black text-neutral-text-dark">
                      {record.quantity.toLocaleString()} <span className="text-[10px] text-neutral-text-muted font-normal font-sans">{record.unit}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 text-[11px] text-neutral-text-dark font-bold">
                        <Building className="h-3 w-3 text-primary-teal" />
                        {record.department}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge 
                        status={
                          record.status === 'Calculated'
                            ? { code: 'calculated', label: 'Calculated', color: 'bg-emerald-50 text-emerald-800 border-emerald-100' }
                            : { code: 'uncalculated', label: 'Uncalculated', color: 'bg-amber-50 text-amber-800 border-amber-100' }
                        }
                      />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {record.status === 'Calculated' && record.calculatedCo2e !== undefined ? (
                        <span className="font-mono font-black text-neutral-text-dark text-sm">
                          {record.calculatedCo2e.toLocaleString()} <span className="text-[10px] font-bold text-neutral-text-muted">kg</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-neutral-text-muted font-bold uppercase tracking-wider">Pending</span>
                      )}
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {record.status === 'Uncalculated' && (
                          <button
                            onClick={e => handleCalculateEmissions(record, e)}
                            className="bg-primary-teal hover:bg-primary-teal-dark text-white font-black text-[10px] uppercase tracking-wider py-1 px-3 rounded-lg flex items-center gap-1 transition shadow-xs border border-transparent"
                            title="Convert raw values to CO2e"
                          >
                            <ArrowRightLeft className="h-3 w-3 shrink-0" />
                            Calculate
                          </button>
                        )}
                        <button
                          onClick={e => handleDeleteRecord(record.id, e)}
                          className="p-1.5 hover:bg-red-50 text-neutral-text-muted hover:text-red-600 rounded-lg transition"
                          title="Delete Operational Log"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE Drawer for operational logging */}
      <FormDrawer
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title="Log Raw Activity Metric"
        subtitle="Report direct operational resource load parameters"
      >
        <form onSubmit={handleLogRecord} className="p-5 space-y-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-neutral-text-muted tracking-wider">Activity Description</label>
            <input
              type="text"
              required
              placeholder="e.g. Warehouse Fleet Gasoline Utilization"
              value={formDescription}
              onChange={e => setFormDescription(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 border border-neutral-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-teal font-semibold text-neutral-text-dark"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-neutral-text-muted tracking-wider">Emission Factor Link</label>
            <SelectField
              value={formFactorId}
              onValueChange={setFormFactorId}
              options={emissionFactors.map((factor) => ({
                value: factor.id,
                label: `${factor.name} (${factor.unit})`,
              }))}
              placeholder="-- Select Resource Activity Type --"
              allowEmpty
              triggerClassName="w-full h-10 text-xs px-3.5 py-2.5 font-semibold text-neutral-text-dark"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-neutral-text-muted tracking-wider">
              Log Raw Quantity {formFactorId && `(${getFactorUnit(formFactorId)})`}
            </label>
            <input
              type="number"
              required
              step="any"
              placeholder="e.g. 1500"
              value={formQuantity}
              onChange={e => setFormQuantity(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 border border-neutral-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-teal font-mono font-bold text-neutral-text-dark"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-neutral-text-muted tracking-wider">Log Record Date</label>
            <input
              type="date"
              required
              value={formDate}
              onChange={e => setFormDate(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 border border-neutral-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-teal font-mono font-bold text-neutral-text-dark"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-neutral-text-muted tracking-wider">Department Allocation</label>
            <SelectField
              value={formDeptName}
              onValueChange={setFormDeptName}
              options={departments.map((department) => ({
                value: department.name,
                label: department.name,
              }))}
              placeholder="-- Choose Corporate Department --"
              allowEmpty
              triggerClassName="w-full h-10 text-xs px-3.5 py-2.5 font-semibold text-neutral-text-dark"
            />
          </div>

          <div className="p-4 bg-neutral-bg/40 border border-neutral-border rounded-2xl flex gap-3 text-[11px] text-neutral-text-muted">
            <Info className="h-4.5 w-4.5 text-primary-teal shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-neutral-text-dark">Current Core State configuration</span>
              <p className="mt-1 font-medium leading-relaxed">
                Auto-Calculation is currently <span className="font-black text-primary-teal">{autoCalc ? 'ENABLED' : 'DISABLED'}</span>. 
                {autoCalc ? ' Saving will write the CO2e equivalent immediately to ledger charts.' : ' Saving will log raw values as Uncalculated.'}
              </p>
            </div>
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
              Log Record Entry
            </button>
          </div>
        </form>
      </FormDrawer>

      {/* CSV IMPORT DIALOG */}
      <FormDrawer
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        title="Simulate CSV Import Loader"
        subtitle="Inject a batch of raw utilization logging records via direct CSV strings"
      >
        <div className="p-5 space-y-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-neutral-text-muted tracking-wider">CSV Data Payload</label>
            <textarea
              rows={8}
              value={csvContent}
              onChange={e => setCsvContent(e.target.value)}
              className="w-full text-xs p-3.5 border border-neutral-border rounded-xl font-mono focus:outline-none focus:ring-1 focus:ring-primary-teal font-semibold text-neutral-text-dark leading-relaxed"
            />
          </div>

          <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl flex gap-3 text-[11px] text-emerald-800 leading-relaxed font-semibold">
            <InfoIcon className="h-4.5 w-4.5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span>Importer Notice</span>
              <p className="mt-1 font-medium text-neutral-text-muted text-[10px]">
                Ensure Emission Factor IDs match existing registry values (e.g., <code className="bg-neutral-bg p-0.5 rounded">ef-1b</code>, <code className="bg-neutral-bg p-0.5 rounded">ef-2</code>, etc.). Auto-Calc configuration: <span className="font-bold text-primary-teal">{autoCalc ? 'Active' : 'Deactivated'}</span>.
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-neutral-border flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsCsvModalOpen(false)}
              className="border border-neutral-border text-neutral-text-dark hover:bg-neutral-bg text-xs font-bold uppercase tracking-wider py-2.5 px-4 rounded-xl"
            >
              Cancel
            </button>
            <button
              onClick={handleImportCsv}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider py-2.5 px-5 rounded-xl shadow-md transition flex items-center gap-1.5"
            >
              <Upload className="h-4 w-4" />
              Parse & Import Rows
            </button>
          </div>
        </div>
      </FormDrawer>
    </div>
  );
}
