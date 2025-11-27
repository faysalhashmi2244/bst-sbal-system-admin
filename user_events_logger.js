const { Web3 } = require('web3');
const NodePackagesABI = require('./build/contracts/NodePackages.json');
const NodeTokenABI = require('./build/contracts/NodeToken.json');

// Configuration
const PROVIDER_URL = process.env.RPC_URL || 'https://polygon-rpc.com';
const CONTRACT_ADDRESS = process.env.NODE_PACKAGES_ADDRESS || '0xC8AC3954f9550Ef41705e9c0aE2179b8Df01CF4B';
const TOKEN_ADDRESS = process.env.NODE_TOKEN_ADDRESS || '0xF3f6C7bF8B0781350e7122039219Dcb23d6643AB';

class UserEventsLogger {
    constructor() {
        this.web3 = new Web3(PROVIDER_URL);
        this.contract = new this.web3.eth.Contract(NodePackagesABI.abi, CONTRACT_ADDRESS);
        this.tokenContract = new this.web3.eth.Contract(NodeTokenABI.abi, TOKEN_ADDRESS);
        this.userEvents = {};
    }

    async init() {
        console.log('🚀 Initializing User Events Logger...');
        console.log(`📄 Contract Address: ${CONTRACT_ADDRESS}`);
        console.log(`🪙 Token Address: ${TOKEN_ADDRESS}`);
        console.log(`🌐 Provider: ${PROVIDER_URL}`);
        
        // Get current block number
        const currentBlock = await this.web3.eth.getBlockNumber();
        console.log(`📦 Current Block: ${currentBlock}`);
        
        return currentBlock;
    }

