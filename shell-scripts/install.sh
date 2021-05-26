#!/bin/bash
sudo npm audit fix
sudo npm install
cd ./client/
sudo npm audit fix
sudo npm install
sudo npm run build
cd ../
