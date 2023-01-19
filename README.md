# Nightlight

## Script for the Nightlight web page, uses under the hood is _[Three.js](https://github.com/mrdoob/three.js)_, a JavaScript library used to create and display animated 3D computer graphics.  

### Installation and use
You can install the script by cloning/downloading this repository and running:

    npm install
    npm run serve

It is also possible to pull the image from the docker hub `docker pull alekstar79/nightlight` and run `docker run -d -p 80:80 --rm --name nightlight alekstar79/nightlight`.
For ease of use, a Makefile has been created with short commands [ pull, run, stop ].

![Visualization of the script](src/assets/nightlight.gif "Nightlight")
