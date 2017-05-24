/**
 * Copyright (c) 2014, 2017, Oracle and/or its affiliates.
 * The Universal Permissive License (UPL), Version 1.0
 */

const reduce = Function.bind.call(Function.call, Array.prototype.reduce);
const isEnumerable = Function.bind.call(Function.call, Object.prototype.propertyIsEnumerable);
const concat = Function.bind.call(Function.call, Array.prototype.concat);
const keys = Reflect.ownKeys;

if (!Object.values) {
    Object.values = function values(O) {
        return reduce(keys(O), (v, k) => concat(v, typeof k === 'string' && isEnumerable(O, k) ? [O[k]] : []), []);
    };
}

define(['knockout', 'ojs/ojcore', 'ojs/ojknockout', 'ojs/ojprogressbar', 
    'ojs/ojinputnumber', 'animateText'],
        function (ko, oj) {
            
//            if (!Object.values) {
//                    values.shim();
//            }


            function DashboardViewModel() {
                const self = this;
                
                const searchParams = new URLSearchParams(window.location.search);
                const useSimulator = searchParams.has('simulation');
                const tickSpeed = searchParams.get('simulation') || 1000;
                
                const simulator = useSimulator ? getSimulator(tickSpeed) : null;
                
                // clock being used by the different components.
                const clock = new Clock();
                
                // The different components being tracked.
                self.highscoreSquads = ko.observableArray([]);
                self.squads = ko.observableArray([]);
                self.highscores = ko.observableArray([]);
                self.logs = ko.observableArray([]);
                self.deathstar = new Deathstar();
                self.spy = new Spy(0, 0, 300, 100);
                //self.currentMessage = ko.observable(false);
                self.popupMessage = new PopupMessage();
                
                // tick tock
                function Clock() {
                    const self = this;
                    self.clock = ko.observable(new Date());
                    self.tick = function() {
                        self.clock(new Date().toISOString());
                    };
                    setInterval(self.tick, 1000);
                };
                /* [{"id":55,"startHealth":1000,"currentHealth":1000,"state":"STARTED",
                 * "startTime":"2017-05-03T15:42:07.000Z","endTime":"2017-05-03T16:12:07.000Z",
                 * "timeLimit":30,"deathStarId":59,"
                 * gseDomains":"[{\"auth\": \"Basic Y2xvdWQuYWRtaW46Y2VudGVSQDNXSW5k\", 
                 * \"host\": \"apaas.europe.oraclecloud.com\", \"name\": \"gse00010206\"}]",
                 * "gameId":55,"deathstarId":59}] */
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
                    
                    self.stateLowerCase = ko.computed( () => {
                        return self.state() ? self.state().toLowerCase() : '';
                    });
                    self.currentHealthComputed = ko.computed( () => clock.clock() ? Math.floor(Math.random() * 1000) : 1000);
                    // computed functions to calculated elapsed time since game start and time left on the clock.
                    self.elapsedTime = ko.computed( () => timeSinceInMinutes( clock.clock(), self.startTime() ) );
                    self.timeLeft = ko.computed( () => timeSinceInMinutes(self.endTime(), clock.clock() ));
                };
                
                function Squad(id, name, gameId, environment, username, score, hasMicroservices) {
                    const self = this;
                    self.id = ko.observable(id);
                    self.name = ko.observable(name);
                    self.gameId = ko.observable(gameId);
                    self.environment = ko.observable(environment);
                    self.username = ko.observable(username);
                    self.score = ko.observable(score);
                    
                    self.microservices = ko.observableArray([]);
                    
                    self.updateMicroservices = function() {
                        fetch('https://ds-backend-gse00010206.apaas.em2.oraclecloud.com/squads/' +
                                self.id() + '/microservices')
                            .then(response => response.json())
                            .then(data => data.forEach( ms => {
                                if(!updateIfFound(ms, 'id', self.microservices))
                                    self.microservices.push(new Microservice(...Object.values(ms)));
                        }));
                    };
                };
                
                function Microservice(squadId, microserviceId, id, name,
                        gameId, environment, created, modified, platform,
                        instances, status, userName, memory, score) {
                    const self = this;
                    self.squadId = ko.observable(squadId);
                    self.microserviceId = ko.observable(microserviceId);
                    self.id = ko.observable(id);
                    self.name = ko.observable(name);
                    self.gameId = ko.observable(gameId);
                    self.environment = ko.observable(environment);
                    self.created = ko.observable(created);
                    self.modified = ko.observable(modified);
                    self.platform = ko.observable(platform);
                    self.instances = ko.observable(instances);
                    self.status = ko.observable(status);
                    self.userName = ko.observable(userName);
                    self.memory = ko.observable(memory);
                    self.score = ko.observable(score || 0);
                    
                    self.platformimg = ko.computed( () => self.platform().toLowerCase() );
                    self.statusIcon = ko.computed( () => String(self.status()).toLowerCase() === 'running' ? 'power-on' : 'power-off' );
                };
                
                function Highscore(name, score) {
                    const self = this;
                    self.name = ko.observable(name);
                    self.score = ko.observable(score);
                };
                
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
                    
                    generateLogMessage(self);
                };
                
                function PopupMessage() {
                    const self = this;
                    self.show = ko.observable(false);
                    self.message = ko.observable('');
                    self.earlierMessages = [];
                    
                    self.showMessage = message => {
                        if(self.earlierMessages.some(m => m === message.text))
                            return;
                        self.show(true);
                        $('#new-message h3').html(message.text);

                        $('#new-message h3').animate({
                            'fontSize' : '36px'
                        }, 3000, () => {
                            //self.currentMessage(false);
                            $('#new-message h3').removeAttr('style');
                            self.show(false);
                            self.earlierMessages.push(message.text);
                        });
                    };
                }
                
//                setTimeout( () => {
//                    self.popupMessage.showMessage('Hello<br /> there!');
//                }, 5000);
//                
                /*
                bottom:344
                height:27
                left:1213.5
                right:1285.5
                top:317
                width:72
                 */
                
                function Spy(x, y, width, height) {
                    const self = this;
                    self.x = ko.observable(`${x}px`);
                    self.y = ko.observable(`${y}px`);
                    self.width = ko.observable(`${width}px`);
                    self.height = ko.observable(`${height}px`);
                    self.visible = ko.observable(false);
                    self.toggleVisibility = () => { 
                        let spyRect = document.getElementById('spy').getBoundingClientRect();
                        //let logsRect = document.getElementById('log-messages').getBoundingClientRect();
                        let width = 380;
                        let height = 200;
                        let x = spyRect.left - (65 + width);
                        let y = spyRect.top - height;
                        self.width(`${width}px`);
                        self.height( `${height}px`);
                        self.x(`${x}px`);
                        self.y(`${y}px`);
                        
                        self.visible(!self.visible());
                    };
                    
                    var startMessages = [deployMissionMessage, scaleMissionMessage];
                    
                    self.messages = ko.observableArray(startMessages);
                    self.selectedMessage = ko.observable(0);
                    
                    self.hasNext = ko.computed( () => self.selectedMessage() !== self.messages().length - 1 );
                    self.hasPrevious = ko.computed( () => self.selectedMessage() !== 0 );
                    
                    self.next = () => {
                        console.log(JSON.stringify(self.messages()));
                        if( self.hasNext() ) {
                            let next = self.selectedMessage() + 1;
                            self.selectedMessage(next);
                        }
                    };
                    
                    self.previous = () => {
                        if( self.hasPrevious() ) {
                            let prev = self.selectedMessage() - 1;
                            self.selectedMessage(prev);
                        }
                    };

                };

                const updateSpy = function() {
                        if(self.deathstar.currentHealth() < 0) {
                            self.popupMessage.showMessage(`Good job squads!<br/>
                                You have defeated the Death Star!`)
                        }
                	switch (self.deathstar.state()) {
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
                	case 'FALCON':
                        var falconMessages = [falconMissionMessage];
                        self.spy.messages(falconMessages);
                		break;
                	case 'FALCONCALLED':
                		self.popupMessage.showMessage(`The Millenium Falcon has been called!<br />
                                    It completely destroyed the weakened Death Star! Well done!`);
                		break;
                	default:
                		break;
                	}
                };
                
                const getSquads = function(isInit) {
                    let gameId = self.deathstar.gameId();
                    if(!gameId)
                        return;
                    let squadsPromise;
                    if(useSimulator) {
                        squadsPromise = simulator.getSquads();
                    } else {
                        squadsPromise = fetch(`https://ds-backend-gse00010206.apaas.em2.oraclecloud.com/squads?gameId=${gameId}`);
                    }
                    
                    squadsPromise.then(response => useSimulator ? response : response.json())
                        .then(data => data.forEach( squad => {
                            squad.score = squad.score || 0;
                            if(!updateIfFound(squad, 'id', self.squads))
                                self.squads.push(new Squad(...Object.values(squad)));
                        }))
                        .then( () => self.squads().forEach( sq => sq.updateMicroservices() ))
                        .then( () => self.highscoreSquads(
                                self.squads().sort( (a,b) => b.score() - a.score() ))
                        );
                };
                
                const getLogs = function(isInit) {
                    let logsPromise;
                    if(useSimulator) {
                        logsPromise = simulator.getLogs();
                    } else {
                        logsPromise = fetch('https://ds-backend-gse00010206.apaas.em2.oraclecloud.com/logs');
                    }
                    
                    
                    logsPromise.then(response => useSimulator ? response : response.json())
                        .then(data => data.sort( (a,b) => a.id - b.id ))
                        .then(data => data.forEach( log => {
                            if(!updateIfFound(log, 'id', self.logs)) {
                                self.logs.unshift(new Log(...Object.values(log)));
                                if(self.logs().length > 5) {
                                    self.logs.pop();
                                }
                                if(!isInit) {
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
                                }
                            }
                    }));
                };
                
                const getDeathstar = function(isInit) {
                    let deathstarPromise;
                    if(useSimulator) {
                        deathstarPromise = simulator.getDeathstar();
                    } else {
                        deathstarPromise = fetch('https://ds-backend-gse00010206.apaas.em2.oraclecloud.com/deathstar/latest');
                    }
                    
                    deathstarPromise.then(response => useSimulator ? response : response.json())
                        .then(data => update(self.deathstar, data) )
                        .then(() => {
                        	getSquads();
                        	updateSpy();
                        })
                };
                
//                self.getSpyMessages = function() {
//                    let spyPosition = document.getElementById('spy').getBoundingClientRect();
//                    
//                };
                
                /* SPY: SHIELD, FINAL */
                /*const getSpy = function() {
                    let spyPromise = fetch('https://ds-backend-gse00010206.apaas.em2.oraclecloud.com/spy');
                    
                    spyPromise.then(response => response.json())
                        .then(data => update(self.spy, data) );
                    //spyPromise.then( response => )
                };*/
                
                // intervals to update the components.
                const updateComponents = function(isInit) {
                    getDeathstar(isInit);
                    getSquads(isInit);
                    getLogs(isInit);
                };
                updateComponents(true);
                setInterval(updateComponents, 5000);
            }

            return DashboardViewModel;

});     

