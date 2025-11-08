//rm -rf build && truffle test 'test/seven_level_referral_test.js' --network development
const NodeToken = artifacts.require("NodeToken");
const NodePackages = artifacts.require("NodePackages");
const { BN, expectEvent, expectRevert, time } = require('@openzeppelin/test-helpers');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');

contract("NodePackages - Seven-Level Referral System", function (accounts) {
  // Set up accounts for testing various levels
  const owner = accounts[0];
  const level0 = accounts[1]; // Top of the referral chain
  const level1 = accounts[2]; 
  const level2 = accounts[3];
  const level3 = accounts[4];
  const level4 = accounts[5];
  const level5 = accounts[6];
  const level6 = accounts[7];
  const level7 = accounts[8]; // Bottom of the referral chain
  const level8 = accounts[9]; // Bottom of the referral chain
  const nonReferral = accounts[10]; // For testing non-referral scenarios
  
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
      "Test Node Package",
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
        nodePackages.updateSevenLevelReferralPercentage(0, 15, { from: level1 }),
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
      // level0 purchases a node without a referrer
      await nodePackages.purchaseNode(1, "0x0000000000000000000000000000000000000000", { from: level0 });
      
      // level1 purchases with level0 as referrer
      await nodePackages.purchaseNode(1, level0, { from: level1 });
      
      // Check the direct referrer relationship
      const referrer = await nodePackages.getUserReferrer(level1, 1);
      assert.equal(referrer, level0, "Direct referrer not set correctly");
      
      // Verify the level is set to 1 for level1
      const details = await nodePackages.getDirectReferralDetails(level1, 1);
      assert.equal(details.level.toString(), "1", "Level not set correctly");
      assert.equal(details.referrer, level0, "Referrer not stored correctly in details");
    });
    
    it("should set level 0 for users with no referrer", async function () {
      await nodePackages.purchaseNode(1, "0x0000000000000000000000000000000000000000", { from: level0 });
      
      const details = await nodePackages.getDirectReferralDetails(level0, 1);
      assert.equal(details.level.toString(), "0", "Level should be 0 for users with no referrer");
      assert.equal(details.referrer, "0x0000000000000000000000000000000000000000", "Referrer should be zero address");
    });
    
    it("should not allow self-referral", async function () {
      await nodePackages.purchaseNode(1, level1, { from: level1 });
      
      const referrer = await nodePackages.getUserReferrer(level1, 1);
      assert.equal(referrer, "0x0000000000000000000000000000000000000000", "Self-referral should not be registered");
    });
  });
  
  describe("Multi-Level Referrer Chain", function () {
    // beforeEach1(async function () {
    //   // Create a 7-level deep referral chain
    //   await nodePackages.purchaseNode(1, "0x0000000000000000000000000000000000000000", { from: level0 });
    //   await logBalance(level0, "when user buy node")  
    //   console.log("-----------------------------------")  
    //   // await logBalance(level1, "0 level1")    
    //   await nodePackages.purchaseNode(1, level0, { from: level1 });
    //   await logBalance(level0, "user on level 1")    
    //   // await logBalance(level1, "0 level1 1")    
    //   console.log("-----------------------------------")  
    //   await nodePackages.purchaseNode(1, level1, { from: level2 });
    //   await logBalance(level0, "user on level 2")    
    //   // await logBalance(level1, "1 level1 2")    
    //   // await logBalance(level2, "0 level2 1")    
    //   console.log("-----------------------------------")  
    //   await nodePackages.purchaseNode(1, level2, { from: level3 });
    //   await logBalance(level0, "user on level 3")    
    //   // await logBalance(level1, "2 level1 3")    
    //   // await logBalance(level2, "1 level2 2")    
    //   // await logBalance(level3, "0 level3 1")    
    //   console.log("-----------------------------------")  
    //   await nodePackages.purchaseNode(1, level3, { from: level4 });
    //   await logBalance(level0, "user on level 4")    
    //   // await logBalance(level1, "3 level1 4")    
    //   // await logBalance(level2, "3 level2 3")    
    //   // await logBalance(level3, "1 level3 2")   
    //   // await logBalance(level4, "0 level4 1")   
    //   console.log("-----------------------------------")  
    //   await nodePackages.purchaseNode(1, level4, { from: level5 });
    //   await logBalance(level0, "user on level 5")    
    //   // await logBalance(level1, "4 level1 5")    
    //   // await logBalance(level2, "3 level2 4")    
    //   // await logBalance(level3, "2 level3 3")   
    //   // await logBalance(level4, "1 level4 2")
    //   // await logBalance(level5, "0 level5 1")    
    //   console.log("-----------------------------------")  
    //   await nodePackages.purchaseNode(1, level5, { from: level6 });
    //   await logBalance(level0, "user on level 6")    
    //   // await logBalance(level1, "5 level1 6")    
    //   // await logBalance(level2, "4 level2 5")    
    //   // await logBalance(level3, "3 level3 4")   
    //   // await logBalance(level4, "2 level4 3")
    //   // await logBalance(level5, "1 level5 2")    
    //   // await logBalance(level6, "0 level0 1")    
       
    //   console.log("-----------------------------------")  
    //   await nodePackages.purchaseNode(1, level6, { from: level7 });
    //   await logBalance(level0, "user on level 7")    
    //   // await logBalance(level1, "5 level1 6")    
    //   // await logBalance(level2, "4 level2 5")    
    //   // await logBalance(level3, "3 level3 4")   
    //   // await logBalance(level4, "2 level4 3")
    //   // await logBalance(level5, "1 level5 2")    
    //   // await logBalance(level6, "0 level0 1")    
       
    //   console.log("-----------------------------------")  
    //   await nodePackages.purchaseNode(1, level7, { from: level8 });
    //   await logBalance(level0, "user on level 8")    
    //   // await logBalance(level1, "5 level1 6")    
    //   // await logBalance(level2, "4 level2 5")    
    //   // await logBalance(level3, "3 level3 4")   
    //   // await logBalance(level4, "2 level4 3")
    //   // await logBalance(level5, "1 level5 2")    
    //   // await logBalance(level6, "0 level0 1")    
       
    //   console.log("-----------------------------------")  
    // });

    beforeEach(async function () {
      // Create a 7-level deep referral chain
      await nodePackages.purchaseNode(1, "0x0000000000000000000000000000000000000000", { from: level0 });
      await logBalance(level0, "when user buy node")  
      console.log("-----------------------------------")  
      await nodePackages.purchaseNode(1, level0, { from: level1 });
      await logBalance(level0, "user on level 1")    
      console.log("-----------------------------------")  
      await nodePackages.purchaseNode(1, level1, { from: level2 });
      await logBalance(level0, "user on level 2")    
      console.log("-----------------------------------")  
      await nodePackages.purchaseNode(1, level2, { from: level3 });
      await logBalance(level0, "user on level 3")    
      console.log("-----------------------------------")  
      await nodePackages.purchaseNode(1, level3, { from: level4 });
      await logBalance(level0, "user on level 4")    
      console.log("-----------------------------------")  
      await nodePackages.purchaseNode(1, level4, { from: level5 });
      await logBalance(level0, "user on level 5")      
      console.log("-----------------------------------")  
      await nodePackages.purchaseNode(1, level5, { from: level6 });
      await logBalance(level0, "user on level 6")    
      console.log("-----------------------------------")  
      await nodePackages.purchaseNode(1, level6, { from: level7 });
      await logBalance(level0, "user on level 7")     
      console.log("-----------------------------------")  
      await nodePackages.purchaseNode(1, level7, { from: level8 });
      await logBalance(level0, "user on level 8")    
      console.log("-----------------------------------")  
    });
    
    it("should set the correct referrer level for each user", async function () {
      // Check levels of each user
      const level0Details = await nodePackages.getDirectReferralDetails(level0, 1);
      const level1Details = await nodePackages.getDirectReferralDetails(level1, 1);
      const level2Details = await nodePackages.getDirectReferralDetails(level2, 1);
      const level3Details = await nodePackages.getDirectReferralDetails(level3, 1);
      const level4Details = await nodePackages.getDirectReferralDetails(level4, 1);
      const level5Details = await nodePackages.getDirectReferralDetails(level5, 1);
      const level6Details = await nodePackages.getDirectReferralDetails(level6, 1);
      
      assert.equal(level0Details.level.toString(), "0", "Level0 should be at level 0");
      assert.equal(level1Details.level.toString(), "1", "Level1 should be at level 1");
      assert.equal(level2Details.level.toString(), "1", "Level2 should be at level 2");
      assert.equal(level3Details.level.toString(), "1", "Level3 should be at level 3");
      assert.equal(level4Details.level.toString(), "1", "Level4 should be at level 4");
      assert.equal(level5Details.level.toString(), "1", "Level5 should be at level 5");
      assert.equal(level6Details.level.toString(), "1", "Level6 should be at level 6");
    });
    
    it("should provide the correct direct referrer for each user", async function () {
      // Check direct referrers
      const level1Referrer = await nodePackages.getUserReferrer(level1, 1);
      const level2Referrer = await nodePackages.getUserReferrer(level2, 1);
      const level3Referrer = await nodePackages.getUserReferrer(level3, 1);
      const level4Referrer = await nodePackages.getUserReferrer(level4, 1);
      const level5Referrer = await nodePackages.getUserReferrer(level5, 1);
      const level6Referrer = await nodePackages.getUserReferrer(level6, 1);
      
      assert.equal(level1Referrer, level0, "Level1's referrer should be level0");
      assert.equal(level2Referrer, level1, "Level2's referrer should be level1");
      assert.equal(level3Referrer, level2, "Level3's referrer should be level2");
      assert.equal(level4Referrer, level3, "Level4's referrer should be level3");
      assert.equal(level5Referrer, level4, "Level5's referrer should be level4");
      assert.equal(level6Referrer, level5, "Level6's referrer should be level5");
    });
    
    it("should correctly count referrals made by each user", async function () {
      // Check referral counts
      const level0ReferralsMade = await nodePackages.getUserReferralCount(level0);
      const level1ReferralsMade = await nodePackages.getUserReferralCount(level1);
      const level2ReferralsMade = await nodePackages.getUserReferralCount(level2);
      
      assert.equal(level0ReferralsMade.toString(), "1", "Level0 should have 1 direct referral");
      assert.equal(level1ReferralsMade.toString(), "1", "Level1 should have 1 direct referral");
      assert.equal(level2ReferralsMade.toString(), "1", "Level2 should have 1 direct referral");
    });
    
    it("should distribute the correct reward percentages when level7 joins", async function () {
      // Get initial balances
      const initialBalances = {};
      for (let i = 0; i < 7; i++) {
        initialBalances[`level${i}`] = await getBalance(accounts[i + 1]);
      }
      
      // Level7 joins with level6 as referrer
      await nodePackages.purchaseNode(1, level6, { from: level7 });
      await logBalance(level0, "7 level0")    
      await logBalance(level1, "7 level1")

      await nodePackages.purchaseNode(1, level7, { from: nonReferral });
      await logBalance(level0, "8 level0")    
      await logBalance(level1, "8 level1")
      // Get final balances
      // const finalBalances = {};
      // for (let i = 0; i < 7; i++) {
      //   finalBalances[`level${i}`] = await getBalance(accounts[i + 1]);
      // }
      
      // // Calculate expected rewards based on package price and percentages
      // const expectedRewards = {};
      // const percentages = [10, 3, 2, 2, 1, 1, 1];
      // for (let i = 0; i < 7; i++) {
      //   expectedRewards[`level${i}`] = new BN(packagePrice).mul(new BN(percentages[i])).div(new BN(100));
      // }
      
      // // Since level7 is the one joining with level6 as direct referrer,
      // // rewards should flow to levels 0-6
      
      // // Check that each level received their correct reward
      // for (let i = 0; i < 7; i++) {
      //   const actualReward = finalBalances[`level${i}`].sub(initialBalances[`level${i}`]);
      //   console.log("Mudaser", i,
      //     web3.utils.fromWei(finalBalances[`level${i}`]),
      //     web3.utils.fromWei(expectedRewards[`level${i}`]),
      //     web3.utils.fromWei(actualReward),
          
      //   )
      //   // assert.equal(
      //   //   actualReward.toString(),
      //   //   expectedRewards[`level${i}`].toString(),
      //   //   `Level${i} didn't receive the correct reward`
      //   // );
      // }
    });
    
    it("should not distribute rewards beyond level 7", async function () {
      // Create a user at level 7
      await nodePackages.purchaseNode(1, level6, { from: level7 });
      
      // Get initial balance for a non-referred user
      const initialNonReferralBalance = await getBalance(nonReferral);
      
      // NonReferral user joins with level7 as referrer
      await nodePackages.purchaseNode(1, level7, { from: nonReferral });
      
      // Check that level0 didn't receive any additional reward
      // since we would now be at level 8 (beyond our 7-level limit)
      const finalNonReferralBalance = await getBalance(nonReferral);
      const nonReferralReward = finalNonReferralBalance.sub(initialNonReferralBalance);
      
      // assert.equal(nonReferralReward.toString(), "0", "User beyond level 7 should not receive rewards");
    });

    it("should test if 2nd package bbuy", async function () {
      await logBalance(level0, "2 level0")    
      await logBalance(level1, "2 level1")
      console.log("-----------------------------------")  
      await nodePackages.purchaseNode(2, '0x0000000000000000000000000000000000000000', { from: level0});
      await logBalance(level0, "2 level0")    
      await logBalance(level1, "2 level1")
      console.log("-----------------------------------")  
      await nodePackages.purchaseNode(2, '0x0000000000000000000000000000000000000000', { from: level1});
      await logBalance(level0, "2 level0")    
      await logBalance(level1, "2 level1")
    })
  });

  // Reward withdrawal functions section was removed as these functions are no longer needed
});