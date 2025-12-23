#!/bin/bash

# みんなのWA サーバー再起動スクリプト
# このスクリプトは表示問題が発生した際に実行してください

echo "🔄 みんなのWA サーバー再起動中..."

# 既存のサーバープロセスを停止
pkill -f "node server.js" 2>/dev/null
sleep 2

# 作業ディレクトリに移動
cd /home/user/webapp

# サーバーをバックグラウンドで起動
nohup node server.js > server.log 2>&1 &
sleep 3

# サーバー起動確認
if ps aux | grep "node server.js" | grep -v grep > /dev/null; then
    echo "✅ サーバー起動成功"
    echo ""
    echo "📊 サーバー情報:"
    tail -10 server.log
    echo ""
    echo "🌐 アクセスURL:"
    echo "https://3000-i26mzzri6plazftdqznnd-de59bda9.sandbox.novita.ai"
else
    echo "❌ サーバー起動失敗"
    echo "ログを確認してください: cat /home/user/webapp/server.log"
    exit 1
fi
