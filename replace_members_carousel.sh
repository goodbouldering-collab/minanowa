#!/bin/bash

# Build new HTML
head -334 index.html > index_new.html
cat members_carousel.html >> index_new.html
tail -n +405 index.html >> index_new.html

# Replace
mv index_new.html index.html
rm -f members_carousel.html

echo "✅ Members carousel section replaced"
