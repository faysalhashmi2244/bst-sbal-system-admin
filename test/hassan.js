//rm -rf build && truffle test 'test/hassan.js' --network development
const NodeToken = artifacts.require("NodeToken");
const NodePackages = artifacts.require("NodePackages");
const { BN, expectEvent, expectRevert, time } = require('@openzeppelin/test-helpers');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');

contract("NodePackages - Seven-Level Referral System", function (accounts) {
  // Set up accounts for testing various levels
  const owner = accounts[0];
  const user0 = accounts[1]; // Top of the referral chain
  const user1 = accounts[2]; 
  const user2 = accounts[3];
  const user3 = accounts[4];
  const user4 = accounts[5];
  const user5 = accounts[6];
  const user6 = accounts[7];
  const user7 = accounts[8]; // Bottom of the referral chain
  const nonReferral = accounts[9]; // For testing non-referral scenarios
  const admin = accounts[10]
  
  let nodeToken;
  let nodePackages;
  
  // Package constants
  const packagePrice = web3.utils.toWei("100", "ether");
  const packageDuration = 30; // days
  const packageROI = 2000; // 20.00%

  const packagePrice2 = web3.utils.toWei("200", "ether");
  const packageDuration2 = 30; // days
  const packageROI2 = 2100; // 20.00%
  
  // Setup helper to check balances
  const getBalance = async (account) => {
    return await nodePackages.userRewards(account);
  };

  const logBalance = async (account, name) => {
    const balance = await getBalance(account)
    console.log(name, web3.utils.fromWei(balance))
  };

  
  
  beforeEach(async function () {
    // Deploy a fresh instance of NodeToken
    nodeToken = await NodeToken.new({ from: owner });
    
    // Deploy NodePackages with the NodeToken address
    nodePackages = await NodePackages.new(nodeToken.address, { from: owner });
    
    // Transfer tokens to users for testing
    const tokenAmount = web3.utils.toWei("1000", "ether");
    for (let i = 1; i < 10; i++) {
      await nodeToken.transfer(accounts[i], tokenAmount, { from: owner });
      // Approve tokens for the NodePackages contract
      await nodeToken.approve(nodePackages.address, tokenAmount, { from: accounts[i] });
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
      packagePrice2,
      packageDuration2,
      packageROI2,
      { from: owner }
    );
  });
  
  describe("Seven-Level Referral Percentages", function () {
    it("should have correct default referral percentages", async function () {
      const percentages = [];
      for (let i = 0; i < 7; i++) {
        percentages.push(await nodePackages.sevenLevelReferralPercentages(i));
      }
      
      // Check default values [10, 3, 2, 2, 1, 1, 1]
      assert.equal(percentages[0].toString(), "10", "Level 1 percentage incorrect");
      assert.equal(percentages[1].toString(), "3", "Level 2 percentage incorrect");
      assert.equal(percentages[2].toString(), "2", "Level 3 percentage incorrect");
      assert.equal(percentages[3].toString(), "2", "Level 4 percentage incorrect");
      assert.equal(percentages[4].toString(), "1", "Level 5 percentage incorrect");
      assert.equal(percentages[5].toString(), "1", "Level 6 percentage incorrect");
      assert.equal(percentages[6].toString(), "1", "Level 7 percentage incorrect");
    });
    
    it("should allow owner to update referral percentages", async function () {
      const newPercentage = 5;
      const levelToUpdate = 1; // Update level 2 percentage (index 1)
      
      const tx = await nodePackages.updateSevenLevelReferralPercentage(levelToUpdate, newPercentage, { from: owner });
      
      expectEvent(tx, 'SevenLevelReferralPercentageUpdated', {
        index: new BN(levelToUpdate),
        percentage: new BN(newPercentage)
      });
      
      const updatedPercentage = await nodePackages.sevenLevelReferralPercentages(levelToUpdate);
      assert.equal(updatedPercentage.toString(), newPercentage.toString(), "Percentage not updated correctly");
    });
    
    it("should prevent non-owners from updating percentages", async function () {
      await expectRevert(
        nodePackages.updateSevenLevelReferralPercentage(0, 15, { from: user1 }),
        "Ownable: caller is not the owner"
      );
    });
    
    it("should prevent invalid percentage updates", async function () {
      await expectRevert(
        nodePackages.updateSevenLevelReferralPercentage(7, 5, { from: owner }),
        "Invalid index"
      );
      
      await expectRevert(
        nodePackages.updateSevenLevelReferralPercentage(0, 101, { from: owner }),
        "Percentage must be less than or equal to 100"
      );
    });
  });
  
  describe("Direct Referrer Registration", function () {
    it("should register direct referrer relationship correctly", async function () {
      // user0 purchases a node without a referrer
      await nodePackages.updateAdminMarketingBonusSettings(true, web3.utils.toWei('3') , admin)
      await nodePackages.purchaseNode(1, "0x0000000000000000000000000000000000000000", { from: user0 });
      let adminBalance = web3.utils.fromWei(await nodeToken.balanceOf(admin))
      console.log("admin balance", adminBalance)
      await nodePackages.purchaseNode(2, "0x0000000000000000000000000000000000000000", { from: user0 });
      adminBalance = web3.utils.fromWei(await nodeToken.balanceOf(admin))
      console.log("admin balance", adminBalance)

      // user1 purchases with user0 as referrer
      await nodePackages.purchaseNode(1, user0, { from: user1 }); //user 0 refer user 1 in pack 1
      console.log("user0 referral count 1", (await nodePackages.referralsMade(user0)).toString())
      await nodePackages.purchaseNode(2, user0, { from: user1 });//user 0 refer user 1 in pack 2
      console.log("user0 referral count 2", (await nodePackages.referralsMade(user0)).toString())

      // Check the direct referrer relationship
      const referrer = await nodePackages.getUserReferrer(user1, 1);
      assert.equal(referrer, user0, "Direct referrer not set correctly");
      
      // Verify the level is set to 1 for user1
      const details = await nodePackages.getDirectReferralDetails(user1, 1);
      assert.equal(details.level.toString(), "1", "Level not set correctly");
      assert.equal(details.referrer, user0, "Referrer not stored correctly in details");
    });
    
  });
  

  // Reward withdrawal functions section was removed as these functions are no longer needed
});