const { pool, initializeTables } = require('./simple-db');

class DatabaseStorage {
  constructor() {
    this.initialized = false;
  }

  async init() {
    if (!this.initialized) {
      await initializeTables();
      this.initialized = true;
    }
  }

  async getUser(address) {
    await this.init();
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT * FROM users WHERE address = $1', [address]);
      return result.rows[0] || undefined;
    } finally {
      client.release();
    }
  }

  async createUser(insertUser) {
    await this.init();
    const client = await pool.connect();
    try {
      const query = `
        INSERT INTO users (address, total_referrals, total_rewards, is_registered, 
                          ascension_bonus_referrals, ascension_bonus_sales_total, 
                          ascension_bonus_rewards_claimed)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      const values = [
        insertUser.address,
        insertUser.totalReferrals || 0,
        insertUser.totalRewards || '0',
        insertUser.isRegistered || false,
        insertUser.ascensionBonusReferrals || 0,
        insertUser.ascensionBonusSalesTotal || '0',
        insertUser.ascensionBonusRewardsClaimed || '0'
      ];
      const result = await client.query(query, values);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async updateUser(address, data) {
    await this.init();
    const client = await pool.connect();
    try {
      const fields = [];
      const values = [];
      let paramCount = 1;

      Object.keys(data).forEach(key => {
        const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        fields.push(`${dbKey} = $${paramCount}`);
        values.push(data[key]);
        paramCount++;
      });

      values.push(address);
      const query = `UPDATE users SET ${fields.join(', ')}, updated_at = NOW() WHERE address = $${paramCount} RETURNING *`;
      
      const result = await client.query(query, values);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async getAllUsers() {
    await this.init();
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT * FROM users ORDER BY created_at DESC');
      return result.rows;
    } finally {
      client.release();
    }
  }

  async createEvent(insertEvent) {
    await this.init();
    const client = await pool.connect();
    try {
      const query = `
        INSERT INTO events (event_type, user_address, package_id, amount, referrer_address,
                           transaction_hash, block_number, timestamp, event_data)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;
      const values = [
        insertEvent.eventType,
        insertEvent.userAddress,
        insertEvent.packageId,
        insertEvent.amount,
        insertEvent.referrerAddress,
        insertEvent.transactionHash,
        insertEvent.blockNumber,
        insertEvent.timestamp,
        insertEvent.eventData
      ];
      const result = await client.query(query, values);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async getEventsByUser(userAddress, limit = 100, offset = 0) {
    await this.init();
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM events WHERE user_address = $1 ORDER BY timestamp DESC LIMIT $2 OFFSET $3',
        [userAddress, limit, offset]
      );
      return result.rows;
    } finally {
      client.release();
    }
  }

  async getAllEvents(limit = 100, offset = 0) {
    await this.init();
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM events ORDER BY timestamp DESC LIMIT $1 OFFSET $2',
        [limit, offset]
      );
      return result.rows;
    } finally {
      client.release();
    }
  }

  async getEventsSummary() {
    await this.init();
    const client = await pool.connect();
    try {
      const totalEventsResult = await client.query('SELECT COUNT(*) as count FROM events');
      const totalUsersResult = await client.query('SELECT COUNT(*) as count FROM users');
      const eventTypesResult = await client.query(
        'SELECT event_type, COUNT(*) as count FROM events GROUP BY event_type'
      );

      return {
        totalEvents: parseInt(totalEventsResult.rows[0].count),
        totalUsers: parseInt(totalUsersResult.rows[0].count),
        eventTypes: eventTypesResult.rows.map(row => ({
          eventType: row.event_type,
          count: parseInt(row.count)
        }))
      };
    } finally {
      client.release();
    }
  }

  async getUsersWithPagination(limit, offset) {
    await this.init();
    const client = await pool.connect();
    try {
      const usersResult = await client.query(
        'SELECT * FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2',
        [limit, offset]
      );
      const totalResult = await client.query('SELECT COUNT(*) as count FROM users');

      return {
        users: usersResult.rows,
        total: parseInt(totalResult.rows[0].count)
      };
    } finally {
      client.release();
    }
  }

  async getMonthlyAnalytics() {
    await this.init();
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          DATE_TRUNC('month', created_at) as month,
          COUNT(*) as user_count
        FROM users 
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY month
      `);
      return result.rows;
    } finally {
      client.release();
    }
  }

  async getAllUserPackageStats(userId) {
    await this.init();
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT * FROM user_package_stats WHERE user_id = $1', [userId]);
      return result.rows;
    } finally {
      client.release();
    }
  }

  async getAllNodePackages() {
    await this.init();
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT * FROM node_packages ORDER BY package_id');
      return result.rows;
    } finally {
      client.release();
    }
  }

  async getPackageAscensionAnalytics(packageId) {
    await this.init();
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          COALESCE(SUM(referral_count), 0) as total_referrals,
          COALESCE(SUM(total_rewards), '0') as total_rewards,
          COALESCE(SUM(ascension_bonus_referrals), 0) as ascension_bonus_referrals,
          COALESCE(SUM(ascension_bonus_sales_total), '0') as ascension_bonus_sales_total,
          COALESCE(SUM(ascension_bonus_rewards_claimed), '0') as ascension_bonus_rewards_claimed
        FROM user_package_stats 
        WHERE package_id = $1
      `, [packageId]);
      
      return result.rows[0] || {
        total_referrals: 0,
        total_rewards: '0',
        ascension_bonus_referrals: 0,
        ascension_bonus_sales_total: '0',
        ascension_bonus_rewards_claimed: '0'
      };
    } finally {
      client.release();
    }
  }
}

const storage = new DatabaseStorage();

module.exports = { storage, DatabaseStorage };