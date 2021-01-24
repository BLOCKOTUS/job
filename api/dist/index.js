"use strict";

require("core-js/modules/es.array.join");

require("core-js/modules/es.date.to-string");

require("core-js/modules/es.object.to-string");

require("core-js/modules/es.promise");

require("core-js/modules/es.regexp.to-string");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.complete = exports.get = exports.list = exports.create = void 0;

require("regenerator-runtime/runtime");

var _fs = _interopRequireDefault(require("fs"));

var _path = _interopRequireDefault(require("path"));

var _index = require("../../../helper/api/dist/index.js");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

var WALLET_PATH = _path["default"].join(__dirname, '..', '..', '..', '..', 'wallet');
/**
 * Creates a job on the network.
 * Each job contain `data` and refers to a `chaincode` and a `key`.
 */


var create = /*#__PURE__*/function () {
  var _ref2 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee2(_ref) {
    var type, data, chaincode, key, user;
    return regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            type = _ref.type, data = _ref.data, chaincode = _ref.chaincode, key = _ref.key, user = _ref.user;
            return _context2.abrupt("return", new Promise( /*#__PURE__*/function () {
              var _ref3 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee(resolve, reject) {
                var walletPath, _yield$getContractAnd, contract, gateway, rawWorkers, workers;

                return regeneratorRuntime.wrap(function _callee$(_context) {
                  while (1) {
                    switch (_context.prev = _context.next) {
                      case 0:
                        // create wallet
                        walletPath = _path["default"].join(WALLET_PATH, "".concat(user.username, ".id"));

                        _fs["default"].writeFileSync(walletPath, JSON.stringify(user.wallet)); // get contract, submit transaction and disconnect


                        _context.next = 4;
                        return (0, _index.getContractAndGateway)({
                          username: user.username,
                          chaincode: 'job',
                          contract: 'Job'
                        })["catch"](reject);

                      case 4:
                        _yield$getContractAnd = _context.sent;
                        contract = _yield$getContractAnd.contract;
                        gateway = _yield$getContractAnd.gateway;

                        if (!(!contract || !gateway)) {
                          _context.next = 9;
                          break;
                        }

                        return _context.abrupt("return");

                      case 9:
                        _context.next = 11;
                        return contract.submitTransaction('createJob', type, data, chaincode, key)["catch"](reject);

                      case 11:
                        rawWorkers = _context.sent;
                        _context.next = 14;
                        return gateway.disconnect();

                      case 14:
                        if (rawWorkers) {
                          _context.next = 16;
                          break;
                        }

                        return _context.abrupt("return");

                      case 16:
                        workers = JSON.parse(rawWorkers.toString('utf8'));
                        resolve(workers);
                        return _context.abrupt("return");

                      case 19:
                      case "end":
                        return _context.stop();
                    }
                  }
                }, _callee);
              }));

              return function (_x2, _x3) {
                return _ref3.apply(this, arguments);
              };
            }()));

          case 2:
          case "end":
            return _context2.stop();
        }
      }
    }, _callee2);
  }));

  return function create(_x) {
    return _ref2.apply(this, arguments);
  };
}();
/**
 * List jobs attributed to the user.
 * They can be filtered by `status`, `chaincode`, and `key`.
 */


exports.create = create;

var list = /*#__PURE__*/function () {
  var _ref5 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee4(_ref4) {
    var status, chaincode, key, user;
    return regeneratorRuntime.wrap(function _callee4$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            status = _ref4.status, chaincode = _ref4.chaincode, key = _ref4.key, user = _ref4.user;
            return _context4.abrupt("return", new Promise( /*#__PURE__*/function () {
              var _ref6 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee3(resolve, reject) {
                var walletPath, _yield$getContractAnd2, contract, gateway, rawJobs, jobs;

                return regeneratorRuntime.wrap(function _callee3$(_context3) {
                  while (1) {
                    switch (_context3.prev = _context3.next) {
                      case 0:
                        // create wallet
                        walletPath = _path["default"].join(WALLET_PATH, "".concat(user.username, ".id"));

                        _fs["default"].writeFileSync(walletPath, JSON.stringify(user.wallet)); // get contract, submit transaction and disconnect


                        _context3.next = 4;
                        return (0, _index.getContractAndGateway)({
                          username: user.username,
                          chaincode: 'job',
                          contract: 'Job'
                        })["catch"](reject);

                      case 4:
                        _yield$getContractAnd2 = _context3.sent;
                        contract = _yield$getContractAnd2.contract;
                        gateway = _yield$getContractAnd2.gateway;

                        if (!(!contract || !gateway)) {
                          _context3.next = 9;
                          break;
                        }

                        return _context3.abrupt("return");

                      case 9:
                        if (!status) {
                          _context3.next = 13;
                          break;
                        }

                        _context3.next = 12;
                        return contract.submitTransaction('listJobs', status)["catch"](reject);

                      case 12:
                        rawJobs = _context3.sent;

                      case 13:
                        if (!(chaincode && key && !status)) {
                          _context3.next = 17;
                          break;
                        }

                        _context3.next = 16;
                        return contract.submitTransaction('listJobByChaincodeAndKey', chaincode, key)["catch"](reject);

                      case 16:
                        rawJobs = _context3.sent;

                      case 17:
                        _context3.next = 19;
                        return gateway.disconnect();

                      case 19:
                        if (rawJobs) {
                          _context3.next = 21;
                          break;
                        }

                        return _context3.abrupt("return");

                      case 21:
                        jobs = JSON.parse(rawJobs.toString('utf8'));
                        resolve(jobs);
                        return _context3.abrupt("return");

                      case 24:
                      case "end":
                        return _context3.stop();
                    }
                  }
                }, _callee3);
              }));

              return function (_x5, _x6) {
                return _ref6.apply(this, arguments);
              };
            }()));

          case 2:
          case "end":
            return _context4.stop();
        }
      }
    }, _callee4);
  }));

  return function list(_x4) {
    return _ref5.apply(this, arguments);
  };
}();
/**
 * Get a job from the network, by `jobId`.
 */


