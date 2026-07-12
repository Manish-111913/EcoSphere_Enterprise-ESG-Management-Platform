import React, { useState, useEffect, useRef } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../components/ui-kit/Toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Settings as SettingsIcon, Sliders, Palette, ShieldAlert, Key, ClipboardList,
  Upload, Save, Plus, Trash2, CheckCircle, Search, ToggleLeft, ToggleRight, AlertTriangle
} from 'lucide-react';
import { api } from '../services/apiClient';
import { reference } from '../services/referenceData';

interface LookupItem {
  id: string;
  type: 'severity' | 'difficulty' | 'status';
  name: string;
  color: string;
}

interface WorkflowRule {
  id: string;
  event: string;
  approverRole: string;
  notifyRole: string;
  channels: string[];
  enabled: boolean;
}

interface AuditLog {
  id: string;
  timestamp: string;
  actor: { name: string; avatar: string };
  action: string;
  entity: string;
  details: string;
}

export default function Settings() {
  const { settings, updateSettings } = useSettings();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<'general' | 'lookups' | 'rules' | 'permissions' | 'audit'>('general');

  // 1. GENERAL & TOGGLES STATES
  const [orgName, setOrgName] = useState('EcoSphere Enterprise Corp');
  const [logoFile, setLogoFile] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setLogoFile(url);
      addToast({ title: 'Logo Uploaded', description: `File ${file.name} registered.`, type: 'success' });
    }
  };
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setLogoFile(url);
      addToast({ title: 'Logo Uploaded', description: `File ${file.name} registered.`, type: 'success' });
    }
  };

  // 2. LOOKUPS & WEIGHTS STATES
  const [lookups, setLookups] = useState<LookupItem[]>([]);
  const [newLookupName, setNewLookupName] = useState('');
  const [newLookupColor, setNewLookupColor] = useState('#0F766E');
  const [newLookupType, setNewLookupType] = useState<'severity' | 'difficulty' | 'status'>('severity');

  const [weights, setWeights] = useState({ e: 40, s: 30, g: 30 });
  const totalWeight = weights.e + weights.s + weights.g;

  useEffect(() => {
    const cachedLookups = localStorage.getItem('ecosphere_settings_lookups');
    if (cachedLookups) {
      setLookups(JSON.parse(cachedLookups));
    } else {
      const initial: LookupItem[] = [
        { id: 'lk-1', type: 'severity', name: 'Critical', color: '#EF4444' },
        { id: 'lk-2', type: 'severity', name: 'High', color: '#F97316' },
        { id: 'lk-3', type: 'difficulty', name: 'Hard', color: '#8B5CF6' },
        { id: 'lk-4', type: 'status', name: 'Under Review', color: '#3B82F6' },
      ];
      localStorage.setItem('ecosphere_settings_lookups', JSON.stringify(initial));
      setLookups(initial);
    }

    const cachedWeights = localStorage.getItem('ecosphere_esg_weights');
    if (cachedWeights) {
      setWeights(JSON.parse(cachedWeights));
    }
  }, []);

  const handleAddLookup = () => {
    if (!newLookupName.trim()) return;
    const newItem: LookupItem = {
      id: `lk-${Date.now()}`,
      type: newLookupType,
      name: newLookupName,
      color: newLookupColor,
    };
    const updated = [...lookups, newItem];
    setLookups(updated);
    localStorage.setItem('ecosphere_settings_lookups', JSON.stringify(updated));
    setNewLookupName('');
    addToast({ title: 'Lookup Registered', description: `Registered lookup '${newItem.name}' successfully.`, type: 'success' });
  };

  const handleDeleteLookup = (id: string) => {
    const updated = lookups.filter(lk => lk.id !== id);
    setLookups(updated);
    localStorage.setItem('ecosphere_settings_lookups', JSON.stringify(updated));
    addToast({ title: 'Lookup Removed', description: 'Selected lookup category deleted.', type: 'info' });
  };

  const handleSaveWeights = () => {
    if (totalWeight !== 100) return;
    localStorage.setItem('ecosphere_esg_weights', JSON.stringify(weights));
    addToast({
      title: 'Weights Configured',
      description: `E ${weights.e}% · S ${weights.s}% · G ${weights.g}% successfully configured.`,
      type: 'success'
    });
  };

  // 3. WORKFLOW RULES STATES
  const [rules, setRules] = useState<WorkflowRule[]>([]);
  const [newRuleEvent, setNewRuleEvent] = useState('Emissions Log Submission');
  const [newRuleApprover, setNewRuleApprover] = useState('ESG Manager');
  const [newRuleNotify, setNewRuleNotify] = useState('Department Head');

  useEffect(() => {
    const cachedRules = localStorage.getItem('ecosphere_settings_rules');
    if (cachedRules) {
      setRules(JSON.parse(cachedRules));
    } else {
      const initial: WorkflowRule[] = [
        { id: 'rl-1', event: 'Scope 1/2 Logged', approverRole: 'ESG Manager', notifyRole: 'Department Head', channels: ['App', 'Email'], enabled: true },
        { id: 'rl-2', event: 'Challenge proof uploaded', approverRole: 'CSR Manager', notifyRole: 'Employee', channels: ['App'], enabled: true },
        { id: 'rl-3', event: 'Compliance breach flagged', approverRole: 'Compliance Officer', notifyRole: 'Admin', channels: ['App', 'Slack'], enabled: true },
      ];
      localStorage.setItem('ecosphere_settings_rules', JSON.stringify(initial));
      setRules(initial);
    }
  }, []);

  const handleAddRule = () => {
    const newRule: WorkflowRule = {
      id: `rl-${Date.now()}`,
      event: newRuleEvent,
      approverRole: newRuleApprover,
      notifyRole: newRuleNotify,
      channels: ['App', 'Email'],
      enabled: true
    };
    const updated = [...rules, newRule];
    setRules(updated);
    localStorage.setItem('ecosphere_settings_rules', JSON.stringify(updated));
    addToast({ title: 'Workflow Rule Added', description: 'Automated notification hook added.', type: 'success' });
  };

  const handleDeleteRule = (id: string) => {
    const updated = rules.filter(r => r.id !== id);
    setRules(updated);
    localStorage.setItem('ecosphere_settings_rules', JSON.stringify(updated));
    addToast({ title: 'Rule Deleted', description: 'Workflow rule removed.', type: 'info' });
  };

  const handleToggleRule = (id: string) => {
    const updated = rules.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r);
    setRules(updated);
    localStorage.setItem('ecosphere_settings_rules', JSON.stringify(updated));
  };

  // 4. ROLES & PERMISSIONS MATRIX
  const permissionsList = [
    { key: 'log_emissions', label: 'Log Scope 1/2 Emissions' },
    { key: 'approve_carbon', label: 'Approve Carbon Transactions' },
    { key: 'create_challenges', label: 'Create Gamified Challenges' },
    { key: 'approve_proof', label: 'Approve Participation Proof' },
    { key: 'sign_policies', label: 'Sign-off Policies' },
    { key: 'view_audits', label: 'Inspect Auditor Snapshots' },
    { key: 'resolve_issues', label: 'Resolve Compliance Issues' }
  ];

  const rolesList = ['Admin', 'ESG Manager', 'CSR Manager', 'Compliance Officer', 'Department Head', 'Employee', 'Auditor'];

  const [matrix, setMatrix] = useState<Record<string, string[]>>({
    'Admin': permissionsList.map(p => p.key),
    'ESG Manager': ['log_emissions', 'approve_carbon'],
    'CSR Manager': ['create_challenges', 'approve_proof'],
    'Compliance Officer': ['sign_policies', 'resolve_issues'],
    'Department Head': ['log_emissions', 'sign_policies'],
    'Employee': ['sign_policies'],
    'Auditor': ['view_audits']
  });

  const handleMatrixToggle = (role: string, perm: string) => {
    const activePerms = matrix[role] || [];
    let updatedPerms = [];
    if (activePerms.includes(perm)) {
      updatedPerms = activePerms.filter(p => p !== perm);
    } else {
      updatedPerms = [...activePerms, perm];
    }
    const updatedMatrix = { ...matrix, [role]: updatedPerms };
    setMatrix(updatedMatrix);
    addToast({ title: 'Permissions updated', description: `Modified clearances for role '${role}'.`, type: 'info' });
  };

  // 5. PLATFORM AUDIT LOGS
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditSearch, setAuditSearch] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<{ id: string; actorId: string | null; action: string; entityType: string | null; entityId: string | null; createdAt: string }[] | { data: { id: string; actorId: string | null; action: string; entityType: string | null; entityId: string | null; createdAt: string }[] }>('/audit-logs?size=25');
        const rows = Array.isArray(res) ? res : res.data;
        const mapped: AuditLog[] = await Promise.all(rows.map(async (r) => {
          const name = r.actorId ? await reference.userNameById(r.actorId).catch(() => 'System') : 'System';
          return {
            id: r.id.slice(0, 8).toUpperCase(),
            timestamp: (r.createdAt || '').replace('T', ' ').slice(0, 19),
            actor: { name, avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0D9488&color=fff` },
            action: r.action,
            entity: r.entityType ?? '—',
            details: `${r.action} on ${r.entityType ?? 'entity'}${r.entityId ? ` (${r.entityId.slice(0, 8)})` : ''}`,
          };
        }));
        setAuditLogs(mapped);
      } catch {
        setAuditLogs([]);
      }
    })();
  }, []);

  const filteredLogs = auditLogs.filter(log =>
    log.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
    log.actor.name.toLowerCase().includes(auditSearch.toLowerCase()) ||
    log.entity.toLowerCase().includes(auditSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 text-left">
      {/* Settings Title */}
      <div className="border-b border-neutral-border pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-neutral-text-dark tracking-tight">Platform Configuration Center</h1>
          <p className="text-xs text-neutral-text-muted mt-1">
            Admin console. Control emission factors, ESG weights, lookups, notification rules, and role permissions.
          </p>
        </div>
      </div>

      {/* Tabs Row */}
      <div className="flex items-center gap-2 border-b border-neutral-border overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab('general')}
          className={`px-4 py-2 text-xs font-black border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'general' ? 'border-primary-teal text-primary-teal bg-teal-50/5' : 'border-transparent text-neutral-text-muted hover:text-neutral-text-dark'
          }`}
        >
          <Sliders size={14} /> General & Feature Toggles
        </button>
        <button
          onClick={() => setActiveTab('lookups')}
          className={`px-4 py-2 text-xs font-black border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'lookups' ? 'border-primary-teal text-primary-teal bg-teal-50/5' : 'border-transparent text-neutral-text-muted hover:text-neutral-text-dark'
          }`}
        >
          <Palette size={14} /> Lookups & ESG Weights
        </button>
        <button
          onClick={() => setActiveTab('rules')}
          className={`px-4 py-2 text-xs font-black border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'rules' ? 'border-primary-teal text-primary-teal bg-teal-50/5' : 'border-transparent text-neutral-text-muted hover:text-neutral-text-dark'
          }`}
        >
          <ShieldAlert size={14} /> Workflow Triggers
        </button>
        <button
          onClick={() => setActiveTab('permissions')}
          className={`px-4 py-2 text-xs font-black border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'permissions' ? 'border-primary-teal text-primary-teal bg-teal-50/5' : 'border-transparent text-neutral-text-muted hover:text-neutral-text-dark'
          }`}
        >
          <Key size={14} /> Permissions Matrix
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 text-xs font-black border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === 'audit' ? 'border-primary-teal text-primary-teal bg-teal-50/5' : 'border-transparent text-neutral-text-muted hover:text-neutral-text-dark'
          }`}
        >
          <ClipboardList size={14} /> System Audit Logs
        </button>
      </div>

      {/* ---------------------------------
          TAB 1: GENERAL & FEATURE TOGGLES
         --------------------------------- */}
      {activeTab === 'general' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
          {/* General settings card */}
          <div className="bg-white border border-neutral-border rounded-xl p-5 shadow-sm space-y-5">
            <h3 className="text-sm font-bold text-neutral-text-dark border-b border-neutral-border pb-3">
              Corporate Organization Profile
            </h3>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-neutral-text-muted">Tenant Name</label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full border border-neutral-border rounded-lg px-3 py-2 text-xs text-neutral-text-dark focus:ring-1 focus:ring-primary-teal bg-white"
                />
              </div>

              {/* DRAG AND DROP FILE UPLOADER */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-neutral-text-muted">Enterprise Logo Symbol</label>
                <div
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-neutral-border hover:border-primary-teal rounded-xl p-6 text-center cursor-pointer bg-neutral-bg/20 hover:bg-neutral-bg/45 transition-all group flex flex-col items-center justify-center gap-2"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept="image/*"
                    className="hidden"
                  />
                  {logoFile ? (
                    <img src={logoFile} alt="Enterprise Logo" className="h-14 object-contain rounded-lg border border-neutral-border p-1 bg-white" />
                  ) : (
                    <Upload className="h-6 w-6 text-neutral-text-muted group-hover:text-primary-teal transition-colors" />
                  )}
                  <span className="text-xs font-bold text-neutral-text-dark">Drag and drop or click to upload logo</span>
                  <span className="text-[10px] text-neutral-text-muted">Supports transparent PNG, SVG files up to 2MB</span>
                </div>
              </div>
            </div>
          </div>

          {/* Core Feature Toggles card */}
          <div className="bg-white border border-neutral-border rounded-xl p-5 shadow-sm space-y-5">
            <h3 className="text-sm font-bold text-neutral-text-dark border-b border-neutral-border pb-3">
              System Automation Feature Toggles
            </h3>
            <p className="text-xs text-neutral-text-muted leading-relaxed">
              These control core workflows. Adjusting toggles writes to the system settings context so gameplay rules react LIVE.
            </p>

            <div className="space-y-5.5 pt-2">
              {/* Toggle 1 */}
              <div className="flex items-start justify-between gap-4">
                <div className="text-left">
                  <span className="text-xs font-bold text-neutral-text-dark block">Auto Emission Calculation</span>
                  <p className="text-[11px] text-neutral-text-muted mt-0.5 leading-normal">
                    Trigger real-time CO₂e calculations when a transaction log matches EPA factor coefficients.
                  </p>
                </div>
                <button
                  onClick={() => updateSettings({ autoEmissionCalc: !settings.autoEmissionCalc })}
                  className="text-primary-teal shrink-0"
                >
                  {settings.autoEmissionCalc ? <ToggleRight size={38} className="text-primary-teal" /> : <ToggleLeft size={38} className="text-neutral-text-muted" />}
                </button>
              </div>

              {/* Toggle 2 */}
              <div className="flex items-start justify-between gap-4 border-t border-neutral-border/50 pt-4">
                <div className="text-left">
                  <span className="text-xs font-bold text-neutral-text-dark block">Evidence Requirement Enforcement</span>
                  <p className="text-[11px] text-neutral-text-muted mt-0.5 leading-normal">
                    Mandate employees to submit file evidence (images, PDF logs) prior to joining or finishing any challenge.
                  </p>
                </div>
                <button
                  onClick={() => updateSettings({ evidenceRequired: !settings.evidenceRequired })}
                  className="text-primary-teal shrink-0"
                >
                  {settings.evidenceRequired ? <ToggleRight size={38} className="text-primary-teal" /> : <ToggleLeft size={38} className="text-neutral-text-muted" />}
                </button>
              </div>

              {/* Toggle 3 */}
              <div className="flex items-start justify-between gap-4 border-t border-neutral-border/50 pt-4">
                <div className="text-left">
                  <span className="text-xs font-bold text-neutral-text-dark block">Badge Auto-Award Milestones</span>
                  <p className="text-[11px] text-neutral-text-muted mt-0.5 leading-normal">
                    Automatically award achievement badges once employees hit milestone point thresholds.
                  </p>
                </div>
                <button
                  onClick={() => updateSettings({ badgeAutoAward: !settings.badgeAutoAward })}
                  className="text-primary-teal shrink-0"
                >
                  {settings.badgeAutoAward ? <ToggleRight size={38} className="text-primary-teal" /> : <ToggleLeft size={38} className="text-neutral-text-muted" />}
                </button>
              </div>

              {/* Toggle 4 */}
              <div className="flex items-start justify-between gap-4 border-t border-neutral-border/50 pt-4">
                <div className="text-left">
                  <span className="text-xs font-bold text-neutral-text-dark block">Email Alerts & Notifications</span>
                  <p className="text-[11px] text-neutral-text-muted mt-0.5 leading-normal">
                    Deliver direct email summaries to stakeholders upon critical carbon limits or policy sign-off deadlines.
                  </p>
                </div>
                <button
                  onClick={() => updateSettings({ emailNotifications: !settings.emailNotifications })}
                  className="text-primary-teal shrink-0"
                >
                  {settings.emailNotifications ? <ToggleRight size={38} className="text-primary-teal" /> : <ToggleLeft size={38} className="text-neutral-text-muted" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------
          TAB 2: LOOKUPS & ESG WEIGHTS
         --------------------------------- */}
      {activeTab === 'lookups' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
          
          {/* Lookups Table editor */}
          <div className="lg:col-span-7 bg-white border border-neutral-border rounded-xl p-5 shadow-sm space-y-4">
            <div className="border-b border-neutral-border pb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-neutral-text-dark">Statuses & Categories Registry</h3>
              <span className="text-[10px] text-neutral-text-muted font-bold font-mono uppercase">Add/Edit Dictionary</span>
            </div>

            {/* List of lookups */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-neutral-border text-neutral-text-muted bg-neutral-bg">
                    <th className="p-2 font-semibold">Dictionary Type</th>
                    <th className="p-2 font-semibold">Lookup Name</th>
                    <th className="p-2 font-semibold text-center">Color Stamp</th>
                    <th className="p-2 font-semibold text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-border">
                  {lookups.map(lk => (
                    <tr key={lk.id} className="hover:bg-neutral-bg/30">
                      <td className="p-2 font-mono uppercase text-[10px] text-neutral-text-muted font-bold">{lk.type}</td>
                      <td className="p-2 font-bold text-neutral-text-dark">{lk.name}</td>
                      <td className="p-2 text-center">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-sm" style={{ backgroundColor: lk.color }}>
                          {lk.name}
                        </span>
                      </td>
                      <td className="p-2 text-center">
                        <button
                          onClick={() => handleDeleteLookup(lk.id)}
                          className="p-1 hover:bg-red-50 text-neutral-text-muted hover:text-red-600 rounded transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Add Lookups Form */}
            <div className="border-t border-neutral-border/50 pt-4 grid grid-cols-1 sm:grid-cols-3 gap-2 flex-wrap items-end">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-neutral-text-muted block">Dict Type</label>
                <Select
                  value={newLookupType}
                  onValueChange={(value: 'severity' | 'difficulty' | 'status') => setNewLookupType(value)}
                >
                  <SelectTrigger className="h-8 rounded-lg px-2 text-xs shadow-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="severity">Severity Rating</SelectItem>
                    <SelectItem value="difficulty">Difficulty Badge</SelectItem>
                    <SelectItem value="status">Process Status</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-neutral-text-muted block">Lookup Label</label>
                <input
                  type="text"
                  placeholder="e.g., Extreme, Easy..."
                  value={newLookupName}
                  onChange={(e) => setNewLookupName(e.target.value)}
                  className="w-full border border-neutral-border rounded-lg px-2 py-1 text-xs text-neutral-text-dark bg-white"
                />
              </div>
              <div className="flex gap-2 items-center">
                <div className="space-y-1 flex-1">
                  <label className="text-[10px] uppercase font-bold text-neutral-text-muted block">HEX Color</label>
                  <div className="flex items-center gap-1 border border-neutral-border rounded-lg px-1.5 py-0.5 bg-white">
                    <input
                      type="color"
                      value={newLookupColor}
                      onChange={(e) => setNewLookupColor(e.target.value)}
                      className="w-5 h-5 rounded cursor-pointer border-0 p-0"
                    />
                    <input
                      type="text"
                      value={newLookupColor}
                      onChange={(e) => setNewLookupColor(e.target.value)}
                      className="w-full border-0 p-0 text-[10px] font-mono font-semibold uppercase text-neutral-text-dark"
                    />
                  </div>
                </div>
                <button
                  onClick={handleAddLookup}
                  className="p-1.5 bg-primary-teal hover:bg-primary-teal-hover text-white rounded-lg shadow-sm shrink-0 mt-4"
                  title="Addlookup"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* ESG Weights Config Card */}
          <div className="lg:col-span-5 bg-white border border-neutral-border rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-neutral-text-dark border-b border-neutral-border pb-3">
              Weighted ESG index Coefficient
            </h3>
            <p className="text-xs text-neutral-text-muted leading-relaxed">
              Define the percentage weights used to compute overall composite ratings indexes. Sum must represent exactly <strong>100%</strong>.
            </p>

            <div className="space-y-5.5 pt-2 font-semibold text-neutral-text-dark text-xs">
              {/* E Weight Slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-emerald-700 font-bold"><Palette size={14} /> Environmental (E)</span>
                  <span className="font-mono font-bold text-neutral-text-dark">{weights.e}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={weights.e}
                  onChange={(e) => setWeights({ ...weights, e: Number(e.target.value) })}
                  className="w-full accent-emerald-600 h-1 bg-neutral-bg border-0 rounded-lg cursor-pointer"
                />
              </div>

              {/* S Weight Slider */}
              <div className="space-y-1.5 border-t border-neutral-border/40 pt-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-teal-700 font-bold"><Palette size={14} /> Social Impact (S)</span>
                  <span className="font-mono font-bold text-neutral-text-dark">{weights.s}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={weights.s}
                  onChange={(e) => setWeights({ ...weights, s: Number(e.target.value) })}
                  className="w-full accent-teal-600 h-1 bg-neutral-bg border-0 rounded-lg cursor-pointer"
                />
              </div>

              {/* G Weight Slider */}
              <div className="space-y-1.5 border-t border-neutral-border/40 pt-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-indigo-700 font-bold"><Palette size={14} /> Governance Ethic (G)</span>
                  <span className="font-mono font-bold text-neutral-text-dark">{weights.g}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={weights.g}
                  onChange={(e) => setWeights({ ...weights, g: Number(e.target.value) })}
                  className="w-full accent-indigo-600 h-1 bg-neutral-bg border-0 rounded-lg cursor-pointer"
                />
              </div>

              {/* Live SUM Tracker banner */}
              <div className={`p-3 rounded-xl border text-center flex items-center justify-between gap-4 ${
                totalWeight === 100 ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-bold' : 'bg-red-50 border-red-200 text-red-800 font-extrabold'
              }`}>
                <div className="flex items-center gap-1.5 text-xs text-left">
                  {totalWeight === 100 ? <CheckCircle size={15} /> : <AlertTriangle size={15} className="animate-pulse" />}
                  <div>
                    <span className="block font-bold">Sum of Weights: {totalWeight}%</span>
                    <span className="text-[10px] font-normal text-neutral-text-muted">Must equal exactly 100% to save</span>
                  </div>
                </div>
                <button
                  onClick={handleSaveWeights}
                  disabled={totalWeight !== 100}
                  className={`px-3.5 py-1 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors ${
                    totalWeight === 100 ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer' : 'bg-neutral-border text-neutral-text-muted cursor-not-allowed'
                  }`}
                >
                  <Save size={13} /> Save Weights
                </button>
              </div>

            </div>
          </div>

        </div>
      )}

      {/* ---------------------------------
          TAB 3: WORKFLOW RULES (AUTOMATION RULES)
         --------------------------------- */}
      {activeTab === 'rules' && (
        <div className="bg-white border border-neutral-border rounded-xl p-5 shadow-sm space-y-4 animate-fade-in">
          <div className="border-b border-neutral-border pb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-neutral-text-dark">Workflow Approval & Notification triggers</h3>
            <span className="text-[10px] text-neutral-text-muted font-mono font-bold uppercase">Automated Pipeline</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-neutral-border text-neutral-text-muted bg-neutral-bg">
                  <th className="p-3 font-semibold">Event / Trigger Point</th>
                  <th className="p-3 font-semibold text-center">Approver Role</th>
                  <th className="p-3 font-semibold text-center">Notify Role</th>
                  <th className="p-3 font-semibold text-center">Dispatch Channel</th>
                  <th className="p-3 font-semibold text-center">Status</th>
                  <th className="p-3 font-semibold text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-border">
                {rules.map(rule => (
                  <tr key={rule.id} className="hover:bg-neutral-bg/30">
                    <td className="p-3 font-semibold text-neutral-text-dark">{rule.event}</td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 bg-neutral-bg text-neutral-text-dark font-bold rounded border border-neutral-border">
                        {rule.approverRole}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 bg-neutral-bg text-neutral-text-muted font-semibold rounded border border-neutral-border">
                        {rule.notifyRole}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex justify-center gap-1">
                        {rule.channels.map(ch => (
                          <span key={ch} className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[9px] font-extrabold rounded">
                            {ch}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleToggleRule(rule.id)}
                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          rule.enabled ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'
                        }`}
                      >
                        {rule.enabled ? 'Active Hook' : 'Suspended'}
                      </button>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleDeleteRule(rule.id)}
                        className="p-1 hover:bg-red-50 text-neutral-text-muted hover:text-red-600 rounded transition-colors animate-pulse"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Quick Add Rule Rule */}
          <div className="border-t border-neutral-border/50 pt-4 grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-neutral-text-muted">Trigger Event</label>
              <input
                type="text"
                value={newRuleEvent}
                onChange={(e) => setNewRuleEvent(e.target.value)}
                placeholder="e.g., Target breached"
                className="w-full border border-neutral-border rounded-lg px-2.5 py-1.5 text-xs text-neutral-text-dark bg-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-neutral-text-muted">Required Approver</label>
              <Select
                value={newRuleApprover}
                onValueChange={setNewRuleApprover}
              >
                <SelectTrigger className="h-8 rounded-lg px-2 text-xs shadow-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {rolesList.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-neutral-text-muted">Action notification</label>
              <Select
                value={newRuleNotify}
                onValueChange={setNewRuleNotify}
              >
                <SelectTrigger className="h-8 rounded-lg px-2 text-xs shadow-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {rolesList.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <button
              onClick={handleAddRule}
              className="px-4 py-2 bg-primary-teal hover:bg-primary-teal-hover text-white font-bold text-xs rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition-colors h-9"
            >
              <Plus size={14} /> Add Hook Rule
            </button>
          </div>
        </div>
      )}

      {/* ---------------------------------
          TAB 4: ROLES & PERMISSIONS MATRIX
         --------------------------------- */}
      {activeTab === 'permissions' && (
        <div className="bg-white border border-neutral-border rounded-xl p-5 shadow-sm space-y-4 animate-fade-in">
          <div className="border-b border-neutral-border pb-3">
            <h3 className="text-sm font-bold text-neutral-text-dark">Clearance Tier Permissions Matrix</h3>
            <p className="text-xs text-neutral-text-muted mt-1 leading-relaxed">
              Check authorization boxes to configure granular clearances across the platform roles.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-neutral-border text-neutral-text-muted bg-neutral-bg">
                  <th className="p-3 font-semibold w-1/4">Feature Authorization Scope</th>
                  {rolesList.map(role => (
                    <th key={role} className="p-3 font-semibold text-center">{role}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-border">
                {permissionsList.map(perm => (
                  <tr key={perm.key} className="hover:bg-neutral-bg/30">
                    <td className="p-3 font-bold text-neutral-text-dark">{perm.label}</td>
                    {rolesList.map(role => {
                      const isChecked = (matrix[role] || []).includes(perm.key);
                      return (
                        <td key={role} className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleMatrixToggle(role, perm.key)}
                            className="rounded border-neutral-border text-primary-teal focus:ring-primary-teal h-4 w-4 cursor-pointer"
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------------------------------
          TAB 5: SYSTEM AUDIT LOGS
         --------------------------------- */}
      {activeTab === 'audit' && (
        <div className="bg-white border border-neutral-border rounded-xl p-5 shadow-sm space-y-4 animate-fade-in">
          <div className="border-b border-neutral-border pb-3 flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-bold text-neutral-text-dark">Immutable System Audit Trail</h3>
              <p className="text-xs text-neutral-text-muted">Track all administrative, lookup changes, and workflow configurations</p>
            </div>
            <div className="relative w-full max-w-xs shrink-0">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-neutral-text-muted" />
              <input
                type="text"
                placeholder="Search audit trail logs..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1 border border-neutral-border rounded-lg text-xs bg-neutral-bg/30"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-neutral-border text-neutral-text-muted bg-neutral-bg">
                  <th className="p-3 font-semibold">Log ID</th>
                  <th className="p-3 font-semibold">Timestamp</th>
                  <th className="p-3 font-semibold">System Actor</th>
                  <th className="p-3 font-semibold">Action Event</th>
                  <th className="p-3 font-semibold">Entity Registry</th>
                  <th className="p-3 font-semibold">Action details description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-border text-neutral-text-dark">
                {filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-neutral-bg/30">
                    <td className="p-3 font-mono font-semibold text-neutral-text-dark">{log.id}</td>
                    <td className="p-3 font-mono text-neutral-text-muted">{log.timestamp}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        <img src={log.actor.avatar} alt={log.actor.name} className="w-5 h-5 rounded-full" />
                        <span className="font-semibold text-neutral-text-dark">{log.actor.name}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 bg-neutral-bg text-neutral-text-dark rounded border border-neutral-border font-bold">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-neutral-text-muted">{log.entity}</td>
                    <td className="p-3 text-neutral-text-muted">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
