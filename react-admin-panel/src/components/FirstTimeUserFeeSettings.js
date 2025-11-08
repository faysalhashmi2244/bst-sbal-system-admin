import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardHeader,
  CardBody,
  Heading,
  VStack,
  HStack,
  FormControl,
  FormLabel,
  Input,
  Button,
  Text,
  useToast,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Badge,
  Divider
} from '@chakra-ui/react';
import { getNodePackagesContract, getSigner, parseEther, formatEther } from '../utils/ethers';

const FirstTimeUserFeeSettings = () => {
  const [settings, setSettings] = useState({
    fee: 0,
    feeAddress: '',
    totalCollected: '0'
  });
  const [newPercentage, setNewPercentage] = useState('');
  const [newFeeAddress, setNewFeeAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const toast = useToast();

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const contract = await getNodePackagesContract();
      const result = await contract.getFirstTimeUserFeeSettings();
      
      console.log('First-time user fee settings result:', result);
      
      // Handle both BigInt and BigNumber values
      const feeValue = typeof result.fee === 'bigint' 
        ? Number(result.fee) 
        : (result.fee.toNumber ? result.fee.toNumber() : Number(result.fee));
      
      const totalCollectedValue = typeof result.totalCollected === 'bigint' 
        ? result.totalCollected.toString() 
        : (result.totalCollected.toString ? result.totalCollected.toString() : String(result.totalCollected));
      
      setSettings({
        fee: feeValue,
        feeAddress: result.feeAddr,
        totalCollected: totalCollectedValue
      });
      
      setNewPercentage(formatEther(feeValue.toString()));
      setNewFeeAddress((result.feeAddr));
    } catch (error) {
      console.error('Error loading first-time user fee settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load first-time user fee settings',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const updateSettings = async () => {
    if (!newFeeAddress || newFeeAddress === '0x0000000000000000000000000000000000000000') {
      toast({
        title: 'Error',
        description: 'Please enter a valid fee address',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    const fee = parseInt(newPercentage);
    if (isNaN(fee) || fee < 0 || fee > 100) {
      toast({
        title: 'Error',
        description: 'Percentage must be between 0 and 100',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      setUpdating(true);
      const contract = await getNodePackagesContract();
      const signer = await getSigner();
      const contractWithSigner = contract.connect(signer);
      const tx = await contractWithSigner.updateFirstTimeUserFeeSettings(parseEther(fee.toString()), newFeeAddress);
      
      toast({
        title: 'Transaction Submitted',
        description: 'Updating first-time user fee settings...',
        status: 'info',
        duration: 3000,
        isClosable: true,
      });

      await tx.wait();
      
      toast({
        title: 'Success',
        description: 'First-time user fee settings updated successfully',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      await loadSettings();
    } catch (error) {
      console.error('Error updating settings:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update settings',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const isEnabled = settings.fee > 0;
  const formattedTotalCollected = settings.totalCollected ? 
    (parseFloat(settings.totalCollected) / 1e18).toFixed(4) : '0.0000';

  return (
    <Box maxWidth="800px" mx="auto" p={6}>
      <Card>
        <CardHeader>
          <Heading size="lg">First-Time User Fee Settings</Heading>
          <Text color="gray.600" mt={2}>
            Configure fees charged to new users on their first package purchase
          </Text>
        </CardHeader>
        <CardBody>
          <VStack spacing={6}>
            {/* Current Status */}
            <Alert status={isEnabled ? 'success' : 'warning'}>
              <AlertIcon />
              <Box>
                <AlertTitle>
                  First-time user fees are {isEnabled ? 'enabled' : 'disabled'}
                </AlertTitle>
                <AlertDescription>
                  {isEnabled 
                    ? `${settings.fee} SBAL fee is charged on first purchases`
                    : 'Set fee > 0 to enable first-time user fees'
                  }
                </AlertDescription>
              </Box>
            </Alert>

            {/* Statistics */}
            <HStack spacing={8} width="100%">
              <Stat>
                <StatLabel>Current Fee</StatLabel>
                <StatNumber>{formatEther(settings.fee.toString())} SBAL</StatNumber>
                <StatHelpText>
                  <Badge colorScheme={isEnabled ? 'green' : 'gray'}>
                    {isEnabled ? 'Active' : 'Disabled'}
                  </Badge>
                </StatHelpText>
              </Stat>
              <Stat>
                <StatLabel>Total Fees Collected</StatLabel>
                <StatNumber>{formattedTotalCollected} SBAL</StatNumber>
                <StatHelpText>Tokens collected from first-time users</StatHelpText>
              </Stat>
            </HStack>

            <Divider />

            {/* Current Settings Display */}
            <VStack spacing={4} width="100%" align="start">
              <Heading size="md">Current Configuration</Heading>
              <HStack spacing={4}>
                <Text fontWeight="bold">Fee Address:</Text>
                <Text fontFamily="mono" fontSize="sm" color="blue.600">
                  {settings.feeAddress || 'Not set'}
                </Text>
              </HStack>
            </VStack>

            <Divider />

            {/* Update Form */}
            <VStack spacing={4} width="100%">
              <Heading size="md">Update Settings</Heading>
              
              <FormControl>
                <FormLabel>Fee SBAL</FormLabel>
                <Input
                  type="number"
                  value={newPercentage}
                  onChange={(e) => setNewPercentage(e.target.value)}
                  placeholder="Enter SBAL (0 to disable)"
                  min="0"
                  max="100"
                />
                <Text fontSize="sm" color="gray.600" mt={1}>
                  Set to 0 to disable first-time user fees
                </Text>
              </FormControl>

              <FormControl>
                <FormLabel>Fee Address</FormLabel>
                <Input
                  value={newFeeAddress}
                  onChange={(e) => setNewFeeAddress(e.target.value)}
                  placeholder="0x... (address to receive fees)"
                  fontFamily="mono"
                />
                <Text fontSize="sm" color="gray.600" mt={1}>
                  Address that will receive the first-time user fees
                </Text>
              </FormControl>

              <Button
                colorScheme="blue"
                onClick={updateSettings}
                isLoading={updating}
                loadingText="Updating..."
                isDisabled={loading}
                width="100%"
              >
                Update Settings
              </Button>
            </VStack>

            {/* How it Works */}
            <Alert status="info">
              <AlertIcon />
              <Box>
                <AlertTitle>How it works:</AlertTitle>
                <AlertDescription>
                  <VStack align="start" spacing={1}>
                    <Text>• When a user makes their first package purchase, the specified SBAL is deducted</Text>
                    <Text>• The fee is transferred directly to the configured fee address</Text>
                    <Text>• The remaining amount goes to the contract for normal processing</Text>
                    <Text>• Users who have already purchased packages are not affected</Text>
                    <Text>• Setting tokens to 0 disables the feature entirely</Text>
                  </VStack>
                </AlertDescription>
              </Box>
            </Alert>
          </VStack>
        </CardBody>
      </Card>
    </Box>
  );
};

export default FirstTimeUserFeeSettings;