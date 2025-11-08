const { eventListener } = require('./event-listener');

async function main() {
  try {
    console.log('Starting event listener service...');
    await eventListener.startListening();
    
    // Keep the process running
    process.on('SIGINT', async () => {
      console.log('Received SIGINT, shutting down gracefully...');
      await eventListener.stopListening();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('Failed to start event listener:', error);
    process.exit(1);
  }
}

main();