exports.list = list;

var get = /*#__PURE__*/function () {
  var _ref8 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee6(_ref7) {
    var jobId, user;
    return regeneratorRuntime.wrap(function _callee6$(_context6) {
      while (1) {
        switch (_context6.prev = _context6.next) {
          case 0:
            jobId = _ref7.jobId, user = _ref7.user;
            return _context6.abrupt("return", new Promise( /*#__PURE__*/function () {
              var _ref9 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee5(resolve, reject) {
                var walletPath, _yield$getContractAnd3, contract, gateway, rawJob, job;

                return regeneratorRuntime.wrap(function _callee5$(_context5) {
                  while (1) {
                    switch (_context5.prev = _context5.next) {
                      case 0:
                        // create wallet
                        walletPath = _path["default"].join(WALLET_PATH, "".concat(user.username, ".id"));

                        _fs["default"].writeFileSync(walletPath, JSON.stringify(user.wallet)); // get contract, submit transaction and disconnect


                        _context5.next = 4;
                        return (0, _index.getContractAndGateway)({
                          username: user.username,
                          chaincode: 'job',
                          contract: 'Job'
                        })["catch"](reject);

                      case 4:
                        _yield$getContractAnd3 = _context5.sent;
                        contract = _yield$getContractAnd3.contract;
                        gateway = _yield$getContractAnd3.gateway;

                        if (!(!contract || !gateway)) {
                          _context5.next = 9;
                          break;
                        }

                        return _context5.abrupt("return");

                      case 9:
                        _context5.next = 11;
                        return contract.submitTransaction('getJob', jobId)["catch"](reject);

                      case 11:
                        rawJob = _context5.sent;
                        _context5.next = 14;
                        return gateway.disconnect();

                      case 14:
                        if (rawJob) {
                          _context5.next = 16;
                          break;
                        }

                        return _context5.abrupt("return");

                      case 16:
                        job = JSON.parse(rawJob.toString('utf8'));
                        resolve(job);
                        return _context5.abrupt("return");

                      case 19:
                      case "end":
                        return _context5.stop();
                    }
                  }
                }, _callee5);
              }));

              return function (_x8, _x9) {
                return _ref9.apply(this, arguments);
              };
            }()));

          case 2:
          case "end":
            return _context6.stop();
        }
      }
    }, _callee6);
  }));

  return function get(_x7) {
    return _ref8.apply(this, arguments);
  };
}();
/**
 * Complete a job on the network.
 * It will mark the job as `complete` and post the `result` on the network.
 */


exports.get = get;

var complete = /*#__PURE__*/function () {
  var _ref11 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee8(_ref10) {
    var jobId, result, user;
    return regeneratorRuntime.wrap(function _callee8$(_context8) {
      while (1) {
        switch (_context8.prev = _context8.next) {
          case 0:
            jobId = _ref10.jobId, result = _ref10.result, user = _ref10.user;
            return _context8.abrupt("return", new Promise( /*#__PURE__*/function () {
              var _ref12 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee7(resolve, reject) {
                var walletPath, _yield$getContractAnd4, contract, gateway, transaction;

                return regeneratorRuntime.wrap(function _callee7$(_context7) {
                  while (1) {
                    switch (_context7.prev = _context7.next) {
                      case 0:
                        // create wallet
                        walletPath = _path["default"].join(WALLET_PATH, "".concat(user.username, ".id"));

                        _fs["default"].writeFileSync(walletPath, JSON.stringify(user.wallet)); // get contract, submit transaction and disconnect


                        _context7.next = 4;
                        return (0, _index.getContractAndGateway)({
                          username: user.username,
                          chaincode: 'job',
                          contract: 'Job'
                        })["catch"](reject);

                      case 4:
                        _yield$getContractAnd4 = _context7.sent;
                        contract = _yield$getContractAnd4.contract;
                        gateway = _yield$getContractAnd4.gateway;

                        if (!(!contract || !gateway)) {
                          _context7.next = 9;
                          break;
                        }

                        return _context7.abrupt("return");

                      case 9:
                        _context7.next = 11;
                        return contract.submitTransaction('completeJob', jobId, result)["catch"](reject);

                      case 11:
                        transaction = _context7.sent;
                        _context7.next = 14;
                        return gateway.disconnect();

                      case 14:
                        if (transaction) {
                          _context7.next = 16;
                          break;
                        }

                        return _context7.abrupt("return");

                      case 16:
                        resolve();
                        return _context7.abrupt("return");

                      case 18:
                      case "end":
                        return _context7.stop();
                    }
                  }
                }, _callee7);
              }));

              return function (_x11, _x12) {
                return _ref12.apply(this, arguments);
              };
            }()));

          case 2:
          case "end":
            return _context8.stop();
        }
      }
    }, _callee8);
  }));

  return function complete(_x10) {
    return _ref11.apply(this, arguments);
  };
}();

exports.complete = complete;