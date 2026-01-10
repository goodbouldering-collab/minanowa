#!/bin/bash

# Build new HTML
head -165 index.html > index_new.html
cat about_interactive.html >> index_new.html
tail -n +211 index.html >> index_new.html

# Replace
mv index_new.html index.html
rm -f about_interactive.html

echo "✅ About interactive section replaced"
