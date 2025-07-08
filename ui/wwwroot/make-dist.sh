#!/bin/bash
rm -rf dist
mkdir dist
cp -r src/lifepo4 dist/lifepo4
cp -r src/n2k dist/n2k
cp -r src/navtex dist/navtex
rm -rf dist/lifepo4/node_modules dist/n2k/node_modules dist/navtex/node_modules
cd dist
tar czf ../dist.tgz .