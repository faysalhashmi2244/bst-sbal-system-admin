import { ethers } from 'ethers';
import NodeTokenABI from '../contracts/NodeTokenABI.json';
import NodePackagesABI from '../contracts/NodePackagesABI.json';

// Environment variables
const NODE_TOKEN_ADDRESS = process.env.REACT_APP_NODE_TOKEN_ADDRESS || "0x35024799A05Ed370CE0f8F9b803A5BC0c072E854";
const NODE_PACKAGES_ADDRESS = process.env.REACT_APP_NODE_PACKAGES_ADDRESS || "0x271d19C69fF93F9FaB2E35bcEb31A871A9d62657";
const BASE_SEPOLIA_RPC_URL = process.env.REACT_APP_BASE_SEPOLIA_RPC_URL || 'https://rpc.ankr.com/base_sepolia/d8b45c6ca36d9f7e8f419eaf46b61b646e579e1c2e724865e3a8da0a5974fd8f';
// Create provider
export const getProvider = () => {
  return new ethers.JsonRpcProvider(BASE_SEPOLIA_RPC_URL);
};

// Get signer
export const getSigner = async () => {
  try {
    if (!window.ethereum) {
      throw new Error('Ethereum wallet is not detected. Please install MetaMask or another Ethereum wallet.');
    }
    
    const provider = new ethers.BrowserProvider(window.ethereum);
    return await provider.getSigner();
  } catch (error) {
    console.error('Error getting signer:', error);
    throw error;
  }
};

// Create contract instances
export const getNodeTokenContract = async (signerOrProvider) => {
  try {
    return new ethers.Contract(
      NODE_TOKEN_ADDRESS,
      NodeTokenABI,
      signerOrProvider || getProvider()
    );
  } catch (error) {
    console.error('Error getting NodeToken contract:', error);
    throw error;
  }
};

export const getNodePackagesContract = async (signerOrProvider) => {
  try {
    return new ethers.Contract(
      NODE_PACKAGES_ADDRESS,
      NodePackagesABI,
      signerOrProvider || getProvider()
    );
  } catch (error) {
    console.error('Error getting NodePackages contract:', error);
    throw error;
  }
};

// Connect wallet
export const connectWallet = async () => {
  try {
    if (!window.ethereum) {
      throw new Error('Ethereum wallet is not detected. Please install MetaMask or another Ethereum wallet.');
    }
    
    await window.ethereum.request({ method: 'eth_requestAccounts' });
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const address = await signer.getAddress();
    
    // Check if we're on the correct network (Base Sepolia)
    const network = await provider.getNetwork();
    const chainId = network.chainId;
    
    if (chainId !== (84532)) {
      // If not on Base Sepolia, request network switch
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x14a34' }], // 0x14a34 is hex for 84532
        });
      } catch (switchError) {
        // If the network doesn't exist in the wallet, add it
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: '0x14a34',
                chainName: 'Base Sepolia',
                nativeCurrency: {
                  name: 'ETH',
                  symbol: 'ETH',
                  decimals: 18
                },
                rpcUrls: ['https://sepolia.base.org'],
                blockExplorerUrls: ['https://sepolia.basescan.org/'],
              },
            ],
          });
        } else {
          throw switchError;
        }
      }
    }
    
    return { address, signer };
  } catch (error) {
    console.error('Error connecting wallet:', error);
    throw error;
  }
};

// Format ethers to human-readable values
export const formatEther = (value) => {
  return ethers.formatEther(value);
};

// Parse human-readable values to ethers
export const parseEther = (value) => {
  return ethers.parseEther(value);
};