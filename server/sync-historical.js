const { eventListener } = require('./event-listener');

async function main() {
  try {
    console.log('Starting historical sync...');
    
    // Start from a specific block number (you can adjust this)
    const fromBlock = process.env.FROM_BLOCK || 79584167 ;
    
    await eventListener.syncHistoricalEvents(parseInt(fromBlock));
    
    console.log('Historical sync completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Historical sync failed:', error);
    process.exit(1);
  }
}

main();