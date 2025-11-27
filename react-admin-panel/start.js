const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

// Create basic HTML to display our React Admin Panel implementation
const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Node Packages Admin Panel</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
  <style>
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }
    pre {
      background-color: #f8f9fa;
      padding: 15px;
      border-radius: 5px;
      overflow-x: auto;
    }
    .navbar {
      margin-bottom: 30px;
    }
    .section {
      margin-bottom: 40px;
      padding: 20px;
      border-radius: 5px;
      background-color: #fff;
      box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
    }
    .warning {
      background-color: #fff3cd;
      color: #856404;
      padding: 10px;
      border-radius: 5px;
      margin-bottom: 20px;
    }
    .code-container {
      position: relative;
    }
    .code-container button {
      position: absolute;
      top: 5px;
      right: 5px;
      z-index: 10;
    }
    h2 {
      border-bottom: 2px solid #f0f0f0;
      padding-bottom: 10px;
      margin-bottom: 20px;
    }
  </style>
</head>
<body class="bg-light">
  <nav class="navbar navbar-expand-lg navbar-dark bg-primary">
    <div class="container-fluid">
      <span class="navbar-brand">Node Packages Admin Panel</span>
    </div>
  </nav>

  <div class="container">
    <div class="warning">
      <strong>Note:</strong> This page provides an overview of the React Admin Panel implementation.
      The full interactive version requires additional setup with React and its dependencies.
    </div>
    
    <div class="section">
      <h2>Admin Panel Features</h2>
      <p>This admin panel is designed to manage your Node Packages smart contract deployed on Base Sepolia testnet.</p>
      <p><strong>Contract Addresses:</strong></p>
      <ul>
        <li><strong>NodeToken:</strong> 0xF3f6C7bF8B0781350e7122039219Dcb23d6643AB</li>
        <li><strong>NodePackages:</strong> 0xC8AC3954f9550Ef41705e9c0aE2179b8Df01CF4B</li>
      </ul>
      
      <p><strong>Features:</strong></p>
      <ul>
        <li>Connect to MetaMask wallet</li>
        <li>View and manage node packages</li>
        <li>Update seven-level referral settings</li>
        <li>Configure bulk referral bonuses</li>
        <li>Manage the Prosperity Fund</li>
      </ul>
    </div>
    
    <div class="section">
      <h2>Implementation Details</h2>
      <p>The admin panel is built with the following technologies:</p>
      <ul>
        <li><strong>React</strong> - Frontend framework</li>
        <li><strong>ethers.js</strong> - Ethereum library for contract interaction</li>
        <li><strong>Chakra UI</strong> - Component library for styling</li>
        <li><strong>Base Sepolia</strong> - Testnet for deployment</li>
      </ul>
      
      <p>Main components include:</p>
      <ul>
        <li><strong>NodePackagesManager</strong> - For managing node packages</li>
        <li><strong>ReferralSettings</strong> - For configuring referral percentages</li>
        <li><strong>ProsperityFund</strong> - For managing the community fund</li>
      </ul>
    </div>

    <div class="section">
      <h2>Setup Instructions</h2>
      <p>To run the full interactive admin panel locally:</p>
      <ol>
        <li>Install Node.js and npm</li>
        <li>Navigate to the react-admin-panel directory</li>
        <li>Install dependencies with <code>npm install --legacy-peer-deps</code></li>
        <li>Run the app with <code>npm start</code></li>
        <li>Connect your MetaMask wallet (configured for Base Sepolia)</li>
      </ol>
      
      <p>Make sure your wallet has Base Sepolia ETH for gas and the proper permissions on the contracts.</p>
    </div>
  </div>
  
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
`;

// Serve static files
app.get('/', (req, res) => {
  res.send(html);
});

// Serve the project files for viewing
app.use('/files', express.static(path.join(__dirname, '/')));

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});