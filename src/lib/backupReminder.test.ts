import { describe, expect, it } from "vitest";
import { backupStatus, daysSince, BACKUP_REMINDER_DAYS } from "@/lib/backupReminder";

const NOW = new Date("2026-08-22T12:00:00Z");
const daysAgo = (days: number) =>
  new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

describe("daysSince", () => {
  it("counts whole days", () => {
    expect(daysSince(daysAgo(3), NOW)).toBe(3);
  });

  it("is zero for something taken moments ago", () => {
    expect(daysSince(NOW.toISOString(), NOW)).toBe(0);
  });

  it("does not round a partial day up", () => {
    expect(daysSince(daysAgo(2.9), NOW)).toBe(2);
  });

  it("clamps a timestamp from the future to zero", () => {
    expect(daysSince(daysAgo(-5), NOW)).toBe(0);
  });

  it("treats an unparseable timestamp as infinitely old", () => {
    expect(daysSince("no es una fecha", NOW)).toBe(Number.POSITIVE_INFINITY);
  });
});

describe("backupStatus", () => {
  it("never nags an empty database", () => {
    expect(backupStatus(null, 0, NOW)).toEqual({ daysAgo: null, isOverdue: false });
  });

  it("nags when there is data and no backup has ever been taken", () => {
    expect(backupStatus(null, 53, NOW)).toEqual({ daysAgo: null, isOverdue: true });
  });

  it("stays quiet just before the threshold", () => {
    const status = backupStatus(daysAgo(BACKUP_REMINDER_DAYS - 1), 53, NOW);
    expect(status.isOverdue).toBe(false);
    expect(status.daysAgo).toBe(BACKUP_REMINDER_DAYS - 1);
  });

  it("nags once the threshold is reached", () => {
    expect(backupStatus(daysAgo(BACKUP_REMINDER_DAYS), 53, NOW).isOverdue).toBe(true);
  });

  it("reports how long ago even when it is not overdue", () => {
    expect(backupStatus(daysAgo(2), 53, NOW).daysAgo).toBe(2);
  });

  it("still reports the age of a backup on an emptied database", () => {
    expect(backupStatus(daysAgo(40), 0, NOW)).toEqual({ daysAgo: 40, isOverdue: false });
  });
});
