const { pgTable, serial, text, timestamp, integer, bigint, boolean, decimal, index } = require('drizzle-orm/pg-core');
const { relations } = require('drizzle-orm');

// Users table
const users = pgTable('users', {
  id: serial('id').primaryKey(),
  address: text('address').notNull().unique(),
  totalReferrals: integer('total_referrals').default(0),
  totalRewards: decimal('total_rewards', { precision: 36, scale: 18 }).default('0'),
  isRegistered: boolean('is_registered').default(false),
  ascensionBonusReferrals: integer('ascension_bonus_referrals').default(0),
  ascensionBonusSalesTotal: decimal('ascension_bonus_sales_total', { precision: 36, scale: 18 }).default('0'),
  ascensionBonusRewardsClaimed: decimal('ascension_bonus_rewards_claimed', { precision: 36, scale: 18 }).default('0'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  addressIdx: index('users_address_idx').on(table.address),
}));

// Node packages table
const nodePackages = pgTable('node_packages', {
  id: serial('id').primaryKey(),
  packageId: integer('package_id').notNull().unique(),
  name: text('name').notNull(),
  price: decimal('price', { precision: 36, scale: 18 }).notNull(),
  duration: integer('duration').notNull(),
  roiPercentage: integer('roi_percentage').notNull(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// User nodes table
const userNodes = pgTable('user_nodes', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  packageId: integer('package_id').notNull(),
  nodeId: integer('node_id').notNull(),
  purchaseTime: timestamp('purchase_time').notNull(),
  expiryTime: timestamp('expiry_time').notNull(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  userIdIdx: index('user_nodes_user_id_idx').on(table.userId),
  packageIdIdx: index('user_nodes_package_id_idx').on(table.packageId),
}));

// User package stats table (for package-wise tracking)
const userPackageStats = pgTable('user_package_stats', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  packageId: integer('package_id').notNull(),
  referralCount: integer('referral_count').default(0),
  totalRewards: decimal('total_rewards', { precision: 36, scale: 18 }).default('0'),
  ascensionBonusReferrals: integer('ascension_bonus_referrals').default(0),
  ascensionBonusSalesTotal: decimal('ascension_bonus_sales_total', { precision: 36, scale: 18 }).default('0'),
  ascensionBonusRewardsClaimed: decimal('ascension_bonus_rewards_claimed', { precision: 36, scale: 18 }).default('0'),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  userPackageIdx: index('user_package_stats_user_package_idx').on(table.userId, table.packageId),
}));

// Events table for tracking all blockchain events
const events = pgTable('events', {
  id: serial('id').primaryKey(),
  eventType: text('event_type').notNull(),
  userAddress: text('user_address').notNull(),
  packageId: integer('package_id'),
  amount: decimal('amount', { precision: 36, scale: 18 }),
  referrerAddress: text('referrer_address'),
  transactionHash: text('transaction_hash').notNull(),
  blockNumber: integer('block_number').notNull(),
  timestamp: timestamp('timestamp').notNull(),
  eventData: text('event_data'), // JSON string for additional event data
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  eventTypeIdx: index('events_event_type_idx').on(table.eventType),
  userAddressIdx: index('events_user_address_idx').on(table.userAddress),
  packageIdIdx: index('events_package_id_idx').on(table.packageId),
  blockNumberIdx: index('events_block_number_idx').on(table.blockNumber),
  timestampIdx: index('events_timestamp_idx').on(table.timestamp),
}));

// Relations
const usersRelations = relations(users, ({ many }) => ({
  nodes: many(userNodes),
  packageStats: many(userPackageStats),
  events: many(events),
}));

const nodePackagesRelations = relations(nodePackages, ({ many }) => ({
  userNodes: many(userNodes),
  userPackageStats: many(userPackageStats),
}));

const userNodesRelations = relations(userNodes, ({ one }) => ({
  user: one(users, {
    fields: [userNodes.userId],
    references: [users.id],
  }),
  package: one(nodePackages, {
    fields: [userNodes.packageId],
    references: [nodePackages.packageId],
  }),
}));

const userPackageStatsRelations = relations(userPackageStats, ({ one }) => ({
  user: one(users, {
    fields: [userPackageStats.userId],
    references: [users.id],
  }),
  package: one(nodePackages, {
    fields: [userPackageStats.packageId],
    references: [nodePackages.packageId],
  }),
}));

const eventsRelations = relations(events, ({ one }) => ({
  user: one(users, {
    fields: [events.userAddress],
    references: [users.address],
  }),
}));

module.exports = {
  users,
  nodePackages,
  userNodes,
  userPackageStats,
  events,
  usersRelations,
  nodePackagesRelations,
  userNodesRelations,
  userPackageStatsRelations,
  eventsRelations
};