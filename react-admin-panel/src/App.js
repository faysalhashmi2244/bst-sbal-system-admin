import React, { useState, useCallback, createContext } from 'react';
import {
  Box,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Container,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  CloseButton,
  Button,
  Flex,
  useToast,
  HStack,
  Text,
  Spinner
} from '@chakra-ui/react';
import Navbar from './components/Navbar';
import NetworkChecker from './components/NetworkChecker';
import NodePackagesManager from './components/NodePackagesManager';
import ReferralSettings from './components/ReferralSettings';
import ProsperityFund from './components/ProsperityFund';
import ReferralAnalytics from './components/ReferralAnalytics';
import UserManagement from './components/UserManagement';
import MonthlyUserAnalytics from './components/MonthlyUserAnalytics';
import PackageAscensionBonusAnalytics from './components/PackageAscensionBonusAnalytics';
// import AdminMarketingBonus from './components/AdminMarketingBonus';
import LiquidityWithdrawal from './components/LiquidityWithdrawal';
import RewardsDiscountSettings from './components/RewardsDiscountSettings';
import FirstTimeUserFeeSettings from './components/FirstTimeUserFeeSettings';

// Create a context for triggering data refreshes
export const RefreshContext = createContext();

function App() {
  const [account, setAccount] = useState(null);
  const [error, setError] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const toast = useToast();

  // Function to clear errors
  const clearError = () => setError(null);

  // Function to refresh all data
  const refreshData = useCallback(() => {
    if (!account) {
      toast({
        title: 'Wallet not connected',
        description: 'Please connect your wallet to refresh data',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsRefreshing(true);
    setRefreshTrigger(prev => prev + 1);
    
    toast({
      title: 'Refreshing data',
      description: 'Fetching latest blockchain data...',
      status: 'info',
      duration: 2000,
      isClosable: true,
    });
    
    // Set a timeout to hide the refreshing indicator after a reasonable time
    setTimeout(() => {
      setIsRefreshing(false);
      toast({
        title: 'Data refreshed',
        description: 'Successfully updated with the latest blockchain data',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    }, 2000);
  }, [account, toast]);

  return (
    <RefreshContext.Provider value={{ refreshTrigger, refreshData }}>
      <Box minH="100vh" bg="gray.50">
        <Navbar account={account} setAccount={setAccount} />
        
        <Container maxW="container.xl" py={8}>
          {/* Network error checker */}
          <NetworkChecker account={account} />
          
          {/* Generic error handling */}
          {error && (
            <Alert status="error" mb={6}>
              <AlertIcon />
              <AlertTitle mr={2}>Error!</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
              <CloseButton position="absolute" right="8px" top="8px" onClick={clearError} />
            </Alert>
          )}
          
          {/* Refresh button for data */}
          <Flex justifyContent="flex-end" mb={4}>
            <HStack>
              {isRefreshing && (
                <HStack>
                  <Spinner size="sm" />
                  <Text>Refreshing...</Text>
                </HStack>
              )}
              <Button 
                onClick={refreshData} 
                colorScheme="blue" 
                size="sm" 
                isDisabled={!account || isRefreshing}
                leftIcon={<RefreshIcon />}
              >
                Refresh Data
              </Button>
            </HStack>
          </Flex>
          
          <Tabs colorScheme="blue" variant="enclosed">
            <TabList>
              <Tab>Node Packages</Tab>
              <Tab>Referral Settings</Tab>
              <Tab>Prosperity Fund</Tab>
              {/* <Tab>Admin Marketing Bonus</Tab> */}
              <Tab>Liquidity Withdrawal</Tab>
              <Tab>Rewards Discount</Tab>
              <Tab>First-Time User Fee</Tab>
              <Tab>Referral Analytics</Tab>
              <Tab>User Management</Tab>
              <Tab>Monthly User Analytics</Tab>
              <Tab>Package Ascension</Tab>
            </TabList>
            
            <TabPanels>
              <TabPanel>
                <NodePackagesManager account={account} setError={setError} />
              </TabPanel>
              <TabPanel>
                <ReferralSettings account={account} setError={setError} />
              </TabPanel>
              <TabPanel>
                <ProsperityFund account={account} setError={setError} />
              </TabPanel>
              {/* <TabPanel>
                <AdminMarketingBonus account={account} setError={setError} refreshTrigger={refreshTrigger} />
              </TabPanel> */}
              <TabPanel>
                <LiquidityWithdrawal account={account} setError={setError} refreshTrigger={refreshTrigger} />
              </TabPanel>
              <TabPanel>
                <RewardsDiscountSettings account={account} setError={setError} refreshTrigger={refreshTrigger} />
              </TabPanel>
              <TabPanel>
                <FirstTimeUserFeeSettings account={account} setError={setError} refreshTrigger={refreshTrigger} />
              </TabPanel>
              <TabPanel>
                <ReferralAnalytics account={account} setError={setError} />
              </TabPanel>
              <TabPanel>
                <UserManagement account={account} setError={setError} />
              </TabPanel>
              <TabPanel>
                <MonthlyUserAnalytics account={account} setError={setError} />
              </TabPanel>
              <TabPanel>
                <PackageAscensionBonusAnalytics account={account} setError={setError} />
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Container>
      </Box>
    </RefreshContext.Provider>
  );
}

// Simple refresh icon component
const RefreshIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path 
      d="M4 12C4 7.58172 7.58172 4 12 4C16.4183 4 20 7.58172 20 12C20 16.4183 16.4183 20 12 20C9.25022 20 6.82447 18.5799 5.38639 16.4194" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round"
    />
    <path d="M9 4.5L4 4L4 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default App;