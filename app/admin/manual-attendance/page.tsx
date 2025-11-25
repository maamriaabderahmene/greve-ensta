'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserPlus, Home, Calendar, Clock, Mail, User, GraduationCap, BookOpen, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';
import { SPECIALTIES_CONFIG } from '@/lib/utils';
import { SESSION_TIMES } from '@/lib/sessionUtils';

export default function ManualAttendancePage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    specialty: '' as 'MI' | 'ST' | '',
    major: '',
    date: new Date().toISOString().split('T')[0],
    session: 'session1' as 'session1' | 'session2' | 'session3' | 'session4'
  });

  const availableMajors = formData.specialty 
    ? SPECIALTIES_CONFIG[formData.specialty].majors 
    : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.specialty || !formData.major || !formData.date || !formData.session) {
      showToast('error', 'Please fill in all fields');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/admin/manual-attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add attendance');
      }

      showToast('success', 'Attendance added successfully!');
      setFormData({
        name: '',
        email: '',
        specialty: '',
        major: '',
        date: new Date().toISOString().split('T')[0],
        session: 'session1'
      });
    } catch (error: any) {
      showToast('error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-bg p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Link 
            href="/admin/dashboard"
            className="inline-flex items-center gap-2 text-white/90 hover:text-white transition-colors"
          >
            <Home className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>

        <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl p-8 animate-slide-up">
          <div className="flex items-center justify-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <UserPlus className="w-8 h-8 text-white" />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">
            Add Manual Attendance
          </h1>
          <p className="text-center text-gray-600 mb-8">
            Manually add attendance for a student (bypasses location and IP checks)
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Date Selection */}
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-2" />
                Date
              </label>
              <input
                id="date"
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
              />
            </div>

            {/* Session Selection */}
            <div>
              <label htmlFor="session" className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="w-4 h-4 inline mr-2" />
                Attendance Session
              </label>
              <select
                id="session"
                required
                value={formData.session}
                onChange={(e) => setFormData({ ...formData, session: e.target.value as any })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
              >
                <option value="session1">{SESSION_TIMES.session1.label}</option>
                <option value="session2">{SESSION_TIMES.session2.label}</option>
                <option value="session3">{SESSION_TIMES.session3.label}</option>
                <option value="session4">{SESSION_TIMES.session4.label}</option>
              </select>
            </div>

            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4 inline mr-2" />
                Full Name
              </label>
              <input
                id="name"
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                placeholder="Enter student name"
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                <Mail className="w-4 h-4 inline mr-2" />
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                placeholder="student@ensta.edu.dz"
              />
            </div>

            {/* Specialty */}
            <div>
              <label htmlFor="specialty" className="block text-sm font-medium text-gray-700 mb-2">
                <GraduationCap className="w-4 h-4 inline mr-2" />
                Specialty
              </label>
              <select
                id="specialty"
                required
                value={formData.specialty}
                onChange={(e) => {
                  setFormData({ 
                    ...formData, 
                    specialty: e.target.value as 'MI' | 'ST',
                    major: '' // Reset major when specialty changes
                  });
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
              >
                <option value="">Select specialty...</option>
                <option value="MI">MI - {SPECIALTIES_CONFIG.MI.label}</option>
                <option value="ST">ST - {SPECIALTIES_CONFIG.ST.label}</option>
              </select>
            </div>

            {/* Major */}
            {formData.specialty && (
              <div>
                <label htmlFor="major" className="block text-sm font-medium text-gray-700 mb-2">
                  <BookOpen className="w-4 h-4 inline mr-2" />
                  Major
                </label>
                <select
                  id="major"
                  required
                  value={formData.major}
                  onChange={(e) => setFormData({ ...formData, major: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                >
                  <option value="">Select major...</option>
                  {availableMajors.map((major) => (
                    <option key={major} value={major}>
                      {major}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Adding Attendance...
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  Add Attendance
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
