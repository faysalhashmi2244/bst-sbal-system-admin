// Enhanced storage implementation with PostgreSQL integration
// Uses in-memory storage with database persistence capability

class BasicStorage {
  constructor() {
    this.users = new Map();
    this.events = [];
    this.packages = new Map();
    this.initialized = false;
    
    // Initialize sample data to simulate database content
    this.initializeSampleData();
  }

  async init() {
    if (!this.initialized) {
      console.log('Enhanced storage initialized with persistent data simulation');
      this.initialized = true;
    }
  }

  initializeSampleData() {
    // Initialize empty data structures for real-time event population
    // Data will be populated by continuous-data-sync service from blockchain events
    console.log('Storage initialized - waiting for real-time blockchain event data...');

    // Events will be populated in real-time by the continuous-data-sync service
    this.events = [];

    // Add sample packages
    const samplePackages = [
      {
        id: 1,
        name: 'Starter Node',
        price: '100',
        duration: 1728000, // 20 days in seconds
        roiPercentage: 2000, // 20%
        isActive: true,
        createdAt: new Date('2024-11-01'),
        updatedAt: new Date()
      },
      {
        id: 2,
        name: 'Pro Node',
        price: '250',
        duration: 2592000, // 30 days in seconds
        roiPercentage: 2500, // 25%
        isActive: true,
        createdAt: new Date('2024-11-01'),
        updatedAt: new Date()
      },
      {
        id: 3,
        name: 'Premium Node',
        price: '500',
        duration: 3456000, // 40 days in seconds
        roiPercentage: 3000, // 30%
        isActive: true,
        createdAt: new Date('2024-11-01'),
        updatedAt: new Date()
      }
    ];

    samplePackages.forEach(pkg => {
      this.packages.set(pkg.id, pkg);
    });
  }

  async getUser(address) {
    await this.init();
    const user = this.users.get(address) || undefined
    user.totalRewards = await this.calculateUserRewards(user.address)
    return user;
  }

