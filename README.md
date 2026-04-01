```markdown
# Ollama ローカルAIファイル検索エージェント

Windows上でOllama（llama3.1）を使って、社内SE助手としてファイル検索・開く操作をAIに行わせるシンプルなエージェントです。

## 完成イメージ
- 自然言語で「ネットワークの構成図を探して」と言えば、自動で `C:\Users\Public` 内を検索
- 見つかったファイルを「これを開いて」と言えば開く
- 挨拶などの一般会話ではツールを使わず普通に返事

## 動作環境

- Windows 10 / 11
- Node.js（v18以上推奨）
- Ollama（最新版）
- モデル：`llama3.1`（8B）

## セットアップ手順

### 1. Node.js のインストール
1. [https://nodejs.org/](https://nodejs.org/) から **LTS版** をダウンロード・インストール
2. インストール後、PowerShellを再起動
3. 確認：
   ```powershell
   node -v
   npm -v
   ```

### 2. Execution Policy の変更（npmが使えない場合）
```powershell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### 3. Ollama のインストールと起動
```powershell
# Ollamaインストール（初回のみ）
irm https://ollama.com/install.ps1 | iex

# 新しいPowerShellでサーバー起動（このウィンドウは閉じない）
ollama serve
```

### 4. モデルダウンロード（初回は時間がかかります）
```powershell
ollama pull llama3.1
```

### 5. プロジェクト作成と実行
```powershell
mkdir ollama-agent
cd ollama-agent
npm init -y
npm install axios
```

### 6. agent.js の作成
`ollama-agent` フォルダ内に `agent.js` という名前で以下のコードを保存してください。
[agent.js](https://github.com/Austriaeste/Ollama-AI-/blob/main/agent.js)

### 7. 実行例
```powershell
# サーバーが起動している状態で
PS C:\Users\austr\ollama-agent> node agent.js "こんにちは"

=== ユーザー入力: こんにちは ===


=== 最終回答 ===
こんにちはです。
PS C:\Users\austr\ollama-agent>
```

## 今後の改善予定

- より高精度なモデルへの対応（llama3.2 / qwen2.5など）
- LangChain.js を使った本格的なReActエージェント化
- 検索範囲の拡張（ユーザーが指定可能に）
- GUI版の作成
---
