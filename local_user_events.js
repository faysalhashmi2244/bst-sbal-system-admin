const { ethers } = require('ethers');
const fs = require('fs');

// Local Ganache configuration
const LOCAL_RPC = 'http://localhost:8545';
const GANACHE_RPC = 'http://localhost:8546';

class LocalUserEventsLogger {
    constructor(rpcUrl = LOCAL_RPC) {
        this.rpcUrl = rpcUrl;
        this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
        this.userEvents = {};
    }

    async init() {
        console.log(`🚀 Initializing Local User Events Logger...`);
        console.log(`🌐 Provider: ${this.rpcUrl}`);
        
        try {
            const network = await this.provider.getNetwork();
            const currentBlock = await this.provider.getBlockNumber();
            console.log(`📦 Network: ${network.name} (Chain ID: ${network.chainId})`);
            console.log(`📦 Current Block: ${currentBlock}`);
            return currentBlock;
        } catch (error) {
            console.error(`❌ Failed to connect to ${this.rpcUrl}: ${error.message}`);
            throw error;
        }
    }

    async getAllEvents(fromBlock = 0, toBlock = 'latest') {
        console.log(`\n📊 Fetching all events from block ${fromBlock} to ${toBlock}...`);
        
        try {
            // Get all logs from all addresses
            const allLogs = await this.provider.getLogs({
                fromBlock: fromBlock,
                toBlock: toBlock
            });

            console.log(`✅ Found ${allLogs.length} total logs`);
            
            // Process each log
            const processedEvents = [];
            for (const log of allLogs) {
                const event = await this.processLog(log);
                if (event) {
                    processedEvents.push(event);
                }
            }

            // Organize events by user
            this.organizeEventsByUser(processedEvents);
            
            return processedEvents;

        } catch (error) {
            console.error('❌ Error fetching events:', error);
            throw error;
        }
    }

    async processLog(log) {
        try {
            // Try to get transaction details
            const tx = await this.provider.getTransaction(log.transactionHash);
            const receipt = await this.provider.getTransactionReceipt(log.transactionHash);
            const block = await this.provider.getBlock(log.blockNumber);

            // Basic event structure
            const event = {
                blockNumber: log.blockNumber,
                transactionHash: log.transactionHash,
                address: log.address,
                topics: log.topics,
                data: log.data,
                timestamp: block.timestamp,
                from: tx.from,
                to: tx.to,
                value: tx.value,
                gasUsed: receipt.gasUsed,
                status: receipt.status
            };

            // Try to decode common event signatures
            if (log.topics.length > 0) {
                const eventSignature = log.topics[0];
                event.eventSignature = eventSignature;
                
                // Common event signatures
                const eventSignatures = {
                    '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef': 'Transfer',
                    '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925': 'Approval',
                    // Add more as needed
                };
                
                event.eventName = eventSignatures[eventSignature] || 'Unknown';
            }

            return event;

        } catch (error) {
            console.log(`⚠️ Could not process log: ${error.message}`);
            return null;
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
                
                this.userEvents[userAddress].push(event);
            }
        }
        
