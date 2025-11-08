import React, { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Text,
  Card,
  CardHeader,
  CardBody,
  SimpleGrid,
  Button,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  FormControl,
  FormLabel,
  Input,
  Switch,
  HStack,
  useToast,
  Divider,
} from '@chakra-ui/react';
import { getNodePackagesContract, formatEther } from '../utils/ethers';

const ProsperityFund = ({ account }) => {
  const [fundBalance, setFundBalance] = useState('0');
  const [distributionEnabled, setDistributionEnabled] = useState(false);
  const [distributionPeriod, setDistributionPeriod] = useState(0);
  const [fundPercentage, setFundPercentage] = useState(0);
  const [lastDistributionTime, setLastDistributionTime] = useState(0);
  const [newDistributionPeriod, setNewDistributionPeriod] = useState('');
  const [newFundPercentage, setNewFundPercentage] = useState('');
  const [loading, setLoading] = useState(true);
  const [timeUntilNextDistribution, setTimeUntilNextDistribution] = useState('');
  const [packageFundBalances, setPackageFundBalances] = useState([]);
  const [currentCycle, setCurrentCycle] = useState(0);
  const toast = useToast();

  const fetchFundData = async () => {
    try {
      if (!account) return;
      
      setLoading(true);
      const nodePackagesContract = await getNodePackagesContract(account.signer);
      
      // Fetch fund data
      const balance = await nodePackagesContract.prosperityFundBalance();
      const isEnabled = await nodePackagesContract.prosperityFundEnabled();
      const period = await nodePackagesContract.prosperityFundDistributionDays();
      const percentage = await nodePackagesContract.prosperityFundPercentage();
      const lastTime = await nodePackagesContract.lastProsperityFundDistribution();
      const cycle = await nodePackagesContract.currentProsperityFundCycle();
      
      // Fetch package-wise fund balances
      const packageBalances = await nodePackagesContract.getAllPackageProsperityFundBalances();
      
      setFundBalance(balance.toString());
      setDistributionEnabled(isEnabled);
      setDistributionPeriod(Number(period));
      setFundPercentage(Number(percentage));
      setLastDistributionTime(Number(lastTime));
      setCurrentCycle(Number(cycle));
      
      // Process package fund balances
      const processedPackageBalances = packageBalances[0].map((packageId, index) => ({
        packageId: Number(packageId),
        balance: formatEther(packageBalances[1][index]),
        balanceWei: packageBalances[1][index].toString()
      }));
      setPackageFundBalances(processedPackageBalances);
      
      // Calculate time until next distribution
      if (isEnabled && Number(lastTime) > 0) {
        const nextDistributionTime = Number(lastTime) + (Number(period) * 24*60*60);
        const currentTime = Math.floor(Date.now() / 1000);
        const timeLeft = nextDistributionTime - currentTime;
        console.log("prep", currentTime, period)
        
        if (timeLeft > 0) {
          const days = Math.floor(timeLeft / (24 * 60 * 60));
          const hours = Math.floor((timeLeft % (24 * 60 * 60)) / (60 * 60));
          setTimeUntilNextDistribution(`${days} days, ${hours} hours`);
        } else {
          setTimeUntilNextDistribution('Ready for distribution');
        }
      } else {
        setTimeUntilNextDistribution('N/A');
      }
    } catch (error) {
      console.error('Error fetching fund data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch prosperity fund data',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (account) {
      fetchFundData();
      
      // Set up interval to update time remaining
      const interval = setInterval(() => {
        if (distributionEnabled && lastDistributionTime > 0) {
          const nextDistributionTime = lastDistributionTime + distributionPeriod;
          const currentTime = Math.floor(Date.now() / 1000);
          const timeLeft = nextDistributionTime - currentTime;
          
          if (timeLeft > 0) {
            const days = Math.floor(timeLeft / (24 * 60 * 60));
            const hours = Math.floor((timeLeft % (24 * 60 * 60)) / (60 * 60));
            setTimeUntilNextDistribution(`${days} days, ${hours} hours`);
          } else {
            setTimeUntilNextDistribution('Ready for distribution');
          }
        }
      }, 60000); // Update every minute
      
      return () => clearInterval(interval);
    }
  }, [account, distributionEnabled, lastDistributionTime, distributionPeriod]);

  const updateProsperityFundSettings = async () => {
    try {
      if (!account) {
        toast({
          title: 'Error',
          description: 'Please connect your wallet first',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        return;
      }

      const periodInDays = parseInt(newDistributionPeriod) || distributionPeriod;
      const percentage = parseInt(newFundPercentage) || fundPercentage;
      
      if (percentage < 0 || percentage > 100) {
        toast({
          title: 'Error',
          description: 'Fund percentage must be between 0 and 100',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        return;
      }

      if (periodInDays < 1) {
        toast({
          title: 'Error',
          description: 'Distribution period must be at least 1 day',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        return;
      }
      
      const nodePackagesContract = await getNodePackagesContract(account.signer);
      
      const tx = await nodePackagesContract.updateProsperityFundSettings(
        distributionEnabled,
        percentage,
        periodInDays
      ); 
      
      toast({
        title: 'Transaction Sent',
        description: 'Updating prosperity fund settings... Please wait for confirmation',
        status: 'info',
        duration: 5000,
        isClosable: true,
      });
      
      await tx.wait();
      
      toast({
        title: 'Success',
        description: 'Prosperity fund settings updated successfully',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      // Clear inputs and refresh data
      setNewDistributionPeriod('');
      setNewFundPercentage('');
      await fetchFundData();
    } catch (error) {
      console.error('Error updating prosperity fund settings:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update prosperity fund settings',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const toggleDistributionEnabled = async () => {
    try {
      if (!account) {
        toast({
          title: 'Error',
          description: 'Please connect your wallet first',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        return;
      }
      
      const nodePackagesContract = await getNodePackagesContract(account.signer);
      
      const tx = await nodePackagesContract.updateProsperityFundSettings(
        !distributionEnabled,
        fundPercentage,
        distributionPeriod
      );
      
      toast({
        title: 'Transaction Sent',
        description: `${distributionEnabled ? 'Disabling' : 'Enabling'} prosperity fund... Please wait for confirmation`,
        status: 'info',
        duration: 5000,
        isClosable: true,
      });
      
      await tx.wait();
      
      toast({
        title: 'Success',
        description: `Prosperity fund ${distributionEnabled ? 'disabled' : 'enabled'} successfully`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      await fetchFundData();
    } catch (error) {
      console.error('Error toggling prosperity fund:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to toggle prosperity fund',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const updateDistributionPeriod = async () => {
    try {
      if (!account) {
        toast({
          title: 'Error',
          description: 'Please connect your wallet first',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        return;
      }
      
      const periodInDays = parseInt(newDistributionPeriod);
      if (isNaN(periodInDays) || periodInDays < 1) {
        toast({
          title: 'Error',
          description: 'Distribution period must be at least 1 day',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        return;
      }
      
      const periodInSeconds = periodInDays * 24 * 60 * 60;
      
      const nodePackagesContract = await getNodePackagesContract(account.signer);
      
      const tx = await nodePackagesContract.updateProsperityFundSettings(periodInSeconds);
      
      toast({
        title: 'Transaction Sent',
        description: 'Updating distribution period... Please wait for confirmation',
        status: 'info',
        duration: 5000,
        isClosable: true,
      });
      
      await tx.wait();
      
      toast({
        title: 'Success',
        description: 'Distribution period updated successfully',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      setNewDistributionPeriod('');
      await fetchFundData();
    } catch (error) {
      console.error('Error updating distribution period:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update distribution period',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const distributeFunds = async () => {
    try {
      if (!account) {
        toast({
          title: 'Error',
          description: 'Please connect your wallet first',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        return;
      }
      
      const nodePackagesContract = await getNodePackagesContract(account.signer);
      
      const tx = await nodePackagesContract.distributeAllPackageProsperityFunds(account.address);
      
      toast({
        title: 'Transaction Sent',
        description: 'Distributing funds... Please wait for confirmation',
        status: 'info',
        duration: 5000,
        isClosable: true,
      });
      
      await tx.wait();
      
      toast({
        title: 'Success',
        description: 'Funds distributed successfully',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      await fetchFundData();
    } catch (error) {
      console.error('Error distributing funds:', error);
      toast({
        title: 'Error',
        description: 'Funds are not ready, Failed to distribute funds',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const distributePackageFund = async (packageId) => {
    try {
      if (!account) {
        toast({
          title: 'Error',
          description: 'Please connect your wallet first',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        return;
      }
      
      const nodePackagesContract = await getNodePackagesContract(account.signer);
      
      const tx = await nodePackagesContract.distributePackageProsperityFund(packageId, account.address);
      
      toast({
        title: 'Transaction Sent',
        description: `Distributing Package #${packageId} fund... Please wait for confirmation`,
        status: 'info',
        duration: 5000,
        isClosable: true,
      });
      
      await tx.wait();
      
      toast({
        title: 'Success',
        description: `Package #${packageId} fund distributed successfully`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      await fetchFundData();
    } catch (error) {
      console.error('Error distributing package fund:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to distribute package fund',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const distributeAllPackageFunds = async () => {
    try {
      if (!account) {
        toast({
          title: 'Error',
          description: 'Please connect your wallet first',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        return;
      }
      
      const nodePackagesContract = await getNodePackagesContract(account.signer);
      
      const tx = await nodePackagesContract.distributeAllPackageProsperityFunds(account.address);
      
      toast({
        title: 'Transaction Sent',
        description: 'Distributing all package funds... Please wait for confirmation',
        status: 'info',
        duration: 5000,
        isClosable: true,
      });
      
      await tx.wait();
      
      toast({
        title: 'Success',
        description: 'All package funds distributed successfully',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      await fetchFundData();
    } catch (error) {
      console.error('Error distributing all package funds:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to distribute all package funds',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  return (
    <Box p={5}>
      <Heading size="lg" mb={6}>Prosperity Fund</Heading>
      
      {!account ? (
        <Text mb={4}>Connect your wallet to manage the prosperity fund</Text>
      ) : loading ? (
        <Text>Loading fund data...</Text>
      ) : (
        <>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6} mb={8}>
            <Card>
              <CardHeader pb={0}>
                <Heading size="md">Fund Status</Heading>
              </CardHeader>
              <CardBody>
                <Stat mb={4}>
                  <StatLabel>Current Balance</StatLabel>
                  <StatNumber>{formatEther(fundBalance)} BSL</StatNumber>
                  <StatHelpText>
                    Available for distribution
                  </StatHelpText>
                </Stat>
                
                <HStack spacing={4} mb={4}>
                  <Text fontWeight="bold">Fund Enabled:</Text>
                  <Switch
                    isChecked={distributionEnabled}
                    onChange={toggleDistributionEnabled}
                    colorScheme="green"
                  />
                </HStack>
                
                <Button
                  colorScheme="blue"
                  onClick={distributeFunds}
                  isDisabled={!distributionEnabled || fundBalance === '0'}
                >
                  Distribute Funds
                </Button>
              </CardBody>
            </Card>
            
            <Card>
              <CardHeader pb={0}>
                <Heading size="md">Distribution Settings</Heading>
              </CardHeader>
              <CardBody>
                <Text mb={4}>
                  <Text as="span" fontWeight="bold">Fund Percentage: </Text>
                  {fundPercentage}% of each purchase
                </Text>
                
                <Text mb={4}>
                  <Text as="span" fontWeight="bold">Current Period: </Text>
                  {Math.floor(distributionPeriod)} days
                </Text>
                
                <Text mb={4}>
                  <Text as="span" fontWeight="bold">Next Distribution: </Text>
                  {timeUntilNextDistribution}
                </Text>
                
                <FormControl mb={4}>
                  <FormLabel>New Fund Percentage (0-100%)</FormLabel>
                  <Input
                    type="number"
                    value={newFundPercentage}
                    onChange={(e) => setNewFundPercentage(e.target.value)}
                    placeholder="Enter percentage"
                    min="0"
                    max="100"
                  />
                </FormControl>

                <FormControl mb={4}>
                  <FormLabel>New Distribution Period (days)</FormLabel>
                  <Input
                    type="number"
                    value={newDistributionPeriod}
                    onChange={(e) => setNewDistributionPeriod(e.target.value)}
                    placeholder="Enter days"
                    min="1"
                  />
                </FormControl>
                
                <Button
                  colorScheme="blue"
                  onClick={updateProsperityFundSettings}
                  isDisabled={!newDistributionPeriod && !newFundPercentage}
                  width="full"
                >
                  Update Settings
                </Button>
              </CardBody>
            </Card>
          </SimpleGrid>
          
          {/* Package-wise Prosperity Fund Balances */}
          <Card mt={6}>
            <CardHeader>
              <Heading size="md">Package-wise Prosperity Funds (Cycle {currentCycle})</Heading>
              <Text fontSize="sm" color="gray.600">
                Each node package has its own prosperity fund within the current cycle
              </Text>
            </CardHeader>
            <CardBody>
              {packageFundBalances.length > 0 ? (
                <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
                  {packageFundBalances.map((packageData) => (
                    <Card key={packageData.packageId} variant="outline">
                      <CardBody>
                        <Stat>
                          <StatLabel>Package #{packageData.packageId}</StatLabel>
                          <StatNumber>{packageData.balance} BSL</StatNumber>
                          <StatHelpText>
                            {parseFloat(packageData.balance) > 0 ? 'Ready for distribution' : 'No funds accumulated'}
                          </StatHelpText>
                        </Stat>
                        {parseFloat(packageData.balance) > 0 && (
                          <Button 
                            size="sm" 
                            colorScheme="green" 
                            mt={2}
                            onClick={() => distributePackageFund(packageData.packageId)}
                          >
                            Distribute Package Fund
                          </Button>
                        )}
                      </CardBody>
                    </Card>
                  ))}
                </SimpleGrid>
              ) : (
                <Text color="gray.500" textAlign="center" py={4}>
                  No package fund data available
                </Text>
              )}
              
              <Divider my={4} />
              
              <Button 
                colorScheme="purple" 
                onClick={distributeAllPackageFunds}
                isDisabled={packageFundBalances.every(p => parseFloat(p.balance) === 0)}
              >
                Distribute All Package Funds
              </Button>
            </CardBody>
          </Card>
          
          <Divider my={6} />
          
          <Box>
            <Heading size="md" mb={4}>About Prosperity Fund</Heading>
            <Text>
              The Prosperity Fund collects a percentage of all node package purchases and distributes them to active node owners.
              Each package maintains its own fund within cycles, enabling targeted distributions per package type.
            </Text>
          </Box>
        </>
      )}
    </Box>
  );
};

export default ProsperityFund;