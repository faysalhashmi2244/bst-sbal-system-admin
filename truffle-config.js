/**
 * Truffle configuration file
 */
require('dotenv').config();
const HDWalletProvider = require('@truffle/hdwallet-provider');

module.exports = {
  /**
   * Networks define how you connect to your ethereum client and let you set the
   * defaults web3 uses to send transactions.
   */
  networks: {
    // Development network - Ganache
    development: {
     host: "127.0.0.1",     // Localhost
     port: 8545,            // Standard Ganache port
     network_id: "*",       // Any network ID
    },
    
    // Truffle develop network
    develop: {
      host: "127.0.0.1",
      port: 9545,
      network_id: "*",
    },
    
    // Custom network for testing with specific port
    custom: {
      host: "127.0.0.1",
      port: 8546,            // Custom Ganache port
      network_id: "*",       // Any network ID
    },
    
    // Base Sepolia Testnet configuration
    baseSepolia: {
      provider: () => new HDWalletProvider(
        process.env.BASE_SEPOLIA_PRIVATE_KEY,
        process.env.BASE_SEPOLIA_RPC_URL
      ),
      network_id: 84532,  // Base Sepolia's network ID
      // confirmations: 2,   // # of confirmations to wait between deployments
      // timeoutBlocks: 200, // # of blocks before a deployment times out
      skipDryRun: true,   // Skip dry run before migrations
      // gas: 3000000,       // Gas limit
      // gasPrice: 100000000, // 0.1 Gwei - Base has cheap gas
      verify: {
        apiUrl: 'https://api.etherscan.io/v2/api?chainid=84532',
        apiKey: "1HUI6UTTVE64IMQYPH85UCWA12JXXM4CEQ",
        explorerUrl: 'https://sepolia.basescan.org/address',
      },
       
    },
  },

  // Configure your compilers
  compilers: {
    solc: {
      version: "0.8.8",    // Set to match OpenZeppelin requirements
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        },
      }
    }
  },

  // Mocha testing framework configuration
  mocha: {
    timeout: 100000
  },
  
  // Contract verification plugin
  plugins: [
    'truffle-plugin-verify'
  ],
  
  // API keys for contract verification
  api_keys: {
    basescan: process.env.BASESCAN_API_KEY
  }
};
