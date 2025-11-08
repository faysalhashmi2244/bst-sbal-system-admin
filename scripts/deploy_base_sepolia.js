require('dotenv').config();
const HDWalletProvider = require('@truffle/hdwallet-provider');
const Web3 = require('web3');
const NodeToken = require('../build/contracts/NodeToken.json');
const NodePackages = require('../build/contracts/NodePackages.json');

async function deploy() {
  try {
    // Setup provider with private key and RPC URL
    const provider = new HDWalletProvider(
      process.env.BASE_SEPOLIA_PRIVATE_KEY,
      process.env.BASE_SEPOLIA_RPC_URL
    );
    
    const web3 = new Web3(provider);
    const accounts = await web3.eth.getAccounts();
    const deployerAccount = accounts[0];
    
    console.log(`Deploying contracts from account: ${deployerAccount}`);
    console.log(`Account balance: ${web3.utils.fromWei(await web3.eth.getBalance(deployerAccount), 'ether')} ETH`);
    
    // Deploy NodeToken
    console.log('Deploying NodeToken...');
    const nodeTokenContract = new web3.eth.Contract(NodeToken.abi);
    const nodeTokenDeployment = nodeTokenContract.deploy({
      data: NodeToken.bytecode
    });
    
    const nodeTokenInstance = await nodeTokenDeployment.send({
      from: deployerAccount,
      gas: 3000000
    });
    
    console.log(`NodeToken deployed at: ${nodeTokenInstance.options.address}`);
    
    // Deploy NodePackages
    console.log('Deploying NodePackages...');
    const nodePackagesContract = new web3.eth.Contract(NodePackages.abi);
    const nodePackagesDeployment = nodePackagesContract.deploy({
      data: NodePackages.bytecode,
      arguments: [nodeTokenInstance.options.address]
    });
    
    const nodePackagesInstance = await nodePackagesDeployment.send({
      from: deployerAccount,
      gas: 6000000
    });
    
    console.log(`NodePackages deployed at: ${nodePackagesInstance.options.address}`);
    
    // Define node packages for initialization
    const nodePackages = [
      {
        name: "🔥 Ignite Node",
        price: web3.utils.toWei("100", "ether"),
        durationInDays: 20,
        roiPercentage: 2000
      },
      {
        name: "🔥 Blaze Node",
        price: web3.utils.toWei("200", "ether"),
        durationInDays: 25,
        roiPercentage: 2250
      },
      {
        name: "⚡️ Surge Node",
        price: web3.utils.toWei("400", "ether"),
        durationInDays: 30,
        roiPercentage: 2500
      },
      {
        name: "⚡️ Flux Node",
        price: web3.utils.toWei("800", "ether"),
        durationInDays: 35,
        roiPercentage: 2750
      },
      {
        name: "⚙️ Axis Node",
        price: web3.utils.toWei("1600", "ether"),
        durationInDays: 40,
        roiPercentage: 2875
      }
    ];
    
    // Prepare arrays for batch addition (only adding 5 packages to save gas)
    const names = nodePackages.map(pkg => pkg.name);
    const prices = nodePackages.map(pkg => pkg.price);
    const durations = nodePackages.map(pkg => pkg.durationInDays);
    const roiPercentages = nodePackages.map(pkg => pkg.roiPercentage);
    
    // Add packages
    console.log('Adding node packages...');
    await nodePackagesInstance.methods.addMultipleNodePackages(
      names,
      prices,
      durations,
      roiPercentages
    ).send({
      from: deployerAccount,
      gas: 3000000
    });
    
    console.log(`Initialized ${nodePackages.length} node packages`);
    
    // Transfer some tokens to the NodePackages contract for rewards
    const rewardsAmount = web3.utils.toWei("1000000", "ether");
    console.log(`Transferring ${web3.utils.fromWei(rewardsAmount, "ether")} tokens to NodePackages contract...`);
    await nodeTokenInstance.methods.transfer(
      nodePackagesInstance.options.address,
      rewardsAmount
    ).send({
      from: deployerAccount,
      gas: 100000
    });
    
    console.log('Deployment completed successfully!');
    console.log('');
    console.log('Contract addresses:');
    console.log(`NodeToken: ${nodeTokenInstance.options.address}`);
    console.log(`NodePackages: ${nodePackagesInstance.options.address}`);
    
    // Cleanup
    provider.engine.stop();
    
  } catch (error) {
    console.error('Error during deployment:', error);
    process.exit(1);
  }
}

deploy();
