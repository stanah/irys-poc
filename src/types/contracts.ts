// VideoTipping contract ABI (generated from Foundry)
export const VIDEO_TIPPING_ABI = [
  {
    type: "constructor",
    inputs: [
      { name: "_platformAddress", type: "address", internalType: "address" },
      { name: "_platformFeePercent", type: "uint256", internalType: "uint256" },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "configureRevenueSplit",
    inputs: [
      { name: "videoId", type: "bytes32", internalType: "bytes32" },
      { name: "creator", type: "address", internalType: "address" },
      { name: "creatorPercent", type: "uint256", internalType: "uint256" },
      {
        name: "copyrightHolders",
        type: "address[]",
        internalType: "address[]",
      },
      {
        name: "copyrightPercentages",
        type: "uint256[]",
        internalType: "uint256[]",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "tip",
    inputs: [
      { name: "videoId", type: "bytes32", internalType: "bytes32" },
      { name: "message", type: "string", internalType: "string" },
    ],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "getVideoTips",
    inputs: [{ name: "videoId", type: "bytes32", internalType: "bytes32" }],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        internalType: "struct VideoTipping.TipRecord[]",
        components: [
          { name: "sender", type: "address", internalType: "address" },
          { name: "amount", type: "uint256", internalType: "uint256" },
          { name: "message", type: "string", internalType: "string" },
          { name: "timestamp", type: "uint256", internalType: "uint256" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "videoRevenueSplits",
    inputs: [{ name: "videoId", type: "bytes32", internalType: "bytes32" }],
    outputs: [
      { name: "creator", type: "address", internalType: "address" },
      { name: "creatorPercent", type: "uint256", internalType: "uint256" },
      {
        name: "copyrightHolders",
        type: "address[]",
        internalType: "address[]",
      },
      {
        name: "copyrightPercentages",
        type: "uint256[]",
        internalType: "uint256[]",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "videoTotalTips",
    inputs: [{ name: "videoId", type: "bytes32", internalType: "bytes32" }],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "platformAddress",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "platformFeePercent",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "isVideoConfigured",
    inputs: [{ name: "videoId", type: "bytes32", internalType: "bytes32" }],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getTipCount",
    inputs: [{ name: "videoId", type: "bytes32", internalType: "bytes32" }],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "RevenueSplitConfigured",
    inputs: [
      { name: "videoId", type: "bytes32", indexed: true, internalType: "bytes32" },
      { name: "creator", type: "address", indexed: false, internalType: "address" },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "TipSent",
    inputs: [
      { name: "videoId", type: "bytes32", indexed: true, internalType: "bytes32" },
      { name: "sender", type: "address", indexed: true, internalType: "address" },
      { name: "amount", type: "uint256", indexed: false, internalType: "uint256" },
    ],
    anonymous: false,
  },
] as const;

// Contract addresses (to be updated after deployment)
export const CONTRACT_ADDRESSES = {
  // Polygon Amoy testnet
  polygonAmoy: {
    videoTipping: process.env.NEXT_PUBLIC_TIPPING_CONTRACT as `0x${string}` | undefined,
  },
} as const;

// Helper to get contract address for current network
export function getTippingContractAddress(): `0x${string}` | undefined {
  return CONTRACT_ADDRESSES.polygonAmoy.videoTipping;
}

import { keccak256, toBytes } from "viem";

// Helper to convert Irys CID to bytes32 for contract
export function cidToBytes32(cid: string): `0x${string}` {
  return keccak256(toBytes(cid));
}
