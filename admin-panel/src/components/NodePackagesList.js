import React, { useState, useEffect } from 'react';
import {
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Heading,
  Button,
  useToast,
  Badge,
  Skeleton,
  Text,
  Switch,
  Flex,
  Tooltip
} from '@chakra-ui/react';
import { useWeb3 } from '../contexts/Web3Context';
import { ethers } from 'ethers';

const NodePackagesList = () => {
  const { nodePackages, isOwner, isConnected } = useWeb3();
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  // Load all node packages
  const loadPackages = async () => {
    try {
      setLoading(true);
      const packageCount = await nodePackages.getNodePackageCount();
      const count = parseInt(packageCount.toString());
      
      const packagesData = [];
      for (let i = 1; i <= count; i++) {
        const pkg = await nodePackages.nodePackages(i);
        packagesData.push({
          id: i,
          name: pkg.name,
          price: ethers.formatEther(pkg.price),
          duration: parseInt(pkg.duration) / (24 * 60 * 60), // Convert seconds to days
          roiPercentage: parseInt(pkg.roiPercentage) / 100, // Convert 2000 to 20.00%
          active: pkg.active,
        });
      }
      
      setPackages(packagesData);
      setLoading(false);
    } catch (error) {
      console.error('Error loading packages:', error);
      toast({
        title: 'Error',
        description: 'Failed to load node packages.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      setLoading(false);
    }
  };

  // Toggle active status of a package
  const togglePackageStatus = async (id, currentStatus) => {
    try {
      const tx = await nodePackages.setNodePackageActive(id, !currentStatus);
      await tx.wait();
      
      toast({
        title: 'Success',
        description: `Node package ${id} is now ${!currentStatus ? 'active' : 'inactive'}.`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      // Refresh packages list
      loadPackages();
    } catch (error) {
      console.error('Error toggling package status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update package status.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // Load packages when component mounts and contract is available
  useEffect(() => {
    if (nodePackages && isConnected) {
      loadPackages();
    }
  }, [nodePackages, isConnected]);

  if (!isConnected) {
    return (
      <Box p={4}>
        <Heading size="md" mb={4}>Node Packages</Heading>
        <Text>Please connect your wallet to view node packages.</Text>
      </Box>
    );
  }

  return (
    <Box p={4}>
      <Flex justify="space-between" align="center" mb={4}>
        <Heading size="md">Node Packages</Heading>
        <Button 
          colorScheme="brand" 
          size="sm" 
          onClick={loadPackages} 
          isLoading={loading}
        >
          Refresh
        </Button>
      </Flex>

      <TableContainer>
        <Table variant="simple">
          <Thead>
            <Tr>
              <Th>ID</Th>
              <Th>Name</Th>
              <Th isNumeric>Price (Tokens)</Th>
              <Th isNumeric>Duration (Days)</Th>
              <Th isNumeric>ROI (%)</Th>
              <Th>Status</Th>
              {isOwner && <Th>Actions</Th>}
            </Tr>
          </Thead>
          <Tbody>
            {loading ? (
              Array(5).fill(0).map((_, i) => (
                <Tr key={i}>
                  <Td><Skeleton height="20px" /></Td>
                  <Td><Skeleton height="20px" /></Td>
                  <Td><Skeleton height="20px" /></Td>
                  <Td><Skeleton height="20px" /></Td>
                  <Td><Skeleton height="20px" /></Td>
                  <Td><Skeleton height="20px" /></Td>
                  {isOwner && <Td><Skeleton height="20px" /></Td>}
                </Tr>
              ))
            ) : packages.length === 0 ? (
              <Tr>
                <Td colSpan={isOwner ? 7 : 6}>
                  <Text textAlign="center" py={4}>No node packages found.</Text>
                </Td>
              </Tr>
            ) : (
              packages.map(pkg => (
                <Tr key={pkg.id}>
                  <Td>{pkg.id}</Td>
                  <Td>{pkg.name}</Td>
                  <Td isNumeric>{pkg.price}</Td>
                  <Td isNumeric>{pkg.duration.toFixed(1)}</Td>
                  <Td isNumeric>{pkg.roiPercentage.toFixed(2)}%</Td>
                  <Td>
                    <Badge colorScheme={pkg.active ? 'green' : 'red'}>
                      {pkg.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </Td>
                  {isOwner && (
                    <Td>
                      <Tooltip label={`${pkg.active ? 'Deactivate' : 'Activate'} package`}>
                        <Switch 
                          colorScheme="brand" 
                          isChecked={pkg.active}
                          onChange={() => togglePackageStatus(pkg.id, pkg.active)}
                        />
                      </Tooltip>
                    </Td>
                  )}
                </Tr>
              ))
            )}
          </Tbody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default NodePackagesList;