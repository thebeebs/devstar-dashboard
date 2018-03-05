/**
 * Copyright (c) 2014, 2017, Oracle and/or its affiliates.
 * The Universal Permissive License (UPL), Version 1.0
 */

const reduce = Function.bind.call(Function.call, Array.prototype.reduce);
const isEnumerable = Function.bind.call(Function.call, Object.prototype.propertyIsEnumerable);
const concat = Function.bind.call(Function.call, Array.prototype.concat);
const keys = Reflect.ownKeys;
const ds = {};
const getDs = ( async () => {
    let result = await fetch('/backend');
    let data = await result.json();
    ds.baseUrl = `http://${data.backendBaseUrl}:3000`;
})();

if (!Object.values) {
  Object.values = function values(O) {
    return reduce(keys(O), (v, k) => concat(v, typeof k === 'string' && isEnumerable(O, k) ? [O[k]] : []), []);
  };
}

define(['knockout', 'ojs/ojcore', 'ojs/ojknockout', 'ojs/ojprogressbar',
  'ojs/ojinputnumber', 'animateText'],
        function (ko, oj) {

          function DashboardViewModel() {
            const self = this;

            // clock being used by the different components.
            const clock = new Clock();

            // The different components being tracked.
            self.highscoreSquads = ko.observableArray([]);
            self.squads = ko.observableArray([]);
            self.highscores = ko.observableArray([]);
            self.logs = ko.observableArray([]);
            self.deathstar = new Deathstar();
            self.spy = new Spy(0, 0, 300, 100);
            self.popupMessage = new PopupMessage();

            // tick tock
            function Clock() {
              const self = this;
              self.clock = ko.observable(new Date());
              self.tick = function () {
                self.clock(new Date().toISOString());
              };
              setInterval(self.tick, 1000);
            }
            ;

            function Deathstar() {
              const self = this;
              self.id = ko.observable();
              self.startHealth = ko.observable();
              self.currentHealth = ko.observable();
              self.state = ko.observable();
              self.startTime = ko.observable();
              self.endTime = ko.observable();
              self.timeLimit = ko.observable();
              self.deathStarId = ko.observable();
              self.gseDomains = ko.observable();
              self.gameId = ko.observable();
              self.deathstarId = ko.observable();

              self.timeLeft = ko.computed(() => timeSinceInMinutes(self.endTime(), clock.clock()));
            }
            ;

            function Squad(id, name, gameId, environment, username, score) {
              const self = this;
              self.id = ko.observable(id);
              self.name = ko.observable(name);
              self.gameId = ko.observable(gameId);
              self.environment = ko.observable(environment);
              self.username = ko.observable(username);
              self.score = ko.observable(score);

              self.microservices = ko.observableArray([]);

              self.updateMicroservices = async() => {
                try {
                  let response = await fetch(`${ds.baseUrl}/squads/${self.id()}/microservices`);
                  let microservices = await response.json();
                  microservices.forEach(ms => {
                    if (self.microservices().some(m => m.id() === ms.id)) {
                      var date = new Date(ms.modified);
                      var current = new Date();
                      var minutesSinceUpdate = Math.ceil(((current - date)/60000));
                      ms.modified = minutesSinceUpdate;
                      update(self.microservices().find(m => m.id() === ms.id), ms);
                    } else {
                      self.microservices.push(new Microservice(...Object.values(ms)));
                    }
                  });
                } catch (err) {
                  console.error(err);
                }
              };
            }
            ;

            function Microservice(squadId, microserviceId, id, name,
                    gameId, environment, created, modified, platform,
                    instances, status, userName, memory, version, score) {
              const self = this;
              self.squadId = ko.observable(squadId);
              self.microserviceId = ko.observable(microserviceId);
              self.id = ko.observable(id);
              self.name = ko.observable(name);
              self.gameId = ko.observable(gameId);
              self.environment = ko.observable(environment);
              self.created = ko.observable(created);
              var date = new Date(modified);
              var current = new Date();
              var minutesSinceUpdate = Math.ceil(((current - date)/60000));
              self.modified = ko.observable(minutesSinceUpdate);
              self.platform = ko.observable(platform);
              self.instances = ko.observable(instances);
              self.status = ko.observable(status);
              self.userName = ko.observable(userName);
              self.memory = ko.observable(memory);
              self.score = ko.observable(score || 0);
              self.version = ko.observable(version);
              self.platformimg = ko.computed(() => self.platform().toLowerCase());
            }
            ;

            function Log(id, time, gamesId, squadName, microserviceName,
                    score, damage, type) {
              const self = this;
              self.id = ko.observable(id);
              self.time = ko.observable(time);
              self.gamesId = ko.observable(gamesId);
              self.squadName = ko.observable(squadName);
              self.microserviceName = ko.observable(microserviceName);
              self.score = ko.observable(score);
              self.damage = ko.observable(damage);
              self.type = ko.observable(type);
              self.message = ko.observable();
            }
            ;

            function PopupMessage() {
              const self = this;
              self.show = ko.observable(false);
              self.message = ko.observable('');
              self.earlierMessages = [];

              self.showMessage = message => {
                if (self.earlierMessages.some(m => m === message.text))
                  return false;
                self.show(true);
                $('#new-message h3').html(message);

                $('#new-message h3').animate({
                  'fontSize': '36px'
                }, 10000, () => {
                  $('#new-message h3').removeAttr('style');
                  self.show(false);
                  self.earlierMessages.push(message.text);
                });
                return true;
              };
            }

            function Spy(x, y, width, height) {
              const self = this;
              self.x = ko.observable(`${x}px`);
              self.y = ko.observable(`${y}px`);
              self.width = ko.observable(`${width}px`);
              self.height = ko.observable(`${height}px`);
              self.visible = ko.observable(false);
              self.toggleVisibility = () => {
                let spyRect = document.getElementById('spy').getBoundingClientRect();
                let width = 380;
                let height = 200;
                let x = spyRect.left - (65 + width);
                let y = spyRect.top - height;
                self.width(`${width}px`);
                self.height(`${height}px`);
                self.x(`${x}px`);
                self.y(`${y}px`);

                self.visible(!self.visible());
              };

              var startMessages = [deployMissionMessage, scaleMissionMessage];

              self.messages = ko.observableArray(startMessages);
              self.selectedMessage = ko.observable(0);

              self.hasNext = ko.computed(() => self.selectedMessage() !== self.messages().length - 1);
              self.hasPrevious = ko.computed(() => self.selectedMessage() !== 0);

              self.next = () => {
                console.log(JSON.stringify(self.messages()));
                if (self.hasNext()) {
                  let next = self.selectedMessage() + 1;
                  self.selectedMessage(next);
                }
              };

              self.previous = () => {
                if (self.hasPrevious()) {
                  let prev = self.selectedMessage() - 1;
                  self.selectedMessage(prev);
                }
              };

            }
            ;

            const updateSpy = function () {
              if (self.deathstar.currentHealth() < 1) {
                if (self.popupMessage.showMessage(`Good job squads!<br/>
                                You have defeated the Alien War Ship!`)) {
                  new Audio('/sounds/explosion.mp3').play();
                }
              }
              switch (self.deathstar.state()) {
                case 'STARTED':
                  var messages = [deployMissionMessage, scaleMissionMessage, shieldMissionMessage, iterateMissionMessage];
                  self.spy.messages(messages);
                  break;
                case 'STARTED_DATABASE':
                  var messages = [deployMissionMessage, scaleMissionMessage, shieldMissionMessage, iterateMissionMessage, databaseMissionMessage];
                  self.spy.messages(messages);
                  break;
                /*
                case 'SHIELD':
                  var shieldMessages = [deployMissionMessage, scaleMissionMessage, shieldMissionMessage];
                  self.spy.messages(shieldMessages);
                  break;
                case 'FINAL':
                  var finalMessages = [deployMissionMessage, scaleMissionMessage, shieldMissionMessage,
                    iterateMissionMessage, databaseMissionMessage];
                  self.spy.messages(finalMessages);
                  break;
                case 'HARD':
                  var hardMessages = [deployMissionMessage, scaleMissionMessage, shieldMissionMessage,
                    iterateMissionMessage, databaseMissionMessage, hardMissionMessage];
                  self.spy.messages(hardMessages);
                  break;
                  */
                case 'FALCON':
                  var falconMessages = [falconMissionMessage];
                  self.spy.messages(falconMessages);
                  break;
                case 'FALCONCALLED':
                  self.popupMessage.showMessage(`The Redwood Eagle has been called!<br />
                                    It completely destroyed the weakened Alien War Ship! Well done!`);
                  break;
                default:
                  break;
              }
            };

            const getSquads = async() => {
              let gameId = self.deathstar.gameId();
              if (!gameId)
                return;

              try {
                let response = await fetch(`${ds.baseUrl}/squads?gameId=${gameId}`);
                let squads = await response.json();

                squads.forEach(squad => {
                  squad.score = squad.score || 0;
                  if (self.squads().some(sq => sq.id() === squad.id)) {
                    // There is already a squad with the same id. Just update it.
                    update(self.squads().find(sq => sq.id() === squad.id), squad);
                  } else {
                    self.squads.push(new Squad(...Object.values(squad)));
                  }
                });

                self.squads().map(squad => {
                  squad.updateMicroservices();
                });

                self.highscoreSquads(self.squads().sort((a, b) => b.score() - a.score()));
              } catch (err) {
                console.error(err);
              }
            };

            const getLogs = async() => {
              try {
                let response = await fetch(`${ds.baseUrl}/logs`);
                let logs = await response.json();

                // Sort the logs.
                logs.sort((a, b) => a.id - b.id);

                // Loop over the logs to add them to the list.
                logs.forEach(log => {
                  if (!self.logs().some(l => l.id() === log.id)) {
                    // Log was not yet added to the list. Add it in front.
                    self.logs.unshift(new Log(...Object.values(log)));

                    // Play a sound for the new log
                    switch (log.type.toLowerCase()) {
                      case 'deploy':
                        new Audio('/sounds/deploy.mp3').play();
                        break;
                      case 'scale':
                        new Audio('/sounds/fire.mp3').play();
                        break;
                      case 'shield':
                        new Audio('/sounds/shield.mp3').play();
                        break;
                      case 'iterate':
                        new Audio('/sounds/staylow.mp3').play();
                        break;
                      default:
                        new Audio('/sounds/laserBlast.mp3').play();
                        break;
                    }
                  } else {
                    // Log was already inside.
                    // We call update, but updates of logs should never happen.
                    update(self.logs().find(l => l.id() === log.id), log);
                  }
                });
              } catch (err) {
                console.log(`Error: ${JSON.stringify(err)}`);
              }

            };

            const getDeathstar = async() => {
              try {
                let response = await fetch(`${ds.baseUrl}/deathstar/latest`);
                let deathstar = await response.json();

                update(self.deathstar, deathstar);
                getSquads();
                updateSpy();
              } catch (err) {
                console.log(`Error: ${JSON.stringify(err)}`);
              }
            };

            // intervals to update the components.
            const updateComponents = function (isInit) {
              getDeathstar(isInit);
              getSquads(isInit);
              getLogs(isInit);
            };
            updateComponents(true);
            setInterval(updateComponents, 5000);
          }

          return DashboardViewModel;

        });

