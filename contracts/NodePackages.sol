// SPDX-License-Identifier: MIT
pragma solidity ^0.8.8;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title NodePackages
 * @dev Smart contract for a node-based affiliate system with predefined node packages using ERC20 tokens
 */
contract NodePackages is Ownable {
    using SafeERC20 for IERC20;

    // Token used for purchasing nodes and rewards
    IERC20 public nodeToken;

    // Structure to represent a node package
    struct NodePackage {
        uint256 id;
        string name;
        uint256 price;          // Price in tokens
        uint256 duration;       // Duration in seconds
        uint256 roiPercentage;  // ROI percentage (e.g., 20 means 20% of price)
        bool isActive;          // Whether the package is active
    }

    // Structure to represent a user's purchased node
    struct UserNode {
        uint256 packageId;
        uint256 purchaseTime;
        uint256 expiryTime;
        bool isActive;
        uint256 nodeId;
    }

    // Structure to represent a referral details
    struct DirectReferralDetails{
        address directReferrer;
        uint256 level;
    }


    // Mapping to store node packages by ID
    mapping(uint256 => NodePackage) public nodePackages;

    // Counter for node package IDs
    uint256 public nodePackageCount;
    address[] public wallets;
    mapping(address => bool) public registered;

    // Mapping of user address to their nodes
    mapping(address => mapping(uint256 => UserNode)) public userNodes;

    // Mapping to track referrals by user and package ID
    mapping(address => mapping(uint256 => address)) public referrers;
    mapping(address => mapping(uint256 => bool)) public userNodeAssigned;
    mapping(address => mapping(uint256 => uint256)) public userHoldReward;
    mapping(address => mapping(uint256 => uint256)) public userHoldRewardLevel;
    mapping(address => mapping(uint256 => address)) public userReleaseRewardLevelReferrer;
    mapping(address => mapping(uint256 => uint256)) public userHoldCurrentLevel;

    mapping(address => address) public mainReferrer;
    mapping(address => bool) public referralSet;
    
    // Mapping to track direct referrers by user and package ID
    mapping(address => mapping(uint256 => DirectReferralDetails)) public directReferrers;
    // Mapping to track total referrals made by a user (across all packages)
    mapping(address => uint256) public referralsMade;

    // Mapping to track referrals made by a user for each package
    // referrer => packageId => count
    mapping(address => mapping(uint256 => uint256)) public packageReferralsMade;
    mapping(address => mapping(uint256 => uint256)) public packageReferralsClaimed;
    mapping(address => mapping(uint256 => uint256)) public userRewardsClaimed;
    mapping(address => uint256) public userRewards;

    // Minimum number of referrals required per package to claim rewards
    uint256 public minReferralsForRewards = 1;
    uint256[7] public sevenLevelReferralPercentages = [10, 3, 2, 2, 1, 1, 1];

    // Prosperity Fund settings
    bool public prosperityFundEnabled = true;
    uint256 public prosperityFundPercentage = 10; // 10% of node purchases
    uint256 public prosperityFundDistributionDays = 30; // Distribute every 30 days
    uint256 public lastProsperityFundDistribution; // Timestamp of last distribution
    uint256 public prosperityFundBalance; // Current balance in the fund (legacy)
    uint256 public boosterPercentage = 5;
    
    // Package-wise Prosperity Fund tracking
    // packageId => cycle number => fund balance
    mapping(uint256 => mapping(uint256 => uint256)) public packageProsperityFundBalance;
    // packageId => cycle number => last distribution timestamp
    mapping(uint256 => mapping(uint256 => uint256)) public packageLastDistribution;

    // Admin Marketing Bonus settings
    // bool public adminMarketingBonusEnabled = true;
    // uint256 public adminMarketingBonus = 5 * 10**18; // 5 default (1%-10% range)
    // address public adminWallet; // Admin wallet to receive marketing bonus
    uint256 public totalAdminMarketingBonusCollected; // Total bonus collected by admin

    uint256 public currentNodeId; // token id

    // Monthly referral tracking
    // packageId => year-month (YYYYMM format) => referral count
    mapping(uint256 => mapping(uint256 => uint256)) public monthlyPackageReferrals;
    
    // Prosperity Fund cycle tracking
    uint256 public currentProsperityFundCycle = 1; // Current cycle number
    // packageId => cycle number => referral count
    mapping(uint256 => mapping(uint256 => uint256)) public prosperityFundCyclePackageReferrals;

    mapping(uint256 => mapping(address => bool)) private alreadyRewarded;
    uint256 private alreadyRewardedCounter;

    // Liquidity withdrawal settings
    bool public withdrawLiquidityEnabled = false;
    uint256 public withdrawLiquidityPercentage = 10; // Default 10%
    address public liquidityAddress; // Address to receive liquidity withdrawals
    uint256 public totalLiquidityWithdrawn; // Total amount withdrawn
    
    // First-time user fee settings
    uint256 public firstTimeUserFee = 0; // Default 0% (disabled)
    address public firstTimeUserFeeAddress; // Address to receive first-time user fees
    uint256 public totalFirstTimeUserFeesCollected; // Total fees collected
    mapping(address => bool) public hasUserPurchased; // Track if user has made any purchase
 
    // Event emitted when a new node package is added
    event NodePackageAdded(uint256 indexed id, string name, uint256 price, uint256 duration, uint256 roiPercentage);

    // Event emitted when a node package is updated
    event NodePackageUpdated(uint256 indexed id, string name, uint256 price, uint256 duration, uint256 roiPercentage, bool isActive);

    // Event emitted when a node is purchased
    event NodePurchased(address indexed user, uint256 indexed packageId, uint256 purchaseTime, uint256 expiryTime, uint256 currentNodeId);

    // Event emitted when rewards are claimed
    event RewardsClaimed(address indexed user, uint256 amount, uint256 nodeIndex);
    // Event emitted when user hold reward
    event UserHoldReward(address indexed user, uint256 amount, uint256 nodeIndex);
    event UserHoldRewardLevel(address indexed user, uint256 amount, uint256 nodeIndex, address referral, uint256 level);
    event UserReleaseReward(address indexed user, uint256 amount, uint256 nodeIndex);
    event UserReleaseRewardLevel(address indexed user, uint256 amount, uint256 nodeIndex, address referral, uint256 level);

    // Event emitted when a referral is registered
    event ReferralRegistered(address indexed user, address indexed referrer, uint256 indexed packageId, uint256 packageReferralCount, uint256 totalReferralCount);

    // Event emitted when minimum referrals requirement is updated
    event MinReferralsUpdated(uint256 oldValue, uint256 newValue);
    // Event emitted when a referral is registered and reward is distributed
    event ReferralRegisteredAndRewardDistributed(address indexed referrer, address indexed user, uint256 indexed packageId, uint256 rewardAmount, uint256 level);
    // Event to emitted booster percentage
    event UpdateBoosterPercentage(uint256 boosterPercentage);
    event AddBoosterReward(address indexed user, uint256 boosterReward, uint256 packageId);
    // Events for Prosperity Fund
    event ProsperityFundContribution(uint256 amount, uint256 newBalance);
    event ProsperityFundDistributed(uint256 amount, address recipient);
    event ProsperityFundSettingsUpdated(bool enabled, uint256 percentage, uint256 distributionDays);
    
    // Events for Package-wise Prosperity Fund
    event PackageProsperityFundContribution(uint256 indexed packageId, uint256 indexed cycle, uint256 amount, uint256 newBalance);
    event PackageProsperityFundDistributed(uint256 indexed packageId, uint256 indexed cycle, uint256 amount, address recipient);
    
    // Events for Admin Marketing Bonus
    event AdminMarketingBonusCollected(address indexed adminWallet, uint256 amount, uint256 totalCollected);
    event AdminMarketingBonusSettingsUpdated(bool enabled, uint256 percentage, address adminWallet);
       
    // Events for Liquidity Withdrawal
    event LiquidityWithdrawn(address indexed user, address liquidityAddress, uint256 amount, uint256 percentage, uint256 totalWithdrawn);
    event LiquidityWithdrawalSettingsUpdated(bool enabled, uint256 percentage, address liquidityAddress);
    
    // Events for First-time User Fee
    event FirstTimeUserFeeCollected(address indexed user, uint256 packageId, uint256 feeAmount, uint256 percentage, uint256 totalCollected);
    event FirstTimeUserFeeSettingsUpdated(uint256 percentage, address feeAddress);

    // Event emitted when rewards are withdrawn
    event RewardsWithdrawn(address indexed user, uint256 amount);
    
    // Added for tracking reward withdrawals
    event RewardWithdrawalRequest(address indexed user, uint256 amount, uint256 timestamp);

    // Event emitted when seven-level referral percentages are updated
    event SevenLevelReferralPercentageUpdated(uint256 indexed index, uint256 percentage);

    // Event emitted when bulk referral reward is earned
    event BulkReferralRewardEarned(address indexed user, uint256 rewardAmount, uint256 salesTotal, uint256 referralCount, uint256 _packageId);

    // Event emitted when rewards discount settings are updated
    event RewardsDiscountSettingsUpdated(bool enabled, uint256 percentage);

    // Event emitted when a discounted purchase is made
    event DiscountedNodePurchased(address indexed user, uint256 indexed packageId, uint256 originalPrice, uint256 discountedPrice, uint256 rewardsUsed);
    event UserRegistered(address indexed user, uint256 indexed packageId);
    // Mapping to track ascension bonus metrics
    mapping(address => mapping(uint256 => uint256) ) public userAscensionBonusReferralCount;
    mapping(address => mapping(uint256 => uint256)) public userAscensionBonusReferralSalesTotal;
    mapping(address => mapping(uint256 => uint256)) public userAscensionBonusReferralRewardsClaimed;

    // Bulk referral reward settings
    uint256 public bulkReferralThreshold = 10; // Number of referrals to qualify for bulk reward
    uint256 public bulkReferralRewardPercentage = 10; // 10% of total sales

    // Discount settings for users with rewards
    uint256 public rewardsDiscountPercentage = 20; // 20% discount when using rewards
    bool public rewardsDiscountEnabled = true; // Whether the discount system is enabled

    /**
     * @dev Constructor that sets the owner to the contract deployer and sets the token
     * @param _nodeToken Address of the ERC20 token to be used for purchases and rewards
     */
    constructor(address _nodeToken) Ownable() {
        require(_nodeToken != address(0), "Token address cannot be zero");
        nodeToken = IERC20(_nodeToken);
        // adminWallet = msg.sender; // Set deployer as initial admin wallet
    }

    /**
     * @dev Add a new node package
     * @param _name Name of the node package
     * @param _price Price of the node package in tokens
     * @param _durationInDays Duration of the node package in days
     * @param _roiPercentage ROI percentage (e.g., 20 means 20% of price)
     * @return id of the newly added node package
     */
    function addNodePackage(
        string memory _name,
        uint256 _price,
        uint256 _durationInDays,
        uint256 _roiPercentage
    ) public onlyOwner returns (uint256) {
        nodePackageCount++;
        uint256 durationInSeconds = _durationInDays * 1 days;

        nodePackages[nodePackageCount] = NodePackage({
            id: nodePackageCount,
            name: _name,
            price: _price,
            duration: durationInSeconds,
            roiPercentage: _roiPercentage,
            isActive: true
        });

        emit NodePackageAdded(nodePackageCount, _name, _price, durationInSeconds, _roiPercentage);

        return nodePackageCount;
    }

    /**
     * @dev Add multiple node packages at once
     * @param _names Array of names
     * @param _prices Array of prices in tokens
     * @param _durationsInDays Array of durations in days
     * @param _roiPercentages Array of ROI percentages
     */
    function addMultipleNodePackages(
        string[] memory _names,
        uint256[] memory _prices,
        uint256[] memory _durationsInDays,
        uint256[] memory _roiPercentages
    ) public onlyOwner {
        require(
            _names.length == _prices.length && 
            _prices.length == _durationsInDays.length && 
            _durationsInDays.length == _roiPercentages.length,
            "Array lengths must match"
        );

        for (uint256 i = 0; i < _names.length; i++) {
            addNodePackage(_names[i], _prices[i], _durationsInDays[i], _roiPercentages[i]);
        }
    }

    /**
     * @dev Update an existing node package
     * @param _id ID of the node package to update
     * @param _name New name
     * @param _price New price in tokens
     * @param _durationInDays New duration in days
     * @param _roiPercentage New ROI percentage
     * @param _isActive New active status
     */
    function updateNodePackage(
        uint256 _id,
        string memory _name,
        uint256 _price,
        uint256 _durationInDays,
        uint256 _roiPercentage,
        bool _isActive
    ) public onlyOwner {
        require(_id > 0 && _id <= nodePackageCount, "Invalid node package ID");

        uint256 durationInSeconds = _durationInDays * 1 days;

        nodePackages[_id] = NodePackage({
            id: _id,
            name: _name,
            price: _price,
            duration: durationInSeconds,
            roiPercentage: _roiPercentage,
            isActive: _isActive
        });

        emit NodePackageUpdated(_id, _name, _price, durationInSeconds, _roiPercentage, _isActive);
    }

    function updateBoosterPercentage(uint256 _boosterPercentage) external onlyOwner {
        require(_boosterPercentage >= 0 && _boosterPercentage < 50, "Invalid percentage");
        boosterPercentage = _boosterPercentage;
        emit UpdateBoosterPercentage(boosterPercentage);
    }

    /**
     * @dev Set a node package's active status
     * @param _id ID of the node package
     * @param _isActive New active status
     */
    function setNodePackageActive(uint256 _id, bool _isActive) public onlyOwner {
        require(_id > 0 && _id <= nodePackageCount, "Invalid node package ID");

        nodePackages[_id].isActive = _isActive;

        emit NodePackageUpdated(
            _id,
            nodePackages[_id].name,
            nodePackages[_id].price,
            nodePackages[_id].duration,
            nodePackages[_id].roiPercentage,
            _isActive
        );
    }

    /**
     * @dev Get all node packages
     * @return packages Array of all node packages
     */
    function getAllNodes() public view returns (NodePackage[] memory packages) {
        packages = new NodePackage[](nodePackageCount);
        
        for (uint256 i = 1; i <= nodePackageCount; i++) {
            packages[i - 1] = nodePackages[i];
        }
        
        return packages;
    }

    /**
     * @dev Purchase a node package using the node token
     * @param _packageId ID of the node package to purchase
     * @param _referrer Address of the referrer (optional)
     */
    function purchaseNode(uint256 _packageId, address _referrer) public {
        require(_packageId > 0 && _packageId <= nodePackageCount, "Invalid node package ID");
        require(nodePackages[_packageId].isActive, "Node package is not active");

        uint256 packagePrice = nodePackages[_packageId].price;

        // Check and handle first-time user fee
        uint256 firstTimeFee = 0;
        if (firstTimeUserFee > 0 && firstTimeUserFeeAddress != address(0) && !hasUserPurchased[msg.sender]) {
            firstTimeFee = firstTimeUserFee;
            totalFirstTimeUserFeesCollected += firstTimeFee;
            
            // Transfer first-time user fee to designated address
            nodeToken.safeTransferFrom(msg.sender, firstTimeUserFeeAddress, firstTimeFee);
            emit FirstTimeUserFeeCollected(msg.sender, _packageId, firstTimeFee, firstTimeUserFee, totalFirstTimeUserFeesCollected);
        }

        // Calculate remaining amount after first-time fee
        uint256 remainingAmount = packagePrice - firstTimeFee;
        
        // Check total balance needed (package price + first-time fee if applicable)
        uint256 totalNeeded = packagePrice + firstTimeFee;
        require(nodeToken.balanceOf(msg.sender) >= totalNeeded, "Insufficient token balance");
        
        // Transfer remaining tokens from user to contract
        nodeToken.safeTransferFrom(msg.sender, address(this), remainingAmount);

        // Process the node purchase with all the common functionality
        _processNodePurchase(_packageId, _referrer, packagePrice);
    }

    /**
     * @dev Purchase a node package using rewards from another package as a discount
     * @param _packageId ID of the node package to purchase
     * @param _referrer Address of the referrer (optional)
     */
    function purchaseNodeWithDiscount(uint256 _packageId, address _referrer) public {
        require(_packageId > 0 && _packageId <= nodePackageCount, "Invalid node package ID");
        require(nodePackages[_packageId].isActive, "Node package is not active");
        require(rewardsDiscountEnabled, "Rewards discount system is not enabled");

        // Get the source package rewards
        uint256 availableRewards = userRewards[msg.sender];
        require(availableRewards > 0, "No rewards available for discount");
        
        uint256 packagePrice = nodePackages[_packageId].price;
        uint256 maxDiscountAmount = (packagePrice * rewardsDiscountPercentage) / 100;
        
        // Cap the discount at available rewards
        uint256 discountAmount = maxDiscountAmount > availableRewards ? availableRewards : maxDiscountAmount;

        // Calculate final price after discount
        uint256 finalPrice = packagePrice - discountAmount;

        // Transfer tokens from user to contract
        // nodeToken.safeTransferFrom(msg.sender, address(this), finalPrice);

        // Deduct used rewards
        userRewards[msg.sender] = userRewards[msg.sender] - finalPrice;
        
        // Process the node purchase with all the common functionality
        _processNodePurchase(_packageId, _referrer, packagePrice);

        // Emit special event for discounted purchase
        // Note: The helper function already emits the regular NodePurchased event
        emit DiscountedNodePurchased(msg.sender, _packageId, packagePrice, finalPrice, discountAmount);
    }

    /**
     * @dev Internal function to process a node purchase (common functionality)
     * @param _packageId ID of the node package to purchase
     * @param _referrer Address of the referrer (optional)
     * @param _packagePrice Original package price (for calculations)
     */
    function _processNodePurchase(
        uint256 _packageId, 
        address _referrer, 
        uint256 _packagePrice
    ) private {
        require(userNodeAssigned[msg.sender][_packageId] == false, "Already assigned");
        if(registered[msg.sender] != true) {
            registered[msg.sender] = true;
            wallets.push(msg.sender);
            emit UserRegistered(msg.sender, _packageId);
        }

        // in case user is holding the reward
        if(userHoldReward[msg.sender][_packageId] > 0){
            userRewards[_referrer] = userRewards[_referrer] + userHoldReward[msg.sender][_packageId];
            userRewardsClaimed[_referrer][_packageId] = userRewardsClaimed[_referrer][_packageId] + userHoldReward[msg.sender][_packageId];
            emit RewardsClaimed(msg.sender, userHoldReward[msg.sender][_packageId], _packageId);
            emit UserReleaseReward(msg.sender, userHoldReward[msg.sender][_packageId], _packageId);
            userHoldReward[msg.sender][_packageId] = 0;
        }

        if(userHoldRewardLevel[msg.sender][_packageId] > 0){
            userRewards[_referrer] = userRewards[_referrer] + userHoldRewardLevel[msg.sender][_packageId];
            userRewardsClaimed[_referrer][_packageId] = userRewardsClaimed[_referrer][_packageId] + userHoldRewardLevel[msg.sender][_packageId];
            emit ReferralRegisteredAndRewardDistributed(msg.sender, userReleaseRewardLevelReferrer[msg.sender][_packageId], _packageId, userHoldRewardLevel[msg.sender][_packageId], userHoldCurrentLevel[msg.sender][_packageId]);
            
            emit UserReleaseRewardLevel(msg.sender, userHoldRewardLevel[msg.sender][_packageId], _packageId, userReleaseRewardLevelReferrer[msg.sender][_packageId], userHoldRewardLevel[msg.sender][_packageId]);
            userHoldRewardLevel[msg.sender][_packageId] = 0;
        }
        
        // Mark user as having made a purchase (for first-time fee tracking)
        hasUserPurchased[msg.sender] = true;

        uint256 boosterReward = (_packagePrice * boosterPercentage) / 100;
        userRewards[msg.sender] = userRewards[msg.sender] + boosterReward;
        userRewardsClaimed[msg.sender][_packageId] += boosterReward;

        emit AddBoosterReward(msg.sender, boosterReward, _packageId);
        
        // Contribute to Package-wise Prosperity Fund if enabled
        if (prosperityFundEnabled) {
            uint256 fundContribution = (_packagePrice * prosperityFundPercentage) / 100;
            // Add to legacy global fund for backward compatibility
            prosperityFundBalance += fundContribution;
            // Add to package-specific fund for current cycle
            packageProsperityFundBalance[_packageId][currentProsperityFundCycle] += fundContribution;
            
            emit ProsperityFundContribution(fundContribution, prosperityFundBalance);
            emit PackageProsperityFundContribution(_packageId, currentProsperityFundCycle, fundContribution, packageProsperityFundBalance[_packageId][currentProsperityFundCycle]);
            }

        bool newReferral = false;    
        if(referralSet[msg.sender] == false) {
            mainReferrer[msg.sender] = _referrer;
            referralSet[msg.sender] = true;
            newReferral = true;
        }
        _referrer = mainReferrer[msg.sender];
        // Register referrer if provided and not already registered for this package
        if (_referrer != address(0) && _referrer != msg.sender && referrers[msg.sender][_packageId] == address(0)) {

            referrers[msg.sender][_packageId] = _referrer;

            // Increment direct referral counts
            if(newReferral == true) {
                referralsMade[_referrer]++;
                packageReferralsMade[_referrer][_packageId]++;
                // Track monthly referral count for package
                // Calculate current year and month properly
                uint256 currentYear = 1970 + (block.timestamp / 365 days);
                uint256 currentMonth = ((block.timestamp % 365 days) / 30 days) + 1;
                uint256 currentYearMonth = currentYear * 100 + currentMonth;
                monthlyPackageReferrals[_packageId][currentYearMonth]++;

                // Track prosperity fund cycle referral count for package
                prosperityFundCyclePackageReferrals[_packageId][currentProsperityFundCycle]++;

            }

            NodePackage memory package = nodePackages[_packageId];
            uint256 reward = (package.price * package.roiPercentage) / 10000;
            if(userNodeAssigned[_referrer][_packageId] == true) {
                userRewards[_referrer] = userRewards[_referrer] + reward;
                userRewardsClaimed[_referrer][_packageId] = userRewardsClaimed[_referrer][_packageId] + reward;
                emit RewardsClaimed(_referrer, reward, _packageId);
            } else {
                userHoldReward[_referrer][_packageId] += reward;
                emit UserHoldReward(_referrer, reward, _packageId);
            }

            // Track ascension bonus metrics
            userAscensionBonusReferralCount[_referrer][_packageId]++;
            userAscensionBonusReferralSalesTotal[_referrer][_packageId] += _packagePrice; // Use original price for referral tracking

            // Check if user has reached the ascension bonus threshold
            if (userAscensionBonusReferralCount[_referrer][_packageId] % bulkReferralThreshold == 0 && userNodeAssigned[_referrer][_packageId] == true) {
                // Calculate the ascension bonus reward based on the last 10 referrals' sales
                uint256 rewardAmount = (userAscensionBonusReferralSalesTotal[_referrer][_packageId] * bulkReferralRewardPercentage) / 100;

                // Update claimed rewards
                userAscensionBonusReferralRewardsClaimed[_referrer][_packageId] += rewardAmount;

                // Send instant reward to the referrer
                // nodeToken.safeTransfer(_referrer, rewardAmount);
                userRewards[_referrer] = userRewards[_referrer] + rewardAmount;
                userRewardsClaimed[_referrer][_packageId] += rewardAmount;

                emit BulkReferralRewardEarned(
                    _referrer,
                    rewardAmount,
                    userAscensionBonusReferralSalesTotal[_referrer][_packageId],
                    userAscensionBonusReferralCount[_referrer][_packageId],
                    _packageId
                );

                // Reset the sales total for the next batch
                userAscensionBonusReferralSalesTotal[_referrer][_packageId] = 0;
            }

            // Calculate and distribute referral reward to direct referrer
            // calculateReferralReward(msg.sender, _packageId, _packagePrice);

            emit ReferralRegistered(
                msg.sender, 
                _referrer, 
                _packageId, 
                packageReferralsMade[_referrer][_packageId], 
                referralsMade[_referrer]
            );
        }

        // Calculate seven level referral rewards
        address currentReferrer = _referrer;
        uint256 currentLevel = 0;

        // Initialize by marking the buyer as seen to prevent any potential false loops
        alreadyRewardedCounter++;
        alreadyRewarded[alreadyRewardedCounter][msg.sender] = true;

        while (currentReferrer != address(0) && currentLevel < 7) {
            if (alreadyRewarded[alreadyRewardedCounter][currentReferrer]) {
                // This address is already in the chain, break to avoid a loop and overpayment
                break;
            }
            
            // Mark the current referrer as seen to prevent loops
            alreadyRewarded[alreadyRewardedCounter][currentReferrer] = true;
            
            // Check if this referrer has the required package
                uint256 rewardAmount = (_packagePrice * sevenLevelReferralPercentages[currentLevel]) / 100;
                
                if (rewardAmount > 0) {
                    if (userNodeAssigned[currentReferrer][_packageId] == true) {
                        userRewardsClaimed[currentReferrer][_packageId] += rewardAmount;
                        userRewards[currentReferrer] += rewardAmount;
                        emit ReferralRegisteredAndRewardDistributed(currentReferrer, msg.sender, _packageId, rewardAmount, currentLevel);
                    } else {
                        userHoldRewardLevel[currentReferrer][_packageId] += rewardAmount;
                        userReleaseRewardLevelReferrer[currentReferrer][_packageId] = msg.sender;

                        userHoldCurrentLevel[currentReferrer][_packageId] = currentLevel;
                        emit UserHoldRewardLevel(currentReferrer, rewardAmount, _packageId, msg.sender, currentLevel);

                    }
                }
                
                // Only increment level counter when reward is distributed
                currentLevel++;
            // } 
            // If referrer doesn't have package, skip to next level without incrementing counter

            // Get next level referrer
            address nextReferrer = mainReferrer[currentReferrer];
            if (nextReferrer == address(0) || nextReferrer == currentReferrer) break;
            
            currentReferrer = nextReferrer;
        }

        // Record direct referrer details
        if (_referrer != address(0)) {
            directReferrers[msg.sender][_packageId] = DirectReferralDetails({
                directReferrer: _referrer,
                level: 1
            });
        }

        // Calculate expiry time
        uint256 purchaseTime = block.timestamp;
        uint256 expiryTime = purchaseTime + nodePackages[_packageId].duration;

        currentNodeId++;
        // Create a new user node
        UserNode memory newNode = UserNode({
            packageId: _packageId,
            purchaseTime: purchaseTime,
            expiryTime: expiryTime,
            isActive: true,
            nodeId: currentNodeId
        });

        // Add the node to the user's list
        userNodes[msg.sender][_packageId] = newNode;
        userNodeAssigned[msg.sender][_packageId] = true;

        emit NodePurchased(msg.sender, _packageId, purchaseTime, expiryTime, currentNodeId);
    }

    /**
     * @dev Get details of a node package
     * @param _id ID of the node package
     * @return id ID of the node package
     * @return name Name of the node package
     * @return price Price in tokens
     * @return duration Duration in seconds
     * @return roiPercentage ROI percentage
     * @return isActive Whether the package is active
     */
    function getNodePackage(uint256 _id) public view returns (
        uint256 id,
        string memory name,
        uint256 price,
        uint256 duration,
        uint256 roiPercentage,
        bool isActive
    ) {
        require(_id > 0 && _id <= nodePackageCount, "Invalid node package ID");

        NodePackage storage package = nodePackages[_id];

        return (
            package.id,
            package.name,
            package.price,
            package.duration,
            package.roiPercentage,
            package.isActive
        );
    }

    /**
     * @dev Get the total number of referrals a user has made across all packages
     * @param _user Address of the user
     * @return count Total number of referrals made
     */
    function getUserReferralCount(address _user) public view returns (uint256) {
        return referralsMade[_user];
    }

    /**
     * @dev Get the total number of users
     * @return count Total number of user
     */
    function getWalletsCount() public view returns (uint256) {
        return wallets.length;
    }

    /**
     * @dev Get the number of referrals a user has made for a specific package
     * @param _user Address of the user
     * @param _packageId ID of the node package
     * @return count Number of referrals made for the specific package
     */
    function getUserPackageReferralCount(address _user, uint256 _packageId) public view returns (uint256) {
        return packageReferralsMade[_user][_packageId];
    }

    /**
     * @dev Get the referrer for a specific user and package
     * @param _user Address of the user
     * @param _packageId ID of the node package
     * @return referrer The referrer address for this user and package
     */
    function getUserReferrer(address _user, uint256 _packageId) public view returns (address) {
        return referrers[_user][_packageId];
    }

    /**
     * @dev Get details of a user's node
     * @param _user Address of the user
     * @param _index Index of the node in the user's array
     * @return packageId ID of the node package
     * @return purchaseTime Time when the node was purchased
     * @return expiryTime Time when the node expires
     * @return isActive Whether the node is active
     */
    function getUserNode(address _user, uint256 _index) public view returns (
        uint256 packageId,
        uint256 purchaseTime,
        uint256 expiryTime,
        bool isActive,
        uint256 nodeId
    ) {
        UserNode storage node = userNodes[_user][_index];

        return (
            node.packageId,
            node.purchaseTime,
            node.expiryTime,
            node.isActive,
            node.nodeId
        );
    }

    /**
     * @dev Withdraw tokens from the contract (owner only)
     * @param _amount Amount of tokens to withdraw
     */
    function withdrawTokens(uint256 _amount) public onlyOwner {
        require(_amount <= nodeToken.balanceOf(address(this)) - prosperityFundBalance, "Insufficient contract balance outside of Prosperity Fund");
        nodeToken.safeTransfer(owner(), _amount);
    }

    /**
     * @dev Update the Prosperity Fund settings (owner only)
     * @param _enabled Whether the fund is enabled
     * @param _percentage Percentage of each purchase to allocate to the fund (0-100)
     * @param _distributionDays Number of days between distributions
     */
    function updateProsperityFundSettings(bool _enabled, uint256 _percentage, uint256 _distributionDays) public onlyOwner {
        require(_percentage <= 100, "Percentage must be between 0 and 100");
        require(_distributionDays > 0, "Distribution days must be greater than 0");

        prosperityFundEnabled = _enabled;
        prosperityFundPercentage = _percentage;
        prosperityFundDistributionDays = _distributionDays;

        // Set the initial distribution timestamp if it's not set yet
        if (lastProsperityFundDistribution == 0) {
            lastProsperityFundDistribution = block.timestamp;
        }

        emit ProsperityFundSettingsUpdated(_enabled, _percentage, _distributionDays);
    }

    /**
     * @dev Check if the Prosperity Fund is ready for distribution
     * @return bool Whether the fund is ready for distribution
     */
    function isProsperityFundReadyForDistribution() public view returns (bool) {
        if (!prosperityFundEnabled || prosperityFundBalance == 0) {
            return false;
        }

        uint256 timeSinceLastDistribution = block.timestamp - lastProsperityFundDistribution;
        uint256 distributionPeriod = prosperityFundDistributionDays * 1 days;

        return timeSinceLastDistribution >= distributionPeriod;
    }

    // /**
    //  * @dev Distribute the Prosperity Fund to a specified address (owner only)
    //  * @param _recipient Address to receive the distribution
    //  */
    // function distributeProsperityFund(address _recipient) public onlyOwner {
    //     require(prosperityFundEnabled, "Prosperity Fund is not enabled");
    //     require(prosperityFundBalance > 0, "Prosperity Fund balance is zero");
    //     require(_recipient != address(0), "Recipient cannot be zero address");

    //     require(isProsperityFundReadyForDistribution(), "Prosperity Fund is not ready");

    //     uint256 amountToDistribute = prosperityFundBalance;
    //     prosperityFundBalance = 0;
    //     lastProsperityFundDistribution = block.timestamp;

    //     // Increment to next prosperity fund cycle for new tracking period
    //     currentProsperityFundCycle++;

    //     // Transfer the tokens to the recipient
    //     nodeToken.safeTransfer(_recipient, amountToDistribute);

    //     emit ProsperityFundDistributed(amountToDistribute, _recipient);
    // }

    /**
     * @dev Get package prosperity fund balance for a specific package and cycle
     * @param _packageId Package ID
     * @param _cycle Cycle number
     * @return balance Fund balance for the package in the specified cycle
     */
    function getPackageProsperityFundBalance(uint256 _packageId, uint256 _cycle) public view returns (uint256 balance) {
        return packageProsperityFundBalance[_packageId][_cycle];
    }

    /**
     * @dev Get all package prosperity fund balances for current cycle
     * @return packageIds Array of package IDs
     * @return balances Array of corresponding balances
     */
    function getAllPackageProsperityFundBalances() public view returns (uint256[] memory packageIds, uint256[] memory balances) {
        packageIds = new uint256[](nodePackageCount);
        balances = new uint256[](nodePackageCount);
        
        for (uint256 i = 1; i <= nodePackageCount; i++) {
            packageIds[i - 1] = i;
            balances[i - 1] = packageProsperityFundBalance[i][currentProsperityFundCycle];
        }
        
        return (packageIds, balances);
    }

    /**
     * @dev Check if a package prosperity fund is ready for distribution
     * @param _packageId Package ID to check
     * @return bool Whether the package fund is ready for distribution
     */
    function isPackageProsperityFundReadyForDistribution(uint256 _packageId) public view returns (bool) {
        if (!prosperityFundEnabled || packageProsperityFundBalance[_packageId][currentProsperityFundCycle] == 0) {
            return false;
        }

        uint256 lastDistribution = packageLastDistribution[_packageId][currentProsperityFundCycle];
        if (lastDistribution == 0) {
            // If never distributed, use global last distribution time
            lastDistribution = lastProsperityFundDistribution;
        }

        uint256 timeSinceLastDistribution = block.timestamp - lastDistribution;
        uint256 distributionPeriod = prosperityFundDistributionDays * 1 days;

        return timeSinceLastDistribution >= distributionPeriod;
    }

    /**
     * @dev Distribute prosperity fund for a specific package (owner only)
     * @param _packageId Package ID to distribute
     * @param _recipient Address to receive the distribution
     */
    function distributePackageProsperityFund(uint256 _packageId, address _recipient) public onlyOwner {
        require(_packageId > 0 && _packageId <= nodePackageCount, "Invalid package ID");
        require(prosperityFundEnabled, "Prosperity Fund is not enabled");
        require(_recipient != address(0), "Recipient cannot be zero address");
        require(isPackageProsperityFundReadyForDistribution(_packageId), "Package prosperity fund is not ready");

        uint256 amountToDistribute = packageProsperityFundBalance[_packageId][currentProsperityFundCycle];
        require(amountToDistribute > 0, "Package prosperity fund balance is zero");
        prosperityFundBalance -= amountToDistribute;

        // Reset the package fund balance
        packageProsperityFundBalance[_packageId][currentProsperityFundCycle] = 0;
        packageLastDistribution[_packageId][currentProsperityFundCycle] = block.timestamp;
        

        // Transfer the tokens to the recipient
        nodeToken.safeTransfer(_recipient, amountToDistribute);

        if(prosperityFundBalance == 0) {
            lastProsperityFundDistribution = block.timestamp;

            currentProsperityFundCycle++;
        }

        emit PackageProsperityFundDistributed(_packageId, currentProsperityFundCycle, amountToDistribute, _recipient);
    }

    /**
     * @dev Distribute all ready package prosperity funds (owner only)
     * @param _recipient Address to receive all distributions
     * @return totalDistributed Total amount distributed across all packages
     */
    function distributeAllPackageProsperityFunds(address _recipient) public onlyOwner returns (uint256 totalDistributed) {
        require(prosperityFundEnabled, "Prosperity Fund is not enabled");
        require(_recipient != address(0), "Recipient cannot be zero address");

        totalDistributed = 0;

        for (uint256 i = 1; i <= nodePackageCount; i++) {
            if (isPackageProsperityFundReadyForDistribution(i)) {
                uint256 amountToDistribute = packageProsperityFundBalance[i][currentProsperityFundCycle];
                if (amountToDistribute > 0) {
                    // Reset the package fund balance
                    packageProsperityFundBalance[i][currentProsperityFundCycle] = 0;
                    packageLastDistribution[i][currentProsperityFundCycle] = block.timestamp;

                    totalDistributed += amountToDistribute;
                    prosperityFundBalance -= amountToDistribute;


                    emit PackageProsperityFundDistributed(i, currentProsperityFundCycle, amountToDistribute, _recipient);
                }
            }
        }

        if (totalDistributed > 0) {
            // Transfer the total tokens to the recipient
            nodeToken.safeTransfer(_recipient, totalDistributed);
        }

        lastProsperityFundDistribution = block.timestamp;

        currentProsperityFundCycle++;

        return totalDistributed;
    }

    /**
     * @dev Update the minimum number of referrals required to claim rewards (owner only)
     * @param _minReferrals New minimum referral count
     */
    function setMinReferralsForRewards(uint256 _minReferrals) public onlyOwner {
        uint256 oldValue = minReferralsForRewards;
        minReferralsForRewards = _minReferrals;
        emit MinReferralsUpdated(oldValue, _minReferrals);
    }

    /**
     * @dev Get the direct referral details for a specific user and package
     * @param _user Address of the user
     * @param _packageId ID of the node package
     * @return referrer The referrer address and level
     */
    function getDirectReferralDetails(address _user, uint256 _packageId) public view returns (address referrer, uint256 level) {
        DirectReferralDetails storage details = directReferrers[_user][_packageId];
        return (details.directReferrer, details.level);
    }

    /**
     * @dev Calculate and distribute referral reward for a direct referrer
     * @param _user The user who is generating the referral reward
     * @param _packageId The package ID associated with the referral
     * @param _packagePrice The price of the package
     * @return The amount of reward distributed (0 if no referrer found)
     */
    function calculateReferralReward(address _user, uint256 _packageId, uint256 _packagePrice) internal returns (uint256) {
        // Get the direct referrer
        address referrer = referrers[_user][_packageId];

        // If no referrer, return 0
        if (referrer == address(0)) {
            return 0;
        }

        // Calculate the reward (10% of package price)
        uint256 rewardAmount = (_packagePrice * 10) / 100;

        if (rewardAmount > 0) {
            // Add to referrer's claimed rewards for this package
            userRewardsClaimed[referrer][_packageId] += rewardAmount;
            userRewards[referrer] += rewardAmount;
        }

        return rewardAmount;
    }

    /**
     * @dev Withdraw claimed rewards
     * @param _amount Amount of tokens to withdraw
     */
    function withdrawRewards(uint256 _amount) public {
        uint256 rewardAmount = userRewards[msg.sender];
        require(rewardAmount >= _amount, "No rewards to withdraw");

        // Emit a tracking event
        emit RewardWithdrawalRequest(msg.sender, _amount, block.timestamp);
        
        // Execute withdrawal if enabled
        uint256 withdrawalAmount;
        if (withdrawLiquidityEnabled) {
            withdrawalAmount = (_amount * withdrawLiquidityPercentage) / 100;
            require(withdrawalAmount > 0, "Withdrawal amount is zero");

            totalLiquidityWithdrawn += withdrawalAmount;

            // Transfer tokens to liquidity address
            nodeToken.safeTransfer(liquidityAddress, withdrawalAmount);

            emit LiquidityWithdrawn(msg.sender, liquidityAddress, withdrawalAmount, withdrawLiquidityPercentage, totalLiquidityWithdrawn);
        }
        // Deduct the amount from user's rewards
        userRewards[msg.sender] = userRewards[msg.sender] - _amount;

        // Transfer tokens to the user
        nodeToken.safeTransfer(msg.sender, _amount - withdrawalAmount);

        emit RewardsWithdrawn(msg.sender, _amount - withdrawalAmount);
    }

    function updateSevenLevelReferralPercentage(uint256 _index, uint256 _percentage) public onlyOwner {
        require(_index < sevenLevelReferralPercentages.length, "Invalid index");
        require(_percentage <= 100, "Percentage must be less than or equal to 100");
        sevenLevelReferralPercentages[_index] = _percentage;
        emit SevenLevelReferralPercentageUpdated(_index, _percentage);
    }

    // The withdrawPackageRewards and withdrawAllRewards functions have been removed as requested

    /**
     * @dev Get the total claimed rewards for a user across all packages
     * @param _user Address of the user
     * @return totalRewards Total claimed rewards
     */
    function getUserTotalClaimedRewards(address _user) public view returns (uint256 totalRewards) {
        totalRewards = 0;

        for (uint256 i = 1; i <= nodePackageCount; i++) {
            totalRewards += userRewardsClaimed[_user][i];
        }

        return totalRewards;
    }

    /**
     * @dev Get the claimed rewards for a user for a specific package
     * @param _user Address of the user
     * @param _packageId ID of the package
     * @return claimedRewards Claimed rewards for the package
     */
    function getUserPackageClaimedRewards(address _user, uint256 _packageId) public view returns (uint256) {
        require(_packageId > 0 && _packageId <= nodePackageCount, "Invalid node package ID");
        return userRewardsClaimed[_user][_packageId];
    }

    /**
     * @dev Get the current status of the Prosperity Fund
     * @return enabled Whether the fund is enabled
     * @return balance Current balance in the fund
     * @return percentage Percentage of each purchase allocated to the fund
     * @return distributionDays Number of days between distributions
     * @return nextDistribution Timestamp when the next distribution will be available
     * @return isReady Whether the fund is ready for distribution
     */
    function getProsperityFundStatus() public view returns (
        bool enabled,
        uint256 balance,
        uint256 percentage,
        uint256 distributionDays,
        uint256 nextDistribution,
        bool isReady
    ) {
        uint256 distributionPeriod = prosperityFundDistributionDays * 1 days;
        uint256 nextDistributionTime = lastProsperityFundDistribution + distributionPeriod;

        return (
            prosperityFundEnabled,
            prosperityFundBalance,
            prosperityFundPercentage,
            prosperityFundDistributionDays,
            nextDistributionTime,
            isProsperityFundReadyForDistribution()
        );
    }

    /**
     * @dev Get the ascension bonus stats for a user
     * @param _user Address of the user
     * @return referralCount Total number of referrals made
     * @return salesTotal Current sales total since last reward
     * @return rewardsClaimed Total rewards claimed through ascension bonus
     * @return referralsToNextReward Number of referrals needed for next reward
     */
    function getUserAscensionBonusStats(address _user, uint256 _packageId) public view returns (
        uint256 referralCount,
        uint256 salesTotal,
        uint256 rewardsClaimed,
        uint256 referralsToNextReward
    ) {
        referralCount = userAscensionBonusReferralCount[_user][_packageId];
        salesTotal = userAscensionBonusReferralSalesTotal[_user][_packageId];
        rewardsClaimed = userAscensionBonusReferralRewardsClaimed[_user][_packageId];

        // Calculate how many more referrals needed for next reward
        uint256 nextThreshold = ((referralCount / bulkReferralThreshold) + 1) * bulkReferralThreshold;
        referralsToNextReward = nextThreshold - referralCount;

        return (
            referralCount,
            salesTotal,
            rewardsClaimed,
            referralsToNextReward
        );
    }

    /**
     * @dev Update the bulk referral reward settings (owner only)
     * @param _threshold Number of referrals to qualify for bulk reward
     * @param _percentage Percentage of total sales for reward (0-100)
     */
    function updateBulkReferralSettings(uint256 _threshold, uint256 _percentage) public onlyOwner {
        require(_threshold > 0, "Threshold must be greater than 0");
        require(_percentage <= 100, "Percentage must be between 0 and 100");

        bulkReferralThreshold = _threshold;
        bulkReferralRewardPercentage = _percentage;
    }

    /**
     * @dev Update the rewards discount settings (owner only)
     * @param _enabled Whether the discount system is enabled
     * @param _percentage Discount percentage to apply (0-100)
     */
    function updateRewardsDiscountSettings(bool _enabled, uint256 _percentage) public onlyOwner {
        require(_percentage <= 100, "Percentage must be between 0 and 100");

        rewardsDiscountEnabled = _enabled;
        rewardsDiscountPercentage = _percentage;

        emit RewardsDiscountSettingsUpdated(_enabled, _percentage);
    }

    /**
     * @dev Configure liquidity withdrawal settings for withdrawRewards function (owner only)
     * @param _withdrawLiquidityEnabled Whether liquidity withdrawal is enabled for rewards
     * @param _withdrawLiquidityPercentage Percentage of reward withdrawals to redirect to liquidity (1-100)
     * @param _liquidityAddress Address to receive the liquidity portion from rewards
     */
    function updateWithdrawLiquiditySettings(bool _withdrawLiquidityEnabled, uint256 _withdrawLiquidityPercentage, address _liquidityAddress) public onlyOwner {
        require(_withdrawLiquidityPercentage >= 1 && _withdrawLiquidityPercentage <= 100, "Percentage must be between 1 and 100");
        require(_liquidityAddress != address(0), "Liquidity address cannot be zero");

        // Update settings
        withdrawLiquidityEnabled = _withdrawLiquidityEnabled;
        withdrawLiquidityPercentage = _withdrawLiquidityPercentage;
        liquidityAddress = _liquidityAddress;

        emit LiquidityWithdrawalSettingsUpdated(_withdrawLiquidityEnabled, _withdrawLiquidityPercentage, _liquidityAddress);
    }

    /**
     * @dev Get current contract token balance
     * @return Current balance of tokens held by the contract
     */
    function getContractBalance() public view returns (uint256) {
        return nodeToken.balanceOf(address(this));
    }

    /**
     * @dev Get liquidity withdrawal settings
     * @return enabled Whether withdrawal is enabled
     * @return percentage Withdrawal percentage
     * @return liquidityAddr Address to receive withdrawals
     * @return totalWithdrawn Total amount withdrawn so far
     */
    function getLiquidityWithdrawalSettings() public view returns (bool enabled, uint256 percentage, address liquidityAddr, uint256 totalWithdrawn) {
        return (withdrawLiquidityEnabled, withdrawLiquidityPercentage, liquidityAddress, totalLiquidityWithdrawn);
    }

    /**
     * @dev Update first-time user fee settings (owner only)
     * @param _fee Fee percentage (0-100, 0 disables the feature)
     * @param _feeAddress Address to receive first-time user fees
     */
    function updateFirstTimeUserFeeSettings(uint256 _fee, address _feeAddress) public onlyOwner {
        require(_feeAddress != address(0), "Fee address cannot be zero");

        firstTimeUserFee = _fee;
        firstTimeUserFeeAddress = _feeAddress;

        emit FirstTimeUserFeeSettingsUpdated(_fee, _feeAddress);
    }

    /**
     * @dev Get first-time user fee settings
     * @return fee Fee 
     * @return feeAddr Address to receive fees
     * @return totalCollected Total fees collected so far
     */
    function getFirstTimeUserFeeSettings() public view returns (uint256 fee, address feeAddr, uint256 totalCollected) {
        return (firstTimeUserFee, firstTimeUserFeeAddress, totalFirstTimeUserFeesCollected);
    }

    /**
     * @dev Check if a user has made any purchase before
     * @param user Address of the user to check
     * @return hasPurchased Whether the user has made any purchase
     */
    function hasUserMadePurchase(address user) public view returns (bool hasPurchased) {
        return hasUserPurchased[user];
    }
}
