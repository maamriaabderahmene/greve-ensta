import Link from 'next/link';
import { GraduationCap, UserPlus, LogIn, MapPin, ShieldAlert, Mail } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12 animate-fade-in">
          <GraduationCap className="w-20 h-20 mx-auto mb-4 text-white" />
          <h1 className="text-5xl font-bold text-white mb-4">
            Grève ENSTA Présence
          </h1>
          <p className="text-xl text-white/90">
            Modern geolocation-based attendance tracking
          </p>
        </div>

        {/* Important Notice */}
        <div className="max-w-3xl mx-auto mb-6 animate-fade-in">
          <div className="bg-yellow-50 border-2 border-yellow-400 rounded-xl p-4 shadow-lg">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-yellow-900 mb-1">Important Notice</h3>
                <p className="text-sm text-yellow-800">
                  <strong>Private/Incognito browsing is NOT allowed.</strong> This system requires IP address tracking 
                  for attendance verification. Please use normal browsing mode to mark attendance.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto animate-slide-up">
          {/* Student Attendance Card */}
          <Link href="/student/attendance">
            <div className="bg-white/95 backdrop-blur-lg rounded-2xl p-8 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105 cursor-pointer group">
              <div className="w-16 h-16 bg-gradient-to-br from-light-sea-green to-strong-cyan rounded-xl flex items-center justify-center mb-4 group-hover:rotate-6 transition-transform">
                <MapPin className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Mark Attendance
              </h2>
              <p className="text-gray-600">
                Check in using your location to record attendance
              </p>
            </div>
          </Link>

          {/* Admin Login Card */}
          <Link href="/login">
            <div className="bg-white/95 backdrop-blur-lg rounded-2xl p-8 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105 cursor-pointer group">
              <div className="w-16 h-16 bg-gradient-to-br from-pearl-aqua to-icy-aqua rounded-xl flex items-center justify-center mb-4 group-hover:rotate-6 transition-transform">
                <LogIn className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Admin Login
              </h2>
              <p className="text-gray-600">
                Access the admin dashboard to manage attendance
              </p>
            </div>
          </Link>
        </div>

        {/* Developer Contact */}
        <div className="text-center mt-12 animate-fade-in">
          <a 
            href="mailto:aa.maamria@ensta.edu.dz" 
            className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors group"
          >
            <Mail className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span className="text-sm">Developer: aa.maamria@ensta.edu.dz</span>
          </a>
        </div>
      </div>
    </div>
  );
}
