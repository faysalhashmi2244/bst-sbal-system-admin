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

// Node Package contract ABIs (simplified for demo)
const nodePackagesABI = [
  {
    "inputs": [],
    "name": "getSevenLevelReferralPercentages",
    "outputs": [{"internalType": "uint256[7]", "name": "", "type": "uint256[7]"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "prosperityFundBalance",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getNodePackages",
    "outputs": [
      {
        "components": [
          {"internalType": "uint256", "name": "id", "type": "uint256"},
          {"internalType": "string", "name": "name", "type": "string"},
          {"internalType": "uint256", "name": "price", "type": "uint256"},
          {"internalType": "uint256", "name": "duration", "type": "uint256"},
          {"internalType": "uint256", "name": "roiPercentage", "type": "uint256"},
          {"internalType": "bool", "name": "isActive", "type": "bool"}
        ],
        "internalType": "struct NodePackages.NodePackage[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

// Contract addresses
const nodeTokenAddress = "0xF3f6C7bF8B0781350e7122039219Dcb23d6643AB";
const nodePackagesAddress = "0xC8AC3954f9550Ef41705e9c0aE2179b8Df01CF4B";

// Mock data API endpoints (in a real app, these would call the blockchain)
app.get('/api/referral-percentages', (req, res) => {
  res.json([10, 3, 2, 2, 1, 1, 1]);
});

app.get('/api/prosperity-fund', (req, res) => {
  res.json({
    balance: "1000000000000000000", // 1 ETH in wei
    isEnabled: true,
    distributionPeriod: 2592000, // 30 days in seconds
    lastDistribution: Math.floor(Date.now() / 1000) - 1000000
  });
});

app.get('/api/node-packages', (req, res) => {
  res.json([
    {
      id: 1,
      name: "Starter Node",
      price: "100000000000000000000", // 100 tokens
      duration: 2592000, // 30 days
      roiPercentage: 200,
      isActive: true
    },
    {
      id: 2,
      name: "Standard Node",
      price: "200000000000000000000", // 200 tokens
      duration: 2592000, // 30 days
      roiPercentage: 250,
      isActive: true
    },
    {
      id: 3,
      name: "Premium Node",
      price: "500000000000000000000", // 500 tokens
      duration: 2592000, // 30 days
      roiPercentage: 300,
      isActive: true
    }
  ]);
});

// Contract information endpoint
app.get('/api/contracts', (req, res) => {
  res.json({
    nodeToken: nodeTokenAddress,
    nodePackages: nodePackagesAddress,
    network: {
      id: 137,
      name: "Polygon Mainnet",
      explorer: "https://polygonscan.com"
    }
  });
});

// Serve the SPA for any other routes
app.get('*', (req, res) => {
  // Create an enhanced HTML page with React-like components
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Node Packages Admin Panel</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css" rel="stylesheet">
  <style>
    body { 
      font-family: system-ui, -apple-system, sans-serif;
      line-height: 1.6;
      padding: 0;
      margin: 0;
      color: #333;
      background-color: #f8f9fa;
    }
    .header {
      background-color: #3182ce;
      color: white;
      padding: 20px;
      margin-bottom: 30px;
    }
    .navbar {
      background-color: #2a6fc7;
      padding: 0.5rem 1rem;
    }
    .nav-link {
      color: rgba(255,255,255,0.8) !important;
      padding: 0.5rem 1rem;
      margin: 0 0.25rem;
      border-radius: 0.25rem;
      transition: all 0.2s;
    }
    .nav-link:hover, .nav-link.active {
      color: white !important;
      background-color: rgba(255,255,255,0.1);
    }
    .card {
      margin-bottom: 20px;
      border: none;
      box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
      border-radius: 0.5rem;
      overflow: hidden;
    }
    .card-header {
      background-color: #f8f9fa;
      border-bottom: 1px solid rgba(0,0,0,0.1);
      padding: 1rem;
    }
    .text-info-bg {
      background-color: #e3f2fd;
      color: #0d6efd;
      padding: 10px;
      border-radius: 5px;
      margin-bottom: 20px;
      font-weight: 500;
    }
    .text-warning-bg {
      background-color: #fff3cd;
      color: #856404;
      padding: 10px;
      border-radius: 5px;
      margin-bottom: 20px;
      font-weight: 500;
    }
    .badge {
      font-size: 85%;
      font-weight: 600;
    }
    .btn-connect {
      background-color: #2a6fc7;
      color: white;
      border: none;
      padding: 0.5rem 1.5rem;
      border-radius: 0.25rem;
      transition: all 0.2s;
    }
    .btn-connect:hover {
      background-color: #1d5ba9;
      color: white;
    }
    .admin-content {
      padding: 30px;
    }
    .wallet-info {
      background-color: rgba(240, 240, 240, 0.5);
      border-radius: 0.5rem;
      padding: 1rem;
      margin-bottom: 2rem;
    }
    .table th {
      font-weight: 600;
      color: #495057;
    }
    .status-indicator {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      display: inline-block;
      margin-right: 5px;
    }
    .status-active {
      background-color: #28a745;
    }
    .status-inactive {
      background-color: #dc3545;
    }
    .tab-content {
      padding: 2rem 0;
    }
    .form-control, .form-select {
      border-radius: 0.25rem;
      padding: 0.5rem 0.75rem;
      border: 1px solid #ced4da;
    }
    .form-label {
      margin-bottom: 0.5rem;
      font-weight: 500;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="container">
      <div class="row align-items-center">
        <div class="col-auto">
          <h3 class="mb-0">Node Packages Admin Panel</h3>
        </div>
        <div class="col text-end">
          <button class="btn btn-connect" id="connectButton">Connect Wallet</button>
        </div>
      </div>
    </div>
  </div>
  
  <nav class="navbar navbar-expand navbar-dark mb-4">
    <div class="container">
      <div class="collapse navbar-collapse">
        <ul class="navbar-nav" id="navTabs" role="tablist">
          <li class="nav-item">
            <a class="nav-link active" id="dashboard-tab" data-bs-toggle="tab" href="#dashboard" role="tab">Dashboard</a>
          </li>
          <li class="nav-item">
            <a class="nav-link" id="node-packages-tab" data-bs-toggle="tab" href="#node-packages" role="tab">Node Packages</a>
          </li>
          <li class="nav-item">
            <a class="nav-link" id="referral-settings-tab" data-bs-toggle="tab" href="#referral-settings" role="tab">Referral Settings</a>
          </li>
          <li class="nav-item">
            <a class="nav-link" id="prosperity-fund-tab" data-bs-toggle="tab" href="#prosperity-fund" role="tab">Prosperity Fund</a>
          </li>
        </ul>
      </div>
    </div>
  </nav>

  <div class="container">
    <div class="wallet-info">
      <div class="row align-items-center">
        <div class="col">
          <div id="walletStatus">
            <div class="text-warning-bg">
              Please connect your wallet to interact with the admin panel.
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="tab-content">
      <div class="tab-pane fade show active" id="dashboard" role="tabpanel">
        <h4 class="mb-4">Dashboard</h4>
        
        <div class="row">
          <div class="col-md-6">
            <div class="card">
              <div class="card-header">
                <h5 class="mb-0">Contract Information</h5>
              </div>
              <div class="card-body">
                <p><strong>Network:</strong> <span class="badge bg-primary">Polygon Mainnet</span></p>
                <p><strong>NodeToken:</strong> <a href="https://polygonscan.com/address/0xF3f6C7bF8B0781350e7122039219Dcb23d6643AB" target="_blank">0xF3f6C7bF8B0781350e7122039219Dcb23d6643AB</a></p>
                <p><strong>NodePackages:</strong> <a href="https://polygonscan.com/address/0xC8AC3954f9550Ef41705e9c0aE2179b8Df01CF4B" target="_blank">0xC8AC3954f9550Ef41705e9c0aE2179b8Df01CF4B</a></p>
              </div>
            </div>
          </div>
          
          <div class="col-md-6">
            <div class="card">
              <div class="card-header">
                <h5 class="mb-0">Quick Stats</h5>
              </div>
              <div class="card-body">
                <p><strong>Active Node Packages:</strong> <span id="activeNodePackages">3</span></p>
                <p><strong>Prosperity Fund Balance:</strong> <span id="fundBalance">1.0 ETH</span></p>
                <p><strong>Next Distribution:</strong> <span id="nextDistribution">20 days</span></p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="tab-pane fade" id="node-packages" role="tabpanel">
        <h4 class="mb-4">Node Packages Management</h4>
        
        <div class="text-info-bg mb-4">
          This section allows you to view and manage the node packages available for purchase.
        </div>
        
        <div class="table-responsive">
          <table class="table table-hover">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Price (Tokens)</th>
                <th>Duration</th>
                <th>ROI %</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="nodePackagesTable">
              <tr>
                <td>1</td>
                <td>Starter Node</td>
                <td>100</td>
                <td>30 days</td>
                <td>200%</td>
                <td><span class="status-indicator status-active"></span> Active</td>
                <td><button class="btn btn-sm btn-outline-primary disabled">Edit</button></td>
              </tr>
              <tr>
                <td>2</td>
                <td>Standard Node</td>
                <td>200</td>
                <td>30 days</td>
                <td>250%</td>
                <td><span class="status-indicator status-active"></span> Active</td>
                <td><button class="btn btn-sm btn-outline-primary disabled">Edit</button></td>
              </tr>
              <tr>
                <td>3</td>
                <td>Premium Node</td>
                <td>500</td>
                <td>30 days</td>
                <td>300%</td>
                <td><span class="status-indicator status-active"></span> Active</td>
                <td><button class="btn btn-sm btn-outline-primary disabled">Edit</button></td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div class="card mt-4">
          <div class="card-header">
            <h5 class="mb-0">Add New Package</h5>
          </div>
          <div class="card-body">
            <form>
              <div class="row">
                <div class="col-md-6">
                  <div class="mb-3">
                    <label for="packageName" class="form-label">Package Name</label>
                    <input type="text" class="form-control" id="packageName" placeholder="Enter package name">
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="mb-3">
                    <label for="packagePrice" class="form-label">Price (Tokens)</label>
                    <input type="number" class="form-control" id="packagePrice" placeholder="Enter price in tokens">
                  </div>
                </div>
              </div>
              
              <div class="row">
                <div class="col-md-6">
                  <div class="mb-3">
                    <label for="packageDuration" class="form-label">Duration (Days)</label>
                    <input type="number" class="form-control" id="packageDuration" placeholder="Enter duration in days">
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="mb-3">
                    <label for="packageROI" class="form-label">ROI Percentage</label>
                    <input type="number" class="form-control" id="packageROI" placeholder="Enter ROI percentage">
                  </div>
                </div>
              </div>
              
              <div class="mb-3">
                <div class="form-check">
                  <input class="form-check-input" type="checkbox" id="packageActive" checked>
                  <label class="form-check-label" for="packageActive">
                    Active Package
                  </label>
                </div>
              </div>
              
              <button type="button" class="btn btn-primary disabled">Add Package</button>
            </form>
          </div>
        </div>
      </div>
      
      <div class="tab-pane fade" id="referral-settings" role="tabpanel">
        <h4 class="mb-4">Referral Settings</h4>
        
        <div class="text-info-bg mb-4">
          Configure the referral reward percentages for each level in the seven-level structure.
        </div>
        
        <div class="row">
          <div class="col-md-12 mb-4">
            <div class="card">
              <div class="card-header">
                <h5 class="mb-0">Seven-Level Referral Percentages</h5>
              </div>
              <div class="card-body">
                <div class="row" id="referralPercentages">
                  <div class="col-md-4 col-lg-3 mb-3">
                    <div class="card">
                      <div class="card-body text-center">
                        <h6 class="card-title">Level 1</h6>
                        <h3 class="mb-3">10%</h3>
                        <input type="number" class="form-control form-control-sm mb-2" placeholder="New percentage">
                        <button class="btn btn-sm btn-primary disabled">Update</button>
                      </div>
                    </div>
                  </div>
                  <div class="col-md-4 col-lg-3 mb-3">
                    <div class="card">
                      <div class="card-body text-center">
                        <h6 class="card-title">Level 2</h6>
                        <h3 class="mb-3">3%</h3>
                        <input type="number" class="form-control form-control-sm mb-2" placeholder="New percentage">
                        <button class="btn btn-sm btn-primary disabled">Update</button>
                      </div>
                    </div>
                  </div>
                  <div class="col-md-4 col-lg-3 mb-3">
                    <div class="card">
                      <div class="card-body text-center">
                        <h6 class="card-title">Level 3</h6>
                        <h3 class="mb-3">2%</h3>
                        <input type="number" class="form-control form-control-sm mb-2" placeholder="New percentage">
                        <button class="btn btn-sm btn-primary disabled">Update</button>
                      </div>
                    </div>
                  </div>
                  <div class="col-md-4 col-lg-3 mb-3">
                    <div class="card">
                      <div class="card-body text-center">
                        <h6 class="card-title">Level 4</h6>
                        <h3 class="mb-3">2%</h3>
                        <input type="number" class="form-control form-control-sm mb-2" placeholder="New percentage">
                        <button class="btn btn-sm btn-primary disabled">Update</button>
                      </div>
                    </div>
                  </div>
                  <div class="col-md-4 col-lg-3 mb-3">
                    <div class="card">
                      <div class="card-body text-center">
                        <h6 class="card-title">Level 5</h6>
                        <h3 class="mb-3">1%</h3>
                        <input type="number" class="form-control form-control-sm mb-2" placeholder="New percentage">
                        <button class="btn btn-sm btn-primary disabled">Update</button>
                      </div>
                    </div>
                  </div>
                  <div class="col-md-4 col-lg-3 mb-3">
                    <div class="card">
                      <div class="card-body text-center">
                        <h6 class="card-title">Level 6</h6>
                        <h3 class="mb-3">1%</h3>
                        <input type="number" class="form-control form-control-sm mb-2" placeholder="New percentage">
                        <button class="btn btn-sm btn-primary disabled">Update</button>
                      </div>
                    </div>
                  </div>
                  <div class="col-md-4 col-lg-3 mb-3">
                    <div class="card">
                      <div class="card-body text-center">
                        <h6 class="card-title">Level 7</h6>
                        <h3 class="mb-3">1%</h3>
                        <input type="number" class="form-control form-control-sm mb-2" placeholder="New percentage">
                        <button class="btn btn-sm btn-primary disabled">Update</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="row">
          <div class="col-md-6">
            <div class="card">
              <div class="card-header">
                <h5 class="mb-0">Bulk Referral Bonus</h5>
              </div>
              <div class="card-body">
                <p>Current setting: <strong>10% bonus after every 10 referrals</strong></p>
                
                <div class="row g-3 align-items-center">
                  <div class="col-auto">
                    <label for="bulkReferralCount" class="form-label">Referral Count Threshold</label>
                    <input type="number" class="form-control" id="bulkReferralCount" value="10">
                  </div>
                  <div class="col-auto">
                    <label for="bulkReferralBonus" class="form-label">Bonus Percentage</label>
                    <input type="number" class="form-control" id="bulkReferralBonus" value="10">
                  </div>
                  <div class="col-12 mt-3">
                    <button class="btn btn-primary disabled">Update Bulk Referral Settings</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="tab-pane fade" id="prosperity-fund" role="tabpanel">
        <h4 class="mb-4">Prosperity Fund Management</h4>
        
        <div class="text-info-bg mb-4">
          Manage the community Prosperity Fund that collects 10% of all package purchases.
        </div>
        
        <div class="row">
          <div class="col-md-6">
            <div class="card">
              <div class="card-header">
                <h5 class="mb-0">Fund Status</h5>
              </div>
              <div class="card-body">
                <div class="mb-4">
                  <h3>1.0 ETH</h3>
                  <p class="text-muted">Current fund balance</p>
                </div>
                
                <div class="mb-4">
                  <div class="form-check form-switch">
                    <input class="form-check-input" type="checkbox" id="fundEnabled" checked>
                    <label class="form-check-label" for="fundEnabled">Fund Enabled</label>
                  </div>
                  <small class="text-muted">When enabled, 10% of all purchases go to the fund</small>
                </div>
                
                <button class="btn btn-primary disabled">Distribute Fund</button>
              </div>
            </div>
          </div>
          
          <div class="col-md-6">
            <div class="card">
              <div class="card-header">
                <h5 class="mb-0">Distribution Settings</h5>
              </div>
              <div class="card-body">
                <p><strong>Current Period:</strong> 30 days</p>
                <p><strong>Next Distribution:</strong> In 20 days</p>
                
                <div class="mb-3">
                  <label for="distributionPeriod" class="form-label">New Distribution Period (days)</label>
                  <input type="number" class="form-control" id="distributionPeriod" placeholder="Enter days">
                </div>
                
                <button class="btn btn-primary disabled">Update Period</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/js/bootstrap.bundle.min.js"></script>
  <script>
    document.addEventListener('DOMContentLoaded', function() {
      // Initialize tabs
      const triggerTabList = [].slice.call(document.querySelectorAll('#navTabs a'));
      triggerTabList.forEach(function(triggerEl) {
        triggerEl.addEventListener('click', function(event) {
          event.preventDefault();
          
          // Remove active class from all tabs
          triggerTabList.forEach(tab => tab.classList.remove('active'));
          
          // Add active class to clicked tab
          triggerEl.classList.add('active');
          
          // Hide all tab panes
          document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.remove('show', 'active');
          });
          
          // Show the selected tab pane
          const tabId = triggerEl.getAttribute('href');
          document.querySelector(tabId).classList.add('show', 'active');
        });
      });
      
      // Wallet connection
      const connectButton = document.getElementById('connectButton');
      connectButton.addEventListener('click', function() {
        const walletStatus = document.getElementById('walletStatus');
        
        // In a real implementation, this would connect to MetaMask
        walletStatus.innerHTML = \`
          <p class="mb-0"><strong>Connected Wallet:</strong> 0x1234...5678</p>
          <p class="mb-0"><strong>Network:</strong> <span class="badge bg-primary">Base Sepolia</span></p>
          <p class="mb-0 mt-2 text-info-bg">To fully interact with the contracts, please use the React implementation with wallet integration.</p>
        \`;
        
        connectButton.textContent = 'Connected';
        connectButton.disabled = true;
      });
    });
  </script>
</body>
</html>
  `;
  
  res.send(html);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});