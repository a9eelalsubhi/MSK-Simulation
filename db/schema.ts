import { sqliteTable, text, integer, index, primaryKey } from 'drizzle-orm/sqlite-core';

// Random first-party browser IDs only. No IP addresses, names or emails.
export const visitors = sqliteTable('analytics_visitors', {
  id: text('id').primaryKey(),
  firstSeen: integer('first_seen').notNull(),
  lastSeen: integer('last_seen').notNull(),
  lastSession: text('last_session').notNull(),
});

export const events = sqliteTable('analytics_events', {
  visitorId: text('visitor_id').notNull().references(() => visitors.id),
  eventId: text('event_id').notNull(),
  sessionId: text('session_id').notNull(),
  lecture: text('lecture').notNull(),
  createdAt: integer('created_at').notNull(),
  day: text('day').notNull(),
}, t => [
  primaryKey({ columns: [t.visitorId, t.eventId] }),
  index('analytics_events_created_idx').on(t.createdAt),
  index('analytics_events_lecture_idx').on(t.lecture, t.createdAt),
]);
