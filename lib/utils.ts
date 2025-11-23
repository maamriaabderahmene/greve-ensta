// Specialty and major configuration
export const SPECIALTIES_CONFIG = {
  MI: {
    label: "Mathematics and Computer Science (MI)",
    majors: ['CPMI1', 'CPMI2', 'CS', 'AI']
  },
  ST: {
    label: "Science and Technology (ST)", 
    majors: [
      'ICL1', 'ICL2', 'ICL3', 
      'IT1', 'IT2', 'IT3',
      'STR1', 'STR2', 'STR3', 
      'SE1', 'SE2', 'SE3',
      'AII1', 'AII2', 'AII3', 
      'GMP1', 'GMP2', 'GMP3',
      'MECT1', 'MECT2', 'MECT3', 
      'MIMI1', 'MIMI2', 'MIMI3',
      'GI1', 'GI2', 'GI3'
    ]
  }
} as const;

export type Specialty = keyof typeof SPECIALTIES_CONFIG;
export type Major = typeof SPECIALTIES_CONFIG[Specialty]['majors'][number];

// Haversine formula to calculate distance between two coordinates
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

// Format date for display
export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Check if location is within allowed radius
export function isWithinRadius(
  userLat: number,
  userLng: number,
  targetLat: number,
  targetLng: number,
  radius: number
): boolean {
  const distance = calculateDistance(userLat, userLng, targetLat, targetLng);
  return distance <= radius;
}
