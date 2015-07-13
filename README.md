# pPoker

**This app is still under development and is not ready yet**

pPoker is an application for scrum teams to use for playing Planning Poker.  It is primarily intended for the situation where not all the team members are physically in the same location and the meeting is being conducted electronically.  It can still be used if you are all in the same location, but in that case you might be better off with old-fashioned playing cards!  

pPoker is optimised for integration to [Jira] although it can be used without Jira too.

Multiple meetings can be hosted simultaneously, so multiple teams can use the app.  However, each server can integrate against only one Jira installation.

## Why Develop An App for Planning Poker
### Background
I have found the Planning Poker structure to be useful.  In particular the fact that it forces all team members to participate in the estimation process without being influenced by others estimates.  Benefits I have found include:

  * Team members less experienced in that area are forced to ask questions, which forces the more experienced team members/project manager to better explain the task.  This can often lead to new approaches and/or the discovery of deficiencies in the specification earlier.
  * Different approaches and/or assumptions are exposed, especially when people newer to the area come with very different estimates: sometimes they have missed something, sometimes they have a new and better way to solve the problem.
  * All team members become more engaged in, and feel more ownership over, the project as they have been an active part of it earlier.

I am now working in a team whose members are not all based in the same location (or even country!).  In addition, many team members are relatively new to the company.  We hold our planning/estimation meetings via video conferencing.  This works well for discussion but less well for estimation.  Trying to do estimation orally (whether in the same room or not) usually results in the same one or two people giving an estimate and everyone else agreeing with them.  Forcing go-rounds or simultaneous bids via text chat is somewhat clumsy.

So, I decided to write an app. Also, I wanted to try out some technologies I hadn't used much before :)

### Goals
This app has been designed with the following goals in mind:
  * Unobtrusive
  * Easy to use
  * Mimic the physical Planning Poker process fairly closely, in particular to get the benefits listed above

As such, the app shows who has bid in real time without showing what they have bid until everyone has done so.  It does allow people to change their bid after the cards have been displayed as you sometimes do during the discussion decide that you were wrong.

The app is built as a web-app although I plan to package it as a mobile app, probably using [Apache Cordova].  It should be usable on either a computer or smart phone.  Thus a developer who is on their own computer in the video meeting would probably use that computer, while a group in a conference room on a shared connection to the video meeting might each use their own phone.

### What it Doesn't do
This is a Planning Poker app, not a full planning app.  It has no persistent storage and only handles one issue at once.

It is *not* a meeting app.  There is no chat or audio/video communication built-in: it is intended to be a complement to your existing video conferencing solution of choice, not a replacement for it.  It does display some info about the issue, with a link to more, but you may well wish to have the issue displayed on a shared screen anyway.


## How it Works
### Basic Structure
The app consists of two parts. a client which each players runs and a server.  The client is built using HTML and JavaScript and can be run with a web browser while the server is built using node.js.  Communication between them is via websockets, so it is a real-time update.

### How to Play
Each player logs in, either as an authenticated user (using their Jira login) or as a guest (in which case they just supply a screen name).  They then have the option to create a meeting or join an existing one.

The player who creates the meeting is called the host for the meeting.  This is the only person who can:
  * Set/change which issue is being discussed
  * Show the cards

The host sets an issue, at which point details of the issue are displayed to all players in that meeting.  Each then chooses a card ("makes a bid").  As each player bids the fact they they have bid is indicated to the other players.  Once all have bid, the host can then reveal the bids by clicking "Show Cards".  At this point everyone can see the bids made and you discuss why people bid as they did until you reach consensus on the estimate.  The host can then set a new issue and the whole process repeats as often as you want.

## Jira Integration
While the app can be used without a Jira integration it is primarily designed/optimised for use with Jira.  In particular:
  * All authentication is via Jira, so without a Jira connection everyone must play as guests
  * Guests can only set basic info on the issue, whereas more information is presented on Jira issues

Note that while authentication is via Jira that only applies to that user.  If the host is authenticated then Guests will still be able to see details of the issue fetched from Jira.

## Installation
### System Requirements
#### Server
  * node
  * npm

On the server side, a server with nodejs and npm installed is all that is required.  I have only tested on a linux server, but see no reason why the platform should matter.

#### Client
  * Any web browser which supports websockets

On the client side for the end user, any web browser with support for websockets should work.  I am not overly concerned with legacy browsers for this project so no fallback solutions have been included for old browsers which do not support websockets.

#### Building/Hosting the Client
  * node
  * npm
  * grunt
  * Any webserver (if you want to host the client as a web app)

However, in order to build the client application you will require a machine with node.js, npm and grunt installed.  To host the client app you will need a web server (any web server).

#### Jira integration
  * Jira

For the Jira integration, you need your own Jira installation (surprisingly enough!).  The communication uses the Jira Rest API and Basic Auth so they must both be enabled and the Jira installation must be reachable *from the node server*.

### Get the Code
You can fetch the code yourself from <https://github.com/slarti-b/ppoker/> or using git as

	git clone https://github.com/slarti-b/ppoker/

The code is divided into two folders: client and server

### Server
In the `server` folder there is a file called `settings.js.dist`.  You should rename this file to simply `settings.js` and edit it to reflect your settings:
  * `host` and `port` refer to the host and port on which the node server should listen for websocket connections
  * `jira_protocol` (should be either "http" or "https"), `jira domain` and `jira_path` refer to your jira installation.
  * `debug` is a boolean parameter and affects how much logging is performed
  * `allow_guest` is a boolean parameter which determines if guest players are allowed or if everyone has to log in

Once that is done you can start the server by simply running (in the `server` folder)

	npm install
	node poker.js

### Client
In the `client/js` folder there is a file called `options.js.dist`.  This should be renamed to just `options.js`and edited:
  * the `websocket/uri` specifies the URI to the node.js server you configured above
  * the `websocket/enqueue` is a boolean parameter.  If true the the client will enqueue any requests it cannot send and send them once the websocket connection is reestablished.  If false it will discard any such requests.
  * the `debug` parameter is a boolean parameter which controls how much is written to the console while running.  In addition to the usual `true` or `false` values a special value `// @@is_dev` can be given.  This is set by the `grunt build` command to `false` (or `true` when running in development mode).

You should then (in the `client` folder) run the following commands

	npm install
	grunt build

This will build the client app to the `client/dist` folder.  You can then simply copy the contents of this folder to a web server and your users need simply to open that page.  Alternatively place the folder on a network share or similar and get them to open the `index.html` there with a web browser.

### Development
Running in development mode is essentially the same as above.  The only difference being that for the client instead of `grunt build` you simply run `grunt` to run the grunt dev task.

The differences between the build and dev modes for the client are:
  * In dev mode, the grunt task does not end, it continues to watch the files and rebuild the application as they are changed.  With the exception of scss changes (see below) you will need to reload the application to see changes
  * In dev mode a livereload server is used, so scss changes have immediate effect
  * The magic `// @@is_dev` parameter is set to true in dev mode and false in build mode.  So more logging in dev mode.
  * The build mode produces more compact and less readable files.
  * The dev mode produces map files for the css

## Planned Development
  * Build as a mobile app
  * Add the option to save the estimate back to Jira
  * Add messaging: "Foo has left the meeting", "Bar has bid", etc.
  * Add the option to automatically show cards once everyone has bid

[Jira]: https://www.atlassian.com/software/jira
[Apache Cordova]: http://cordova.apache.org/
