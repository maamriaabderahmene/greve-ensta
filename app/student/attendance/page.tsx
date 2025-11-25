'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  MapPin, 
  Loader2, 
  CheckCircle, 
  Navigation, 
  Home,
  Lock,
  Unlock,
  User,
  Mail,
  GraduationCap,
  BookOpen,
  ShieldAlert,
  AlertTriangle
} from 'lucide-react';
import { useToast } from '@/components/ToastProvider';
import { SPECIALTIES_CONFIG } from '@/lib/utils';
import { detectPrivateBrowsing } from '@/lib/aggressivePrivateDetection';
import { canDetectIP, getClientIP } from '@/lib/privateDetection';
import { getCurrentSession, getSessionLabel, isWithinAttendanceHours, generateDeviceFingerprint, detectVPN } from '@/lib/sessionUtils';

export default function StudentAttendancePage() {
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    specialty: '' as 'MI' | 'ST' | '',
    major: ''
  });
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [isPrivateMode, setIsPrivateMode] = useState<boolean | null>(null);
  const [ipVerified, setIpVerified] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);
  const [clientIP, setClientIP] = useState<string | null>(null);
  const [deviceFingerprint, setDeviceFingerprint] = useState<string | null>(null);
  const [isVPN, setIsVPN] = useState<boolean>(false);
  const [currentSession, setCurrentSession] = useState<any>(null);

  const availableMajors = formData.specialty 
    ? SPECIALTIES_CONFIG[formData.specialty].majors 
    : [];

  useEffect(() => {
    // Check private browsing and IP verification
    const checkBrowserAndIP = async () => {
      setChecking(true);

      // Check if within attendance hours
      if (!isWithinAttendanceHours()) {
        showToast('error', 'Attendance can only be marked during authorized hours (8:00 AM - End of Day).');
        setChecking(false);
        return;
      }

      // Get current session
      const session = getCurrentSession();
      if (!session) {
        showToast('error', 'No active attendance session at this time.');
        setChecking(false);
        return;
      }
      setCurrentSession(session);
      console.log('Current session:', session, getSessionLabel(session));

      console.log('Starting AGGRESSIVE private browsing detection...');

      // AGGRESSIVE Check if private browsing (CLIENT-SIDE)
      const isPrivate = await detectPrivateBrowsing();
      console.log('=== FINAL DETECTION RESULT:', isPrivate ? 'PRIVATE MODE ❌' : 'NORMAL MODE ✅');
      setIsPrivateMode(isPrivate);

      if (isPrivate) {
        showToast('error', 'Private/Incognito browsing detected! Please use normal browsing mode.');
        setChecking(false);
        return;
      }

      // Check for VPN
      console.log('Checking for VPN usage...');
      const vpnDetected = await detectVPN();
      setIsVPN(vpnDetected);
      if (vpnDetected) {
        showToast('error', 'VPN usage detected! Please disable your VPN to mark attendance.');
        setChecking(false);
        return;
      }
      console.log('VPN check passed ✅');

      // Generate device fingerprint
      const fingerprint = generateDeviceFingerprint();
      setDeviceFingerprint(fingerprint);
      console.log('Device fingerprint generated ✅');

      // Additional server-side check
      try {
        const serverCheckResponse = await fetch('/api/check-private', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });

        if (serverCheckResponse.ok) {
          const serverCheckData = await serverCheckResponse.json();
          console.log('Server-side private check:', serverCheckData);
          
          if (serverCheckData.isPrivate && serverCheckData.confidence === 'high') {
            console.log('Server detected private mode!');
            setIsPrivateMode(true);
            showToast('error', 'Private/Incognito browsing detected by server! Please use normal browsing mode.');
            setChecking(false);
            return;
          }
        }
      } catch (e) {
        console.warn('Server-side check failed, continuing with client-side only');
      }

      // Check if we can detect IP
      const canDetect = await canDetectIP();
      if (!canDetect) {
        showToast('error', 'Cannot detect IP address. Please disable VPN or use a different browser.');
        setChecking(false);
        return;
      }

      // Get client IP
      const ip = await getClientIP();
      setClientIP(ip);

      if (!ip) {
        showToast('error', 'Failed to detect your IP address. Private browsing may be blocking detection.');
        setChecking(false);
        return;
      }

      // Register IP in database
      try {
        const registerResponse = await fetch('/api/register-ip', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userAgent: navigator.userAgent
          })
        });

        const registerData = await registerResponse.json();

        if (!registerResponse.ok) {
          throw new Error(registerData.error || 'Failed to register IP');
        }

        // Verify IP exists in database
        const verifyResponse = await fetch('/api/register-ip', {
          method: 'GET'
        });

        const verifyData = await verifyResponse.json();

        if (!verifyResponse.ok || !verifyData.exists) {
          throw new Error('IP verification failed');
        }

        setIpVerified(true);
        showToast('success', registerData.firstVisit 
          ? 'IP registered successfully! You can now mark attendance.' 
          : 'IP verified! Welcome back.');
      } catch (error: any) {
        showToast('error', error.message || 'Failed to verify IP address');
        setIpVerified(false);
      } finally {
        setChecking(false);
      }
    };

    checkBrowserAndIP();
    
    // Re-check every 3 seconds to catch if user switches to incognito while on page
    const intervalId = setInterval(async () => {
      const isPrivate = await detectPrivateBrowsing();
      if (isPrivate && !isPrivateMode) {
        console.log('=== PRIVATE MODE DETECTED DURING INTERVAL CHECK! ===');
        setIsPrivateMode(true);
        showToast('error', 'Private browsing detected! Please reload in normal mode.');
      }
    }, 3000);

    return () => clearInterval(intervalId);

    // Check location permission status
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        setLocationPermission(result.state as 'granted' | 'denied' | 'prompt');
      });
    }
  }, []);

  const getLocation = () => {
    setLocationLoading(true);

    if (!navigator.geolocation) {
      showToast('error', 'Geolocation is not supported by your browser');
      setLocationLoading(false);
      return;
    }

    // iOS Safari requires a direct user interaction to trigger location prompt
    // This must be called from a user-initiated event (like button click)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        });
        setLocationPermission('granted');
        setLocationLoading(false);
        showToast('success', 'Location captured successfully!');
      },
      (err) => {
        console.error('Geolocation error:', err);
        let errorMessage = 'Please enable location access in your browser settings.';
        
        if (err.code === err.PERMISSION_DENIED) {
          errorMessage = 'Location access denied. Please enable location in Settings > Safari > Location Services.';
        } else if (err.code === err.TIMEOUT) {
          errorMessage = 'Location request timed out. Please try again.';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          errorMessage = 'Location information unavailable. Please check your device settings.';
        }
        
        showToast('error', errorMessage);
        setLocationPermission('denied');
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();

    // CRITICAL: Re-check private browsing before submission
    console.log('=== RE-CHECKING PRIVATE MODE BEFORE SUBMISSION ===');
    const isPrivateNow = await detectPrivateBrowsing();
    if (isPrivateNow) {
      console.log('=== PRIVATE MODE DETECTED ON SUBMIT! BLOCKING ===');
      setIsPrivateMode(true);
      showToast('error', 'Private browsing detected! Please use normal browsing mode.');
      return;
    }
    console.log('=== SUBMIT CHECK PASSED ===');

    if (!position) {
      showToast('error', 'Please allow location access first');
      return;
    }

    if (!formData.name || !formData.email || !formData.specialty || !formData.major) {
      showToast('error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      // Re-check VPN before submission
      const vpnCheck = await detectVPN();
      if (vpnCheck) {
        showToast('error', 'VPN usage detected! Please disable your VPN to mark attendance.');
        return;
      }

      // Create browser fingerprint
      const browserFingerprint = {
        isPrivate: isPrivateNow,
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        hardwareConcurrency: navigator.hardwareConcurrency,
        deviceMemory: (navigator as any).deviceMemory,
        timestamp: Date.now()
      };

      const response = await fetch('/api/students/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          specialty: formData.specialty,
          major: formData.major,
          latitude: position.lat,
          longitude: position.lng,
          browserFingerprint: browserFingerprint,
          deviceFingerprint: deviceFingerprint,
          isVPN: vpnCheck
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to mark attendance');
      }

      showToast('success', data.message || 'Attendance marked successfully!');
      setSuccess(true);
      
      setTimeout(() => {
        setSuccess(false);
        setFormData({ name: '', email: '', specialty: '', major: '' });
        setPosition(null);
      }, 3000);
    } catch (error: any) {
      showToast('error', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Show blocking screen if checking
  if (checking) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl p-8 text-center animate-fade-in">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse-slow">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Verifying Browser...
          </h2>
          <p className="text-gray-600">
            Please wait while we verify your browser and IP address.
          </p>
        </div>
      </div>
    );
  }

  // Show blocking screen if private browsing detected
  if (isPrivateMode === true) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl p-8 text-center animate-fade-in">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="w-12 h-12 text-red-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-800 mb-4">
            Private Browsing Detected
          </h2>
          <p className="text-gray-600 mb-6">
            This website cannot be accessed in Private/Incognito mode because we need to track IP addresses for attendance verification.
          </p>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-800 font-medium mb-2">
              To use this system:
            </p>
            <ol className="text-left text-sm text-red-700 space-y-2">
              <li>1. Close this private/incognito window</li>
              <li>2. Open a normal browser window</li>
              <li>3. Return to this website</li>
            </ol>
          </div>
          <Link 
            href="/"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
          >
            <Home className="w-4 h-4" />
            Go to Home Page
          </Link>
        </div>
      </div>
    );
  }

  // Show blocking screen if IP not verified
  if (ipVerified === false || !clientIP) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl p-8 text-center animate-fade-in">
          <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-12 h-12 text-orange-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-800 mb-4">
            IP Verification Failed
          </h2>
          <p className="text-gray-600 mb-6">
            We couldn't detect or verify your IP address. This is required for attendance tracking.
          </p>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-orange-800 font-medium mb-2">
              Possible reasons:
            </p>
            <ul className="text-left text-sm text-orange-700 space-y-2">
              <li>• You're using a VPN or proxy</li>
              <li>• Private browsing mode is enabled</li>
              <li>• Browser is blocking IP detection</li>
              <li>• Network configuration issues</li>
            </ul>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium mb-4"
          >
            Try Again
          </button>
          <br />
          <Link 
            href="/"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
          >
            <Home className="w-4 h-4" />
            Go to Home Page
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl p-8 text-center animate-fade-in">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-800 mb-4">
            Attendance Marked!
          </h2>
          <p className="text-gray-600 mb-2">
            Your attendance has been recorded successfully.
          </p>
          <p className="text-sm text-gray-500">
            You can close this window now.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <Link 
          href="/"
          className="inline-flex items-center gap-2 text-white/90 hover:text-white mb-6 transition-colors"
        >
          <Home className="w-4 h-4" />
          Back to Home
        </Link>

        <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl p-8 animate-slide-up">
          <div className="flex items-center justify-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-light-sea-green to-strong-cyan rounded-xl flex items-center justify-center">
              <MapPin className="w-8 h-8 text-white" />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">
            Mark Attendance
          </h1>
          <p className="text-center text-gray-600 mb-8">
            Enter your details and share your location
          </p>

          {/* Session Info */}
          {currentSession && (
            <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="text-sm font-medium text-gray-800">Current Session</p>
                  <p className="text-xs text-gray-600">{getSessionLabel(currentSession)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Location Permission Status */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-3">
              {locationPermission === 'granted' ? (
                <>
                  <Unlock className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">Location Access Granted</p>
                    <p className="text-xs text-gray-600">
                      {position 
                        ? `Lat: ${position.lat.toFixed(6)}, Lng: ${position.lng.toFixed(6)}`
                        : 'Click "Get My Location" to fetch coordinates'
                      }
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5 text-orange-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">Location Access Required</p>
                    <p className="text-xs text-gray-600">
                      Please allow location access to mark attendance
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name Field */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Full Name
                </div>
              </label>
              <input
                id="name"
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent transition-all"
                placeholder="John Doe"
              />
            </div>

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email Address
                </div>
              </label>
              <input
                id="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent transition-all"
                placeholder="student@university.edu"
              />
            </div>

            {/* Specialty Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4" />
                  Select Specialty
                </div>
              </label>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(SPECIALTIES_CONFIG).map(([key, value]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFormData({ ...formData, specialty: key as 'MI' | 'ST', major: '' })}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      formData.specialty === key
                        ? 'border-green-600 bg-green-50'
                        : 'border-gray-300 hover:border-green-300'
                    }`}
                  >
                    <div className="font-semibold text-lg">{key}</div>
                    <div className="text-xs text-gray-600 mt-1">{value.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Major Field */}
            {formData.specialty && (
              <div className="animate-fade-in">
                <label htmlFor="major" className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    Select Major
                  </div>
                </label>
                <select
                  id="major"
                  required
                  value={formData.major}
                  onChange={(e) => setFormData({ ...formData, major: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent transition-all"
                >
                  <option value="">Choose your major...</option>
                  {availableMajors.map((major) => (
                    <option key={major} value={major}>
                      {major}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Location
              </label>
              <button
                type="button"
                onClick={getLocation}
                disabled={locationLoading}
                className="w-full bg-white border-2 border-gray-300 text-gray-700 font-semibold py-3 px-6 rounded-lg hover:border-green-500 hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-green-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {locationLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Getting Location...
                  </>
                ) : position ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    Location Captured
                  </>
                ) : (
                  <>
                    <Navigation className="w-5 h-5" />
                    Get My Location
                  </>
                )}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading || !position || !formData.specialty || !formData.major}
              className="w-full bg-gradient-to-r from-light-sea-green to-strong-cyan text-white font-semibold py-3 px-6 rounded-lg hover:from-light-sea-green-600 hover:to-strong-cyan-600 focus:outline-none focus:ring-2 focus:ring-light-sea-green focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Marking Attendance...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Mark Attendance
                </>
              )}
            </button>
          </form>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800 text-center">
              💡 <strong>Note:</strong> Each device can only mark attendance once per day with one email address
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
