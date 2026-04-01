// agent.js （2026年4月時点 おすすめ改善版）
const { spawnSync } = require('child_process');
const axios = require('axios');

const tools = {
    searchFiles: (query) => {
        if (typeof query !== 'string' || !query.trim()) {
            console.log(`[Tool] 無効なクエリのためスキップ: "${query}"`);
            return "検索キーワードが無効です。";
        }

        console.log(`[Tool] 検索実行: "${query}"`);

        const safePath = "C:\\Users\\Public";
        const args = [
            '-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command',
            `Get-ChildItem -Path "${safePath}" -Filter "*${query.replace(/"/g, '""') }*" -Recurse -ErrorAction SilentlyContinue | Select-Object -ExpandProperty FullName`
        ];

        try {
            const result = spawnSync('powershell', args, { encoding: 'utf-8', timeout: 15000 });
            const output = result.stdout ? result.stdout.trim() : '';
            return output ? output.split('\n').filter(Boolean) : "該当するファイルは見つかりませんでした。";
        } catch (err) {
            console.error('[searchFiles Error]', err.message);
            return "検索中にエラーが発生しました。";
        }
    },

    openItem: (path) => {
        if (typeof path !== 'string' || !path.trim()) return "パスが無効です。";

        const trimmed = path.trim();
        if (!trimmed.toLowerCase().startsWith('c:\\users\\public\\')) {
            return "セキュリティ制限により開けません。";
        }

        console.log(`[Tool] 開く実行: "${trimmed}"`);
        try {
            spawnSync('powershell', ['-Command', `Start-Process '${trimmed.replace(/'/g, "''")}'`], { encoding: 'utf-8', timeout: 8000 });
            return `✅ ${trimmed} を開きました。`;
        } catch (err) {
            console.error('[openItem Error]', err.message);
            return "開くことに失敗しました。";
        }
    }
};

const toolDefinitions = [
    {
        type: "function",
        function: {
            name: "searchFiles",
            description: "ユーザーが明確に『ファイルを探して』『検索して』『見つけて』と言った場合のみ使用してください。C:\\Users\\Public内を検索します。",
            parameters: {
                type: "object",
                properties: {
                    query: { type: "string", description: "検索したいキーワード（例: ネットワーク, 構成図, 設計書）" }
                },
                required: ["query"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "openItem",
            description: "ユーザーが『開いて』と言った場合に使用。searchFilesで得たフルパスを指定してください。",
            parameters: {
                type: "object",
                properties: {
                    path: { type: "string", description: "開くファイルの完全なフルパス" }
                },
                required: ["path"]
            }
        }
    }
];

async function runAgent(userInput) {
    console.log(`\n=== ユーザー入力: ${userInput} ===\n`);

    const systemPrompt = `あなたは社内SEの優秀な助手です。
利用可能なツールは searchFiles と openItem の2つだけです。

【厳格ルール】
- 挨拶、一般質問、雑談の場合はツールを一切使わず、普通に返事してください。
- ユーザーが「探して」「検索して」「見つけて」「ファイルを探して」などと言った場合のみ searchFiles ツールを使います。
- ツールを使う必要がない場合は、ツールを呼ばずに直接回答してください。

ツールが必要なときだけ、正確に tool_calls を使ってください。`;

    let messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userInput }
    ];

    const maxSteps = 5;

    for (let step = 0; step < maxSteps; step++) {
        const response = await axios.post('http://localhost:11434/api/chat', {
            model: 'llama3.1',
            messages: messages,
            tools: toolDefinitions,
            stream: false,
            options: { temperature: 0.1, num_ctx: 8192 }   // 温度をさらに低く
        });

        const aiMessage = response.data.message;

        if (aiMessage.tool_calls && aiMessage.tool_calls.length > 0) {
            const toolCall = aiMessage.tool_calls[0];
            const functionName = toolCall.function.name;
            let args = {};

            try {
                args = JSON.parse(toolCall.function.arguments || '{}');
            } catch (e) {
                console.log(`引数パース失敗: ${toolCall.function.arguments}`);
            }

            console.log(`→ ツール呼び出し: ${functionName}(${JSON.stringify(args)})`);

            // 引数が空っぽの場合はツール実行をスキップして再判断させる
            if ((functionName === 'searchFiles' && !args.query) || 
                (functionName === 'openItem' && !args.path)) {
                console.log(`[Guard] 引数が空のためツール実行をスキップ`);
                messages.push({ role: "assistant", content: aiMessage.content || null, tool_calls: aiMessage.tool_calls });
                messages.push({ role: "tool", content: "引数が不足しています。ツールを使わずに回答してください。", tool_call_id: toolCall.id || Date.now() });
                continue;
            }

            let toolResult = "ツール実行エラー";
            if (functionName === 'searchFiles') toolResult = tools.searchFiles(args.query);
            else if (functionName === 'openItem') toolResult = tools.openItem(args.path);

            messages.push({ role: "assistant", content: aiMessage.content || null, tool_calls: aiMessage.tool_calls });
            messages.push({ 
                role: "tool", 
                content: Array.isArray(toolResult) ? toolResult.join('\n') : String(toolResult),
                tool_call_id: toolCall.id || `call_${Date.now()}`
            });

            console.log(`← ツール結果受信`);
            continue;
        }

        // 最終回答
        console.log(`\n=== 最終回答 ===\n${aiMessage.content || '(回答なし)'}`);
        return;
    }
}

if (require.main === module) {
    const input = process.argv[2] || "こんにちは";
    runAgent(input).catch(err => console.error("エラー:", err.message));
}