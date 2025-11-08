const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Serve static files
app.use(express.static(path.join(__dirname)));

// Direct root to simple_admin.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'simple_admin.html'));
});

// Serve advanced panel as an alternative
app.get('/advanced', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin_panel.html'));
});

// Serve direct link page
app.get('/direct', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin-direct-link.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Admin panel server running on http://0.0.0.0:${PORT}`);
});