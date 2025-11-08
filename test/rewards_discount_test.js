//rm -rf build && truffle test 'test/rewards_discount_test.js' --network development

const NodeToken = artifacts.require("NodeToken");
const NodePackages = artifacts.require("NodePackages");
const { BN, expectEvent, expectRevert, balance } = require('@openzeppelin/test-helpers');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');

contract("NodePackages - Rewards Discount", function (accounts) {
  const owner = accounts[0];
  const user1 = accounts[1];
  const user2 = accounts[2];
  const referrer = accounts[3];
  
  let nodeToken;
  let nodePackages;
  
  // Package constants
  const packagePrice = web3.utils.toWei("100", "ether");
  const packageDuration = 30; // days
  const packageROI = 2000; // 20.00%
  
  beforeEach(async function () {
    // Deploy a fresh instance of NodeToken
    nodeToken = await NodeToken.new({ from: owner });
    
    // Deploy NodePackages with the NodeToken address
    nodePackages = await NodePackages.new(nodeToken.address, { from: owner });
    
    // Transfer tokens to users for testing
    await nodeToken.transfer(user1, web3.utils.toWei("1000", "ether"), { from: owner });
    await nodeToken.transfer(user2, web3.utils.toWei("1000", "ether"), { from: owner });
    await nodeToken.transfer(referrer, web3.utils.toWei("1000", "ether"), { from: owner });
    
    // Users approve tokens for the NodePackages contract
    await nodeToken.approve(nodePackages.address, web3.utils.toWei("1000", "ether"), { from: user1 });
    await nodeToken.approve(nodePackages.address, web3.utils.toWei("1000", "ether"), { from: user2 });
    await nodeToken.approve(nodePackages.address, web3.utils.toWei("1000", "ether"), { from: referrer });
    
    // Add two node packages for testing
    await nodePackages.addNodePackage(
      "Test Node Package 1",
      packagePrice,
      packageDuration,
      packageROI,
      { from: owner }
    );
    
    await nodePackages.addNodePackage(
      "Test Node Package 2",
      web3.utils.toWei("200", "ether"), // More expensive package
      packageDuration,
      packageROI,
      { from: owner }
    );
  });
  
  describe("Rewards Discount Settings", function () {
    it("should have default rewards discount settings", async function () {
      const enabled = await nodePackages.rewardsDiscountEnabled();
      const percentage = await nodePackages.rewardsDiscountPercentage();
      
      assert.equal(enabled, true, "Discount should be enabled by default");
      assert.equal(percentage.toString(), "20", "Default discount percentage should be 20%");
    });
    
    it("should allow owner to update rewards discount settings", async function () {
      const tx = await nodePackages.updateRewardsDiscountSettings(false, 25, { from: owner });
      
      expectEvent(tx, 'RewardsDiscountSettingsUpdated', {
        enabled: false,
        percentage: new BN(25)
      });
      
      const enabled = await nodePackages.rewardsDiscountEnabled();
      const percentage = await nodePackages.rewardsDiscountPercentage();
      
      assert.equal(enabled, false, "Discount enabled setting was not updated");
      assert.equal(percentage.toString(), "25", "Discount percentage was not updated");
    });
    
    it("should prevent non-owners from updating discount settings", async function () {
      await expectRevert(
        nodePackages.updateRewardsDiscountSettings(false, 25, { from: user1 }),
        "Ownable: caller is not the owner"
      );
    });
    
    it("should validate discount percentage", async function () {
      await expectRevert(
        nodePackages.updateRewardsDiscountSettings(true, 101, { from: owner }),
        "Percentage must be between 0 and 100"
      );
    });
  });
  
  describe("Purchasing with Rewards Discount", function () {
    beforeEach(async function () {
      // Have user1 purchase a node with referrer to generate rewards for referrer
      await nodePackages.purchaseNode(1, referrer, { from: user1 });
      
      // Generate some rewards for user1 as well
      await nodePackages.purchaseNode(1, user1, { from: user2 });
      
      // Claim rewards to move them to userRewardsClaimed
      // await nodePackages.claimAllRewards({ from: referrer });
      // await nodePackages.claimAllRewards({ from: user1 });
    });
    
    it("should calculate correct discount based on rewards", async function () {
      // Get initial balance to verify token deduction
      const initialBalance = await nodeToken.balanceOf(referrer);
      
      // Get rewards before purchase
      const referrerRewards = await nodePackages.getUserPackageClaimedRewards(referrer, 1);
      
      // Purchase node with discount
      const tx = await nodePackages.purchaseNodeWithDiscount(2, user1, 1, { from: referrer });
      
      // Package 2 price is 200 tokens, discount is 20%, so should pay 160 tokens
      const package2Price = web3.utils.toWei("200", "ether");
      const expectedDiscount = new BN(package2Price).mul(new BN(20)).div(new BN(100));
      const expectedFinalPrice = new BN(package2Price).sub(expectedDiscount);
      
      // Verify event was emitted with correct values
      expectEvent(tx, 'DiscountedNodePurchased', {
        user: referrer,
        packageId: new BN(2),
        originalPrice: new BN(package2Price),
        discountedPrice: expectedFinalPrice,
        rewardsUsed: expectedDiscount
      });
      
      // Verify tokens were deducted correctly
      const finalBalance = await nodeToken.balanceOf(referrer);
      const actualDeduction = initialBalance.sub(finalBalance);
      
      assert.equal(
        actualDeduction.toString(),
        expectedFinalPrice.toString(),
        "Incorrect token amount deducted"
      );
      
      // Verify rewards were deducted
      const remainingRewards = await nodePackages.getUserPackageClaimedRewards(referrer, 1);
      const rewardsDeducted = referrerRewards.sub(remainingRewards);
      
      assert.equal(
        rewardsDeducted.toString(),
        expectedDiscount.toString(),
        "Incorrect rewards deducted"
      );
    });
    
    it("should cap discount at available rewards", async function () {
      // Set a very high discount percentage (e.g., 90%)
      await nodePackages.updateRewardsDiscountSettings(true, 90, { from: owner });
      
      // Get available rewards
      const availableRewards = await nodePackages.getUserPackageClaimedRewards(user1, 1);
      
      // Purchase package 2 with discount (should be capped at available rewards)
      const tx = await nodePackages.purchaseNodeWithDiscount(2, referrer, 1, { from: user1 });
      
      // Check that rewards used is capped at available rewards
      const events = tx.logs.filter(log => log.event === 'DiscountedNodePurchased');
      const rewardsUsed = events[0].args.rewardsUsed;
      
      assert.equal(
        rewardsUsed.toString(),
        availableRewards.toString(),
        "Discount should be capped at available rewards"
      );
    });
    
    it("should prevent purchase with discount when disabled", async function () {
      // Disable rewards discount
      await nodePackages.updateRewardsDiscountSettings(false, 20, { from: owner });
      
      await expectRevert(
        nodePackages.purchaseNodeWithDiscount(2, user1, 1, { from: referrer }),
        "Rewards discount system is not enabled"
      );
    });
    
    it("should prevent purchase with no rewards available", async function () {
      // Use a package for which user has no rewards
      await expectRevert(
        nodePackages.purchaseNodeWithDiscount(2, user1, 2, { from: referrer }),
        "No rewards available for discount"
      );
    });
    
    it("should properly register referrer when using discount", async function () {
      // Purchase with discount and referrer
      await nodePackages.purchaseNodeWithDiscount(2, user1, 1, { from: referrer });
      
      // Check that referrer was registered
      const registeredReferrer = await nodePackages.getUserReferrer(referrer, 2);
      
      assert.equal(registeredReferrer, user1, "Referrer not properly registered in discounted purchase");
    });
  });
});