    async getAllUserEvents(fromBlock = 0, toBlock = 'latest', specificUser = null) {
        if (specificUser) {
            console.log(`\n📊 Fetching events for user ${specificUser} from block ${fromBlock} to ${toBlock}...`);
        } else {
            console.log(`\n📊 Fetching events from block ${fromBlock} to ${toBlock}...`);
        }
        
        try {
            const allEvents = [];
            
            // NodePackages contract events
            console.log('📄 Fetching NodePackages events...');
            try {
                // Try with smaller block ranges for better reliability
                const currentBlock = parseInt(toBlock === 'latest' ? await this.web3.eth.getBlockNumber() : toBlock);
                const startBlock = parseInt(fromBlock);
                const chunkSize = 10000; // Process in chunks
                
                for (let start = startBlock; start <= currentBlock; start += chunkSize) {
                    const end = Math.min(start + chunkSize - 1, currentBlock);
                    
                    try {
                        const eventFilter = specificUser ? {
                            fromBlock: start,
                            toBlock: end,
                            filter: { user: specificUser }
                        } : {
                            fromBlock: start,
                            toBlock: end
                        };
                        
                        const nodeEvents = await this.contract.getPastEvents('allEvents', eventFilter);
                        
                        for (const event of nodeEvents) {
                            allEvents.push({
                                ...event,
                                eventName: event.event,
                                args: event.returnValues,
                                contractType: 'NodePackages'
                            });
                        }
                        
                        if (nodeEvents.length > 0) {
                            console.log(`✅ Found ${nodeEvents.length} NodePackages events in blocks ${start}-${end}`);
                        }
                    } catch (chunkError) {
                        console.log(`⚠️ Chunk ${start}-${end} failed, trying specific events...`);
                        
                        // Try specific events for this chunk
                        const specificEvents = [
                            'NodePurchased', 'ReferralRegistered', 'ReferralRegisteredAndRewardDistributed',
                            'RewardsClaimed', 'RewardsWithdrawn', 'RewardWithdrawalRequest',
                            'AddBoosterReward', 'BulkReferralRewardEarned', 'AdminMarketingBonusCollected',
                            'ProsperityFundContribution', 'ProsperityFundDistributed',
                            'PackageProsperityFundContribution', 'PackageProsperityFundDistributed',
                            'LiquidityWithdrawn', 'LiquidityWithdrawalSettingsUpdated', 'DiscountedNodePurchased',
                            'FirstTimeUserFeeCollected', 'FirstTimeUserFeeSettingsUpdated',
                            'UserHoldReward'
                        ];
                        
                        for (const eventName of specificEvents) {
                            try {
                                const eventFilter = specificUser ? {
                                    fromBlock: start,
                                    toBlock: end,
                                    filter: { user: specificUser }
                                } : {
                                    fromBlock: start,
                                    toBlock: end
                                };
                                
                                const events = await this.contract.getPastEvents(eventName, eventFilter);
                                
                                for (const event of events) {
                                    allEvents.push({
                                        ...event,
                                        eventName: event.event,
                                        args: event.returnValues,
                                        contractType: 'NodePackages'
                                    });
                                }
                            } catch (eventError) {
                                // Continue if specific event doesn't exist
                            }
                        }
                    }
                }
            } catch (error) {
                console.log(`⚠️ Warning: Could not fetch NodePackages events: ${error.message}`);
            }

            // Token contract events
            console.log('🪙 Fetching Token events...');
            try {
                const tokenFilter = specificUser ? {
                    fromBlock: fromBlock,
                    toBlock: toBlock,
                    filter: { from: specificUser, to: specificUser }
                } : {
                    fromBlock: fromBlock,
                    toBlock: toBlock
                };
                
                const tokenEvents = await this.tokenContract.getPastEvents('allEvents', tokenFilter);
                
                for (const event of tokenEvents) {
                    allEvents.push({
                        ...event,
                        eventName: event.event,
                        args: event.returnValues,
                        contractType: 'Token'
                    });
                }
                console.log(`✅ Found ${tokenEvents.length} Token events`);
            } catch (error) {
                console.log(`⚠️ Warning: Could not fetch Token events: ${error.message}`);
                
                // Try Transfer events specifically
                try {
                    const transferFilter = specificUser ? {
                        fromBlock: fromBlock,
                        toBlock: toBlock,
                        filter: { from: specificUser, to: specificUser }
                    } : {
                        fromBlock: fromBlock,
                        toBlock: toBlock
                    };
                    
                    const transferEvents = await this.tokenContract.getPastEvents('Transfer', transferFilter);
                    
                    for (const event of transferEvents) {
                        allEvents.push({
                            ...event,
                            eventName: event.event,
                            args: event.returnValues,
                            contractType: 'Token'
                        });
                    }
                } catch (transferError) {
                    console.log(`⚠️ Could not fetch Transfer events: ${transferError.message}`);
                }
            }

            // Sort events by block number and transaction index
            allEvents.sort((a, b) => {
                const blockA = typeof a.blockNumber === 'bigint' ? Number(a.blockNumber) : a.blockNumber;
                const blockB = typeof b.blockNumber === 'bigint' ? Number(b.blockNumber) : b.blockNumber;
                
                if (blockA !== blockB) {
                    return blockA - blockB;
                }
                
                const txA = typeof a.transactionIndex === 'bigint' ? Number(a.transactionIndex) : (a.transactionIndex || 0);
                const txB = typeof b.transactionIndex === 'bigint' ? Number(b.transactionIndex) : (b.transactionIndex || 0);
                
                return txA - txB;
            });

            console.log(`✅ Found ${allEvents.length} total events`);
            
            // Organize events by user
            this.organizeEventsByUser(allEvents);
            
            return allEvents;

        } catch (error) {
            console.error('❌ Error fetching events:', error);
            throw error;
        }
    }

