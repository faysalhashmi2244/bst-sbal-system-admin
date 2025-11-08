import React, { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Text,
  VStack,
  HStack,
  FormControl,
  FormLabel,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Button,
  useToast,
  SimpleGrid,
  Card,
  CardHeader,
  CardBody,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Skeleton,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Divider
} from '@chakra-ui/react';
import { useWeb3 } from '../contexts/Web3Context';
import { ethers } from 'ethers';

const ReferralSettings = () => {
  const { nodePackages, isOwner, isConnected } = useWeb3();
  const [directReferralPercentage, setDirectReferralPercentage] = useState(10);
  const [sevenLevelPercentages, setSevenLevelPercentages] = useState([]);
  const [bulkReferralPercentage, setBulkReferralPercentage] = useState(10);
  const [bulkReferralCount, setBulkReferralCount] = useState(10);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [prosperityFundBalance, setProsperityFundBalance] = useState('0');
  const [prosperityFundEnabled, setProsperityFundEnabled] = useState(true);
  const toast = useToast();

  // Load current referral settings
  const loadReferralSettings = async () => {
    try {
      setLoading(true);
      
      // Load direct referral percentage
      const directPercentage = await nodePackages.directReferralPercentage();
      setDirectReferralPercentage(parseInt(directPercentage) / 100); // Convert 1000 to 10.00
      
      // Load seven level percentages
      const percentages = [];
      for (let i = 0; i < 7; i++) {
        const percentage = await nodePackages.sevenLevelReferralPercentages(i);
        percentages.push(parseInt(percentage) / 100); // Convert to percentage
      }
      setSevenLevelPercentages(percentages);
      
      // Load bulk referral settings
      const bulkSettings = await nodePackages.bulkReferralSettings();
      setBulkReferralPercentage(parseInt(bulkSettings.percentage) / 100);
      setBulkReferralCount(parseInt(bulkSettings.count));
      
      // Load prosperity fund settings
      const fundEnabled = await nodePackages.prosperityFundEnabled();
      setProsperityFundEnabled(fundEnabled);
      
      const fundBalance = await nodePackages.getProsperityFundBalance();
      setProsperityFundBalance(ethers.formatEther(fundBalance));
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading referral settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load referral settings.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      setLoading(false);
    }
  };

  // Update direct referral percentage
  const updateDirectReferralPercentage = async () => {
    try {
      setUpdating(true);
      const percentage = Math.floor(directReferralPercentage * 100); // Convert 10.00 to 1000
      const tx = await nodePackages.updateDirectReferralPercentage(percentage);
      await tx.wait();
      
      toast({
        title: 'Success',
        description: 'Direct referral percentage updated.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      loadReferralSettings();
      setUpdating(false);
    } catch (error) {
      console.error('Error updating direct referral percentage:', error);
      toast({
        title: 'Error',
        description: 'Failed to update direct referral percentage.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      setUpdating(false);
    }
  };

  // Update seven level referral percentage
  const updateSevenLevelPercentage = async (index) => {
    try {
      setUpdating(true);
      const percentage = Math.floor(sevenLevelPercentages[index] * 100);
      const tx = await nodePackages.updateSevenLevelReferralPercentage(index, percentage);
      await tx.wait();
      
      toast({
        title: 'Success',
        description: `Level ${index + 1} referral percentage updated.`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      loadReferralSettings();
      setUpdating(false);
    } catch (error) {
      console.error('Error updating seven level percentage:', error);
      toast({
        title: 'Error',
        description: 'Failed to update seven level percentage.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      setUpdating(false);
    }
  };

  // Update bulk referral settings
  const updateBulkReferralSettings = async () => {
    try {
      setUpdating(true);
      const percentage = Math.floor(bulkReferralPercentage * 100);
      const tx = await nodePackages.updateBulkReferralSettings(percentage, bulkReferralCount);
      await tx.wait();
      
      toast({
        title: 'Success',
        description: 'Ascension referral settings updated.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      loadReferralSettings();
      setUpdating(false);
    } catch (error) {
      console.error('Error updating bulk referral settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to update bulk referral settings.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      setUpdating(false);
    }
  };

  // Toggle prosperity fund
  const toggleProsperityFund = async () => {
    try {
      setUpdating(true);
      const tx = await nodePackages.setProsperityFundEnabled(!prosperityFundEnabled);
      await tx.wait();
      
      toast({
        title: 'Success',
        description: `Prosperity fund ${!prosperityFundEnabled ? 'enabled' : 'disabled'}.`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      loadReferralSettings();
      setUpdating(false);
    } catch (error) {
      console.error('Error toggling prosperity fund:', error);
      toast({
        title: 'Error',
        description: 'Failed to toggle prosperity fund.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      setUpdating(false);
    }
  };

  // Distribute prosperity fund
  const distributeProsperityFund = async () => {
    try {
      setUpdating(true);
      const tx = await nodePackages.distributeProsperityFund();
      await tx.wait();
      
      toast({
        title: 'Success',
        description: 'Prosperity fund distributed.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      loadReferralSettings();
      setUpdating(false);
    } catch (error) {
      console.error('Error distributing prosperity fund:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to distribute prosperity fund.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      setUpdating(false);
    }
  };

  // Load settings when component mounts and contract is available
  useEffect(() => {
    if (nodePackages && isConnected) {
      loadReferralSettings();
    }
  }, [nodePackages, isConnected]);

  if (!isConnected) {
    return (
      <Box p={4}>
        <Heading size="md" mb={4}>Referral Settings</Heading>
        <Text>Please connect your wallet to view referral settings.</Text>
      </Box>
    );
  }

  if (!isOwner) {
    return (
      <Box p={4}>
        <Heading size="md" mb={4}>Referral Settings</Heading>
        <Text>Only the contract owner can access referral settings.</Text>
      </Box>
    );
  }

  return (
    <Box p={4}>
      <Heading size="md" mb={6}>Referral Settings</Heading>

      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6} mb={6}>
        <Card>
          <CardHeader>
            <Heading size="sm">Direct Referral</Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <FormControl>
                <FormLabel>Direct Referral Percentage</FormLabel>
                <HStack>
                  <NumberInput 
                    value={directReferralPercentage} 
                    onChange={(valueString) => setDirectReferralPercentage(parseFloat(valueString))}
                    min={0} 
                    max={100} 
                    step={0.1}
                    isDisabled={loading || updating}
                  >
                    <NumberInputField />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                  <Text>%</Text>
                </HStack>
              </FormControl>
              <Button 
                colorScheme="brand" 
                onClick={updateDirectReferralPercentage}
                isLoading={updating}
                isDisabled={loading}
              >
                Update
              </Button>
            </VStack>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <Heading size="sm">Bulk Referral</Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <SimpleGrid columns={2} spacing={4}>
                <FormControl>
                  <FormLabel>Percentage</FormLabel>
                  <HStack>
                    <NumberInput 
                      value={bulkReferralPercentage} 
                      onChange={(valueString) => setBulkReferralPercentage(parseFloat(valueString))}
                      min={0} 
                      max={100} 
                      step={0.1}
                      isDisabled={loading || updating}
                    >
                      <NumberInputField />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                    <Text>%</Text>
                  </HStack>
                </FormControl>
                <FormControl>
                  <FormLabel>Count</FormLabel>
                  <NumberInput 
                    value={bulkReferralCount} 
                    onChange={(valueString) => setBulkReferralCount(parseInt(valueString))}
                    min={1} 
                    max={100}
                    isDisabled={loading || updating}
                  >
                    <NumberInputField />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                </FormControl>
              </SimpleGrid>
              <Button 
                colorScheme="brand" 
                onClick={updateBulkReferralSettings}
                isLoading={updating}
                isDisabled={loading}
              >
                Update
              </Button>
            </VStack>
          </CardBody>
        </Card>
      </SimpleGrid>

      <Card mb={6}>
        <CardHeader>
          <Heading size="sm">Seven-Level Referral Percentages</Heading>
        </CardHeader>
        <CardBody>
          <VStack spacing={4} align="stretch">
            {loading ? (
              <Skeleton height="100px" />
            ) : (
              <Table variant="simple" size="sm">
                <Thead>
                  <Tr>
                    <Th>Level</Th>
                    <Th>Percentage</Th>
                    <Th>Action</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {sevenLevelPercentages.map((percentage, index) => (
                    <Tr key={index}>
                      <Td>Level {index + 1}</Td>
                      <Td>
                        <HStack>
                          <NumberInput 
                            value={percentage} 
                            onChange={(valueString) => {
                              const newPercentages = [...sevenLevelPercentages];
                              newPercentages[index] = parseFloat(valueString);
                              setSevenLevelPercentages(newPercentages);
                            }}
                            min={0} 
                            max={100} 
                            step={0.1}
                            isDisabled={updating}
                            size="sm"
                          >
                            <NumberInputField />
                            <NumberInputStepper>
                              <NumberIncrementStepper />
                              <NumberDecrementStepper />
                            </NumberInputStepper>
                          </NumberInput>
                          <Text>%</Text>
                        </HStack>
                      </Td>
                      <Td>
                        <Button 
                          colorScheme="brand" 
                          size="sm"
                          onClick={() => updateSevenLevelPercentage(index)}
                          isLoading={updating}
                        >
                          Update
                        </Button>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </VStack>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <Heading size="sm">Prosperity Fund</Heading>
        </CardHeader>
        <CardBody>
          <VStack spacing={4} align="stretch">
            <Stat>
              <StatLabel>Current Balance</StatLabel>
              <StatNumber>{prosperityFundBalance} Tokens</StatNumber>
              <StatHelpText>Available for distribution</StatHelpText>
            </Stat>
            
            <Divider />
            
            <HStack justifyContent="space-between">
              <Button 
                colorScheme={prosperityFundEnabled ? "red" : "green"} 
                onClick={toggleProsperityFund}
                isLoading={updating}
                isDisabled={loading}
              >
                {prosperityFundEnabled ? "Disable Fund" : "Enable Fund"}
              </Button>
              
              <Button 
                colorScheme="brand" 
                onClick={distributeProsperityFund}
                isLoading={updating}
                isDisabled={loading || !prosperityFundEnabled || parseFloat(prosperityFundBalance) <= 0}
              >
                Distribute Fund
              </Button>
            </HStack>
          </VStack>
        </CardBody>
      </Card>
    </Box>
  );
};

export default ReferralSettings;