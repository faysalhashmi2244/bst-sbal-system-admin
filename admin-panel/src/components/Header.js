import React from 'react';
import {
  Box,
  Flex,
  Button,
  Text,
  Heading,
  useColorModeValue,
  HStack,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Badge
} from '@chakra-ui/react';
import { useWeb3 } from '../contexts/Web3Context';

const Header = () => {
  const { account, isConnected, connectWallet, disconnectWallet, isOwner, networkError, chainId } = useWeb3();

  // Truncate address for display
  const displayAddress = account ? `${account.slice(0, 6)}...${account.slice(-4)}` : '';

  return (
    <Box
      as="header"
      bg={useColorModeValue('white', 'gray.800')}
      px={4}
      py={3}
      boxShadow="md"
      position="sticky"
      top={0}
      zIndex={10}
    >
      <Flex
        alignItems="center"
        justifyContent="space-between"
        maxW="container.xl"
        mx="auto"
      >
        <Heading size="md" color="brand.600">Node Packages Admin</Heading>

        <HStack spacing={4}>
          {networkError && (
            <Badge colorScheme="red" p={2} borderRadius="md">
              {networkError}
            </Badge>
          )}

          {isConnected ? (
            <Menu>
              <MenuButton
                as={Button}
                colorScheme="brand"
                variant="outline"
                rightIcon={
                  <Box w={3} h={3} borderRadius="full" bg={isOwner ? 'green.400' : 'gray.400'} />
                }
              >
                {displayAddress}
              </MenuButton>
              <MenuList>
                <MenuItem as={Text} fontWeight="bold" color="gray.500">
                  {isOwner ? 'Owner ✅' : 'Not Owner'}
                </MenuItem>
                <MenuItem onClick={disconnectWallet}>Disconnect</MenuItem>
              </MenuList>
            </Menu>
          ) : (
            <Button colorScheme="brand" onClick={connectWallet}>
              Connect Wallet
            </Button>
          )}
        </HStack>
      </Flex>
    </Box>
  );
};

export default Header;