// rm -rf build && truffle test 'test/bulk_referral_test.js' --network development
const NodeToken = artifacts.require("NodeToken");
const NodePackages = artifacts.require("NodePackages");
const { BN, expectEvent, expectRevert, balance } = require('@openzeppelin/test-helpers');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');

contract("NodePackages - Bulk Referral Rewards", function (accounts) {
  const owner = accounts[0];
  const referrer = accounts[1];
  const users = accounts.slice(2, 12); // 10 users for testing bulk referrals
  const users2 = accounts.slice(13, 23); // 10 users for testing bulk referrals
  
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
    
    // Transfer tokens to referrer and users for testing
    await nodeToken.transfer(referrer, web3.utils.toWei("1000", "ether"), { from: owner });
    
    for (let user of users) {
      await nodeToken.transfer(user, web3.utils.toWei("1000", "ether"), { from: owner });
      await nodeToken.approve(nodePackages.address, web3.utils.toWei("1000", "ether"), { from: user });
    }

    for (let user of users2) {
      await nodeToken.transfer(user, web3.utils.toWei("1000", "ether"), { from: owner });
      await nodeToken.approve(nodePackages.address, web3.utils.toWei("1000", "ether"), { from: user });
    }
    
    // Add a node package for testing
    await nodePackages.addNodePackage(
      "Test Node Package",
      packagePrice,
      packageDuration,
      packageROI,
      { from: owner }
    );

    await nodePackages.addNodePackage(
      "Test Node Package 2",
      packagePrice,
      packageDuration,
      packageROI,
      { from: owner }
    );
  });
  
  describe("Bulk Referral Settings", function () {
    it("should have default bulk referral settings", async function () {
      const threshold = await nodePackages.bulkReferralThreshold();
      const percentage = await nodePackages.bulkReferralRewardPercentage();
      
      assert.equal(threshold.toString(), "10", "Default threshold should be 10 referrals");
      assert.equal(percentage.toString(), "10", "Default percentage should be 10%");
    });
    
    it("should allow owner to update bulk referral settings", async function () {
      await nodePackages.updateBulkReferralSettings(5, 15, { from: owner });
      
      const threshold = await nodePackages.bulkReferralThreshold();
      const percentage = await nodePackages.bulkReferralRewardPercentage();
      
      assert.equal(threshold.toString(), "5", "Threshold was not updated correctly");
      assert.equal(percentage.toString(), "15", "Percentage was not updated correctly");
    });
    
    it("should prevent non-owners from updating bulk referral settings", async function () {
      await expectRevert(
        nodePackages.updateBulkReferralSettings(5, 15, { from: referrer }),
        "Ownable: caller is not the owner"
      );
    });
    
    it("should validate bulk referral settings", async function () {
      await expectRevert(
        nodePackages.updateBulkReferralSettings(0, 10, { from: owner }),
        "Threshold must be greater than 0"
      );
      
      await expectRevert(
        nodePackages.updateBulkReferralSettings(10, 101, { from: owner }),
        "Percentage must be between 0 and 100"
      );
    });
  });
  
  describe("Bulk Referral Tracking", function () {
    it("should track bulk referral counts and sales correctly", async function () {
      // First user purchases a node with referrer
      await nodePackages.purchaseNode(1, referrer, { from: users[0] });
      
      // Check referrer's stats after first referral
      const stats1 = await nodePackages.getUserAscensionBonusStats(referrer);
      assert.equal(stats1.referralCount.toString(), "1", "Referral count should be 1");
      assert.equal(stats1.salesTotal.toString(), packagePrice, "Sales total should be package price");
      assert.equal(stats1.rewardsClaimed.toString(), "0", "No rewards should be claimed yet");
      assert.equal(stats1.referralsToNextReward.toString(), "9", "Should need 9 more referrals for reward");
      
      // Second user purchases a node with same referrer
      await nodePackages.purchaseNode(1, referrer, { from: users[1] });
      
      // Check referrer's stats after second referral
      const stats2 = await nodePackages.getUserAscensionBonusStats(referrer);
      assert.equal(stats2.referralCount.toString(), "2", "Referral count should be 2");
      assert.equal(
        stats2.salesTotal.toString(),
        new BN(packagePrice).mul(new BN(2)).toString(),
        "Sales total should be 2x package price"
      );
      assert.equal(stats2.referralsToNextReward.toString(), "8", "Should need 8 more referrals for reward");
    });
  });
  
  describe("Bulk Referral Rewards", function () {
    it("should award rewards after reaching the threshold", async function () {
      // Get initial token balance of referrer
      const initialBalance = await nodePackages.userRewards(referrer);
      
      // Make 10 referrals to trigger the bulk reward
      for (let i = 0; i < 10; i++) {
        await nodePackages.purchaseNode(1, referrer, { from: users[i] });
        const balance = await nodePackages.userRewards(referrer);
        const balance1 = await nodePackages.userRewards(users[i]);
        console.log(i, web3.utils.fromWei(balance), web3.utils.fromWei(balance1))

      }

      for (let i = 0; i < 10; i++) {
        await nodePackages.purchaseNode(1, referrer, { from: users2[i] });
        const balance = await nodePackages.userRewards(referrer);
        const balance1 = await nodePackages.userRewards(users2[i]);
        console.log(i+10, web3.utils.fromWei(balance), web3.utils.fromWei(balance1))
        // console.log(i+10, web3.utils.fromWei(balance))

      }
      
      await nodePackages.purchaseNodeWithDiscount(1, "0x0000000000000000000000000000000000000000", { from: referrer });
      const balance = await nodePackages.userRewards(referrer);
      console.log("Purchase node with discount", web3.utils.fromWei(balance))
      // Check referrer's final token balance
      const finalBalance = await nodePackages.userRewards(referrer);
      // const expectedReward = new BN(packagePrice).mul(new BN(10)).mul(new BN(10)).div(new BN(100));
      console.log("mudaser", web3.utils.fromWei(initialBalance), web3.utils.fromWei(finalBalance))
      // const expectedFinalBalance = initialBalance.add(expectedReward);
      
      // assert.equal(
      //   finalBalance.toString(),
      //   expectedFinalBalance.toString(),
      //   "Referrer should have received 10% of total sales (10 * 100 tokens * 10% = 100 tokens)"
      // );
      
      // Check stats after reward
      // const stats = await nodePackages.getUserAscensionBonusStats(referrer);
      // assert.equal(stats.referralCount.toString(), "10", "Referral count should be 10");
      // assert.equal(stats.salesTotal.toString(), "0", "Sales total should reset to 0 after reward");
      // assert.equal(
      //   stats.rewardsClaimed.toString(),
      //   expectedReward.toString(),
      //   "Rewards claimed should be 10% of total sales"
      // );
      // assert.equal(stats.referralsToNextReward.toString(), "10", "Should need 10 more referrals for next reward");
    });
    
    it("should reset sales total after rewarding and continue tracking", async function () {
      // Make 10 referrals to trigger the first bulk reward
      for (let i = 0; i < 10; i++) {
        await nodePackages.purchaseNode(1, referrer, { from: users[i] });
      }
      
      // Check that sales total is reset
      const statsAfterReward = await nodePackages.getUserAscensionBonusStats(referrer);
      assert.equal(statsAfterReward.salesTotal.toString(), "0", "Sales total should be reset after reward");
      
      // Make one more referral to start tracking for the next reward
      await nodeToken.transfer(accounts[12], web3.utils.toWei("1000", "ether"), { from: owner });
      await nodeToken.approve(nodePackages.address, web3.utils.toWei("1000", "ether"), { from: accounts[12] });
      await nodePackages.purchaseNode(1, referrer, { from: accounts[12] });
      
      // Check that sales are being tracked for the next reward
      const statsAfterNextReferral = await nodePackages.getUserAscensionBonusStats(referrer);
      assert.equal(statsAfterNextReferral.referralCount.toString(), "11", "Referral count should be 11");
      assert.equal(statsAfterNextReferral.salesTotal.toString(), packagePrice, "Sales total should be tracking again");
      assert.equal(statsAfterNextReferral.referralsToNextReward.toString(), "9", "Should need 9 more referrals for reward");
    });
  });
  
  describe("Event Emission", function () {
    it("should emit BulkReferralRewardEarned event when threshold is reached", async function () {
      // Make 10 referrals to trigger the bulk reward
      for (let i = 0; i < 9; i++) {
        await nodePackages.purchaseNode(1, referrer, { from: users[i] });
      }
      
      // On the 10th referral, the event should be emitted
      const tx = await nodePackages.purchaseNode(1, referrer, { from: users[9] });
      
      // Calculate expected reward
      const expectedReward = new BN(packagePrice).mul(new BN(10)).mul(new BN(10)).div(new BN(100));
      const expectedSalesTotal = new BN(packagePrice).mul(new BN(10));
      
      // Check for event
      expectEvent(tx, 'BulkReferralRewardEarned', {
        user: referrer,
        rewardAmount: expectedReward,
        salesTotal: expectedSalesTotal,
        referralCount: new BN(10)
      });
    });
  });
});