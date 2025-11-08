const { users, nodePackages, userNodes, userPackageStats, events } = require("../shared/schema");
const { db } = require("./db");
const { eq, and, desc, asc, sql, count, isNotNull } = require("drizzle-orm");

// Import types
import type { 
  User, InsertUser, 
  NodePackage, InsertNodePackage,
  UserNode, InsertUserNode,
  UserPackageStats,
  Event, InsertEvent 
} from "../shared/schema";

interface IStorage {
  // User management
  getUser(address: string): Promise<User | undefined>;
  createUser(insertUser: InsertUser): Promise<User>;
  updateUser(address: string, data: Partial<User>): Promise<User>;
  getAllUsers(): Promise<User[]>;
  
  // Node package management
  getNodePackage(packageId: number): Promise<NodePackage | undefined>;
  createNodePackage(insertPackage: InsertNodePackage): Promise<NodePackage>;
  updateNodePackage(packageId: number, data: Partial<NodePackage>): Promise<NodePackage>;
  getAllNodePackages(): Promise<NodePackage[]>;
  
  // User nodes
  getUserNodes(userId: number): Promise<UserNode[]>;
  createUserNode(insertNode: InsertUserNode): Promise<UserNode>;
  
  // User package stats
  getUserPackageStats(userId: number, packageId: number): Promise<UserPackageStats | undefined>;
  createOrUpdateUserPackageStats(userId: number, packageId: number, data: Partial<UserPackageStats>): Promise<UserPackageStats>;
  getAllUserPackageStats(userId: number): Promise<UserPackageStats[]>;
  
  // Events
  createEvent(insertEvent: InsertEvent): Promise<Event>;
  getEventsByUser(userAddress: string, limit?: number, offset?: number): Promise<Event[]>;
  getEventsByType(eventType: string, limit?: number, offset?: number): Promise<Event[]>;
  getAllEvents(limit?: number, offset?: number): Promise<Event[]>;
  getEventsSummary(): Promise<any>;
  
  // Analytics
  getUsersWithPagination(limit: number, offset: number): Promise<{ users: User[], total: number }>;
  getMonthlyAnalytics(): Promise<any>;
  getPackageAscensionAnalytics(packageId: number): Promise<any>;
}

