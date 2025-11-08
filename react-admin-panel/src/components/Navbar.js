import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Flex, 
  Button, 
  Text, 
  useColorMode, 
  useToast, 
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Badge,
  Tooltip,
  HStack,
  Icon,
  Divider,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  VStack,
  ListItem,
  UnorderedList
} from '@chakra-ui/react';
import { connectWallet } from '../utils/ethers';
import { CHAIN_ID, NETWORK_NAME } from '../config';

const Navbar = ({ account, setAccount }) => {
  const { colorMode, toggleColorMode } = useColorMode();
  const toast = useToast();
  const [networkMismatch, setNetworkMismatch] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();

  // Check if user is on the correct network
  useEffect(() => {
    const checkNetwork = async () => {
      if (!account) return;
      
      try {
        const provider = account.signer.provider;
        const network = await provider.getNetwork();
        
        // Check if current network matches required network
        if (network.chainId !== CHAIN_ID) {
          setNetworkMismatch(true);
          
          toast({
            title: 'Wrong Network',
            description: `Please switch to ${NETWORK_NAME}`,
            status: 'warning',
            duration: 10000,
            isClosable: true,
          });
        } else {
          setNetworkMismatch(false);
        }
      } catch (error) {
        console.error('Failed to check network:', error);
      }
    };
    
    checkNetwork();
  }, [account, toast]);

  const handleConnectWallet = async () => {
    try {
      const { address, signer } = await connectWallet();
      setAccount({ address, signer });
      
      toast({
        title: 'Wallet connected',
        description: `Connected to ${address.slice(0, 6)}...${address.slice(-4)}`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      
      let errorMessage = error.message;
      
      // Provide more user-friendly error messages
      if (errorMessage.includes('user rejected')) {
        errorMessage = 'You rejected the connection request. Please approve the MetaMask connection to continue.';
      } else if (errorMessage.includes('already pending')) {
        errorMessage = 'There is already a pending connection request. Please check your wallet.';
      } else if (errorMessage.includes('not installed')) {
        errorMessage = 'MetaMask is not installed. Please install MetaMask and try again.';
      }
      
      toast({
        title: 'Failed to connect wallet',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleDisconnect = () => {
    setAccount(null);
    toast({
      title: 'Wallet disconnected',
      status: 'info',
      duration: 3000,
      isClosable: true,
    });
  };

  return (
    <>
      <Flex
        as="nav"
        align="center"
        justify="space-between"
        wrap="wrap"
        padding="1.5rem"
        bg={colorMode === 'light' ? 'white' : 'gray.800'}
        color={colorMode === 'light' ? 'gray.800' : 'white'}
        boxShadow="md"
      >
        <Flex align="center" mr={5}>
          <Text fontSize="xl" fontWeight="bold">
            Node Packages Admin
          </Text>
          <Button size="xs" ml={3} colorScheme="blue" variant="outline" onClick={onOpen}>
            Help
          </Button>
        </Flex>

        <Box display="flex" alignItems="center">
          <Button onClick={toggleColorMode} mr={4} size="sm">
            {colorMode === 'light' ? 'Dark Mode' : 'Light Mode'}
          </Button>
          
          {account ? (
            <HStack>
              {networkMismatch && (
                <Tooltip label={`Please switch to ${NETWORK_NAME}`}>
                  <Badge colorScheme="red" mr={2}>Wrong Network</Badge>
                </Tooltip>
              )}
              <Menu>
                <MenuButton as={Button} size="sm" colorScheme="blue">
                  {account.address.slice(0, 6)}...{account.address.slice(-4)}
                </MenuButton>
                <MenuList>
                  <MenuItem onClick={() => {
                    navigator.clipboard.writeText(account.address);
                    toast({
                      title: 'Address copied',
                      status: 'info',
                      duration: 2000,
                      isClosable: true,
                    });
                  }}>
                    Copy Address
                  </MenuItem>
                  <MenuItem onClick={handleDisconnect}>Disconnect Wallet</MenuItem>
                </MenuList>
              </Menu>
            </HStack>
          ) : (
            <Button
              onClick={handleConnectWallet}
              colorScheme="blue"
              size="sm"
            >
              Connect Wallet
            </Button>
          )}
        </Box>
      </Flex>

      {/* Help Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Admin Panel Guide</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack align="start" spacing={4}>
              <Box>
                <Text fontWeight="bold" mb={2}>Getting Started</Text>
                <UnorderedList spacing={2}>
                  <ListItem>Click "Connect Wallet" to connect your MetaMask wallet</ListItem>
                  <ListItem>Ensure you're connected to {NETWORK_NAME} (ChainID: {CHAIN_ID})</ListItem>
                  <ListItem>Your wallet must be the contract owner to use administrative functions</ListItem>
                </UnorderedList>
              </Box>
              
              <Divider />
              
              <Box>
                <Text fontWeight="bold" mb={2}>Administrative Functions</Text>
                <UnorderedList spacing={2}>
                  <ListItem><strong>Node Packages</strong>: Create, update, and manage node packages</ListItem>
                  <ListItem><strong>Referral Settings</strong>: Configure seven-level and ascension bonus rewards</ListItem>
                  <ListItem><strong>Prosperity Fund</strong>: Manage fund settings and distribution</ListItem>
                </UnorderedList>
              </Box>
              
              <Divider />
              
              <Box>
                <Text fontWeight="bold" mb={2}>Troubleshooting</Text>
                <UnorderedList spacing={2}>
                  <ListItem>If transactions fail, check that you're on the correct network</ListItem>
                  <ListItem>Ensure your wallet has enough Base Sepolia ETH for gas fees</ListItem>
                  <ListItem>After network changes, you may need to reconnect your wallet</ListItem>
                </UnorderedList>
              </Box>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={onClose}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default Navbar;