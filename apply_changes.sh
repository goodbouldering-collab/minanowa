#!/bin/bash
cd /home/user/webapp

# 1. セクションのpaddingをコンパクトに（80px → 40px, 60px → 30px）
sed -i 's/padding: 80px 0/padding: 40px 0/g' style.css
sed -i 's/padding: 60px 0/padding: 30px 0/g' style.css
sed -i 's/padding: 100px 0/padding: 50px 0/g' style.css

# 2. すべてのtransitionを削除（アニメーション無効化）
sed -i 's/transition: [^;]*;/transition: none;/g' style.css

# 3. カルーセルナビゲーション（矢印）を非表示
sed -i '/\.carousel-nav/,/^}/s/display: flex/display: none/' style.css
sed -i '/\.event-carousel-nav/,/^}/s/display: flex/display: none/' style.css

# 4. カードのhover transformを削除
sed -i '/hover.*{/,/}/s/transform: [^;]*;/\/\* transform removed \*\//g' style.css

# 5. スクロール動作を削除
sed -i 's/scroll-behavior: smooth/scroll-behavior: auto/g' style.css

echo "✅ CSS changes applied"
