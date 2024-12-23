# On device UI

Basic UI for the BMs minimizing dependencies as there is limited flash available on the device. Although it is configured to be a PWA, at the moment it wont install on as a PWA service since that would require a large image which is a waste of flash. Most of the code is shared with the lifepo4 PWA, however D3JS has been optimised and the ui is reactive so it works on Android and can be installed on a home screen for quickaccess.


# Install into Flash

Where possible the files are gzipped, as the Azyng web server code supports serving from flash gzipped without decompression.

     ./initialiseFlash.sh

This will rebuild the disk image for flash and upload it over serial using pio.

    ./redeployUI.sh

This will process and upload the UI files over http without resetting the flash.


<div>
<img alt="UI" src="screenshots/Screenshot 2024-12-23 at 18.08.49.png" />
</div>

