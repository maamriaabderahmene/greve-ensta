'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Users, 
  CheckCircle, 
  Calendar,
  Download,
  Filter,
  Search,
  MapPin,
  TrendingUp,
  Loader2
} from 'lucide-react';
import { SPECIALTIES_CONFIG, formatDate } from '@/lib/utils';
import { SESSION_TIMES } from '@/lib/sessionUtils';
import type { AttendanceSession } from '@/models/Student';

interface AttendanceRecord {
  date: Date;
  session: AttendanceSession;
  location: { lat: number; lng: number };
  verified: boolean;
  distance: number;
  _id: string;
  addedByAdmin?: boolean;
}

interface Student {
  _id: string;
  name: string;
  email: string;
  specialty: 'MI' | 'ST';
  major: string;
  attendanceRecords: AttendanceRecord[];
  createdAt: Date;
}

export default function AdminDashboardPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    specialty: '',
    major: '',
    search: '',
    dateFrom: '',
    dateTo: '',
    session: '' as '' | AttendanceSession
  });

  // Calculate stats including unique daily attendance
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const uniqueEmailsToday = new Set<string>();
  students.forEach(s => {
    const hasAttendedToday = s.attendanceRecords.some(r => {
      const recordDate = new Date(r.date);
      recordDate.setHours(0, 0, 0, 0);
      return recordDate.getTime() === today.getTime();
    });
    if (hasAttendedToday) {
      uniqueEmailsToday.add(s.email);
    }
  });

  const stats = {
    totalStudents: students.length,
    totalAttendance: students.reduce((sum, s) => sum + s.attendanceRecords.length, 0),
    verifiedAttendance: students.reduce(
      (sum, s) => sum + s.attendanceRecords.filter(r => r.verified).length, 
      0
    ),
    todayAttendance: students.reduce((sum, s) => {
      return sum + s.attendanceRecords.filter(r => {
        const recordDate = new Date(r.date);
        recordDate.setHours(0, 0, 0, 0);
        return recordDate.getTime() === today.getTime();
      }).length;
    }, 0),
    uniqueAttendedToday: uniqueEmailsToday.size
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [students, filters]);

  const fetchStudents = async () => {
    try {
      const response = await fetch('/api/students');
      const data = await response.json();
      setStudents(data.students || []);
    } catch (error) {
      console.error('Failed to fetch students:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...students];

    // Specialty filter
    if (filters.specialty) {
      filtered = filtered.filter(s => s.specialty === filters.specialty);
    }

    // Major filter
    if (filters.major) {
      filtered = filtered.filter(s => s.major === filters.major);
    }

    // Search filter
    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(
        s => s.name.toLowerCase().includes(search) || 
             s.email.toLowerCase().includes(search)
      );
    }

    // Session filter
    if (filters.session) {
      filtered = filtered.map(student => ({
        ...student,
        attendanceRecords: student.attendanceRecords.filter(record => 
          record.session === filters.session
        )
      }));
    }

    // Date range filter for attendance
    if (filters.dateFrom || filters.dateTo) {
      filtered = filtered.map(student => ({
        ...student,
        attendanceRecords: student.attendanceRecords.filter(record => {
          const recordDate = new Date(record.date);
          const fromDate = filters.dateFrom ? new Date(filters.dateFrom) : null;
          const toDate = filters.dateTo ? new Date(filters.dateTo) : null;
          
          if (fromDate && recordDate < fromDate) return false;
          if (toDate && recordDate > toDate) return false;
          return true;
        })
      }));
    }

    setFilteredStudents(filtered);
  };

  const exportToCSV = async () => {
    try {
      const response = await fetch('/api/admin/export');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const availableMajors = filters.specialty 
    ? SPECIALTIES_CONFIG[filters.specialty as 'MI' | 'ST'].majors 
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Students</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalStudents}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Attendance</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalAttendance}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Today's Sessions</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.todayAttendance}</p>
            </div>
            <div className="w-12 h-12 bg-strong-cyan/20 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-strong-cyan" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Unique Today</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.uniqueAttendedToday}</p>
              <p className="text-xs text-gray-500 mt-1">Total students attended</p>
            </div>
            <div className="w-12 h-12 bg-light-sea-green/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-light-sea-green" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-8 border border-gray-200">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
          <div className="flex gap-3 flex-wrap">
            <Link
              href="/admin/manual-attendance"
              className="inline-flex items-center gap-2 px-4 py-2 bg-light-sea-green text-white rounded-lg hover:bg-light-sea-green-600 transition-colors"
            >
              <Users className="w-4 h-4" />
              Add Manual Attendance
            </Link>
            <Link
              href="/admin/locations"
              className="inline-flex items-center gap-2 px-4 py-2 bg-strong-cyan text-white rounded-lg hover:bg-strong-cyan-600 transition-colors"
            >
              <MapPin className="w-4 h-4" />
              Manage Locations
            </Link>
            <button
              onClick={exportToCSV}
              className="inline-flex items-center gap-2 px-4 py-2 bg-pearl-aqua text-white rounded-lg hover:bg-pearl-aqua-600 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-8 border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Name or email..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-light-sea-green focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label htmlFor="session-filter" className="block text-sm font-medium text-gray-700 mb-2">
              Session
            </label>
            <select
              id="session-filter"
              value={filters.session}
              onChange={(e) => setFilters({ ...filters, session: e.target.value as any })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-light-sea-green focus:border-transparent"
            >
              <option value="">All Sessions</option>
              <option value="session1">{SESSION_TIMES.session1.label}</option>
              <option value="session2">{SESSION_TIMES.session2.label}</option>
              <option value="session3">{SESSION_TIMES.session3.label}</option>
              <option value="session4">{SESSION_TIMES.session4.label}</option>
            </select>
          </div>

          <div>
            <label htmlFor="specialty-filter" className="block text-sm font-medium text-gray-700 mb-2">
              Specialty
            </label>
            <select
              id="specialty-filter"
              value={filters.specialty}
              onChange={(e) => setFilters({ ...filters, specialty: e.target.value, major: '' })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-light-sea-green focus:border-transparent"
            >
              <option value="">All Specialties</option>
              <option value="MI">MI</option>
              <option value="ST">ST</option>
            </select>
          </div>

          <div>
            <label htmlFor="major-filter" className="block text-sm font-medium text-gray-700 mb-2">
              Major
            </label>
            <select
              id="major-filter"
              value={filters.major}
              onChange={(e) => setFilters({ ...filters, major: e.target.value })}
              disabled={!filters.specialty}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-light-sea-green focus:border-transparent disabled:opacity-50"
            >
              <option value="">All Majors</option>
              {availableMajors.map(major => (
                <option key={major} value={major}>{major}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="date-from" className="block text-sm font-medium text-gray-700 mb-2">
              Date From
            </label>
            <input
              id="date-from"
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-light-sea-green focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="date-to" className="block text-sm font-medium text-gray-700 mb-2">
              Date To
            </label>
            <input
              id="date-to"
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-light-sea-green focus:border-transparent"
            />
          </div>
        </div>

        <button
          onClick={() => setFilters({ specialty: '', major: '', search: '', dateFrom: '', dateTo: '', session: '' })}
          className="mt-4 text-sm text-light-sea-green hover:text-light-sea-green-600 font-medium"
        >
          Clear All Filters
        </button>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Students ({filteredStudents.length})
          </h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Specialty
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Major
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Attendance Count
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Attendance
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredStudents.map((student) => (
                <tr key={student._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{student.name}</div>
                      <div className="text-sm text-gray-500">{student.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                      {student.specialty}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {student.major}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-gray-900">
                        {student.attendanceRecords.length}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {student.attendanceRecords.length > 0
                      ? formatDate(student.attendanceRecords[student.attendanceRecords.length - 1].date)
                      : 'No attendance'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredStudents.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No students found</p>
          </div>
        )}
      </div>
    </div>
  );
}
