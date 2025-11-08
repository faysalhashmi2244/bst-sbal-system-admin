// SPDX-License-Identifier: MIT
pragma solidity ^0.8.8;

/**
 * @title Migrations
 * @dev This is a simple migration contract that tracks the last completed migration.
 */
contract Migrations {
  address public owner;
  uint public last_completed_migration;

  constructor() {
    owner = msg.sender;
  }

  modifier restricted() {
    require(msg.sender == owner, "Restricted to owner");
    _;
  }

  function setCompleted(uint completed) public restricted {
    last_completed_migration = completed;
  }
}