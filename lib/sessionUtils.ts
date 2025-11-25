import { AttendanceSession } from '@/models/Student';

// Session time ranges (24-hour format)
export const SESSION_TIMES = {
  session1: { start: 8, end: 9.5, label: '8:00 AM - 9:30 AM' },
  session2: { start: 9.5, end: 11, label: '9:30 AM - 11:00 AM' },
  session3: { start: 11, end: 12.5, label: '11:00 AM - 12:30 PM' },
  session4: { start: 12.5, end: 24, label: '12:30 PM - End of Day' }
};

/**
 * Get current attendance session based on time
 */
export function getCurrentSession(): AttendanceSession | null {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const currentTime = hours + minutes / 60;

  if (currentTime >= SESSION_TIMES.session1.start && currentTime < SESSION_TIMES.session1.end) {
    return 'session1';
  } else if (currentTime >= SESSION_TIMES.session2.start && currentTime < SESSION_TIMES.session2.end) {
    return 'session2';
  } else if (currentTime >= SESSION_TIMES.session3.start && currentTime < SESSION_TIMES.session3.end) {
    return 'session3';
  } else if (currentTime >= SESSION_TIMES.session4.start && currentTime < SESSION_TIMES.session4.end) {
    return 'session4';
  }

  return null; // Outside attendance hours
}

/**
 * Get session label
 */
export function getSessionLabel(session: AttendanceSession): string {
  return SESSION_TIMES[session].label;
}

/**
 * Check if current time is within any attendance session
 */
export function isWithinAttendanceHours(): boolean {
  return getCurrentSession() !== null;
}

/**
 * Generate device fingerprint from browser info
 */
export function generateDeviceFingerprint(): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  let canvasFingerprint = '';
  
  if (ctx) {
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('fingerprint', 2, 2);
    canvasFingerprint = canvas.toDataURL();
  }

  const fingerprint = {
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
    screenResolution: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    canvasFingerprint: canvasFingerprint.substring(0, 50),
    hardwareConcurrency: navigator.hardwareConcurrency || 0,
    deviceMemory: (navigator as any).deviceMemory || 0,
    vendor: navigator.vendor || ''
  };

  return btoa(JSON.stringify(fingerprint)).substring(0, 100);
}

/**
 * Detect VPN usage indicators
 */
export async function detectVPN(): Promise<boolean> {
  try {
    // Check for WebRTC leaks
    const hasWebRTC = await checkWebRTCLeak();
    if (hasWebRTC) return true;

    // Check timezone mismatch
    const timezoneCheck = checkTimezoneMismatch();
    if (timezoneCheck) return true;

    // Check for common VPN ports
    const portCheck = await checkVPNPorts();
    if (portCheck) return true;

    return false;
  } catch (error) {
    console.error('VPN detection error:', error);
    return false;
  }
}

async function checkWebRTCLeak(): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const pc = new RTCPeerConnection({ iceServers: [] });
      const noop = () => {};
      
      pc.createDataChannel('');
      pc.createOffer().then((offer) => pc.setLocalDescription(offer)).catch(noop);

      pc.onicecandidate = (ice) => {
        if (!ice || !ice.candidate || !ice.candidate.candidate) {
          resolve(false);
          return;
        }

        const candidateStr = ice.candidate.candidate;
        
        // Check for VPN indicators in WebRTC candidates
        if (candidateStr.includes('relay') || candidateStr.includes('srflx')) {
          resolve(true);
        }
      };

      setTimeout(() => {
        pc.close();
        resolve(false);
      }, 2000);
    } catch (error) {
      resolve(false);
    }
  });
}

function checkTimezoneMismatch(): boolean {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const offset = new Date().getTimezoneOffset();
    
    // Check if timezone string seems suspicious
    // Most VPNs use generic timezone names
    const suspiciousTimezones = ['UTC', 'GMT', 'Europe/London'];
    if (suspiciousTimezones.includes(timezone) && offset !== 0) {
      return true;
    }

    return false;
  } catch (error) {
    return false;
  }
}

async function checkVPNPorts(): Promise<boolean> {
  // This is a basic check - in production, you'd do this server-side
  // Check if common VPN software is detectable
  try {
    const userAgent = navigator.userAgent.toLowerCase();
    const vpnIndicators = ['vpn', 'proxy', 'tor'];
    
    return vpnIndicators.some(indicator => userAgent.includes(indicator));
  } catch (error) {
    return false;
  }
}
