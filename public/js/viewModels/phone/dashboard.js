/**
 * Copyright (c) 2014, 2017, Oracle and/or its affiliates.
 * The Universal Permissive License (UPL), Version 1.0
 */
define(['knockout', 'ojs/ojcore', 'ojs/ojknockout'],
        function (ko, oj) {

            function DashboardViewModel() {
                const self = this;

                self.squads = ko.observableArray([]);
                self.highscores = ko.observableArray([]);
                self.logs = ko.observableArray([]);
                self.deathstar = new Deathstar();
                
                function Deathstar() {
                    const self = this;
                    self.id = ko.observable();
                    self.startTime = ko.observable();
                    self.timeLimit = ko.observable();
                    self.endTime = ko.observable();
                    self.numberOfSquads = ko.observable();
                    self.startHealth = ko.observable();
                    self.currentHealth = ko.observable();
                    self.gseDomains = ko.observable();
                    self.state = ko.observable();
                    self.clock = ko.observable(new Date());
                    
                    self.tick = function() {
                        console.log('change!');
                        self.clock(new Date());
                    };
                    setInterval(self.tick, 5000);
                    
                    self.elapsedTime = ko.computed( () => timeSinceInMinutes(self.clock(), self.startTime() ) );
                };
                
                function Squad(squad, environment, created, modified, fighters, 
                        status, weapon) {
                    const self = this;
                    self.squad = ko.observable(squad);
                    self.environment = ko.observable(environment);
                    self.created = ko.observable(created);
                    self.modified = ko.observable(modified);
                    self.fighters = ko.observable(fighters);
                    self.status = ko.observable(status);
                    self.weapon = ko.observable(weapon);
                    
                    self.airTime = ko.computed( () => timeSince( self.created() ) );
                };
                
                function Highscore(squad, score) {
                    const self = this;
                    self.squad = ko.observable(squad);
                    self.score = ko.observable(score);
                };
                
                function Log(id, date, gameId, squadName, type, text) {
                    const self = this;
                    self.id = ko.observable(id);
                    self.date = ko.observable(date);
                    self.gameId = ko.observable(gameId);
                    self.squadName = ko.observable(squadName);
                    self.type = ko.observable(type);
                    self.text = ko.observable(text);
                    
                    self.formattedDate = ko.computed( () => formatDate( self.date() ) );
                };
                
                const getHighscores = function() {
                    fetch('https://ds-backend-gse00010206.apaas.em2.oraclecloud.com/scores')
                        .then(response => response.json())
                        .then(data => data.forEach( score => {
                            if(!updateIfFound(score, 'squad', self.highscores))
                                self.highscores.push(new Highscore(...Object.values(score)));
                    }));
                };
                
                const getSquads = function() {
                    fetch('https://ds-backend-gse00010206.apaas.em2.oraclecloud.com/squads')
                        .then(response => response.json())
                        .then(data => data.forEach( squad => {
                            if(!updateIfFound(squad, 'squad', self.squads))
                                self.squads.push(new Squad(...Object.values(squad)));
                    }));
                };
                
                const getLogs = function() {
                    fetch('https://ds-backend-gse00010206.apaas.em2.oraclecloud.com/logs/latest/5')
                        .then(response => response.json())
                        .then(data => data.forEach( log => {
                            if(!updateIfFound(log, 'id', self.logs))
                                self.logs.push(new Log(...Object.values(log)));
                    }));
                };
                
                const getDeathstar = function() {
                    fetch('https://ds-backend-gse00010206.apaas.em2.oraclecloud.com/deathstar/latest')
                        .then(response => response.json())
                        .then(data => update(self.deathstar, data[0]) );
                };
                
                getDeathstar(); getHighscores(); getSquads(); getLogs();
                
                setInterval(getDeathstar, 5000);
                setInterval(getHighscores, 5000);
                setInterval(getSquads, 5000);
                setInterval(getLogs, 5000);
            }

            return DashboardViewModel;

});     

// functions to help
const has = Object.prototype.hasOwnProperty;
const obsIs = p => v => o => has.call(o, p) && o[p]() === v;
const findElementInArray = (p, v, a) => a().find(obj => obj[p]() === v);
const update = (o, props) => Object.keys(props).forEach(key => o[key](props[key]));

function updateIfFound(props, identifier, array) {
    let element = findElementInArray(identifier, props[identifier], array);
    if(!element) 
        return false;
        
    update(element, props); 
    return true;
};

function timeSince(date) {
    console.log(date);
    var seconds = Math.floor((new Date() - new Date(date)) / 1000);

    var interval = Math.floor(seconds / 31536000);

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
    var seconds = Math.floor((currentTime - new Date(timeStart)) / 1000);

    var interval = Math.floor(seconds / 60);
    if (interval > 1) {
        console.log(interval + " minutes");
        return interval + " minutes";
    }
    return Math.floor(seconds) + " seconds";
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