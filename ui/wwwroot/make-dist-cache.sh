#!/bin/bash
if [ ! -d dist ] 
then
    mkdir dist
fi
cp -r src/lifepo4 dist/lifepo4
cp -r src/n2k dist/n2k
cp -r src/navtex dist/navtex
rm -rf dist/lifepo4/node_modules dist/n2k/node_modules dist/navtex/node_modules
cd dist
# macOS tar may add unwanted metadata and SCHILY flags.
#tar --no-mac-metadata --no-xattrs  -c -z -f ../dist-cache.tgz navtex/cache
gtar  --no-xattrs  -c -z -f ../dist-cache.tgz navtex/cache
