const UserEventsLogger = require('./user_events_logger');

// Test script for local development
async function testUserEventsLogger() {
    console.log('🧪 Testing User Events Logger with local Ganache...');
    
    // Override for local testing
    process.env.RPC_URL = 'http://localhost:8545';
    process.env.NODE_PACKAGES_ADDRESS = '0x0122Fed5ffCc08F96BCA2ec24b7752e9Ac037ecB'; // From test logs
    process.env.NODE_TOKEN_ADDRESS = '0x51733Ac2C0721F2b1138c9bAEb93C0b6b521660F'; // From test logs
    
    const logger = new UserEventsLogger();
    
    try {
        // Run with recent blocks only for testing
        const userEvents = await logger.run(0, 'latest', true);
        
        console.log('\n🎯 Test Results:');
        console.log(`Found events for ${Object.keys(userEvents).length} users`);
        
        // Display sample data
        const sampleUser = Object.keys(userEvents)[0];
        if (sampleUser) {
            console.log('\n📋 Sample User Events:');
            console.log(logger.generateUserReport(sampleUser));
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        
        // Try with fallback configuration
        console.log('\n🔄 Trying with Base Sepolia testnet...');
        process.env.RPC_URL = 'https://sepolia.base.org';
        process.env.NODE_PACKAGES_ADDRESS = '0x851373F13875E14e1fbD91472654ce90E8ff5E3f';
        process.env.NODE_TOKEN_ADDRESS = '0x35024799A05Ed370CE0f8F9b803A5BC0c072E854';
        
        const fallbackLogger = new UserEventsLogger();
        try {
            await fallbackLogger.run(0, 'latest', false);
            console.log('✅ Fallback test successful');
        } catch (fallbackError) {
            console.error('❌ Fallback test also failed:', fallbackError.message);
        }
    }
}

if (require.main === module) {
    testUserEventsLogger().catch(console.error);
}

module.exports = testUserEventsLogger;