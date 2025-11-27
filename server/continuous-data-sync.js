const { Web3 } = require("web3");
const https = require("https");
const dns = require("dns");
// const NodePackagesABI = require('../build/contracts/NodePackages.json');
const NodePackagesABI = require("../react-admin-panel/src/contracts/NodePackages.json");

// Force IPv4 DNS resolution to avoid IPv6 connection issues
dns.setDefaultResultOrder("ipv4first");

// Configuration
const NODE_PACKAGES_ADDRESS =
  process.env.NODE_PACKAGES_ADDRESS ||
  "0xC8AC3954f9550Ef41705e9c0aE2179b8Df01CF4B";
const NODE_TOKEN_ADDRESS =
  process.env.NODE_TOKEN_ADDRESS ||
  "0xF3f6C7bF8B0781350e7122039219Dcb23d6643AB";

// WebSocket RPC URL
const WS_RPC_URL =
  process.env.WS_RPC_URL ||
  "wss://polygon-bor-rpc.publicnode.com";

// Fallback HTTP RPC endpoints
const HTTP_RPC_ENDPOINTS = [
  "https://polygon-rpc.com",
];

class ContinuousDataSync {
  constructor() {
    this.httpRpcEndpoints = HTTP_RPC_ENDPOINTS;
    this.currentRpcIndex = 0;
    this.useWebSocket = !!WS_RPC_URL;

    // Initialize Web3 instances
    this.wsWeb3 = new Web3(WS_RPC_URL);
    if (this.useWebSocket) {
      this.wsContract = new this.wsWeb3.eth.Contract(
        NodePackagesABI.abi,
        NODE_PACKAGES_ADDRESS
      );
      console.log("WebSocket RPC configured for real-time events");
    }

    this.web3 = new Web3(this.httpRpcEndpoints[0]);
    this.contract = new this.web3.eth.Contract(
      NodePackagesABI.abi,
      NODE_PACKAGES_ADDRESS
    );

    this.apiBaseUrl = "https://api.beastpartnerclub.com/api" || "http://localhost:3001/api";
    this.isRunning = false;
    this.lastCheckedBlock = 0;
    this.pollInterval = 15000;
    this.retryAttempts = 0;
    this.maxRetries = 3;
    this.eventSubscriptions = [];
  }

  // Helper function to safely convert BigInt values to strings
  stringifyWithBigInt(obj) {
    return JSON.stringify(obj, (key, value) =>
      typeof value === "bigint" ? value.toString() : value
    );
  }

  // Switch to next HTTP RPC endpoint when current one fails
  switchRpcEndpoint() {
    this.currentRpcIndex =
      (this.currentRpcIndex + 1) % this.httpRpcEndpoints.length;
    const newRpcUrl = this.httpRpcEndpoints[this.currentRpcIndex];
    console.log(`Switching to RPC endpoint: ${newRpcUrl}`);

    this.web3 = new Web3(newRpcUrl);
    this.contract = new this.web3.eth.Contract(
      NodePackagesABI.abi,
      NODE_PACKAGES_ADDRESS
    );
  }

  // Setup WebSocket event listeners for real-time monitoring
  async setupWebSocketEventListeners() {
    if (!this.useWebSocket) return false;

    console.log(
      "Setting up WebSocket event listeners for real-time monitoring..."
    );

    try {
      // Subscribe to all contract events
      const subscription = this.wsContract.events.allEvents({
        fromBlock: "latest",
      });

      subscription.on("data", async (event) => {
        console.log(
          `Real-time event: ${event.event} at block ${event.blockNumber}`
        );
        await this.processEvent(event.returnValues, {
          event: event.event,
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash,
        });
      });

      subscription.on("error", (error) => {
        console.error("WebSocket subscription error:", error);
        this.reconnectWebSocket();
      });

      this.eventSubscriptions.push(subscription);
      console.log("WebSocket event monitoring active");
      return true;
    } catch (error) {
      console.error("Failed to setup WebSocket listeners:", error);
      return false;
    }
  }

  // Reconnect WebSocket when connection fails
  async reconnectWebSocket() {
    if (!this.useWebSocket) return;

    console.log("Reconnecting WebSocket...");
    try {
      // Close existing subscriptions
      this.eventSubscriptions.forEach((sub) => {
        try {
          sub.unsubscribe();
        } catch (e) {}
      });
      this.eventSubscriptions = [];

      // Recreate WebSocket connection
      this.wsWeb3 = new Web3(WS_RPC_URL);
      this.wsContract = new this.wsWeb3.eth.Contract(
        NodePackagesABI.abi,
        NODE_PACKAGES_ADDRESS
      );

      // Restart event listeners
      await this.setupWebSocketEventListeners();
    } catch (error) {
      console.error("WebSocket reconnection failed:", error);
      setTimeout(() => this.reconnectWebSocket(), 30000);
    }
  }

