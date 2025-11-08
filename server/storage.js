const { 
  users, nodePackages, userNodes, userPackageStats, events
} = require('../shared/schema.js');
const { db } = require('./db');
const { eq, desc, count, sum, sql } = require('drizzle-orm');

class DatabaseStorage {
  async getUser(address) {
    const [user] = await db.select().from(users).where(eq(users.address, address));
    return user || undefined;
  }

  async createUser(insertUser) {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(address, data) {
    const [user] = await db
      .update(users)
      .set(data)
      .where(eq(users.address, address))
      .returning();
    return user;
  }

  async getAllUsers() {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getNodePackage(packageId) {
    const [nodePackage] = await db.select().from(nodePackages).where(eq(nodePackages.id, packageId));
    return nodePackage || undefined;
  }

  async createNodePackage(insertPackage) {
    const [nodePackage] = await db
      .insert(nodePackages)
      .values(insertPackage)
      .returning();
    return nodePackage;
  }

  async updateNodePackage(packageId, data) {
    const [nodePackage] = await db
      .update(nodePackages)
      .set(data)
      .where(eq(nodePackages.id, packageId))
      .returning();
    return nodePackage;
  }

  async getAllNodePackages() {
    return await db.select().from(nodePackages).orderBy(nodePackages.id);
  }

  async getUserNodes(userId) {
    return await db.select().from(userNodes).where(eq(userNodes.userId, userId));
  }

  async createUserNode(insertNode) {
    const [userNode] = await db
      .insert(userNodes)
      .values(insertNode)
      .returning();
    return userNode;
  }

  async getUserPackageStats(userId, packageId) {
    const [stats] = await db
      .select()
      .from(userPackageStats)
      .where(eq(userPackageStats.userId, userId) && eq(userPackageStats.packageId, packageId));
    return stats || undefined;
  }

  async createOrUpdateUserPackageStats(userId, packageId, data) {
    // Try to get existing stats
    const existing = await this.getUserPackageStats(userId, packageId);
    
    if (existing) {
      // Update existing stats
      const [updated] = await db
        .update(userPackageStats)
        .set(data)
        .where(eq(userPackageStats.userId, userId) && eq(userPackageStats.packageId, packageId))
        .returning();
      return updated;
    } else {
      // Create new stats
      const [created] = await db
        .insert(userPackageStats)
        .values({ userId, packageId, ...data })
        .returning();
      return created;
    }
  }

  async getAllUserPackageStats(userId) {
    return await db.select().from(userPackageStats).where(eq(userPackageStats.userId, userId));
  }

  async createEvent(insertEvent) {
    const [event] = await db
      .insert(events)
      .values(insertEvent)
      .returning();
    return event;
  }

  async getEventsByUser(userAddress, limit = 100, offset = 0) {
    return await db
      .select()
      .from(events)
      .where(eq(events.userAddress, userAddress))
      .orderBy(desc(events.timestamp))
      .limit(limit)
      .offset(offset);
  }

  async getEventsByType(eventType, limit = 100, offset = 0) {
    return await db
      .select()
      .from(events)
      .where(eq(events.eventType, eventType))
      .orderBy(desc(events.timestamp))
      .limit(limit)
      .offset(offset);
  }

  async getAllEvents(limit = 100, offset = 0) {
    return await db
      .select()
      .from(events)
      .orderBy(desc(events.timestamp))
      .limit(limit)
      .offset(offset);
  }

  async getEventsSummary() {
    const totalEvents = await db.select({ count: count() }).from(events);
    const totalUsers = await db.select({ count: count() }).from(users);
    const eventTypes = await db
      .select({ 
        eventType: events.eventType, 
        count: count() 
      })
      .from(events)
      .groupBy(events.eventType);

    return {
      totalEvents: totalEvents[0].count,
      totalUsers: totalUsers[0].count,
      eventTypes
    };
  }

  async getUsersWithPagination(limit, offset) {
    const usersList = await db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    const totalCount = await db.select({ count: count() }).from(users);

    return {
      users: usersList,
      total: totalCount[0].count
    };
  }

  async getMonthlyAnalytics() {
    // Get monthly user registration data
    const monthlyData = await db
      .select({
        month: sql`DATE_TRUNC('month', ${users.createdAt})`,
        userCount: count()
      })
      .from(users)
      .groupBy(sql`DATE_TRUNC('month', ${users.createdAt})`)
      .orderBy(sql`DATE_TRUNC('month', ${users.createdAt})`);

    return monthlyData;
  }

  async getPackageAscensionAnalytics(packageId) {
    // Get package-specific analytics
    const packageStats = await db
      .select({
        totalReferrals: sum(userPackageStats.referralCount),
        totalRewards: sum(userPackageStats.totalRewards),
        ascensionBonusReferrals: sum(userPackageStats.ascensionBonusReferrals),
        ascensionBonusSalesTotal: sum(userPackageStats.ascensionBonusSalesTotal),
        ascensionBonusRewardsClaimed: sum(userPackageStats.ascensionBonusRewardsClaimed)
      })
      .from(userPackageStats)
      .where(eq(userPackageStats.packageId, packageId));

    return packageStats[0] || {
      totalReferrals: 0,
      totalRewards: '0',
      ascensionBonusReferrals: 0,
      ascensionBonusSalesTotal: '0',
      ascensionBonusRewardsClaimed: '0'
    };
  }
}

const storage = new DatabaseStorage();

module.exports = { storage, DatabaseStorage };