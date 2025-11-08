import React, { useState, useEffect, useContext } from 'react';
import {
  Box,
  Heading,
  FormControl,
  FormLabel,
  Input,
  Button,
  SimpleGrid,
  Card,
  CardHeader,
  CardBody,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  VStack,
  HStack,
  Text,
  useToast,
  Alert,
  AlertIcon,
  Skeleton,
  Select,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Divider,
} from '@chakra-ui/react';
import { getNodePackagesContract } from '../utils/ethers';
import { RefreshContext } from '../App';
import { formatEther } from '../utils/ethers';

const PackageAscensionBonusAnalytics = ({ account, setError }) => {
  const [loading, setLoading] = useState(true);
  const [networkError, setNetworkError] = useState(false);
  const [nodePackages, setNodePackages] = useState([]);
  const [selectedPackage, setSelectedPackage] = useState('');
  const [userAddress, setUserAddress] = useState('');
  const [packageAscensionData, setPackageAscensionData] = useState({});
  const [bulkSettings, setBulkSettings] = useState({
    threshold: 0,
    bonusPercentage: 0,
  });
  const toast = useToast();
  
  // Get refresh context
  const { refreshTrigger } = useContext(RefreshContext);

  useEffect(() => {
    if (account) {
      fetchData();
    }
  }, [account, refreshTrigger]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setNetworkError(false);
      
      const nodePackagesContract = await getNodePackagesContract(account.provider);
      
      // Fetch node packages
      const packageCount = await nodePackagesContract.nodePackageCount();
      const packages = [];
      
      for (let i = 1; i <= packageCount; i++) {
        try {
          const pkg = await nodePackagesContract.nodePackages(i);
          if (pkg.isActive) {
            packages.push({
              id: i,
              name: pkg.name,
              price: pkg.price,
              duration: pkg.duration,
              roiPercentage: pkg.roiPercentage,
            });
          }
        } catch (error) {
          console.error(`Error fetching package ${i}:`, error);
        }
      }
      
      setNodePackages(packages);
      
      // Fetch bulk referral settings
      try {
        const threshold = await nodePackagesContract.bulkReferralThreshold();
        const bonusPercentage = await nodePackagesContract.bulkReferralRewardPercentage();
        
        setBulkSettings({
          threshold: Number(threshold),
          bonusPercentage: Number(bonusPercentage),
        });
      } catch (error) {
        console.error('Error fetching bulk settings:', error);
      }
      
    } catch (error) {
      console.error('Error fetching data:', error);
      setNetworkError(true);
      setError('Failed to fetch package data. Please check your network connection.');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPackageAscensionData = async () => {
    if (!userAddress || !selectedPackage || !account) {
      toast({
        title: 'Error',
        description: 'Please enter user address and select a package',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      const nodePackagesContract = await getNodePackagesContract(account.provider);
      
      // Fetch package-wise ascension bonus data
      const referralCount = await nodePackagesContract.userAscensionBonusReferralCount(userAddress, selectedPackage);
      const salesTotal = await nodePackagesContract.userAscensionBonusReferralSalesTotal(userAddress, selectedPackage);
      const rewardsClaimed = await nodePackagesContract.userAscensionBonusReferralRewardsClaimed(userAddress, selectedPackage);
      
      // Calculate referrals to next reward
      const referralsToNext = bulkSettings.threshold - (Number(referralCount) % bulkSettings.threshold);
      
      setPackageAscensionData({
        referralCount: Number(referralCount),
        salesTotal: salesTotal,
        rewardsClaimed: rewardsClaimed,
        referralsToNextReward: referralsToNext === bulkSettings.threshold ? 0 : referralsToNext,
        packageId: selectedPackage,
        userAddress: userAddress,
      });

      toast({
        title: 'Success',
        description: 'Package ascension data fetched successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

    } catch (error) {
      console.error('Error fetching user package ascension data:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch ascension data',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  if (loading) {
    return (
      <Box p={6}>
        <Skeleton height="20px" mb={4} />
        <Skeleton height="100px" mb={4} />
        <Skeleton height="100px" />
      </Box>
    );
  }

  if (networkError) {
    return (
      <Box p={6}>
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          Failed to connect to the network. Please check your connection and try again.
        </Alert>
      </Box>
    );
  }

  return (
    <Box p={6}>
      <Heading size="md" mb={6}>Package-wise Ascension Bonus Analytics</Heading>
      
      <Alert status="info" mb={6} borderRadius="md">
        <AlertIcon />
        <Box>
          <Text fontWeight="bold">Package-wise Ascension Bonus System</Text>
          <Text fontSize="sm" mt={1}>
            Users earn ascension bonuses based on their referrals for specific packages. 
            Each package tracks referrals independently.
          </Text>
        </Box>
      </Alert>

      {/* Current Settings */}
      <Card mb={6} variant="outline">
        <CardHeader bg="blue.50">
          <Heading size="sm">Current Ascension Bonus Settings</Heading>
        </CardHeader>
        <CardBody>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            <Stat>
              <StatLabel>Referral Threshold</StatLabel>
              <StatNumber>{bulkSettings.threshold}</StatNumber>
              <StatHelpText>Referrals needed per package for bonus</StatHelpText>
            </Stat>
            <Stat>
              <StatLabel>Bonus Percentage</StatLabel>
              <StatNumber>{bulkSettings.bonusPercentage}%</StatNumber>
              <StatHelpText>Bonus on total sales when threshold is reached</StatHelpText>
            </Stat>
          </SimpleGrid>
        </CardBody>
      </Card>

      {/* User Query Section */}
      <Card mb={6} variant="outline">
        <CardHeader bg="green.50">
          <Heading size="sm">Query User Package Ascension Data</Heading>
        </CardHeader>
        <CardBody>
          <VStack spacing={4} align="stretch">
            <FormControl>
              <FormLabel>User Address</FormLabel>
              <Input
                placeholder="Enter user wallet address (0x...)"
                value={userAddress}
                onChange={(e) => setUserAddress(e.target.value)}
              />
            </FormControl>
            
            <FormControl>
              <FormLabel>Select Package</FormLabel>
              <Select
                placeholder="Choose a package"
                value={selectedPackage}
                onChange={(e) => setSelectedPackage(e.target.value)}
              >
                {nodePackages.map((pkg) => (
                  <option key={pkg.id} value={pkg.id}>
                    {pkg.name} (ID: {pkg.id}) - {formatEther(pkg.price)} tokens
                  </option>
                ))}
              </Select>
            </FormControl>
            
            <Button
              colorScheme="green"
              onClick={fetchUserPackageAscensionData}
              isDisabled={!userAddress || !selectedPackage}
            >
              Fetch Ascension Data
            </Button>
          </VStack>
        </CardBody>
      </Card>

      {/* Results Section */}
      {packageAscensionData.userAddress && (
        <Card variant="outline">
          <CardHeader bg="purple.50">
            <Heading size="sm">
              Package Ascension Data - {nodePackages.find(p => p.id == packageAscensionData.packageId)?.name}
            </Heading>
            <Text fontSize="sm" color="gray.600" mt={1}>
              User: {packageAscensionData.userAddress.slice(0, 8)}...{packageAscensionData.userAddress.slice(-6)}
            </Text>
          </CardHeader>
          <CardBody>
            <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4} mb={4}>
              <Stat>
                <StatLabel>Total Referrals</StatLabel>
                <StatNumber>{packageAscensionData.referralCount}</StatNumber>
                <StatHelpText>For this package</StatHelpText>
              </Stat>
              
              <Stat>
                <StatLabel>Total Sales Volume</StatLabel>
                <StatNumber>{formatEther(packageAscensionData.salesTotal)}</StatNumber>
                <StatHelpText>Tokens from referrals</StatHelpText>
              </Stat>
              
              <Stat>
                <StatLabel>Rewards Claimed</StatLabel>
                <StatNumber>{formatEther(packageAscensionData.rewardsClaimed)}</StatNumber>
                <StatHelpText>Ascension bonus claimed</StatHelpText>
              </Stat>
              
              <Stat>
                <StatLabel>Next Reward Progress</StatLabel>
                <StatNumber>
                  {packageAscensionData.referralsToNextReward === 0 ? (
                    <Badge colorScheme="green">Eligible!</Badge>
                  ) : (
                    `${packageAscensionData.referralsToNextReward} more`
                  )}
                </StatNumber>
                <StatHelpText>Referrals needed</StatHelpText>
              </Stat>
            </SimpleGrid>
            
            <Divider my={4} />
            
            <VStack align="start" spacing={2}>
              <Text fontWeight="bold">Ascension Bonus Calculation:</Text>
              <Text fontSize="sm">
                • Every {bulkSettings.threshold} referrals for this package triggers a bonus
              </Text>
              <Text fontSize="sm">
                • Bonus = {bulkSettings.bonusPercentage}% of total sales volume for the package
              </Text>
              <Text fontSize="sm">
                {/* • Current potential bonus: {formatEther(packageAscensionData.salesTotal.mul(bulkSettings.bonusPercentage).div(100))} tokens */}
              </Text>
            </VStack>
          </CardBody>
        </Card>
      )}

      {/* Available Packages */}
      <Card mt={6} variant="outline">
        <CardHeader bg="gray.50">
          <Heading size="sm">Available Packages</Heading>
        </CardHeader>
        <CardBody>
          <Table size="sm">
            <Thead>
              <Tr>
                <Th>ID</Th>
                <Th>Name</Th>
                <Th>Price</Th>
                <Th>ROI</Th>
              </Tr>
            </Thead>
            <Tbody>
              {nodePackages.map((pkg) => (
                <Tr key={pkg.id}>
                  <Td>{pkg.id}</Td>
                  <Td>{pkg.name}</Td>
                  <Td>{formatEther(pkg.price)} tokens</Td>
                  <Td>{pkg.roiPercentage}%</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </CardBody>
      </Card>
    </Box>
  );
};

export default PackageAscensionBonusAnalytics;