'use client';

import { useState, useEffect } from 'react';
import { Power, PowerOff, Loader2, Clock } from 'lucide-react';
import { SESSION_TIMES } from '@/lib/sessionUtils';
import type { AttendanceSession } from '@/models/Student';

interface SessionStatus {
  session: AttendanceSession;
  isEnabled: boolean;
  updatedBy?: string;
  updatedAt?: Date;
}

export default function SessionControlPanel() {
  const [sessions, setSessions] = useState<SessionStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchSessionStatuses();
  }, []);

  const fetchSessionStatuses = async () => {
    try {
      const response = await fetch('/api/admin/session-control');
      const data = await response.json();
      setSessions(data.sessions || []);
    } catch (error) {
      console.error('Failed to fetch session statuses:', error);
      showMessage('error', 'Failed to load session statuses');
    } finally {
      setLoading(false);
    }
  };

  const toggleSession = async (session: AttendanceSession, currentStatus: boolean) => {
    setUpdating(session);
    try {
      const response = await fetch('/api/admin/session-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session,
          isEnabled: !currentStatus
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update session');
      }

      // Update local state
      setSessions(prev => prev.map(s => 
        s.session === session 
          ? { ...s, isEnabled: !currentStatus, updatedAt: new Date() }
          : s
      ));

      showMessage(
        'success', 
        `${SESSION_TIMES[session].label} ${!currentStatus ? 'enabled' : 'disabled'} successfully`
      );
    } catch (error) {
      console.error('Failed to toggle session:', error);
      showMessage('error', error instanceof Error ? error.message : 'Failed to update session');
    } finally {
      setUpdating(null);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 mb-8 border border-gray-200">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-light-sea-green" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 mb-8 border border-gray-200">
      <div className="flex items-center gap-2 mb-6">
        <Clock className="w-5 h-5 text-gray-600" />
        <h2 className="text-lg font-semibold text-gray-900">Session Control</h2>
        <span className="ml-auto text-sm text-gray-500">Enable or disable attendance marking for each session</span>
      </div>

      {message && (
        <div className={`mb-4 p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {(Object.keys(SESSION_TIMES) as AttendanceSession[]).map((sessionKey) => {
          const sessionStatus = sessions.find(s => s.session === sessionKey);
          const isEnabled = sessionStatus?.isEnabled ?? true;
          const isUpdating = updating === sessionKey;

          return (
            <div
              key={sessionKey}
              className={`relative overflow-hidden rounded-lg border-2 transition-all ${
                isEnabled 
                  ? 'border-light-sea-green bg-light-sea-green/5' 
                  : 'border-gray-300 bg-gray-50'
              }`}
            >
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 text-sm mb-1">
                      {SESSION_TIMES[sessionKey].label}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {sessionKey.replace('session', 'Session ')}
                    </p>
                  </div>
                  {isEnabled ? (
                    <Power className="w-5 h-5 text-light-sea-green" />
                  ) : (
                    <PowerOff className="w-5 h-5 text-gray-400" />
                  )}
                </div>

                <button
                  onClick={() => toggleSession(sessionKey, isEnabled)}
                  disabled={isUpdating}
                  className={`w-full py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                    isEnabled
                      ? 'bg-light-sea-green text-white hover:bg-light-sea-green-600'
                      : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      {isEnabled ? (
                        <>
                          <PowerOff className="w-4 h-4" />
                          Disable
                        </>
                      ) : (
                        <>
                          <Power className="w-4 h-4" />
                          Enable
                        </>
                      )}
                    </>
                  )}
                </button>

                <div className={`mt-3 pt-3 border-t ${
                  isEnabled ? 'border-light-sea-green/20' : 'border-gray-200'
                }`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      isEnabled ? 'bg-light-sea-green animate-pulse' : 'bg-gray-400'
                    }`} />
                    <span className={`text-xs font-medium ${
                      isEnabled ? 'text-light-sea-green' : 'text-gray-500'
                    }`}>
                      {isEnabled ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Visual indicator bar */}
              <div className={`h-1 w-full transition-all ${
                isEnabled ? 'bg-light-sea-green' : 'bg-gray-300'
              }`} />
            </div>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-icy-aqua/10 rounded-lg border border-icy-aqua/30">
        <p className="text-sm text-gray-700">
          <strong>Note:</strong> When a session is disabled, students will not be able to mark attendance during that time period. 
          Manual attendance additions by admins are still allowed.
        </p>
      </div>
    </div>
  );
}
