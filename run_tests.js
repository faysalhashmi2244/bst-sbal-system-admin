// Simple script to test our NodePackages contract
const NodeToken = artifacts.require("NodeToken");
const NodePackages = artifacts.require("NodePackages");

module.exports = async function(callback) {
  try {
    console.log("Starting tests...");
    
    // Get accounts
    const accounts = await web3.eth.getAccounts();
    const owner = accounts[0];
    const user1 = accounts[1];
    const user2 = accounts[2];
    
    console.log("Owner address:", owner);
    console.log("User1 address:", user1);
    console.log("User2 address:", user2);
    
    // Deploy NodeToken
    console.log("\nDeploying NodeToken...");
    const nodeToken = await NodeToken.new({ from: owner });
    console.log("NodeToken deployed at:", nodeToken.address);
    
    // Deploy NodePackages
    console.log("\nDeploying NodePackages...");
    const nodePackages = await NodePackages.new(nodeToken.address, { from: owner });
    console.log("NodePackages deployed at:", nodePackages.address);
    
    // Add a node package
    console.log("\nAdding a test node package...");
    const tx = await nodePackages.addNodePackage(
      "Test Node",
      web3.utils.toWei("100", "ether"),
      20, // 20 days
      2000, // 20.00%
      { from: owner }
    );
    
    // Get package count
    const packageCount = await nodePackages.nodePackageCount();
    console.log("Node package count:", packageCount.toString());
    
    // Get package details
    const packageDetails = await nodePackages.getNodePackage(1);
    console.log("\nAdded package details:");
    console.log("ID:", packageDetails.id.toString());
    console.log("Name:", packageDetails.name);
    console.log("Price:", web3.utils.fromWei(packageDetails.price.toString(), "ether"));
    console.log("Duration (seconds):", packageDetails.duration.toString());
    console.log("ROI Percentage:", packageDetails.roiPercentage.toString());
    console.log("Is Active:", packageDetails.isActive);
    
    // Transfer tokens to user1
    console.log("\nTransferring tokens to user1...");
    await nodeToken.transfer(user1, web3.utils.toWei("1000", "ether"), { from: owner });
    const user1Balance = await nodeToken.balanceOf(user1);
    console.log("User1 balance:", web3.utils.fromWei(user1Balance.toString(), "ether"));
    
    // User1 approves tokens for the NodePackages contract
    console.log("\nUser1 approving tokens for NodePackages contract...");
    await nodeToken.approve(nodePackages.address, web3.utils.toWei("1000", "ether"), { from: user1 });
    
    // User1 purchases a node
    console.log("\nUser1 purchasing a node...");
    await nodePackages.purchaseNode(1, "0x0000000000000000000000000000000000000000", { from: user1 });
    
    // Check if user has a node for package 1
    const hasNode = await nodePackages.userNodeAssigned(user1, 1);
    console.log("User1 has node for package 1:", hasNode);
    
    // Get user's node details for package 1
    const userNode = await nodePackages.getUserNode(user1, 1);
    console.log("\nUser1's node details:");
    console.log("Package ID:", userNode.packageId.toString());
    console.log("Purchase Time:", userNode.purchaseTime.toString());
    console.log("Expiry Time:", userNode.expiryTime.toString());
    console.log("Is Active:", userNode.isActive);
    
    console.log("\nTests completed successfully!");
    callback();
  } catch (error) {
    console.error("Error during tests:", error);
    callback(error);
  }
};