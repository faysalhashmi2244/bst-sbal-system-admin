const express = require('express');
const cors = require('cors');
const { storage } = require('./basic-storage.js');

const app = express();

app.use(cors());
app.use(express.json());

// User endpoints
app.get('/api/users', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const result = await storage.getUsersWithPagination(limit, offset);
    
    res.json({
      users: result.users,
      page,
      limit,
      total: result.total,
      totalPages: Math.ceil(result.total / limit)
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.get('/api/users/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const user = await storage.getUser(address);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user's package stats
    const packageStats = await storage.getAllUserPackageStats(user.id);
    
    res.json({
      ...user,
      packageStats
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Packages endpoints
app.get('/api/packages', async (req, res) => {
  try {
    const packages = await storage.getAllNodePackages();
    res.json({ packages });
  } catch (error) {
    console.error('Error fetching packages:', error);
    res.status(500).json({ error: 'Failed to fetch packages' });
  }
});

app.get('/api/packages/:id', async (req, res) => {
  try {
    const packageId = parseInt(req.params.id);
    const packageObj = await storage.getNodePackage(packageId);
    
    if (!packageObj) {
      return res.status(404).json({ error: 'Package not found' });
    }
    
    res.json({ package: packageObj });
  } catch (error) {
    console.error('Error fetching package:', error);
    res.status(500).json({ error: 'Failed to fetch package' });
  }
});

app.post('/api/packages', async (req, res) => {
  try {
    const newPackage = await storage.createNodePackage(req.body);
    res.status(201).json({ package: newPackage });
  } catch (error) {
    console.error('Error creating package:', error);
    res.status(500).json({ error: 'Failed to create package' });
  }
});

app.put('/api/packages/:id', async (req, res) => {
  try {
    const packageId = parseInt(req.params.id);
    const updatedPackage = await storage.updateNodePackage(packageId, req.body);
    res.json({ package: updatedPackage });
  } catch (error) {
    console.error('Error updating package:', error);
    res.status(500).json({ error: 'Failed to update package' });
  }
});

// User stats endpoints
app.post('/api/user-stats', async (req, res) => {
  try {
    const { userAddress, packageId, ...statsData } = req.body;
    
    // Get user first
    let user = await storage.getUser(userAddress);
    if (!user) {
      // Create user if doesn't exist
      user = await storage.createUser({
        address: userAddress,
        totalReferrals: 0,
        totalRewards: '0',
        isRegistered: true,
        ascensionBonusReferrals: 0,
        ascensionBonusSalesTotal: '0',
        ascensionBonusRewardsClaimed: '0'
      });
    }

    // Create or update user package stats
    const stats = await storage.createOrUpdateUserPackageStats(user.id, packageId, statsData);
    
    res.status(201).json({ stats });
  } catch (error) {
    console.error('Error creating/updating user stats:', error);
    res.status(500).json({ error: 'Failed to create/update user stats' });
  }
});

app.get('/api/user-stats/:userAddress', async (req, res) => {
  try {
    const { userAddress } = req.params;
    const user = await storage.getUser(userAddress);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const stats = await storage.getAllUserPackageStats(user.id);
    res.json({ stats });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ error: 'Failed to fetch user stats' });
  }
});

// Events endpoints
app.get('/api/events', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const offset = (page - 1) * limit;

    const events = await storage.getAllEvents(limit, offset);
    
    res.json({
      events,
      page,
      limit
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

app.get('/api/events/user/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const offset = (page - 1) * limit;

    console.log(`Fetching events for user: ${address}, page: ${page}, limit: ${limit}`);
    
    const events = await storage.getEventsByUser(address, limit, offset);
    
    // Get total count for pagination
    const allUserEvents = await storage.getEventsByUser(address, 999999, 0);
    const total = allUserEvents.length;

    res.json({
      events,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error fetching user events:', error);
    console.error('Error details:', error.stack);
    res.status(500).json({ error: 'Failed to fetch user events', details: error.message });
  }
});

app.get('/api/events/summary', async (req, res) => {
  try {
    const summary = await storage.getEventsSummary();
    res.json(summary);
  } catch (error) {
    console.error('Error fetching events summary:', error);
    res.status(500).json({ error: 'Failed to fetch events summary' });
  }
});

// Analytics endpoints
app.get('/api/analytics/monthly', async (req, res) => {
  try {
    const analytics = await storage.getMonthlyAnalytics();
    res.json(analytics);
  } catch (error) {
    console.error('Error fetching monthly analytics:', error);
    res.status(500).json({ error: 'Failed to fetch monthly analytics' });
  }
});

app.get('/api/analytics/package/:packageId/ascension', async (req, res) => {
  try {
    const packageId = parseInt(req.params.packageId);
    const analytics = await storage.getPackageAscensionAnalytics(packageId);
    res.json(analytics);
  } catch (error) {
    console.error('Error fetching package ascension analytics:', error);
    res.status(500).json({ error: 'Failed to fetch package ascension analytics' });
  }
});

// Node packages endpoints
app.get('/api/packages', async (req, res) => {
  try {
    const packages = await storage.getAllNodePackages();
    res.json(packages);
  } catch (error) {
    console.error('Error fetching packages:', error);
    res.status(500).json({ error: 'Failed to fetch packages' });
  }
});

// Create user endpoint
app.post('/api/users', async (req, res) => {
  try {
    const user = await storage.createUser(req.body);
    res.status(201).json(user);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Create event endpoint
app.post('/api/events', async (req, res) => {
  try {
    const event = await storage.createEvent(req.body);
    res.status(201).json(event);
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// Hard refresh endpoint - clears database and triggers full data sync
app.post('/api/hard-refresh', async (req, res) => {
  try {
    console.log('Starting hard refresh - clearing database and triggering full sync...');
    
    // Clear all data from storage
    await storage.clearAllData();
    console.log('Database cleared successfully');
    
    // Trigger full data sync
    const { DataSyncService } = require('./data-sync');
    const syncService = new DataSyncService();
    
    // Run sync in background to avoid timeout
    setImmediate(async () => {
      try {
        await syncService.fullSync();
        console.log('Full data sync completed successfully');
      } catch (error) {
        console.error('Error during full sync:', error);
      }
    });
    
    res.json({ 
      success: true, 
      message: 'Hard refresh initiated - database cleared and full sync started in background',
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    console.error('Error during hard refresh:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to perform hard refresh', 
      details: error.message 
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

module.exports = { app };