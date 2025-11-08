import React, { useState, useEffect, useContext } from 'react';
import {
  Box,
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Text,
  Badge,
  Card,
  CardHeader,
  CardBody,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  SimpleGrid,
  useToast,
  Spinner,
  Center,
} from '@chakra-ui/react';
import { getNodePackagesContract, formatEther, getProvider } from '../utils/ethers';
import { RefreshContext } from '../App';

const ReferralEvents = ({ account }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalReferrals: 0,
    totalUsers: 0,
    totalVolume: '0',
  });
  const toast = useToast();
  const { refreshTrigger } = useContext(RefreshContext);

  const fetchReferralEvents = async () => {
    try {
      if (!account) return;
      
      setLoading(true);
      const provider = getProvider();
      const nodePackagesContract = await getNodePackagesContract(provider);
      
      // Get current block number
      const currentBlock = await provider.getBlockNumber();
      const BLOCK_RANGE = 10000; // Much smaller range to reduce RPC load
      
      // Get ReferralRegistered events in chunks
      const filter = nodePackagesContract.filters.ReferralRegistered();
      let allEvents = [];
      
      // Start from contract deployment block - try smaller range first
      const CONTRACT_DEPLOYMENT_BLOCK = 26117999;
      const maxBlocks = Math.min(currentBlock, CONTRACT_DEPLOYMENT_BLOCK + 100000); // Limit to first 100k blocks
      const startBlock = CONTRACT_DEPLOYMENT_BLOCK;
      
      let consecutiveFailures = 0;
      
      for (let fromBlock = startBlock; fromBlock <= maxBlocks; fromBlock += BLOCK_RANGE) {
        const toBlock = Math.min(fromBlock + BLOCK_RANGE - 1, maxBlocks);
        try {
          const events = await nodePackagesContract.queryFilter(filter, fromBlock, toBlock);
          allEvents = allEvents.concat(events);
          console.log("all events", allEvents, fromBlock, toBlock)
          consecutiveFailures = 0; // Reset failure counter on success
        } catch (error) {
          console.warn(`Failed to fetch events for blocks ${fromBlock}-${toBlock}:`, error);
          consecutiveFailures++;
          
          // If we have too many consecutive failures or RPC is unhealthy, stop trying
          if (consecutiveFailures >= 3 || error.message.includes('no backend is currently healthy')) {
            console.warn('Too many RPC failures or backend unhealthy, using partial results');
            break;
          }
          
          // Wait a bit before retrying to avoid overwhelming the RPC
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      const referralEvents = allEvents;
      
      // Process events and add additional info
      const processedEvents = await Promise.all(
        referralEvents.map(async (event) => {
          const { user, referrer, packageId, packageReferralCount, totalReferralCount } = event.args;
          
          // Get package details
          let packageName = 'Unknown';
          let packagePrice = '0';
          try {
            const packageData = await nodePackagesContract.nodePackages(packageId);
            packageName = packageData.name;
            packagePrice = packageData.price.toString();
          } catch (error) {
            console.warn('Could not fetch package details for ID:', packageId.toString());
          }
          
          return {
            blockNumber: event.blockNumber,
            transactionHash: event.transactionHash,
            user,
            referrer,
            packageId: packageId.toString(),
            packageName,
            packagePrice,
            packageReferralCount: packageReferralCount.toString(),
            totalReferralCount: totalReferralCount.toString(),
            timestamp: null, // Will be filled if needed
          };
        })
      );
      
      // Sort by block number (newest first)
      processedEvents.sort((a, b) => b.blockNumber - a.blockNumber);
      setEvents(processedEvents);
      
      // Calculate stats
      const uniqueUsers = new Set(processedEvents.map(e => e.user));
      const totalVolume = processedEvents.reduce((sum, event) => {
        return sum + parseFloat(event.packagePriceInEth);
      }, 0);
      
      setStats({
        totalReferrals: processedEvents.length,
        totalUsers: uniqueUsers.size,
        totalVolume: totalVolume.toFixed(2),
      });
      
    } catch (error) {
      console.error('Error fetching referral events:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch referral events',
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
      fetchReferralEvents();
    }
  }, [account, refreshTrigger]);

  const formatAddress = (address) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <Box p={5}>
      <Heading size="lg" mb={6}>Referral Events</Heading>
      
      {!account ? (
        <Text mb={4}>Connect your wallet to view referral events</Text>
      ) : (
        <>
          {/* Stats Cards */}
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} mb={8}>
            <Card>
              <CardHeader pb={0}>
                <Heading size="sm">Total Referrals</Heading>
              </CardHeader>
              <CardBody>
                <Stat>
                  <StatNumber>{stats.totalReferrals}</StatNumber>
                  <StatHelpText>Referral registrations</StatHelpText>
                </Stat>
              </CardBody>
            </Card>
            
            <Card>
              <CardHeader pb={0}>
                <Heading size="sm">Unique Users</Heading>
              </CardHeader>
              <CardBody>
                <Stat>
                  <StatNumber>{stats.totalUsers}</StatNumber>
                  <StatHelpText>Users with referrals</StatHelpText>
                </Stat>
              </CardBody>
            </Card>
            
            <Card>
              <CardHeader pb={0}>
                <Heading size="sm">Total Volume</Heading>
              </CardHeader>
              <CardBody>
                <Stat>
                  <StatNumber>{stats.totalVolume} ETH</StatNumber>
                  <StatHelpText>Referral purchase volume</StatHelpText>
                </Stat>
              </CardBody>
            </Card>
          </SimpleGrid>

          {/* Events Table */}
          {loading ? (
            <Center>
              <Spinner size="lg" />
            </Center>
          ) : events.length === 0 ? (
            <Text>No referral events found</Text>
          ) : (
            <Card>
              <CardHeader>
                <Heading size="md">Recent Referral Events</Heading>
              </CardHeader>
              <CardBody>
                <Table variant="simple">
                  <Thead>
                    <Tr>
                      <Th>Block</Th>
                      <Th>User</Th>
                      <Th>Referrer</Th>
                      <Th>Package</Th>
                      <Th>Price (ETH)</Th>
                      <Th>Package Referrals</Th>
                      <Th>Total Referrals</Th>
                      <Th>Tx Hash</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {events.map((event, index) => (
                      <Tr key={index}>
                        <Td>
                          <Badge colorScheme="gray" fontSize="xs">
                            {event.blockNumber}
                          </Badge>
                        </Td>
                        <Td>
                          <Text fontSize="sm" fontFamily="mono">
                            {formatAddress(event.user)}
                          </Text>
                        </Td>
                        <Td>
                          <Text fontSize="sm" fontFamily="mono">
                            {formatAddress(event.referrer)}
                          </Text>
                        </Td>
                        <Td>
                          <Text fontSize="sm">
                            {event.packageName}
                            <Badge ml={2} colorScheme="blue" fontSize="xs">
                              #{event.packageId}
                            </Badge>
                          </Text>
                        </Td>
                        <Td>
                          <Text fontSize="sm">
                            {formatEther(event.packagePrice)}
                          </Text>
                        </Td>
                        <Td>
                          <Badge colorScheme="green">
                            {event.packageReferralCount}
                          </Badge>
                        </Td>
                        <Td>
                          <Badge colorScheme="purple">
                            {event.totalReferralCount}
                          </Badge>
                        </Td>
                        <Td>
                          <Text fontSize="xs" fontFamily="mono" color="blue.500">
                            {formatAddress(event.transactionHash)}
                          </Text>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </CardBody>
            </Card>
          )}
        </>
      )}
    </Box>
  );
};

export default ReferralEvents;