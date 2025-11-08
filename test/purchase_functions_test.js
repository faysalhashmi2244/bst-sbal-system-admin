const NodeToken = artifacts.require("NodeToken");
const NodePackages = artifacts.require("NodePackages");

contract("NodePackages - Purchase Functions", function (accounts) {
  const owner = accounts[0];
  const user1 = accounts[1];
  const user2 = accounts[2];
  const referrer = accounts[3];
  
  let nodeToken;
  let nodePackages;
  
  beforeEach(async function () {
    // Deploy a fresh instance of NodeToken
    nodeToken = await NodeToken.new({ from: owner });
    
    // Deploy NodePackages with the NodeToken address
    nodePackages = await NodePackages.new(nodeToken.address, { from: owner });
    
    // Add a simple node package for testing
    await nodePackages.addNodePackage(
      "Test Package",
      web3.utils.toWei("100", "ether"),
      30, // 30 days
      2000, // 20% ROI
      { from: owner }
    );
    
    // Mint tokens to users
    await nodeToken.transfer(user1, web3.utils.toWei("1000", "ether"), { from: owner });
    await nodeToken.transfer(user2, web3.utils.toWei("1000", "ether"), { from: owner });
    await nodeToken.transfer(referrer, web3.utils.toWei("1000", "ether"), { from: owner });
    
    // Approve tokens for the NodePackages contract
    await nodeToken.approve(nodePackages.address, web3.utils.toWei("1000", "ether"), { from: user1 });
    await nodeToken.approve(nodePackages.address, web3.utils.toWei("1000", "ether"), { from: user2 });
    await nodeToken.approve(nodePackages.address, web3.utils.toWei("1000", "ether"), { from: referrer });
  });
  
  describe("Regular purchase functionality", function () {
    it("should allow purchasing a node package", async function () {
      const initialBalance = await nodeToken.balanceOf(user1);
      
      // Purchase a node
      await nodePackages.purchaseNode(1, referrer, { from: user1 });
      
      // Check if user1's token balance was reduced
      const finalBalance = await nodeToken.balanceOf(user1);
      const packagePrice = web3.utils.toWei("100", "ether");
      
      assert.equal(
        initialBalance.sub(finalBalance).toString(),
        packagePrice,
        "User's token balance should be reduced by package price"
      );
      
      // Check if user1 has the node
      const nodeCount = await nodePackages.getUserNodeCount(user1);
      assert.equal(nodeCount.toString(), "1", "User should have 1 node");
      
      // Check referrer was set correctly
      const userReferrer = await nodePackages.getUserReferrer(user1, 1);
      assert.equal(userReferrer, referrer, "Referrer should be set correctly");
    });
  });
  
  describe("Discounted purchase functionality", function () {
    beforeEach(async function () {
      // Set up some rewards for the user to use for discounts
      // First have referrer purchase a node with user1 as referrer
      await nodePackages.purchaseNode(1, user1, { from: referrer });
      
      // Now have user1 claim rewards
      await nodePackages.claimAllRewards({ from: user1 });
    });
    
    it("should allow purchasing with a discount", async function () {
      // Get initial rewards balance
      const initialRewards = await nodePackages.getUserPackageClaimedRewards(user1, 1);
      assert(initialRewards.gt(web3.utils.toBN(0)), "User should have rewards to use");
      
      // Get discount percentage
      const discountPercentage = await nodePackages.rewardsDiscountPercentage();
      
      // Calculate expected discount
      const packagePrice = web3.utils.toWei("100", "ether");
      const maxDiscount = web3.utils.toBN(packagePrice).mul(discountPercentage).div(web3.utils.toBN(100));
      
      // Cap at available rewards
      const expectedDiscount = maxDiscount.gt(initialRewards) ? initialRewards : maxDiscount;
      const expectedPayment = web3.utils.toBN(packagePrice).sub(expectedDiscount);
      
      // Initial token balance
      const initialBalance = await nodeToken.balanceOf(user2);
      
      // Purchase with discount
      await nodePackages.purchaseNodeWithDiscount(1, user1, 1, { from: user2 });
      
      // Check token balance after purchase
      const finalBalance = await nodeToken.balanceOf(user2);
      const actualPayment = initialBalance.sub(finalBalance);
      
      assert.equal(
        actualPayment.toString(),
        expectedPayment.toString(),
        "User should pay the discounted price"
      );
      
      // Check rewards were deducted
      const finalRewards = await nodePackages.getUserPackageClaimedRewards(user1, 1);
      const rewardsUsed = initialRewards.sub(finalRewards);
      
      assert.equal(
        rewardsUsed.toString(),
        expectedDiscount.toString(),
        "Correct amount of rewards should be used"
      );
    });
  });
});