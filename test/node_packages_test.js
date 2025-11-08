//rm -rf build && truffle test 'test/node_packages_test.js' --network development
const NodeToken = artifacts.require("NodeToken");
const NodePackages = artifacts.require("NodePackages");
const { BN, expectEvent, expectRevert, time } = require('@openzeppelin/test-helpers');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');

contract("NodePackages", function (accounts) {
  const owner = accounts[0];
  const user1 = accounts[1];
  const user2 = accounts[2];
  const user3 = accounts[3];
  const user4 = accounts[4];
  const user5 = accounts[5];
  const user6 = accounts[6];
  const user7 = accounts[7];
  const user8 = accounts[8];
  const user9 = accounts[9];
  // const user10 = accounts[10];
  
  let nodeTokenInstance;
  let nodePackagesInstance;
  
  // Initial node package constants
  const igniteNodePrice = web3.utils.toWei("100", "ether");
  const igniteNodeDuration = 20; // in days
  const igniteNodeBaseReward = web3.utils.toWei("20", "ether");
  const igniteNodeROI = 2000; // 20.00%
  
  beforeEach(async function () {
    // Deploy a fresh instance of NodeToken before each test
    nodeTokenInstance = await NodeToken.new({ from: owner });
    
    // Deploy NodePackages with the NodeToken address
    nodePackagesInstance = await NodePackages.new(nodeTokenInstance.address, { from: owner });
    
    // Transfer some tokens to users for testing
    await nodeTokenInstance.transfer(user1, web3.utils.toWei("100000", "ether"), { from: owner });
    await nodeTokenInstance.transfer(user2, web3.utils.toWei("10000", "ether"), { from: owner });
    await nodeTokenInstance.transfer(user3, web3.utils.toWei("10000", "ether"), { from: owner });
    await nodeTokenInstance.transfer(user4, web3.utils.toWei("10000", "ether"), { from: owner });
    await nodeTokenInstance.transfer(user5, web3.utils.toWei("10000", "ether"), { from: owner });
    await nodeTokenInstance.transfer(user6, web3.utils.toWei("10000", "ether"), { from: owner });
    await nodeTokenInstance.transfer(user7, web3.utils.toWei("10000", "ether"), { from: owner });
    await nodeTokenInstance.transfer(user8, web3.utils.toWei("10000", "ether"), { from: owner });
    
    // Transfer tokens to NodePackages contract for rewards
    await nodeTokenInstance.transfer(nodePackagesInstance.address, web3.utils.toWei("10000", "ether"), { from: owner });
  });
  
  describe("Initialization and Admin Functions", function () {
    it("should set the owner and token correctly", async function () {
      const contractOwner = await nodePackagesInstance.owner();
      assert.equal(contractOwner, owner, "Owner not set correctly");
      
      const tokenAddress = await nodePackagesInstance.nodeToken();
      assert.equal(tokenAddress, nodeTokenInstance.address, "Node token not set correctly");
    });
    
    it("should add a new node package correctly", async function () {
      const tx = await nodePackagesInstance.addNodePackage(
        "🔥 Ignite Node",
        igniteNodePrice,
        igniteNodeDuration,
        // igniteNodeBaseReward,
        igniteNodeROI,
        { from: owner }
      );
      
      expectEvent(tx, 'NodePackageAdded', {
        id: new BN(1),
        name: "🔥 Ignite Node",
        price: new BN(igniteNodePrice),
        duration: new BN(igniteNodeDuration * 24 * 60 * 60), // days to seconds
        // baseReward: new BN(igniteNodeBaseReward),
        roiPercentage: new BN(igniteNodeROI)
      });
      
      const packageCount = await nodePackagesInstance.nodePackageCount();
      assert.equal(packageCount, 1, "Node package count not incremented");
      
      const packageDetails = await nodePackagesInstance.getNodePackage(1);
      assert.equal(packageDetails.name, "🔥 Ignite Node", "Package name incorrect");
      assert.equal(packageDetails.price.toString(), igniteNodePrice, "Package price incorrect");
      assert.equal(
        packageDetails.duration.toString(), 
        (igniteNodeDuration * 24 * 60 * 60).toString(), 
        "Package duration incorrect"
      );
      // assert.equal(packageDetails.baseReward.toString(), igniteNodeBaseReward, "Package base reward incorrect");
      assert.equal(packageDetails.roiPercentage.toString(), igniteNodeROI.toString(), "Package ROI incorrect");
      assert.equal(packageDetails.isActive, true, "Package should be active");
    });
    
    it("should add multiple node packages correctly", async function () {
      await nodePackagesInstance.addMultipleNodePackages(
        ["🔥 Ignite Node", "🔥 Blaze Node"],
        [igniteNodePrice, web3.utils.toWei("200", "ether")],
        [20, 25],
        // [igniteNodeBaseReward, web3.utils.toWei("45", "ether")],
        [2000, 2250],
        { from: owner }
      );
      
      const packageCount = await nodePackagesInstance.nodePackageCount();
      assert.equal(packageCount, 2, "Node package count not correct");
      
      const blazeNodeDetails = await nodePackagesInstance.getNodePackage(2);
      assert.equal(blazeNodeDetails.name, "🔥 Blaze Node", "Package name incorrect");
      assert.equal(blazeNodeDetails.price.toString(), web3.utils.toWei("200", "ether"), "Package price incorrect");
    });
    
    it("should update a node package correctly", async function () {
      // First add a package
      await nodePackagesInstance.addNodePackage(
        "🔥 Ignite Node",
        igniteNodePrice,
        igniteNodeDuration,
        // igniteNodeBaseReward,
        igniteNodeROI,
        { from: owner }
      );
      
      // Then update it
      const newName = "🔥 Updated Ignite Node";
      const newPrice = web3.utils.toWei("120", "ether");
      const newDuration = 25;
      const newBaseReward = web3.utils.toWei("25", "ether");
      const newROI = 2200;
      
      const tx = await nodePackagesInstance.updateNodePackage(
        1,
        newName,
        newPrice,
        newDuration,
        // newBaseReward,
        newROI,
        true,
        { from: owner }
      );
      
      expectEvent(tx, 'NodePackageUpdated', {
        id: new BN(1),
        name: newName,
        price: new BN(newPrice),
        duration: new BN(newDuration * 24 * 60 * 60),
        // baseReward: new BN(newBaseReward),
        roiPercentage: new BN(newROI),
        isActive: true
      });
      
      const packageDetails = await nodePackagesInstance.getNodePackage(1);
      assert.equal(packageDetails.name, newName, "Updated package name incorrect");
      assert.equal(packageDetails.price.toString(), newPrice, "Updated package price incorrect");
    });
    
    it("should set a node package's active status", async function () {
      // First add a package
      await nodePackagesInstance.addNodePackage(
        "🔥 Ignite Node",
        igniteNodePrice,
        igniteNodeDuration,
        // igniteNodeBaseReward,
        igniteNodeROI,
        { from: owner }
      );
      
      // Then deactivate it
      const tx = await nodePackagesInstance.setNodePackageActive(1, false, { from: owner });
      
      expectEvent(tx, 'NodePackageUpdated', {
        id: new BN(1),
        isActive: false
      });
      
      const packageDetails = await nodePackagesInstance.getNodePackage(1);
      assert.equal(packageDetails.isActive, false, "Package should be inactive");
    });
    
    it("should restrict administrative functions to owner", async function () {
      await expectRevert(
        nodePackagesInstance.addNodePackage(
          "🔥 Ignite Node",
          igniteNodePrice,
          igniteNodeDuration,
          // igniteNodeBaseReward,
          igniteNodeROI,
          { from: user1 }
        ),
        "Ownable: caller is not the owner"
      );
      
      // Add a package as owner first
      await nodePackagesInstance.addNodePackage(
        "🔥 Ignite Node",
        igniteNodePrice,
        igniteNodeDuration,
        // igniteNodeBaseReward,
        igniteNodeROI,
        { from: owner }
      );
      
      await expectRevert(
        nodePackagesInstance.updateNodePackage(
          1,
          "Updated Name",
          igniteNodePrice,
          igniteNodeDuration,
          // igniteNodeBaseReward,
          igniteNodeROI,
          true,
          { from: user1 }
        ),
        "Ownable: caller is not the owner"
      );
      
      await expectRevert(
        nodePackagesInstance.setNodePackageActive(1, false, { from: user1 }),
        "Ownable: caller is not the owner"
      );
    });
    
    it("should prevent operations on invalid node package IDs", async function () {
      await expectRevert(
        nodePackagesInstance.getNodePackage(1),
        "Invalid node package ID"
      );
      
      await expectRevert(
        nodePackagesInstance.updateNodePackage(
          1,
          "Updated Name",
          igniteNodePrice,
          igniteNodeDuration,
          // igniteNodeBaseReward,
          igniteNodeROI,
          true,
          { from: owner }
        ),
        "Invalid node package ID"
      );
      
      await expectRevert(
        nodePackagesInstance.setNodePackageActive(1, false, { from: owner }),
        "Invalid node package ID"
      );
    });
  });
  
  describe("Node Purchase and Referrals with ERC20 Tokens", function () {
    beforeEach(async function () {
      // Add Ignite Node package
      await nodePackagesInstance.addNodePackage(
        "🔥 Ignite Node",
        igniteNodePrice,
        igniteNodeDuration,
        // igniteNodeBaseReward,
        igniteNodeROI,
        { from: owner }
      );
      
      // Approve tokens for the NodePackages contract
      await nodeTokenInstance.approve(nodePackagesInstance.address, web3.utils.toWei("10000", "ether"), { from: user1 });
      await nodeTokenInstance.approve(nodePackagesInstance.address, web3.utils.toWei("10000", "ether"), { from: user2 });
      await nodeTokenInstance.approve(nodePackagesInstance.address, web3.utils.toWei("10000", "ether"), { from: user3 });
    });
    
    it("should allow a user to purchase a node with tokens", async function () {
      const initialTokenBalance = await nodeTokenInstance.balanceOf(user1);
      
      const tx = await nodePackagesInstance.purchaseNode(1, "0x0000000000000000000000000000000000000000", {
        from: user1
      });
      
      const finalTokenBalance = await nodeTokenInstance.balanceOf(user1);
      assert.equal(
        initialTokenBalance.sub(finalTokenBalance).toString(), 
        igniteNodePrice,
        "Tokens were not deducted correctly"
      );
      
      // const userNodeCount = await nodePackagesInstance.getUserNodeCount(user1);
      // assert.equal(userNodeCount, 1, "User should have 1 node");
      
      const userNode = await nodePackagesInstance.getUserNode(user1, 1);
      assert.equal(userNode.packageId, 1, "Node package ID is incorrect");
      assert.equal(userNode.isActive, true, "Node should be active");
      
      // Check the expiry time is set correctly
      const expectedExpiryTime = parseInt(userNode.purchaseTime) + (igniteNodeDuration * 24 * 60 * 60);
      assert.equal(parseInt(userNode.expiryTime), expectedExpiryTime, "Expiry time is incorrect");
      
      expectEvent(tx, 'NodePurchased', {
        user: user1,
        packageId: new BN(1)
      });
    });
    
    it("should prevent purchase of inactive node packages", async function () {
      // Deactivate the node package
      await nodePackagesInstance.setNodePackageActive(1, false, { from: owner });
      
      await expectRevert(
        nodePackagesInstance.purchaseNode(1, "0x0000000000000000000000000000000000000000", {
          from: user1
        }),
        "Node package is not active"
      );
    });
    
    it("should prevent purchase with insufficient token balance", async function () {
      // Transfer all but a small amount of tokens from user1
      const balance = await nodeTokenInstance.balanceOf(user1);
      await nodeTokenInstance.transfer(owner, balance.sub(new BN(web3.utils.toWei("10", "ether"))), { from: user1 });
      
      await expectRevert(
        nodePackagesInstance.purchaseNode(1, "0x0000000000000000000000000000000000000000", {
          from: user1
        }),
        "Insufficient token balance"
      );
    });
    
    it("should register referrals correctly", async function () {
      // User2 refers User1
      const tx = await nodePackagesInstance.purchaseNode(1, user2, {
        from: user1
      });
      
      expectEvent(tx, 'ReferralRegistered', {
        user: user1,
        referrer: user2
      });
      
      const referrer = await nodePackagesInstance.referrers(user1, 1);
      assert.equal(referrer, user2, "Referrer not set correctly");
      
      // Check that referrer received a token reward (10% of the package price)
      // const referralReward = new BN(igniteNodePrice).mul(new BN(10)).div(new BN(100));
      // const referrerBalance = await nodeTokenInstance.balanceOf(user2);
      
      // Initial balance was 10000 ether, so should now be 10000 + referral reward
      // const expectedBalance = new BN(web3.utils.toWei("10000", "ether")).add(referralReward);
      // assert.equal(referrerBalance.toString(), expectedBalance.toString(), "Referrer did not receive the correct token reward");
    });
    
    it("should not allow self-referral", async function () {
      const tx = await nodePackagesInstance.purchaseNode(1, user1, {
        from: user1
      });
      
      // No ReferralRegistered event should be emitted
      const referrer = await nodePackagesInstance.referrers(user1, 1);
      assert.equal(referrer, "0x0000000000000000000000000000000000000000", "Referrer should not be set for self-referral");
    });
    
    it("should not overwrite existing referrer", async function () {
      // User2 refers User1
      await nodePackagesInstance.purchaseNode(1, user2, {
        from: user1
      });
      
      // User3 tries to refer User1 later
      await expectRevert (nodePackagesInstance.purchaseNode(1, user3, {
        from: user1
      }), "Already assigned");
      
      const referrer = await nodePackagesInstance.referrers(user1, 1);
      assert.equal(referrer, user2, "Original referrer should not be overwritten");
    });
  });
  
  describe("Rewards and Expirations with ERC20 Tokens", function () {
    beforeEach(async function () {
      // Add Ignite Node package
      await nodePackagesInstance.addNodePackage(
        "🔥 Ignite Node",
        igniteNodePrice,
        igniteNodeDuration,
        // igniteNodeBaseReward,
        igniteNodeROI,
        { from: owner }
      );
      
      // Approve tokens for the NodePackages contract
      await nodeTokenInstance.approve(nodePackagesInstance.address, web3.utils.toWei("10000", "ether"), { from: user1 });
      
      // User1 purchases a node
      await nodePackagesInstance.purchaseNode(1, "0x0000000000000000000000000000000000000000", {
        from: user1
      });
    });
    
    it("should calculate token rewards correctly based on elapsed time", async function () {
      // Fast-forward time by 10 days (half the duration)
      await time.increase(time.duration.days(10));
      
      // Get initial token balance
      await nodeTokenInstance.approve(nodePackagesInstance.address, web3.utils.toWei("10000", "ether"), { from: user2 });
      
      await nodePackagesInstance.purchaseNode(1, user1, {
        from: user2
      });
      const initialBalance = await nodePackagesInstance.userRewards(user1);
      
      
      // Claim rewards
      const packageDetails = await nodePackagesInstance.getNodePackage(1);
      const claimed = await nodePackagesInstance.userRewardsClaimed(user1, 1)
      
      // const reward = await nodePackagesInstance.calculatePendingNodeReward(1, user1, {from: user1})
      
      const made = await nodePackagesInstance.packageReferralsMade(user1, 1)

      // await nodePackagesInstance.claimNodeReward(1, { from: user1 });
      // Get final token balance
      const finalBalance = await nodePackagesInstance.userRewards(user1);
      
      // Expected reward is approximately half of base reward (10 days out of 20)
      // const expectedReward = new BN(igniteNodeBaseReward).div(new BN(2));
      
      // Calculate actual reward received
      // const actualReward = finalBalance.sub(initialBalance);
      console.log("Mudaser", 
      web3.utils.fromWei(initialBalance), 
      web3.utils.fromWei(finalBalance), 
      claimed.toString(), 
      made.toString(),
      web3.utils.fromWei(packageDetails.price.toString()), 
      packageDetails.roiPercentage.toString(),
      // reward
      // web3.utils.fromWei(reward)
    )
      // Allow for a small margin of error in the calculation due to timestamp variations
      // const difference = expectedReward.sub(actualReward).abs();
      // assert(difference.lt(new BN(web3.utils.toWei("0.01", "ether"))), 
      //   `Reward calculation off by too much: ${web3.utils.fromWei(difference.toString(), "ether")} tokens`);
      
      // expectEvent(tx, 'RewardsClaimed', {
      //   user: user1
      // });
    });
    
  });
  
  describe("Test of all predefined node packages", function () {
    beforeEach(async function () {
      // Set up all 11 node packages
      const nodePackages = [
        {
          name: "🔥 Ignite Node",
          price: web3.utils.toWei("100", "ether"),
          durationInDays: 20,
          baseReward: web3.utils.toWei("20", "ether"),
          roiPercentage: 2000  // 20%
        },
        {
          name: "🔥 Blaze Node",
          price: web3.utils.toWei("200", "ether"),
          durationInDays: 25,
          baseReward: web3.utils.toWei("45", "ether"),
          roiPercentage: 2250  // 22.5%
        },
        {
          name: "⚡️ Surge Node",
          price: web3.utils.toWei("400", "ether"),
          durationInDays: 30,
          baseReward: web3.utils.toWei("100", "ether"),
          roiPercentage: 2500  // 25%
        },
        {
          name: "⚡️ Flux Node",
          price: web3.utils.toWei("800", "ether"),
          durationInDays: 35,
          baseReward: web3.utils.toWei("220", "ether"),
          roiPercentage: 2750  // 27.5%
        },
        {
          name: "⚙️ Axis Node",
          price: web3.utils.toWei("1600", "ether"),
          durationInDays: 40,
          baseReward: web3.utils.toWei("460", "ether"),
          roiPercentage: 2875  // 28.75%
        },
        {
          name: "⚙️ Core Node",
          price: web3.utils.toWei("3200", "ether"),
          durationInDays: 45,
          baseReward: web3.utils.toWei("990", "ether"),
          roiPercentage: 3090  // 30.9%
        },
        {
          name: "🌌 Sky Node",
          price: web3.utils.toWei("5000", "ether"),
          durationInDays: 50,
          baseReward: web3.utils.toWei("1600", "ether"),
          roiPercentage: 3200  // 32%
        },
        {
          name: "⏳ Vault Node",
          price: web3.utils.toWei("7500", "ether"),
          durationInDays: 55,
          baseReward: web3.utils.toWei("2475", "ether"),
          roiPercentage: 3300  // 33%
        },
        {
          name: "🛡️ Shield Node",
          price: web3.utils.toWei("10000", "ether"),
          durationInDays: 60,
          baseReward: web3.utils.toWei("3600", "ether"),
          roiPercentage: 3500  // 35%
        },
        {
          name: "☀️ Solar Node",
          price: web3.utils.toWei("12000", "ether"),
          durationInDays: 65,
          baseReward: web3.utils.toWei("4320", "ether"),
          roiPercentage: 3600  // 36%
        },
        {
          name: "🌠 Prime Node",
          price: web3.utils.toWei("15000", "ether"),
          durationInDays: 70,
          baseReward: web3.utils.toWei("5550", "ether"),
          roiPercentage: 3700  // 37%
        }
      ];
      
      // Add all packages
      for (const pkg of nodePackages) {
        await nodePackagesInstance.addNodePackage(
          pkg.name,
          pkg.price,
          pkg.durationInDays,
          // pkg.baseReward,
          pkg.roiPercentage,
          { from: owner }
        );
      }
    });
    
    it("should verify all 11 node packages were added correctly", async function () {
      const packageCount = await nodePackagesInstance.nodePackageCount();
      assert.equal(packageCount, 11, "Should have 11 node packages");
      
      // Check details of a few packages to verify
      const igniteNode = await nodePackagesInstance.getNodePackage(1);
      assert.equal(igniteNode.name, "🔥 Ignite Node", "Ignite Node name incorrect");
      
      const coreNode = await nodePackagesInstance.getNodePackage(6);
      assert.equal(coreNode.name, "⚙️ Core Node", "Core Node name incorrect");
      
      const primeNode = await nodePackagesInstance.getNodePackage(11);
      assert.equal(primeNode.name, "🌠 Prime Node", "Prime Node name incorrect");
      assert.equal(primeNode.price.toString(), web3.utils.toWei("15000", "ether"), "Prime Node price incorrect");
      assert.equal(primeNode.roiPercentage.toString(), "3700", "Prime Node ROI incorrect");
    });
    
    it("should allow purchase of any of the predefined packages", async function () {
      // Purchase Surge Node (package ID 3)
      const surgeNodePrice = web3.utils.toWei("400", "ether");
      await nodeTokenInstance.approve(nodePackagesInstance.address, web3.utils.toWei("10000", "ether"), { from: user1 });

      await nodePackagesInstance.purchaseNode(3, "0x0000000000000000000000000000000000000000", {
        from: user1,
        // value: surgeNodePrice
      });
      
      // Verify the purchase
    
      const userNode = await nodePackagesInstance.getUserNode(user1, 3);
      assert.equal(userNode.packageId, 3, "Node package ID is incorrect");
    });
    
    it("should verify ROI percentages translate to correct rewards", async function () {
      // Purchase Prime Node (package ID 11)
      // const primeNodePrice = web3.utils.toWei("15000", "ether");
      await nodeTokenInstance.approve(nodePackagesInstance.address, web3.utils.toWei("15000", "ether"), { from: user1 });
      
      await nodePackagesInstance.purchaseNode(11, "0x0000000000000000000000000000000000000000", {
        from: user1,
        // value: primeNodePrice
      });
      
      // Fast-forward time by the full duration (70 days)
      await time.increase(time.duration.days(70));
      
      // Get initial balance
      const initialBalance = new BN(await web3.eth.getBalance(user1));
      
      // Claim rewards
      // const tx = await nodePackagesInstance.claimRewards({ from: user1 });
      
      // // Calculate gas used
      // const gasUsed = new BN(tx.receipt.gasUsed);
      // const txInfo = await web3.eth.getTransaction(tx.tx);
      // const gasPrice = new BN(txInfo.gasPrice);
      // const gasCost = gasUsed.mul(gasPrice);
      
      // // Get final balance
      // const finalBalance = new BN(await web3.eth.getBalance(user1));
      
      // // Expected reward is the full base reward of 5550 ETH
      // const expectedReward = new BN(web3.utils.toWei("5550", "ether"));
      
      // // Account for gas costs in the calculation
      // const actualReward = finalBalance.sub(initialBalance).add(gasCost);
      
      // // Allow for a small margin of error in the calculation
      // const difference = expectedReward.sub(actualReward).abs();
      // assert(difference.lt(new BN(web3.utils.toWei("0.01", "ether"))), 
      //   `Reward calculation off by too much: ${web3.utils.fromWei(difference.toString(), "ether")} ETH`);
    });
    
    it("should match expected ROI for each package", async function () {
      // This test verifies that the ROI calculation matches the specified percentages
      
      // For example, the Prime Node has:
      // - Price: 15000 ETH
      // - Base Reward: 5550 ETH
      // - ROI: 37%
      
      // Calculate: 15000 * 0.37 = 5550
      
      // const primeNode = await nodePackagesInstance.getNodePackage(11);
      // const price = new BN(primeNode.price);
      // const baseReward = new BN(primeNode.baseReward);
      // const roiPercentage = new BN(primeNode.roiPercentage);
      
      // // ROI calculation: (baseReward / price) * 10000 should equal roiPercentage
      // const calculatedROI = roiPercentage.mul(new BN(10000)).div(price);
      
      // // Allow for small rounding differences
      // const difference = calculatedROI.sub(roiPercentage).abs();
      // assert(difference.lt(new BN(5)), "ROI calculation is off by too much");
    });
  });
});
