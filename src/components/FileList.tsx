"use client";

import { useEffect, useState } from "react";
import { useUser, useSigner } from "@account-kit/react";
import { litService } from "@/lib/lit";
import { irysService } from "@/lib/irys";

export const FileList = () => {
  const user = useUser();
  const signer = useSigner();
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [decrypting, setDecrypting] = useState<string | null>(null);

  useEffect(() => {
    if (user?.address) {
      loadFiles();
    }
  }, [user?.address]);

  const loadFiles = async () => {
    if (!user?.address) return;
    setLoading(true);
    try {
      const edges = await irysService.queryFiles(user.address);
      setFiles(edges.map((e: any) => ({
        id: e.node.id,
        timestamp: e.node.timestamp,
        // Parse tags
        sender: e.node.tags.find((t: any) => t.name === "Sender")?.value,
        type: e.node.tags.find((t: any) => t.name === "Type")?.value,
      })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDecrypt = async (fileId: string) => {
    if (!user || !signer) return;
    setDecrypting(fileId);
    
    try {
      // 1. Fetch Data
      const response = await fetch(`https://gateway.irys.xyz/${fileId}`);
      const data = await response.json();
      
      const { encryptedFile, metadata } = data;
      const { accessControlConditions, dataToEncryptHash } = metadata.lit;

      // 2. Get AuthSig
      const authSig = await litService.getAuthSig(user.address, signer);

      // 3. Decrypt
      // Note: encryptedFile is assumed to be the ciphertext string (Base64)
      const decryptedBytes = await litService.decryptFile(
        encryptedFile,
        dataToEncryptHash,
        accessControlConditions,
        authSig
      );

      // 4. Download
      const blob = new Blob([decryptedBytes as any], { type: metadata.fileInfo.type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = metadata.fileInfo.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (e: any) {
      console.error(e);
      alert(`Decryption failed: ${e.message}`);
    } finally {
      setDecrypting(null);
    }
  };

  if (!user) return null;

  return (
    <div className="flex flex-col gap-4 p-4 border rounded shadow-sm bg-white w-full max-w-md">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Received Files</h2>
        <button onClick={loadFiles} className="text-sm text-blue-600 hover:underline">Refresh</button>
      </div>

      {loading && <p className="text-gray-500">Loading...</p>}

      <div className="flex flex-col gap-2">
        {files.length === 0 && !loading && <p className="text-gray-500 text-sm">No files found.</p>}
        {files.map((file) => (
          <div key={file.id} className="p-3 bg-gray-50 rounded border flex justify-between items-center">
            <div className="text-sm overflow-hidden">
                <p className="truncate">From: {file.sender}</p>
                <p className="text-xs text-gray-400">{new Date(file.timestamp).toLocaleString()}</p>
            </div>
            <button
              onClick={() => handleDecrypt(file.id)}
              disabled={!!decrypting}
              className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {decrypting === file.id ? "Decrypting..." : "Download"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
