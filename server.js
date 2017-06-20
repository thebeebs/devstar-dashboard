var express = require('express');
var path = require('path');

var app = express();
var http = require('http').Server(app);

console.log(JSON.stringify(process.env.OCCS_HOSTIPS));
const backendBaseUrl = `${JSON.stringify(process.env.OCCS_HOSTIPS)}`.split('public_ip: ')[1].split('"')[0];

http.listen(process.env.PORT || 8089, function(){
  console.log('listening on ' + process.env.PORT || 8089);
});

app.get('/backend-info', (req, res, next) => {
    res.send({'info' : JSON.stringify(process.env.OCCS_HOSTIPS)});
});

app.get('/backend', (req, res, next) => {
    res.send({ 'backendBaseUrl' : backendBaseUrl } );
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');

app.use(express.static(path.join(__dirname, 'public')));

// catch 404 and forward to error handler

app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});





// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
