const { ethers } = require('ethers');
const fs = require('fs');

class SimpleUserEventsLogger {
    constructor(rpcUrl = 'http://localhost:8546') {
        this.rpcUrl = rpcUrl;
        this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
        this.userActivity = {};
    }

    async init() {
        console.log(`Initializing User Events Logger...`);
        console.log(`Provider: ${this.rpcUrl}`);
        
        try {
            const network = await this.provider.getNetwork();
            const currentBlock = await this.provider.getBlockNumber();
            console.log(`Network: ${network.name} (Chain ID: ${network.chainId})`);
            console.log(`Current Block: ${currentBlock}`);
            return currentBlock;
        } catch (error) {
            console.error(`Failed to connect: ${error.message}`);
            throw error;
        }
    }

    async getAllUserActivity(fromBlock = 0, toBlock = 'latest') {
        console.log(`\nFetching user activity from block ${fromBlock} to ${toBlock}...`);
        
        try {
            // Get all logs
            const allLogs = await this.provider.getLogs({
                fromBlock: fromBlock,
                toBlock: toBlock
            });

            console.log(`Found ${allLogs.length} total logs`);
            
            // Process each log to extract user activity
            for (const log of allLogs) {
                await this.processUserActivity(log);
            }

            console.log(`Organized activity for ${Object.keys(this.userActivity).length} unique users`);
            return this.userActivity;

        } catch (error) {
            console.error('Error fetching user activity:', error);
            throw error;
        }
    }

    async processUserActivity(log) {
        try {
            // Get transaction details
            const tx = await this.provider.getTransaction(log.transactionHash);
            const receipt = await this.provider.getTransactionReceipt(log.transactionHash);
            const block = await this.provider.getBlock(log.blockNumber);

            // Extract user addresses involved in this transaction
            const users = new Set();
            if (tx.from) users.add(tx.from);
            if (tx.to) users.add(tx.to);
            if (log.address) users.add(log.address);

            // Create activity record
            const activity = {
                blockNumber: log.blockNumber,
                transactionHash: log.transactionHash,
                timestamp: block.timestamp,
                date: new Date(block.timestamp * 1000).toISOString(),
                from: tx.from,
                to: tx.to,
                contractAddress: log.address,
                value: tx.value ? ethers.utils.formatEther(tx.value) : '0',
                gasUsed: receipt.gasUsed.toString(),
                status: receipt.status === 1 ? 'Success' : 'Failed',
                eventSignature: log.topics[0] || 'Unknown',
                logIndex: log.logIndex
            };

            // Add activity to each involved user
            for (const user of users) {
                if (!this.userActivity[user]) {
                    this.userActivity[user] = [];
                }
                this.userActivity[user].push(activity);
            }

        } catch (error) {
            console.log(`Could not process log: ${error.message}`);
        }
    }

    generateUserReport(userAddress) {
        const activities = this.userActivity[userAddress] || [];
        if (activities.length === 0) {
            return `\nUser: ${userAddress}\nNo activity found.\n`;
        }

        // Sort activities by block number
        activities.sort((a, b) => a.blockNumber - b.blockNumber);

        let report = `\nUser: ${userAddress}\n`;
        report += `Total Activities: ${activities.length}\n`;
        
        // Calculate statistics
        let totalGasUsed = 0;
        let totalValueSent = 0;
        let successfulTx = 0;
        let failedTx = 0;
        const contractsInteracted = new Set();

        for (const activity of activities) {
            totalGasUsed += parseInt(activity.gasUsed);
            if (activity.from === userAddress) {
                totalValueSent += parseFloat(activity.value);
            }
            if (activity.status === 'Success') successfulTx++;
            else failedTx++;
            
            if (activity.contractAddress) {
                contractsInteracted.add(activity.contractAddress);
            }
        }

        report += `Total Gas Used: ${totalGasUsed.toLocaleString()}\n`;
        report += `Total Value Sent: ${totalValueSent.toFixed(4)} ETH\n`;
        report += `Successful Transactions: ${successfulTx}\n`;
        report += `Failed Transactions: ${failedTx}\n`;
        report += `Contracts Interacted: ${contractsInteracted.size}\n`;

        report += `\nRecent Activities (last 10):\n`;
        const recentActivities = activities.slice(-10);
        for (const activity of recentActivities) {
            report += `  Block ${activity.blockNumber}: ${activity.status}\n`;
            report += `    Time: ${activity.date}\n`;
            report += `    From: ${activity.from}\n`;
            report += `    To: ${activity.to || 'Contract Creation'}\n`;
            if (parseFloat(activity.value) > 0) {
                report += `    Value: ${activity.value} ETH\n`;
            }
            report += `    Gas: ${activity.gasUsed}\n`;
            report += `    Tx: ${activity.transactionHash}\n\n`;
        }

        return report;
    }