    organizeEventsByUser(events) {
        console.log('\n👥 Organizing events by user...');
        
        this.userEvents = {};
        
        for (const event of events) {
            const userAddresses = this.extractUserAddresses(event);
            
            for (const userAddress of userAddresses) {
                if (!this.userEvents[userAddress]) {
                    this.userEvents[userAddress] = [];
                }
                
                this.userEvents[userAddress].push({
                    eventName: event.fragment?.name || event.eventName || 'Transfer',
                    blockNumber: event.blockNumber,
                    transactionHash: event.transactionHash,
                    args: event.args,
                    timestamp: null, // Will be filled later
                    contractType: event.contractType || 'NodePackages'
                });
            }
        }
        
        console.log(`📋 Organized events for ${Object.keys(this.userEvents).length} unique users`);
    }

    extractUserAddresses(event) {
        const addresses = new Set();
        const eventName = event.fragment?.name || event.eventName || 'Transfer';
        
        // Extract addresses based on event type
        if (event.args) {
            switch (eventName) {
                case 'NodePurchased':
                    if (event.args.user) addresses.add(event.args.user);
                    break;
                    
                case 'ReferralRegistered':
                case 'ReferralRegisteredAndRewardDistributed':
                    if (event.args.user) addresses.add(event.args.user);
                    if (event.args.referrer) addresses.add(event.args.referrer);
                    break;
                    
                case 'UserHoldReward':
                    if (event.args.user) addresses.add(event.args.user);
                    break;
                    
                case 'RewardsClaimed':
                case 'RewardsWithdrawn':
                case 'RewardWithdrawalRequest':
                case 'AddBoosterReward':
                case 'BulkReferralRewardEarned':
                    if (event.args.user) addresses.add(event.args.user);
                    break;
                    
                case 'AdminMarketingBonusCollected':
                    if (event.args.adminWallet) addresses.add(event.args.adminWallet);
                    break;
                    
                case 'ProsperityFundDistributed':
                case 'PackageProsperityFundDistributed':
                    if (event.args.recipient) addresses.add(event.args.recipient);
                    break;
                    
                case 'LiquidityWithdrawn':
                    if (event.args.liquidityAddress) addresses.add(event.args.liquidityAddress);
                    break;
                    
                case 'DiscountedNodePurchased':
                case 'FirstTimeUserFeeCollected':
                    if (event.args.user) addresses.add(event.args.user);
                    break;
                    
                case 'Transfer':
                    if (event.args.from && event.args.from !== '0x0000000000000000000000000000000000000000') {
                        addresses.add(event.args.from);
                    }
                    if (event.args.to && event.args.to !== '0x0000000000000000000000000000000000000000') {
                        addresses.add(event.args.to);
                    }
                    break;
                    
                default:
                    // Generic extraction for indexed parameters
                    for (const [key, value] of Object.entries(event.args)) {
                        if (this.web3.utils.isAddress(value)) {
                            addresses.add(value);
                        }
                    }
                    break;
            }
        }
        
        return Array.from(addresses);
    }

    async addTimestampsToEvents() {
        console.log('\n⏰ Adding timestamps to events...');
        
        const blockCache = {};
        let processedUsers = 0;
        
        for (const [userAddress, userEvents] of Object.entries(this.userEvents)) {
            for (const event of userEvents) {
                const blockNum = typeof event.blockNumber === 'bigint' ? Number(event.blockNumber) : event.blockNumber;
                
                if (!blockCache[blockNum]) {
                    try {
                        const block = await this.web3.eth.getBlock(blockNum);
                        blockCache[blockNum] = typeof block.timestamp === 'bigint' ? Number(block.timestamp) : block.timestamp;
                    } catch (error) {
                        console.log(`⚠️ Could not get block ${blockNum}: ${error.message}`);
                        blockCache[blockNum] = null;
                    }
                }
                event.timestamp = blockCache[blockNum];
            }
            
            // Sort user events by block number
            userEvents.sort((a, b) => {
                const blockA = typeof a.blockNumber === 'bigint' ? Number(a.blockNumber) : a.blockNumber;
                const blockB = typeof b.blockNumber === 'bigint' ? Number(b.blockNumber) : b.blockNumber;
                return blockA - blockB;
            });
            
            processedUsers++;
            if (processedUsers % 10 === 0) {
                console.log(`⏳ Processed ${processedUsers}/${Object.keys(this.userEvents).length} users...`);
            }
        }
        
        console.log('✅ Timestamps added successfully');
    }

