const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(cors());

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Parse JSON request body
app.use(express.json());

// Contract addresses
const nodeTokenAddress = "0x98345dd7453228169A978eE0Aca0306EF76481bF";
const nodePackagesAddress = "0x902416B2Fd38b42691b9290ecc26Ad12E87616b7";

// Route for summary page
app.get('/summary', (req, res) => {
  const summaryPath = path.join(__dirname, 'public', 'summary.html');
  if (fs.existsSync(summaryPath)) {
    res.sendFile(summaryPath);
  } else {
    res.redirect('/');
  }
});

// Main admin panel route
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Node Packages Admin Panel</title>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          margin: 0;
          padding: 20px;
          color: #333;
        }
        h1 {
          color: #2c5282;
          border-bottom: 2px solid #eee;
          padding-bottom: 10px;
        }
        .container {
          max-width: 1200px;
          margin: 0 auto;
        }
        .card {
          background: white;
          border-radius: 5px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.1);
          padding: 20px;
          margin-bottom: 20px;
        }
        .header {
          background: #3182ce;
          color: white;
          padding: 20px;
          margin-bottom: 20px;
          border-radius: 5px;
        }
        .nav {
          margin-bottom: 20px;
        }
        .nav a {
          display: inline-block;
          padding: 8px 16px;
          background: #f0f4f8;
          text-decoration: none;
          color: #3182ce;
          border-radius: 4px;
          margin-right: 10px;
          font-weight: bold;
        }
        .nav a:hover {
          background: #e3e8f0;
        }
        .nav a.active {
          background: #3182ce;
          color: white;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Node Packages Admin Panel</h1>
        </div>
        
        <div class="nav">
          <a href="/" class="active">Admin Panel</a>
          <a href="/summary">Project Summary</a>
        </div>
        
        <div class="card">
          <h2>Contract Information</h2>
          <p><strong>Network:</strong> Base Sepolia Testnet</p>
          <p><strong>NodeToken:</strong> <a href="https://sepolia.basescan.org/address/${nodeTokenAddress}" target="_blank">${nodeTokenAddress}</a></p>
          <p><strong>NodePackages:</strong> <a href="https://sepolia.basescan.org/address/${nodePackagesAddress}" target="_blank">${nodePackagesAddress}</a></p>
        </div>
        
        <div class="card">
          <h2>Admin Panel Features</h2>
          <ul>
            <li>View and manage node packages</li>
            <li>Update seven-level referral settings</li>
            <li>Configure bulk referral bonuses</li>
            <li>Manage the Prosperity Fund</li>
          </ul>
        </div>
        
        <div class="card">
          <h2>Seven-Level Referral Percentages</h2>
          <p>Current settings:</p>
          <ul>
            <li>Level 1: 10%</li>
            <li>Level 2: 3%</li>
            <li>Level 3: 2%</li>
            <li>Level 4: 2%</li>
            <li>Level 5: 1%</li>
            <li>Level 6: 1%</li>
            <li>Level 7: 1%</li>
          </ul>
        </div>
        
        <div class="card">
          <h2>Node Packages</h2>
          <p>Available packages:</p>
          <ul>
            <li><strong>Starter Node:</strong> 100 tokens, 30 days, 200% ROI</li>
            <li><strong>Standard Node:</strong> 200 tokens, 30 days, 250% ROI</li>
            <li><strong>Premium Node:</strong> 500 tokens, 30 days, 300% ROI</li>
          </ul>
        </div>
        
        <div class="card">
          <h2>Prosperity Fund</h2>
          <p><strong>Current Balance:</strong> 1.0 ETH</p>
          <p><strong>Distribution Period:</strong> 30 days</p>
          <p><strong>Next Distribution:</strong> In 20 days</p>
        </div>
      </div>
    </body>
    </html>
  `);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});