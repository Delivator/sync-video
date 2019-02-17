# Setup

## Requirements
- [Node.js](https://nodejs.org/), tested with 10.15.1 LTS

## Installation
1. Clone this repository to your machine with `git clone https://github.com/Delivator/sync-video.git` or download and unpack the repo from [here](https://github.com/Delivator/sync-video/archive/master.zip)
2. Navigate to the new created folder with `cd sync-video`
3. Install dependencies with `npm install`
4. Create a project in the [firebase console](https://console.firebase.google.com/) and copy the firebase web config ([Getting started with firebase web](https://firebase.google.com/docs/web/setup))
5. Copy the example firebase.js file from `public/js/firebase_example.js` to `public/js/firebase.js` and fill it with your config from the firebase console
6. start the server with `npm start`