    generateUserReport(userAddress) {
        const events = this.userEvents[userAddress] || [];
        if (events.length === 0) {
            return `\n👤 User: ${userAddress}\n   No events found.\n`;
        }

        let report = `\n👤 User: ${userAddress}\n`;
        report += `📊 Total Events: ${events.length}\n`;
        
        // Categorize events
        const eventCounts = {};
        for (const event of events) {
            eventCounts[event.eventName] = (eventCounts[event.eventName] || 0) + 1;
        }
        
        report += `📈 Event Breakdown:\n`;
        for (const [eventName, count] of Object.entries(eventCounts)) {
            report += `   ${eventName}: ${count}\n`;
        }
        
        report += `\n📝 Event Details:\n`;
        for (const event of events) {
            const date = event.timestamp ? new Date(event.timestamp * 1000).toISOString() : 'Unknown';
            report += `   🔸 ${event.eventName} (Block: ${event.blockNumber})\n`;
            report += `     Time: ${date}\n`;
            report += `     Tx: ${event.transactionHash}\n`;
            
            // Format event arguments
            if (event.args && Object.keys(event.args).length > 0) {
                report += `     Data: `;
                const argStrings = [];
                for (const [key, value] of Object.entries(event.args)) {
                    if (isNaN(key)) { // Only show named parameters
                        let formattedValue = value;
                        
                        // Don't convert packageId, timestamp, and time-related fields
                        if (key === 'packageId' || key === 'timestamp' || key === 'purchaseTime' || 
                            key === 'expiryTime' || key.toLowerCase().includes('time') || 
                            key.toLowerCase().includes('count') || key.toLowerCase().includes('id')) {
                            formattedValue = value.toString();
                        } else if (typeof value === 'bigint' || (typeof value === 'string' && /^\d+$/.test(value))) {
                            try {
                                formattedValue = this.web3.utils.fromWei(value.toString(), 'ether') + ' tokens';
                            } catch (weiError) {
                                formattedValue = value.toString();
                            }
                        }
                        argStrings.push(`${key}: ${formattedValue}`);
                    }
                }
                report += argStrings.join(', ') + '\n';
            }
            report += '\n';
        }
        
        return report;
    }

    generateSummaryReport() {
        const totalUsers = Object.keys(this.userEvents).length;
        const totalEvents = Object.values(this.userEvents).reduce((sum, events) => sum + events.length, 0);
        
        let report = `\n📊 SUMMARY REPORT\n`;
        report += `================\n`;
        report += `👥 Total Users: ${totalUsers}\n`;
        report += `📝 Total Events: ${totalEvents}\n`;
        
        // Most active users
        const userActivity = Object.entries(this.userEvents)
            .map(([address, events]) => ({ address, eventCount: events.length }))
            .sort((a, b) => b.eventCount - a.eventCount)
            .slice(0, 10);
        
        report += `\n🏆 Most Active Users:\n`;
        for (const { address, eventCount } of userActivity) {
            report += `   ${address}: ${eventCount} events\n`;
        }
        
        // Event type distribution
        const allEventTypes = {};
        for (const events of Object.values(this.userEvents)) {
            for (const event of events) {
                allEventTypes[event.eventName] = (allEventTypes[event.eventName] || 0) + 1;
            }
        }
        
        report += `\n📈 Event Type Distribution:\n`;
        for (const [eventType, count] of Object.entries(allEventTypes).sort((a, b) => b[1] - a[1])) {
            report += `   ${eventType}: ${count}\n`;
        }
        
        return report;
    }

