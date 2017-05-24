const Simulator = function (tickSpeed) {

    const self = this;
    const clock = new Clock();
    
    function Clock() {
        const self = this;
        self._tickCount = 0;
        self._callbacks = [];
        
        self.registerCallback = function(fn) {
            if(typeof fn !== "function")
                console.error("passed element is not a function.");
            
            self._callbacks.push(fn);
        };
        
        self.tick = function () {
            self._tickCount++;
            self._callbacks.forEach( fn => fn( self._tickCount ) );
        };
        setInterval(self.tick, tickSpeed);
    };
    
    // every 50 seconds add a log
    function checkEvents(tickCount) {
        fetch('/js/rest/simulatorData.json')
            .then(response => response.json())
            .then(data => data.events.forEach(event => {
                if(event.tickCount === tickCount) {
                    switch(event.type) {
                        case "log":
                            updateLog(event.event);
                            break;
                        case "squad":
                            updateSquad(event.event);
                            break;
                        case "deathstar":
                            updateDeathstar(event.event);
                            break;
                        case "score":
                            updateScore(event.event);
                            break;
                    }
                }
            }));
    }
    
    const updateLog = function(event) {
        let contains = logs.some( log => log.id === event.id );
        if(contains)
            logs[logs.findIndex( log => log.id === event.id )] = event;
        
        else
            logs.push(event);
    };
    
    const updateSquad = function(event) {
        let contains = squads.some( squad => squad.squad === event.squad );
        if(contains)
            squads[squads.findIndex( squad => squad.squad === event.squad)] = event;
        
        else
            squads.push(event);
    };
    
    const updateDeathstar = function(event) {
        deathStar[0] = event;
    };
    
    const updateScore = function(event) {
        let contains = scores.some( score => score.squad === event.squad );
        if(contains)
            scores[scores.findIndex( score => score.squad === event.squad)] = event;
        
        else
            scores.push(event);
    };
    
    clock.registerCallback(checkEvents);

    self.getSquads = function () {
        return new Promise(function(resolve, reject) {
            resolve(squads);
        });
    };
    
    self.getScores = function() {
        return new Promise(function(resolve, reject) {
            resolve(scores);
        });
    };
    
    self.getDeathstar = function() {
        return new Promise(function(resolve, reject) {
            resolve(deathStar);
        });
    };
    
    self.getLogs = function() {
        return new Promise(function(resolve, reject) {
            let latestLogs = logs.sort( (a, b) => b.id - a.id ).splice(0, 5);
            resolve(latestLogs);
        });
    };

};

_simulator = null;

const getSimulator = function(tickSpeed) {
    if(_simulator === null) {
        _simulator = new Simulator(tickSpeed);
    }
    return _simulator;
};

const squads = [{
	"squad": "dashboard",
	"environment": "gse00010206",
	"created": "2017-04-13T13:19:29.589+0000",
	"modified": "2017-04-14T15:39:42.397+0000",
	"fighters": 1,
	"status": "RUNNING",
	"weapon": "node"
},
{
	"squad": "ds-backend",
	"environment": "gse00010206",
	"created": "2017-04-11T07:45:18.844+0000",
	"modified": "2017-04-17T13:08:05.946+0000",
	"fighters": 1,
	"status": "RUNNING",
	"weapon": "node"
},
{
	"squad": "linustest",
	"environment": "gse00010206",
	"created": "2017-04-11T15:32:12.152+0000",
	"modified": "2017-04-11T15:32:12.127+0000",
	"fighters": 2,
	"status": "RUNNING",
	"weapon": "Node"
},
{
	"squad": "phpSkeleton",
	"environment": "gse00010206",
	"created": "2017-04-19T08:05:40.922+0000",
	"modified": "2017-04-19T10:33:44.195+0000",
	"fighters": 1,
	"status": "RUNNING",
	"weapon": "php"
},
{
	"squad": "xwingnodeclient",
	"environment": "gse00010206",
	"created": "2017-04-20T09:30:37.387+0000",
	"modified": "2017-04-20T09:30:37.362+0000",
	"fighters": 1,
	"status": "RUNNING",
	"weapon": "node"
}];
const deathStar = [{
	"id": 40,
	"startTime": "2017-04-13T16:46:24.000Z",
	"timeLimit": 30,
	"endTime": "2017-04-13T17:16:24.000Z",
	"numberOfSquads": 4,
	"startHealth": 1000,
	"currentHealth": 1000,
	"gseDomains": "[{\"auth\": \"Basic Y2xvdWQuYWRtaW46Y2VudGVSQDNXSW5k\", \"name\": \"gse00010206\", \"region\": \"europe\"}]",
	"state": "STARTED"
}];
const logs = [{
	"id": 54,
	"date": "2017-04-20T09:31:04.000Z",
	"gameId": 40,
	"squadName": "xwingnodeclient",
	"type": "START",
	"text": "Well done squad xwingnodeclient!. Your first fighter is now deployed and inflicted 50 damage to Death Star!"
},
{
	"id": 53,
	"date": "2017-04-19T13:36:23.000Z",
	"gameId": 40,
	"squadName": "linustest",
	"type": "START",
	"text": "Well done squad linustest!. Your first fighter is now deployed and inflicted 50 damage to Death Star!"
},
{
	"id": 52,
	"date": "2017-04-19T13:36:23.000Z",
	"gameId": 40,
	"squadName": "dashboard",
	"type": "START",
	"text": "Well done squad dashboard!. Your first fighter is now deployed and inflicted 50 damage to Death Star!"
},
{
	"id": 51,
	"date": "2017-04-19T13:36:22.000Z",
	"gameId": 40,
	"squadName": "ds-backend",
	"type": "START",
	"text": "Well done squad ds-backend!. Your first fighter is now deployed and inflicted 50 damage to Death Star!"
},
{
	"id": 50,
	"date": "2017-04-19T13:36:22.000Z",
	"gameId": 40,
	"squadName": "phpSkeleton",
	"type": "START",
	"text": "Well done squad phpSkeleton!. Your first fighter is now deployed and inflicted 50 damage to Death Star!"
}];
const scores = [{
	"squad": "dashboard",
	"score": 50
},
{
	"squad": "linustest",
	"score": 50
},
{
	"squad": "ds-backend",
	"score": 50
},
{
	"squad": "phpSkeleton",
	"score": 50
},
{
	"squad": "xwingnodeclient",
	"score": 50
}];