const update = (o, props) => {
  Object.keys(props).forEach(key => {
    if (typeof o[key] !== 'function')
      console.log(`key: ${key} is not of type function. Other
          fields present are: ${JSON.stringify(props)} and I'm trying to do
          changes to ${JSON.stringify(o)}`);
    o[key](props[key]);
  });
};

// time and date functions.
function timeSince(date) {
  let seconds = Math.floor((new Date() - new Date(date)) / 1000);
  let interval = Math.floor(seconds / 31536000);

  if (interval > 1) {
    return interval + " years";
  }
  interval = Math.floor(seconds / 2592000);
  if (interval > 1) {
    return interval + " months";
  }
  interval = Math.floor(seconds / 86400);
  if (interval > 1) {
    return interval + " days";
  }
  interval = Math.floor(seconds / 3600);
  if (interval > 1) {
    return interval + " hours";
  }
  interval = Math.floor(seconds / 60);
  if (interval > 1) {
    return interval + " minutes";
  }
  return Math.floor(seconds) + " seconds";
}

function timeSinceInMinutes(currentTime, timeStart) {
  let elapsedSeconds = Math.floor((new Date(currentTime) - new Date(timeStart)) / 1000);

  let minutes = Math.floor(elapsedSeconds / 60);
  let seconds = Math.abs(Math.floor(elapsedSeconds % 60));

  minutes = Math.abs(minutes) < 10 ? '0' + String(minutes) : String(minutes);
  seconds = seconds < 10 ? '0' + String(seconds) : String(seconds);

  return minutes + ':' + seconds;
}

