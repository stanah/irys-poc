"use client";

import { useState, useEffect } from "react";
import { useWalletContext } from "@/contexts/WalletContext";
import { irysService } from "@/lib/irys";
import { litService } from "@/lib/lit";

interface FileItem {
  id: string;
  sender: string;
  timestamp: number;
}

export const FileList = () => {
  const { address, walletClient } = useWalletContext();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchFiles = async () => {
    if (!address) return;
    setLoading(true);
    setError("");

    try {
      const edges = await irysService.queryFiles(address);
      const items: FileItem[] = edges.map((edge: any) => {
        const tags = edge.node.tags;
        const sender =
          tags.find((t: any) => t.name === "Sender")?.value || "Unknown";
        return {
          id: edge.node.id,
          sender,
          timestamp: edge.node.timestamp,
        };
      });
      setFiles(items);
    } catch (e: any) {
      console.error(e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (address) {
      fetchFiles();
    }
  }, [address]);

  const handleDecrypt = async (fileId: string) => {
    if (!address || !walletClient) return;

    try {
      // 1. Fetch data from Irys
      const response = await fetch(`https://devnet.irys.xyz/${fileId}`);
      const data = await response.json();
      const { encryptedFile, metadata } = data;

      // 2. Get AuthSig
      const authSig = await litService.getAuthSig(address, walletClient);

      // 3. Decrypt
      const decryptedBytes = await litService.decryptFile(
        encryptedFile,
        metadata.lit.dataToEncryptHash,
        metadata.lit.accessControlConditions,
        authSig
      );

      // 4. Download
      const blob = new Blob([decryptedBytes as any], {
        type: metadata.fileInfo.type,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = metadata.fileInfo.name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      console.error(e);
      alert(`Decryption failed: ${e.message}`);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 border rounded shadow-sm bg-white w-full max-w-md">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold" style={{ color: "#111827" }}>
          Received Files
        </h2>
        <button
          onClick={fetchFiles}
          disabled={loading}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          {loading ? "Loading..." : "🔄 Refresh"}
        </button>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {files.length === 0 ? (
        <p className="text-gray-400 text-sm">No files received yet.</p>
      ) : (
        <ul className="space-y-2">
          {files.map((file) => (
            <li
              key={file.id}
              className="flex justify-between items-center p-2 bg-gray-50 rounded"
            >
              <div className="text-sm">
                <p
                  className="font-mono text-xs truncate max-w-[120px]"
                  title={file.id}
                  style={{ color: "#374151" }}
                >
                  {file.id}
                </p>
                <p className="text-gray-400 text-xs">From: {file.sender.slice(0, 10)}...</p>
              </div>
              <button
                onClick={() => handleDecrypt(file.id)}
                className="text-sm px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                style={{ backgroundColor: "#3b82f6" }}
              >
                Decrypt
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
