import React, { createContext, useState, useEffect, useContext } from 'react';
import { ethers } from 'ethers';
import NodeTokenABI from '../abis/NodeToken.json';
import NodePackagesABI from '../abis/NodePackages.json';
import { 
  NODE_TOKEN_ADDRESS, 
  NODE_PACKAGES_ADDRESS,
  CHAIN_ID,
  NETWORK_NAME
} from '../config';

// Create context
const Web3Context = createContext();

export const Web3Provider = ({ children }) => {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [nodeToken, setNodeToken] = useState(null);
  const [nodePackages, setNodePackages] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [chainId, setChainId] = useState(null);
  const [networkError, setNetworkError] = useState(null);

  // Connect to MetaMask
  const connectWallet = async () => {
    try {
      if (window.ethereum) {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        
        const provider = new ethers.BrowserProvider(window.ethereum);
        const network = await provider.getNetwork();
        setChainId(Number(network.chainId));
        
        if (Number(network.chainId) !== CHAIN_ID) {
          setNetworkError(`Please connect to ${NETWORK_NAME}`);
          return;
        }
        
        setNetworkError(null);
        setProvider(provider);
        
        const signer = await provider.getSigner();
        setSigner(signer);
        
        const address = await signer.getAddress();
        setAccount(address);
        
        // Initialize contracts
        const tokenContract = new ethers.Contract(NODE_TOKEN_ADDRESS, NodeTokenABI.abi, signer);
        const packagesContract = new ethers.Contract(NODE_PACKAGES_ADDRESS, NodePackagesABI.abi, signer);
        
        setNodeToken(tokenContract);
        setNodePackages(packagesContract);
        
        // Check if user is owner
        const owner = await packagesContract.owner();
        setIsOwner(owner.toLowerCase() === address.toLowerCase());
        
        setIsConnected(true);
      } else {
        alert('Please install MetaMask!');
      }
    } catch (error) {
      console.error('Error connecting to wallet:', error);
      setNetworkError('Error connecting to wallet. Please try again.');
    }
  };

  // Disconnect wallet
  const disconnectWallet = () => {
    setAccount(null);
    setSigner(null);
    setNodeToken(null);
    setNodePackages(null);
    setIsOwner(false);
    setIsConnected(false);
  };

  // Listen for account changes
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
          disconnectWallet();
        } else {
          setAccount(accounts[0]);
          connectWallet(); // Refresh connection
        }
      });

      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeAllListeners('accountsChanged');
        window.ethereum.removeAllListeners('chainChanged');
      }
    };
  }, []);

  return (
    <Web3Context.Provider
      value={{
        account,
        provider,
        signer,
        nodeToken,
        nodePackages,
        isOwner,
        isConnected,
        chainId,
        networkError,
        connectWallet,
        disconnectWallet,
      }}
    >
      {children}
    </Web3Context.Provider>
  );
};

// Custom hook for using the Web3 context
export const useWeb3 = () => useContext(Web3Context);

export default Web3Context;