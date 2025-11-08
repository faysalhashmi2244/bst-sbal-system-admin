import React, { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Button,
  Flex,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  useDisclosure,
  useToast,
  Badge,
  Switch,
  Text,
} from '@chakra-ui/react';
import { getNodePackagesContract, getNodeTokenContract, formatEther, parseEther } from '../utils/ethers';

const NodePackagesManager = ({ account }) => {
  const [nodePackages, setNodePackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newPackage, setNewPackage] = useState({
    name: '',
    price: '',
    durationInDays: '',
    roiPercentage: '',
  });
  const [editPackage, setEditPackage] = useState({
    id: '',
    name: '',
    price: '',
    durationInDays: '',
    roiPercentage: '',
  });
  const [isEditing, setIsEditing] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { 
    isOpen: isEditOpen, 
    onOpen: onEditOpen, 
    onClose: onEditClose 
  } = useDisclosure();
  const toast = useToast();
  
  const fetchNodePackages = async () => {
    try {
      if (!account) return;
      
      setLoading(true);
      const nodePackagesContract = await getNodePackagesContract(account.signer);
      const packageCount = await nodePackagesContract.nodePackageCount();
      
      const packages = [];
      for (let i = 1; i <= packageCount; i++) {
        const pkg = await nodePackagesContract.nodePackages(i);
        packages.push({
          id: i,
          name: pkg.name,
          price: pkg.price,
          duration: pkg.duration,
          roiPercentage: pkg.roiPercentage,
          isActive: pkg.isActive,
        });
      }
      
      setNodePackages(packages);
    } catch (error) {
      console.error('Error fetching node packages:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch node packages',
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
      fetchNodePackages();
    }
  }, [account]);
  
  const handleAddPackage = async () => {
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
      
      // Validate inputs
      if (!newPackage.name || !newPackage.price || !newPackage.durationInDays || !newPackage.roiPercentage) {
        toast({
          title: 'Error',
          description: 'Please fill in all fields',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        return;
      }
      
      // Convert to appropriate format
      const price = parseEther(newPackage.price);
      const durationInSeconds = parseInt(newPackage.durationInDays) //* 24 * 60 * 60;
      const roiPercentage = parseInt(newPackage.roiPercentage * 100); // Convert 20% to 2000
      
      const nodePackagesContract = await getNodePackagesContract(account.signer);
      
      const tx = await nodePackagesContract.addNodePackage(
        newPackage.name,
        price,
        durationInSeconds,
        roiPercentage
      );
      
      toast({
        title: 'Transaction Sent',
        description: 'Adding new package... Please wait for confirmation',
        status: 'info',
        duration: 5000,
        isClosable: true,
      });
      
      await tx.wait();
      
      toast({
        title: 'Success',
        description: 'Node package added successfully',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      onClose();
      setNewPackage({
        name: '',
        price: '',
        durationInDays: '',
        roiPercentage: '',
      });
      
      await fetchNodePackages();
    } catch (error) {
      console.error('Error adding node package:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add node package',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleEditClick = (packageData) => {
    setEditPackage({
      id: packageData.id,
      name: packageData.name,
      price: formatEther(packageData.price),
      durationInDays: Math.floor(Number(packageData.duration) / (24 * 60 * 60)),
      roiPercentage: Number(packageData.roiPercentage) / 100,
    });
    setIsEditing(true);
    onEditOpen();
  };

  const updateNodePackage = async () => {
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

      if (!editPackage.name || !editPackage.price || !editPackage.durationInDays || !editPackage.roiPercentage) {
        toast({
          title: 'Error',
          description: 'Please fill in all fields',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        return;
      }
      
      // Convert to appropriate format
      const price = parseEther(editPackage.price);
      const durationInSeconds = parseInt(editPackage.durationInDays) * 24 * 60 * 60;
      const roiPercentage = parseInt(editPackage.roiPercentage * 100); // Convert 20% to 2000
      
      const nodePackagesContract = await getNodePackagesContract(account.signer);
      
      const tx = await nodePackagesContract.updateNodePackage(
        editPackage.id,
        editPackage.name,
        price,
        editPackage.durationInDays,
        roiPercentage,
        true // Keep package active when updating
      );
      
      toast({
        title: 'Transaction Sent',
        description: 'Updating package... Please wait for confirmation',
        status: 'info',
        duration: 5000,
        isClosable: true,
      });
      
      await tx.wait();
      
      toast({
        title: 'Success',
        description: 'Node package updated successfully',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      onEditClose();
      setIsEditing(false);
      setEditPackage({
        id: '',
        name: '',
        price: '',
        durationInDays: '',
        roiPercentage: '',
      });
      
      await fetchNodePackages();
    } catch (error) {
      console.error('Error updating node package:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update node package',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };
  
  const togglePackageStatus = async (packageId, currentStatus) => {
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
      
      const nodePackagesContract = await getNodePackagesContract(account.signer);
      
      const tx = await nodePackagesContract.setNodePackageActive(packageId, !currentStatus);
      
      toast({
        title: 'Transaction Sent',
        description: `${currentStatus ? 'Deactivating' : 'Activating'} package... Please wait for confirmation`,
        status: 'info',
        duration: 5000,
        isClosable: true,
      });
      
      await tx.wait();
      
      toast({
        title: 'Success',
        description: `Package ${currentStatus ? 'deactivated' : 'activated'} successfully`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      await fetchNodePackages();
    } catch (error) {
      console.error('Error toggling package status:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update package status',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewPackage((prev) => ({
      ...prev,
      [name]: value,
    }));
  };
  
  return (
    <Box p={5}>
      <Flex justifyContent="space-between" alignItems="center" mb={6}>
        <Heading size="lg">Node Packages</Heading>
        <Button colorScheme="blue" onClick={onOpen} isDisabled={!account}>
          Add New Package
        </Button>
      </Flex>
      
      {!account ? (
        <Text mb={4}>Connect your wallet to manage node packages</Text>
      ) : loading ? (
        <Text>Loading packages...</Text>
      ) : nodePackages.length === 0 ? (
        <Text>No packages found</Text>
      ) : (
        <Table variant="simple">
          <Thead>
            <Tr>
              <Th>ID</Th>
              <Th>Name</Th>
              <Th>Price (ETH)</Th>
              <Th>Duration (days)</Th>
              <Th>ROI (%)</Th>
              <Th>Status</Th>
              <Th>Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {nodePackages.map((pkg) => (
              <Tr key={pkg.id}>
                <Td>{pkg.id}</Td>
                <Td>
                  <Text 
                    color="blue.500" 
                    cursor="pointer" 
                    textDecoration="underline"
                    onClick={() => handleEditClick(pkg)}
                    _hover={{ color: "blue.700" }}
                  >
                    {pkg.name}
                  </Text>
                </Td>
                <Td>{formatEther(pkg.price)}</Td>
                <Td>{Number(pkg.duration) == 0? "Lifetime": Math.floor(Number(pkg.duration) / (24 * 60 * 60))}</Td>
                <Td>{(Number(pkg.roiPercentage) / 100).toFixed(2)}%</Td>
                <Td>
                  <Badge colorScheme={pkg.isActive ? 'green' : 'red'}>
                    {pkg.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </Td>
                <Td>
                  <Switch
                    isChecked={pkg.isActive}
                    onChange={() => togglePackageStatus(pkg.id, pkg.isActive)}
                  />
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
      
      {/* Add Package Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add New Node Package</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl mb={4}>
              <FormLabel>Name</FormLabel>
              <Input 
                name="name" 
                value={newPackage.name} 
                onChange={handleInputChange} 
                placeholder="e.g. Premium Node"
              />
            </FormControl>
            
            <FormControl mb={4}>
              <FormLabel>Price (ETH)</FormLabel>
              <Input 
                name="price" 
                value={newPackage.price} 
                onChange={handleInputChange} 
                placeholder="e.g. 1.5"
                type="number"
              />
            </FormControl>
            
            <FormControl mb={4}>
              <FormLabel>Duration (days) - (0 for Lifetime)</FormLabel>
              <Input 
                name="durationInDays" 
                value={newPackage.durationInDays} 
                onChange={handleInputChange} 
                placeholder="e.g. 30"
                type="number"
              />
            </FormControl>
            
            <FormControl mb={4}>
              <FormLabel>ROI Percentage (%)</FormLabel>
              <Input 
                name="roiPercentage" 
                value={newPackage.roiPercentage} 
                onChange={handleInputChange} 
                placeholder="e.g. 20"
                type="number"
              />
            </FormControl>
          </ModalBody>
          
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleAddPackage}>
              Add Package
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Edit Package Modal */}
      <Modal isOpen={isEditOpen} onClose={onEditClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Edit Node Package</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl mb={4}>
              <FormLabel>Package Name</FormLabel>
              <Input 
                value={editPackage.name} 
                onChange={(e) => setEditPackage({...editPackage, name: e.target.value})}
                placeholder="e.g. Premium Node"
              />
            </FormControl>
            
            <FormControl mb={4}>
              <FormLabel>Price (BSL)</FormLabel>
              <Input 
                value={editPackage.price} 
                onChange={(e) => setEditPackage({...editPackage, price: e.target.value})}
                placeholder="e.g. 1.5"
                type="number"
              />
            </FormControl>
            
            <FormControl mb={4}>
              <FormLabel>Duration (days)</FormLabel>
              <Input 
                value={editPackage.durationInDays} 
                onChange={(e) => setEditPackage({...editPackage, durationInDays: e.target.value})}
                placeholder="e.g. 30 days, 0 for lifetime"
                type="number"
              />
            </FormControl>
            
            <FormControl mb={4}>
              <FormLabel>ROI Percentage (%)</FormLabel>
              <Input 
                value={editPackage.roiPercentage} 
                onChange={(e) => setEditPackage({...editPackage, roiPercentage: e.target.value})}
                placeholder="e.g. 20"
                type="number"
              />
            </FormControl>
          </ModalBody>
          
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onEditClose}>
              Cancel
            </Button>
            <Button colorScheme="green" onClick={updateNodePackage}>
              Update Package
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default NodePackagesManager;