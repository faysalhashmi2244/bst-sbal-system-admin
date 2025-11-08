import React, { useState, useEffect } from 'react';
import {
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Button,
  Box,
  useToast,
  Flex,
} from '@chakra-ui/react';
import { CHAIN_ID, NETWORK_NAME, EXPLORER_URL } from '../config';

const NetworkChecker = ({ account }) => {
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(true);
  const [networkDetails, setNetworkDetails] = useState(null);
  const toast = useToast();

  useEffect(() => {
    const checkNetwork = async () => {
      if (!account) return;

      try {
        const provider = account.signer.provider;
        const network = await provider.getNetwork();
        
        setNetworkDetails({
          name: network.name,
          chainId: network.chainId
        });
        console.log(network.chainId)
        if (network.chainId !== CHAIN_ID) {
          setIsCorrectNetwork(false);
        } else {
          setIsCorrectNetwork(true);
        }
      } catch (error) {
        console.error('Error checking network:', error);
        toast({
          title: 'Network Check Failed',
          description: 'Could not verify your current network',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    };

    checkNetwork();
  }, [account, toast]);

  const handleSwitchNetwork = async () => {
    if (!window.ethereum) {
      toast({
        title: 'MetaMask not detected',
        description: 'Please install MetaMask to switch networks',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    try {
      // Request network switch
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${CHAIN_ID.toString(16)}` }],
      });
      
      toast({
        title: 'Network Switch Requested',
        description: 'Please approve the network switch in your wallet',
        status: 'info',
        duration: 5000,
        isClosable: true,
      });
    } catch (switchError) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        toast({
          title: 'Network Not Found',
          description: `Please add ${NETWORK_NAME} to your wallet manually`,
          status: 'warning',
          duration: 8000,
          isClosable: true,
        });
      } else {
        console.error('Error switching network:', switchError);
        toast({
          title: 'Failed to Switch Network',
          description: switchError.message,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    }
  };

  if (!account || isCorrectNetwork) {
    return null;
  }

  return (
    <Alert status="warning" mb={6}>
      <AlertIcon />
      <Box flex="1">
        <AlertTitle>Wrong Network Detected</AlertTitle>
        <AlertDescription display="block">
          You are connected to {networkDetails?.name || 'Unknown Network'} (Chain ID: {networkDetails?.chainId || 'Unknown'}).
          Please switch to {NETWORK_NAME} (Chain ID: {CHAIN_ID}) to use this admin panel.
        </AlertDescription>
      </Box>
      <Flex>
        <Button 
          colorScheme="blue" 
          onClick={handleSwitchNetwork}
          size="sm"
          mr={2}
        >
          Switch Network
        </Button>
        <Button 
          as="a" 
          href={EXPLORER_URL} 
          target="_blank" 
          rel="noopener noreferrer"
          colorScheme="gray" 
          size="sm"
        >
          Explorer
        </Button>
      </Flex>
    </Alert>
  );
};

export default NetworkChecker;