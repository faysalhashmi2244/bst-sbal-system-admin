const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Initialize database tables
async function initializeTables() {
  const client = await pool.connect();
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

    // Create node_packages table
    await client.query(`
      CREATE TABLE IF NOT EXISTS node_packages (
        id SERIAL PRIMARY KEY,
        package_id INTEGER NOT NULL UNIQUE,
        name TEXT NOT NULL,
        price DECIMAL(36,18) NOT NULL,
        duration INTEGER NOT NULL,
        roi_percentage INTEGER NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create user_nodes table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_nodes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        package_id INTEGER NOT NULL,
        node_id INTEGER NOT NULL,
        purchase_time TIMESTAMP NOT NULL,
        expiry_time TIMESTAMP NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create user_package_stats table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_package_stats (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        package_id INTEGER NOT NULL,
        referral_count INTEGER DEFAULT 0,
        total_rewards DECIMAL(36,18) DEFAULT '0',
        ascension_bonus_referrals INTEGER DEFAULT 0,
        ascension_bonus_sales_total DECIMAL(36,18) DEFAULT '0',
        ascension_bonus_rewards_claimed DECIMAL(36,18) DEFAULT '0',
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, package_id)
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
    await client.query(`CREATE INDEX IF NOT EXISTS events_event_type_idx ON events(event_type);`);
    await client.query(`CREATE INDEX IF NOT EXISTS events_user_address_idx ON events(user_address);`);
    await client.query(`CREATE INDEX IF NOT EXISTS events_block_number_idx ON events(block_number);`);
    await client.query(`CREATE INDEX IF NOT EXISTS events_timestamp_idx ON events(timestamp);`);

    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Error initializing database tables:', error);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { pool, initializeTables };