function formatDate(dateString) {
  let date = new Date(dateString);
  let options = {
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric',
    hour12: false
  };
  return date.toLocaleDateString('en-GB', options);
};

const deployMissionMessage = {
  name: `<strong>Deploying your space fighter!</strong>`,
  message: `The <strong>Alien War Ship</strong> has to be destroyed.
        To start attacking the Alien War Ship your space fighters will have to be up and running!
        It's time to deploy our attack!`
};

const scaleMissionMessage = {
  name: `<strong>Scaling our attacks!</strong>`,
  message: `Great start! It's time we scale up our attacks!
        We should get another instance of our space fighter up and running to increase the damage we deal!`
};

const shieldMissionMessage = {
  name: `<strong>Take down their defenses!</strong>`,
  message: `Great job squads! <br />
        The Alien War Ship is defended by a shield which we must bring down.
        The coordinates of the shield are <strong>(33,45)</strong>. Expose the Alien War Ship!`
};

const iterateMissionMessage = {
  message: `<strong>Incoming! The Alien War Ship has sent out 10 Mini Fighters! </strong><br />
        I have been able to lock down the x-coordinate
        but you have to use your minigun to fire between <strong>y0</strong> and <strong>y9</strong> coordinates!`,
  name: `<strong>The Aliens strike back!</strong>`
};

