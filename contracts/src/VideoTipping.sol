// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title VideoTipping
 * @notice A contract for tipping video creators with automatic revenue distribution
 * @dev Uses keccak256 hash of Irys CID as videoId for on-chain identification
 */
contract VideoTipping is ReentrancyGuard {
    struct RevenueSplit {
        address creator;
        uint256 creatorPercent;
        address[] copyrightHolders;
        uint256[] copyrightPercentages;
    }

    struct TipRecord {
        address sender;
        uint256 amount;
        string message;
        uint256 timestamp;
    }

    address public immutable platformAddress;
    uint256 public immutable platformFeePercent;

    // videoId (keccak256 hash of Irys CID) => configuration
    mapping(bytes32 => RevenueSplit) public videoRevenueSplits;
    mapping(bytes32 => TipRecord[]) public videoTips;
    mapping(bytes32 => uint256) public videoTotalTips;

    event RevenueSplitConfigured(bytes32 indexed videoId, address indexed creator);
    event TipSent(bytes32 indexed videoId, address indexed sender, uint256 amount, string message);
    event PaymentDistributed(bytes32 indexed videoId, address indexed recipient, uint256 amount);

    error InvalidPercentageSum();
    error LengthMismatch();
    error TipMustBeGreaterThanZero();
    error VideoNotConfigured();
    error TransferFailed();
    error ZeroAddress();

    /**
     * @notice Constructor
     * @param _platformAddress Address to receive platform fees
     * @param _platformFeePercent Platform fee percentage (e.g., 10 = 10%)
     */
    constructor(address _platformAddress, uint256 _platformFeePercent) {
        if (_platformAddress == address(0)) revert ZeroAddress();
        platformAddress = _platformAddress;
        platformFeePercent = _platformFeePercent;
    }

    /**
     * @notice Configure revenue split for a video
     * @param videoId The keccak256 hash of the Irys CID
     * @param creator The creator's address
     * @param creatorPercent Creator's percentage of revenue
     * @param copyrightHolders Array of copyright holder addresses
     * @param copyrightPercentages Array of copyright holder percentages
     */
    function configureRevenueSplit(
        bytes32 videoId,
        address creator,
        uint256 creatorPercent,
        address[] calldata copyrightHolders,
        uint256[] calldata copyrightPercentages
    ) external {
        if (copyrightHolders.length != copyrightPercentages.length) {
            revert LengthMismatch();
        }
        if (creator == address(0)) revert ZeroAddress();

        uint256 total = creatorPercent + platformFeePercent;
        for (uint256 i = 0; i < copyrightPercentages.length; i++) {
            if (copyrightHolders[i] == address(0)) revert ZeroAddress();
            total += copyrightPercentages[i];
        }
        if (total != 100) revert InvalidPercentageSum();

        videoRevenueSplits[videoId] = RevenueSplit({
            creator: creator,
            creatorPercent: creatorPercent,
            copyrightHolders: copyrightHolders,
            copyrightPercentages: copyrightPercentages
        });

        emit RevenueSplitConfigured(videoId, creator);
    }

    /**
     * @notice Send a tip to a video creator
     * @param videoId The keccak256 hash of the Irys CID
     * @param message Optional message with the tip
     */
    function tip(bytes32 videoId, string calldata message) external payable nonReentrant {
        if (msg.value == 0) revert TipMustBeGreaterThanZero();

        RevenueSplit storage split = videoRevenueSplits[videoId];
        if (split.creator == address(0)) revert VideoNotConfigured();

        // Record the tip
        videoTips[videoId].push(TipRecord({
            sender: msg.sender,
            amount: msg.value,
            message: message,
            timestamp: block.timestamp
        }));
        videoTotalTips[videoId] += msg.value;

        emit TipSent(videoId, msg.sender, msg.value, message);

        // Calculate and distribute amounts
        uint256 platformAmount = (msg.value * platformFeePercent) / 100;
        uint256 creatorAmount = (msg.value * split.creatorPercent) / 100;

        // Transfer to platform
        _safeTransfer(platformAddress, platformAmount);
        emit PaymentDistributed(videoId, platformAddress, platformAmount);

        // Transfer to creator
        _safeTransfer(split.creator, creatorAmount);
        emit PaymentDistributed(videoId, split.creator, creatorAmount);

        // Transfer to copyright holders
        for (uint256 i = 0; i < split.copyrightHolders.length; i++) {
            uint256 holderAmount = (msg.value * split.copyrightPercentages[i]) / 100;
            _safeTransfer(split.copyrightHolders[i], holderAmount);
            emit PaymentDistributed(videoId, split.copyrightHolders[i], holderAmount);
        }
    }

    /**
     * @notice Get all tips for a video
     * @param videoId The keccak256 hash of the Irys CID
     * @return Array of TipRecord structs
     */
    function getVideoTips(bytes32 videoId) external view returns (TipRecord[] memory) {
        return videoTips[videoId];
    }

    /**
     * @notice Get revenue split configuration for a video
     * @param videoId The keccak256 hash of the Irys CID
     * @return creator The creator's address
     * @return creatorPercent Creator's percentage
     * @return copyrightHolders Array of copyright holder addresses
     * @return copyrightPercentages Array of copyright holder percentages
     */
    function getRevenueSplit(bytes32 videoId) external view returns (
        address creator,
        uint256 creatorPercent,
        address[] memory copyrightHolders,
        uint256[] memory copyrightPercentages
    ) {
        RevenueSplit storage split = videoRevenueSplits[videoId];
        return (
            split.creator,
            split.creatorPercent,
            split.copyrightHolders,
            split.copyrightPercentages
        );
    }

    /**
     * @notice Get the number of tips for a video
     * @param videoId The keccak256 hash of the Irys CID
     * @return The number of tips
     */
    function getTipCount(bytes32 videoId) external view returns (uint256) {
        return videoTips[videoId].length;
    }

    /**
     * @notice Check if a video is configured
     * @param videoId The keccak256 hash of the Irys CID
     * @return True if the video has a revenue split configured
     */
    function isVideoConfigured(bytes32 videoId) external view returns (bool) {
        return videoRevenueSplits[videoId].creator != address(0);
    }

    /**
     * @dev Safe ETH transfer with error handling
     * @param to Recipient address
     * @param amount Amount to transfer
     */
    function _safeTransfer(address to, uint256 amount) internal {
        if (amount == 0) return;
        (bool success, ) = payable(to).call{value: amount}("");
        if (!success) revert TransferFailed();
    }
}
