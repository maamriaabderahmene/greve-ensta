/**
 * AGGRESSIVE Private Browsing Detection
 * This uses multiple synchronous and asynchronous methods
 * to detect private/incognito mode immediately
 */

/**
 * Immediate synchronous checks (run first)
 */
export function isPrivateBrowsingSync(): boolean {
  let indicators = 0;

  // Check 1: Estimate storage quota (most reliable)
  try {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      // This is async but we'll handle it separately
    }
  } catch (e) {
    indicators++;
  }

  // Check 2: LocalStorage test
  try {
    const test = '__private_test__' + Date.now();
    localStorage.setItem(test, '1');
    localStorage.removeItem(test);
  } catch (e) {
    console.log('[PRIVATE DETECT] LocalStorage blocked - PRIVATE MODE');
    indicators++;
  }

  // Check 3: SessionStorage test
  try {
    const test = '__private_test__' + Date.now();
    sessionStorage.setItem(test, '1');
    sessionStorage.removeItem(test);
  } catch (e) {
    console.log('[PRIVATE DETECT] SessionStorage blocked - PRIVATE MODE');
    indicators++;
  }

  // Check 4: IndexedDB availability
  if (!window.indexedDB) {
    console.log('[PRIVATE DETECT] No IndexedDB - PRIVATE MODE');
    indicators++;
  }

  // Check 5: requestFileSystem (Chrome specific)
  if (!(window as any).requestFileSystem && !(window as any).webkitRequestFileSystem) {
    indicators++;
  }

  console.log(`[PRIVATE DETECT SYNC] ${indicators} indicators detected`);
  return indicators >= 2;
}

/**
 * Full async detection with multiple methods
 */
export async function isPrivateBrowsingAsync(): Promise<boolean> {
  const results: boolean[] = [];

  // Method 1: Storage Quota (MOST RELIABLE)
  try {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      const quota = estimate.quota || 0;
      const usage = estimate.usage || 0;
      
      console.log(`[PRIVATE DETECT] Quota: ${(quota / 1024 / 1024).toFixed(2)} MB, Usage: ${(usage / 1024 / 1024).toFixed(2)} MB`);
      
      // Private mode typically has < 10MB quota
      if (quota < 10000000) {
        console.log('[PRIVATE DETECT] Low quota detected - PRIVATE MODE');
        results.push(true);
      } else {
        results.push(false);
      }
    } else {
      results.push(false);
    }
  } catch (e) {
    console.log('[PRIVATE DETECT] Quota check failed');
    results.push(true);
  }

  // Method 2: IndexedDB Transaction Test
  try {
    const isPrivate = await new Promise<boolean>((resolve) => {
      if (!window.indexedDB) {
        resolve(true);
        return;
      }

      const dbName = '__private_test__' + Date.now();
      try {
        const request = indexedDB.open(dbName, 1);
        
        request.onerror = () => {
          console.log('[PRIVATE DETECT] IndexedDB open failed - PRIVATE MODE');
          resolve(true);
        };
        
        request.onsuccess = (event: any) => {
          const db = event.target.result;
          try {
            // Try to create a transaction
            const transaction = db.transaction(['test'], 'readwrite');
            transaction.oncomplete = () => {
              console.log('[PRIVATE DETECT] IndexedDB works - NOT private');
              db.close();
              indexedDB.deleteDatabase(dbName);
              resolve(false);
            };
            transaction.onerror = () => {
              console.log('[PRIVATE DETECT] Transaction failed - PRIVATE MODE');
              db.close();
              indexedDB.deleteDatabase(dbName);
              resolve(true);
            };
          } catch (e) {
            console.log('[PRIVATE DETECT] Transaction error - PRIVATE MODE');
            db.close();
            resolve(true);
          }
        };

        request.onupgradeneeded = (event: any) => {
          try {
            const db = event.target.result;
            db.createObjectStore('test', { keyPath: 'id' });
          } catch (e) {
            console.log('[PRIVATE DETECT] CreateObjectStore failed - PRIVATE MODE');
            resolve(true);
          }
        };

        // Timeout after 3 seconds
        setTimeout(() => {
          console.log('[PRIVATE DETECT] IndexedDB timeout - PRIVATE MODE');
          resolve(true);
        }, 3000);
      } catch (e) {
        console.log('[PRIVATE DETECT] IndexedDB exception - PRIVATE MODE');
        resolve(true);
      }
    });
    
    results.push(isPrivate);
  } catch (e) {
    results.push(true);
  }

  // Method 3: FileSystem API (Chrome)
  try {
    const hasFileSystem = await new Promise<boolean>((resolve) => {
      if ('webkitRequestFileSystem' in window) {
        (window as any).webkitRequestFileSystem(
          (window as any).TEMPORARY,
          1,
          () => {
            console.log('[PRIVATE DETECT] FileSystem works - NOT private');
            resolve(false);
          },
          () => {
            console.log('[PRIVATE DETECT] FileSystem blocked - PRIVATE MODE');
            resolve(true);
          }
        );
        setTimeout(() => resolve(false), 1000);
      } else {
        resolve(false);
      }
    });
    results.push(hasFileSystem);
  } catch (e) {
    results.push(false);
  }

  // Method 4: Check if cookies are enabled
  try {
    if (!navigator.cookieEnabled) {
      console.log('[PRIVATE DETECT] Cookies disabled - PRIVATE MODE');
      results.push(true);
    } else {
      results.push(false);
    }
  } catch (e) {
    results.push(false);
  }

  // Calculate result
  const privateCount = results.filter(r => r === true).length;
  console.log(`[PRIVATE DETECT ASYNC] ${privateCount}/${results.length} methods detected private mode`);
  console.log('[PRIVATE DETECT ASYNC] Results:', results);
  
  // If 2 or more methods detect private mode, it's private
  return privateCount >= 2;
}

/**
 * Combined detection - runs sync first, then async
 */
export async function detectPrivateBrowsing(): Promise<boolean> {
  console.log('=== STARTING PRIVATE BROWSING DETECTION ===');
  
  // Run synchronous checks first
  const syncResult = isPrivateBrowsingSync();
  console.log('[PRIVATE DETECT] Sync result:', syncResult);
  
  if (syncResult) {
    console.log('[PRIVATE DETECT] BLOCKED by sync checks');
    return true;
  }

  // Run async checks
  const asyncResult = await isPrivateBrowsingAsync();
  console.log('[PRIVATE DETECT] Async result:', asyncResult);
  
  if (asyncResult) {
    console.log('[PRIVATE DETECT] BLOCKED by async checks');
    return true;
  }

  console.log('[PRIVATE DETECT] PASSED all checks - Normal browsing');
  return false;
}
