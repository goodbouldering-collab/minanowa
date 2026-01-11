#!/bin/bash

# Replace members section HTML
head -499 index.html > index_new.html
cat members_unified.html >> index_new.html
tail -n +585 index.html >> index_new.html
mv index_new.html index.html

# Replace CSS
head -12721 style.css > style_new.css
cat members_event_unified.css >> style_new.css
tail -n +13267 style.css >> style_new.css
mv style_new.css style.css

# Append JS
cat members_unified.js >> script.js

# Cleanup
rm members_unified.html members_event_unified.css members_unified.js

echo "✅ Members and events unified"
