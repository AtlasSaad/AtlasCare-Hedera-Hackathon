/**
 * Persistence Layer for AtlasCare
 * 
 * Provides file-based backup of in-memory stores to prevent data loss on restart.
 * Can be replaced with Redis/PostgreSQL for production.
 * 
 * Features:
 * - Auto-save every 30 seconds
 * - Load on startup
 * - Atomic writes (write to temp, then rename)
 * - Backup rotation
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '../data/persistence');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const SAVE_INTERVAL = 30000; // 30 seconds
const MAX_BACKUPS = 10;

// Ensure directories exist
try {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
} catch (err) {
  console.error('[PERSISTENCE] Failed to create data directories:', err.message);
}

class PersistenceManager {
  constructor() {
    this.stores = {};
    this.saveTimer = null;
    this.isDirty = false;
  }

  /**
   * Register a store for persistence
   * @param {string} name - Store name
   * @param {Map} store - Map instance to persist
   */
  register(name, store) {
    this.stores[name] = {
      map: store,
      filepath: path.join(DATA_DIR, `${name}.json`)
    };
    console.log(`[PERSISTENCE] Registered store: ${name}`);
  }

  /**
   * Load all stores from disk
   */
  async loadAll() {
    console.log('[PERSISTENCE] Loading stores from disk...');
    let loadedCount = 0;

    for (const [name, { map, filepath }] of Object.entries(this.stores)) {
      try {
        if (fs.existsSync(filepath)) {
          const data = fs.readFileSync(filepath, 'utf8');
          const parsed = JSON.parse(data);
          
          // Reconstruct Map from JSON array
          if (Array.isArray(parsed.entries)) {
            map.clear();
            for (const [key, value] of parsed.entries) {
              // Special handling for Sets (usedNonces)
              if (parsed.isSet) {
                map.add(key);
              } else {
                map.set(key, value);
              }
            }
            loadedCount++;
            console.log(`[PERSISTENCE] Loaded ${name}: ${map.size} entries`);
          }
        }
      } catch (err) {
        console.error(`[PERSISTENCE] Failed to load ${name}:`, err.message);
      }
    }

    console.log(`[PERSISTENCE] Loaded ${loadedCount}/${Object.keys(this.stores).length} stores`);
    return loadedCount;
  }

  /**
   * Save all stores to disk
   */
  async saveAll() {
    if (!this.isDirty) return;

    console.log('[PERSISTENCE] Saving stores to disk...');
    let savedCount = 0;

    for (const [name, { map, filepath }] of Object.entries(this.stores)) {
      try {
        // Convert Map/Set to JSON-serializable format
        let data;
        if (map instanceof Set) {
          data = {
            isSet: true,
            entries: Array.from(map),
            timestamp: new Date().toISOString(),
            count: map.size
          };
        } else {
          data = {
            entries: Array.from(map.entries()),
            timestamp: new Date().toISOString(),
            count: map.size
          };
        }

        const json = JSON.stringify(data, null, 2);
        
        // Atomic write: write to temp file, then rename
        const tempPath = `${filepath}.tmp`;
        fs.writeFileSync(tempPath, json, 'utf8');
        fs.renameSync(tempPath, filepath);
        
        savedCount++;
      } catch (err) {
        console.error(`[PERSISTENCE] Failed to save ${name}:`, err.message);
      }
    }

    this.isDirty = false;
    console.log(`[PERSISTENCE] Saved ${savedCount}/${Object.keys(this.stores).length} stores`);
  }

  /**
   * Create backup of current data
   */
  async createBackup() {
    try {
      const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
      const backupSubDir = path.join(BACKUP_DIR, timestamp);
      
      if (!fs.existsSync(backupSubDir)) {
        fs.mkdirSync(backupSubDir, { recursive: true });
      }

      for (const [name, { filepath }] of Object.entries(this.stores)) {
        if (fs.existsSync(filepath)) {
          const backupPath = path.join(backupSubDir, `${name}.json`);
          fs.copyFileSync(filepath, backupPath);
        }
      }

      // Rotate old backups
      this.rotateBackups();
      
      console.log(`[PERSISTENCE] Backup created: ${timestamp}`);
    } catch (err) {
      console.error('[PERSISTENCE] Backup failed:', err.message);
    }
  }

  /**
   * Delete old backups, keeping only MAX_BACKUPS
   */
  rotateBackups() {
    try {
      const backups = fs.readdirSync(BACKUP_DIR)
        .filter(name => fs.statSync(path.join(BACKUP_DIR, name)).isDirectory())
        .sort()
        .reverse();

      if (backups.length > MAX_BACKUPS) {
        const toDelete = backups.slice(MAX_BACKUPS);
        for (const backup of toDelete) {
          const backupPath = path.join(BACKUP_DIR, backup);
          fs.rmSync(backupPath, { recursive: true, force: true });
        }
        console.log(`[PERSISTENCE] Rotated ${toDelete.length} old backups`);
      }
    } catch (err) {
      console.error('[PERSISTENCE] Backup rotation failed:', err.message);
    }
  }

  /**
   * Start auto-save timer
   */
  startAutoSave() {
    if (this.saveTimer) return;

    this.saveTimer = setInterval(async () => {
      await this.saveAll();
    }, SAVE_INTERVAL);

    console.log(`[PERSISTENCE] Auto-save started (every ${SAVE_INTERVAL/1000}s)`);
  }

  /**
   * Stop auto-save timer
   */
  stopAutoSave() {
    if (this.saveTimer) {
      clearInterval(this.saveTimer);
      this.saveTimer = null;
      console.log('[PERSISTENCE] Auto-save stopped');
    }
  }

  /**
   * Mark stores as dirty (need saving)
   */
  markDirty() {
    this.isDirty = true;
  }

  /**
   * Graceful shutdown - save everything and create backup
   */
  async shutdown() {
    console.log('[PERSISTENCE] Shutting down...');
    this.stopAutoSave();
    await this.saveAll();
    await this.createBackup();
    console.log('[PERSISTENCE] Shutdown complete');
  }

  /**
   * Get statistics
   */
  getStats() {
    const stats = {};
    for (const [name, { map }] of Object.entries(this.stores)) {
      stats[name] = {
        entries: map.size,
        type: map instanceof Set ? 'Set' : 'Map'
      };
    }
    return stats;
  }
}

// Singleton instance
const persistence = new PersistenceManager();

// Graceful shutdown handlers
process.on('SIGTERM', async () => {
  console.log('[PERSISTENCE] Received SIGTERM');
  await persistence.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[PERSISTENCE] Received SIGINT');
  await persistence.shutdown();
  process.exit(0);
});

process.on('uncaughtException', async (err) => {
  console.error('[PERSISTENCE] Uncaught exception:', err);
  await persistence.shutdown();
  process.exit(1);
});

module.exports = persistence;

