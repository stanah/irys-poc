// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {VideoTipping} from "../src/VideoTipping.sol";

contract DeployScript is Script {
    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address platformAddress = vm.envAddress("PLATFORM_ADDRESS");
        uint256 platformFee = vm.envUint("PLATFORM_FEE_PERCENT");

        console.log("Deploying VideoTipping...");
        console.log("Platform Address:", platformAddress);
        console.log("Platform Fee:", platformFee, "%");

        vm.startBroadcast(deployerPrivateKey);

        VideoTipping tipping = new VideoTipping(platformAddress, platformFee);

        vm.stopBroadcast();

        console.log("VideoTipping deployed at:", address(tipping));
    }
}
