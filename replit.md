# Node Packages Affiliate System

## Overview

This is a blockchain-based affiliate system built on the Base Sepolia testnet. The project implements a node-based reward system with multi-level referrals, allowing users to purchase node packages and earn rewards through a seven-level referral structure. The system includes comprehensive admin tools for managing packages, tracking analytics, and configuring various reward mechanisms.

## System Architecture

### Backend Architecture
- **Smart Contracts**: Built using Solidity and deployed via Truffle framework
- **Blockchain Network**: Base Sepolia testnet (Chain ID: 84532)
- **Token Standard**: ERC-20 token (NodeToken) for all transactions and rewards
- **Development Framework**: Truffle with OpenZeppelin contracts for security

### Frontend Architecture
- **Admin Panel**: React.js application with Chakra UI components
- **Web3 Integration**: Ethers.js for blockchain interactions
- **API Integration**: Fast API service for user data and analytics (port 3001)
- **Static Interfaces**: Multiple HTML-based admin panels for different use cases
- **Server**: Express.js for serving static files and API endpoints
- **Database**: PostgreSQL for cached user data, events, and analytics

### Smart Contract Structure
- **NodePackages.sol**: Main contract handling node purchases, referrals, and reward distribution
- **NodeToken.sol**: ERC-20 token contract for the ecosystem currency
- **Upgradeable Contracts**: Using OpenZeppelin's upgradeable pattern for future enhancements

## Key Components

### Node Package System
- Configurable node packages with varying prices, durations, and ROI percentages
- Active/inactive package states for dynamic management
- Package ascension bonuses for bulk purchases

### Seven-Level Referral System
- Multi-tier referral rewards with configurable percentages per level
- Automatic reward distribution upon node purchases
- Bulk referral tracking and bonus systems
- Monthly analytics for referral performance

### Reward Mechanisms
- **Prosperity Fund**: Automated reward distribution system with configurable cycles
- **Admin Marketing Bonus**: Revenue sharing for administrative wallets
- **Booster Rewards**: Additional incentives for active users
- **Liquidity Withdrawal**: Controlled fund management with percentage-based withdrawals
- **First-Time User Fees**: Welcome bonuses for new participants
- **Rewards Discount**: Incentive system using accumulated rewards

### Analytics and Monitoring
- Real-time user activity tracking via API
- Monthly user analytics with growth metrics
- Referral event monitoring and statistics
- Package performance analytics with package-wise ascension bonuses
- Gas usage and transaction tracking
- Fast database queries for improved admin panel performance
- Event summaries and user-specific event filtering

## Data Flow

### Node Purchase Flow
1. User selects a node package and provides referrer address
2. System validates package availability and user token balance
3. Token transfer from user to contract occurs
4. Node is created with expiry time based on package duration
5. Referral rewards are calculated and distributed across seven levels
6. Various bonus systems (prosperity fund, admin bonus) are triggered
7. Events are emitted for tracking and analytics

### Reward Distribution Flow
1. Rewards accumulate in user accounts within the contract
2. Users can claim rewards at any time (subject to withdrawal settings)
3. Prosperity fund distributes rewards automatically based on cycles
4. Admin bonuses are collected separately by authorized wallets
5. All reward activities are logged for transparency

### Analytics Data Flow
1. Blockchain events are monitored in real-time
2. User activities are aggregated by month and package type
3. Referral chains are tracked across all seven levels
4. Performance metrics are calculated and displayed in admin panels
5. Historical data is maintained for trend analysis

## External Dependencies

### Blockchain Infrastructure
- **Base Sepolia RPC**: Primary blockchain connection
- **MetaMask/Web3 Wallets**: User authentication and transaction signing
- **Ethers.js**: Blockchain interaction library
- **OpenZeppelin Contracts**: Security and standard implementations

### Development Tools
- **Truffle**: Smart contract development and deployment
- **Ganache**: Local blockchain for testing
- **Node.js**: Runtime environment for scripts and servers
- **React**: Frontend framework for admin panel

### Third-Party Services
- **BaseScan API**: Blockchain explorer integration
- **Web3Modal**: Wallet connection management
- **Chakra UI**: Component library for React admin panel

## Deployment Strategy

### Smart Contract Deployment
- Contracts are deployed to Base Sepolia testnet using Truffle migrations
- Environment variables manage private keys and RPC endpoints
- Contract verification through BaseScan for transparency
- Upgrade mechanisms in place for future improvements

### Frontend Deployment
- React admin panel builds to static files for hosting
- Multiple HTML interfaces for different admin functions
- Express.js server for API endpoints and file serving
- Environment-specific configurations for different networks

### Testing Strategy
- Comprehensive test suite covering all contract functions
- Local Ganache testing before testnet deployment
- User acceptance testing with multiple wallet scenarios
- Performance testing for gas optimization

### Monitoring and Maintenance
- Event logging for all critical operations
- Error tracking and user activity monitoring
- Regular contract balance and reward distribution checks
- Backup strategies for configuration data

## Changelog

- June 25, 2025. Initial setup
- June 25, 2025. Implemented API-based data storage system to replace slow blockchain queries
  - Added Express.js API server (port 3001) with PostgreSQL database integration
  - Created fast user management interface with pagination and real-time data
  - Implemented event tracking and analytics endpoints
  - Added package-wise ascension bonus analytics system
  - Performance improvement: Queries now return in milliseconds instead of 30+ seconds
- June 28, 2025. Consolidated User Management with comprehensive API integration
  - Removed separate "User Management (API)" component and unified all functionality
  - Enhanced User Management to fetch all data from API instead of blockchain queries
  - Added comprehensive referral and rewards synchronization with attributes:
    * totalReferrals - Total number of referrals made by user
    * totalRewards - Accumulated rewards earned by user
    * ascensionBonusReferrals - Referrals from ascension bonus system
    * ascensionBonusSalesTotal - Total sales from ascension bonuses
    * ascensionBonusRewardsClaimed - Rewards claimed from ascension bonuses
  - Implemented auto-refresh mechanism (30-second intervals) for real-time sync
  - Enhanced user details modal with comprehensive statistics display
  - All event viewing now uses API endpoints for faster performance
- June 30, 2025. Implemented Package-wise Ascension Referral Tracking with Direct Blockchain Integration
  - Added direct smart contract calls to userAscensionBonusReferralCount function for accurate data
  - Enhanced user details popup to display package-wise ascension bonus breakdown
  - Implemented real-time blockchain data fetching with ethers v6 compatibility
  - Added token transfer functionality with MetaMask integration for admin operations
  - Fixed API service endpoints and data synchronization for proper package stats display
  - All ascension referral counts now show exact values from smart contract instead of database estimates

## User Preferences

Preferred communication style: Simple, everyday language.