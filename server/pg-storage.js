// PostgreSQL storage implementation using existing database connection
const { Pool } = require('pg');

class PostgreSQLStorage {
  constructor() {
    // Use existing PostgreSQL environment variables from Replit
    this.pool = new Pool({
      host: process.env.PGHOST,
      port: process.env.PGPORT,
      database: process.env.PGDATABASE,
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      ssl: { rejectUnauthorized: false }
    });
    
    this.initialized = false;
  }

  async init() {
    if (!this.initialized) {
      await this.createTables();
      this.initialized = true;
    }
  }

  async createTables() {
    const client = await this.pool.connect();
    try {
      // Create users table
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          address TEXT NOT NULL UNIQUE,
          total_referrals INTEGER DEFAULT 0,
          total_rewards DECIMAL(36,18) DEFAULT '0',
          is_registered BOOLEAN DEFAULT false,
          ascension_bonus_referrals INTEGER DEFAULT 0,
          ascension_bonus_sales_total DECIMAL(36,18) DEFAULT '0',
          ascension_bonus_rewards_claimed DECIMAL(36,18) DEFAULT '0',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `);

      // Create events table
      await client.query(`
        CREATE TABLE IF NOT EXISTS events (
          id SERIAL PRIMARY KEY,
          event_type TEXT NOT NULL,
          user_address TEXT NOT NULL,
          package_id INTEGER,
          amount DECIMAL(36,18),
          referrer_address TEXT,
          transaction_hash TEXT NOT NULL,
          block_number INTEGER NOT NULL,
          timestamp TIMESTAMP NOT NULL,
          event_data TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `);

      // Create indexes
      await client.query(`CREATE INDEX IF NOT EXISTS users_address_idx ON users(address);`);
      await client.query(`CREATE INDEX IF NOT EXISTS events_user_address_idx ON events(user_address);`);
      await client.query(`CREATE INDEX IF NOT EXISTS events_event_type_idx ON events(event_type);`);
      
      console.log('PostgreSQL tables initialized successfully');
    } catch (error) {
      console.error('Error creating tables:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getUser(address) {
    await this.init();
    const client = await this.pool.connect();
    try {
      const result = await client.query('SELECT * FROM users WHERE address = $1', [address]);
      return result.rows[0] || undefined;
    } finally {
      client.release();
    }
  }

  async createUser(insertUser) {
    await this.init();
    const client = await this.pool.connect();
    try {
      // Check if user already exists
      const existing = await client.query('SELECT id FROM users WHERE address = $1', [insertUser.address]);
      if (existing.rows.length > 0) {
        return existing.rows[0];
      }

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
    const client = await this.pool.connect();
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
    const client = await this.pool.connect();
    try {
      const result = await client.query('SELECT * FROM users ORDER BY created_at DESC');
      return result.rows;
    } finally {
      client.release();
    }
  }

  async createEvent(insertEvent) {
    await this.init();
    const client = await this.pool.connect();
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
    const client = await this.pool.connect();
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
    const client = await this.pool.connect();
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
    const client = await this.pool.connect();
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
    const client = await this.pool.connect();
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
    const client = await this.pool.connect();
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
    // Return empty array for now - can be enhanced later
    return [];
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
}

const storage = new PostgreSQLStorage();

module.exports = { storage, PostgreSQLStorage };