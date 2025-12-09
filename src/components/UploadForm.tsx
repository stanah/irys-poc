"use client";

import { useState } from "react";
import { useWalletContext } from "@/contexts/WalletContext";
import { litService } from "@/lib/lit";
import { irysService } from "@/lib/irys";
import type { AccessControlConditions } from "@lit-protocol/types";

export const UploadForm = () => {
  const { address, walletClient } = useWalletContext();
  const [file, setFile] = useState<File | null>(null);
  const [recipient, setRecipient] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!file || !address || !walletClient || !recipient) return;
    setLoading(true);
    setStatus("Initializing...");

    try {
      // 1. Get AuthSig for Lit using MetaMask
      setStatus("Signing for Lit Protocol...");
      const authSig = await litService.getAuthSig(address, walletClient);

      // 2. Define ACC (Access Control Conditions)
      const acc: AccessControlConditions = [
        {
          contractAddress: "",
          standardContractType: "",
          chain: "polygon" as const,
          method: "",
          parameters: [":userAddress"],
          returnValueTest: {
            comparator: "=",
            value: address,
          },
        },
        { operator: "or" },
        {
          contractAddress: "",
          standardContractType: "",
          chain: "polygon" as const,
          method: "",
          parameters: [":userAddress"],
          returnValueTest: {
            comparator: "=",
            value: recipient,
          },
        },
      ];

      // 3. Encrypt File
      setStatus("Encrypting file...");
      const { ciphertext, dataToEncryptHash } = await litService.encryptFile(
        file,
        acc,
        authSig
      );

      // 4. Prepare Metadata & Tags
      const metadata = {
        lit: {
          accessControlConditions: acc,
          chain: "polygon",
          dataToEncryptHash,
        },
        fileInfo: {
          name: file.name,
          type: file.type,
          size: file.size,
        },
      };

      const uploadData = JSON.stringify({
        encryptedFile: ciphertext,
        metadata,
      });

      // 5. Upload to Irys
      setStatus("Uploading to Irys...");
      const tags = [
        { name: "App-Name", value: "SecureFileSharePoC" },
        { name: "Type", value: "EncryptedFile" },
        { name: "Sender", value: address },
        { name: "Recipient", value: recipient },
      ];

      const receipt = await irysService.uploadData(uploadData, tags);

      setStatus(`Uploaded! ID: ${receipt.id}`);
    } catch (e: any) {
      console.error(e);
      setStatus(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 border rounded shadow-sm bg-white w-full max-w-md">
      <h2 className="text-xl font-bold" style={{ color: "#111827" }}>
        Upload File
      </h2>

      <div>
        <label
          className="block text-sm font-medium"
          style={{ color: "#374151" }}
        >
          To (Wallet Address)
        </label>
        <input
          type="text"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="0x..."
          className="w-full border p-2 rounded"
          style={{ backgroundColor: "white", color: "#111827" }}
        />
      </div>

      <div>
        <label
          className="block text-sm font-medium"
          style={{ color: "#374151" }}
        >
          File
        </label>
        <input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="w-full"
        />
      </div>

      <button
        onClick={handleUpload}
        disabled={loading || !file || !recipient}
        className="bg-green-600 text-white p-2 rounded hover:bg-green-700 disabled:opacity-50"
        style={{ backgroundColor: "#16a34a", color: "white", padding: "8px 16px" }}
      >
        {loading ? "Processing..." : "Encrypt & Upload"}
      </button>

      {status && (
        <p className="text-sm break-all" style={{ color: "#4b5563" }}>
          {status}
        </p>
      )}
    </div>
  );
};
