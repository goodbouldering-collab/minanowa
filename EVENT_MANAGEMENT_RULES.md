# イベント管理ルール

## 📋 重要なルール

### ⚠️ 必須：イベントは常に日付順（昇順）で管理

イベントを追加・編集する際は、**必ず日付順（古い日付から新しい日付）**に並べること。

### 現在のイベント（日付順）

1. **第22回 みんなのWA 彦根 異業種交流会**
   - 日付: 2025-12-03
   - ステータス: completed（完了）

2. **第1回 みんなのWA 長浜交流会**
   - 日付: 2025-12-23
   - ステータス: upcoming（予定）
   - 場所: シェアハウスtorch
   - 参加費: 500円（材料費）+ 一品持ち込み
   - 締切: 12/10(水)

3. **第23回 みんなのWA 彦根 異業種交流会**
   - 日付: 2026-01-07
   - ステータス: upcoming（予定）

## 🔧 イベント追加方法

### 手順

1. **新規イベントデータ作成**
   - イベントIDは `event-YYYYMMDD` 形式
   - 必須フィールド: id, title, date, time, location, status など

2. **日付順に挿入**
   ```bash
   jq '.events = (.events + [input] | sort_by(.date))' data.json new_event.json > data_temp.json
   mv data_temp.json data.json
   ```

3. **確認**
   ```bash
   jq -r '.events[] | "\(.date) - \(.title) (\(.status))"' data.json
   ```

4. **サーバー再起動**
   - 変更を反映させるためにサーバーを再起動

## 📝 イベントデータ構造

```json
{
  "id": "event-YYYYMMDD",
  "title": "イベント名",
  "date": "YYYY-MM-DD",
  "time": "HH:MM〜HH:MM",
  "location": "開催場所",
  "locationUrl": "GoogleマップURL（任意）",
  "description": "説明文",
  "capacity": 定員数,
  "attendees": [],
  "fee": "参加費",
  "feeDetails": "参加費詳細",
  "cashback": "キャッシュバック情報",
  "freeEntry": "無料参加条件",
  "status": "upcoming|completed|cancelled",
  "image": "画像URL",
  "formUrl": "応募フォームURL",
  "notes": "備考",
  "timetable": [
    {
      "time": "HH:MM",
      "activity": "活動内容"
    }
  ],
  "createdAt": "作成日時（ISO 8601形式）"
}
```

## 🎯 ステータス管理

- **upcoming**: 今後開催予定のイベント
- **completed**: 終了したイベント
- **cancelled**: キャンセルされたイベント

## 📅 日付順管理の重要性

イベントを日付順に管理することで：
- ✅ ユーザーが時系列で確認しやすい
- ✅ 次回イベントの特定が容易
- ✅ APIレスポンスの一貫性を保持
- ✅ カレンダー表示が正確

## 🔄 定期作業

### イベント終了後
1. イベントのステータスを `completed` に変更
2. 参加者数を記録（任意）
3. イベントレポートを作成（任意）

### 新規イベント追加時
1. イベント情報を確認
2. 日付順に挿入
3. サーバー再起動
4. ブラウザで表示確認

---

**最終更新**: 2025-12-14
**管理者**: みんなのWA運営チーム
