#!/bin/bash

# Create backup
cp style.css style_backup_pre_carousel_fix.css

# Build new CSS
head -12720 style.css > style_new.css
cat member_carousel_fix.css >> style_new.css
tail -n +13185 style.css >> style_new.css

# Replace
mv style_new.css style.css
rm member_carousel_fix.css

echo "✅ Member carousel CSS fixed"
