#!/bin/bash

# Build new CSS
head -12721 style.css > style_new.css
cat members_section_fixed.css >> style_new.css
tail -n +12896 style.css >> style_new.css

# Replace
mv style_new.css style.css
rm members_section_fixed.css

echo "✅ Members CSS replaced with fixed version"
