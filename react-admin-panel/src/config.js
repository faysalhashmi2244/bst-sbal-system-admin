// Network configuration for polygon mainnet
export const NODE_TOKEN_ADDRESS = "0xF3f6C7bF8B0781350e7122039219Dcb23d6643AB";
export const NODE_PACKAGES_ADDRESS = "0xC8AC3954f9550Ef41705e9c0aE2179b8Df01CF4B";
export const CHAIN_ID = 137n; // polygon mainnet
export const NETWORK_NAME = "Polygon Mainnet";
export const EXPLORER_URL = "https://polygonscan.com";
export const RPC_URL = "https://polygon-rpc.com";

// Application configuration
export const PROJECT_NAME = "Node Packages Admin";
export const DEFAULT_GAS_LIMIT = 3000000;
export const DEFAULT_GAS_PRICE = 5000000000; // 5 gwei

// For Web3Modal if needed
export const PROJECT_ID = ""; // Replace with your Web3Modal project ID if you have one

// Contract ABI - minimal ABI for userAscensionBonusReferralCount function
export const NODE_PACKAGES_ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "packageId",
        "type": "uint256"
      }
    ],
    "name": "userAscensionBonusReferralCount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];