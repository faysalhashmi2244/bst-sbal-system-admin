// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

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
    
    // Mapping of user address to their nodes
    mapping(address => UserNode[]) public userNodes;
    
    // Mapping to track referrals by user and package ID
    mapping(address => mapping(uint256 => address)) public referrers;
    // Mapping to track direct referrers by user and package ID
    mapping(address => mapping(uint256 => DirectReferralDetails)) public directReferrers;
    // Mapping to track total referrals made by a user (across all packages)
    mapping(address => uint256) public referralsMade;
    
    // Mapping to track referrals made by a user for each package
    // referrer => packageId => count
    mapping(address => mapping(uint256 => uint256)) public packageReferralsMade;
    mapping(address => mapping(uint256 => uint256)) public packageReferralsClaimed;
    mapping(address => mapping(uint256 => uint256)) public userRewardsClaimed;

    // Minimum number of referrals required per package to claim rewards
    uint256 public minReferralsForRewards = 1;
    uint256[7] public sevenLevelReferralPercentages = [10, 3, 2, 2, 1, 1, 1];
    
    // Prosperity Fund settings
    bool public prosperityFundEnabled = true;
    uint256 public prosperityFundPercentage = 10; // 10% of node purchases
    uint256 public prosperityFundDistributionDays = 30; // Distribute every 30 days
    uint256 public lastProsperityFundDistribution; // Timestamp of last distribution
    uint256 public prosperityFundBalance; // Current balance in the fund
    
    // Event emitted when a new node package is added
    event NodePackageAdded(uint256 indexed id, string name, uint256 price, uint256 duration, uint256 boosterReward, uint256 roiPercentage);
    
    // Event emitted when a node package is updated
    event NodePackageUpdated(uint256 indexed id, string name, uint256 price, uint256 duration, uint256 boosterReward, uint256 roiPercentage, bool isActive);
    
    // Event emitted when a node is purchased
    event NodePurchased(address indexed user, uint256 indexed packageId, uint256 purchaseTime, uint256 expiryTime);
    
    // Event emitted when rewards are claimed
    event RewardsClaimed(address indexed user, uint256 amount, uint256 nodeIndex);
    
    // Event emitted when a referral is registered
    event ReferralRegistered(address indexed user, address indexed referrer, uint256 indexed packageId, uint256 packageReferralCount, uint256 totalReferralCount);
    
    // Event emitted when minimum referrals requirement is updated
    event MinReferralsUpdated(uint256 oldValue, uint256 newValue);
    // Event emitted when a referral is registered and reward is distributed
    event ReferralRegisteredAndRewardDistributed(address indexed referrer, address indexed user, uint256 indexed packageId, uint256 rewardAmount);
    
    // Events for Prosperity Fund
    event ProsperityFundContribution(uint256 amount, uint256 newBalance);
    event ProsperityFundDistributed(uint256 amount, address recipient);
    event ProsperityFundSettingsUpdated(bool enabled, uint256 percentage, uint256 distributionDays);
    /**
     * @dev Constructor that sets the owner to the contract deployer and sets the token
     * @param _nodeToken Address of the ERC20 token to be used for purchases and rewards
     */
    constructor(address _nodeToken) Ownable(msg.sender) {
        require(_nodeToken != address(0), "Token address cannot be zero");
        nodeToken = IERC20(_nodeToken);
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
        
        emit NodePackageAdded(nodePackageCount, _name, _price, durationInSeconds, 0, _roiPercentage);
        
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
        
        emit NodePackageUpdated(_id, _name, _price, durationInSeconds, 0, _roiPercentage, _isActive);
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
            0, // No boosterReward, kept for event compatibility
            nodePackages[_id].roiPercentage,
            _isActive
        );
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
        
        // Check and transfer tokens from user to contract
        require(nodeToken.balanceOf(msg.sender) >= packagePrice, "Insufficient token balance");
        nodeToken.safeTransferFrom(msg.sender, address(this), packagePrice);
        
        // Contribute to Prosperity Fund if enabled
        if (prosperityFundEnabled) {
            uint256 fundContribution = (packagePrice * prosperityFundPercentage) / 100;
            prosperityFundBalance += fundContribution;
            emit ProsperityFundContribution(fundContribution, prosperityFundBalance);
        }
        
        // Register referrer if provided and not already registered for this package
        if (_referrer != address(0) && _referrer != msg.sender && referrers[msg.sender][_packageId] == address(0)) {
            referrers[msg.sender][_packageId] = _referrer;
            
            // Increment referral counts here to make sure they're included in the event
            referralsMade[_referrer]++;
            packageReferralsMade[_referrer][_packageId]++;
            
            // Track bulk referral metrics
            userBulkReferralCount[_referrer]++;
            userBulkReferralSalesTotal[_referrer] += packagePrice;
            
            // Check if user has reached the bulk referral threshold
            if (userBulkReferralCount[_referrer] % bulkReferralThreshold == 0) {
                // Calculate the bulk referral reward based on the last 10 referrals' sales
                uint256 rewardAmount = (userBulkReferralSalesTotal[_referrer] * bulkReferralRewardPercentage) / 100;
                
                // Update claimed rewards
                userBulkReferralRewardsClaimed[_referrer] += rewardAmount;
                
                // Send instant reward to the referrer
                nodeToken.safeTransfer(_referrer, rewardAmount);
                
                emit BulkReferralRewardEarned(
                    _referrer,
                    rewardAmount,
                    userBulkReferralSalesTotal[_referrer],
                    userBulkReferralCount[_referrer]
                );
                
                // Reset the sales total for the next batch
                userBulkReferralSalesTotal[_referrer] = 0;
            }
            
            // Calculate and distribute referral reward to direct referrer
            calculateReferralReward(msg.sender, _packageId, packagePrice);
            
            emit ReferralRegistered(
                msg.sender, 
                _referrer, 
                _packageId, 
                packageReferralsMade[_referrer][_packageId], 
                referralsMade[_referrer]
            );
        }

        // calculate seven level referral reward
        if (_referrer == address(0) ){
            directReferrers[msg.sender][_packageId] = DirectReferralDetails({
                directReferrer: _referrer,
                level: 0
            });
        } else {
            // calculate seven level referral reward
            DirectReferralDetails memory previousLevel = directReferrers[_referrer][_packageId];
            if (previousLevel.level <= 7){
                // Create the new DirectReferralDetails struct and store it in the mapping
                directReferrers[msg.sender][_packageId] = DirectReferralDetails({
                    directReferrer: previousLevel.directReferrer,
                    level: previousLevel.level + 1
                });
                
                // Get the updated data from the mapping for further use
                DirectReferralDetails memory currentLevel = directReferrers[msg.sender][_packageId];

                // distribute reward to direct referrer
                uint256 rewardAmount = (packagePrice * sevenLevelReferralPercentages[currentLevel.level - 1]) / 100;
                if (rewardAmount > 0){
                    userRewardsClaimed[currentLevel.directReferrer][_packageId] += rewardAmount;
                    emit ReferralRegisteredAndRewardDistributed(currentLevel.directReferrer, msg.sender, _packageId, rewardAmount);
                }
            }
        }
        
        // Calculate expiry time
        uint256 purchaseTime = block.timestamp;
        uint256 expiryTime = purchaseTime + nodePackages[_packageId].duration;
        
        // Create a new user node
        UserNode memory newNode = UserNode({
            packageId: _packageId,
            purchaseTime: purchaseTime,
            expiryTime: expiryTime,
            isActive: true
        });
        
        // Add the node to the user's list
        userNodes[msg.sender].push(newNode);
        
        emit NodePurchased(msg.sender, _packageId, purchaseTime, expiryTime);
    }
    
    /**
     * @dev Purchase a node package using rewards from another package as a discount
     * @param _packageId ID of the node package to purchase
     * @param _referrer Address of the referrer (optional)
     * @param _rewardsPackageId ID of the package to use rewards from for discount
     */
    function purchaseNodeWithDiscount(uint256 _packageId, address _referrer, uint256 _rewardsPackageId) public {
        require(_packageId > 0 && _packageId <= nodePackageCount, "Invalid node package ID");
        require(_rewardsPackageId > 0 && _rewardsPackageId <= nodePackageCount, "Invalid rewards package ID");
        require(nodePackages[_packageId].isActive, "Node package is not active");
        require(rewardsDiscountEnabled, "Rewards discount system is not enabled");
        
        // Get available rewards for the specified package
        uint256 availableRewards = userRewardsClaimed[msg.sender][_rewardsPackageId];
        require(availableRewards > 0, "No rewards available for discount");
        
        uint256 packagePrice = nodePackages[_packageId].price;
        uint256 discountAmount = (packagePrice * rewardsDiscountPercentage) / 100;
        
        // Cap the discount at the available rewards
        if (discountAmount > availableRewards) {
            discountAmount = availableRewards;
        }
        
        // Calculate final price after discount
        uint256 finalPrice = packagePrice - discountAmount;
        
        // Check and transfer tokens from user to contract
        require(nodeToken.balanceOf(msg.sender) >= finalPrice, "Insufficient token balance");
        nodeToken.safeTransferFrom(msg.sender, address(this), finalPrice);
        
        // Deduct used rewards
        userRewardsClaimed[msg.sender][_rewardsPackageId] -= discountAmount;
        
        // Contribute to Prosperity Fund if enabled (based on original price)
        if (prosperityFundEnabled) {
            uint256 fundContribution = (packagePrice * prosperityFundPercentage) / 100;
            prosperityFundBalance += fundContribution;
            emit ProsperityFundContribution(fundContribution, prosperityFundBalance);
        }
        
        // Register referrer if provided and not already registered for this package
        if (_referrer != address(0) && _referrer != msg.sender && referrers[msg.sender][_packageId] == address(0)) {
            referrers[msg.sender][_packageId] = _referrer;
            
            // Increment referral counts
            referralsMade[_referrer]++;
            packageReferralsMade[_referrer][_packageId]++;
            
            // Track bulk referral metrics
            userBulkReferralCount[_referrer]++;
            userBulkReferralSalesTotal[_referrer] += packagePrice; // Use original price for referral tracking
            
            // Check if user has reached the bulk referral threshold
            if (userBulkReferralCount[_referrer] % bulkReferralThreshold == 0) {
                // Calculate the bulk referral reward based on the last 10 referrals' sales
                uint256 rewardAmount = (userBulkReferralSalesTotal[_referrer] * bulkReferralRewardPercentage) / 100;
                
                // Update claimed rewards
                userBulkReferralRewardsClaimed[_referrer] += rewardAmount;
                
                // Send instant reward to the referrer
                nodeToken.safeTransfer(_referrer, rewardAmount);
                
                emit BulkReferralRewardEarned(
                    _referrer,
                    rewardAmount,
                    userBulkReferralSalesTotal[_referrer],
                    userBulkReferralCount[_referrer]
                );
                
                // Reset the sales total for the next batch
                userBulkReferralSalesTotal[_referrer] = 0;
            }
            
            // Calculate and distribute referral reward to direct referrer
            calculateReferralReward(msg.sender, _packageId, packagePrice);
            
            emit ReferralRegistered(
                msg.sender, 
                _referrer, 
                _packageId, 
                packageReferralsMade[_referrer][_packageId], 
                referralsMade[_referrer]
            );
        }

        // calculate seven level referral reward
        if (_referrer == address(0) ){
            directReferrers[msg.sender][_packageId] = DirectReferralDetails({
                directReferrer: _referrer,
                level: 0
            });
        } else {
            // calculate seven level referral reward
            DirectReferralDetails memory previousLevel = directReferrers[_referrer][_packageId];
            if (previousLevel.level <= 7){
                // Create the new DirectReferralDetails struct and store it in the mapping
                directReferrers[msg.sender][_packageId] = DirectReferralDetails({
                    directReferrer: previousLevel.directReferrer,
                    level: previousLevel.level + 1
                });
                
                // Get the updated data from the mapping for further use
                DirectReferralDetails memory currentLevel = directReferrers[msg.sender][_packageId];

                // distribute reward to direct referrer
                uint256 rewardAmount = (packagePrice * sevenLevelReferralPercentages[currentLevel.level - 1]) / 100;
                if (rewardAmount > 0){
                    userRewardsClaimed[currentLevel.directReferrer][_packageId] += rewardAmount;
                    emit ReferralRegisteredAndRewardDistributed(currentLevel.directReferrer, msg.sender, _packageId, rewardAmount);
                }
            }
        }
        
        // Calculate expiry time
        uint256 purchaseTime = block.timestamp;
        uint256 expiryTime = purchaseTime + nodePackages[_packageId].duration;
        
        // Create a new user node
        UserNode memory newNode = UserNode({
            packageId: _packageId,
            purchaseTime: purchaseTime,
            expiryTime: expiryTime,
            isActive: true
        });
        
        // Add the node to the user's list
        userNodes[msg.sender].push(newNode);
        
        // Emit special event for discounted purchase
        emit DiscountedNodePurchased(msg.sender, _packageId, packagePrice, finalPrice, discountAmount);
        emit NodePurchased(msg.sender, _packageId, purchaseTime, expiryTime);
    }
    
    /**
     * @dev Calculate and store rewards for a specific node
     * @param _nodeIndex Index of the node in the user's array
     * @return reward Amount of reward tokens calculated
     */
    function calculateNodeReward(uint256 _nodeIndex) public returns (uint256 reward) {
        require(_nodeIndex < userNodes[msg.sender].length, "Invalid node index");
        
        UserNode storage node = userNodes[msg.sender][_nodeIndex];
        NodePackage storage package = nodePackages[node.packageId];

        // Calculate the maximum reward (price * ROI percentage)
        uint256 oneReferralReward = (package.price * package.roiPercentage) / 100;
        uint256 numberOfReferralsToClaim = packageReferralsMade[msg.sender][node.packageId] - packageReferralsClaimed[msg.sender][node.packageId];
        
        reward = oneReferralReward * numberOfReferralsToClaim;
        
        // Add to user's claimed rewards for this package
        userRewardsClaimed[msg.sender][node.packageId] = userRewardsClaimed[msg.sender][node.packageId] + reward;
        
        // Update claimed referrals count to prevent double claiming
        packageReferralsClaimed[msg.sender][node.packageId] = packageReferralsMade[msg.sender][node.packageId];
        
        return reward;
    }
    
    /**
     * @dev Claim rewards for a specific node
     * @param _nodeIndex Index of the node to claim rewards for
     * @notice User must have at least minReferralsForRewards for the specific package to claim rewards
     */
    function claimNodeReward(uint256 _nodeIndex) public {
        require(_nodeIndex < userNodes[msg.sender].length, "Invalid node index");
        
        UserNode storage node = userNodes[msg.sender][_nodeIndex];
        require(node.isActive, "Node is not active");
        
        uint256 packageId = node.packageId;
        
        // Check if user has the minimum required referrals for this specific package
        require(packageReferralsMade[msg.sender][packageId] >= minReferralsForRewards, 
                "Not enough referrals for this package to claim rewards");
        
        uint256 reward = calculateNodeReward(_nodeIndex);
        
        if (reward > 0) {
            emit RewardsClaimed(msg.sender, reward, _nodeIndex);
        }
    }
    
    /**
     * @dev Claim rewards for all active nodes
     * @notice User must have met the minimum referrals requirement for each package to claim rewards
     */
    function claimAllRewards() public {
        UserNode[] storage nodes = userNodes[msg.sender];
        uint256 totalReward = 0;
        uint256[] memory checkedPackages = new uint256[](nodes.length);
        uint256 checkedCount = 0;
        
        for (uint256 i = 0; i < nodes.length; i++) {
            if (nodes[i].isActive) {
                uint256 packageId = nodes[i].packageId;
                bool alreadyChecked = false;
                
                // Check if we've already verified this package ID
                for (uint256 j = 0; j < checkedCount; j++) {
                    if (checkedPackages[j] == packageId) {
                        alreadyChecked = true;
                        break;
                    }
                }
                
                // If not checked yet, verify the referral requirement
                if (!alreadyChecked) {
                    // Verify the user has enough referrals for this package
                    require(packageReferralsMade[msg.sender][packageId] >= minReferralsForRewards,
                            "Not enough referrals for this package");
                    
                    // Add to checked packages
                    checkedPackages[checkedCount] = packageId;
                    checkedCount++;
                }
                
                uint256 reward = calculateNodeReward(i);
                totalReward += reward;
            }
        }
        
        if (totalReward > 0) {
            emit RewardsClaimed(msg.sender, totalReward, type(uint256).max);
        }
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
     * @dev Get the number of nodes a user has
     * @param _user Address of the user
     * @return count Number of nodes
     */
    function getUserNodeCount(address _user) public view returns (uint256) {
        return userNodes[_user].length;
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
        bool isActive
    ) {
        require(_index < userNodes[_user].length, "Invalid node index");
        
        UserNode storage node = userNodes[_user][_index];
        
        return (
            node.packageId,
            node.purchaseTime,
            node.expiryTime,
            node.isActive
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
    
    /**
     * @dev Distribute the Prosperity Fund to a specified address (owner only)
     * @param _recipient Address to receive the distribution
     */
    function distributeProsperityFund(address _recipient) public onlyOwner {
        require(prosperityFundEnabled, "Prosperity Fund is not enabled");
        require(prosperityFundBalance > 0, "Prosperity Fund balance is zero");
        require(_recipient != address(0), "Recipient cannot be zero address");
        
        // Check if the distribution period has passed
        if (!isProsperityFundReadyForDistribution()) {
            // Allow distribution if owner specifies the recipient, even if period hasn't passed
            // This is intentional to give flexibility to the owner
        }
        
        uint256 amountToDistribute = prosperityFundBalance;
        prosperityFundBalance = 0;
        lastProsperityFundDistribution = block.timestamp;
        
        // Transfer the tokens to the recipient
        nodeToken.safeTransfer(_recipient, amountToDistribute);
        
        emit ProsperityFundDistributed(amountToDistribute, _recipient);
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
        }
        
        return rewardAmount;
    }
    
    // Event emitted when rewards are withdrawn
    event RewardsWithdrawn(address indexed user, uint256 amount);
    
    // Event emitted when seven-level referral percentages are updated
    event SevenLevelReferralPercentageUpdated(uint256 indexed index, uint256 percentage);
    
    // Event emitted when bulk referral reward is earned
    event BulkReferralRewardEarned(address indexed user, uint256 rewardAmount, uint256 salesTotal, uint256 referralCount);
    
    // Event emitted when rewards discount settings are updated
    event RewardsDiscountSettingsUpdated(bool enabled, uint256 percentage);
    
    // Event emitted when a discounted purchase is made
    event DiscountedNodePurchased(address indexed user, uint256 indexed packageId, uint256 originalPrice, uint256 discountedPrice, uint256 rewardsUsed);
    
    // Mapping to track bulk referral metrics
    mapping(address => uint256) public userBulkReferralCount;
    mapping(address => uint256) public userBulkReferralSalesTotal;
    mapping(address => uint256) public userBulkReferralRewardsClaimed;
    
    // Bulk referral reward settings
    uint256 public bulkReferralThreshold = 10; // Number of referrals to qualify for bulk reward
    uint256 public bulkReferralRewardPercentage = 10; // 10% of total sales
    
    // Discount settings for users with rewards
    uint256 public rewardsDiscountPercentage = 20; // 20% discount when using rewards
    bool public rewardsDiscountEnabled = true; // Whether the discount system is enabled
    /**
     * @dev Withdraw claimed rewards for a specific package
     * @param _packageId ID of the package to withdraw rewards for
     */
    function withdrawPackageRewards(uint256 _packageId) public {
        require(_packageId > 0 && _packageId <= nodePackageCount, "Invalid node package ID");
        uint256 rewardAmount = userRewardsClaimed[msg.sender][_packageId];
        require(rewardAmount > 0, "No rewards to withdraw for this package");
        
        // Reset user's claimed rewards for this package
        userRewardsClaimed[msg.sender][_packageId] = 0;
        
        // Transfer tokens to the user
        nodeToken.safeTransfer(msg.sender, rewardAmount);
        
        emit RewardsWithdrawn(msg.sender, rewardAmount);
    }

    function updateSevenLevelReferralPercentage(uint256 _index, uint256 _percentage) public onlyOwner {
        require(_index < sevenLevelReferralPercentages.length, "Invalid index");
        require(_percentage <= 100, "Percentage must be less than or equal to 100");
        sevenLevelReferralPercentages[_index] = _percentage;
        emit SevenLevelReferralPercentageUpdated(_index, _percentage);
    }
    
    /**
     * @dev Withdraw all claimed rewards across all packages
     */
    function withdrawAllRewards() public {
        uint256 totalRewards = 0;
        
        // Iterate through all possible package IDs
        for (uint256 i = 1; i <= nodePackageCount; i++) {
            uint256 packageReward = userRewardsClaimed[msg.sender][i];
            if (packageReward > 0) {
                // Add to total and reset the package rewards
                totalRewards += packageReward;
                userRewardsClaimed[msg.sender][i] = 0;
            }
        }
        
        require(totalRewards > 0, "No rewards to withdraw");
        
        // Transfer tokens to the user
        nodeToken.safeTransfer(msg.sender, totalRewards);
        
        emit RewardsWithdrawn(msg.sender, totalRewards);
    }
    
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
     * @dev Get the bulk referral stats for a user
     * @param _user Address of the user
     * @return referralCount Total number of referrals made
     * @return salesTotal Current sales total since last reward
     * @return rewardsClaimed Total rewards claimed through bulk referrals
     * @return referralsToNextReward Number of referrals needed for next reward
     */
    function getUserBulkReferralStats(address _user) public view returns (
        uint256 referralCount,
        uint256 salesTotal,
        uint256 rewardsClaimed,
        uint256 referralsToNextReward
    ) {
        referralCount = userBulkReferralCount[_user];
        salesTotal = userBulkReferralSalesTotal[_user];
        rewardsClaimed = userBulkReferralRewardsClaimed[_user];
        
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
}
