import { LookupData } from '../types';

export const mockLookups: LookupData = {
  severities: [
    { value: 'Critical', label: 'Critical', color: 'bg-red-500 text-white' },
    { value: 'High', label: 'High', color: 'bg-orange-500 text-white' },
    { value: 'Medium', label: 'Medium', color: 'bg-yellow-500 text-black' },
    { value: 'Low', label: 'Low', color: 'bg-gray-400 text-white' },
  ],
  challengeStatuses: [
    { value: 'Draft', label: 'Draft', color: 'bg-gray-100 text-gray-800' },
    { value: 'Active', label: 'Active', color: 'bg-emerald-100 text-emerald-800' },
    { value: 'Under Review', label: 'Under Review', color: 'bg-amber-100 text-amber-800' },
    { value: 'Completed', label: 'Completed', color: 'bg-blue-100 text-blue-800' },
    { value: 'Archived', label: 'Archived', color: 'bg-gray-200 text-gray-500' },
  ],
  complianceStatuses: [
    { value: 'Open', label: 'Open', color: 'bg-red-100 text-red-800' },
    { value: 'In Progress', label: 'In Progress', color: 'bg-amber-100 text-amber-800' },
    { value: 'Resolved', label: 'Resolved', color: 'bg-emerald-100 text-emerald-800' },
    { value: 'Closed', label: 'Closed', color: 'bg-gray-100 text-gray-800' },
  ],
  difficulties: [
    { value: 'Easy', label: 'Easy' },
    { value: 'Medium', label: 'Medium' },
    { value: 'Hard', label: 'Hard' },
  ],
  emissionUnits: [
    'kg CO2e/kWh',
    'kg CO2e/liter',
    'kg CO2e/km',
    'kg CO2e/kg',
    'metric tons CO2e'
  ],
  categories: {
    environmental: [
      'Scope 1 - Direct Emissions',
      'Scope 2 - Indirect Emissions',
      'Scope 3 - Value Chain'
    ],
    social: [
      'Community Engagement',
      'Employee Wellbeing',
      'Diversity & Inclusion',
      'Skills & Education'
    ],
    governance: [
      'Policy Compliance',
      'Code of Conduct',
      'Regulatory Filing',
      'Security Audit'
    ]
  },
  departments: [
    'Operations',
    'Human Resources',
    'Engineering',
    'Logistics',
    'Legal & Compliance',
    'Procurement'
  ]
};