// functions to help updating components.
const findElementInArray = (p, iden, arr) => {
    return arr().find(obj => obj[p]() === iden);
};
const update = (o, props) => { 
    Object.keys(props).forEach( key =>  { 
        if(typeof o[key] !== 'function')
            console.log(`key: ${key} is not of type function. Other
                    fields present are: ${JSON.stringify(props)} and I'm trying to do
                    changes to ${JSON.stringify(o)}`);
        o[key](props[key]);
    });
};

function updateIfFound(props, identifier, array) {
    let element = findElementInArray(identifier, props[identifier], array);
    if(!element) 
        return false;
        
    update(element, props); 
    return true;
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

//function incomingMessage() {
//    $('#new-message h3').animate({fontSize: '48px'}, 1000);
//};

function generateLogMessage(log) {
    if(log.type().toLowerCase() === 'deploy') {
        log.message(`Good job ${log.squadName()}! ${log.microserviceName()}
            was deployed and has inflicted ${log.damage()} to the deathstar!`);
    } else if(log.type().toLowerCase() === 'scale') {
        log.message(`Good job ${log.squadName()}! ${log.microserviceName()}
            has scaled up and is now using multiple fighters to fight the death star!`);
    } else if(log.type().toLowerCase() === 'start') {
        log.message(`Good luck to all squads! The game has started!`);
    }else {
        log.message(`${log.microserviceName()}
            has done something and this dashboard has no idea what!`);
    }
}

const deployMissionMessage = {
    name : `<strong>Deploying your X-Wing fighter!</strong>`,
    message : `The <strong>Death Star</strong> has to be destroyed.
            To start attacking the Death Star your X-Wing will have to be up and running!
            It's time to deploy our attack!`
};

const scaleMissionMessage = {
    name : `<strong>Scaling our attacks!</strong>`,
    message : `Great start! It's time we scale up our attacks!
               We should get another instance of our X-Wing up and running to increase the damage we deal!`
};

const shieldMissionMessage = {
    name : `<strong>Take down their defenses!</strong>`,
    message : `Great job squads! <br />
            The Death Star is defended by a shield which we must bring down.
            The coordinates of the shield are <stron>(33,45)</strong>. Expose the Death Star!`
};

const iterateMissionMessage = {
    message : `<strong>Incoming! The Empire has sent out 10 TIE Fighters! </strong><br />
            I have been able to lock down the x-coordinate 
            but you have to use your minigun to fire between <strong>y0</strong> and <strong>y9</strong> coordinates!`,
    name : `<strong>The empire strikes back!</strong>`
};

const databaseMissionMessage = { 
    message: `Someone has been sloppy with credentials!
        I found out that they keep the map to the reactor in the following database: <br/><br />
        <strong>Host:</strong> 140.86.34.87<br/>
        <strong>Database name:</strong> deathstar<br/>
        <strong>User:</strong> CaptainGodherdt<br/>
        <strong>Password:</strong> ILoveDarth@2017<br/>
        <strong>Table name:</strong> MissionDatabase</p>`,
    name: `<strong>Captain Godherdt's mistake..</strong>`
};

const hardMissionMessage = { 
	message : `<strong>I have found the encrypted password! </strong><br />
            Decrypt the password to be able to hack and destroy the Fuel Tank! The encrypted password is: </br> <strong>14 78 SPACE 14 70 cd SPACE 65 c9 08 65 dc 12 SPACE d6 02 77 da 05 72 c9 0f 6d dc 19 77 dc SPACE 78 d6 0c 77 d1 SPACE 7b d0 09 SPACE d3 SPACE SPACE cb 14 73 de 0d 6a SPACE 10 65 c9 08 76 c9 10 79 cb 01 79 dc 05 68 cc 0f 69 d7 0e 78 cd SPACE SPACE cd 12 70 d6 05 6c cc 10 68 da</strong> `, 
    name : `<strong>Hack the Fuel Tank!</strong>`
	};

const falconMissionMessage = {
	    message : `<strong>Well done! Let's finish it off! </strong><br />
	            The Death Star has been really weakened, if you focus all your X-wing fighter's energy,
	            we should be able to call the Millenium Falcon to finish off the Death Star! <br/><br />
	            If you <strong> increase the memory of your fighters to 2GB each </strong>, you should get enough power
	            to send a signal to the Millenium Falcon! `, 
	    name : `<strong>Millenium Falcon to the rescue!</strong>`
	};

