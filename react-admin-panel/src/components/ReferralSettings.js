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
  Text,
  useToast,
  Divider,
  Alert,
  AlertIcon,
  Skeleton,
  Tooltip,
  IconButton,
  HStack,
} from '@chakra-ui/react';
import { getNodePackagesContract } from '../utils/ethers';
import { RefreshContext } from '../App';

// Info icon component
const InfoIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M12 16V12"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M12 8H12.01"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ReferralSettings = ({ account, setError }) => {
  const [referralPercentages, setReferralPercentages] = useState(Array(7).fill(0));
  const [newPercentages, setNewPercentages] = useState(Array(7).fill(''));
  const [ascensionBonusSettings, setAscensionBonusSettings] = useState({
    threshold: 0,
    bonusPercentage: 0,
  });
  const [newAscensionSettings, setNewAscensionSettings] = useState({
    threshold: '',
    bonusPercentage: '',
  });
  const [boosterPercentage, setBoosterPercentage] = useState(0);
  const [newBoosterPercentage, setNewBoosterPercentage] = useState('');
  const [loading, setLoading] = useState(true);
  const [networkError, setNetworkError] = useState(false);
  const toast = useToast();
  
  // Get refresh context
  const { refreshTrigger } = useContext(RefreshContext);

  // Fetch current referral settings
  const fetchReferralSettings = async () => {
    try {
      if (!account) return;
      
      setLoading(true);
      setNetworkError(false);
      const nodePackagesContract = await getNodePackagesContract(account.signer);
      
      // Fetch seven-level referral percentages
      const percentages = [];
      for (let i = 0; i < 7; i++) {
        const percentage = await nodePackagesContract.sevenLevelReferralPercentages(i);
        percentages.push(Number(percentage));
      }
      setReferralPercentages(percentages);
      
      // Fetch ascension bonus settings
      const threshold = await nodePackagesContract.bulkReferralThreshold();
      const bonusPercentage = await nodePackagesContract.bulkReferralRewardPercentage();
      
      setAscensionBonusSettings({
        threshold: Number(threshold),
        bonusPercentage: Number(bonusPercentage),
      });
      
      // Fetch booster percentage
      const booster = await nodePackagesContract.boosterPercentage();
      setBoosterPercentage(Number(booster));
    } catch (error) {
      console.error('Error fetching referral settings:', error);
      setNetworkError(true);
      
      // Check if it's a network error
      if (error.message.includes('network') || error.message.includes('connection')) {
        toast({
          title: 'Network Error',
          description: 'Unable to connect to the blockchain. Please check your connection.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to fetch referral settings: ' + error.message,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
      
      // Send error to parent component
      if (setError) {
        setError('Failed to load referral settings. Please check your connection and wallet.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch when account changes
  useEffect(() => {
    if (account) {
      fetchReferralSettings();
    } else {
      setLoading(false);
    }
  }, [account]);
  
  // Refresh data when refresh trigger changes
  useEffect(() => {
    if (account && refreshTrigger > 0) {
      fetchReferralSettings();
    }
  }, [refreshTrigger, account]);

  const handleSevenLevelPercentageChange = (index, value) => {
    const updatedPercentages = [...newPercentages];
    updatedPercentages[index] = value;
    setNewPercentages(updatedPercentages);
  };

  const handleAscensionSettingsChange = (field, value) => {
    setNewAscensionSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const updateSevenLevelPercentage = async (index) => {
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
      
      const percentage = parseInt(newPercentages[index]);
      if (isNaN(percentage) || percentage < 0 || percentage > 100) {
        toast({
          title: 'Error',
          description: 'Percentage must be between 0 and 100',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        return;
      }
      
      const nodePackagesContract = await getNodePackagesContract(account.signer);
      
      const tx = await nodePackagesContract.updateSevenLevelReferralPercentage(index, percentage);
      
      toast({
        title: 'Transaction Sent',
        description: 'Updating referral percentage... Please wait for confirmation',
        status: 'info',
        duration: 5000,
        isClosable: true,
      });
      
      await tx.wait();
      
      toast({
        title: 'Success',
        description: 'Referral percentage updated successfully',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      // Reset input and refresh
      const updatedPercentages = [...newPercentages];
      updatedPercentages[index] = '';
      setNewPercentages(updatedPercentages);
      
      await fetchReferralSettings();
    } catch (error) {
      console.error('Error updating referral percentage:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update referral percentage',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const updateBulkReferralSettings = async () => {
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
      
      const threshold = parseInt(newAscensionSettings.threshold);
      const bonusPercentage = parseInt(newAscensionSettings.bonusPercentage);
      
      if (isNaN(threshold) || threshold < 1) {
        toast({
          title: 'Error',
          description: 'Threshold must be at least 1',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        return;
      }
      
      if (isNaN(bonusPercentage) || bonusPercentage < 0 || bonusPercentage > 100) {
        toast({
          title: 'Error',
          description: 'Bonus percentage must be between 0 and 100',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        return;
      }
      
      const nodePackagesContract = await getNodePackagesContract(account.signer);
      
      const tx = await nodePackagesContract.updateBulkReferralSettings(threshold, bonusPercentage);
      
      toast({
        title: 'Transaction Sent',
        description: 'Updating ascension bonus settings... Please wait for confirmation',
        status: 'info',
        duration: 5000,
        isClosable: true,
      });
      
      await tx.wait();
      
      toast({
        title: 'Success',
        description: 'Ascension bonus settings updated successfully',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      // Reset inputs and refresh
      setNewAscensionSettings({
        threshold: '',
        bonusPercentage: '',
      });
      
      await fetchReferralSettings();
    } catch (error) {
      console.error('Error updating ascension bonus settings:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update ascension bonus settings',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const updateBoosterPercentage = async () => {
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
      
      const percentage = parseInt(newBoosterPercentage);
      if (isNaN(percentage) || percentage < 0 || percentage > 100) {
        toast({
          title: 'Error',
          description: 'Activation bonus percentage must be between 0 and 100',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        return;
      }
      
      const nodePackagesContract = await getNodePackagesContract(account.signer);
      
      const tx = await nodePackagesContract.updateBoosterPercentage(percentage);
      
      toast({
        title: 'Transaction Sent',
        description: 'Updating activation percentage... Please wait for confirmation',
        status: 'info',
        duration: 5000,
        isClosable: true,
      });
      
      await tx.wait();
      
      toast({
        title: 'Success',
        description: 'Activation bonus percentage updated successfully',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      // Reset input and refresh
      setNewBoosterPercentage('');
      await fetchReferralSettings();
    } catch (error) {
      console.error('Error updating activation bonus percentage:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update activation bonus percentage',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  return (
    <Box p={5}>
      <Heading size="lg" mb={4}>Referral Settings</Heading>
      
      {networkError && (
        <Alert status="error" mb={6}>
          <AlertIcon />
          <Text>
            Unable to connect to the blockchain network. Please check your connection and wallet.
          </Text>
        </Alert>
      )}
      
      {!account ? (
        <Alert status="info" mb={6}>
          <AlertIcon />
          <Text>Please connect your wallet using the button in the top right to manage referral settings.</Text>
        </Alert>
      ) : loading ? (
        <Box mb={6}>
          <Text mb={2}>Loading referral settings from blockchain...</Text>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} height="200px" borderRadius="md" />
            ))}
          </SimpleGrid>
        </Box>
      ) : (
        <>
          <Box mb={8}>
            <HStack mb={2}>
              <Heading size="md">Seven-Level Referral Percentages</Heading>
              <Tooltip label="Configure reward percentages for each level in the MLM referral structure. Higher percentages mean larger rewards for referrers.">
                <span><InfoIcon /></span>
              </Tooltip>
            </HStack>
            
            <Text mb={6} color="gray.600">
              When a user purchases a node package through a referral link, referrers up to 7 levels above them receive rewards based on these percentages.
            </Text>
            
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6} mb={6}>
              {referralPercentages.map((percentage, index) => (
                <Card key={index} variant="outline" boxShadow="sm" borderRadius="lg">
                  <CardHeader pb={0} bg="blue.50" borderTopRadius="lg">
                    <Heading size="sm">Level {index + 1}</Heading>
                  </CardHeader>
                  <CardBody>
                    <Stat mb={4}>
                      <StatLabel>Current Percentage</StatLabel>
                      <StatNumber>{percentage}% </StatNumber>
                      <StatHelpText>
                        Reward for Level {index + 1} referrers
                      </StatHelpText>
                    </Stat>
                    
                    <FormControl>
                      <FormLabel>New Percentage</FormLabel>
                      <Input
                        type="number"
                        value={newPercentages[index]}
                        onChange={(e) => handleSevenLevelPercentageChange(index, e.target.value)}
                        placeholder="Enter new percentage"
                        min="0"
                        max="100"
                      />
                    </FormControl>
                    
                    <Button
                      mt={4}
                      colorScheme="blue"
                      onClick={() => updateSevenLevelPercentage(index)}
                      isDisabled={!newPercentages[index]}
                      width="full"
                    >
                      Update Level {index + 1}
                    </Button>
                  </CardBody>
                </Card>
              ))}
            </SimpleGrid>
          </Box>
          
          <Divider my={8} />
          
          <Box mb={8}>
            <HStack mb={2}>
              <Heading size="md">Activation bonus Percentage</Heading>
              <Tooltip label="Global activation bonus percentage applied to referral rewards across the system.">
                <span><InfoIcon /></span>
              </Tooltip>
            </HStack>
            
            <Text mb={6} color="gray.600">
              The activation bonus percentage is a global multiplier that can be applied to enhance referral rewards across all levels and packages.
            </Text>
            
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6} mb={6}>
              <Card variant="outline" boxShadow="sm" borderRadius="lg">
                <CardHeader pb={0} bg="purple.50" borderTopRadius="lg">
                  <Heading size="sm">Current Activation bonus</Heading>
                </CardHeader>
                <CardBody>
                  <VStack align="start" spacing={4}>
                    <Box>
                      <Text fontWeight="bold">Activation bonus Percentage:</Text>
                      <Text fontSize="2xl" color="purple.600">{boosterPercentage}%</Text>
                      <Text fontSize="sm" color="gray.600">
                        Additional percentage boost applied to all referral rewards
                      </Text>
                    </Box>
                  </VStack>
                </CardBody>
              </Card>
              
              <Card variant="outline" boxShadow="sm" borderRadius="lg">
                <CardHeader pb={0} bg="purple.50" borderTopRadius="lg">
                  <Heading size="sm">Update Activation bonus</Heading>
                </CardHeader>
                <CardBody>
                  <FormControl mb={4}>
                    <FormLabel>New Activation bonus Percentage</FormLabel>
                    <Input
                      type="number"
                      value={newBoosterPercentage}
                      onChange={(e) => setNewBoosterPercentage(e.target.value)}
                      placeholder="Enter new activation percentage"
                      min="0"
                      max="100"
                    />
                    <Text fontSize="xs" color="gray.500" mt={1}>
                      Activation bonus percentage (0-100%)
                    </Text>
                  </FormControl>
                  
                  <Button
                    colorScheme="purple"
                    onClick={updateBoosterPercentage}
                    isDisabled={!newBoosterPercentage}
                    width="full"
                  >
                    Update Activation bonus Percentage
                  </Button>
                </CardBody>
              </Card>
            </SimpleGrid>
          </Box>
          
          <Divider my={8} />
          
          <Box>
            <HStack mb={2}>
              <Heading size="md">Ascension Referral Settings</Heading>
              <Tooltip label="After a user reaches the threshold number of referrals for a specific package, they earn a bonus reward percentage on future referrals.">
                <span><InfoIcon /></span>
              </Tooltip>
            </HStack>
            
            <Text mb={6} color="gray.600">
              The ascension bonus system rewards users who consistently bring in new customers. When a user's referral count reaches the threshold, they receive an additional bonus for each new referral.
            </Text>
            
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6} mb={6}>
              <Card variant="outline" boxShadow="sm" borderRadius="lg">
                <CardHeader pb={0} bg="green.50" borderTopRadius="lg">
                  <Heading size="sm">Current Settings</Heading>
                </CardHeader>
                <CardBody>
                  <VStack align="start" spacing={4}>
                    <Box>
                      <Text fontWeight="bold">Threshold:</Text>
                      <Text fontSize="xl">{ascensionBonusSettings.threshold} referrals</Text>
                      <Text fontSize="sm" color="gray.600">
                        Number of referrals needed before bonus rewards are triggered
                      </Text>
                    </Box>
                    <Box>
                      <Text fontWeight="bold">Bonus Percentage:</Text>
                      <Text fontSize="xl">{ascensionBonusSettings.bonusPercentage}%</Text>
                      <Text fontSize="sm" color="gray.600">
                        Additional percentage reward for each referral after reaching the threshold
                      </Text>
                    </Box>
                  </VStack>
                </CardBody>
              </Card>
              
              <Card variant="outline" boxShadow="sm" borderRadius="lg">
                <CardHeader pb={0} bg="green.50" borderTopRadius="lg">
                  <Heading size="sm">Update Settings</Heading>
                </CardHeader>
                <CardBody>
                  <FormControl mb={4}>
                    <FormLabel>New Threshold</FormLabel>
                    <Input
                      type="number"
                      value={newAscensionSettings.threshold}
                      onChange={(e) => handleAscensionSettingsChange('threshold', e.target.value)}
                      placeholder="Enter new threshold"
                      min="1"
                    />
                    <Text fontSize="xs" color="gray.500" mt={1}>
                      Minimum referrals needed (must be at least 1)
                    </Text>
                  </FormControl>
                  
                  <FormControl mb={4}>
                    <FormLabel>New Bonus Percentage</FormLabel>
                    <Input
                      type="number"
                      value={newAscensionSettings.bonusPercentage}
                      onChange={(e) => handleAscensionSettingsChange('bonusPercentage', e.target.value)}
                      placeholder="Enter new bonus percentage"
                      min="0"
                      max="100"
                    />
                    <Text fontSize="xs" color="gray.500" mt={1}>
                      Bonus percentage (0-100%)
                    </Text>
                  </FormControl>
                  
                  <Button
                    colorScheme="green"
                    onClick={updateBulkReferralSettings}
                    isDisabled={!newAscensionSettings.threshold && !newAscensionSettings.bonusPercentage}
                    width="full"
                  >
                    Update Ascension Bonus Settings
                  </Button>
                </CardBody>
              </Card>
            </SimpleGrid>
          </Box>
        </>
      )}
    </Box>
  );
};

export default ReferralSettings;