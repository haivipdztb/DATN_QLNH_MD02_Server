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

//////================// ROUTES ================//////
var menuRouter = require('./routes/menu');
var ordersRouter = require('./routes/orders');
var reportsRouter = require('./routes/reports');
var usersRouter = require('./routes/users');
var tablesRouter = require('./routes/tables');
var kitchenRouter = require('./routes/kitchen');
var cashierRouter = require('./routes/cashier');
var ingredientsRouter = require('./routes/ingredients');
var vouchersRouter = require('./routes/vouchers');
var shiftsRouter = require('./routes/shifts');
var salaryRouter = require('./routes/salary');
var attendanceRouter = require('./routes/attendance');
var shiftsRouter = require('./routes/shifts');
var shiftAssignmentsRouter = require('./routes/shiftAssignments');
var payrollRouter = require('./routes/payroll');
var historyRouter = require('./routes/history');
var recipesRouter = require('./routes/recipes');
var paymentRouter = require('./routes/payment');
var restaurantSettingsRouter = require('./routes/restaurantSettings');
var serviceRouter = require('./routes/service');

var attendanceRouter = require('./routes/attendance');
var shiftAssignmentsRouter = require('./routes/shiftAssignments');
var payrollRouter = require('./routes/payroll');


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

//=================== ROUTES ==================//
app.use('/users', usersRouter);
app.use('/menu', menuRouter);
app.use('/orders', ordersRouter);
app.use('/reports', reportsRouter);
app.use('/tables', tablesRouter);
app.use('/kitchen', kitchenRouter);
app.use('/cashier', cashierRouter);
app.use('/ingredients', ingredientsRouter);
app.use('/vouchers', vouchersRouter);
app.use('/shifts', shiftsRouter);
app.use('/salary', salaryRouter);
app.use('/attendance', attendanceRouter);
app.use('/shifts', shiftsRouter);
app.use('/shift-assignments', shiftAssignmentsRouter);
app.use('/payroll', payrollRouter);
app.use('/ingredients', ingredientsRouter);
app.use('/history', historyRouter);
app.use('/recipes', recipesRouter);

app.use('/attendance', attendanceRouter);
app.use('/shift-assignments', shiftAssignmentsRouter);
app.use('/payroll', payrollRouter);
app.use('/payment', paymentRouter);
app.use('/restaurant-settings', restaurantSettingsRouter);
app.use('/service', serviceRouter);
// Also expose service routes under /api/service for clients using an /api base path
app.use('/api/service', serviceRouter);

// catch 404 and forward to error handler

// Middleware 404: trả về JSON nếu là API, tránh trả về HTML cho client mobile/app
app.use(function (req, res, next) {
  if (req.originalUrl.startsWith('/api') || req.headers.accept?.includes('application/json')) {
    return res.status(404).json({ success: false, message: 'Not Found', url: req.originalUrl });
  }
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
