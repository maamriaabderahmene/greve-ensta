/**
 * Detects if the browser is in private/incognito mode
 * Uses multiple detection methods for better accuracy
 */
export async function isPrivateBrowsing(): Promise<boolean> {
  return new Promise((resolve) => {
    let detectionCount = 0;
    const results: boolean[] = [];

    // Method 1: IndexedDB persistence detection (Most reliable)
    const detectIndexedDB = () => {
      return new Promise<boolean>((res) => {
        if (!window.indexedDB) {
          console.log('Private detection: No IndexedDB');
          res(true);
          return;
        }

        const testDB = 'privatetest_' + Date.now();
        try {
          const request = indexedDB.open(testDB, 1);
          
          request.onerror = () => {
            console.log('Private detection: IndexedDB error');
            res(true);
          };
          
          request.onsuccess = (event: any) => {
            const db = event.target.result;
            try {
              // Try to create a transaction
              const transaction = db.transaction(['test'], 'readwrite');
              transaction.onerror = () => {
                console.log('Private detection: Transaction failed');
                db.close();
                indexedDB.deleteDatabase(testDB);
                res(true);
              };
              transaction.oncomplete = () => {
                console.log('Private detection: IndexedDB works (NOT private)');
                db.close();
                indexedDB.deleteDatabase(testDB);
                res(false);
              };
            } catch (e) {
              console.log('Private detection: Transaction error');
              db.close();
              indexedDB.deleteDatabase(testDB);
              res(true);
            }
          };

          request.onupgradeneeded = (event: any) => {
            const db = event.target.result;
            try {
              db.createObjectStore('test', { keyPath: 'id' });
            } catch (e) {
              console.log('Private detection: CreateObjectStore failed');
              res(true);
            }
          };

          // Timeout after 2 seconds
          setTimeout(() => {
            console.log('Private detection: IndexedDB timeout');
            res(true);
          }, 2000);
        } catch (e) {
          console.log('Private detection: IndexedDB exception');
          res(true);
        }
      });
    };

    // Method 2: Storage quota detection (Chrome/Edge)
    const detectQuota = () => {
      return new Promise<boolean>((res) => {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
          navigator.storage.estimate().then((estimate) => {
            // In private mode, quota is typically < 10MB or undefined
            const quota = estimate.quota || 0;
            const isPrivate = quota < 10000000; // Less than 10MB
            console.log(`Private detection: Quota = ${quota} bytes, isPrivate = ${isPrivate}`);
            res(isPrivate);
          }).catch(() => {
            console.log('Private detection: Quota check failed');
            res(false);
          });
        } else {
          console.log('Private detection: No storage estimate API');
          res(false);
        }
      });
    };

    // Method 3: LocalStorage persistence test
    const detectLocalStorage = () => {
      try {
        const testKey = 'privatetest_' + Date.now();
        localStorage.setItem(testKey, 'test');
        const retrieved = localStorage.getItem(testKey);
        localStorage.removeItem(testKey);
        
        if (retrieved === 'test') {
          console.log('Private detection: LocalStorage works (NOT private)');
          return false;
        } else {
          console.log('Private detection: LocalStorage retrieval failed');
          return true;
        }
      } catch (e) {
        console.log('Private detection: LocalStorage blocked');
        return true;
      }
    };

    // Method 4: FileSystem API (Chrome)
    const detectFileSystem = () => {
      return new Promise<boolean>((res) => {
        if ('webkitRequestFileSystem' in window) {
          (window as any).webkitRequestFileSystem(
            (window as any).TEMPORARY,
            1,
            () => {
              console.log('Private detection: FileSystem works (NOT private)');
              res(false);
            },
            () => {
              console.log('Private detection: FileSystem blocked');
              res(true);
            }
          );
          // Timeout
          setTimeout(() => res(false), 1000);
        } else {
          console.log('Private detection: No FileSystem API');
          res(false);
        }
      });
    };

    // Method 5: SessionStorage persistence
    const detectSessionStorage = () => {
      try {
        const testKey = 'privatetest_' + Date.now();
        sessionStorage.setItem(testKey, 'test');
        const retrieved = sessionStorage.getItem(testKey);
        sessionStorage.removeItem(testKey);
        
        if (retrieved === 'test') {
          console.log('Private detection: SessionStorage works (NOT private)');
          return false;
        } else {
          console.log('Private detection: SessionStorage retrieval failed');
          return true;
        }
      } catch (e) {
        console.log('Private detection: SessionStorage blocked');
        return true;
      }
    };

    // Method 6: Check for specific private mode indicators
    const detectPrivateIndicators = () => {
      const indicators = [];
      
      // Check if certain properties exist that are typically missing in private mode
      if (!(window as any).requestFileSystem && !(window as any).webkitRequestFileSystem) {
        indicators.push('no-filesystem');
      }
      
      // Check for limited storage
      try {
        if (navigator.storage && navigator.storage.estimate) {
          // Already handled in detectQuota
        }
      } catch (e) {
        indicators.push('storage-error');
      }
      
      console.log('Private detection: Indicators = ', indicators);
      return indicators.length > 0;
    };

    // Run all detection methods with timeout
    const detectionPromises = [
      detectIndexedDB(),
      detectQuota(),
      Promise.resolve(detectLocalStorage()),
      detectFileSystem(),
      Promise.resolve(detectSessionStorage()),
      Promise.resolve(detectPrivateIndicators())
    ];

    Promise.all(detectionPromises).then((detectionResults) => {
      console.log('Private detection results:', detectionResults);
      
      // Count how many methods detected private mode
      const privateCount = detectionResults.filter(r => r === true).length;
      
      // If 2 or more methods detect private mode, consider it private
      const isPrivate = privateCount >= 2;
      
      console.log(`Private detection: ${privateCount}/6 methods detected private mode. Final result: ${isPrivate}`);
      resolve(isPrivate);
    }).catch((error) => {
      console.error('Private detection error:', error);
      // If detection fails completely, assume private mode for safety
      resolve(true);
    });
  });
}

/**
 * Checks if the browser can properly expose IP address
 */
export async function canDetectIP(): Promise<boolean> {
  try {
    // Check if we can create WebRTC connection (used for IP detection)
    if (!window.RTCPeerConnection && !(window as any).webkitRTCPeerConnection) {
      return false;
    }

    // Check if fetch API is available
    if (!window.fetch) {
      return false;
    }

    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Get client IP using multiple methods
 */
export async function getClientIP(): Promise<string | null> {
  try {
    // Try to get IP from our API
    const response = await fetch('/api/get-ip');
    if (response.ok) {
      const data = await response.json();
      return data.ip || null;
    }
    return null;
  } catch (e) {
    console.error('Failed to get client IP:', e);
    return null;
  }
}
