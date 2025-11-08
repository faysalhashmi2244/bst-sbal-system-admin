import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardBody,
  CardHeader,
  Heading,
  VStack,
  HStack,
  FormControl,
  FormLabel,
  Input,
  Switch,
  Button,
  Text,
  Divider,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  useToast,
  Spinner,
  Badge
} from '@chakra-ui/react';
import { getNodePackagesContract, getSigner } from '../utils/ethers';

const RewardsDiscountSettings = ({ refreshTrigger }) => {
  const [settings, setSettings] = useState({
    enabled: false,
    percentage: 0
  });
  const [formData, setFormData] = useState({
    enabled: false,
    percentage: 20
  });
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const toast = useToast();

  const fetchRewardsDiscountData = useCallback(async () => {
    try {
      setFetchingData(true);
      const contract = await getNodePackagesContract();
      
      // Get current settings
      const enabled = await contract.rewardsDiscountEnabled();
      const percentage = await contract.rewardsDiscountPercentage();
      
      const newSettings = {
        enabled: enabled,
        percentage: Number(percentage)
      };
      
      setSettings(newSettings);
      setFormData({
        enabled: newSettings.enabled,
        percentage: newSettings.percentage
      });
    } catch (error) {
      console.error('Error fetching rewards discount data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch rewards discount settings',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setFetchingData(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchRewardsDiscountData();
  }, [fetchRewardsDiscountData, refreshTrigger]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleUpdateSettings = async () => {
    try {
      setLoading(true);
      
      // Validation
      if (formData.percentage < 0 || formData.percentage > 100) {
        toast({
          title: 'Invalid Percentage',
          description: 'Percentage must be between 0 and 100',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        return;
      }

      // Ensure wallet is connected and get signer
      if (!window.ethereum) {
        toast({
          title: 'MetaMask Required',
          description: 'Please install MetaMask to use this feature',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        return;
      }

      // Request account access if needed
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      const signer = await getSigner();
      if (!signer) {
        toast({
          title: 'Wallet Connection Required',
          description: 'Please connect your wallet to execute transactions',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        return;
      }

      const contract = await getNodePackagesContract(signer);
      
      // Call the updateRewardsDiscountSettings function
      const tx = await contract.updateRewardsDiscountSettings(
        formData.enabled,
        formData.percentage,
        {
          gasLimit: 300000,
        }
      );

      toast({
        title: 'Transaction Submitted',
        description: `Transaction hash: ${tx.hash}`,
        status: 'info',
        duration: 5000,
        isClosable: true,
      });

      // Wait for transaction confirmation
      await tx.wait();

      toast({
        title: 'Success',
        description: 'Rewards discount settings updated successfully',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      // Refresh data
      await fetchRewardsDiscountData();

    } catch (error) {
      console.error('Error updating rewards discount settings:', error);
      
      let errorMessage = 'Failed to update rewards discount settings';
      if (error.message.includes('user rejected')) {
        errorMessage = 'Transaction was rejected by user';
      } else if (error.message.includes('insufficient funds')) {
        errorMessage = 'Insufficient funds for transaction';
      } else if (error.reason) {
        errorMessage = error.reason;
      }

      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  if (fetchingData) {
    return (
      <Card>
        <CardBody>
          <VStack spacing={4}>
            <Spinner size="lg" />
            <Text>Loading rewards discount settings...</Text>
          </VStack>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <Heading size="md">Rewards Discount Settings</Heading>
        <Text fontSize="sm" color="gray.600">
          Configure discount system for users paying with accumulated rewards
        </Text>
      </CardHeader>
      <CardBody>
        <VStack spacing={6} align="stretch">
          {/* Current Status */}
          <Box>
            <Heading size="sm" mb={3}>Current Settings</Heading>
            <HStack spacing={4} wrap="wrap">
              <Stat>
                <StatLabel>Discount System Status</StatLabel>
                <StatNumber>
                  <Badge colorScheme={settings.enabled ? 'green' : 'red'}>
                    {settings.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </StatNumber>
                <StatHelpText>Current system state</StatHelpText>
              </Stat>
              <Stat>
                <StatLabel>Discount Percentage</StatLabel>
                <StatNumber>{settings.percentage}%</StatNumber>
                <StatHelpText>Discount applied when using rewards</StatHelpText>
              </Stat>
            </HStack>
          </Box>

          <Divider />

          {/* Configuration Form */}
          <Box>
            <Heading size="sm" mb={4}>Update Settings</Heading>
            <VStack spacing={4} align="stretch">
              <FormControl>
                <FormLabel>Enable Rewards Discount System</FormLabel>
                <HStack>
                  <Switch
                    isChecked={formData.enabled}
                    onChange={(e) => handleInputChange('enabled', e.target.checked)}
                  />
                  <Text fontSize="sm" color="gray.600">
                    {formData.enabled ? 'Users can get discounts using rewards' : 'Discount system disabled'}
                  </Text>
                </HStack>
              </FormControl>

              <FormControl>
                <FormLabel>Discount Percentage (0-100%)</FormLabel>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.percentage}
                  onChange={(e) => handleInputChange('percentage', parseInt(e.target.value) || 0)}
                  placeholder="Enter discount percentage (0-100)"
                />
                <Text fontSize="sm" color="gray.600" mt={1}>
                  When users pay with rewards, they get {formData.percentage}% discount on node packages
                </Text>
              </FormControl>
            </VStack>
          </Box>

          {/* Info Alert */}
          <Alert status="info">
            <AlertIcon />
            <Box>
              <AlertTitle>How Rewards Discount Works:</AlertTitle>
              <AlertDescription>
                • Users accumulate rewards through referrals and activities<br/>
                • When purchasing nodes, they can use rewards as payment<br/>
                • The discount percentage is applied to reduce the cost<br/>
                • This incentivizes users to stay active and refer others
              </AlertDescription>
            </Box>
          </Alert>

          {/* Action Button */}
          <Button
            colorScheme="blue"
            size="lg"
            onClick={handleUpdateSettings}
            isLoading={loading}
            loadingText="Updating..."
            isDisabled={formData.percentage < 0 || formData.percentage > 100}
          >
            Update Discount Settings
          </Button>
        </VStack>
      </CardBody>
    </Card>
  );
};

export default RewardsDiscountSettings;