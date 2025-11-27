// Data synchronization service to populate API with blockchain data
const { Web3 } = require("web3");
const https = require("https");
const dns = require("dns");
const NodePackagesABI = require("../react-admin-panel/src/contracts/NodePackages.json");

// Force IPv4 DNS resolution to avoid IPv6 connection issues
dns.setDefaultResultOrder("ipv4first");
// const NodePackagesABI = require('../build/contracts/NodePackages.json');

// Contract configuration
const NODE_PACKAGES_ADDRESS =
  process.env.NODE_PACKAGES_ADDRESS ||
  "0xC8AC3954f9550Ef41705e9c0aE2179b8Df01CF4B";
const NODE_TOKEN_ADDRESS =
  process.env.NODE_TOKEN_ADDRESS ||
  "0xF3f6C7bF8B0781350e7122039219Dcb23d6643AB";
const RPC_URL = process.env.RPC_URL || "https://polygon-rpc.com";

class DataSyncService {
  constructor() {
    this.web3 = new Web3(RPC_URL);
    this.contract = new this.web3.eth.Contract(
      NodePackagesABI.abi,
      NODE_PACKAGES_ADDRESS
    );
    this.apiBaseUrl = 'https://api.beastpartnerclub.com/api';
    // this.apiBaseUrl = "http://localhost:3001/api";
  }

  // Helper function to safely convert BigInt values to strings
  stringifyWithBigInt(obj) {
    return JSON.stringify(obj, (key, value) =>
      typeof value === "bigint" ? value.toString() : value
    );
  }

  async request(endpoint, options = {}) {
    const url = `${this.apiBaseUrl}${endpoint}`;
    
    // Create HTTPS agent that forces IPv4
    const agent = new https.Agent({
      family: 4, // Force IPv4
    });
    
    const config = {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      agent: url.startsWith('https') ? agent : undefined,
      ...options,
    };

    try {
      const response = await fetch(url, config);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  async syncPackages() {
    try {
      console.log("Syncing node packages...");
      const packageCount = await this.contract.methods
        .nodePackageCount()
        .call();

      for (let i = 1; i <= packageCount; i++) {
        try {
          const pkg = await this.contract.methods.nodePackages(i).call();
          const packageData = {
            packageId: i,
            name: pkg.name,
            price: this.web3.utils.fromWei(pkg.price, "ether"),
            duration: Number(pkg.duration),
            roiPercentage: Number(pkg.roiPercentage),
            isActive: pkg.isActive,
          };

          await this.request("/packages", {
            method: "POST",
            body: this.stringifyWithBigInt(packageData),
          });

          console.log(`Synced package ${i}: ${pkg.name}`);
        } catch (error) {
          console.error(`Error syncing package ${i}:`, error);
        }
      }
    } catch (error) {
      console.error("Error syncing packages:", error);
    }
  }

  async syncEvents(fromBlock = 79584167, toBlock = "latest") {
    try {
      console.log(`Syncing events from block ${fromBlock} to ${toBlock}...`);

      const currentBlock = await this.web3.eth.getBlockNumber();
      const endBlock =
        toBlock === "latest" ? Number(currentBlock) : Number(toBlock);

      // Process in batches to avoid RPC limits
      const batchSize = 10000;

      for (
        let startBlock = Number(fromBlock);
        startBlock <= endBlock;
        startBlock += batchSize
      ) {
        const batchEndBlock = Math.min(startBlock + batchSize - 1, endBlock);
        console.log(`Processing blocks ${startBlock} to ${batchEndBlock}...`);

        try {
          const events = await this.contract.getPastEvents("allEvents", {
            fromBlock: startBlock,
            toBlock: batchEndBlock,
          });

          for (const event of events) {
            await this.processEvent(event.returnValues, event);
          }

          console.log(
            `Processed ${events.length} events from blocks ${startBlock}-${batchEndBlock}`
          );
        } catch (error) {
          console.error(
            `Error processing blocks ${startBlock}-${batchEndBlock}:`,
            error
          );
        }

        // Small delay to avoid overwhelming the RPC
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      console.log("Event sync completed");
    } catch (error) {
      console.error("Error syncing events:", error);
    }
  }

  async processEvent(parsedLog, log) {
    try {
      const block = await this.web3.eth.getBlock(log.blockNumber);
      const timestamp = new Date(Number(block.timestamp) * 1000).toISOString();

      let eventData = {
        eventType: log.event,
        transactionHash: log.transactionHash,
        blockNumber: log.blockNumber,
        timestamp: timestamp,
      };

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
          // console.log('Number(parsedLog.totalReferralCount)', Number(parsedLog.totalReferralCount), parsedLog.referrer)
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
          eventData.packageId = Number(parsedLog.nodeIndex);
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
            case "UserHoldReward":
          eventData.userAddress = parsedLog.user;
          eventData.packageId = Number(parsedLog.nodeIndex); // nodeIndex is actually packageId in the contract
          eventData.amount = this.web3.utils.fromWei(
            parsedLog.amount.toString(),
            "ether"
          );
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
          eventData.packageId = Number(parsedLog.nodeIndex); // nodeIndex is actually packageId in the contract
          eventData.amount = this.web3.utils.fromWei(
            parsedLog.amount.toString(),
            "ether"
          );
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
    } catch (error) {
      console.error("Error processing event:", error);
    }
  }

  async updateUserStats(userAddress, packageId) {
    try {
      // Create or update user
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

      // Update package stats
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

  async fullSync() {
    console.log("Starting full data synchronization...");

    // Check API health
    try {
      await this.request("/health");
      console.log("API is healthy, proceeding with sync...");
    } catch (error) {
      console.error("API is not available, cannot sync data");
      return;
    }

    // Sync packages first
    await this.syncPackages();

    // Then sync historical events
    await this.syncEvents();

    console.log("Full synchronization completed!");
  }
}

module.exports = { DataSyncService };

// If run directly, perform full sync
if (require.main === module) {
  const syncService = new DataSyncService();
  syncService.fullSync().catch(console.error);
}
