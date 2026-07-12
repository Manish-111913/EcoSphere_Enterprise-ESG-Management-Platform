import React, { useState } from 'react';
import { Search, X, Calendar, User as UserIcon, Check, ChevronDown } from 'lucide-react';

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  searchPlaceholder?: string;

  // Selected dropdown value
  selectedValue?: string;
  onSelectChange?: (val: string) => void;
  selectOptions?: { value: string; label: string }[];
  selectPlaceholder?: string;

  // Multi select chips
  selectedChips?: string[];
  onChipsChange?: (chips: string[]) => void;
  chipOptions?: { value: string; label: string }[];

  // Date range
  startDate?: string;
  endDate?: string;
  onDateRangeChange?: (start: string, end: string) => void;

  // User autocomplete
  users?: { id: string; name: string; avatar?: string }[];
  selectedUserId?: string | null;
  onUserSelect?: (userId: string | null) => void;

  onClearFilters: () => void;
}

export default function FilterBar({
  searchQuery,
  onSearchChange,
  searchPlaceholder = 'Search...',
  selectedValue,
  onSelectChange,
  selectOptions = [],
  selectPlaceholder = 'All options',
  selectedChips = [],
  onChipsChange,
  chipOptions = [],
  startDate = '',
  endDate = '',
  onDateRangeChange,
  users = [],
  selectedUserId = null,
  onUserSelect,
  onClearFilters
}: FilterBarProps) {
  const [userSearch, setUserSearch] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // Filter users based on input query
  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(userSearch.toLowerCase())
  );

  const handleChipToggle = (chipValue: string) => {
    if (!onChipsChange) return;
    if (selectedChips.includes(chipValue)) {
      onChipsChange(selectedChips.filter(c => c !== chipValue));
    } else {
      onChipsChange([...selectedChips, chipValue]);
    }
  };

  const selectedUserObj = users.find(u => u.id === selectedUserId);

  return (
    <div className="bg-white border border-neutral-border rounded-2xl p-5 shadow-sm space-y-4 text-left">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        
        {/* Composable Left side filters */}
        <div className="flex flex-wrap gap-3 items-center w-full md:w-auto">
          {/* 1. Search Input */}
          <div className="relative min-w-[200px] flex-grow md:flex-grow-0">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-neutral-text-muted" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-1.5 text-xs border border-neutral-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-teal focus:border-primary-teal bg-white font-medium"
            />
          </div>

          {/* 2. Select Dropdown */}
          {onSelectChange && selectOptions.length > 0 && (
            <div className="min-w-[150px] flex-grow md:flex-grow-0">
              <select
                value={selectedValue || ''}
                onChange={e => onSelectChange(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-neutral-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-teal focus:border-primary-teal bg-white font-semibold text-neutral-text-dark"
              >
                <option value="">{selectPlaceholder}</option>
                {selectOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* 3. User Autocomplete Autoselect */}
          {onUserSelect && users.length > 0 && (
            <div className="relative min-w-[180px] flex-grow md:flex-grow-0">
              {selectedUserObj ? (
                <div className="flex items-center justify-between px-3 py-1.5 border border-neutral-border rounded-xl bg-primary-teal/5 text-xs font-semibold text-neutral-text-dark">
                  <div className="flex items-center gap-2">
                    {selectedUserObj.avatar ? (
                      <img src={selectedUserObj.avatar} alt="" className="w-4 h-4 rounded-full object-cover" />
                    ) : (
                      <UserIcon className="w-3.5 h-3.5 text-primary-teal" />
                    )}
                    <span className="truncate">{selectedUserObj.name}</span>
                  </div>
                  <button
                    onClick={() => {
                      onUserSelect(null);
                      setUserSearch('');
                    }}
                    className="p-0.5 rounded hover:bg-neutral-bg"
                  >
                    <X className="w-3.5 h-3.5 text-neutral-text-muted hover:text-neutral-text-dark" />
                  </button>
                </div>
              ) : (
                <div>
                  <input
                    type="text"
                    placeholder="Assignee lookup..."
                    value={userSearch}
                    onChange={e => {
                      setUserSearch(e.target.value);
                      setShowUserDropdown(true);
                    }}
                    onFocus={() => setShowUserDropdown(true)}
                    className="w-full px-3 py-1.5 text-xs border border-neutral-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-teal focus:border-primary-teal bg-white font-semibold"
                  />
                  {showUserDropdown && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowUserDropdown(false)} />
                      <div className="absolute left-0 mt-1 w-full max-h-[160px] overflow-y-auto bg-white border border-neutral-border shadow-xl rounded-xl py-1 z-20 text-left">
                        {filteredUsers.length === 0 ? (
                          <div className="px-3 py-2 text-xs text-neutral-text-muted">No users found</div>
                        ) : (
                          filteredUsers.map(u => (
                            <button
                              key={u.id}
                              onClick={() => {
                                onUserSelect(u.id);
                                setShowUserDropdown(false);
                                setUserSearch('');
                              }}
                              className="w-full px-3 py-1.5 text-left text-xs hover:bg-neutral-bg flex items-center gap-2 font-bold"
                            >
                              {u.avatar ? (
                                <img src={u.avatar} alt="" className="w-4 h-4 rounded-full object-cover" />
                              ) : (
                                <UserIcon className="w-3.5 h-3.5 text-neutral-text-muted" />
                              )}
                              <span>{u.name}</span>
                            </button>
                          ))
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 4. Date Range Picker Inputs */}
          {onDateRangeChange && (
            <div className="flex items-center gap-1.5 flex-grow md:flex-grow-0">
              <div className="relative">
                <Calendar className="absolute left-3.5 top-2.5 h-3.5 w-3.5 text-neutral-text-muted" />
                <input
                  type="date"
                  value={startDate}
                  onChange={e => onDateRangeChange(e.target.value, endDate)}
                  className="pl-9 pr-2 py-1 border border-neutral-border rounded-xl text-xs bg-white font-medium focus:outline-none focus:ring-1 focus:ring-primary-teal"
                  title="Start Date"
                />
              </div>
              <span className="text-[10px] font-black text-neutral-text-muted uppercase">to</span>
              <div className="relative">
                <Calendar className="absolute left-3.5 top-2.5 h-3.5 w-3.5 text-neutral-text-muted" />
                <input
                  type="date"
                  value={endDate}
                  onChange={e => onDateRangeChange(startDate, e.target.value)}
                  className="pl-9 pr-2 py-1 border border-neutral-border rounded-xl text-xs bg-white font-medium focus:outline-none focus:ring-1 focus:ring-primary-teal"
                  title="End Date"
                />
              </div>
            </div>
          )}
        </div>

        {/* Clear filters Button */}
        <button
          onClick={onClearFilters}
          className="text-xs font-black uppercase tracking-wider text-neutral-text-muted hover:text-red-600 px-3 py-2 rounded-xl border border-neutral-border hover:border-red-200 hover:bg-red-50/50 transition shrink-0 w-full md:w-auto text-center"
        >
          Clear Filters
        </button>
      </div>

      {/* 5. Composable MultiSelect Chips Row */}
      {onChipsChange && chipOptions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-3 border-t border-neutral-border/50">
          <span className="text-[10px] font-black uppercase text-neutral-text-muted self-center mr-1.5">
            Quick Filter:
          </span>
          {chipOptions.map(chip => {
            const isSelected = selectedChips.includes(chip.value);
            return (
              <button
                key={chip.value}
                onClick={() => handleChipToggle(chip.value)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all border ${
                  isSelected
                    ? 'bg-primary-teal text-white border-primary-teal shadow-sm'
                    : 'bg-neutral-bg/40 text-neutral-text-dark border-neutral-border hover:bg-neutral-bg'
                }`}
              >
                {isSelected && <Check className="w-3 h-3" />}
                <span>{chip.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
