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
import { ethers } from 'ethers';
import { getNodePackagesContract, formatEther, getSigner } from '../utils/ethers';

const LiquidityWithdrawal = ({ refreshTrigger }) => {
  const [settings, setSettings] = useState({
    enabled: false,
    percentage: 10,
    liquidityAddress: '',
    totalWithdrawn: '0'
  });
  const [contractBalance, setContractBalance] = useState('0');
  const [formData, setFormData] = useState({
    enabled: false,
    percentage: 10,
    liquidityAddress: ''
  });
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const toast = useToast();

  const fetchLiquidityData = useCallback(async () => {
    try {
      setFetchingData(true);
      const contract = await getNodePackagesContract();
      
      // Get liquidity withdrawal settings
      const liquiditySettings = await contract.getLiquidityWithdrawalSettings();
      const balance = await contract.getContractBalance();
      
      const newSettings = {
        enabled: liquiditySettings.enabled,
        percentage: Number(liquiditySettings.percentage),
        liquidityAddress: liquiditySettings.liquidityAddr,
        totalWithdrawn: formatEther(liquiditySettings.totalWithdrawn)
      };
      
      setSettings(newSettings);
      setFormData({
        enabled: newSettings.enabled,
        percentage: newSettings.percentage,
        liquidityAddress: newSettings.liquidityAddress
      });
      setContractBalance(formatEther(balance));
    } catch (error) {
      console.error('Error fetching liquidity data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch liquidity withdrawal data',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setFetchingData(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchLiquidityData();
  }, [fetchLiquidityData, refreshTrigger]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleWithdrawLiquidity = async () => {
    try {
      setLoading(true);
      
      // Validation
      if (!formData.liquidityAddress || !ethers.isAddress(formData.liquidityAddress)) {
        toast({
          title: 'Invalid Address',
          description: 'Please enter a valid Ethereum address for liquidity withdrawal',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        return;
      }

      if (formData.percentage < 1 || formData.percentage > 100) {
        toast({
          title: 'Invalid Percentage',
          description: 'Percentage must be between 1 and 100',
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
      
      // Calculate potential withdrawal amount for display
      const currentBalance = parseFloat(contractBalance);
      const withdrawalAmount = (currentBalance * formData.percentage) / 100;
      
      if (formData.enabled && currentBalance === 0) {
        toast({
          title: 'No Balance',
          description: 'Contract has no token balance to withdraw',
          status: 'warning',
          duration: 5000,
          isClosable: true,
        });
        return;
      }

      // Call the updateWithdrawLiquiditySettings function
      const tx = await contract.updateWithdrawLiquiditySettings(
        formData.enabled,
        formData.percentage,
        formData.liquidityAddress
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

      const successMessage = formData.enabled 
        ? `Liquidity withdrawal successful! Withdrew ${withdrawalAmount.toFixed(4)} tokens to ${formData.liquidityAddress}`
        : 'Liquidity withdrawal settings updated successfully';

      toast({
        title: 'Success',
        description: successMessage,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      // Refresh data
      await fetchLiquidityData();

    } catch (error) {
      console.error('Error in liquidity withdrawal:', error);
      
      let errorMessage = 'Failed to execute liquidity withdrawal';
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
            <Text>Loading liquidity withdrawal data...</Text>
          </VStack>
        </CardBody>
      </Card>
    );
  }

  const potentialWithdrawal = (parseFloat(contractBalance) * formData.percentage) / 100;

  return (
    <Card>
      <CardHeader>
        <Heading size="md">Reward Withdrawal Liquidity Settings</Heading>
        <Text fontSize="sm" color="gray.600">
          Configure liquidity collection from user reward withdrawals
        </Text>
      </CardHeader>
      <CardBody>
        <VStack spacing={6} align="stretch">
          {/* Current Status */}
          <Box>
            <Heading size="sm" mb={3}>Current Status</Heading>
            <HStack spacing={4} wrap="wrap">
              <Stat>
                <StatLabel>Contract Balance</StatLabel>
                <StatNumber>{parseFloat(contractBalance).toFixed(4)} Tokens</StatNumber>
                <StatHelpText>Available for withdrawal</StatHelpText>
              </Stat>
              <Stat>
                <StatLabel>Total Withdrawn</StatLabel>
                <StatNumber>{parseFloat(settings.totalWithdrawn).toFixed(4)} Tokens</StatNumber>
                <StatHelpText>Lifetime withdrawal amount</StatHelpText>
              </Stat>
              <Stat>
                <StatLabel>Current Settings</StatLabel>
                <StatNumber>
                  <Badge colorScheme={settings.enabled ? 'green' : 'red'}>
                    {settings.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </StatNumber>
                <StatHelpText>
                  {settings.percentage}% to {settings.liquidityAddress ? 
                    `${settings.liquidityAddress.slice(0, 6)}...${settings.liquidityAddress.slice(-4)}` : 
                    'No address set'}
                </StatHelpText>
              </Stat>
            </HStack>
          </Box>

          <Divider />

          {/* Configuration Form */}
          <Box>
            <Heading size="sm" mb={4}>Configure Withdrawal</Heading>
            <VStack spacing={4} align="stretch">
              <FormControl>
                <FormLabel>Enable Liquidity Withdrawal</FormLabel>
                <HStack>
                  <Switch
                    isChecked={formData.enabled}
                    onChange={(e) => handleInputChange('enabled', e.target.checked)}
                  />
                  <Text fontSize="sm" color="gray.600">
                    {formData.enabled ? 'Withdrawal will execute immediately' : 'Only update settings'}
                  </Text>
                </HStack>
              </FormControl>

              <FormControl>
                <FormLabel>Withdrawal Percentage (1-100%)</FormLabel>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={formData.percentage}
                  onChange={(e) => handleInputChange('percentage', parseInt(e.target.value) || 1)}
                  placeholder="Enter percentage (1-100)"
                />
                {formData.percentage && contractBalance && (
                  <Text fontSize="sm" color="blue.600" mt={1}>
                    Withdrawal amount: {potentialWithdrawal.toFixed(4)} tokens
                  </Text>
                )}
              </FormControl>

              <FormControl>
                <FormLabel>Liquidity Address</FormLabel>
                <Input
                  value={formData.liquidityAddress}
                  onChange={(e) => handleInputChange('liquidityAddress', e.target.value)}
                  placeholder="0x... (Address to receive withdrawn tokens)"
                />
              </FormControl>
            </VStack>
          </Box>

          {/* Withdrawal Warning
          {formData.enabled && (
            <Alert status="warning">
              <AlertIcon />
              <Box>
                <AlertTitle>Withdrawal Warning!</AlertTitle>
                
              </Box>
            </Alert>
          )} */}

          {/* Action Button */}
          <Button
            colorScheme={'blue'}
            size="lg"
            onClick={handleWithdrawLiquidity}
            isLoading={loading}
            loadingText={'Updating...'}
            isDisabled={!formData.liquidityAddress || formData.percentage < 1 || formData.percentage > 100}
          >
            {'Update Settings'}
          </Button>

          {/* Info Alert */}
          <Alert status="info">
            <AlertIcon />
            <Box>
              <AlertTitle>How it works:</AlertTitle>
              <AlertDescription>
                • Set the withdrawal percentage and destination address<br/>
                • Enable settings to execute immediately, or disable to only save settings<br/>
                • All withdrawal activity is tracked and logged
              </AlertDescription>
            </Box>
          </Alert>
        </VStack>
      </CardBody>
    </Card>
  );
};

export default LiquidityWithdrawal;