    generateSummaryReport() {
        const totalUsers = Object.keys(this.userActivity).length;
        const totalActivities = Object.values(this.userActivity).reduce((sum, activities) => sum + activities.length, 0);
        
        let report = `\nUSER ACTIVITY SUMMARY\n`;
        report += `=====================\n`;
        report += `Total Users: ${totalUsers}\n`;
        report += `Total Activities: ${totalActivities}\n`;
        
        // Most active users
        const userStats = Object.entries(this.userActivity)
            .map(([address, activities]) => ({
                address,
                activityCount: activities.length,
                gasUsed: activities.reduce((sum, a) => sum + parseInt(a.gasUsed), 0)
            }))
            .sort((a, b) => b.activityCount - a.activityCount)
            .slice(0, 10);
        
        report += `\nMost Active Users:\n`;
        for (const { address, activityCount, gasUsed } of userStats) {
            report += `  ${address}: ${activityCount} activities, ${gasUsed.toLocaleString()} gas\n`;
        }

        // Identify contract addresses
        const contracts = new Set();
        for (const activities of Object.values(this.userActivity)) {
            for (const activity of activities) {
                if (activity.contractAddress && activity.contractAddress !== activity.from) {
                    contracts.add(activity.contractAddress);
                }
            }
        }

        report += `\nContract Addresses Found:\n`;
        for (const contract of contracts) {
            report += `  ${contract}\n`;
        }

        return report;
    }

    async exportToFile(filename = null) {
        if (!filename) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            filename = `user_activity_${timestamp}.txt`;
        }
        
        console.log(`\nExporting to file: ${filename}`);
        
        let content = this.generateSummaryReport();
        
        // Add detailed reports for each user
        for (const userAddress of Object.keys(this.userActivity).sort()) {
            content += this.generateUserReport(userAddress);
            content += '\n' + '='.repeat(60) + '\n';
        }
        
        fs.writeFileSync(filename, content);
        console.log(`Report exported to ${filename}`);
        return filename;
    }

    async run(fromBlock = 0, toBlock = 'latest', exportFile = true) {
        try {
            await this.init();
            await this.getAllUserActivity(fromBlock, toBlock);
            
            console.log(this.generateSummaryReport());
            
            if (exportFile) {
                await this.exportToFile();
            }
            
            return this.userActivity;
            
        } catch (error) {
            console.error('Error running user events logger:', error);
            throw error;
        }
    }
}

// CLI Usage
async function main() {
    const args = process.argv.slice(2);
    const rpcUrl = args[0] || 'http://localhost:8546';
    const fromBlock = args[1] ? parseInt(args[1]) : 0;
    const toBlock = args[2] || 'latest';
    
    console.log('User Activity Logger Starting...');
    console.log(`RPC URL: ${rpcUrl}`);
    console.log(`From Block: ${fromBlock}`);
    console.log(`To Block: ${toBlock}`);
    
    const logger = new SimpleUserEventsLogger(rpcUrl);
    await logger.run(fromBlock, toBlock, true);
}

module.exports = SimpleUserEventsLogger;

if (require.main === module) {
    main().catch(console.error);
}