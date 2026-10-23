// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockUSDC
 * @notice USDC testnet 6 decimals, faucet mở để demo.
 * @dev Mainnet dùng USDC thật của Circle — contract này chỉ dùng cho Fuji.
 */
contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USD Coin", "USDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    /// @notice Faucet công khai — chỉ tồn tại trên testnet.
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