const databaseMissionMessage = {
  message: `Someone has been sloppy with credentials!
        I found out that they keep the map to the reactor in the following database: <br/><br />
        <strong>Host IP:</strong> Check the instructions!<br/>
        <strong>Database name:</strong> deathstar<br/>
        <strong>User:</strong> Captain<br/>
        <strong>Password:</strong> welcome1<br/>
        <strong>Table name:</strong> SecretTable</p>`,
  name: `<strong>Captain's mistake..</strong>`
};

const hardMissionMessage = {
  message: `<strong>I have found the encrypted password! </strong><br />
        Decrypt the password to be able to hack and destroy the Fuel Tank! The encrypted password is: </br> <strong>14 78 SPACE 14 70 cd SPACE 65 c9 08 65 dc 12 SPACE d6 02 77 da 05 72 c9 0f 6d dc 19 77 dc SPACE 78 d6 0c 77 d1 SPACE 7b d0 09 SPACE d3 SPACE SPACE cb 14 73 de 0d 6a SPACE 10 65 c9 08 76 c9 10 79 cb 01 79 dc 05 68 cc 0f 69 d7 0e 78 cd SPACE SPACE cd 12 70 d6 05 6c cc 10 68 da</strong> `,
  name: `<strong>Hack the Fuel Tank!</strong>`
};

const falconMissionMessage = {
  message: `<strong>Well done! Let's finish it off! </strong><br />
	The Alien War Ship has been really weakened, if you focus all your space fighter's energy,
	we should be able to call the Redwood Eagle to finish off the Alien War Ship! <br/><br />
	If you <strong> increase the memory of your fighters to 2GB each </strong>, you should get enough power
	to send a signal to the Redwood Eagle! `,
  name: `<strong>Redwood Eagle to the rescue!</strong>`
};
