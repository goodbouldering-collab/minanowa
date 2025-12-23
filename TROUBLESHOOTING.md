# みんなのWA トラブルシューティングガイド

## 🚨 表示されない・動作しない場合の対処法

### 問題の種類

#### 1. **サイトが表示されない**
**原因**: サーバーが停止している可能性

**対処法**:
```bash
# サーバー再起動スクリプトを実行
cd /home/user/webapp
./restart_server.sh
```

#### 2. **古い内容が表示される**
**原因**: ブラウザキャッシュ

**対処法**:
- **Windows/Linux**: `Ctrl + Shift + R`
- **Mac**: `Cmd + Shift + R`

#### 3. **変更が反映されない**
**原因**: サーバーの再起動が必要

**対処法**:
```bash
# サーバー再起動
cd /home/user/webapp
./restart_server.sh
```

---

## 🔧 手動での対処方法

### サーバー状態確認
```bash
# サーバーが起動しているか確認
ps aux | grep "node server.js" | grep -v grep

# サーバーログ確認
cd /home/user/webapp
tail -50 server.log
```

### サーバー手動再起動
```bash
# サーバー停止
pkill -f "node server.js"

# 作業ディレクトリに移動
cd /home/user/webapp

# サーバー起動（バックグラウンド）
nohup node server.js > server.log 2>&1 &

# 起動確認（3秒待機後）
sleep 3 && ps aux | grep "node server.js" | grep -v grep
```

### データベース確認
```bash
# data.json の内容確認
cd /home/user/webapp
cat data.json | jq '.'

# イベント数確認
cat data.json | jq '.events | length'

# メンバー数確認
cat data.json | jq '.members | length'
```

---

## 📋 定期メンテナンス

### 推奨される定期作業

#### 1. **週1回: サーバー再起動**
```bash
cd /home/user/webapp
./restart_server.sh
```

#### 2. **週1回: バックアップ作成**
```bash
cd /home/user/webapp
tar -czf /home/user/minanowa_backup_$(date +%Y%m%d).tar.gz .
```

#### 3. **月1回: ログファイルクリア**
```bash
cd /home/user/webapp
> server.log  # ログをクリア
./restart_server.sh  # サーバー再起動
```

---

## 🌐 URLの確認方法

### 現在のアクセスURL
```
https://3000-i26mzzri6plazftdqznnd-de59bda9.sandbox.novita.ai
```

### URL確認コマンド
```bash
# SITE_ACCESS.md を確認
cat /home/user/webapp/SITE_ACCESS.md | grep "URL:"

# PROJECT_INFO.md を確認
cat /home/user/webapp/PROJECT_INFO.md | grep "本番URL"
```

---

## ⚠️ よくある問題と解決策

### 問題1: 「接続できません」エラー
**原因**: サーバーが停止
**解決策**: `./restart_server.sh` を実行

### 問題2: イベントが表示されない
**原因**: JavaScriptエラーまたはデータ読み込み失敗
**解決策**: 
1. ブラウザのキャッシュクリア
2. サーバー再起動
3. ブラウザのコンソールでエラー確認

### 問題3: 管理画面にログインできない
**原因**: セッション切れ
**解決策**: 
1. ブラウザのキャッシュクリア
2. 再度ログイン（admin@minanowa.com / password123）

### 問題4: 変更したのに反映されない
**原因**: サーバー再起動が必要
**解決策**: 
1. ファイル変更後、必ず `./restart_server.sh` を実行
2. ブラウザのキャッシュクリア

---

## 📞 サポート情報

### 緊急時の対応手順
1. `./restart_server.sh` を実行
2. ブラウザのハードリフレッシュ
3. それでも解決しない場合は、バックアップから復元

### バックアップからの復元
```bash
# 最新のバックアップを確認
ls -lth /home/user/*.tar.gz | head -5

# バックアップから復元（例）
cd /home/user
tar -xzf minanowa_backup_20251218.tar.gz -C webapp_restored
cd webapp_restored
node server.js
```

---

## 🔍 デバッグ方法

### サーバーログのリアルタイム監視
```bash
cd /home/user/webapp
tail -f server.log
```

### ネットワーク接続確認
```bash
curl http://localhost:3000
```

### ポート確認
```bash
netstat -tuln | grep 3000
```

---

## 📝 問題報告テンプレート

問題が解決しない場合、以下の情報を記録してください：

```
【問題の概要】
- 何が表示されない/動作しないか:

【発生時刻】
- いつから発生したか:

【実施した対処】
- 試したこと:

【サーバー状態】
# 以下のコマンド結果を添付
ps aux | grep "node server.js"
tail -50 /home/user/webapp/server.log

【エラーメッセージ】
- ブラウザのコンソールエラー:
```

---

## ✅ 正常動作の確認方法

以下を全て確認できれば正常動作しています：

1. ✅ サーバープロセスが起動している
2. ✅ https://3000-i26mzzri6plazftdqznnd-de59bda9.sandbox.novita.ai にアクセスできる
3. ✅ トップページが表示される
4. ✅ イベント一覧が表示される
5. ✅ 管理画面にログインできる

