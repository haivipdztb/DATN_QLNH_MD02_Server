var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cors = require('cors');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
require('dotenv').config();
const app = express();

// Kết nối database
require('./model/db');
var cors = require('cors');

//////================// ROUTES ================//////
var menuRouter = require('./routes/menu');
var ordersRouter = require('./routes/orders');
var reportsRouter = require('./routes/reports');
var usersRouter = require('./routes/users');
var tablesRouter = require('./routes/tables');
var kitchenRouter = require('./routes/kitchen');
var cashierRouter = require('./routes/cashier');
var ingredientRouter =require('./routes/ingredient');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Tắt ETag để luôn trả về 200 thay vì 304
app.set('etag', false);

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());


//===================// ================//////
app.use('/users', usersRouter);
app.use('/menu', menuRouter);
app.use('/orders', ordersRouter);
app.use('/reports', reportsRouter); 
app.use('/tables', tablesRouter);
app.use('/kitchen', kitchenRouter);
app.use('/cashier', cashierRouter); 
app.use('/ingredients', ingredientRouter); 



// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
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
