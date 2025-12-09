Irys、Lit Protocol、Alchemy Account Kit (AA) を組み合わせた、シンプルかつ堅牢なファイル共有PoC（概念実証）の全体計画を提案します。

この構成は、「**Alchemyで認証し、Litで鍵をかけ、Irysに永続保存する**」という役割分担になります。

-----

## 1\. システム構成図 (Architecture)

サーバーレスな構成を目指します。メタデータ管理のためのDBは使わず、Irys（Arweave）上のタグ機能をDB代わりに利用してシンプルにします。

  * **Frontend:** Next.js (React)
  * **Authentication:** Alchemy Account Kit (Smart Account)
  * **Encryption/Access Control:** Lit Protocol
  * **Storage:** Irys (Arweaveへのアップローダー)

### 役割分担

1.  **Alchemy Account Kit:**
      * ユーザーのログイン（メール、パスキー等）。
      * ウォレットアドレス（Smart Account）の提供。
      * Lit/Irysへの署名プロバイダー。
2.  **Lit Protocol:**
      * ファイルの暗号化（クライアントサイド）。
      * アクセスコントロール条件（ACC）の設定（「受信者のアドレスが `0xABC...` であること」）。
      * 復号のための鍵管理。
3.  **Irys:**
      * 暗号化されたファイル本体の保存。
      * メタデータ（Litの復号パラメータなど）の保存。

-----

## 2\. ユーザーフロー (User Flow)

### A. 送信者 (Uploader)

1.  **ログイン:** Alchemy Account Kitでログイン。
2.  **ファイル選択:** アップロードしたいファイルを選択。
3.  **受信者指定:** 共有したい相手のウォレットアドレスを入力。
4.  **暗号化 (Lit):**
      * Lit SDKを使用し、ファイルをブラウザ上で暗号化。
      * アクセスコントロール条件 (ACC) を設定：「閲覧者のアドレス == 指定した受信者アドレス OR 送信者アドレス」。
5.  **アップロード (Irys):**
      * 「暗号化されたファイル」と「Litの復号用メタデータ（Ciphertext, Hash等）」をまとめてIrysにアップロード。
      * この際、Irysのタグ機能で `App-Name: MySharePoC`, `Recipient: 0xReceiver...` などを付与（検索用）。

### B. 受信者 (Viewer)

1.  **ログイン:** Alchemy Account Kitでログイン。
2.  **一覧取得:** Irysから自分のアドレスが `Recipient` タグに含まれているデータを検索。
3.  **復号 (Lit):**
      * ファイルを選択し、Litノードに署名を送信。
      * Litノードがオンチェーンで「現在ログインしているユーザー == 指定された受信者」かを確認。
      * 条件一致なら復号キーがブラウザに返される。
4.  **閲覧:** ファイルを復号して表示/ダウンロード。

-----

## 3\. データモデル (Irys Metadata Structure)

IrysにアップロードするJSON、あるいはタグ構成です。シンプルにするため、ファイル本体とメタデータを1つのJSONにまとめてアップロードするか、Blobとして上げつつタグで管理します。今回は**JSON形式**での保存を推奨します。

**保存するJSONデータ構造:**

```json
{
  "encryptedFileBase64": "...",       // 暗号化されたファイルの中身
  "litMetadata": {
    "accessControlConditions": [...], // Litのアクセス制御条件
    "encryptedSymmetricKey": "...",   // Litによって暗号化された共通鍵
    "chain": "ethereum"
  },
  "fileInfo": {
    "name": "secret-doc.pdf",
    "mimeType": "application/pdf"
  }
}
```

**Irys Tags (検索用):**

  * `App-Name`: `SecureFileSharePoC`
  * `Type`: `EncryptedFile`
  * `Sender`: `0xSenderAddress...`
  * `Recipient`: `0xReceiverAddress...`

-----

## 4\. 開発ステップ (Step-by-Step Implementation)

PoCとして最短で動くものを作るためのステップです。

### Step 1: 環境構築とAlchemy認証 (Base Setup)

  * Next.jsプロジェクトの作成。
  * Alchemy Account Kitの導入 (`@account-kit/react` 等)。
  * ログインし、Smart Accountアドレスが表示できる状態にする。

### Step 2: Lit Protocol の暗号化実装 (Encryption)

  * Lit SDK (`@lit-protocol/lit-node-client`) の導入。
  * ハードコードした特定の文字列を、Litを使って暗号化・復号できるかテストする。
  * **重要:** AlchemyのSigner（EOAまたはSmart Account）をLitの認証（AuthSig）にどう渡すかを確認する（ここが技術的なハマりポイントになりやすいです）。

### Step 3: Irys へのアップロード実装 (Storage)

  * Irys SDK (`@irys/sdk`) の導入。
  * テスト用MATIC (Mumbai/Amoy) 等を用意。
  * Alchemyのウォレットを使ってIrysへデータをアップロードする処理を実装。

### Step 4: 統合 (Integration)

  * **送信画面:** ファイル入力 -\> Lit暗号化 -\> JSON構築 -\> Irysアップロード。
  * **受信画面:** Irysクエリ (GraphQL) -\> リスト表示 -\> Lit復号 -\> ダウンロード。

-----

## 5\. 技術的な懸念点と解決策 (Technical Hurdles)

PoC実装時に直面しやすい課題です。

1.  **Wallet Connectと署名の互換性:**

      * **課題:** Alchemy Account Kitはスマートコントラクトウォレット (ERC-4337) です。LitやIrysは通常、EOA (MetaMask等) の署名を期待します。
      * **対策:**
          * **Lit:** ERC-1271（スマートコントラクト署名検証）をサポートしています。認証時に署名タイプを確認する必要があります。
          * **Irys:** WebIrysを使用する場合、プロバイダーの注入が必要です。AlchemyのSignerがそのまま通らない場合は、`ethers` アダプターなどを噛ませる必要があります。

2.  **Irysのコスト:**

      * **課題:** アップロードにはトークンが必要です。
      * **対策:** PoCでは、IrysのDevnet（無料アップロードが可能、ただしデータは永続保証されない場合がある）を使用するか、Polygonなどの安価なチェーンを使用します。
