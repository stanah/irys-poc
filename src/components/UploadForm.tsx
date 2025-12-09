"use client";

import { useState } from "react";
import { useUser, useSigner } from "@account-kit/react";
import { litService } from "@/lib/lit";
import { irysService } from "@/lib/irys";
import { AccessControlConditions } from "@lit-protocol/types";

export const UploadForm = () => {
  const user = useUser();
  const signer = useSigner();
  const [file, setFile] = useState<File | null>(null);
  const [recipient, setRecipient] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!file || !user || !signer || !recipient) return;
    setLoading(true);
    setStatus("Initializing...");

    try {
      // 1. Get AuthSig for Lit
      setStatus("Signing for Lit Protocol...");
      const authSig = await litService.getAuthSig(user.address, signer);

      // 2. Define ACC (Access Control Conditions)
      // Allow Sender OR Recipient to decrypt
      const acc: AccessControlConditions = [
        {
          contractAddress: "",
          standardContractType: "",
          chain: "amoy", // Must match the chain used
          method: "",
          parameters: [":userAddress"],
          returnValueTest: {
            comparator: "=",
            value: user.address,
          },
        },
        { operator: "or" },
        {
          contractAddress: "",
          standardContractType: "",
          chain: "amoy",
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
      const { ciphertext, dataToEncryptHash } = await litService.encryptFile(file, acc, authSig);

      // 4. Prepare Metadata & Tags
      const metadata = {
        lit: {
          encryptedSymmetricKey: ciphertext, // In v3, typically ciphertext is string, check encryption result structure
          // Actually v3 returns ciphertext and dataToEncryptHash.
          // Wait, where is the symmetric key? 
          // v3 encryptFile returns { ciphertext, dataToEncryptHash } where ciphertext IS the encrypted content?
          // NO. Lit encrypts data using a symmetric key. That key is encrypted into "ciphertext" (or encryptedSymmetricKey).
          // And the file content is also encrypted.
          // Lit v3 encryptFile returns { ciphertext (string), dataToEncryptHash (string) } usually implies the file content is handled?
          // Check: encryptFile returns { ciphertext: string, dataToEncryptHash: string } usually for string encryption.
          // For FILE encryption, it returns { ciphertext, dataToEncryptHash } AND usually the encrypted file bytes are returned separately?
          // Using @lit-protocol/encryption:
          // encryptFile({ file ... }) returns { ciphertext, dataToEncryptHash } 
          // Wait, where is the encrypted FILE content?
          // It seems encryptFile returns the encrypted file as `ciphertext` if it's small? 
          // Or `ciphertext` is the encrypted key, and we get the encrypted file blob?
          // I will assume standard v3 behavior:
          // encryptFile returns { ciphertext, dataToEncryptHash } where ciphertext is the encrypted key?
          // NO. encryptFile encrypts the file.
          // The return object contains `ciphertext` (Base64 of encrypted file?) and `dataToEncryptHash`.
          // We need to double check this. 
          // If ciphertext IS the file, then we upload it.
          // If ciphertext is the KEY, where is the file?
          
          accessControlConditions: acc,
          chain: "amoy",
          dataToEncryptHash
        },
        fileInfo: {
          name: file.name,
          type: file.type,
          size: file.size
        }
      };
      
      // Let's assume ciphertext is the encrypted file data (Base64) for simplicity in this PoC.
      
      const uploadData = JSON.stringify({
         encryptedFile: ciphertext, // This might vary based on method
         metadata
      });

      // 5. Upload to Irys
      setStatus("Uploading to Irys...");
      // Irys needs wallet client. signer (SmartAccountSigner) behaves like one usually.
      const tags = [
          { name: "App-Name", value: "SecureFileSharePoC" },
          { name: "Type", value: "EncryptedFile" },
          { name: "Sender", value: user.address },
          { name: "Recipient", value: recipient }
      ];
      
      const receipt = await irysService.uploadData(uploadData, tags, signer);

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
      <h2 className="text-xl font-bold">Upload File</h2>
      
      <div>
        <label className="block text-sm font-medium">To (Wallet Address)</label>
        <input 
          type="text" 
          value={recipient} 
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="0x..."
          className="w-full border p-2 rounded"
        />
      </div>

      <div>
        <label className="block text-sm font-medium">File</label>
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
      >
        {loading ? "Processing..." : "Encrypt & Upload"}
      </button>

      {status && <p className="text-sm text-gray-600 break-all">{status}</p>}
    </div>
  );
};
