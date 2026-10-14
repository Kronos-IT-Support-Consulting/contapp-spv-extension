#!/usr/bin/env bash
# Writes dist/chrome and dist/firefox from the same sources and zips each one.
# Firefox MV3 wants background.scripts, and AMO rejects new add-ons without data_collection_permissions.
set -euo pipefail
cd "$(dirname "$0")"

version=$(jq -r '.version' manifest.json)

rm -rf dist
for target in chrome firefox; do
    mkdir -p "dist/$target"
    cp -R background.js content.js icons "dist/$target/"
done

# Release builds only run on production hosts; the local contapp.test entries stay in the source manifest for development.
production='.content_scripts[].matches |= map(select(test("\\.test/") | not))'

jq "$production | del(.browser_specific_settings)" manifest.json > dist/chrome/manifest.json
jq "$production | .background = {scripts: [\"background.js\"]}
    | .browser_specific_settings.gecko.data_collection_permissions = {required: [\"none\"]}" \
    manifest.json > dist/firefox/manifest.json

for target in chrome firefox; do
    archive="dist/contapp-spv-$target-$version.zip"
    (cd "dist/$target" && zip -qrX "../$(basename "$archive")" . -x '.DS_Store' '*/.DS_Store')
    echo "$archive"
done
