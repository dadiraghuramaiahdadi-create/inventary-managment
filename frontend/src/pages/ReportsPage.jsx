import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  FileSpreadsheet, 
  DollarSign, 
  AlertTriangle, 
  History, 
  Truck, 
  CheckCircle2 
} from 'lucide-react';
import { dashboardApi, reportApi } from '../services/api';

const ReportsPage = () => {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    dashboardApi.getSummary().then((res) => setSummary(res.data)).catch(() => {});
  }, []);

  const reportItems = [
    {
      title: 'Inventory Valuation Report',
      description: 'Comprehensive financial audit breakdown of on-hand inventory, cost prices, retail values, and asset distribution.',
      badge: 'Official Audit Document',
      icon: DollarSign,
      color: 'indigo',
      pdfUrl: reportApi.exportValuationPdfUrl,
      csvUrl: reportApi.exportProductsCsvUrl,
      stat: `$${summary?.totalCostValue?.toLocaleString() || '0.00'} Total Value`,
    },
    {
      title: 'Historical Stock Movements Ledger',
      description: 'Granular log of every inbound receipt, outbound sales fulfillment, scan adjust, and transfer transaction.',
      badge: 'Operational History',
      icon: History,
      color: 'teal',
      csvUrl: reportApi.exportActivityCsvUrl,
      stat: 'Complete 90-Day Audit Log',
    },
    {
      title: 'Low-Stock & Deficit Analysis',
      description: 'Detailed list of critical products at or below statistical reorder levels with calculated deficit units and reorder costs.',
      badge: 'Reorder Priority',
      icon: AlertTriangle,
      color: 'amber',
      csvUrl: reportApi.exportLowStockCsvUrl,
      stat: `${summary?.lowStockCount || 0} Critical SKUs`,
    },
    {
      title: 'Product Master Catalog Export',
      description: 'Complete data dump of SKU identifiers, active barcodes, suppliers, units of measurement, and categories.',
      badge: 'Master Catalog',
      icon: FileSpreadsheet,
      color: 'purple',
      csvUrl: reportApi.exportProductsCsvUrl,
      stat: `${summary?.totalProducts || 0} Registered SKUs`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
          <FileText className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
          Reports & Data Exports
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Export institutional reports in OpenPDF format and raw CSV spreadsheets for executive reporting.
        </p>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reportItems.map((rep, idx) => {
          const Icon = rep.icon;
          return (
            <div
              key={idx}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between hover:shadow-md transition-shadow"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-full uppercase bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                    {rep.badge}
                  </span>
                </div>

                <h3 className="font-extrabold text-base text-slate-900 dark:text-white mb-2">
                  {rep.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                  {rep.description}
                </p>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 mb-6">
                  {rep.stat}
                </div>
              </div>

              {/* Download Buttons */}
              <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                {rep.pdfUrl && (
                  <a
                    href={rep.pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 px-4 text-xs font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 transition-all active:scale-95"
                  >
                    <Download className="h-3.5 w-3.5" /> Download PDF Report
                  </a>
                )}
                {rep.csvUrl && (
                  <a
                    href={rep.csvUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors shadow-sm"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5" /> Export CSV
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ReportsPage;
