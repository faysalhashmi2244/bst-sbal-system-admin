const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all routes
app.use(cors());

// Parse JSON bodies
app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname)));

const NODE_PACKAGES_ADDRESS = process.env.REACT_APP_NODE_PACKAGES_ADDRESS
// Create a simple API endpoint to get contract addresses
app.get('/api/contracts', (req, res) => {
  res.json({
    nodeToken: "0xF3f6C7bF8B0781350e7122039219Dcb23d6643AB",
    nodePackages: NODE_PACKAGES_ADDRESS | "0x40801cE2aFBc8589F8213b2d7F66533dAe59BA2a",
    network: "Polygon Mainnet",
    chainId: 137
  });
});

// Direct root to simple.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'simple.html'));
});

// Serve index.html for /admin route
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin-panel.html'));
});

// Fallback route for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'simple.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});