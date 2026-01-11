#!/bin/bash

# Build new HTML
head -494 index.html > index_new.html
cat members_section_fixed.html >> index_new.html
tail -n +580 index.html >> index_new.html

# Replace
mv index_new.html index.html
rm members_section_fixed.html

echo "✅ Members section replaced with fixed version"
