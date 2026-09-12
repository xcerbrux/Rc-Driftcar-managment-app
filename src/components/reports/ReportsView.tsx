import React from 'react';
import { FileText, Download, Calendar, ArrowRight, BarChart3, Clock, CheckCircle2 } from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';

export function ReportsView() {
  const { showToast } = useNotification();

  const handleExportDummy = (reportName: string) => {
    showToast(`Generating ${reportName} export... CSV summary prepared.`, 'info');
  };

  const reportModules = [
    {
      title: 'Monthly P&L & Profitability Statement',
      desc: 'Synchronized revenue, actual product wholesale costs, and operating expenses breakdown.',
      status: 'Ready for export',
      ready: true,
    },
    {
      title: 'COD Remittance & Courier Reconciliation',
      desc: 'Pending vs. remitted cash collections categorized by delivery courier.',
      status: 'Ready for export',
      ready: true,
    },
    {
      title: 'Drift Chassis & Parts Sales Velocity',
      desc: 'Top-selling chassis, drift motors, tires, and body shells ranked by margin.',
      status: 'Coming in V1.2',
      ready: false,
    },
    {
      title: 'Inventory Valuation & Aging Report',
      desc: 'Current stock units on hand calculated at purchase cost vs expected retail yield.',
      status: 'Coming in V1.2',
      ready: false,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-zinc-900">Business Reports & Historical Records</h3>
            <p className="text-xs text-zinc-500 mt-1">
              Accurate financial auditing, order summaries, and exportable statements for tax and accounting.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500 font-medium flex items-center gap-1.5 bg-zinc-50 px-3 py-1.5 rounded-lg border border-zinc-200">
              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
              <span>Year to Date (2026)</span>
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reportModules.map((m, idx) => (
          <div
            key={idx}
            className="bg-white p-5 rounded-xl border border-zinc-200 shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-700">
                  <FileText className="w-4 h-4" />
                </div>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-md font-medium border ${
                    m.ready
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-zinc-100 text-zinc-600 border-zinc-200'
                  }`}
                >
                  {m.status}
                </span>
              </div>
              <h4 className="text-sm font-semibold text-zinc-900">{m.title}</h4>
              <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed">{m.desc}</p>
            </div>

            <div className="mt-5 pt-4 border-t border-zinc-100 flex items-center justify-between">
              <span className="text-[11px] text-zinc-400">CSV &bull; PDF format</span>
              <button
                onClick={() => handleExportDummy(m.title)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-50 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-zinc-500" />
                <span>Download Report</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
