// SPDX-License-Identifier: MIT
pragma solidity ^0.8.8;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title NodeToken
 * @dev Simple ERC20 token to be used for node purchases
 */
contract NodeToken is ERC20, Ownable {
    constructor() ERC20("Node Token", "NODE") Ownable() {
        // Mint 1,000,000 tokens to the contract deployer
        _mint(msg.sender, 10000000000 * 10**decimals());
    }
    
    /**
     * @dev Mint new tokens (only callable by owner)
     * @param to Address to receive the minted tokens
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}