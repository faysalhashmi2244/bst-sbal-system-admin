import React, { useState, useEffect, useContext } from 'react';
import {
  Box,
  Card,
  CardHeader,
  CardBody,
  Heading,
  Text,
  VStack,
  HStack,
  Button,
  Input,
  Switch,
  FormControl,
  FormLabel,
  Alert,
  AlertIcon,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  useToast,
  Divider
} from '@chakra-ui/react';
import { getNodePackagesContract, getSigner } from '../utils/ethers';
import { RefreshContext } from '../App';

const AdminMarketingBonus = () => {
  const [settings, setSettings] = useState({
    enabled: false,
    percentage: 5,
    wallet: '',
    totalCollected: '0'
  });
  const [newSettings, setNewSettings] = useState({
    enabled: false,
    percentage: 5,
    wallet: ''
  });
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const toast = useToast();
  const { refreshTrigger } = useContext(RefreshContext);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const contract = await getNodePackagesContract();
      const result = await contract.getAdminMarketingBonusSettings();
      
      const settingsData = {
        enabled: result.enabled,
        percentage: result.percentage.toString(),
        wallet: result.wallet,
        totalCollected: result.totalCollected.toString()
      };
      
      setSettings(settingsData);
      setNewSettings({
        enabled: settingsData.enabled,
        percentage: settingsData.percentage,
        wallet: settingsData.wallet
      });
    } catch (error) {
      console.error('Error fetching admin marketing bonus settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch admin marketing bonus settings',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async () => {
    if (!newSettings.wallet || newSettings.wallet === '') {
      toast({
        title: 'Error',
        description: 'Admin wallet address is required',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (newSettings.percentage < 1 || newSettings.percentage > 10) {
      toast({
        title: 'Error',
        description: 'Percentage must be between 1% and 10%',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      setUpdating(true);
      
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
      
      const tx = await contract.updateAdminMarketingBonusSettings(
        newSettings.enabled,
        newSettings.percentage,
        newSettings.wallet
      );
      
      await tx.wait();
      
      toast({
        title: 'Success',
        description: 'Admin marketing bonus settings updated successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      await fetchSettings();
    } catch (error) {
      console.error('Error updating admin marketing bonus settings:', error);
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

  const formatTokenAmount = (amount) => {
    return (parseFloat(amount) / 1e18).toFixed(4);
  };

  useEffect(() => {
    fetchSettings();
  }, [refreshTrigger]);

  return (
    <Box p={6}>
      <Heading size="lg" mb={6} color="blue.600">
        Admin Marketing Bonus
      </Heading>
      
      <VStack spacing={6} align="stretch">
        {/* Current Settings Display */}
        <Card>
          <CardHeader>
            <Heading size="md">Current Settings</Heading>
          </CardHeader>
          <CardBody>
            {loading ? (
              <Text>Loading settings...</Text>
            ) : (
              <VStack align="stretch" spacing={4}>
                <HStack justify="space-between">
                  <Text fontWeight="medium">Status:</Text>
                  <Text color={settings.enabled ? 'green.500' : 'red.500'}>
                    {settings.enabled ? 'Enabled' : 'Disabled'}
                  </Text>
                </HStack>
                
                <HStack justify="space-between">
                  <Text fontWeight="medium">Percentage:</Text>
                  <Text>{settings.percentage}%</Text>
                </HStack>
                
                <HStack justify="space-between">
                  <Text fontWeight="medium">Admin Wallet:</Text>
                  <Text fontSize="sm" fontFamily="mono">
                    {settings.wallet || 'Not set'}
                  </Text>
                </HStack>
                
                <Divider />
                
                <Stat>
                  <StatLabel>Total Collected</StatLabel>
                  <StatNumber>{formatTokenAmount(settings.totalCollected)} NODE</StatNumber>
                  <StatHelpText>Lifetime earnings from marketing bonus</StatHelpText>
                </Stat>
              </VStack>
            )}
          </CardBody>
        </Card>

        {/* Update Settings */}
        <Card>
          <CardHeader>
            <Heading size="md">Update Settings</Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <Alert status="info">
                <AlertIcon />
                The admin marketing bonus is automatically collected on each node purchase and sent to the specified admin wallet.
              </Alert>
              
              <FormControl>
                <FormLabel>Enable Admin Marketing Bonus</FormLabel>
                <Switch
                  isChecked={newSettings.enabled}
                  onChange={(e) => setNewSettings({ ...newSettings, enabled: e.target.checked })}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Percentage (1% - 10%)</FormLabel>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={newSettings.percentage}
                  onChange={(e) => setNewSettings({ ...newSettings, percentage: parseInt(e.target.value) || 1 })}
                  placeholder="Enter percentage (1-10)"
                />
                <Text fontSize="sm" color="gray.500" mt={1}>
                  Percentage of each node purchase that goes to admin wallet
                </Text>
              </FormControl>

              <FormControl>
                <FormLabel>Admin Wallet Address</FormLabel>
                <Input
                  value={newSettings.wallet}
                  onChange={(e) => setNewSettings({ ...newSettings, wallet: e.target.value })}
                  placeholder="0x..."
                  fontFamily="mono"
                />
                <Text fontSize="sm" color="gray.500" mt={1}>
                  Wallet address to receive marketing bonus tokens
                </Text>
              </FormControl>

              <Button
                colorScheme="blue"
                onClick={updateSettings}
                isLoading={updating}
                loadingText="Updating..."
                size="lg"
              >
                Update Settings
              </Button>
            </VStack>
          </CardBody>
        </Card>

        {/* Information */}
        <Card>
          <CardHeader>
            <Heading size="md">How It Works</Heading>
          </CardHeader>
          <CardBody>
            <VStack align="stretch" spacing={3}>
              <Text>
                • When users purchase node packages, a percentage (1%-10%) is automatically sent to the admin wallet
              </Text>
              <Text>
                • This happens instantly during the purchase transaction
              </Text>
              <Text>
                • The admin can change the percentage and wallet address at any time
              </Text>
              <Text>
                • Total collected amount is tracked and displayed above
              </Text>
              <Text color="orange.500" fontWeight="medium">
                • Make sure the admin wallet address is correct before enabling
              </Text>
            </VStack>
          </CardBody>
        </Card>
      </VStack>
    </Box>
  );
};

export default AdminMarketingBonus;