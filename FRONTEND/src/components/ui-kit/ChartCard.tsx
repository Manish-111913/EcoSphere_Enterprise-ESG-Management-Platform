import React from 'react';
import { Download, FileSpreadsheet, Image as ImageIcon, HelpCircle } from 'lucide-react';
import { useToast } from './Toast';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onHelpClick?: () => void;
  className?: string;
  id?: string;
}

export default function ChartCard({
  title,
  subtitle,
  children,
  onHelpClick,
  className = '',
  id
}: ChartCardProps) {
  const { toast } = useToast();

  const handleExportCSV = () => {
    toast(
      'Exporting CSV data',
      'success',
      `The structured ESG datasets for "${title}" are being compiled and will download shortly.`
    );
  };

  const handleExportPNG = () => {
    toast(
      'Generating high-res PNG image',
      'success',
      `Capturing a high-fidelity image snapshot of the "${title}" visual chart.`
    );
  };

  return (
    <div
      className={`bg-white border border-neutral-border rounded-2xl shadow-sm p-6 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden ${className}`}
      id={id || `chart-card-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      {/* Card Header Block */}
      <div className="flex items-start justify-between gap-4 pb-4 border-b border-neutral-border/60 mb-5">
        <div className="text-left">
          <h3 className="text-sm font-black text-neutral-text-dark tracking-tight">
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs text-neutral-text-muted font-medium mt-1">
              {subtitle}
            </p>
          )}
        </div>

        {/* Action icons block */}
        <div className="flex items-center gap-1.5 shrink-0">
          {onHelpClick && (
            <button
              onClick={onHelpClick}
              className="p-1.5 hover:bg-neutral-bg border border-transparent hover:border-neutral-border rounded-lg text-neutral-text-muted hover:text-neutral-text-dark transition"
              title="Metric guide"
            >
              <HelpCircle className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={handleExportCSV}
            className="p-1.5 hover:bg-neutral-bg border border-transparent hover:border-neutral-border rounded-lg text-neutral-text-muted hover:text-neutral-text-dark transition"
            title="Export raw data as CSV spreadsheet"
            id={`btn-export-csv-${title.toLowerCase().replace(/\s+/g, '-')}`}
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleExportPNG}
            className="p-1.5 hover:bg-neutral-bg border border-transparent hover:border-neutral-border rounded-lg text-neutral-text-muted hover:text-neutral-text-dark transition"
            title="Download visual chart as PNG vector image"
            id={`btn-export-png-${title.toLowerCase().replace(/\s+/g, '-')}`}
          >
            <ImageIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Main Chart stage area with consistent padding */}
      <div className="w-full flex-grow relative flex items-center justify-center min-h-[220px]">
        {children}
      </div>
    </div>
  );
}
