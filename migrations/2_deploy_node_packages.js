const NodeToken = artifacts.require("NodeToken");
const NodePackages = artifacts.require("NodePackages");

module.exports = async function(deployer, network, accounts) {
  if(network==="development")
    return
  // Deploy the NodeToken contract first
  // await deployer.deploy(NodeToken);
  // const nodeTokenInstance = await NodeToken.deployed();
  const nodeTokenInstance = await NodeToken.at('0x35024799A05Ed370CE0f8F9b803A5BC0c072E854');
  console.log(`NodeToken deployed at ${nodeTokenInstance.address}`);
  
  // Deploy the NodePackages contract with the NodeToken address
  await deployer.deploy(NodePackages, nodeTokenInstance.address);
  const nodePackagesInstance = await NodePackages.deployed();
  console.log(`NodePackages deployed at ${nodePackagesInstance.address}`);
  
  // Define the initial node packages
  const nodePackages = [
    {
      name: "Ignite",
      price: web3.utils.toWei("100", "ether"),  // $100 in tokens (assuming 1 token = $1)
      durationInDays: 0,
      roiPercentage: 2000  // 20% represented as 2000 (20.00%)
    },
    {
      name: "Blaze",
      price: web3.utils.toWei("200", "ether"),  // $200 in tokens
      durationInDays: 0,
      roiPercentage: 2100  // 22.5% represented as 2250 (22.50%)
    },
    {
      name: "Surge",
      price: web3.utils.toWei("400", "ether"),  // $400 in tokens
      durationInDays: 0,
      roiPercentage: 2200  // 25% represented as 2500 (25.00%)
    },
    {
      name: "Flux",
      price: web3.utils.toWei("800", "ether"),  // $800 in tokens
      durationInDays: 0,
      roiPercentage: 2300  // 27.5% represented as 2750 (27.50%)
    },
    {
      name: "Axis",
      price: web3.utils.toWei("1600", "ether"),  // $1,600 in tokens
      durationInDays: 0,
      roiPercentage: 2400  // 28.75% represented as 2875 (28.75%)
    },
    {
      name: "Core",
      price: web3.utils.toWei("3200", "ether"),  // $3,200 in tokens
      durationInDays: 0,
      roiPercentage: 2500  // 30.9% represented as 3090 (30.90%)
    },
    {
      name: "Sky",
      price: web3.utils.toWei("5000", "ether"),  // $5,000 in tokens
      durationInDays: 0,
      roiPercentage: 2600  // 32% represented as 3200 (32.00%)
    },
    {
      name: "Vault",
      price: web3.utils.toWei("7500", "ether"),  // $7,500 in tokens
      durationInDays: 0,
      roiPercentage: 2700  // 33% represented as 3300 (33.00%)
    },
    {
      name: "Shield",
      price: web3.utils.toWei("10000", "ether"),  // $10,000 in tokens
      durationInDays: 0,
      roiPercentage: 2800  // 35% represented as 3500 (35.00%)
    },
    {
      name: "Solar",
      price: web3.utils.toWei("12000", "ether"),  // $12,000 in tokens
      durationInDays: 0,
      roiPercentage: 2900  // 36% represented as 3600 (36.00%)
    },
    {
      name: "Prime",
      price: web3.utils.toWei("15000", "ether"),  // $15,000 in tokens
      durationInDays: 0,
      roiPercentage: 3000  // 37% represented as 3700 (37.00%)
    }
  ];
  
  // Prepare arrays for batch addition
  const names = nodePackages.map(pkg => pkg.name);
  const prices = nodePackages.map(pkg => pkg.price);
  const durations = nodePackages.map(pkg => pkg.durationInDays);
  const roiPercentages = nodePackages.map(pkg => pkg.roiPercentage);
  
  // Add all packages in a single transaction
  await nodePackagesInstance.addMultipleNodePackages(
    names,
    prices,
    durations,
    roiPercentages
  );
  
  console.log(`Initialized ${nodePackages.length} node packages`);
  
  // Transfer some tokens to the NodePackages contract for rewards
  const rewardsAmount = web3.utils.toWei("1000000", "ether"); // 1,000,000 tokens for rewards
  await nodeTokenInstance.transfer(nodePackagesInstance.address, rewardsAmount);
  console.log(`Transferred ${web3.utils.fromWei(rewardsAmount, "ether")} tokens to the NodePackages contract for rewards`);
};
