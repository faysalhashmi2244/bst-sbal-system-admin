import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardHeader,
  CardBody,
  Heading,
  Text,
  VStack,
  HStack,
  Badge,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Spinner,
  Alert,
  AlertIcon,
  Grid,
  GridItem,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Select,
  Button
} from '@chakra-ui/react';
import { getNodePackagesContract, getProvider } from '../utils/ethers';

const ReferralAnalytics = () => {
  const [loading, setLoading] = useState(false);
  const [monthlyData, setMonthlyData] = useState([]);
  const [prosperityData, setProsperityData] = useState([]);
  const [packages, setPackages] = useState([]);
  const [selectedPackage, setSelectedPackage] = useState('all');
  const [currentCycle, setCurrentCycle] = useState(1);
  const [error, setError] = useState('');

  const formatYearMonth = (yearMonth) => {
    if (!yearMonth) return 'Unknown';
    
    // The contract now uses: currentYear * 100 + currentMonth (YYYYMM format)
    const year = Math.floor(yearMonth / 100);
    const month = yearMonth % 100;
    
    const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    if (month < 1 || month > 12) return `${year} (Invalid Month)`;
    
    return `${monthNames[month]} ${year}`;
  };

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError('');
      const provider = getProvider();
      const nodePackagesContract = await getNodePackagesContract(provider);

      // Get package count and current cycle
      const packageCount = await nodePackagesContract.nodePackageCount();
      const cycle = await nodePackagesContract.currentProsperityFundCycle();
      setCurrentCycle(Number(cycle));

      // Fetch packages for dropdown
      const packageList = [];
      for (let i = 1; i <= packageCount; i++) {
        try {
          const pkg = await nodePackagesContract.getNodePackage(i);
          packageList.push({
            id: i,
            name: pkg.name,
            price: pkg.price,
            isActive: pkg.isActive
          });
        } catch (error) {
          console.warn(`Failed to fetch package ${i}:`, error);
        }
      }
      setPackages(packageList);

      // Fetch monthly data for selected package(s)
      const monthlyAnalytics = [];
      const prosperityAnalytics = [];
      
      const packagesToCheck = selectedPackage === 'all' ? packageList : packageList.filter(p => p.id === parseInt(selectedPackage));

      for (const pkg of packagesToCheck) {
        // Monthly data - check last 12 months
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1; // 1-12
        
        for (let i = 0; i < 12; i++) {
          const targetMonth = currentMonth - i;
          const targetYear = currentYear + Math.floor((targetMonth - 1) / 12);
          const adjustedMonth = ((targetMonth - 1) % 12) + 1;
          const yearMonth = Math.abs(targetYear) * 100 + Math.abs(adjustedMonth);
          try {
            const count = await nodePackagesContract.monthlyPackageReferrals(pkg.id, yearMonth);
            if (Number(count) > 0) {
              monthlyAnalytics.push({
                packageId: pkg.id,
                packageName: pkg.name,
                yearMonth: yearMonth,
                referralCount: Number(count)
              });
            }
          } catch (error) {
            console.warn(`Failed to fetch monthly data for package ${pkg.id}, month ${yearMonth}:`, error);
          }
        }

        // Prosperity fund cycle data
        for (let cycleNum = 1; cycleNum <= cycle; cycleNum++) {
          try {
            const count = await nodePackagesContract.prosperityFundCyclePackageReferrals(pkg.id, cycleNum);
            if (Number(count) > 0) {
              prosperityAnalytics.push({
                packageId: pkg.id,
                packageName: pkg.name,
                cycle: cycleNum,
                referralCount: Number(count)
              });
            }
          } catch (error) {
            console.warn(`Failed to fetch cycle data for package ${pkg.id}, cycle ${cycleNum}:`, error);
          }
        }
      }

      setMonthlyData(monthlyAnalytics.sort((a, b) => b.yearMonth - a.yearMonth));
      setProsperityData(prosperityAnalytics.sort((a, b) => b.cycle - a.cycle));

    } catch (error) {
      console.error('Error fetching analytics:', error);
      setError(`Failed to load analytics: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [selectedPackage]);

  const totalMonthlyReferrals = monthlyData.reduce((sum, item) => sum + item.referralCount, 0);
  const totalProsperityReferrals = prosperityData.reduce((sum, item) => sum + item.referralCount, 0);

  return (
    <VStack spacing={6} align="stretch" p={4}>
      {/* Header and Controls */}
      <Card>
        <CardHeader>
          <HStack justifyContent="space-between">
            <Heading size="lg">Referral Analytics</Heading>
            <HStack>
              <Select
                value={selectedPackage}
                onChange={(e) => setSelectedPackage(e.target.value)}
                width="200px"
              >
                <option value="all">All Packages</option>
                {packages.map(pkg => (
                  <option key={pkg.id} value={pkg.id}>
                    {pkg.name}
                  </option>
                ))}
              </Select>
              <Button onClick={fetchAnalytics} isLoading={loading} colorScheme="blue">
                Refresh
              </Button>
            </HStack>
          </HStack>
        </CardHeader>
      </Card>

      {error && (
        <Alert status="error">
          <AlertIcon />
          {error}
        </Alert>
      )}

      {/* Summary Stats */}
      <Grid templateColumns="repeat(auto-fit, minmax(250px, 1fr))" gap={4}>
        <GridItem>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Total Monthly Referrals</StatLabel>
                <StatNumber>{totalMonthlyReferrals}</StatNumber>
                <StatHelpText>Last 12 months</StatHelpText>
              </Stat>
            </CardBody>
          </Card>
        </GridItem>
        <GridItem>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Total Prosperity Cycle Referrals</StatLabel>
                <StatNumber>{totalProsperityReferrals}</StatNumber>
                <StatHelpText>All cycles combined</StatHelpText>
              </Stat>
            </CardBody>
          </Card>
        </GridItem>
        <GridItem>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Current Prosperity Cycle</StatLabel>
                <StatNumber>{currentCycle}</StatNumber>
                <StatHelpText>Active tracking cycle</StatHelpText>
              </Stat>
            </CardBody>
          </Card>
        </GridItem>
      </Grid>

      {/* Monthly Referrals Table */}
      <Card>
        <CardHeader>
          <Heading size="md">Monthly Referral Tracking</Heading>
          <Text fontSize="sm" color="gray.600">
            Referral counts per package by month
          </Text>
        </CardHeader>
        <CardBody>
          {loading ? (
            <Box textAlign="center" py={8}>
              <Spinner size="lg" />
              <Text mt={4}>Loading monthly analytics...</Text>
            </Box>
          ) : monthlyData.length === 0 ? (
            <Text textAlign="center" color="gray.500" py={8}>
              No monthly referral data available
            </Text>
          ) : (
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Package</Th>
                  <Th>Month/Year</Th>
                  <Th isNumeric>Referrals</Th>
                  <Th>Status</Th>
                </Tr>
              </Thead>
              <Tbody>
                {monthlyData.map((item, index) => (
                  <Tr key={index}>
                    <Td>
                      <VStack align="start" spacing={1}>
                        <Text fontWeight="medium">{item.packageName}</Text>
                        <Text fontSize="sm" color="gray.500">ID: {item.packageId}</Text>
                      </VStack>
                    </Td>
                    <Td>
                      <Badge colorScheme="blue" variant="subtle">
                        {formatYearMonth(item.yearMonth)}
                      </Badge>
                    </Td>
                    <Td isNumeric>
                      <Text fontWeight="bold">{item.referralCount}</Text>
                    </Td>
                    <Td>
                      <Badge colorScheme="green" size="sm">
                        Tracked
                      </Badge>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </CardBody>
      </Card>

      {/* Prosperity Fund Cycle Table */}
      <Card>
        <CardHeader>
          <Heading size="md">Prosperity Fund Cycle Tracking</Heading>
          <Text fontSize="sm" color="gray.600">
            Referral counts per package by prosperity fund distribution cycle
          </Text>
        </CardHeader>
        <CardBody>
          {loading ? (
            <Box textAlign="center" py={8}>
              <Spinner size="lg" />
              <Text mt={4}>Loading cycle analytics...</Text>
            </Box>
          ) : prosperityData.length === 0 ? (
            <Text textAlign="center" color="gray.500" py={8}>
              No prosperity cycle data available
            </Text>
          ) : (
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Package</Th>
                  <Th>Cycle</Th>
                  <Th isNumeric>Referrals</Th>
                  <Th>Status</Th>
                </Tr>
              </Thead>
              <Tbody>
                {prosperityData.map((item, index) => (
                  <Tr key={index}>
                    <Td>
                      <VStack align="start" spacing={1}>
                        <Text fontWeight="medium">{item.packageName}</Text>
                        <Text fontSize="sm" color="gray.500">ID: {item.packageId}</Text>
                      </VStack>
                    </Td>
                    <Td>
                      <Badge 
                        colorScheme={item.cycle === currentCycle ? "green" : "gray"}
                        variant="subtle"
                      >
                        Cycle {item.cycle}
                        {item.cycle === currentCycle && " (Current)"}
                      </Badge>
                    </Td>
                    <Td isNumeric>
                      <Text fontWeight="bold">{item.referralCount}</Text>
                    </Td>
                    <Td>
                      <Badge 
                        colorScheme={item.cycle === currentCycle ? "green" : "blue"} 
                        size="sm"
                      >
                        {item.cycle === currentCycle ? "Active" : "Completed"}
                      </Badge>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </CardBody>
      </Card>
    </VStack>
  );
};

export default ReferralAnalytics;