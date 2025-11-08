// Network configuration for Base Sepolia Testnet
export const NODE_TOKEN_ADDRESS = "0x35024799A05Ed370CE0f8F9b803A5BC0c072E854";
export const NODE_PACKAGES_ADDRESS = "0x271d19C69fF93F9FaB2E35bcEb31A871A9d62657";
export const CHAIN_ID = 84532n; // Base Sepolia testnet
export const NETWORK_NAME = "Base Sepolia";
export const EXPLORER_URL = "https://sepolia.basescan.org";
export const RPC_URL = "https://sepolia.base.org";

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