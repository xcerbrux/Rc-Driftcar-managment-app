import React, { useState, useEffect } from 'react';
import { Database, ShieldCheck, User, ShieldAlert, History, CheckCircle2, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { subscribeAuditLogs } from '../../services/firestoreService';
import { AuditLog } from '../../types';
import { formatDateTime } from '../../utils/formatters';
import firebaseConfig from '../../../firebase-applet-config.json';

export function SettingsView() {
  const { currentUser, userProfile, dbConnected } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    const unsub = subscribeAuditLogs(setLogs);
    return () => unsub();
  }, []);

  return (
    <div className="space-y-6">
      {/* Business & Staff Identity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* User Account */}
        <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4">
            <User className="w-3.5 h-3.5" />
            <span>Staff Account Profile</span>
          </div>
          <div className="flex items-center gap-3">
            {currentUser?.photoURL ? (
              <img
                src={currentUser.photoURL}
                alt="Profile"
                className="w-12 h-12 rounded-full object-cover border border-zinc-200"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-zinc-900 text-white flex items-center justify-center font-bold text-base">
                {(currentUser?.displayName || currentUser?.email || 'S')[0].toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-zinc-900">{currentUser?.displayName || 'Staff Member'}</p>
              <p className="text-xs text-zinc-500">{currentUser?.email}</p>
              <span className="inline-block mt-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 border border-zinc-200 capitalize">
                Role: {userProfile?.role || 'Staff'}
              </span>
            </div>
          </div>
        </div>

        {/* Database & Infrastructure */}
        <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4">
            <Database className="w-3.5 h-3.5" />
            <span>Database & Cloud Architecture</span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 border border-zinc-100">
              <span className="text-zinc-500">Firebase Project:</span>
              <span className="font-mono font-medium text-zinc-800">{firebaseConfig.projectId}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 border border-zinc-100">
              <span className="text-zinc-500">Firestore Database ID:</span>
              <span className="font-mono font-medium text-zinc-800 truncate max-w-[200px]" title={firebaseConfig.firestoreDatabaseId}>
                {firebaseConfig.firestoreDatabaseId}
              </span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 border border-zinc-100">
              <span className="text-zinc-500">Connection Health:</span>
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {dbConnected ? 'Online & Synchronized' : 'Connecting'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Audit & Activity Log Section */}
      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-zinc-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-zinc-500" />
            <h3 className="text-sm font-semibold text-zinc-900">Audit & Traceability Log</h3>
          </div>
          <span className="text-xs text-zinc-500 font-mono">{logs.length} logged actions</span>
        </div>

        <div className="divide-y divide-zinc-100">
          {logs.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-500">
              <Clock className="w-6 h-6 text-zinc-300 mx-auto mb-2" />
              <p className="font-medium text-zinc-700">No activity logged yet</p>
              <p className="text-zinc-400 mt-0.5">
                Every sale creation, stock adjustment, and expense entry is automatically recorded here for complete transparency.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 text-zinc-500 font-medium border-b border-zinc-200">
                  <tr>
                    <th className="px-4 py-2.5">Action</th>
                    <th className="px-4 py-2.5">Entity</th>
                    <th className="px-4 py-2.5">Summary Details</th>
                    <th className="px-4 py-2.5">Staff Actor</th>
                    <th className="px-4 py-2.5 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-zinc-50/70 transition-colors font-mono">
                      <td className="px-4 py-2.5">
                        <span className="px-2 py-0.5 rounded-sm bg-zinc-100 text-zinc-800 font-medium text-[11px]">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 uppercase text-zinc-600 text-[11px] font-sans">
                        {log.entityType}
                      </td>
                      <td className="px-4 py-2.5 text-zinc-800 font-sans max-w-sm truncate">
                        {log.summary}
                      </td>
                      <td className="px-4 py-2.5 text-zinc-500 text-[11px]">
                        {log.performedByEmail || log.performedByUid.slice(0, 8)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-zinc-400 text-[11px]">
                        {formatDateTime(log.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