  // Robust RPC call with failover
  async executeWithFailover(operation, operationName) {
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        console.error(
          `${operationName} failed on attempt ${attempt + 1}:`,
          error.message
        );

        if (attempt < this.maxRetries - 1) {
          this.switchRpcEndpoint();
          await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
        } else {
          throw error;
        }
      }
    }
  }

  async request(endpoint, options = {}) {
    const url = `${this.apiBaseUrl}${endpoint}`;
    
    // Create HTTPS agent that forces IPv4
    const agent = new https.Agent({
      family: 4, // Force IPv4
    });
    
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      agent: url.startsWith('https') ? agent : undefined,
      ...options,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async getLastProcessedBlock() {
    try {
      // Get the latest event from API to determine last processed block
      const events = await this.request("/events?limit=1");
      if (events.events && events.events.length > 0) {
        return events.events[0].blockNumber || 79584167;
      }
      return 79584167; // Default starting block
    } catch (error) {
      console.log("Starting from default block 79584167 ");
      return 79584167;
    }
  }

  async processEvent(parsedLog, log) {
    try {
      const block = await this.web3.eth.getBlock(log.blockNumber);
      const timestamp = new Date(Number(block.timestamp) * 1000).toISOString();

      const eventData = {
        eventType: log.event,
        userAddress: "",
        packageId: null,
        amount: "0",
        referrerAddress: "",
        blockNumber: log.blockNumber,
        transactionHash: log.transactionHash,
        eventData: "{}",
        timestamp: timestamp,
      };

      // switch (log.event) {
      //   case 'NodePackageAdded':
      //     eventData.userAddress = '';
      //     eventData.packageId = parsedLog.id;
      //     eventData.amount = '0';
      //     eventData.eventData = JSON.stringify({
      //       id: parsedLog.id,
      //       name: parsedLog.name,
      //       price: parsedLog.price,
      //       duration: parsedLog.duration,
      //       roiPercentage: parsedLog.roiPercentage
      //     });
      //     break;

      //   case 'NodePackageUpdated':
      //     eventData.userAddress = '';
      //     eventData.packageId = parsedLog.id;
      //     eventData.amount = '0';
      //     eventData.eventData = JSON.stringify({
      //       id: parsedLog.id,
      //       name: parsedLog.name,
      //       price: parsedLog.price,
      //       duration: parsedLog.duration,
      //       roiPercentage: parsedLog.roiPercentage,
      //       isActive: parsedLog.isActive
      //     });
      //     break;

      //   case 'NodePurchased':
      //     eventData.userAddress = parsedLog.user;
      //     eventData.packageId = Number(parsedLog.packageId);
      //     eventData.eventData = JSON.stringify({
      //       nodeId: Number(parsedLog.currentNodeId),
      //       expiryTime: Number(parsedLog.expiryTime),
      //       purchaseTime: Number(parsedLog.purchaseTime)
      //     });
      //     await this.updateUserStats(parsedLog.user, Number(parsedLog.packageId));
      //     break;

      //   case 'ReferralRewardEarned':
      //     eventData.userAddress = parsedLog.referrer;
      //     eventData.packageId = Number(parsedLog.packageId);
      //     eventData.amount = this.web3.utils.fromWei(parsedLog.rewardAmount.toString(), 'ether');
      //     eventData.referrerAddress = parsedLog.user;
      //     eventData.eventData = JSON.stringify({
      //       level: Number(parsedLog.level)
      //     });
      //     await this.updateUserRewards(parsedLog.referrer, this.web3.utils.fromWei(parsedLog.rewardAmount.toString(), 'ether'));
      //     break;

      //   case 'ReferralRegistered':
      //     eventData.userAddress = parsedLog.user;
      //     eventData.packageId = Number(parsedLog.packageId);
      //     eventData.referrerAddress = parsedLog.referrer;
      //     eventData.eventData = JSON.stringify({
      //       packageReferralCount: Number(parsedLog.packageReferralCount),
      //       totalReferralCount: Number(parsedLog.totalReferralCount)
      //     });
      //     await this.updateUserReferrals(parsedLog.referrer, Number(parsedLog.totalReferralCount));
      //     break;

      //   case 'RewardsClaimed':
      //     eventData.userAddress = parsedLog.user;
      //     eventData.amount = this.web3.utils.fromWei(parsedLog.amount.toString(), 'ether');
      //     eventData.eventData = JSON.stringify({
      //       nodeIndex: Number(parsedLog.nodeIndex)
      //     });
      //     break;

      //   case 'AdminMarketingBonusCollected':
      //     eventData.userAddress = parsedLog.admin;
      //     eventData.amount = this.web3.utils.fromWei(parsedLog.amount.toString(), 'ether');
      //     break;

      //   case 'AddBoosterReward':
      //     eventData.userAddress = parsedLog.user;
      //     eventData.amount = this.web3.utils.fromWei(parsedLog.boosterReward.toString(), 'ether');
      //     break;

      //   case 'ProsperityFundContribution':
      //     eventData.userAddress = ''; // System event
      //     eventData.amount = this.web3.utils.fromWei(parsedLog.amount.toString(), 'ether');
      //     eventData.eventData = JSON.stringify({
      //       newBalance: this.web3.utils.fromWei(parsedLog.newBalance.toString(), 'ether')
      //     });
      //     break;

      //   case 'PackageProsperityFundContribution':
      //     eventData.userAddress = ''; // System event
      //     eventData.packageId = Number(parsedLog.packageId);
      //     eventData.amount = this.web3.utils.fromWei(parsedLog.amount.toString(), 'ether');
      //     eventData.eventData = JSON.stringify({
      //       cycle: Number(parsedLog.cycle),
      //       newBalance: this.web3.utils.fromWei(parsedLog.newBalance.toString(), 'ether')
      //     });
      //     break;

      //   case "ReferralRegisteredAndRewardDistributed":
      //     eventData.userAddress = parsedLog.referrer;
      //     eventData.packageId = Number(parsedLog.packageId);
      //     eventData.amount = this.web3.utils.fromWei(parsedLog.rewardAmount.toString(), 'ether');
      //     eventData.eventData = JSON.stringify({
      //       user: parsedLog.user,
      //       referrer: parsedLog.referrer
      //     });
      //     break;

      //   case 'MinReferralsUpdated':
      //     eventData.userAddress = '';
      //     eventData.amount = '0';
      //     eventData.eventData = JSON.stringify({
      //       oldValue: Number(parsedLog.oldValue),
      //       newValue: Number(parsedLog.newValue)
      //     });
      //     break;

      //   case 'UpdateBoosterPercentage':
      //     eventData.userAddress = '';
      //     eventData.amount = '0';
      //     eventData.eventData = JSON.stringify({
      //       boosterPercentage: Number(parsedLog.boosterPercentage)
      //     });
      //     break;

      //   case 'ProsperityFundDistributed':
      //     eventData.userAddress = parsedLog.recipient;
      //     eventData.amount = this.web3.utils.fromWei(parsedLog.amount.toString(), 'ether');
      //     break;

      //   case 'ProsperityFundSettingsUpdated':
      //     eventData.userAddress = '';
      //     eventData.amount = '0';
      //     eventData.eventData = JSON.stringify({
      //       enabled: parsedLog.enabled,
      //       percentage: Number(parsedLog.percentage),
      //       distributionDays: Number(parsedLog.distributionDays)
      //     });
      //     break;

      //   case 'PackageProsperityFundDistributed':
      //     eventData.userAddress = parsedLog.recipient;
      //     eventData.packageId = Number(parsedLog.packageId);
      //     eventData.amount = this.web3.utils.fromWei(parsedLog.amount.toString(), 'ether');
      //     eventData.eventData = JSON.stringify({
      //       cycle: Number(parsedLog.cycle)
      //     });
      //     break;

      //   case 'AdminMarketingBonusSettingsUpdated':
      //     eventData.userAddress = parsedLog.adminWallet;
      //     eventData.amount = '0';
      //     eventData.eventData = JSON.stringify({
      //       enabled: parsedLog.enabled,
      //       percentage: Number(parsedLog.percentage)
      //     });
      //     break;

      //   case 'LiquidityWithdrawn':
      //     eventData.userAddress = parsedLog.user;
      //     eventData.amount = this.web3.utils.fromWei(parsedLog.amount.toString(), 'ether');
      //     eventData.eventData = JSON.stringify({
      //       liquidityAddress: parsedLog.liquidityAddress,
      //       percentage: Number(parsedLog.percentage),
      //       totalWithdrawn: this.web3.utils.fromWei(parsedLog.totalWithdrawn.toString(), 'ether')
      //     });
      //     break;

      //   case 'LiquidityWithdrawalSettingsUpdated':
      //     eventData.userAddress = '';
      //     eventData.amount = '0';
      //     eventData.eventData = JSON.stringify({
      //       enabled: parsedLog.enabled,
      //       percentage: Number(parsedLog.percentage),
      //       liquidityAddress: parsedLog.liquidityAddress
      //     });
      //     break;

      //   case 'FirstTimeUserFeeCollected':
      //     eventData.userAddress = parsedLog.user;
      //     eventData.packageId = Number(parsedLog.packageId);
      //     eventData.amount = this.web3.utils.fromWei(parsedLog.feeAmount.toString(), 'ether');
      //     eventData.eventData = JSON.stringify({
      //       percentage: Number(parsedLog.percentage),
      //       totalCollected: this.web3.utils.fromWei(parsedLog.totalCollected.toString(), 'ether')
      //     });
      //     break;

      //   case 'FirstTimeUserFeeSettingsUpdated':
      //     eventData.userAddress = '';
      //     eventData.amount = '0';
      //     eventData.eventData = JSON.stringify({
      //       percentage: Number(parsedLog.percentage),
      //       feeAddress: parsedLog.feeAddress
      //     });
      //     break;

      //   case 'RewardsWithdrawn':
      //     eventData.userAddress = parsedLog.user;
      //     eventData.amount = this.web3.utils.fromWei(parsedLog.amount.toString(), 'ether');
      //     break;

      //   case 'RewardWithdrawalRequest':
      //     eventData.userAddress = parsedLog.user;
      //     eventData.amount = this.web3.utils.fromWei(parsedLog.amount.toString(), 'ether');
      //     eventData.eventData = JSON.stringify({
      //       timestamp: Number(parsedLog.timestamp)
      //     });
      //     break;

      //   case 'SevenLevelReferralPercentageUpdated':
      //     eventData.userAddress = '';
      //     eventData.amount = '0';
      //     eventData.eventData = JSON.stringify({
      //       index: Number(parsedLog.index),
      //       percentage: Number(parsedLog.percentage)
      //     });
      //     break;

      //   case 'BulkReferralRewardEarned':
      //     eventData.userAddress = parsedLog.user;
      //     eventData.packageId = Number(parsedLog._packageId);
      //     eventData.amount = this.web3.utils.fromWei(parsedLog.rewardAmount.toString(), 'ether');
      //     eventData.eventData = JSON.stringify({
      //       salesTotal: this.web3.utils.fromWei(parsedLog.salesTotal.toString(), 'ether'),
      //       referralCount: Number(parsedLog.referralCount)
      //     });
      //     break;

      //   case 'RewardsDiscountSettingsUpdated':
      //     eventData.userAddress = '';
      //     eventData.amount = '0';
      //     eventData.eventData = JSON.stringify({
      //       enabled: parsedLog.enabled,
      //       percentage: Number(parsedLog.percentage)
      //     });
      //     break;

      //   case 'DiscountedNodePurchased':
      //     eventData.userAddress = parsedLog.user;
      //     eventData.packageId = Number(parsedLog.packageId);
      //     eventData.amount = this.web3.utils.fromWei(parsedLog.rewardsUsed.toString(), 'ether');
      //     eventData.eventData = JSON.stringify({
      //       originalPrice: this.web3.utils.fromWei(parsedLog.originalPrice.toString(), 'ether'),
      //       discountedPrice: this.web3.utils.fromWei(parsedLog.discountedPrice.toString(), 'ether')
      //     });
      //     break;

      //   default:
      //     console.log(`Unknown event type: ${log.event}`);
      //     return;
      // }
      switch (log.event) {
        case "NodePackageAdded":
          eventData.userAddress = "";
          eventData.packageId = parsedLog.id;
          eventData.amount = "0";
          eventData.eventData = this.stringifyWithBigInt({
            id: parsedLog.id,
            name: parsedLog.name,
            price: parsedLog.price,
            duration: parsedLog.duration,
            roiPercentage: parsedLog.roiPercentage,
          });
          break;

        case "NodePackageUpdated":
          eventData.userAddress = "";
          eventData.packageId = parsedLog.id;
          eventData.amount = "0";
          eventData.eventData = this.stringifyWithBigInt({
            id: parsedLog.id,
            name: parsedLog.name,
            price: parsedLog.price,
            duration: parsedLog.duration,
            roiPercentage: parsedLog.roiPercentage,
            isActive: parsedLog.isActive,
          });
          break;

        case "NodePurchased":
          eventData.userAddress = parsedLog.user;
          eventData.packageId = Number(parsedLog.packageId);
          eventData.eventData = JSON.stringify({
            nodeId: Number(parsedLog.currentNodeId),
            expiryTime: Number(parsedLog.expiryTime),
          });

          await this.updateUserStats(
            parsedLog.user,
            Number(parsedLog.packageId)
          );

          break;
        case "UserRegistered":
          eventData.userAddress = parsedLog.user;
          eventData.packageId = Number(parsedLog.packageId);
          await this.updateUserStats(
            parsedLog.user,
            Number(parsedLog.packageId)
          );
          break;
        case "ReferralRewardEarned":
          eventData.userAddress = parsedLog.referrer;
          eventData.packageId = Number(parsedLog.packageId);
          eventData.amount = this.web3.utils.fromWei(
            parsedLog.rewardAmount.toString(),
            "ether"
          );
          eventData.referrerAddress = parsedLog.user;
          eventData.eventData = JSON.stringify({
            level: Number(parsedLog.level),
          });
          await this.updateUserRewards(
            parsedLog.referrer,
            this.web3.utils.fromWei(parsedLog.rewardAmount.toString(), "ether")
          );
          break;

        case "ReferralRegistered":
          eventData.userAddress = parsedLog.user;
          eventData.packageId = Number(parsedLog.packageId);
          eventData.referrerAddress = parsedLog.referrer;
          eventData.eventData = JSON.stringify({
            packageReferralCount: Number(parsedLog.packageReferralCount),
            totalReferralCount: Number(parsedLog.totalReferralCount),
          });
          await this.updateUserReferrals(
            parsedLog.referrer,
            Number(parsedLog.totalReferralCount)
          );
          // Update package-wise referral stats
          await this.updatePackageReferralStats(
            parsedLog.referrer,
            Number(parsedLog.packageId),
            Number(parsedLog.packageReferralCount)
          );
          break;

        case "RewardsClaimed":
          eventData.userAddress = parsedLog.user;
          eventData.amount = this.web3.utils.fromWei(
            parsedLog.amount.toString(),
            "ether"
          );
          eventData.eventData = JSON.stringify({
            packageId: Number(parsedLog.nodeIndex),
          });
          break;

        case "AdminMarketingBonusCollected":
          eventData.userAddress = parsedLog.admin;
          eventData.amount = this.web3.utils.fromWei(
            parsedLog.amount.toString(),
            "ether"
          );
          break;

        case "AddBoosterReward":
          eventData.userAddress = parsedLog.user;
          eventData.amount = this.web3.utils.fromWei(
            parsedLog.boosterReward.toString(),
            "ether"
          );
          break;

        case "ProsperityFundContribution":
          eventData.userAddress = ""; // System event
          eventData.amount = this.web3.utils.fromWei(
            parsedLog.amount.toString(),
            "ether"
          );
          eventData.eventData = JSON.stringify({
            newBalance: this.web3.utils.fromWei(
              parsedLog.newBalance.toString(),
              "ether"
            ),
          });
          break;

        case "PackageProsperityFundContribution":
          eventData.userAddress = ""; // System event
          eventData.packageId = Number(parsedLog.packageId);
          eventData.amount = this.web3.utils.fromWei(
            parsedLog.amount.toString(),
            "ether"
          );
          eventData.eventData = JSON.stringify({
            cycle: Number(parsedLog.cycle),
            newBalance: this.web3.utils.fromWei(
              parsedLog.newBalance.toString(),
              "ether"
            ),
          });
          break;
        case "ReferralRegisteredAndRewardDistributed":
          eventData.userAddress = parsedLog.referrer;
          eventData.packageId = Number(parsedLog.packageId);
          eventData.amount = this.web3.utils.fromWei(
            parsedLog.rewardAmount.toString(),
            "ether"
          );
          eventData.level = Number(parsedLog.level);
          eventData.eventData = JSON.stringify({
            user: parsedLog.user,
            referrer: parsedLog.referrer,
            level: Number(parsedLog.level),
          });
          break;
  case "UserHoldReward":
          eventData.userAddress = parsedLog.user;
          eventData.amount = this.web3.utils.fromWei(
            parsedLog.amount.toString(),
            "ether"
          );
          eventData.packageId = Number(parsedLog.nodeIndex); // nodeIndex is actually packageId in the contract
          eventData.referrerAddress = null;
          eventData.eventData = JSON.stringify({
            packageId: Number(parsedLog.nodeIndex),
          });
          await this.updateUserRewards(
            parsedLog.user,
            this.web3.utils.fromWei(parsedLog.amount.toString(), "ether")
          );
          break;
        case "UserReleaseReward":
          eventData.userAddress = parsedLog.user;
          eventData.amount = this.web3.utils.fromWei(
            parsedLog.amount.toString(),
            "ether"
          );
          eventData.packageId = Number(parsedLog.nodeIndex); // nodeIndex is actually packageId in the contract
          eventData.referrerAddress = null;
          eventData.eventData = JSON.stringify({
            packageId: Number(parsedLog.nodeIndex),
          });
          await this.updateUserRewards(
            parsedLog.user,
            this.web3.utils.fromWei(parsedLog.amount.toString(), "ether")
          );
          break;
        case "UserHoldRewardLevel":
          eventData.userAddress = parsedLog.user;
          eventData.packageId = Number(parsedLog.nodeIndex); // nodeIndex is actually packageId in the contract
          eventData.amount = this.web3.utils.fromWei(
            parsedLog.amount.toString(),
            "ether"
          );
          eventData.referrerAddress = parsedLog.referral;
          eventData.eventData = JSON.stringify({
            user: parsedLog.referral,
            referral: parsedLog.user,
            level: Number(parsedLog.level),
          });
          await this.updateUserRewards(
            parsedLog.referral,
            this.web3.utils.fromWei(parsedLog.amount.toString(), "ether")
          );
          break;
        case "UserReleaseRewardLevel":
          eventData.userAddress = parsedLog.user;
          eventData.packageId = Number(parsedLog.nodeIndex); // nodeIndex is actually packageId in the contract
          eventData.amount = this.web3.utils.fromWei(
            parsedLog.amount.toString(),
            "ether"
          );
          eventData.referrerAddress = parsedLog.referral;
          eventData.eventData = JSON.stringify({
            user: parsedLog.referral,
            referral: parsedLog.user,
            level: Number(parsedLog.level),
          });
          await this.updateUserRewards(
            parsedLog.referral,
            this.web3.utils.fromWei(parsedLog.amount.toString(), "ether")
          );
          break;
        case "MinReferralsUpdated":
          eventData.userAddress = "";
          eventData.amount = "0";
          eventData.eventData = this.stringifyWithBigInt({
            oldValue: Number(parsedLog.oldValue),
            newValue: Number(parsedLog.newValue),
          });
          break;

        case "UpdateBoosterPercentage":
          eventData.userAddress = "";
          eventData.amount = "0";
          eventData.eventData = this.stringifyWithBigInt({
            boosterPercentage: Number(parsedLog.boosterPercentage),
          });
          break;

        case "ProsperityFundDistributed":
          eventData.userAddress = parsedLog.recipient;
          eventData.amount = this.web3.utils.fromWei(
            parsedLog.amount.toString(),
            "ether"
          );
          break;

        case "ProsperityFundSettingsUpdated":
          eventData.userAddress = "";
          eventData.amount = "0";
          eventData.eventData = this.stringifyWithBigInt({
            enabled: parsedLog.enabled,
            percentage: Number(parsedLog.percentage),
            distributionDays: Number(parsedLog.distributionDays),
          });
          break;

        case "PackageProsperityFundDistributed":
          eventData.userAddress = parsedLog.recipient;
          eventData.packageId = Number(parsedLog.packageId);
          eventData.amount = this.web3.utils.fromWei(
            parsedLog.amount.toString(),
            "ether"
          );
          eventData.eventData = JSON.stringify({
            cycle: Number(parsedLog.cycle),
          });
          break;

        case "AdminMarketingBonusSettingsUpdated":
          eventData.userAddress = parsedLog.adminWallet;
          eventData.amount = "0";
          eventData.eventData = JSON.stringify({
            enabled: parsedLog.enabled,
            percentage: Number(parsedLog.percentage),
          });
          break;

        case "LiquidityWithdrawn":
          eventData.userAddress = parsedLog.user;
          eventData.amount = this.web3.utils.fromWei(
            parsedLog.amount.toString(),
            "ether"
          );
          eventData.eventData = JSON.stringify({
            liquidityAddress: parsedLog.liquidityAddress,
            percentage: Number(parsedLog.percentage),
            totalWithdrawn: this.web3.utils.fromWei(
              parsedLog.totalWithdrawn.toString(),
              "ether"
            ),
          });
          break;

        case "LiquidityWithdrawalSettingsUpdated":
          eventData.userAddress = "";
          eventData.amount = "0";
          eventData.eventData = JSON.stringify({
            enabled: parsedLog.enabled,
            percentage: Number(parsedLog.percentage),
            liquidityAddress: parsedLog.liquidityAddress,
          });
          break;

        case "FirstTimeUserFeeCollected":
          eventData.userAddress = parsedLog.user;
          eventData.packageId = Number(parsedLog.packageId);
          eventData.amount = this.web3.utils.fromWei(
            parsedLog.feeAmount.toString(),
            "ether"
          );
          eventData.eventData = JSON.stringify({
            percentage: Number(parsedLog.percentage),
            totalCollected: this.web3.utils.fromWei(
              parsedLog.totalCollected.toString(),
              "ether"
            ),
          });
          break;

        case "FirstTimeUserFeeSettingsUpdated":
          eventData.userAddress = "";
          eventData.amount = "0";
          eventData.eventData = JSON.stringify({
            percentage: Number(parsedLog.percentage),
            feeAddress: parsedLog.feeAddress,
          });
          break;

        case "RewardsWithdrawn":
          eventData.userAddress = parsedLog.user;
          eventData.amount = this.web3.utils.fromWei(
            parsedLog.amount.toString(),
            "ether"
          );
          break;

        case "RewardWithdrawalRequest":
          eventData.userAddress = parsedLog.user;
          eventData.amount = this.web3.utils.fromWei(
            parsedLog.amount.toString(),
            "ether"
          );
          eventData.eventData = JSON.stringify({
            timestamp: Number(parsedLog.timestamp),
          });
          break;

        case "SevenLevelReferralPercentageUpdated":
          eventData.userAddress = "";
          eventData.amount = "0";
          eventData.eventData = JSON.stringify({
            index: Number(parsedLog.index),
            percentage: Number(parsedLog.percentage),
          });
          break;

        case "BulkReferralRewardEarned":
          eventData.userAddress = parsedLog.user;
          eventData.packageId = Number(parsedLog._packageId);
          eventData.amount = this.web3.utils.fromWei(
            parsedLog.rewardAmount.toString(),
            "ether"
          );
          eventData.eventData = JSON.stringify({
            salesTotal: this.web3.utils.fromWei(
              parsedLog.salesTotal.toString(),
              "ether"
            ),
            referralCount: Number(parsedLog.referralCount),
          });
          // Update ascension bonus stats for this user and package
          await this.updateAscensionBonusStats(
            parsedLog.user,
            Number(parsedLog._packageId),
            Number(parsedLog.referralCount),
            this.web3.utils.fromWei(parsedLog.salesTotal.toString(), "ether"),
            this.web3.utils.fromWei(parsedLog.rewardAmount.toString(), "ether")
          );
          break;

        case "RewardsDiscountSettingsUpdated":
          eventData.userAddress = "";
          eventData.amount = "0";
          eventData.eventData = JSON.stringify({
            enabled: parsedLog.enabled,
            percentage: Number(parsedLog.percentage),
          });
          break;

        case "DiscountedNodePurchased":
          eventData.userAddress = parsedLog.user;
          eventData.packageId = Number(parsedLog.packageId);
          eventData.amount = this.web3.utils.fromWei(
            parsedLog.rewardsUsed.toString(),
            "ether"
          );
          eventData.eventData = JSON.stringify({
            originalPrice: this.web3.utils.fromWei(
              parsedLog.originalPrice.toString(),
              "ether"
            ),
            discountedPrice: this.web3.utils.fromWei(
              parsedLog.discountedPrice.toString(),
              "ether"
            ),
          });
          break;

        default:
          console.log(`Unknown event type: ${log.event}`);
          return;
      }

      // Store event in API
      await this.request("/events", {
        method: "POST",
        body: this.stringifyWithBigInt(eventData),
      });

      console.log(
        `✅ Processed new event: ${log.event} at block ${log.blockNumber}`
      );
    } catch (error) {
      console.error("Error processing event:", error);
    }
  }

  async updateUserStats(userAddress, packageId) {
    try {
      const userData = {
        address: userAddress,
        isRegistered: true,
        totalReferrals: 0,
        totalRewards: "0",
        ascensionBonusReferrals: 0,
        ascensionBonusSalesTotal: "0",
        ascensionBonusRewardsClaimed: "0",
      };

      await this.request("/users", {
        method: "POST",
        body: this.stringifyWithBigInt(userData),
      });

      const statsData = {
        userAddress: userAddress,
        packageId: packageId,
        referralCount: 0,
        totalRewards: "0",
        ascensionBonusReferrals: 0,
        ascensionBonusSalesTotal: "0",
        ascensionBonusRewardsClaimed: "0",
      };

      await this.request("/user-stats", {
        method: "POST",
        body: this.stringifyWithBigInt(statsData),
      });
    } catch (error) {
      console.error("Error updating user stats:", error);
    }
  }

  async updateUserRewards(userAddress, rewardAmount) {
    try {
      const userData = {
        address: userAddress,
        isRegistered: true,
        totalRewards: rewardAmount,
      };

      await this.request("/users", {
        method: "POST",
        body: this.stringifyWithBigInt(userData),
      });
    } catch (error) {
      console.error("Error updating user rewards:", error);
    }
  }

  async updateUserReferrals(userAddress, totalReferrals) {
    try {
      const userData = {
        address: userAddress,
        isRegistered: true,
        totalReferrals: totalReferrals,
      };

      await this.request("/users", {
        method: "POST",
        body: this.stringifyWithBigInt(userData),
      });
    } catch (error) {
      console.error("Error updating user referrals:", error);
    }
  }

  async updateAscensionBonusStats(
    userAddress,
    packageId,
    referralCount,
    salesTotal,
    rewardAmount
  ) {
    try {
      const statsData = {
        userAddress: userAddress,
        packageId: packageId,
        ascensionBonusReferrals: referralCount,
        ascensionBonusSalesTotal: salesTotal,
        ascensionBonusRewardsClaimed: rewardAmount,
      };

      await this.request("/user-stats", {
        method: "POST",
        body: this.stringifyWithBigInt(statsData),
      });

      // Also update the user's total ascension bonus referrals
      const userData = {
        address: userAddress,
        isRegistered: true,
        ascensionBonusReferrals: referralCount,
        ascensionBonusSalesTotal: salesTotal,
        ascensionBonusRewardsClaimed: rewardAmount,
      };

      await this.request("/users", {
        method: "POST",
        body: this.stringifyWithBigInt(userData),
      });
    } catch (error) {
      console.error("Error updating ascension bonus stats:", error);
    }
  }

  async updatePackageReferralStats(
    userAddress,
    packageId,
    packageReferralCount
  ) {
    try {
      const statsData = {
        userAddress: userAddress,
        packageId: packageId,
        referralCount: packageReferralCount,
        totalRewards: "0",
        ascensionBonusReferrals: packageReferralCount, // For now, use referral count as ascension bonus
        ascensionBonusSalesTotal: "0",
        ascensionBonusRewardsClaimed: "0",
      };

      await this.request("/user-stats", {
        method: "POST",
        body: this.stringifyWithBigInt(statsData),
      });
    } catch (error) {
      console.error("Error updating package referral stats:", error);
    }
  }

  async getLastProcessedBlockFromAPI() {
    try {
      const events = await this.request("/events?limit=1");
      if (events.events && events.events.length > 0) {
        return Number(events.events[0].blockNumber) || 79584167;
      }
      return 79584167;
    } catch (error) {
      console.log("Starting from default block 79584167 ");
      return 79584167;
    }
  }

  async start() {
    console.log("Starting blockchain event monitoring...");

    // Wait for API to be ready
    let apiReady = false;
    while (!apiReady) {
      try {
        await this.request("/health");
        apiReady = true;
        console.log("API is ready");
      } catch (error) {
        console.log("Waiting for API to be ready...");
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }

    this.isRunning = true;

    // Try WebSocket real-time monitoring first
    if (this.useWebSocket) {
      const wsSuccess = await this.setupWebSocketEventListeners();
      if (wsSuccess) {
        console.log("Real-time WebSocket monitoring active");
        // Keep process alive for WebSocket events
        while (this.isRunning) {
          await new Promise((resolve) => setTimeout(resolve, 10000));
        }
        return;
      } else {
        console.log("WebSocket failed, falling back to HTTP polling");
      }
    }

    // Fallback to HTTP polling
    this.lastCheckedBlock = await this.getLastProcessedBlockFromAPI();
    console.log(`Starting HTTP polling from block ${this.lastCheckedBlock}`);
    await this.startPollingLoop();
  }

  async startPollingLoop() {
    console.log("Starting efficient event polling with RPC failover...");

    while (this.isRunning) {
      try {
        const currentBlock = await this.executeWithFailover(
          () => this.web3.eth.getBlockNumber(),
          "Getting current block number"
        );

        if (Number(currentBlock) > Number(this.lastCheckedBlock)) {
          const fromBlock = Number(this.lastCheckedBlock) + 1;
          const toBlock = Number(currentBlock);

          console.log(
            `Checking blocks ${fromBlock} to ${toBlock} for new events`
          );

          const events = await this.executeWithFailover(
            () =>
              this.contract.getPastEvents("allEvents", {
                fromBlock: fromBlock,
                toBlock: toBlock,
              }),
            "Getting past events"
          );

          if (events.length > 0) {
            console.log(`Found ${events.length} new events to process`);

            for (const event of events) {
              await this.processEvent(event.returnValues, event);
            }
          }

          this.lastCheckedBlock = currentBlock;
          this.retryAttempts = 0; // Reset retry counter on success
        }
      } catch (error) {
        console.error(
          "All RPC endpoints failed, waiting before retry:",
          error.message
        );
        this.retryAttempts++;

        // Exponential backoff when all endpoints fail
        const backoffTime = Math.min(
          30000,
          5000 * Math.pow(2, this.retryAttempts)
        );
        await new Promise((resolve) => setTimeout(resolve, backoffTime));
      }

      // Wait before next check
      await new Promise((resolve) => setTimeout(resolve, this.pollInterval));
    }
  }

  stop() {
    console.log("Stopping data synchronization...");
    this.isRunning = false;

    // Clean up WebSocket subscriptions
    this.eventSubscriptions.forEach((subscription) => {
      try {
        subscription.unsubscribe();
      } catch (error) {
        console.error("Error unsubscribing:", error);
      }
    });

    // Close WebSocket connection
    if (this.useWebSocket && this.wsWeb3.currentProvider) {
      try {
        this.wsWeb3.currentProvider.disconnect();
      } catch (error) {
        console.error("Error closing WebSocket:", error);
      }
    }
  }
}

// Start the continuous sync
const continuousSync = new ContinuousDataSync();
continuousSync.start();

// Handle graceful shutdown
process.on("SIGINT", () => {
  continuousSync.stop();
  process.exit(0);
});

process.on("SIGTERM", () => {
  continuousSync.stop();
  process.exit(0);
});
