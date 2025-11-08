const NodePackages = artifacts.require("NodePackages");
const NodeToken = artifacts.require("NodeToken");
const { expectRevert, expectEvent } = require('@openzeppelin/test-helpers');

contract("NodePackages - First-Time User Fee", function (accounts) {
  const owner = accounts[0];
  const user1 = accounts[1];
  const user2 = accounts[2];
  const feeAddress = accounts[3];
  
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
      30 * 24 * 60 * 60, // 30 days
      2000, // 20% ROI
      { from: owner }
    );
    
    // Mint tokens to users
    await nodeToken.transfer(user1, web3.utils.toWei("1000", "ether"), { from: owner });
    await nodeToken.transfer(user2, web3.utils.toWei("1000", "ether"), { from: owner });
    
    // Approve tokens for the NodePackages contract
    await nodeToken.approve(nodePackages.address, web3.utils.toWei("1000", "ether"), { from: user1 });
    await nodeToken.approve(nodePackages.address, web3.utils.toWei("1000", "ether"), { from: user2 });
  });
  
  describe("First-Time User Fee Settings", function () {
    it("should have default first-time user fee settings", async function () {
      const settings = await nodePackages.getFirstTimeUserFeeSettings();
      assert.equal(settings.percentage.toNumber(), 0, "Default percentage should be 0");
      assert.equal(settings.feeAddr, "0x0000000000000000000000000000000000000000", "Default fee address should be zero");
      assert.equal(settings.totalCollected.toString(), "0", "Default total collected should be 0");
    });

    it("should allow owner to update first-time user fee settings", async function () {
      const tx = await nodePackages.updateFirstTimeUserFeeSettings(5, feeAddress, { from: owner });
      
      expectEvent(tx, 'FirstTimeUserFeeSettingsUpdated', {
        percentage: '5',
        feeAddress: feeAddress
      });
      
      const settings = await nodePackages.getFirstTimeUserFeeSettings();
      assert.equal(settings.percentage.toNumber(), 5, "Percentage should be updated to 5");
      assert.equal(settings.feeAddr, feeAddress, "Fee address should be updated");
    });

    it("should prevent non-owners from updating fee settings", async function () {
      await expectRevert(
        nodePackages.updateFirstTimeUserFeeSettings(5, feeAddress, { from: user1 }),
        "Ownable: caller is not the owner"
      );
    });

    it("should prevent invalid percentage updates", async function () {
      await expectRevert(
        nodePackages.updateFirstTimeUserFeeSettings(101, feeAddress, { from: owner }),
        "Percentage must be between 0 and 100"
      );
    });

    it("should prevent zero address for fee address", async function () {
      await expectRevert(
        nodePackages.updateFirstTimeUserFeeSettings(5, "0x0000000000000000000000000000000000000000", { from: owner }),
        "Fee address cannot be zero"
      );
    });
  });

  describe("First-Time User Fee Collection", function () {
    beforeEach(async function () {
      // Set up 10% first-time user fee
      await nodePackages.updateFirstTimeUserFeeSettings(10, feeAddress, { from: owner });
    });

    it("should charge first-time user fee on first purchase", async function () {
      const packagePrice = web3.utils.toWei("100", "ether");
      const expectedFee = web3.utils.toWei("10", "ether"); // 10% of 100
      const expectedRemaining = web3.utils.toWei("90", "ether"); // 90% goes to contract
      
      const initialFeeBalance = await nodeToken.balanceOf(feeAddress);
      const initialContractBalance = await nodeToken.balanceOf(nodePackages.address);
      
      const tx = await nodePackages.purchaseNode(1, "0x0000000000000000000000000000000000000000", { from: user1 });
      
      // Check event emission
      expectEvent(tx, 'FirstTimeUserFeeCollected', {
        user: user1,
        packageId: '1',
        feeAmount: expectedFee,
        percentage: '10'
      });
      
      // Check balances
      const finalFeeBalance = await nodeToken.balanceOf(feeAddress);
      const finalContractBalance = await nodeToken.balanceOf(nodePackages.address);
      
      assert.equal(
        finalFeeBalance.sub(initialFeeBalance).toString(),
        expectedFee,
        "Fee address should receive the first-time user fee"
      );
      
      // Note: Contract receives remaining amount plus admin bonus, prosperity fund, etc.
      assert.isTrue(
        finalContractBalance.gt(initialContractBalance),
        "Contract should receive remaining amount"
      );
      
      // Check user purchase status
      const hasPurchased = await nodePackages.hasUserMadePurchase(user1);
      assert.isTrue(hasPurchased, "User should be marked as having made a purchase");
    });

    it("should not charge fee on subsequent purchases", async function () {
      // First purchase - should charge fee
      await nodePackages.purchaseNode(1, "0x0000000000000000000000000000000000000000", { from: user1 });
      
      const balanceAfterFirst = await nodeToken.balanceOf(feeAddress);
      
      // Add another package for second purchase
      await nodePackages.addNodePackage(
        "Test Package 2",
        web3.utils.toWei("200", "ether"),
        30 * 24 * 60 * 60, // 30 days
        2000, // 20% ROI
        { from: owner }
      );
      
      // Second purchase - should not charge fee
      const tx = await nodePackages.purchaseNode(2, "0x0000000000000000000000000000000000000000", { from: user1 });
      
      // Should not emit FirstTimeUserFeeCollected event
      const logs = tx.logs.filter(log => log.event === 'FirstTimeUserFeeCollected');
      assert.equal(logs.length, 0, "Should not emit FirstTimeUserFeeCollected event on second purchase");
      
      const balanceAfterSecond = await nodeToken.balanceOf(feeAddress);
      assert.equal(
        balanceAfterSecond.toString(),
        balanceAfterFirst.toString(),
        "Fee address balance should not change on second purchase"
      );
    });

    it("should handle disabled first-time user fee (0%)", async function () {
      // Disable first-time user fee
      await nodePackages.updateFirstTimeUserFeeSettings(0, feeAddress, { from: owner });
      
      const initialFeeBalance = await nodeToken.balanceOf(feeAddress);
      
      const tx = await nodePackages.purchaseNode(1, "0x0000000000000000000000000000000000000000", { from: user1 });
      
      // Should not emit FirstTimeUserFeeCollected event
      const logs = tx.logs.filter(log => log.event === 'FirstTimeUserFeeCollected');
      assert.equal(logs.length, 0, "Should not emit FirstTimeUserFeeCollected event when disabled");
      
      const finalFeeBalance = await nodeToken.balanceOf(feeAddress);
      assert.equal(
        finalFeeBalance.toString(),
        initialFeeBalance.toString(),
        "Fee address balance should not change when fee is disabled"
      );
    });

    it("should track total fees collected correctly", async function () {
      const packagePrice = web3.utils.toWei("100", "ether");
      const expectedFee = web3.utils.toWei("10", "ether"); // 10% of 100
      
      // First user purchase
      await nodePackages.purchaseNode(1, "0x0000000000000000000000000000000000000000", { from: user1 });
      
      let settings = await nodePackages.getFirstTimeUserFeeSettings();
      assert.equal(settings.totalCollected.toString(), expectedFee, "Total collected should equal first fee");
      
      // Second user (different user) purchase
      await nodePackages.purchaseNode(1, "0x0000000000000000000000000000000000000000", { from: user2 });
      
      settings = await nodePackages.getFirstTimeUserFeeSettings();
      const expectedTotal = web3.utils.toWei("20", "ether"); // 10 + 10
      assert.equal(settings.totalCollected.toString(), expectedTotal, "Total collected should be sum of both fees");
    });

    it("should work with different fee percentages", async function () {
      // Test with 25% fee
      await nodePackages.updateFirstTimeUserFeeSettings(25, feeAddress, { from: owner });
      
      const packagePrice = web3.utils.toWei("100", "ether");
      const expectedFee = web3.utils.toWei("25", "ether"); // 25% of 100
      
      const initialBalance = await nodeToken.balanceOf(feeAddress);
      
      await nodePackages.purchaseNode(1, "0x0000000000000000000000000000000000000000", { from: user1 });
      
      const finalBalance = await nodeToken.balanceOf(feeAddress);
      assert.equal(
        finalBalance.sub(initialBalance).toString(),
        expectedFee,
        "Should charge correct percentage fee"
      );
    });
  });

  describe("Integration with Existing Features", function () {
    beforeEach(async function () {
      // Set up 5% first-time user fee
      await nodePackages.updateFirstTimeUserFeeSettings(5, feeAddress, { from: owner });
      
      // Enable admin marketing bonus
      await nodePackages.updateAdminMarketingBonusSettings(true, 5, owner, { from: owner });
      
      // Enable prosperity fund
      await nodePackages.updateProsperityFundSettings(true, 10, 30 * 24 * 60 * 60, { from: owner });
    });

    it("should work alongside admin marketing bonus and prosperity fund", async function () {
      const packagePrice = web3.utils.toWei("100", "ether");
      const expectedFirstTimeFee = web3.utils.toWei("5", "ether"); // 5% first-time fee
      const expectedAdminBonus = web3.utils.toWei("5", "ether"); // 5% admin bonus
      const expectedProsperityFund = web3.utils.toWei("10", "ether"); // 10% prosperity fund
      
      const initialFeeBalance = await nodeToken.balanceOf(feeAddress);
      const initialOwnerBalance = await nodeToken.balanceOf(owner);
      
      const tx = await nodePackages.purchaseNode(1, "0x0000000000000000000000000000000000000000", { from: user1 });
      
      // Check first-time user fee
      expectEvent(tx, 'FirstTimeUserFeeCollected', {
        user: user1,
        feeAmount: expectedFirstTimeFee
      });
      
      // Check admin marketing bonus
      expectEvent(tx, 'AdminMarketingBonusCollected', {
        adminWallet: owner,
        amount: expectedAdminBonus
      });
      
      // Check prosperity fund
      expectEvent(tx, 'ProsperityFundContribution', {
        amount: expectedProsperityFund
      });
      
      // Verify balances
      const finalFeeBalance = await nodeToken.balanceOf(feeAddress);
      const finalOwnerBalance = await nodeToken.balanceOf(owner);
      
      assert.equal(
        finalFeeBalance.sub(initialFeeBalance).toString(),
        expectedFirstTimeFee,
        "First-time user fee should be transferred correctly"
      );
      
      assert.equal(
        finalOwnerBalance.sub(initialOwnerBalance).toString(),
        expectedAdminBonus,
        "Admin marketing bonus should be transferred correctly"
      );
    });
  });
});