class DatabaseStorage {
  // User management
  async getUser(address: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.address, address));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(address: string, data: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.address, address))
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(asc(users.createdAt));
  }

  // Node package management
  async getNodePackage(packageId: number): Promise<NodePackage | undefined> {
    const [pkg] = await db.select().from(nodePackages).where(eq(nodePackages.packageId, packageId));
    return pkg || undefined;
  }

  async createNodePackage(insertPackage: InsertNodePackage): Promise<NodePackage> {
    const [pkg] = await db
      .insert(nodePackages)
      .values(insertPackage)
      .returning();
    return pkg;
  }

  async updateNodePackage(packageId: number, data: Partial<NodePackage>): Promise<NodePackage> {
    const [pkg] = await db
      .update(nodePackages)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(nodePackages.packageId, packageId))
      .returning();
    return pkg;
  }

  async getAllNodePackages(): Promise<NodePackage[]> {
    return await db.select().from(nodePackages).orderBy(asc(nodePackages.packageId));
  }

  // User nodes
  async getUserNodes(userId: number): Promise<UserNode[]> {
    return await db.select().from(userNodes).where(eq(userNodes.userId, userId));
  }

  async createUserNode(insertNode: InsertUserNode): Promise<UserNode> {
    const [node] = await db
      .insert(userNodes)
      .values(insertNode)
      .returning();
    return node;
  }

  // User package stats
  async getUserPackageStats(userId: number, packageId: number): Promise<UserPackageStats | undefined> {
    const [stats] = await db
      .select()
      .from(userPackageStats)
      .where(and(eq(userPackageStats.userId, userId), eq(userPackageStats.packageId, packageId)));
    return stats || undefined;
  }

  async createOrUpdateUserPackageStats(userId: number, packageId: number, data: Partial<UserPackageStats>): Promise<UserPackageStats> {
    const existing = await this.getUserPackageStats(userId, packageId);
    
    if (existing) {
      const [stats] = await db
        .update(userPackageStats)
        .set({ ...data, updatedAt: new Date() })
        .where(and(eq(userPackageStats.userId, userId), eq(userPackageStats.packageId, packageId)))
        .returning();
      return stats;
    } else {
      const [stats] = await db
        .insert(userPackageStats)
        .values({ userId, packageId, ...data })
        .returning();
      return stats;
    }
  }

  async getAllUserPackageStats(userId: number): Promise<UserPackageStats[]> {
    return await db.select().from(userPackageStats).where(eq(userPackageStats.userId, userId));
  }

  // Events
  async createEvent(insertEvent: InsertEvent): Promise<Event> {
    const [event] = await db
      .insert(events)
      .values(insertEvent)
      .returning();
    return event;
  }

  async getEventsByUser(userAddress: string, limit: number = 100, offset: number = 0): Promise<Event[]> {
    return await db
      .select()
      .from(events)
      .where(
        and(
          isNotNull(events.userAddress),
          eq(events.userAddress, userAddress)
        )
      )
      .orderBy(desc(events.timestamp))
      .limit(limit)
      .offset(offset);
  }

  async getEventsByType(eventType: string, limit: number = 100, offset: number = 0): Promise<Event[]> {
    return await db
      .select()
      .from(events)
      .where(eq(events.eventType, eventType))
      .orderBy(desc(events.timestamp))
      .limit(limit)
      .offset(offset);
  }

  async getAllEvents(limit: number = 100, offset: number = 0): Promise<Event[]> {
    return await db
      .select()
      .from(events)
      .orderBy(desc(events.timestamp))
      .limit(limit)
      .offset(offset);
  }

  async getEventsSummary(): Promise<any> {
    const totalEvents = await db.select({ count: count() }).from(events);
    const uniqueUsers = await db.select({ count: count() }).from(users);
    const eventTypes = await db
      .select({ 
        eventType: events.eventType, 
        count: count() 
      })
      .from(events)
      .groupBy(events.eventType);

    return {
      totalEvents: totalEvents[0].count,
      totalUsers: uniqueUsers[0].count,
      eventTypes: eventTypes,
    };
  }

  // Analytics
  async getUsersWithPagination(limit: number, offset: number): Promise<{ users: User[], total: number }> {
    const [usersResult, totalResult] = await Promise.all([
      db.select().from(users).limit(limit).offset(offset).orderBy(desc(users.createdAt)),
      db.select({ count: count() }).from(users)
    ]);

    return {
      users: usersResult,
      total: totalResult[0].count
    };
  }

  async getMonthlyAnalytics(): Promise<any> {
    const monthlyUsers = await db
      .select({
        month: sql`DATE_TRUNC('month', ${users.createdAt})`,
        count: count()
      })
      .from(users)
      .groupBy(sql`DATE_TRUNC('month', ${users.createdAt})`)
      .orderBy(sql`DATE_TRUNC('month', ${users.createdAt})`);

    const monthlyEvents = await db
      .select({
        month: sql`DATE_TRUNC('month', ${events.timestamp})`,
        eventType: events.eventType,
        count: count()
      })
      .from(events)
      .groupBy(sql`DATE_TRUNC('month', ${events.timestamp})`, events.eventType)
      .orderBy(sql`DATE_TRUNC('month', ${events.timestamp})`);

    return {
      monthlyUsers,
      monthlyEvents
    };
  }

  async getPackageAscensionAnalytics(packageId: number): Promise<any> {
    const packageStats = await db
      .select()
      .from(userPackageStats)
      .where(eq(userPackageStats.packageId, packageId));

    const totalAscensionReferrals = packageStats.reduce((sum, stat) => sum + stat.ascensionBonusReferrals, 0);
    const totalAscensionSales = packageStats.reduce((sum, stat) => sum + parseFloat(stat.ascensionBonusSalesTotal || '0'), 0);
    const totalAscensionRewards = packageStats.reduce((sum, stat) => sum + parseFloat(stat.ascensionBonusRewardsClaimed || '0'), 0);

    return {
      packageId,
      totalUsers: packageStats.length,
      totalAscensionReferrals,
      totalAscensionSales,
      totalAscensionRewards,
      userStats: packageStats
    };
  }
}

const storage = new DatabaseStorage();
module.exports = { storage, DatabaseStorage };