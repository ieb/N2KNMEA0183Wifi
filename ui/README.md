# UIs

Originally where UIs were, now moved to separate repos see main README for details.

# einkweb

Is a minimal eink browser implementation targeting Generation 1 Kindle devices, but also works on modern browsers and Andriod.  Needs update to work on the latest streams. Don't use for the moment.

# wwwroot

A convenience for serving the UIs, adjust symbolic links in src to point to where they are cloned and run

    npmstart


# building a distribution

The distribution method is to create a zip of the content tree and serve locally on the device.
This allows installation and where there are significant number of cached files allows those to be served
locally.


    rm -rf dist
    mkdir dist
    cp -r src/lifepo4 dist/lifepo4
    cp -r src/n2k dist/n2k
    cp -r src/navtex dist/navtex
    rm -rf dist/lifepo4/node_modules dist/n2k/node_modules dist/navtex/node_modules
    cd dist
    tar cvzf ../dist.tgz .

    