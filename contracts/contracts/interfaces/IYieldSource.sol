// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IYieldSource
 * @notice Lớp trừu tượng cho nguồn yield (Benqi thật hoặc MockBenqi khi demo).
 * @dev `accrue()` là hook để chốt lãi trước khi đọc balance. Adapter thật
 *      (Benqi) implement như no-op vì lãi được phản ánh qua tỷ giá qiToken.
 */
interface IYieldSource {
    function deposit(uint256 amount) external;

    /** Rút principal (không đụng tới lãi). */
    function withdraw(uint256 amount) external;

    /** Rút lãi đã chốt (không đụng tới principal). */
    function withdrawYield(uint256 amount) external;

    /** Giá trị tài khoản `account` bao gồm cả lãi đã chốt. */
    function balanceOf(address account) external view returns (uint256);

    /** Chốt lãi tới thời điểm hiện tại. */
    function accrue() external;
}
