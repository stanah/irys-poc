// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {VideoTipping} from "../src/VideoTipping.sol";

contract VideoTippingTest is Test {
    VideoTipping public tipping;

    address public platform = address(0x1);
    address public creator = address(0x2);
    address public tipper = address(0x3);
    address public copyrightHolder1 = address(0x4);
    address public copyrightHolder2 = address(0x5);

    bytes32 public videoId = keccak256("test-video-cid-12345");

    event RevenueSplitConfigured(bytes32 indexed videoId, address indexed creator);
    event TipSent(bytes32 indexed videoId, address indexed sender, uint256 amount, string message);
    event PaymentDistributed(bytes32 indexed videoId, address indexed recipient, uint256 amount);

    function setUp() public {
        tipping = new VideoTipping(platform, 10); // 10% platform fee
    }

    function test_Constructor() public view {
        assertEq(tipping.platformAddress(), platform);
        assertEq(tipping.platformFeePercent(), 10);
    }

    function test_ConfigureRevenueSplit() public {
        address[] memory holders = new address[](1);
        holders[0] = copyrightHolder1;
        uint256[] memory percentages = new uint256[](1);
        percentages[0] = 5;

        vm.expectEmit(true, true, false, false);
        emit RevenueSplitConfigured(videoId, creator);

        vm.prank(creator);
        tipping.configureRevenueSplit(videoId, creator, 85, holders, percentages);

        assertTrue(tipping.isVideoConfigured(videoId));

        (address c, uint256 cp, address[] memory h, uint256[] memory p) = tipping.getRevenueSplit(videoId);
        assertEq(c, creator);
        assertEq(cp, 85);
        assertEq(h.length, 1);
        assertEq(h[0], copyrightHolder1);
        assertEq(p[0], 5);
    }

    function test_ConfigureRevenueSplit_NoCopyrightHolders() public {
        address[] memory holders = new address[](0);
        uint256[] memory percentages = new uint256[](0);

        vm.prank(creator);
        tipping.configureRevenueSplit(videoId, creator, 90, holders, percentages);

        assertTrue(tipping.isVideoConfigured(videoId));
    }

    function test_ConfigureRevenueSplit_MultipleCopyrightHolders() public {
        address[] memory holders = new address[](2);
        holders[0] = copyrightHolder1;
        holders[1] = copyrightHolder2;
        uint256[] memory percentages = new uint256[](2);
        percentages[0] = 3;
        percentages[1] = 2;

        vm.prank(creator);
        tipping.configureRevenueSplit(videoId, creator, 85, holders, percentages);

        assertTrue(tipping.isVideoConfigured(videoId));
    }

    function test_RevertWhen_PercentagesNotEqual100() public {
        address[] memory holders = new address[](1);
        holders[0] = copyrightHolder1;
        uint256[] memory percentages = new uint256[](1);
        percentages[0] = 10; // 85 + 10 + 10 = 105, not 100

        vm.prank(creator);
        vm.expectRevert(VideoTipping.InvalidPercentageSum.selector);
        tipping.configureRevenueSplit(videoId, creator, 85, holders, percentages);
    }

    function test_RevertWhen_LengthMismatch() public {
        address[] memory holders = new address[](2);
        holders[0] = copyrightHolder1;
        holders[1] = copyrightHolder2;
        uint256[] memory percentages = new uint256[](1);
        percentages[0] = 5;

        vm.prank(creator);
        vm.expectRevert(VideoTipping.LengthMismatch.selector);
        tipping.configureRevenueSplit(videoId, creator, 85, holders, percentages);
    }

    function test_RevertWhen_ZeroCreatorAddress() public {
        address[] memory holders = new address[](0);
        uint256[] memory percentages = new uint256[](0);

        vm.expectRevert(VideoTipping.ZeroAddress.selector);
        tipping.configureRevenueSplit(videoId, address(0), 90, holders, percentages);
    }

    function test_Tip() public {
        // Setup video
        _setupVideoWithSingleCopyrightHolder();

        uint256 tipAmount = 1 ether;
        vm.deal(tipper, tipAmount);

        uint256 platformBefore = platform.balance;
        uint256 creatorBefore = creator.balance;
        uint256 holderBefore = copyrightHolder1.balance;

        vm.prank(tipper);
        tipping.tip{value: tipAmount}(videoId, "Great video!");

        // Check distributions: 10% platform, 85% creator, 5% copyright holder
        assertEq(platform.balance - platformBefore, 0.1 ether, "Platform should receive 10%");
        assertEq(creator.balance - creatorBefore, 0.85 ether, "Creator should receive 85%");
        assertEq(copyrightHolder1.balance - holderBefore, 0.05 ether, "Copyright holder should receive 5%");

        // Check tip record
        assertEq(tipping.videoTotalTips(videoId), tipAmount);
        assertEq(tipping.getTipCount(videoId), 1);

        VideoTipping.TipRecord[] memory tips = tipping.getVideoTips(videoId);
        assertEq(tips.length, 1);
        assertEq(tips[0].sender, tipper);
        assertEq(tips[0].amount, tipAmount);
        assertEq(tips[0].message, "Great video!");
    }

    function test_MultipleTips() public {
        _setupVideoWithSingleCopyrightHolder();

        address tipper2 = address(0x6);
        vm.deal(tipper, 1 ether);
        vm.deal(tipper2, 2 ether);

        vm.prank(tipper);
        tipping.tip{value: 1 ether}(videoId, "First tip");

        vm.prank(tipper2);
        tipping.tip{value: 2 ether}(videoId, "Second tip");

        assertEq(tipping.videoTotalTips(videoId), 3 ether);
        assertEq(tipping.getTipCount(videoId), 2);
    }

    function test_TipWithEmptyMessage() public {
        _setupVideoWithSingleCopyrightHolder();

        vm.deal(tipper, 1 ether);
        vm.prank(tipper);
        tipping.tip{value: 1 ether}(videoId, "");

        VideoTipping.TipRecord[] memory tips = tipping.getVideoTips(videoId);
        assertEq(tips[0].message, "");
    }

    function test_RevertWhen_TipVideoNotConfigured() public {
        bytes32 unknownVideo = keccak256("unknown-video");
        vm.deal(tipper, 1 ether);

        vm.prank(tipper);
        vm.expectRevert(VideoTipping.VideoNotConfigured.selector);
        tipping.tip{value: 1 ether}(unknownVideo, "");
    }

    function test_RevertWhen_TipZeroAmount() public {
        _setupVideoWithSingleCopyrightHolder();

        vm.prank(tipper);
        vm.expectRevert(VideoTipping.TipMustBeGreaterThanZero.selector);
        tipping.tip{value: 0}(videoId, "");
    }

    function test_TipWithNoCopyrightHolders() public {
        address[] memory holders = new address[](0);
        uint256[] memory percentages = new uint256[](0);

        vm.prank(creator);
        tipping.configureRevenueSplit(videoId, creator, 90, holders, percentages);

        uint256 tipAmount = 1 ether;
        vm.deal(tipper, tipAmount);

        uint256 platformBefore = platform.balance;
        uint256 creatorBefore = creator.balance;

        vm.prank(tipper);
        tipping.tip{value: tipAmount}(videoId, "");

        assertEq(platform.balance - platformBefore, 0.1 ether, "Platform should receive 10%");
        assertEq(creator.balance - creatorBefore, 0.9 ether, "Creator should receive 90%");
    }

    function test_TipEvents() public {
        _setupVideoWithSingleCopyrightHolder();

        uint256 tipAmount = 1 ether;
        vm.deal(tipper, tipAmount);

        vm.expectEmit(true, true, false, true);
        emit TipSent(videoId, tipper, tipAmount, "Test");

        vm.expectEmit(true, true, false, true);
        emit PaymentDistributed(videoId, platform, 0.1 ether);

        vm.expectEmit(true, true, false, true);
        emit PaymentDistributed(videoId, creator, 0.85 ether);

        vm.expectEmit(true, true, false, true);
        emit PaymentDistributed(videoId, copyrightHolder1, 0.05 ether);

        vm.prank(tipper);
        tipping.tip{value: tipAmount}(videoId, "Test");
    }

    function test_IsVideoConfigured() public {
        assertFalse(tipping.isVideoConfigured(videoId));

        _setupVideoWithSingleCopyrightHolder();

        assertTrue(tipping.isVideoConfigured(videoId));
    }

    function testFuzz_Tip(uint256 amount) public {
        // Bound amount to reasonable values
        amount = bound(amount, 1, 100 ether);
        _setupVideoWithSingleCopyrightHolder();

        vm.deal(tipper, amount);
        vm.prank(tipper);
        tipping.tip{value: amount}(videoId, "Fuzz test");

        assertEq(tipping.videoTotalTips(videoId), amount);
    }

    // Helper function to setup a video with standard configuration
    function _setupVideoWithSingleCopyrightHolder() internal {
        address[] memory holders = new address[](1);
        holders[0] = copyrightHolder1;
        uint256[] memory percentages = new uint256[](1);
        percentages[0] = 5;

        vm.prank(creator);
        tipping.configureRevenueSplit(videoId, creator, 85, holders, percentages);
    }
}