        console.log(`📋 Organized events for ${Object.keys(this.userEvents).length} unique users`);
    }

    extractUserAddresses(event) {
        const addresses = new Set();
        
        // Add transaction participants
        if (event.from) addresses.add(event.from);
        if (event.to) addresses.add(event.to);
        
        // Add contract address if it's not zero
        if (event.address && event.address !== ethers.constants.AddressZero) {
            addresses.add(event.address);
        }
        
        return Array.from(addresses);
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
        let totalGasUsed = ethers.BigNumber.from(0);
        let totalValue = ethers.BigNumber.from(0);
        
        for (const event of events) {
            eventCounts[event.eventName] = (eventCounts[event.eventName] || 0) + 1;
            if (event.gasUsed) {
                totalGasUsed = totalGasUsed.add(event.gasUsed);
            }
            if (event.value && event.from && event.from === userAddress) {
                totalValue = totalValue.add(event.value);
            }
        }
        
        report += `📈 Event Breakdown:\n`;
        for (const [eventName, count] of Object.entries(eventCounts)) {
            report += `   ${eventName}: ${count}\n`;
        }
        
        report += `⛽ Total Gas Used: ${totalGasUsed.toString()}\n`;
        report += `💰 Total Value Sent: ${ethers.utils.formatEther(totalValue)} ETH\n`;
        
        report += `\n📝 Recent Events (last 10):\n`;
        const recentEvents = events.slice(-10);
        for (const event of recentEvents) {
            const date = event.timestamp ? new Date(event.timestamp * 1000).toISOString() : 'Unknown';
            report += `   🔸 ${event.eventName || 'Unknown'} (Block: ${event.blockNumber})\n`;
            report += `     Time: ${date}\n`;
            report += `     Tx: ${event.transactionHash}\n`;
            report += `     From: ${event.from || 'N/A'}\n`;
            report += `     To: ${event.to || 'Contract Creation'}\n`;
            if (event.value && !event.value.isZero()) {
                report += `     Value: ${ethers.utils.formatEther(event.value)} ETH\n`;
            }
            report += `     Gas Used: ${event.gasUsed || 'N/A'}\n`;
            report += `     Status: ${event.status === 1 ? 'Success' : 'Failed'}\n\n`;
        }
        
        return report;
    }

    generateSummaryReport() {
        const totalUsers = Object.keys(this.userEvents).length;
        const totalEvents = Object.values(this.userEvents).reduce((sum, events) => sum + events.length, 0);
        
        let report = `\n📊 LOCAL NETWORK SUMMARY REPORT\n`;
        report += `==================================\n`;
        report += `👥 Total Users: ${totalUsers}\n`;
        report += `📝 Total Events: ${totalEvents}\n`;
        
        // Most active users
        const userActivity = Object.entries(this.userEvents)
            .map(([address, events]) => ({ 
                address, 
                eventCount: events.length,
                gasUsed: events.reduce((sum, e) => sum + (e.gasUsed ? parseInt(e.gasUsed.toString()) : 0), 0)
            }))
            .sort((a, b) => b.eventCount - a.eventCount)
            .slice(0, 10);
        
        report += `\n🏆 Most Active Users:\n`;
        for (const { address, eventCount, gasUsed } of userActivity) {
            report += `   ${address}: ${eventCount} events, ${gasUsed} gas\n`;
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
            const networkName = this.rpcUrl.includes('8546') ? 'ganache-8546' : 'local';
            filename = `local_user_events_${networkName}_${timestamp}.txt`;
        }
        
        console.log(`\n💾 Exporting to file: ${filename}`);
        
        let content = this.generateSummaryReport();
        
        // Add detailed reports for each user
        for (const userAddress of Object.keys(this.userEvents).sort()) {
            content += this.generateUserReport(userAddress);
            content += '\n' + '='.repeat(80) + '\n';
        }
        
        fs.writeFileSync(filename, content);
        
        console.log(`✅ Report exported to ${filename}`);
        return filename;
    }

    async run(fromBlock = 0, toBlock = 'latest', exportFile = true) {
        try {
            await this.init();
            await this.getAllEvents(fromBlock, toBlock);
            
            console.log(this.generateSummaryReport());
            
            if (exportFile) {
                await this.exportToFile();
            }
            
            return this.userEvents;
            
        } catch (error) {
            console.error('❌ Error running local user events logger:', error);
            throw error;
        }
    }
}

// CLI Usage
async function main() {
    const args = process.argv.slice(2);
    const rpcUrl = args[0] || LOCAL_RPC;
    const fromBlock = args[1] ? parseInt(args[1]) : 0;
    const toBlock = args[2] || 'latest';
    const exportFile = args[3] !== 'false';
    
    console.log('🔍 Local User Events Logger Starting...');
    console.log(`🌐 RPC URL: ${rpcUrl}`);
    console.log(`📦 From Block: ${fromBlock}`);
    console.log(`📦 To Block: ${toBlock}`);
    console.log(`💾 Export File: ${exportFile}`);
    
    const logger = new LocalUserEventsLogger(rpcUrl);
    await logger.run(fromBlock, toBlock, exportFile);
}

// Export for use as module
module.exports = LocalUserEventsLogger;

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}