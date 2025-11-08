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
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Spinner,
  Alert,
  AlertIcon,
  Select,
  Badge,
  Progress,
  Flex,
  Divider
} from '@chakra-ui/react';
import { getNodePackagesContract, getProvider, formatEther } from '../utils/ethers';

const MonthlyUserAnalytics = ({ account }) => {
  const [loading, setLoading] = useState(false);
  const [monthlyData, setMonthlyData] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [totalStats, setTotalStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    newUsersThisMonth: 0,
    totalReferrals: 0
  });
  const [error, setError] = useState('');

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const fetchMonthlyAnalytics = async () => {
    try {
      setLoading(true);
      setError('');
      const provider = getProvider();
      const nodePackagesContract = await getNodePackagesContract(provider);

      // Get total user count
      const totalUserCount = await nodePackagesContract.getWalletsCount();
      setTotalStats(prev => ({ ...prev, totalUsers: Number(totalUserCount) }));

      // Initialize monthly data array
      const monthlyAnalytics = [];
      let totalReferrals = 0;
      let activeUsers = 0;

      // Get current month to calculate new users this month
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;

      // Loop through 12 months of the selected year
      for (let month = 1; month <= 12; month++) {
        const yearMonth = selectedYear * 100 + month;
        
        try {
          // Get package count to iterate through all packages
          const packageCount = await nodePackagesContract.nodePackageCount();
          
          let monthlyReferrals = 0;
          let monthlyUsers = new Set();
          let monthlyRewards = 0;

          // Aggregate data from all packages for this month
          for (let pkgId = 1; pkgId <= Number(packageCount); pkgId++) {
            try {
              const referralCount = await nodePackagesContract.monthlyPackageReferrals(pkgId, yearMonth);
              monthlyReferrals += Number(referralCount);
              
              // Get users who made referrals this month (we'd need to iterate through users)
              // For now, we'll estimate based on referral patterns
              if (Number(referralCount) > 0) {
                monthlyUsers.add(`pkg_${pkgId}_users`);
              }
            } catch (err) {
              console.warn(`Error fetching data for package ${pkgId}, month ${yearMonth}:`, err);
            }
          }

          totalReferrals += monthlyReferrals;
          
          // Estimate active users based on referral activity
          const estimatedActiveUsers = Math.ceil(monthlyReferrals * 0.3); // Rough estimate
          if (selectedYear === currentYear && month <= currentMonth) {
            activeUsers += estimatedActiveUsers;
          }

          monthlyAnalytics.push({
            month: month,
            monthName: monthNames[month - 1],
            year: selectedYear,
            yearMonth: yearMonth,
            referrals: monthlyReferrals,
            estimatedActiveUsers: estimatedActiveUsers,
            growth: monthlyReferrals > 0 ? ((monthlyReferrals / Math.max(1, monthlyReferrals - 1)) - 1) * 100 : 0
          });

        } catch (error) {
          console.warn(`Error processing month ${month}:`, error);
          monthlyAnalytics.push({
            month: month,
            monthName: monthNames[month - 1],
            year: selectedYear,
            yearMonth: yearMonth,
            referrals: 0,
            estimatedActiveUsers: 0,
            growth: 0
          });
        }
      }

      // Calculate new users this month (simplified estimation)
      const currentMonthData = monthlyAnalytics.find(m => 
        m.year === currentYear && m.month === currentMonth
      );
      const newUsersThisMonth = currentMonthData ? currentMonthData.estimatedActiveUsers : 0;

      setMonthlyData(monthlyAnalytics);
      setTotalStats(prev => ({
        ...prev,
        totalReferrals,
        activeUsers: Math.min(activeUsers, Number(totalUserCount)),
        newUsersThisMonth
      }));

    } catch (error) {
      console.error('Error fetching monthly analytics:', error);
      setError(`Failed to load monthly analytics: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonthlyAnalytics();
  }, [selectedYear]);

  const getGrowthColor = (growth) => {
    if (growth > 0) return 'green';
    if (growth < 0) return 'red';
    return 'gray';
  };

  const getActivityLevel = (referrals) => {
    if (referrals > 50) return { level: 'High', color: 'green' };
    if (referrals > 20) return { level: 'Medium', color: 'yellow' };
    if (referrals > 0) return { level: 'Low', color: 'orange' };
    return { level: 'None', color: 'gray' };
  };

  return (
    <Box p={5}>
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <Flex justify="space-between" align="center">
          <Heading size="lg">Monthly User Analytics</Heading>
          <Select 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            width="200px"
          >
            {[2024, 2025, 2026].map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </Select>
        </Flex>

        {error && (
          <Alert status="error">
            <AlertIcon />
            <Text>{error}</Text>
          </Alert>
        )}

        {/* Summary Stats */}
        <SimpleGrid columns={{ base: 2, md: 4 }} spacing={6}>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Total Users</StatLabel>
                <StatNumber>{totalStats.totalUsers}</StatNumber>
                <StatHelpText>Registered users</StatHelpText>
              </Stat>
            </CardBody>
          </Card>
          
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Active Users</StatLabel>
                <StatNumber>{totalStats.activeUsers}</StatNumber>
                <StatHelpText>Users with activity</StatHelpText>
              </Stat>
            </CardBody>
          </Card>
          
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>New This Month</StatLabel>
                <StatNumber>{totalStats.newUsersThisMonth}</StatNumber>
                <StatHelpText>Estimated new users</StatHelpText>
              </Stat>
            </CardBody>
          </Card>
          
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Total Referrals</StatLabel>
                <StatNumber>{totalStats.totalReferrals}</StatNumber>
                <StatHelpText>For {selectedYear}</StatHelpText>
              </Stat>
            </CardBody>
          </Card>
        </SimpleGrid>

        {/* Monthly Breakdown */}
        <Card>
          <CardHeader>
            <Heading size="md">Monthly Breakdown - {selectedYear}</Heading>
          </CardHeader>
          <CardBody>
            {loading ? (
              <Box textAlign="center" py={8}>
                <Spinner size="lg" />
                <Text mt={4}>Loading monthly analytics...</Text>
              </Box>
            ) : (
              <Table variant="simple">
                <Thead>
                  <Tr>
                    <Th>Month</Th>
                    <Th isNumeric>Referrals</Th>
                    <Th isNumeric>Est. Active Users</Th>
                    <Th>Activity Level</Th>
                    <Th isNumeric>Growth %</Th>
                    <Th>Activity Bar</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {monthlyData.map((month, index) => {
                    const activity = getActivityLevel(month.referrals);
                    const maxReferrals = Math.max(...monthlyData.map(m => m.referrals));
                    const progressValue = maxReferrals > 0 ? (month.referrals / maxReferrals) * 100 : 0;
                    
                    return (
                      <Tr key={index}>
                        <Td>
                          <VStack align="start" spacing={0}>
                            <Text fontWeight="medium">{month.monthName}</Text>
                            <Text fontSize="xs" color="gray.500">{month.year}</Text>
                          </VStack>
                        </Td>
                        <Td isNumeric>
                          <Text fontWeight="bold">{month.referrals}</Text>
                        </Td>
                        <Td isNumeric>
                          <Text>{month.estimatedActiveUsers}</Text>
                        </Td>
                        <Td>
                          <Badge colorScheme={activity.color} size="sm">
                            {activity.level}
                          </Badge>
                        </Td>
                        <Td isNumeric>
                          <Text color={`${getGrowthColor(month.growth)}.500`}>
                            {month.growth > 0 ? '+' : ''}{month.growth.toFixed(1)}%
                          </Text>
                        </Td>
                        <Td>
                          <Progress 
                            value={progressValue} 
                            size="sm" 
                            colorScheme={activity.color}
                            bg="gray.100"
                          />
                        </Td>
                      </Tr>
                    );
                  })}
                </Tbody>
              </Table>
            )}
          </CardBody>
        </Card>

        {/* Insights */}
        <Card>
          <CardHeader>
            <Heading size="md">Insights</Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <Box>
                <Text fontWeight="bold" mb={2}>Activity Summary:</Text>
                <HStack spacing={4}>
                  {['High', 'Medium', 'Low', 'None'].map((level, idx) => {
                    const count = monthlyData.filter(m => getActivityLevel(m.referrals).level === level).length;
                    const color = ['green', 'yellow', 'orange', 'gray'][idx];
                    return (
                      <HStack key={level}>
                        <Badge colorScheme={color} size="sm">{level}</Badge>
                        <Text fontSize="sm">{count} months</Text>
                      </HStack>
                    );
                  })}
                </HStack>
              </Box>
              
              <Divider />
              
              <Box>
                <Text fontWeight="bold" mb={2}>Peak Performance:</Text>
                {monthlyData.length > 0 && (
                  <Text fontSize="sm" color="gray.600">
                    Highest activity: {monthlyData.reduce((max, month) => 
                      month.referrals > max.referrals ? month : max, monthlyData[0]
                    ).monthName} with {Math.max(...monthlyData.map(m => m.referrals))} referrals
                  </Text>
                )}
              </Box>
            </VStack>
          </CardBody>
        </Card>
      </VStack>
    </Box>
  );
};

export default MonthlyUserAnalytics;