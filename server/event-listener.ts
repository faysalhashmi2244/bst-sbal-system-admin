import { ethers } from "ethers";
import { storage } from "./storage";
import { formatEther } from "ethers";

// Contract configuration
const NODE_PACKAGES_ADDRESS =
  process.env.NODE_PACKAGES_ADDRESS ||
  "0xC8AC3954f9550Ef41705e9c0aE2179b8Df01CF4B";
const NODE_TOKEN_ADDRESS =
  process.env.NODE_TOKEN_ADDRESS ||
  "0xF3f6C7bF8B0781350e7122039219Dcb23d6643AB";
const RPC_URL = process.env.RPC_URL || "https://polygon-rpc.com";

// Contract ABIs (simplified for event listening)
const NODE_PACKAGES_ABI = [
  "event NodePurchased(address indexed user, uint256 indexed packageId, uint256 purchaseTime, uint256 expiryTime, uint256 currentNodeId)",
  "event ReferralRewardEarned(address indexed referrer, address indexed user, uint256 indexed packageId, uint256 level, uint256 rewardAmount)",
  "event ReferralRegistered(address indexed user, address indexed referrer, uint256 indexed packageId, uint256 packageReferralCount, uint256 totalReferralCount)",
  "event RewardsClaimed(address indexed user, uint256 amount, uint256 nodeIndex)",
  "event ProsperityFundContribution(uint256 amount, uint256 newBalance)",
  "event PackageProsperityFundContribution(uint256 indexed packageId, uint256 indexed cycle, uint256 amount, uint256 newBalance)",
  "event AddBoosterReward(address indexed user, uint256 boosterReward)",
  "event AdminMarketingBonusCollected(address indexed admin, uint256 amount)",
  "event LiquidityWithdrawn(address indexed admin, uint256 amount, uint256 percentage)",
  "event FirstTimeUserFeeCollected(address indexed user, uint256 packageId, uint256 feeAmount)",
  "event RewardsDiscountUsed(address indexed user, uint256 packageId, uint256 discountAmount, uint256 finalPrice)",
  "event UserHoldReward(address indexed user, uint256 amount, uint256 nodeIndex)",
  "event UserReleaseReward(address indexed user, uint256 amount, uint256 nodeIndex)",
  "event UserHoldRewardLevel(address indexed user, uint256 amount, uint256 nodeIndex, address referral, uint256 level)",
  "event UserReleaseRewardLevel(address indexed user, uint256 amount, uint256 nodeIndex, address referral, uint256 level)",
];

const NODE_TOKEN_ABI = [
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)",
];

