#!/bin/bash

# Build new CSS
head -12894 style.css > style_new.css
cat about_mobile_optimized.css >> style_new.css
tail -n +13550 style.css >> style_new.css

# Replace
mv style_new.css style.css
rm about_mobile_optimized.css

echo "✅ About section optimized for mobile"
