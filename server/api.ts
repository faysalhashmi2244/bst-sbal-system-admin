const express = require('express');
const cors = require('cors');
const { storage } = require('./storage');

const app = express();
const PORT = process.env.PORT || 3001;

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
      total: result.total,
      page,
      limit,
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
    
    // Get total count for this user (pass large limit to get all)
    const allUserEvents = await storage.getEventsByUser(address, 10000, 0);
    const total = allUserEvents.length;
    
    console.log(`Found ${events.length} events for user ${address} (page ${page}), total: ${total}`);
    
    res.json({
      events,
      userAddress: address,
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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

module.exports = { app };

if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`API server running on port ${PORT}`);
  });
}