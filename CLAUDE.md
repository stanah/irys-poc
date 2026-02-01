# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Secure file sharing PoC using MetaMask wallet authentication, Lit Protocol for encryption, and Irys for permanent decentralized storage. Users can encrypt files with access control conditions and share them with specific wallet addresses.

## Commands

```bash
pnpm dev      # Start development server (http://localhost:3000)
pnpm build    # Production build (uses --webpack flag)
pnpm lint     # Run ESLint
```

Note: Uses Node 24 via mise.

## Required Environment Variables

Create `.env.local` with:
- `NEXT_PUBLIC_ALCHEMY_API_KEY` - Required
- `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` - Required
- `NEXT_PUBLIC_ALCHEMY_GAS_POLICY_ID` - Optional

## Architecture

### Tech Stack
- Next.js 16 (App Router) + React 19
- Viem for Ethereum interactions
- Lit Protocol (DatilDev network) for file encryption with access control
- Irys for decentralized file storage
- TailwindCSS 4

### Data Flow

1. **Upload**: MetaMask signs → Lit encrypts file with ACC → Irys stores encrypted blob + metadata
2. **Download**: Query Irys GraphQL → Fetch encrypted data → MetaMask signs → Lit decrypts → Download

### Key Files

- `src/lib/lit.ts` - LitService: SIWE auth, file encryption/decryption using Access Control Conditions
- `src/lib/irys.ts` - IrysService: WebUploader with ViemV2Adapter, GraphQL queries for file listing
- `src/hooks/useWallet.ts` - MetaMask connection state management
- `src/contexts/WalletContext.tsx` - Global wallet state provider

### Access Control Pattern

Files use Lit Protocol ACC with `OR` condition - both sender and recipient addresses can decrypt:
```typescript
[{ comparator: "=", value: senderAddress }, { operator: "or" }, { comparator: "=", value: recipientAddress }]
```

### Network Configuration
- Wallet: Polygon Amoy (testnet)
- Lit Protocol: DatilDev network, chain: "polygon"
- Irys: Mainnet gateway (uploader.irys.xyz)
