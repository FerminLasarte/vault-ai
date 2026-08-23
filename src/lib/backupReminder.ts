// How long a backup stays "recent enough". Short enough that losing the disk
// costs at most a couple of weeks of entries, long enough not to nag someone
// who is using the app normally.
export const BACKUP_REMINDER_DAYS = 14;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Whole days between an ISO timestamp and now. Negative results are clamped to
// zero: a clock that moved backwards should not read as a backup from the
// future.
export function daysSince(isoTimestamp: string, now: Date = new Date()): number {
  const taken = new Date(isoTimestamp).getTime();
  if (!Number.isFinite(taken)) return Number.POSITIVE_INFINITY;

  return Math.max(0, Math.floor((now.getTime() - taken) / MS_PER_DAY));
}

export interface BackupStatus {
  // Null when no backup has ever been taken.
  daysAgo: number | null;
  isOverdue: boolean;
}

// Whether to nag, and how stale things are.
//
// An empty database is never nagged: there is nothing to lose yet, and an
// install that opens to a warning reads as broken rather than careful.
export function backupStatus(
  lastBackupAt: string | null,
  transactionCount: number,
  now: Date = new Date(),
): BackupStatus {
  if (transactionCount === 0) {
    return {
      daysAgo: lastBackupAt === null ? null : daysSince(lastBackupAt, now),
      isOverdue: false,
    };
  }

  if (lastBackupAt === null) {
    return { daysAgo: null, isOverdue: true };
  }

  const daysAgo = daysSince(lastBackupAt, now);
  return { daysAgo, isOverdue: daysAgo >= BACKUP_REMINDER_DAYS };
}
