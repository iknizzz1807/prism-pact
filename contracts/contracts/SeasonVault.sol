// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {IYieldSource} from "./interfaces/IYieldSource.sol";

/**
 * @title SeasonVault
 * @notice No-loss prize pool: principal gửi vào yield source, toàn bộ lãi là prize.
 *
 * Bất biến (không được vi phạm):
 *  1. `withdrawPrincipal` luôn trả đủ 100% principal — prize KHÔNG bao giờ lấy từ principal.
 *  2. `prizePool() == yield + sponsored + prizeReserve` và luôn >= 0.
 *  3. Mỗi `matchId` chỉ commit draft 1 lần.
 *  4. Mỗi address chỉ claim prize 1 lần/mùa.
 *
 * Vòng đời:
 *   startSeason → deposit (nhiều người) → chơi → seasonEnd
 *   → postPrizeRoot (owner) → claimPrize (user) + withdrawPrincipal (user, bất cứ lúc nào sau seasonEnd)
 */
contract SeasonVault is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable asset;
    IYieldSource public immutable yieldSource;

    /// @notice Ví server được phép commit draft hash.
    address public operator;

    uint64 public seasonEnd;
    uint256 public totalPrincipal;
    uint256 public sponsored;
    uint256 public prizeReserve;

    bytes32 public prizeRoot;
    bool public prizePosted;

    mapping(address => uint256) public principalOf;
    mapping(bytes32 => bytes32) public draftHashOf;
    mapping(address => bool) public prizeClaimed;

    event SeasonStarted(uint64 endTime);
    event Deposited(address indexed account, uint256 amount);
    event PrincipalWithdrawn(address indexed account, uint256 amount);
    event Sponsored(address indexed sponsor, uint256 amount);
    event DraftCommitted(bytes32 indexed matchId, bytes32 draftHash);
    event PrizePosted(bytes32 root, uint256 totalPrize);
    event PrizeClaimed(address indexed account, uint256 amount);
    event OperatorChanged(address indexed oldOperator, address indexed newOperator);

    error ZeroAmount();
    error SeasonNotStarted();
    error SeasonActive();
    error SeasonEnded();
    error InvalidEndTime();
    error NoPrincipal();
    error NotOperator();
    error AlreadyCommitted();
    error AlreadyPosted();
    error NotPosted();
    error AlreadyClaimed();
    error ExceedsPool();
    error InvalidProof();
    error EmptyRoot();

    constructor(IERC20 asset_, IYieldSource yieldSource_, address initialOwner, address initialOperator)
        Ownable(initialOwner)
    {
        asset = asset_;
        yieldSource = yieldSource_;
        operator = initialOperator;
    }

    // ── Season ──────────────────────────────────────────────────────────

    function startSeason(uint64 endTime) external onlyOwner {
        if (prizePosted) revert AlreadyPosted();
        if (endTime <= block.timestamp) revert InvalidEndTime();
        seasonEnd = endTime;
        emit SeasonStarted(endTime);
    }

    // ── User ────────────────────────────────────────────────────────────

    function deposit(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        if (seasonEnd == 0) revert SeasonNotStarted();
        if (block.timestamp >= seasonEnd) revert SeasonEnded();

        asset.safeTransferFrom(msg.sender, address(this), amount);
        asset.forceApprove(address(yieldSource), amount);
        yieldSource.deposit(amount);

        principalOf[msg.sender] += amount;
        totalPrincipal += amount;

        emit Deposited(msg.sender, amount);
    }

    /// @notice Rút 100% principal sau khi mùa kết thúc. Không bao giờ bị trừ vì prize.
    function withdrawPrincipal() external nonReentrant {
        if (seasonEnd == 0) revert SeasonNotStarted();
        if (block.timestamp < seasonEnd) revert SeasonActive();

        uint256 amount = principalOf[msg.sender];
        if (amount == 0) revert NoPrincipal();

        principalOf[msg.sender] = 0;
        totalPrincipal -= amount;

        yieldSource.withdraw(amount);
        asset.safeTransfer(msg.sender, amount);

        emit PrincipalWithdrawn(msg.sender, amount);
    }

    /// @notice Bất kỳ ai cũng có thể tài trợ prize (mùa 1: team sponsor).
    function sponsor(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        asset.safeTransferFrom(msg.sender, address(this), amount);
        sponsored += amount;
        emit Sponsored(msg.sender, amount);
    }

    function claimPrize(uint256 amount, bytes32[] calldata proof) external nonReentrant {
        if (!prizePosted) revert NotPosted();
        if (prizeClaimed[msg.sender]) revert AlreadyClaimed();
        if (amount == 0 || amount > prizeReserve) revert ExceedsPool();

        bytes32 leaf = keccak256(abi.encode(msg.sender, amount));
        if (!MerkleProof.verify(proof, prizeRoot, leaf)) revert InvalidProof();

        prizeClaimed[msg.sender] = true;
        prizeReserve -= amount;
        asset.safeTransfer(msg.sender, amount);

        emit PrizeClaimed(msg.sender, amount);
    }

    // ── Operator ────────────────────────────────────────────────────────

    function setOperator(address newOperator) external onlyOwner {
        emit OperatorChanged(operator, newOperator);
        operator = newOperator;
    }

    /// @notice 1 tx/trận — chứng minh draft không thể sửa sau khi có kết quả.
    function commitDraft(bytes32 matchId, bytes32 draftHash) external {
        if (msg.sender != operator) revert NotOperator();
        if (draftHashOf[matchId] != bytes32(0)) revert AlreadyCommitted();
        draftHashOf[matchId] = draftHash;
        emit DraftCommitted(matchId, draftHash);
    }

    // ── Owner ───────────────────────────────────────────────────────────

    function postPrizeRoot(bytes32 root, uint256 totalPrize) external onlyOwner nonReentrant {
        if (seasonEnd == 0) revert SeasonNotStarted();
        if (block.timestamp < seasonEnd) revert SeasonActive();
        if (prizePosted) revert AlreadyPosted();
        if (root == bytes32(0)) revert EmptyRoot();

        yieldSource.accrue();
        if (totalPrize > prizePool()) revert ExceedsPool();

        uint256 fromYield = yieldBalance();
        uint256 usedFromYield = totalPrize < fromYield ? totalPrize : fromYield;
        if (usedFromYield > 0) yieldSource.withdrawYield(usedFromYield);

        uint256 fromSponsor = totalPrize - usedFromYield;
        if (fromSponsor > 0) sponsored -= fromSponsor;

        prizeReserve = totalPrize;
        prizeRoot = root;
        prizePosted = true;

        emit PrizePosted(root, totalPrize);
    }

    /// @notice Rút phần sponsor còn dư sau khi đã post prize (không đụng prizeReserve).
    function withdrawUnusedSponsor(address to) external onlyOwner nonReentrant {
        if (!prizePosted) revert NotPosted();
        uint256 balance = asset.balanceOf(address(this));
        uint256 excess = balance > prizeReserve ? balance - prizeReserve : 0;
        if (excess == 0) revert ZeroAmount();

        sponsored = 0;
        asset.safeTransfer(to, excess);
    }

    // ── View ────────────────────────────────────────────────────────────

    /// @notice Lãi hiện có trong yield source (chưa gồm sponsor/prize đã rút về vault).
    function yieldBalance() public view returns (uint256) {
        uint256 balance = yieldSource.balanceOf(address(this));
        return balance > totalPrincipal ? balance - totalPrincipal : 0;
    }

    /// @notice Toàn bộ prize hiện có: yield chưa chốt + sponsor + prize đã reserve.
    function prizePool() public view returns (uint256) {
        return yieldBalance() + sponsored + prizeReserve;
    }

    function seasonActive() public view returns (bool) {
        return seasonEnd != 0 && block.timestamp < seasonEnd;
    }
}
