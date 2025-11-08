import React, { useState, useEffect } from "react";
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
  Button,
  Input,
  InputGroup,
  InputLeftElement,
  Divider,
  useToast,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Select,
} from "@chakra-ui/react";
import { Search2Icon, ExternalLinkIcon } from "@chakra-ui/icons";
import { apiService } from "../services/api";
import { EXPLORER_URL, NODE_TOKEN_ADDRESS } from "../config";
import { ethers, formatEther } from "ethers";
import { getNodeTokenContract } from "../utils/ethers";

const UserManagement = ({ account }) => {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [totalUsers, setTotalUsers] = useState(0);
  const [selectedUser, setSelectedUser] = useState(null);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(10);
  const [allEvents, setAllEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsSummary, setEventsSummary] = useState(null);
  const [userEvents, setUserEvents] = useState([]);
  const [selectedUserAddress, setSelectedUserAddress] = useState("");
  const [userEventsLoading, setUserEventsLoading] = useState(false);
  const [level, setLevel] = useState(null);

  const [transferAmount, setTransferAmount] = useState("");
  const [transferLoading, setTransferLoading] = useState(false);
  const [hardRefreshLoading, setHardRefreshLoading] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: isEventsOpen,
    onOpen: onEventsOpen,
    onClose: onEventsClose,
  } = useDisclosure();
  const {
    isOpen: isUserEventsOpen,
    onOpen: onUserEventsOpen,
    onClose: onUserEventsClose,
  } = useDisclosure();
  const toast = useToast();
  const formatValue = (value, key) => {
    if (value === null || typeof value === "undefined") return "N/A";

    // 1. Specific formatting for time-related keys
    if (
      key === "purchaseTime" ||
      key === "expiryTime" ||
      key === "timestamp" ||
      key === "createdAt" ||
      key === "updatedAt"
    ) {
      return new Date(Number(value) * 1000).toLocaleString();
    }

    // 2. For monetary values, format as tokens
    const lowerKey = key.toLowerCase();
    if (
      lowerKey.includes("nodeId") ||
      lowerKey.includes("amount") ||
      lowerKey.includes("fee") ||
      lowerKey.includes("reward") ||
      lowerKey.includes("cost") ||
      lowerKey.includes("balance") ||
      lowerKey.includes("value")
    ) {
      return `${value} tokens`;
    }

    // 3. For percentage values, format as percentage
    if (lowerKey.includes("percentage")) {
      try {
        // Handle both string and number inputs for ethers v6
        // Convert the value to string first to avoid overflow errors
        const stringValue = String(value);
        return `${(stringValue)}%`;
      } catch (error) {
        console.error("Error formatting percentage:", error);
        // Fallback to direct division for large numbers
        try {
          // Manually convert from wei to ether (divide by 10^18)
          const numValue = Number(value) / 1e18;
          return `${numValue}%`;
        } catch (e) {
          return `${value}%`;
        }
      }
    }
    if (lowerKey.includes("level")) {
      // Store the level value in state using useEffect
      return `${value + 1}`;
    }

    // 3. Default: convert to string
    return value.toString();
  };
  const fetchUsers = async (params = {}) => {
    try {
      setLoading(true);
      setError("");

      // Use params if provided, otherwise use current state
      const page = params.currentPage || currentPage;
      const levelFilter = params.level || level;
      const search = params.searchTerm || searchTerm;

      // Fetch users with filters
      const response = await apiService.getUsers(page, usersPerPage);

      // Apply filters
      let filtered = response.users;
      if (search) {
        filtered = filtered.filter((user) =>
          user.address.toLowerCase().includes(search.toLowerCase())
        );
      }

      // Update state
      setUsers(response.users);
      setFilteredUsers(filtered);
      setTotalUsers(response.total);

      // If params were provided, update state to match
      if (params.currentPage) setCurrentPage(page);
      if (params.level) setLevel(levelFilter);
      if (params.searchTerm) setSearchTerm(search);
    } catch (error) {
      console.error("Error fetching users:", error);
      setError("Failed to fetch users from API");
    } finally {
      setLoading(false);
    }
  };

  const fetchAllEvents = async () => {
    try {
      setEventsLoading(true);
      const [eventsResponse, summaryResponse] = await Promise.all([
        apiService.getEvents(1, 1000),
        apiService.getEventsSummary(),
      ]);

      setAllEvents(eventsResponse.events);
      setEventsSummary(summaryResponse);
    } catch (error) {
      console.error("Error fetching events:", error);
      toast({
        title: "Error",
        description: "Failed to fetch events from API",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setEventsLoading(false);
    }
  };

  const fetchUserEvents = async (userAddress) => {
    try {
      setUserEventsLoading(true);
      setSelectedUserAddress(userAddress);

      const response = await apiService.getUserEvents(userAddress, 1, 100);
      setUserEvents(response.events);
    } catch (error) {
      console.error("Error fetching user events:", error);
      toast({
        title: "Error",
        description: "Failed to fetch user events from API",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setUserEventsLoading(false);
    }
  };

  const handleViewUserDetails = async (userAddress) => {
    try {
      const userResponse = await apiService.getUser(userAddress);
      setSelectedUser(userResponse);
      setTransferAmount("");
      onOpen();
    } catch (error) {
      console.error("Error fetching user details:", error);
      toast({
        title: "Error",
        description: "Failed to fetch user details",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleTokenTransfer = async () => {
    if (!transferAmount || !selectedUser || !account) {
      toast({
        title: "Error",
        description: "Please enter a valid transfer amount",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    try {
      setTransferLoading(true);

      // if (!window.ethereum) {
      //   throw new Error('MetaMask not detected');
      // }

      // const provider = new ethers.BrowserProvider(window.ethereum);
      // const signer = await provider.getSigner();

      // // ERC-20 token ABI for transfer function
      // const tokenABI = [
      //   "function transfer(address to, uint256 amount) external returns (bool)",
      //   "function balanceOf(address account) external view returns (uint256)",
      //   "function decimals() external view returns (uint8)"
      // ];
      if (!account) return;

      const tokenContract = await getNodeTokenContract(account.signer);
      // Convert amount to token decimals (assuming 18 decimals)
      const transferAmountWei = ethers.parseEther(transferAmount);

      // Check admin balance first
      const adminBalance = await tokenContract.balanceOf(account.address);
      // console.log("mudaser")
      if (adminBalance < transferAmountWei) {
        throw new Error("Insufficient token balance");
      }

      // Execute transfer - ensure we use the string address
      const recipientAddress =
        typeof selectedUser.address === "string"
          ? selectedUser.address
          : selectedUser.address?.address || selectedUser.address;
      console.log("address", recipientAddress, transferAmountWei);
      const tx = await tokenContract.transfer(
        recipientAddress,
        transferAmountWei
      );

      toast({
        title: "Transaction Submitted",
        description: `Transferring ${transferAmount} tokens to user...`,
        status: "info",
        duration: 5000,
        isClosable: true,
      });

      // Wait for transaction confirmation
      await tx.wait();

      toast({
        title: "Transfer Successful",
        description: `Successfully transferred ${transferAmount} tokens to ${recipientAddress}`,
        status: "success",
        duration: 8000,
        isClosable: true,
      });

      setTransferAmount("");
    } catch (error) {
      console.error("Token transfer error:", error);
      toast({
        title: "Transfer Failed",
        description: error.message || "Failed to transfer tokens",
        status: "error",
        duration: 8000,
        isClosable: true,
      });
    } finally {
      setTransferLoading(false);
    }
  };

  const handleHardRefresh = async () => {
    try {
      setHardRefreshLoading(true);

      const result = await apiService.hardRefresh();

      toast({
        title: "Hard Refresh Initiated",
        description: result.message || "Database cleared and full sync started",
        status: "success",
        duration: 10000,
        isClosable: true,
      });

      // Wait a few seconds then refresh the user list
      setTimeout(() => {
        fetchUsers();
      }, 3000);
    } catch (error) {
      console.error("Hard refresh error:", error);
      toast({
        title: "Hard Refresh Failed",
        description: error.message || "Failed to perform hard refresh",
        status: "error",
        duration: 8000,
        isClosable: true,
      });
    } finally {
      setHardRefreshLoading(false);
    }
  };

  useEffect(() => {
    if (account) {
      fetchUsers();
    }
  }, [account, currentPage]);

  // Auto-refresh users data every 30 seconds to sync referral and rewards
  useEffect(() => {
    if (!account) return;

    const interval = setInterval(() => {
      // Store current page state
      const currentParams = {
        currentPage: currentPage,
        level: level,
        searchTerm: searchTerm,
      };

      // Fetch users while maintaining current page state
      fetchUsers(currentParams);
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [account, currentPage, level, searchTerm]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = users.filter((user) =>
        user.address.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [searchTerm, users]);

  const totalPages = Math.ceil(totalUsers / usersPerPage);
  useEffect(() => {
    // Initialize level to 3 as default
    if (level === null) {
      setLevel(0);
    }

    // Look for level in event data
    if (userEvents && userEvents.length > 0) {
      for (const event of userEvents) {
        if (event.eventData) {
          try {
            const eventData =
              typeof event.eventData === "object"
                ? event.eventData
                : JSON.parse(event.eventData);

            if (eventData && eventData.level !== undefined) {
              // Found level in event data
              setLevel(Number(eventData.level + 1));
              // console.log("Level set from event data:", eventData.level);
              break;
            }
          } catch (error) {
            console.error("Error parsing event data:", error);
          }
        }
      }
    }
  }, [userEvents]);
  // Function to map event types to their display names as shown in the UI
  const getEventDisplayName = (eventType) => {
    // Check if eventType is undefined or null
    if (!eventType) {
      console.log("Warning: eventType is undefined or null");
      return "Unknown Event";
    }

    // Log the original event type for debugging
    // console.log("Original eventType:", eventType);

    // Remove spaces for mapping
    const normalizedEventType = eventType.replace(/\s+/g, "").toUpperCase();
    // console.log("Normalized eventType:", normalizedEventType);

    // console.log("Level:", level);
    // Define the mapping with uppercase keys
    const eventDisplayMap = {
      REFERRALREGISTEREDANDREWARDDISTRIBUTED: `Referral Income`,
      REWARDSCLAIMED: "Booster Income",
      FIRSTTIMEUSERFEECOLECTED: "5% Activation Bonus For Team",
      USERREGISTERED: "User Registered",
      ADDBOOSTERREWARD: "5% Activation Bonus",
      REFERRALREGISTERED: "Referral Registered",
      BULKREFERRALREWARDEARNED: "Ascension Cycle Bonus",
      NODEPURCHASED: "SBAL Purchased",
      USERHOLDREWARD: "Pending Booster Income",
      USERRELEASEREWARD: "Released Booster Income",
      USERHOLDREWARDLEVEL: "Pending Referral Income",
      USERRELEASEREWARDLEVEL: "Released Referral Income",
    };

    // Check if we have a mapping for this event type
    const mappedValue = eventDisplayMap[normalizedEventType];
    // console.log("Mapped value:", mappedValue);

    // Return the mapped value or format the original event type
    return (
      mappedValue ||
      eventType
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (str) => str.toUpperCase())
    );
  };

  return (
    <Box p={6}>
      <VStack spacing={6} align="stretch">
        <HStack justify="space-between">
          <Heading size="lg">User Management</Heading>
          <HStack>
            <Button
              colorScheme="red"
              onClick={handleHardRefresh}
              isLoading={hardRefreshLoading}
              size="sm"
              variant="outline"
            >
              Hard Refresh
            </Button>
            <Button
              colorScheme="blue"
              onClick={() => {
                fetchAllEvents();
                onEventsOpen();
              }}
              size="sm"
            >
              View All Events
            </Button>
            <Button
              colorScheme="green"
              onClick={fetchUsers}
              isLoading={loading}
              size="sm"
            >
              Refresh Users
            </Button>
          </HStack>
        </HStack>

        {/* Search */}
        <InputGroup>
          <InputLeftElement pointerEvents="none">
            <Search2Icon color="gray.300" />
          </InputLeftElement>
          <Input
            placeholder="Search users by address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </InputGroup>

        {/* Users Summary */}
        <Grid templateColumns="repeat(auto-fit, minmax(180px, 1fr))" gap={4}>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Total Users</StatLabel>
                <StatNumber>{totalUsers}</StatNumber>
                <StatHelpText>Registered users</StatHelpText>
              </Stat>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Active Referrers</StatLabel>
                <StatNumber>
                  {users.filter((u) => u.totalReferrals > 0).length}
                </StatNumber>
                <StatHelpText>Users with referrals</StatHelpText>
              </Stat>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Total Referrals</StatLabel>
                <StatNumber>
                  {users.reduce((sum, u) => sum + (u.totalReferrals || 0), 0)}
                </StatNumber>
                <StatHelpText>All referrals</StatHelpText>
              </Stat>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <Stat>
                <StatLabel>Total Rewards</StatLabel>
                <StatNumber>
                  {users
                    .reduce(
                      (sum, u) => sum + parseFloat(u.totalRewards || 0),
                      0
                    )
                    .toFixed(2)}
                </StatNumber>
                <StatHelpText>All user rewards</StatHelpText>
              </Stat>
            </CardBody>
          </Card>
        </Grid>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <Heading size="md">Users ({filteredUsers.length})</Heading>
          </CardHeader>
          <CardBody>
            {error && (
              <Alert status="error" mb={4}>
                <AlertIcon />
                {error}
              </Alert>
            )}

            {loading ? (
              <VStack>
                <Spinner size="lg" />
                <Text>Loading users from API...</Text>
              </VStack>
            ) : (
              <Table variant="simple" size="sm">
                <Thead>
                  <Tr>
                    <Th>Address</Th>
                    <Th>Referrals</Th>
                    <Th>Total Rewards</Th>
                    {/* <Th>Ascension Referrals</Th> */}
                    {/* <Th>Ascension Sales</Th> */}
                    <Th>Status</Th>
                    <Th>Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {filteredUsers.map((user) => (
                    <Tr key={user.address}>
                      <Td>
                        <Text fontFamily="mono" fontSize="sm">
                          {`${user.address.slice(0, 8)}...${user.address.slice(
                            -6
                          )}`}
                        </Text>
                      </Td>
                      <Td>
                        <Badge
                          colorScheme={
                            user.totalReferrals > 0 ? "green" : "gray"
                          }
                        >
                          {user.totalReferrals || 0}
                        </Badge>
                      </Td>
                      <Td>
                        <Text
                          fontWeight="semibold"
                          color={
                            parseFloat(user.totalRewards || 0) > 0
                              ? "green.600"
                              : "gray.500"
                          }
                        >
                          {parseFloat(user.totalRewards || 0).toFixed(4)}
                        </Text>
                      </Td>
                      {/* <Td>
                        <Badge colorScheme={user.ascensionBonusReferrals > 0 ? "purple" : "gray"} variant="subtle">
                          {user.ascensionBonusReferrals || 0}
                        </Badge>
                      </Td> */}
                      {/* <Td>
                        <Text fontSize="sm" color={parseFloat(user.ascensionBonusSalesTotal || 0) > 0 ? "blue.600" : "gray.500"}>
                          {parseFloat(user.ascensionBonusSalesTotal || 0).toFixed(2)}
                        </Text>
                      </Td> */}
                      <Td>
                        <Badge
                          colorScheme={user.isRegistered ? "green" : "red"}
                        >
                          {user.isRegistered ? "Active" : "Inactive"}
                        </Badge>
                      </Td>
                      <Td>
                        <HStack spacing={2}>
                          <Button
                            size="xs"
                            colorScheme="teal"
                            onClick={() => handleViewUserDetails(user.address)}
                          >
                            Details
                          </Button>
                          <Button
                            size="xs"
                            colorScheme="blue"
                            onClick={() => {
                              fetchUserEvents(user.address);
                              onUserEventsOpen();
                            }}
                          >
                            Events
                          </Button>
                        </HStack>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </CardBody>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <HStack justify="center">
            <Button
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              isDisabled={currentPage === 1}
            >
              Previous
            </Button>
            <Text>
              Page {currentPage} of {totalPages}
            </Text>
            <Button
              size="sm"
              onClick={() =>
                setCurrentPage(Math.min(totalPages, currentPage + 1))
              }
              isDisabled={currentPage === totalPages}
            >
              Next
            </Button>
          </HStack>
        )}
      </VStack>

      {/* User Details Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="3xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>User Details</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedUser && (
              <VStack align="stretch" spacing={6}>
                <Box>
                  <Text fontWeight="bold" mb={2}>
                    User Address:
                  </Text>
                  <Text
                    fontFamily="mono"
                    fontSize="sm"
                    bg="gray.100"
                    p={2}
                    borderRadius="md"
                  >
                    {selectedUser.address}
                  </Text>
                </Box>

                <Box>
                  <Text fontWeight="bold" mb={3}>
                    Referral Statistics:
                  </Text>
                  <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                    <Card size="sm">
                      <CardBody>
                        <Stat>
                          <StatLabel>Total Referrals</StatLabel>
                          <StatNumber color="green.600">
                            {selectedUser.totalReferrals || 0}
                          </StatNumber>
                        </Stat>
                      </CardBody>
                    </Card>
                    {/* <Card size="sm">
                      <CardBody>
                        <Stat>
                          <StatLabel>Ascension Referrals</StatLabel>
                          <StatNumber color="purple.600">{selectedUser.ascensionBonusReferrals || 0}</StatNumber>
                        </Stat>
                      </CardBody>
                    </Card> */}
                  </Grid>
                </Box>

                <Box>
                  <Text fontWeight="bold" mb={3}>
                    Rewards & Earnings:
                  </Text>
                  <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                    <Card size="sm">
                      <CardBody>
                        <Stat>
                          <StatLabel>Total Rewards</StatLabel>
                          <StatNumber color="blue.600">
                            {parseFloat(selectedUser.totalRewards || 0).toFixed(
                              4
                            )}
                          </StatNumber>
                          <StatHelpText>Accumulated rewards</StatHelpText>
                        </Stat>
                      </CardBody>
                    </Card>
                    {/* <Card size="sm">
                      <CardBody>
                        <Stat>
                          <StatLabel>Ascension Sales</StatLabel>
                          <StatNumber color="teal.600">{parseFloat(selectedUser.ascensionBonusSalesTotal || 0).toFixed(4)}</StatNumber>
                          <StatHelpText>Bonus sales total</StatHelpText>
                        </Stat>
                      </CardBody>
                    </Card> */}
                  </Grid>
                </Box>
                {/* 
                <Box>
                  <Text fontWeight="bold" mb={3}>Package-wise Ascension Referrals:</Text>
                  {selectedUserPackageStats.length > 0 ? (
                    <VStack spacing={3}>
                      {selectedUserPackageStats.map((stat) => {
                        const packageInfo = (nodePackages && Array.isArray(nodePackages)) 
                          ? nodePackages.find(pkg => pkg.packageId === stat.packageId)
                          : null;
                        return (
                          <Card key={stat.packageId} size="sm" width="100%">
                            <CardBody>
                              <HStack justify="space-between" align="center">
                                <VStack align="start" spacing={1}>
                                  <Text fontWeight="semibold" color="purple.600">
                                    {packageInfo ? packageInfo.name : `Package ${stat.packageId}`}
                                  </Text>
                                  <Text fontSize="xs" color="gray.500">
                                    Package ID: {stat.packageId}
                                  </Text>
                                </VStack>
                                <VStack align="end" spacing={1}>
                                  <Text fontWeight="bold" color="purple.700">
                                    {stat.ascensionBonusReferrals || 0} referrals
                                  </Text>
                                  <Text fontSize="xs" color="gray.600">
                                    Sales: {parseFloat(stat.ascensionBonusSalesTotal || 0).toFixed(2)}
                                  </Text>
                                  <Text fontSize="xs" color="orange.600">
                                    Claimed: {parseFloat(stat.ascensionBonusRewardsClaimed || 0).toFixed(2)}
                                  </Text>
                                </VStack>
                              </HStack>
                            </CardBody>
                          </Card>
                        );
                      })}
                    </VStack>
                  ) : (
                    <Card size="sm">
                      <CardBody>
                        <Text color="gray.500" textAlign="center">
                          No package-specific ascension data available
                        </Text>
                      </CardBody>
                    </Card>
                  )}
                </Box> */}

                <Box>
                  <Text fontWeight="bold" mb={3}>
                    Token Transfer:
                  </Text>
                  <Card size="sm">
                    <CardBody>
                      <VStack spacing={4}>
                        <Text fontSize="sm" color="gray.600" textAlign="center">
                          Transfer tokens to this user from admin wallet
                        </Text>
                        <HStack width="100%">
                          <Input
                            placeholder="Amount (e.g., 100)"
                            type="number"
                            step="0.01"
                            value={transferAmount}
                            onChange={(e) => setTransferAmount(e.target.value)}
                            isDisabled={transferLoading}
                          />
                          <Button
                            colorScheme="blue"
                            onClick={handleTokenTransfer}
                            isLoading={transferLoading}
                            loadingText="Transferring"
                            isDisabled={!transferAmount || !account}
                            size="sm"
                          >
                            Transfer
                          </Button>
                        </HStack>
                        {!account && (
                          <Text fontSize="xs" color="red.500">
                            Connect wallet to enable transfers
                          </Text>
                        )}
                      </VStack>
                    </CardBody>
                  </Card>
                </Box>

                <Box>
                  <Text fontWeight="bold" mb={2}>
                    Account Status:
                  </Text>
                  <HStack>
                    <Badge
                      colorScheme={selectedUser.isRegistered ? "green" : "red"}
                      size="lg"
                    >
                      {selectedUser.isRegistered
                        ? "Active User"
                        : "Inactive User"}
                    </Badge>
                    <Text fontSize="sm" color="gray.600">
                      Registered:{" "}
                      {new Date(selectedUser.createdAt).toLocaleDateString()}
                    </Text>
                  </HStack>
                </Box>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button onClick={onClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* All Events Modal */}
      <Modal isOpen={isEventsOpen} onClose={onEventsClose} size="full">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>All Events</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {eventsLoading ? (
              <VStack>
                <Spinner size="lg" />
                <Text>Loading events from API...</Text>
              </VStack>
            ) : (
              <VStack align="stretch" spacing={4}>
                {eventsSummary && (
                  <Grid
                    templateColumns="repeat(auto-fit, minmax(200px, 1fr))"
                    gap={4}
                  >
                    <Card>
                      <CardBody>
                        <Stat>
                          <StatLabel>Total Events</StatLabel>
                          <StatNumber>{eventsSummary.totalEvents}</StatNumber>
                        </Stat>
                      </CardBody>
                    </Card>
                    <Card>
                      <CardBody>
                        <Stat>
                          <StatLabel>Total Users</StatLabel>
                          <StatNumber>{eventsSummary.totalUsers}</StatNumber>
                        </Stat>
                      </CardBody>
                    </Card>
                  </Grid>
                )}

                <Table variant="simple" size="sm">
                  <Thead>
                    <Tr>
                      <Th>Event Type</Th>
                      <Th>User</Th>
                      <Th>Package ID</Th>
                      <Th>Amount</Th>
                      <Th>Timestamp</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {allEvents
                      .slice(0, 100)
                      .filter((event) => {
                        // Filter out ReferralRegistered and UserRegistered events
                        const normalizedEventType =
                          event.eventType?.replace(/\s+/g, "").toUpperCase() ||
                          "";
                        return (
                          normalizedEventType !== "REFERRALREGISTERED" &&
                          normalizedEventType !== "USERREGISTERED" &&
                          normalizedEventType !== "USERRELEASEREWARD" && 
                          normalizedEventType !== "USERRELEASEREWARDLEVEL"
                        );
                      })
                      .map((event) => (
                        <Tr key={event.id}>
                          <Td>
                            {event.eventType
                              ? getEventDisplayName(event.eventType)
                              : "Event"}
                          </Td>
                          <Td fontFamily="mono" fontSize="xs">
                            {event.userAddress
                              ? `${event.userAddress.slice(
                                  0,
                                  8
                                )}...${event.userAddress.slice(-6)}`
                              : "N/A"}
                          </Td>
                          <Td>{event.packageId || "N/A"}</Td>
                          <Td>
                            {event.amount
                              ? parseFloat(event.amount).toFixed(4)
                              : "N/A"}
                          </Td>
                          <Td fontSize="xs">
                            {new Date(event.timestamp).toLocaleString()}
                          </Td>
                        </Tr>
                      ))}
                  </Tbody>
                </Table>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button onClick={onEventsClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* User Events Modal */}
      <Modal isOpen={isUserEventsOpen} onClose={onUserEventsClose} size="6xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Events for {selectedUserAddress}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {userEventsLoading ? (
              <VStack>
                <Spinner size="lg" />
                <Text>Loading user events...</Text>
              </VStack>
            ) : userEvents.length === 0 ? (
              <VStack spacing={4} py={8}>
                <Text fontSize="lg" color="gray.500">
                  No events found for this user
                </Text>
                <Text fontSize="sm" color="gray.400">
                  This user may not have any blockchain activities yet, or the
                  events may still be syncing from the blockchain.
                </Text>
                <Button
                  size="sm"
                  colorScheme="blue"
                  variant="outline"
                  onClick={() => fetchUserEvents(selectedUserAddress)}
                >
                  Refresh Events
                </Button>
              </VStack>
            ) : (
              <VStack align="stretch" spacing={4}>
                <HStack justify="space-between">
                  <Text fontWeight="semibold">
                    Total Events: {userEvents.length}
                  </Text>
                  <Button
                    size="xs"
                    colorScheme="blue"
                    variant="outline"
                    onClick={() => fetchUserEvents(selectedUserAddress)}
                  >
                    Refresh
                  </Button>
                </HStack>
                <Table variant="simple" size="sm">
                  <Thead>
                    <Tr>
                      <Th>Event Type</Th>
                      <Th>Package ID</Th>
                      <Th>Event Details</Th>
                      <Th>Amount</Th>
                      <Th>Timestamp</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {userEvents
                      .filter((event) => {
                        // Filter out ReferralRegistered and UserRegistered events
                        const normalizedEventType =
                          event.eventType?.replace(/\s+/g, "").toUpperCase() ||
                          "";
                        return (
                          normalizedEventType !== "REFERRALREGISTERED" &&
                          normalizedEventType !== "USERREGISTERED" &&
                          normalizedEventType !== "USERRELEASEREWARD"&& 
                          normalizedEventType !== "USERRELEASEREWARDLEVEL"
                        );
                      })
                      .map((event) => (
                        <Tr key={event.id}>
                          <Td>
                            <Badge colorScheme="blue" variant="subtle">
                              {event.eventType
                                ? getEventDisplayName(event.eventType)
                                : "Event"}
                            </Badge>
                          </Td>
                          <Td>{event.packageId || "N/A"}</Td>
                          <Td>
                            {" "}
                            {event.eventData && (
                              <div className="flex flex-col">
                                <span className="font-medium text-gray-400">
                                  Event Data:
                                </span>

                                {(() => {
                                  let parsedData;

                                  try {
                                    // If it's already an object, use it; otherwise try parsing
                                    parsedData =
                                      typeof event.eventData === "object"
                                        ? event.eventData
                                        : JSON.parse(event.eventData);
                                  } catch (e) {
                                    // Fallback to raw string if JSON parsing fails
                                    return (
                                      <span className="break-all text-red-500">
                                        Invalid event data format
                                      </span>
                                    );
                                  }

                                  return (
                                    <div className="text-white space-y-1 mt-1">
                                      {Object?.entries(parsedData)?.map(
                                        ([key, value]) => (
                                          <div key={key} className="flex gap-2">
                                            <span className="font-semibold text-gray-300">
                                              {key}:
                                            </span>
                                            <span>
                                              {formatValue(value, key)}
                                            </span>
                                          </div>
                                        )
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>
                            )}
                          </Td>
                          <Td fontWeight="medium">
                            {event.amount
                              ? parseFloat(event.amount).toFixed(4)
                              : "N/A"}
                          </Td>
                          <Td fontSize="xs" color="gray.600">
                            {new Date(event.timestamp).toLocaleString()}
                          </Td>
                        </Tr>
                      ))}
                  </Tbody>
                </Table>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button onClick={onUserEventsClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default UserManagement;
