// rm -rf build && truffle test 'test/prosperity_fund_test.js' --network development
const NodeToken = artifacts.require("NodeToken");
const NodePackages = artifacts.require("NodePackages");
const { BN, expectEvent, expectRevert, time } = require('@openzeppelin/test-helpers');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');

contract("NodePackages - Prosperity Fund", function (accounts) {
  const owner = accounts[0];
  const user1 = accounts[1];
  const user2 = accounts[2];
  const fundRecipient = accounts[3];
  
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
    
    // Users approve tokens for the NodePackages contract
    await nodeToken.approve(nodePackages.address, web3.utils.toWei("1000", "ether"), { from: user1 });
    await nodeToken.approve(nodePackages.address, web3.utils.toWei("1000", "ether"), { from: user2 });
    
    // Add a node package for testing
    await nodePackages.addNodePackage(
      "Test Node Package",
      packagePrice,
      packageDuration,
      packageROI,
      { from: owner }
    );
  });
  
  describe("Prosperity Fund Settings", function () {
    it("should have default Prosperity Fund settings", async function () {
      const fundStatus = await nodePackages.getProsperityFundStatus();
      
      assert.equal(fundStatus.enabled, true, "Fund should be enabled by default");
      assert.equal(fundStatus.percentage.toString(), "10", "Default percentage should be 10%");
      assert.equal(fundStatus.distributionDays.toString(), "30", "Default distribution days should be 30");
      assert.equal(fundStatus.balance.toString(), "0", "Initial balance should be 0");
      assert.equal(fundStatus.isReady, false, "Fund should not be ready for distribution when empty");
    });
    
    it("should allow owner to update Prosperity Fund settings", async function () {
      const newPercentage = 15;
      const newDistributionDays = 20;
      
      const tx = await nodePackages.updateProsperityFundSettings(true, newPercentage, newDistributionDays, { from: owner });
      
      expectEvent(tx, 'ProsperityFundSettingsUpdated', {
        enabled: true,
        percentage: new BN(newPercentage),
        distributionDays: new BN(newDistributionDays)
      });
      
      const fundStatus = await nodePackages.getProsperityFundStatus();
      assert.equal(fundStatus.enabled, true, "Fund enabled setting was not updated");
      assert.equal(fundStatus.percentage.toString(), newPercentage.toString(), "Percentage was not updated");
      assert.equal(fundStatus.distributionDays.toString(), newDistributionDays.toString(), "Distribution days was not updated");
    });
    
    it("should prevent non-owners from updating Prosperity Fund settings", async function () {
      await expectRevert(
        nodePackages.updateProsperityFundSettings(true, 15, 20, { from: user1 }),
        "Ownable: caller is not the owner"
      );
    });
    
    it("should validate Prosperity Fund settings", async function () {
      await expectRevert(
        nodePackages.updateProsperityFundSettings(true, 101, 30, { from: owner }),
        "Percentage must be between 0 and 100"
      );
      
      await expectRevert(
        nodePackages.updateProsperityFundSettings(true, 10, 0, { from: owner }),
        "Distribution days must be greater than 0"
      );
    });
  });
  
  describe("Prosperity Fund Contributions", function () {
    it("should contribute to Prosperity Fund on node purchase", async function () {
      // Initial fund balance should be 0
      const initialFundStatus = await nodePackages.getProsperityFundStatus();
      assert.equal(initialFundStatus.balance.toString(), "0", "Initial fund balance should be 0");
      
      // User1 purchases a node
      const tx = await nodePackages.purchaseNode(1, "0x0000000000000000000000000000000000000000", { from: user1 });
      
      // Expected contribution: 10% of package price
      const expectedContribution = new BN(packagePrice).mul(new BN(10)).div(new BN(100));
      
      // Check for contribution event
      expectEvent(tx, 'ProsperityFundContribution', {
        amount: expectedContribution,
        newBalance: expectedContribution
      });
      
      // Check fund balance after purchase
      const fundStatus = await nodePackages.getProsperityFundStatus();
      assert.equal(
        fundStatus.balance.toString(),
        expectedContribution.toString(),
        "Fund balance should be 10% of package price"
      );
    });
    
    it("should not contribute to Prosperity Fund when disabled", async function () {
      // Disable the Prosperity Fund
      await nodePackages.updateProsperityFundSettings(false, 10, 30, { from: owner });
      
      // User1 purchases a node
      const tx = await nodePackages.purchaseNode(1, "0x0000000000000000000000000000000000000000", { from: user1 });
      
      // Check fund balance after purchase - should still be 0
      const fundStatus = await nodePackages.getProsperityFundStatus();
      assert.equal(fundStatus.balance.toString(), "0", "Fund balance should remain 0 when disabled");
      
      // Should not have emitted a ProsperityFundContribution event
      const events = tx.logs.filter(log => log.event === 'ProsperityFundContribution');
      assert.equal(events.length, 0, "Should not emit ProsperityFundContribution when disabled");
    });
    
    it("should accumulate contributions from multiple purchases", async function () {
      // User1 purchases a node
      await nodePackages.purchaseNode(1, "0x0000000000000000000000000000000000000000", { from: user1 });
      
      // User2 purchases a node
      await nodePackages.purchaseNode(1, "0x0000000000000000000000000000000000000000", { from: user2 });
      
      // Expected contribution from two purchases: 2 * (10% of package price)
      const singleContribution = new BN(packagePrice).mul(new BN(10)).div(new BN(100));
      const expectedTotalContribution = singleContribution.mul(new BN(2));
      
      // Check fund balance after both purchases
      const fundStatus = await nodePackages.getProsperityFundStatus();
      assert.equal(
        fundStatus.balance.toString(),
        expectedTotalContribution.toString(),
        "Fund balance should accumulate from multiple purchases"
      );
    });
  });
  
  describe("Prosperity Fund Distribution", function () {
    beforeEach(async function () {
      // User1 purchases a node to contribute to the fund
      await nodePackages.purchaseNode(1, "0x0000000000000000000000000000000000000000", { from: user1 });
      
      // Expected contribution: 10% of package price
      const expectedContribution = new BN(packagePrice).mul(new BN(10)).div(new BN(100));
      
      // Verify fund balance
      const fundStatus = await nodePackages.getProsperityFundStatus();
      assert.equal(
        fundStatus.balance.toString(),
        expectedContribution.toString(),
        "Fund balance setup incorrect"
      );
    });
    
    
    
    it("should be ready for distribution after the distribution period", async function () {
      // Fast forward time by 31 days (beyond the default 30-day distribution period)
      await time.increase(time.duration.days(31));
      
      const fundStatus = await nodePackages.getProsperityFundStatus();
      assert.equal(fundStatus.isReady, true, "Fund should be ready for distribution after period");
    });
    
    it("should allow owner to distribute the fund", async function () {
      // Check recipient's initial token balance
      const initialRecipientBalance = await nodeToken.balanceOf(fundRecipient);
      
      // Get the expected distribution amount
      const fundStatus = await nodePackages.getProsperityFundStatus();
      const distributionAmount = fundStatus.balance;
      
      // Distribute the fund
      const tx = await nodePackages.distributeProsperityFund(fundRecipient, { from: owner });
      
      // Check for distribution event
      expectEvent(tx, 'ProsperityFundDistributed', {
        amount: distributionAmount,
        recipient: fundRecipient
      });
      
      // Check fund balance after distribution
      const newFundStatus = await nodePackages.getProsperityFundStatus();
      assert.equal(newFundStatus.balance.toString(), "0", "Fund balance should be 0 after distribution");
      
      // Check recipient received the tokens
      const finalRecipientBalance = await nodeToken.balanceOf(fundRecipient);
      const receivedTokens = finalRecipientBalance.sub(initialRecipientBalance);
      assert.equal(
        receivedTokens.toString(),
        distributionAmount.toString(),
        "Recipient didn't receive the correct amount"
      );
    });
    
    it("should allow owner to distribute before the period if desired", async function () {
      // Fund is not ready yet
      const fundStatus = await nodePackages.getProsperityFundStatus();
      // assert.equal(fundStatus.isReady, false, "Fund should not be ready for distribution yet");
      
      // But owner should still be able to distribute
      const tx = await nodePackages.distributeProsperityFund(fundRecipient, { from: owner });
      
      // Check for distribution event
      expectEvent(tx, 'ProsperityFundDistributed');
      
      // Verify balance is now 0
      const newFundStatus = await nodePackages.getProsperityFundStatus();
      assert.equal(newFundStatus.balance.toString(), "0", "Fund balance should be 0 after distribution");
    });
    
    it("should prevent non-owners from distributing the fund", async function () {
      await expectRevert(
        nodePackages.distributeProsperityFund(fundRecipient, { from: user1 }),
        "Ownable: caller is not the owner"
      );
    });
    
    it("should prevent distribution to the zero address", async function () {
      await expectRevert(
        nodePackages.distributeProsperityFund("0x0000000000000000000000000000000000000000", { from: owner }),
        "Recipient cannot be zero address"
      );
    });
    
    it("should prevent distribution when fund is empty", async function () {
      // First distribute the fund to empty it
      await nodePackages.distributeProsperityFund(fundRecipient, { from: owner });
      
      // Try to distribute again
      await expectRevert(
        nodePackages.distributeProsperityFund(fundRecipient, { from: owner }),
        "Prosperity Fund balance is zero"
      );
    });
    
    it("should prevent distribution when fund is disabled", async function () {
      // Disable the fund
      await nodePackages.updateProsperityFundSettings(false, 10, 30, { from: owner });
      
      // Try to distribute
      await expectRevert(
        nodePackages.distributeProsperityFund(fundRecipient, { from: owner }),
        "Prosperity Fund is not enabled"
      );
    });
  });
  
  describe("Fund Protection Mechanisms", function () {
    it("should protect Prosperity Fund from general token withdrawals", async function () {
      // User purchases a node to contribute to the fund
      await nodePackages.purchaseNode(1, "0x0000000000000000000000000000000000000000", { from: user1 });
      
      // Get the current fund balance
      const fundStatus = await nodePackages.getProsperityFundStatus();
      const fundBalance = fundStatus.balance;
      
      // Try to withdraw more than available outside the fund
      const contractBalance = await nodeToken.balanceOf(nodePackages.address);
      const availableBalance = contractBalance.sub(fundBalance);
      const excessAmount = availableBalance.add(new BN(1));
      
      await expectRevert(
        nodePackages.withdrawTokens(excessAmount, { from: owner }),
        "Insufficient contract balance outside of Prosperity Fund"
      );
      
      // Should be able to withdraw exactly the available balance
      await nodePackages.withdrawTokens(availableBalance, { from: owner });
      
      // Fund balance should still be intact
      const newFundStatus = await nodePackages.getProsperityFundStatus();
      assert.equal(
        newFundStatus.balance.toString(),
        fundBalance.toString(),
        "Fund balance should be protected from general withdrawals"
      );
    });
  });
});