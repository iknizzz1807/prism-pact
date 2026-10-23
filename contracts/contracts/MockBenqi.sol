// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IYieldSource} from "./interfaces/IYieldSource.sol";

interface IMintableERC20 {
    function mint(address to, uint256 amount) external;
}

/**
 * @title MockBenqi
 * @notice Mô phỏng lending pool của Benqi cho môi trường testnet/demo.
 *
 * Lý do tồn tại: yield thật 5% APY trong 14 ngày là ~0.19% — không nhìn thấy
 * trong một buổi demo. Mock này cho phép set APY cao (vd 20000 bps = 200%)
 * để prize pool lớn dần ngay trước mắt giám khảo.
 *
 * @dev "Lãi" được mint bằng chính MockUSDC (hàm mint mở) nên vẫn là token thật
 *      trong ví — không phải số ảo. Với USDC thật, hàm mint sẽ revert, nên
 *      contract này chỉ dùng với MockUSDC.
 */
contract MockBenqi is IYieldSource {
    using SafeERC20 for IERC20;

    uint256 private constant BPS = 10_000;
    uint256 private constant YEAR = 365 days;
    uint256 private constant PRECISION = 1e18;

    IERC20 public immutable asset;
    uint256 public apyBps;

    uint256 public totalPrincipal;
    uint256 public lastAccrual;
    uint256 public rewardPerTokenStored;

    mapping(address => uint256) public principalOf;
    mapping(address => uint256) private userRewardPerToken;
    mapping(address => uint256) private accruedYieldOf;

    event Deposited(address indexed account, uint256 amount);
    event Withdrawn(address indexed account, uint256 amount);
    event YieldWithdrawn(address indexed account, uint256 amount);
    event YieldAccrued(uint256 amount, uint256 apyBps);
    event ApyChanged(uint256 oldBps, uint256 newBps);

    error ZeroAmount();
    error InsufficientPrincipal();
    error InsufficientYield();

    constructor(IERC20 asset_, uint256 apyBps_) {
        asset = asset_;
        apyBps = apyBps_;
        lastAccrual = block.timestamp;
    }

    // ── Admin (mock only) ────────────────────────────────────────────────

    /// @notice Chỉ là mock — ai cũng set được để tiện demo.
    function setApyBps(uint256 newApyBps) external {
        accrue();
        emit ApyChanged(apyBps, newApyBps);
        apyBps = newApyBps;
    }

    // ── IYieldSource ────────────────────────────────────────────────────

    function deposit(uint256 amount) external override {
        if (amount == 0) revert ZeroAmount();
        accrue();
        _update(msg.sender);

        asset.safeTransferFrom(msg.sender, address(this), amount);
        principalOf[msg.sender] += amount;
        totalPrincipal += amount;

        emit Deposited(msg.sender, amount);
    }

    function withdraw(uint256 amount) external override {
        if (amount == 0) revert ZeroAmount();
        accrue();
        _update(msg.sender);

        uint256 principal = principalOf[msg.sender];
        if (amount > principal) revert InsufficientPrincipal();

        principalOf[msg.sender] = principal - amount;
        totalPrincipal -= amount;

        asset.safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }

    /// @notice Rút lãi đã chốt — KHÔNG đụng tới principal.
    function withdrawYield(uint256 amount) external override {
        if (amount == 0) revert ZeroAmount();
        accrue();
        _update(msg.sender);

        uint256 available = accruedYieldOf[msg.sender];
        if (amount > available) revert InsufficientYield();

        accruedYieldOf[msg.sender] = available - amount;
        asset.safeTransfer(msg.sender, amount);
        emit YieldWithdrawn(msg.sender, amount);
    }

    function balanceOf(address account) external view override returns (uint256) {
        return principalOf[account] + _earned(account);
    }

    function accrue() public override {
        uint256 elapsed = block.timestamp - lastAccrual;
        if (elapsed == 0 || totalPrincipal == 0) {
            lastAccrual = block.timestamp;
            return;
        }

        uint256 yield = (totalPrincipal * apyBps * elapsed) / (BPS * YEAR);
        if (yield > 0) {
            IMintableERC20(address(asset)).mint(address(this), yield);
            rewardPerTokenStored += (yield * PRECISION) / totalPrincipal;
            emit YieldAccrued(yield, apyBps);
        }
        lastAccrual = block.timestamp;
    }

    // ── Internal ────────────────────────────────────────────────────────

    function _earned(address account) internal view returns (uint256) {
        return
            accruedYieldOf[account] +
            (principalOf[account] * (rewardPerTokenStored - userRewardPerToken[account])) /
            PRECISION;
    }

    function _update(address account) internal {
        accruedYieldOf[account] = _earned(account);
        userRewardPerToken[account] = rewardPerTokenStored;
    }
}
