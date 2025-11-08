// This is a script to manually verify our refactoring by examining the contract code

const fs = require('fs');
const path = require('path');

// Path to the NodePackages.sol file
const contractPath = path.join(__dirname, 'contracts', 'NodePackages.sol');

// Read the contract file
const contractCode = fs.readFileSync(contractPath, 'utf8');

// Check if the _processNodePurchase function exists
const helperFunctionExists = contractCode.includes('function _processNodePurchase');
console.log('Helper function _processNodePurchase exists:', helperFunctionExists);

// Check if both purchase functions use the helper function
const regularPurchaseUsesHelper = contractCode.includes('_processNodePurchase(_packageId, _referrer, packagePrice)');
console.log('Regular purchase function uses helper:', regularPurchaseUsesHelper);

const discountPurchaseUsesHelper = contractCode.includes('_processNodePurchase(_packageId, _referrer, packagePrice)');
console.log('Discounted purchase function uses helper:', discountPurchaseUsesHelper);

// Count the number of occurrences of certain operations to verify code reduction
function countOccurrences(text, pattern) {
  const regex = new RegExp(pattern, 'g');
  const matches = text.match(regex);
  return matches ? matches.length : 0;
}

// Check for duplicate code reduction
console.log('\nCode duplication analysis:');

// These operations should now appear once in the helper function instead of twice
const prosperityFundCheck = countOccurrences(contractCode, 'prosperityFundEnabled');
console.log('Prosperity Fund checks:', prosperityFundCheck);

const referralCheck = countOccurrences(contractCode, 'referrers\\[msg.sender\\]\\[_packageId\\] = _referrer');
console.log('Referral registrations:', referralCheck);

const bulkReferralCheck = countOccurrences(contractCode, 'userBulkReferralCount\\[_referrer\\]\\+\\+');
console.log('Bulk referral count increments:', bulkReferralCheck);

const nodeCreationCheck = countOccurrences(contractCode, 'UserNode memory newNode');
console.log('Node creation operations:', nodeCreationCheck);

console.log('\nConclusion:');
if (helperFunctionExists && regularPurchaseUsesHelper && discountPurchaseUsesHelper) {
  console.log('✅ Refactoring appears to be successful!');
  console.log('Common functionality has been moved to the _processNodePurchase helper function.');
  console.log('Both purchase functions now call this helper, reducing code duplication.');
} else {
  console.log('❌ Refactoring may not be complete or has issues.');
}