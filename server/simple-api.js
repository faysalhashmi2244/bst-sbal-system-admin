// Simple API server that uses the existing PostgreSQL-integrated api.ts
// This ensures all data is stored in the database for user management queries

const { app } = require('./api.js');

const PORT = process.env.PORT || 3001;

if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Simple API server running on port ${PORT}`);
  });
}

module.exports = { app };