    async exportToFile(filename = null) {
        if (!filename) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            filename = `user_events_${timestamp}.txt`;
        }
        
        console.log(`\n💾 Exporting to file: ${filename}`);
        
        let content = this.generateSummaryReport();
        
        // Add detailed reports for each user
        for (const userAddress of Object.keys(this.userEvents).sort()) {
            content += this.generateUserReport(userAddress);
            content += '\n' + '='.repeat(80) + '\n';
        }
        
        const fs = require('fs');
        fs.writeFileSync(filename, content);
        
        console.log(`✅ Report exported to ${filename}`);
        return filename;
    }

    async run(fromBlock = 0, toBlock = 'latest', exportFile = true, specificUser = null) {
        try {
            await this.init();
            await this.getAllUserEvents(fromBlock, toBlock, specificUser);
            await this.addTimestampsToEvents();
            
            console.log(this.generateSummaryReport());
            
            if (exportFile) {
                await this.exportToFile();
            }
            
            return this.userEvents;
            
        } catch (error) {
            console.error('❌ Error running user events logger:', error);
            throw error;
        }
    }

    async getUserEvents(userAddress, fromBlock = 0, toBlock = 'latest', exportFile = true) {
        console.log(`🔍 Fetching events specifically for user: ${userAddress}`);
        
        try {
            await this.init();
            await this.getAllUserEvents(fromBlock, toBlock, userAddress);
            await this.addTimestampsToEvents();
            
            const userReport = this.generateUserReport(userAddress);
            console.log(userReport);
            
            if (exportFile) {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const filename = `user_${userAddress.slice(0,8)}_events_${timestamp}.txt`;
                
                const fs = require('fs');
                fs.writeFileSync(filename, userReport);
                console.log(`✅ User report exported to ${filename}`);
            }
            
            return this.userEvents[userAddress] || [];
            
        } catch (error) {
            console.error('❌ Error fetching user events:', error);
            throw error;
        }
    }
}

// CLI Usage
async function main() {
    const args = process.argv.slice(2);
    
    // Check if first argument is an address (starts with 0x and is 42 characters)
    const isUserAddress = args[0] && args[0].startsWith('0x') && args[0].length === 42;
    
    if (isUserAddress) {
        // User-specific query: node user_events_logger.js 0x123... [fromBlock] [toBlock] [exportFile]
        const userAddress = args[0];
        const fromBlock = args[1] ? parseInt(args[1]) : 0;
        const toBlock = args[2] || 'latest';
        const exportFile = args[3] !== 'false';
        
        console.log('🔍 User-Specific Events Logger Starting...');
        console.log(`👤 User Address: ${userAddress}`);
        console.log(`📦 From Block: ${fromBlock}`);
        console.log(`📦 To Block: ${toBlock}`);
        console.log(`💾 Export File: ${exportFile}`);
        
        const logger = new UserEventsLogger();
        await logger.getUserEvents(userAddress, fromBlock, toBlock, exportFile);
    } else {
        // General query: node user_events_logger.js [fromBlock] [toBlock] [exportFile] [userAddress]
        const fromBlock = args[0] ? parseInt(args[0]) : 0;
        const toBlock = args[1] || 'latest';
        const exportFile = args[2] !== 'false';
        const specificUser = args[3] && args[3].startsWith('0x') ? args[3] : null;
        
        console.log('🔍 User Events Logger Starting...');
        console.log(`📦 From Block: ${fromBlock}`);
        console.log(`📦 To Block: ${toBlock}`);
        console.log(`💾 Export File: ${exportFile}`);
        if (specificUser) {
            console.log(`👤 Filtering for User: ${specificUser}`);
        }
        
        const logger = new UserEventsLogger();
        await logger.run(fromBlock, toBlock, exportFile, specificUser);
    }
}

// Export for use as module
module.exports = UserEventsLogger;

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}