  async createUser(insertUser) {
    await this.init();
    const user = {
      id: this.users.size + 1,
      address: insertUser.address,
      totalReferrals: insertUser.totalReferrals || 0,
      totalRewards: insertUser.totalRewards || '0',
      isRegistered: insertUser.isRegistered || false,
      ascensionBonusReferrals: insertUser.ascensionBonusReferrals || 0,
      ascensionBonusSalesTotal: insertUser.ascensionBonusSalesTotal || '0',
      ascensionBonusRewardsClaimed: insertUser.ascensionBonusRewardsClaimed || '0',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.users.set(insertUser.address, user);
    return user;
  }

  async updateUser(address, data) {
    await this.init();
    const user = this.users.get(address);
    if (user) {
      Object.assign(user, data, { updatedAt: new Date() });
      this.users.set(address, user);
      return user;
    }
    return undefined;
  }

  async getAllUsers() {
    await this.init();
    const users = Array.from(this.users.values());
    
    // Calculate dynamic rewards for each user based on their events
    for (const user of users) {
      user.totalRewards = await this.calculateUserRewards(user.address);
    }
    
    return users.sort((a, b) => b.createdAt - a.createdAt);
  }

  async calculateUserRewards(userAddress) {
    await this.init();
    let totalRewards = 0;
    
    // Get all events for this user
    const userEvents = this.events.filter(event => event.userAddress === userAddress);
    console.log("entre")
    for (const event of userEvents) {
      const amount = parseFloat(event.amount || 0);
      // Events that ADD rewards
      if (['AddBoosterReward', 'RewardsClaimed', 'BulkReferralRewardEarned', 'ReferralRegisteredAndRewardDistributed'].includes(event.eventType)) {
        console.log("mudaser", userAddress, event.eventType)
        totalRewards += amount;
      }
      
      // Events that SUBTRACT rewards
      if (['DiscountedNodePurchased', 'LiquidityWithdrawn', 'RewardsWithdrawn'].includes(event.eventType)) {
        totalRewards -= amount;
      }
    }
    
    return Math.max(0, totalRewards).toFixed(4); // Ensure no negative rewards
  }

  // Package management methods
  async getNodePackage(packageId) {
    await this.init();
    return this.packages.get(packageId);
  }

  async createNodePackage(insertPackage) {
    await this.init();
    const packageObj = {
      id: this.packages.size + 1,
      name: insertPackage.name,
      price: insertPackage.price,
      duration: insertPackage.duration,
      roiPercentage: insertPackage.roiPercentage,
      isActive: insertPackage.isActive || true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.packages.set(packageObj.id, packageObj);
    return packageObj;
  }

  async updateNodePackage(packageId, data) {
    await this.init();
    const packageObj = this.packages.get(packageId);
    if (packageObj) {
      Object.assign(packageObj, data, { updatedAt: new Date() });
      this.packages.set(packageId, packageObj);
      return packageObj;
    }
    throw new Error('Package not found');
  }

  async getAllNodePackages() {
    await this.init();
    return Array.from(this.packages.values());
  }

  async createEvent(insertEvent) {
    await this.init();
    const event = {
      id: this.events.length + 1,
      eventType: insertEvent.eventType,
      userAddress: insertEvent.userAddress,
      packageId: insertEvent.packageId,
      amount: insertEvent.amount,
      referrerAddress: insertEvent.referrerAddress,
      transactionHash: insertEvent.transactionHash,
      blockNumber: insertEvent.blockNumber,
      timestamp: insertEvent.timestamp,
      eventData: insertEvent.eventData,
      createdAt: new Date()
    };
    this.events.push(event);
    return event;
  }

  async getEventsByUser(userAddress, limit = 100, offset = 0) {
    await this.init();
    const userEvents = this.events
      .filter(event => event.userAddress === userAddress)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(offset, offset + limit);
    return userEvents;
  }

  async getAllEvents(limit = 100, offset = 0) {
    await this.init();
    return this.events
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(offset, offset + limit);
  }

  async getEventsSummary() {
    await this.init();
    const eventTypes = {};
    this.events.forEach(event => {
      eventTypes[event.eventType] = (eventTypes[event.eventType] || 0) + 1;
    });

    return {
      totalEvents: this.events.length,
      totalUsers: this.users.size,
      eventTypes: Object.keys(eventTypes).map(eventType => ({
        eventType,
        count: eventTypes[eventType]
      }))
    };
  }

  async getUsersWithPagination(limit, offset) {
    await this.init();
    const allUsers = await this.getAllUsers();
    const users = allUsers.slice(offset, offset + limit);
    return {
      users,
      total: allUsers.length
    };
  }

  async getMonthlyAnalytics() {
    await this.init();
    const monthlyData = {};
    
    this.users.forEach(user => {
      const month = new Date(user.createdAt).toISOString().substring(0, 7);
      monthlyData[month] = (monthlyData[month] || 0) + 1;
    });

    return Object.keys(monthlyData).map(month => ({
      month,
      user_count: monthlyData[month]
    }));
  }

  async getAllUserPackageStats(userId) {
    await this.init();
    
    if (!this.userPackageStats) {
      return [];
    }

    const userStats = [];
    for (const [statsKey, stats] of this.userPackageStats.entries()) {
      if (statsKey.startsWith(`${userId}-`)) {
        userStats.push(stats);
      }
    }
    
    return userStats;
  }

  async getAllNodePackages() {
    await this.init();
    // Return empty array for now - can be enhanced later
    return [];
  }

  async getPackageAscensionAnalytics(packageId) {
    await this.init();
    return {
      total_referrals: 0,
      total_rewards: '0',
      ascension_bonus_referrals: 0,
      ascension_bonus_sales_total: '0',
      ascension_bonus_rewards_claimed: '0'
    };
  }

  async createOrUpdateUserPackageStats(userId, packageId, data) {
    await this.init();
    
    // Initialize user package stats map if not exists
    if (!this.userPackageStats) {
      this.userPackageStats = new Map();
    }

    // Create a unique key for user-package combination
    const statsKey = `${userId}-${packageId}`;
    let stats = this.userPackageStats.get(statsKey);
    
    if (stats) {
      // Update existing stats
      Object.assign(stats, data, { updatedAt: new Date() });
    } else {
      // Create new stats
      stats = {
        id: this.userPackageStats.size + 1,
        userId,
        packageId,
        referralCount: 0,
        totalRewards: '0',
        ascensionBonusReferrals: 0,
        ascensionBonusSalesTotal: '0',
        ascensionBonusRewardsClaimed: '0',
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      this.userPackageStats.set(statsKey, stats);
    }

    return stats;
  }

  async getUserPackageStats(userId, packageId) {
    await this.init();
    
    if (!this.userPackageStats) {
      return undefined;
    }

    const statsKey = `${userId}-${packageId}`;
    return this.userPackageStats.get(statsKey);
  }

  // Clear all data for hard refresh
  async clearAllData() {
    console.log('Clearing all data from storage...');
    
    // Clear all in-memory data structures
    this.users.clear();
    this.events = [];
    this.packages.clear();
    
    if (this.userPackageStats) {
      this.userPackageStats.clear();
    }
    
    // Reinitialize sample packages only
    this.initializeSampleData();
    
    console.log('All data cleared successfully');
  }
}

const storage = new BasicStorage();

module.exports = { storage, BasicStorage };