export class EventListener {
  private provider: ethers.JsonRpcProvider;
  private nodePackagesContract: ethers.Contract;
  private nodeTokenContract: ethers.Contract;
  private isListening = false;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(RPC_URL);
    this.nodePackagesContract = new ethers.Contract(
      NODE_PACKAGES_ADDRESS,
      NODE_PACKAGES_ABI,
      this.provider
    );
    this.nodeTokenContract = new ethers.Contract(
      NODE_TOKEN_ADDRESS,
      NODE_TOKEN_ABI,
      this.provider
    );
  }

  async startListening() {
    if (this.isListening) {
      console.log("Event listener is already running");
      return;
    }

    console.log("Starting event listener...");
    this.isListening = true;

    // Listen to NodePackages events
    this.nodePackagesContract.on(
      "NodePurchased",
      this.handleNodePurchased.bind(this)
    );
    this.nodePackagesContract.on(
      "ReferralRewardEarned",
      this.handleReferralRewardEarned.bind(this)
    );
    this.nodePackagesContract.on(
      "ReferralRegistered",
      this.handleReferralRegistered.bind(this)
    );
    this.nodePackagesContract.on(
      "RewardsClaimed",
      this.handleRewardsClaimed.bind(this)
    );
    this.nodePackagesContract.on(
      "ProsperityFundContribution",
      this.handleProsperityFundContribution.bind(this)
    );
    this.nodePackagesContract.on(
      "PackageProsperityFundContribution",
      this.handlePackageProsperityFundContribution.bind(this)
    );
    this.nodePackagesContract.on(
      "AddBoosterReward",
      this.handleAddBoosterReward.bind(this)
    );
    this.nodePackagesContract.on(
      "AdminMarketingBonusCollected",
      this.handleAdminMarketingBonusCollected.bind(this)
    );
    this.nodePackagesContract.on(
      "LiquidityWithdrawn",
      this.handleLiquidityWithdrawn.bind(this)
    );
    this.nodePackagesContract.on(
      "FirstTimeUserFeeCollected",
      this.handleFirstTimeUserFeeCollected.bind(this)
    );
    this.nodePackagesContract.on(
      "RewardsDiscountUsed",
      this.handleRewardsDiscountUsed.bind(this)
    );
    this.nodePackagesContract.on(
      "UserHoldReward",
      this.handleUserHoldReward.bind(this)
    );
    this.nodePackagesContract.on(
      "UserReleaseReward",
      this.handleUserReleaseReward.bind(this)
    );
    this.nodePackagesContract.on(
      "UserHoldRewardLevel",
      this.handleUserHoldRewardLevel.bind(this)
    );
    this.nodePackagesContract.on(
      "UserReleaseRewardLevel",
      this.handleUserReleaseRewardLevel.bind(this)
    );
    // Listen to NodeToken events
    this.nodeTokenContract.on("Transfer", this.handleTransfer.bind(this));

    console.log("Event listener started successfully");
  }

  async stopListening() {
    if (!this.isListening) return;

    console.log("Stopping event listener...");
    this.nodePackagesContract.removeAllListeners();
    this.nodeTokenContract.removeAllListeners();
    this.isListening = false;
    console.log("Event listener stopped");
  }
  private async handleUserHoldReward(
    user: string,
    amount: bigint,
    nodeIndex: bigint,
    event: any
  ) {
    try {
      console.log(
        `UserHoldReward: ${user} received hold reward ${formatEther(
          amount
        )} for node ${nodeIndex}`
      );

      // Update user's total rewards
      let userRecord = await storage.getUser(user);
      if (!userRecord) {
        userRecord = await storage.createUser({
          address: user,
          totalRewards: formatEther(amount),
        });
      } else {
        const newTotalRewards = (
          parseFloat(userRecord.totalRewards || "0") +
          parseFloat(formatEther(amount))
        ).toString();
        await storage.updateUser(user, { totalRewards: newTotalRewards });
      }

      // Store event
      await storage.createEvent({
        eventType: "UserHoldReward",
        userAddress: user,
        packageId: Number(nodeIndex), // nodeIndex is actually packageId in the contract
        amount: formatEther(amount),
        referrerAddress: null,
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber,
        timestamp: new Date(),
        eventData: JSON.stringify({
          packageId: Number(nodeIndex),
        }),
      });
    } catch (error) {
      console.error("Error handling UserHoldReward event:", error);
    }
  }

  private async handleUserReleaseReward(
    user: string,
    amount: bigint,
    nodeIndex: bigint,
    event: any
  ) {
    try {
      console.log(
        `UserReleaseReward: ${user} received release reward ${formatEther(
          amount
        )} for node ${nodeIndex}`
      );

      // Update user's total rewards
      let userRecord = await storage.getUser(user);
      if (!userRecord) {
        userRecord = await storage.createUser({
          address: user,
          totalRewards: formatEther(amount),
        });
      } else {
        const newTotalRewards = (
          parseFloat(userRecord.totalRewards || "0") +
          parseFloat(formatEther(amount))
        ).toString();
        await storage.updateUser(user, { totalRewards: newTotalRewards });
      }

      // Store event
      await storage.createEvent({
        eventType: "UserReleaseReward",
        userAddress: user,
        packageId: Number(nodeIndex), // nodeIndex is actually packageId in the contract
        amount: formatEther(amount),
        referrerAddress: null,
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber,
        timestamp: new Date(),
        eventData: JSON.stringify({
          packageId: Number(nodeIndex),
        }),
      });
    } catch (error) {
      console.error("Error handling UserReleaseReward event:", error);
    }
  }

  private async handleUserHoldRewardLevel(
    user: string,
    amount: bigint,
    nodeIndex: bigint,
    referral: string,
    level: bigint,
    event: any
  ) {
    try {
      console.log(
        `UserHoldRewardLevel: ${user} received hold reward ${formatEther(
          amount
        )} for node ${nodeIndex}, referral: ${referral}, level: ${level}`
      );

      // Update user's total rewards
      let userRecord = await storage.getUser(user);
      if (!userRecord) {
        userRecord = await storage.createUser({
          address: user,
          totalRewards: formatEther(amount),
        });
      } else {
        const newTotalRewards = (
          parseFloat(userRecord.totalRewards || "0") +
          parseFloat(formatEther(amount))
        ).toString();
        await storage.updateUser(user, { totalRewards: newTotalRewards });
      }

      // Store event
      await storage.createEvent({
        eventType: "UserHoldRewardLevel",
        userAddress: user,
        packageId: Number(nodeIndex), // nodeIndex is actually packageId in the contract
        amount: formatEther(amount),
        referrerAddress: referral,
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber,
        timestamp: new Date(),
        eventData: JSON.stringify({
          user: referral,
          referral: user,
          level: Number(level),
        }),
      });
    } catch (error) {
      console.error("Error handling UserHoldRewardLevel event:", error);
    }
  }

  private async handleUserReleaseRewardLevel(
    user: string,
    amount: bigint,
    nodeIndex: bigint,
    referral: string,
    level: bigint,
    event: any
  ) {
    try {
      console.log(
        `UserReleaseRewardLevel: ${user} received release reward ${formatEther(
          amount
        )} for node ${nodeIndex}, referral: ${referral}, level: ${level}`
      );

      // Update user's total rewards
      let userRecord = await storage.getUser(user);
      if (!userRecord) {
        userRecord = await storage.createUser({
          address: user,
          totalRewards: formatEther(amount),
        });
      } else {
        const newTotalRewards = (
          parseFloat(userRecord.totalRewards || "0") +
          parseFloat(formatEther(amount))
        ).toString();
        await storage.updateUser(user, { totalRewards: newTotalRewards });
      }

      // Store event
      await storage.createEvent({
        eventType: "UserReleaseRewardLevel",
        userAddress: user,
        packageId: Number(nodeIndex), // nodeIndex is actually packageId in the contract
        amount: formatEther(amount),
        referrerAddress: referral,
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber,
        timestamp: new Date(),
        eventData: JSON.stringify({
          user: referral,
          referral: user,
          level: Number(level),
        }),
      });
    } catch (error) {
      console.error("Error handling UserReleaseRewardLevel event:", error);
    }
  }
  private async handleNodePurchased(
    user: string,
    packageId: bigint,
    purchaseTime: bigint,
    expiryTime: bigint,
    currentNodeId: bigint,
    event: any
  ) {
    try {
      console.log(
        `NodePurchased: ${user}, Package: ${packageId}, Node: ${currentNodeId}`
      );

      // Create or update user
      let userRecord = await storage.getUser(user);
      if (!userRecord) {
        userRecord = await storage.createUser({
          address: user,
          isRegistered: true,
          totalReferrals: 0,
          totalRewards: "0",
          ascensionBonusReferrals: 0,
          ascensionBonusSalesTotal: "0",
          ascensionBonusRewardsClaimed: "0",
        });
      }

      // Create user node
      await storage.createUserNode({
        userId: userRecord.id,
        packageId: Number(packageId),
        nodeId: Number(currentNodeId),
        purchaseTime: new Date(Number(purchaseTime) * 1000),
        expiryTime: new Date(Number(expiryTime) * 1000),
        isActive: true,
      });

      // Store event
      await storage.createEvent({
        eventType: "NodePurchased",
        userAddress: user,
        packageId: Number(packageId),
        amount: null,
        referrerAddress: null,
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber,
        timestamp: new Date(Number(purchaseTime) * 1000),
        eventData: JSON.stringify({
          nodeId: Number(currentNodeId),
          expiryTime: Number(expiryTime),
        }),
      });
    } catch (error) {
      console.error("Error handling NodePurchased event:", error);
    }
  }

  private async handleReferralRewardEarned(
    referrer: string,
    user: string,
    packageId: bigint,
    level: bigint,
    rewardAmount: bigint,
    event: any
  ) {
    try {
      console.log(
        `ReferralRewardEarned: ${referrer} earned ${formatEther(
          rewardAmount
        )} from ${user} (Level ${level})`
      );

      // Update referrer's rewards
      let referrerRecord = await storage.getUser(referrer);
      if (!referrerRecord) {
        referrerRecord = await storage.createUser({
          address: referrer,
          totalRewards: formatEther(rewardAmount),
        });
      } else {
        const newTotalRewards = (
          parseFloat(referrerRecord.totalRewards || "0") +
          parseFloat(formatEther(rewardAmount))
        ).toString();
        await storage.updateUser(referrer, { totalRewards: newTotalRewards });
      }

      // Update package-specific stats
      await this.updateUserPackageStats(referrerRecord.id, Number(packageId), {
        totalRewards: formatEther(rewardAmount),
      });

      // Store event
      await storage.createEvent({
        eventType: "ReferralRewardEarned",
        userAddress: referrer,
        packageId: Number(packageId),
        amount: formatEther(rewardAmount),
        referrerAddress: user,
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber,
        timestamp: new Date(),
        eventData: JSON.stringify({
          level: Number(level),
        }),
      });
    } catch (error) {
      console.error("Error handling ReferralRewardEarned event:", error);
    }
  }

  private async handleReferralRegistered(
    user: string,
    referrer: string,
    packageId: bigint,
    packageReferralCount: bigint,
    totalReferralCount: bigint,
    event: any
  ) {
    try {
      console.log(
        `ReferralRegistered: ${user} referred by ${referrer}, Package: ${packageId}`
      );

      // Update referrer's referral counts
      let referrerRecord = await storage.getUser(referrer);
      if (referrerRecord) {
        await storage.updateUser(referrer, {
          totalReferrals: Number(totalReferralCount),
        });

        // Update package-specific referral count
        await this.updateUserPackageStats(
          referrerRecord.id,
          Number(packageId),
          {
            referralCount: Number(packageReferralCount),
          }
        );
      }

      // Store event
      await storage.createEvent({
        eventType: "ReferralRegistered",
        userAddress: user,
        packageId: Number(packageId),
        amount: null,
        referrerAddress: referrer,
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber,
        timestamp: new Date(),
        eventData: JSON.stringify({
          packageReferralCount: Number(packageReferralCount),
          totalReferralCount: Number(totalReferralCount),
        }),
      });
    } catch (error) {
      console.error("Error handling ReferralRegistered event:", error);
    }
  }

  private async handleRewardsClaimed(
    user: string,
    amount: bigint,
    nodeIndex: bigint,
    event: any
  ) {
    try {
      console.log(`RewardsClaimed: ${user} claimed ${formatEther(amount)}`);

      // Store event
      await storage.createEvent({
        eventType: "RewardsClaimed",
        userAddress: user,
        packageId: Number(nodeIndex),
        amount: formatEther(amount),
        referrerAddress: null,
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber,
        timestamp: new Date(),
        eventData: JSON.stringify({
          packageId: Number(nodeIndex),
        }),
      });
    } catch (error) {
      console.error("Error handling RewardsClaimed event:", error);
    }
  }

  private async handleProsperityFundContribution(
    amount: bigint,
    newBalance: bigint,
    event: any
  ) {
    try {
      console.log(
        `ProsperityFundContribution: ${formatEther(amount)} contributed`
      );

      // Store event
      await storage.createEvent({
        eventType: "ProsperityFundContribution",
        userAddress: "", // System event
        packageId: null,
        amount: formatEther(amount),
        referrerAddress: null,
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber,
        timestamp: new Date(),
        eventData: JSON.stringify({
          newBalance: formatEther(newBalance),
        }),
      });
    } catch (error) {
      console.error("Error handling ProsperityFundContribution event:", error);
    }
  }

  private async handlePackageProsperityFundContribution(
    packageId: bigint,
    cycle: bigint,
    amount: bigint,
    newBalance: bigint,
    event: any
  ) {
    try {
      console.log(
        `PackageProsperityFundContribution: Package ${packageId}, Cycle ${cycle}, Amount: ${formatEther(
          amount
        )}`
      );

      // Store event
      await storage.createEvent({
        eventType: "PackageProsperityFundContribution",
        userAddress: "", // System event
        packageId: Number(packageId),
        amount: formatEther(amount),
        referrerAddress: null,
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber,
        timestamp: new Date(),
        eventData: JSON.stringify({
          cycle: Number(cycle),
          newBalance: formatEther(newBalance),
        }),
      });
    } catch (error) {
      console.error(
        "Error handling PackageProsperityFundContribution event:",
        error
      );
    }
  }

  private async handleAddBoosterReward(
    user: string,
    boosterReward: bigint,
    event: any
  ) {
    try {
      console.log(
        `AddBoosterReward: ${user} received ${formatEther(boosterReward)}`
      );

      // Store event
      await storage.createEvent({
        eventType: "AddBoosterReward",
        userAddress: user,
        packageId: null,
        amount: formatEther(boosterReward),
        referrerAddress: null,
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber,
        timestamp: new Date(),
        eventData: null,
      });
    } catch (error) {
      console.error("Error handling AddBoosterReward event:", error);
    }
  }

  private async handleAdminMarketingBonusCollected(
    admin: string,
    amount: bigint,
    event: any
  ) {
    try {
      console.log(
        `AdminMarketingBonusCollected: ${admin} collected ${formatEther(
          amount
        )}`
      );

      // Store event
      await storage.createEvent({
        eventType: "AdminMarketingBonusCollected",
        userAddress: admin,
        packageId: null,
        amount: formatEther(amount),
        referrerAddress: null,
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber,
        timestamp: new Date(),
        eventData: null,
      });
    } catch (error) {
      console.error(
        "Error handling AdminMarketingBonusCollected event:",
        error
      );
    }
  }

  private async handleLiquidityWithdrawn(
    admin: string,
    amount: bigint,
    percentage: bigint,
    event: any
  ) {
    try {
      console.log(
        `LiquidityWithdrawn: ${admin} withdrew ${formatEther(
          amount
        )} (${percentage}%)`
      );

      // Store event
      await storage.createEvent({
        eventType: "LiquidityWithdrawn",
        userAddress: admin,
        packageId: null,
        amount: formatEther(amount),
        referrerAddress: null,
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber,
        timestamp: new Date(),
        eventData: JSON.stringify({
          percentage: Number(percentage),
        }),
      });
    } catch (error) {
      console.error("Error handling LiquidityWithdrawn event:", error);
    }
  }

  private async handleFirstTimeUserFeeCollected(
    user: string,
    packageId: bigint,
    feeAmount: bigint,
    event: any
  ) {
    try {
      console.log(
        `FirstTimeUserFeeCollected: ${user} paid ${formatEther(
          feeAmount
        )} for package ${packageId}`
      );

      // Store event
      await storage.createEvent({
        eventType: "FirstTimeUserFeeCollected",
        userAddress: user,
        packageId: Number(packageId),
        amount: formatEther(feeAmount),
        referrerAddress: null,
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber,
        timestamp: new Date(),
        eventData: null,
      });
    } catch (error) {
      console.error("Error handling FirstTimeUserFeeCollected event:", error);
    }
  }

  private async handleRewardsDiscountUsed(
    user: string,
    packageId: bigint,
    discountAmount: bigint,
    finalPrice: bigint,
    event: any
  ) {
    try {
      console.log(
        `RewardsDiscountUsed: ${user} used ${formatEther(
          discountAmount
        )} discount for package ${packageId}`
      );

      // Store event
      await storage.createEvent({
        eventType: "RewardsDiscountUsed",
        userAddress: user,
        packageId: Number(packageId),
        amount: formatEther(discountAmount),
        referrerAddress: null,
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber,
        timestamp: new Date(),
        eventData: JSON.stringify({
          finalPrice: formatEther(finalPrice),
        }),
      });
    } catch (error) {
      console.error("Error handling RewardsDiscountUsed event:", error);
    }
  }

  private async handleTransfer(
    from: string,
    to: string,
    value: bigint,
    event: any
  ) {
    try {
      // Only track transfers involving our contracts
      if (from === NODE_PACKAGES_ADDRESS || to === NODE_PACKAGES_ADDRESS) {
        console.log(`Transfer: ${formatEther(value)} from ${from} to ${to}`);

        // Store event
        await storage.createEvent({
          eventType: "Transfer",
          userAddress: from === NODE_PACKAGES_ADDRESS ? to : from,
          packageId: null,
          amount: formatEther(value),
          referrerAddress: from === NODE_PACKAGES_ADDRESS ? from : to,
          transactionHash: event.transactionHash,
          blockNumber: event.blockNumber,
          timestamp: new Date(),
          eventData: JSON.stringify({
            from,
            to,
          }),
        });
      }
    } catch (error) {
      console.error("Error handling Transfer event:", error);
    }
  }

  private async updateUserPackageStats(
    userId: number,
    packageId: number,
    updates: Partial<{
      referralCount: number;
      totalRewards: string;
      ascensionBonusReferrals: number;
      ascensionBonusSalesTotal: string;
      ascensionBonusRewardsClaimed: string;
    }>
  ) {
    try {
      const existing = await storage.getUserPackageStats(userId, packageId);

      const newStats = {
        referralCount: existing?.referralCount || 0,
        totalRewards: existing?.totalRewards || "0",
        ascensionBonusReferrals: existing?.ascensionBonusReferrals || 0,
        ascensionBonusSalesTotal: existing?.ascensionBonusSalesTotal || "0",
        ascensionBonusRewardsClaimed:
          existing?.ascensionBonusRewardsClaimed || "0",
        ...updates,
      };

      // If updating rewards, add to existing
      if (updates.totalRewards) {
        newStats.totalRewards = (
          parseFloat(existing?.totalRewards || "0") +
          parseFloat(updates.totalRewards)
        ).toString();
      }

      await storage.createOrUpdateUserPackageStats(userId, packageId, newStats);
    } catch (error) {
      console.error("Error updating user package stats:", error);
    }
  }

  // Sync historical events
  async syncHistoricalEvents(fromBlock: number = 32768120) {
    try {
      console.log(`Syncing historical events from block ${fromBlock}...`);

      const currentBlock = await this.provider.getBlockNumber();
      const batchSize = 10000; // Process in batches to avoid RPC limits

      for (
        let startBlock = fromBlock;
        startBlock <= currentBlock;
        startBlock += batchSize
      ) {
        const endBlock = Math.min(startBlock + batchSize - 1, currentBlock);
        console.log(`Processing blocks ${startBlock} to ${endBlock}...`);

        // Get all events for this block range
        const filter = {
          address: NODE_PACKAGES_ADDRESS,
          fromBlock: startBlock,
          toBlock: endBlock,
        };

        const logs = await this.provider.getLogs(filter);

        for (const log of logs) {
          try {
            const parsedLog = this.nodePackagesContract.interface.parseLog(log);
            if (parsedLog) {
              // Process each event type
              await this.processHistoricalEvent(parsedLog, log);
            }
          } catch (error) {
            console.warn("Failed to parse log:", error);
          }
        }

        // Small delay to avoid overwhelming the RPC
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      console.log("Historical sync completed");
    } catch (error) {
      console.error("Error syncing historical events:", error);
    }
  }

  private async processHistoricalEvent(parsedLog: any, log: any) {
    try {
      const block = await this.provider.getBlock(log.blockNumber);
      const timestamp = new Date(block.timestamp * 1000);

      switch (parsedLog.name) {
        case "NodePurchased":
          await this.handleNodePurchased(
            parsedLog.args.user,
            parsedLog.args.packageId,
            BigInt(block.timestamp),
            parsedLog.args.expiryTime,
            parsedLog.args.currentNodeId,
            {
              transactionHash: log.transactionHash,
              blockNumber: log.blockNumber,
            }
          );
          break;

        case "ReferralRewardEarned":
          await this.handleReferralRewardEarned(
            parsedLog.args.referrer,
            parsedLog.args.user,
            parsedLog.args.packageId,
            parsedLog.args.level,
            parsedLog.args.rewardAmount,
            {
              transactionHash: log.transactionHash,
              blockNumber: log.blockNumber,
            }
          );
          break;

        case "UserHoldReward":
          await this.handleUserHoldReward(
            parsedLog.args.user,
            parsedLog.args.amount,
            parsedLog.args.nodeIndex,
            {
              transactionHash: log.transactionHash,
              blockNumber: log.blockNumber,
            }
          );
          break;
        case "UserReleaseReward":
          await this.handleUserReleaseReward(
            parsedLog.args.user,
            parsedLog.args.amount,
            parsedLog.args.nodeIndex,
            {
              transactionHash: log.transactionHash,
              blockNumber: log.blockNumber,
            }
          );
          break;
        case "UserHoldRewardLevel":
          await this.handleUserHoldRewardLevel(
            parsedLog.args.user,
            parsedLog.args.amount,
            parsedLog.args.nodeIndex,
            parsedLog.args.referral,
            parsedLog.args.level,
            {
              transactionHash: log.transactionHash,
              blockNumber: log.blockNumber,
            }
          );
          break;
        case "UserReleaseRewardLevel":
          await this.handleUserReleaseRewardLevel(
            parsedLog.args.user,
            parsedLog.args.amount,
            parsedLog.args.nodeIndex,
            parsedLog.args.referral,
            parsedLog.args.level,
            {
              transactionHash: log.transactionHash,
              blockNumber: log.blockNumber,
            }
          );
          break;
        case "ReferralRegistered":
          await this.handleReferralRegistered(
            parsedLog.args.user,
            parsedLog.args.referrer,
            parsedLog.args.packageId,
            parsedLog.args.packageReferralCount,
            parsedLog.args.totalReferralCount,
            {
              transactionHash: log.transactionHash,
              blockNumber: log.blockNumber,
            }
          );
          break;

        // Add other event handlers as needed
      }
    } catch (error) {
      console.error("Error processing historical event:", error);
    }
  }
}

export const eventListener = new EventListener();
