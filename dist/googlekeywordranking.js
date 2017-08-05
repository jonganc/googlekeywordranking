'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getRankingArr = exports.getRanking = exports.Cancelled = exports.Err = exports.ReachedMaxPages = exports.NotFound = exports.RegexFound = exports.Result = exports.ResStats = exports.minRequestDelay = undefined;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

//  process the page at URL, ultimately returning either the position of the
//  first url matching urlRegexToFind or null if maxPagesToSearch has been
//  reached
//
//  return a Results object, indicating the result
//
//  Settings are given as key-value pairs in the object passed in
//
//  The following settings are required
//   requestOpts:  options for the next request
//   urlRegex:  regex to find on the page
//   maxPagesToSearch: maximum number of pages to search. set to -1 to
//     disable.
//
//  The following settings are used for recursion and need not be
//  originally passed:
//
//   pageNr:  page number that url will be
//   curResNr:  current result number the page will start at
//
//  The following setting(s) is purely for debugging:
//
//   _debugHtmlArray: for debugging, an array of html files can be passed
//     here instead. instead of actually retrieving the next page via http,
//     the next page will be popped off the array (and the remaining
//     elements will be passed along to the next calling of processPage, if
//     necessary). Note that an error will occur if the search term
//     isn't found before the minimum of maxPagesToSearch and the length of
//     _debugHtmlArray
var processPage = function () {
  var _ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(input) {
    var defaults, _Object$assign, requestOpts, urlRegex, maxPagesToSearch, pageNr, curResNr, _debugHtmlArray, response, curTime, $page, reqUrl, stats, next;

    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            if (typeof input === 'object' && input.requestOpts && input.urlRegex && input.maxPagesToSearch) {
              _context.next = 2;
              break;
            }

            throw new Error('processPage called without needed options');

          case 2:
            defaults = {
              pageNr: 1,
              curResNr: 0,
              reqContext: null,
              _debugHtmlArray: null
            };
            _Object$assign = Object.assign(defaults, input), requestOpts = _Object$assign.requestOpts, urlRegex = _Object$assign.urlRegex, maxPagesToSearch = _Object$assign.maxPagesToSearch, pageNr = _Object$assign.pageNr, curResNr = _Object$assign.curResNr, _debugHtmlArray = _Object$assign._debugHtmlArray;

            // console.log(
            //   '{ requestOpts, urlRegex, maxPagesToSearch,'
            //     + ' pageNr, curResNr, _debugHtmlArray}:',
            //   { requestOpts, urlRegex, maxPagesToSearch,
            //     pageNr, curResNr, _debugHtmlArray});

            response = void 0;

            if (_debugHtmlArray) {
              _context.next = 23;
              break;
            }

            _context.prev = 6;
            curTime = new Date();

            if (!lastRequestTime) {
              _context.next = 11;
              break;
            }

            _context.next = 11;
            return resolveAfterDelay(minRequestDelay - (curTime.getTime() - lastRequestTime.getTime()));

          case 11:
            lastRequestTime = new Date();
            _context.next = 14;
            return (0, _requestPromiseNative2.default)(requestOpts);

          case 14:
            response = _context.sent;
            _context.next = 21;
            break;

          case 17:
            _context.prev = 17;
            _context.t0 = _context['catch'](6);

            // add current input to error and then rethrow
            _context.t0.processPageInput = input;
            throw _context.t0;

          case 21:
            _context.next = 24;
            break;

          case 23:
            // we simulate enough of a response object for our purposes
            response = {
              body: _debugHtmlArray.pop(),
              request: {
                href: `_debugHtmlArray page ${pageNr}`
              }
            };

          case 24:
            $page = _cheerio2.default.load(response.body);
            reqUrl = response.request.href;

            //  get stats if we are on the first page

            stats = void 0;

            if (pageNr === 1) stats = getStats($page);

            _context.prev = 28;

            $page('.g').each( /* @this elt */function () {
              var $res = (0, _cheerio2.default)(this);
              //  it turns out that we only want the results which have the class 'g'
              //  and only the class 'g'
              if (!($res.attr('class') === 'g' && !$res.attr('id'))) {
                return;
              }

              curResNr++;
              if ($res.find('cite').text().replace(/›.*/, '').match(urlRegex)) {
                throw new RegexFound(curResNr, reqUrl);
              }
            });

            //  we've searched through all links on this page and not found result

            // next, let us check for more page links
            next = $page('#pnnext').attr('href');

            if (!next) {
              _context.next = 40;
              break;
            }

            next = _url2.default.resolve(reqUrl, next);

            //  if we are not allowed to search more pages, notify that

            if (!(pageNr + 1 > maxPagesToSearch)) {
              _context.next = 35;
              break;
            }

            throw new ReachedMaxPages(next, curResNr);

          case 35:
            _context.next = 37;
            return processPage({
              requestOpts: makeReqOptsForUrl(next),
              urlRegex,
              maxPagesToSearch,
              pageNr: pageNr + 1,
              curResNr,
              _debugHtmlArray
            });

          case 37:
            throw _context.sent;

          case 40:
            throw new NotFound(curResNr);

          case 41:
            throw new Error('Should never reach this point');

          case 44:
            _context.prev = 44;
            _context.t1 = _context['catch'](28);

            if (!(_context.t1 instanceof Result)) {
              _context.next = 49;
              break;
            }

            if (pageNr === 1) _context.t1.setStats(stats);
            return _context.abrupt('return', _context.t1);

          case 49:
            // rethrow other errors, adding options and curResNr
            _context.t1.processPageInput = input;
            _context.t1.curResNr = curResNr;
            throw _context.t1;

          case 52:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this, [[6, 17], [28, 44]]);
  }));

  return function processPage(_x) {
    return _ref.apply(this, arguments);
  };
}();

// returns a result object indicating where the term was found
var getRanking = exports.getRanking = function () {
  var _ref3 = _asyncToGenerator(regeneratorRuntime.mark(function _callee2(_ref2) {
    var searchTerms = _ref2.searchTerms,
        urlRegex = _ref2.urlRegex,
        _ref2$maxPagesToSearc = _ref2.maxPagesToSearch,
        maxPagesToSearch = _ref2$maxPagesToSearc === undefined ? 4 : _ref2$maxPagesToSearc,
        _ref2$_debugHtmlArray = _ref2._debugHtmlArray,
        _debugHtmlArray = _ref2$_debugHtmlArray === undefined ? null : _ref2$_debugHtmlArray;

    var result;
    return regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            result = void 0;
            _context2.prev = 1;
            _context2.next = 4;
            return processPage({
              requestOpts: makeReqestOptsForTerms(searchTerms),
              urlRegex,
              maxPagesToSearch,
              _debugHtmlArray
            });

          case 4:
            result = _context2.sent;
            _context2.next = 10;
            break;

          case 7:
            _context2.prev = 7;
            _context2.t0 = _context2['catch'](1);

            result = new Err(_context2.t0);

          case 10:
            return _context2.abrupt('return', result);

          case 11:
          case 'end':
            return _context2.stop();
        }
      }
    }, _callee2, this, [[1, 7]]);
  }));

  return function getRanking(_x2) {
    return _ref3.apply(this, arguments);
  };
}();

// takes an array of objects, passing them each to getRanking. If any of
// them returns Error, all subsequent requests return Cancelled


var getRankingArr = exports.getRankingArr = function () {
  var _ref4 = _asyncToGenerator(regeneratorRuntime.mark(function _callee4(arr) {
    var _this6 = this;

    var failed;
    return regeneratorRuntime.wrap(function _callee4$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            // indicates if any of the attempts so far have failed
            failed = false;
            return _context4.abrupt('return', Promise.all(arr.map(function () {
              var _ref5 = _asyncToGenerator(regeneratorRuntime.mark(function _callee3(searchOpts) {
                var result;
                return regeneratorRuntime.wrap(function _callee3$(_context3) {
                  while (1) {
                    switch (_context3.prev = _context3.next) {
                      case 0:
                        if (!failed) {
                          _context3.next = 2;
                          break;
                        }

                        return _context3.abrupt('return', new Cancelled());

                      case 2:
                        _context3.next = 4;
                        return getRanking(searchOpts);

                      case 4:
                        result = _context3.sent;

                        if (result instanceof Err) {
                          failed = true;
                        }
                        return _context3.abrupt('return', result);

                      case 7:
                      case 'end':
                        return _context3.stop();
                    }
                  }
                }, _callee3, _this6);
              }));

              return function (_x4) {
                return _ref5.apply(this, arguments);
              };
            }())));

          case 2:
          case 'end':
            return _context4.stop();
        }
      }
    }, _callee4, this);
  }));

  return function getRankingArr(_x3) {
    return _ref4.apply(this, arguments);
  };
}();

exports.resolveAfterDelay = resolveAfterDelay;
exports.genErrMsg = genErrMsg;

var _url = require('url');

var _url2 = _interopRequireDefault(_url);

var _requestPromiseNative = require('request-promise-native');

var _requestPromiseNative2 = _interopRequireDefault(_requestPromiseNative);

var _errors = require('request-promise-native/errors');

var _errors2 = _interopRequireDefault(_errors);

var _sourceMapSupport = require('source-map-support');

var _sourceMapSupport2 = _interopRequireDefault(_sourceMapSupport);

var _qs = require('qs');

var _qs2 = _interopRequireDefault(_qs);

var _cheerio = require('cheerio');

var _cheerio2 = _interopRequireDefault(_cheerio);

var _nconf = require('nconf');

var _nconf2 = _interopRequireDefault(_nconf);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } } //  Copyright 2017 Jonathan Ganc
//
//  This file is part of googlekeywordranking.
//
//  googlekeywordranking is free software: you can redistribute it and/or
//  modify it under the terms of the GNU General Public License as
//  published by the Free Software Foundation, either version 3 of the
//  License, or (at your option) any later version.
//
//  Foobar is distributed in the hope that it will be useful,
//  but WITHOUT ANY WARRANTY; without even the implied warranty of
//  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//  GNU General Public License for more details.
//
//  You should have received a copy of the GNU General Public License
//  along with Foobar.  If not, see <http://www.gnu.org/licenses/>.

_sourceMapSupport2.default.install();

// the config file
var config = void 0;
try {
  config = require('../config');
} catch (e) {
  if (e.code === 'MODULE_NOT_FOUND') {
    config = {};
  } else {
    throw e;
  }
}

// request.debug = true;

//  minimum delay between requests in ms
var minRequestDelay = exports.minRequestDelay = 10000;
// exports.minRequestDelay = minRequestDelay;
// const minRequestDelay = 1;

//////////////////////////////////////////////////////////////////////////
//  DEFINE CLASSES

//  stats about the result

var ResStats = exports.ResStats = function ResStats(nrResults) {
  _classCallCheck(this, ResStats);

  // number of results
  this.nrResults = nrResults;
};

//  a class to wrap either the result or the reason for failure
//
//  we set nrResults on the first page (for some reason)


var Result = exports.Result = function () {
  function Result() {
    _classCallCheck(this, Result);

    this.stats = null;
  }

  // function for adding stats


  _createClass(Result, [{
    key: 'setStats',
    value: function setStats(stats) {
      this.stats = stats;
    }
  }]);

  return Result;
}();

var RegexFound = exports.RegexFound = function (_Result) {
  _inherits(RegexFound, _Result);

  function RegexFound(ranking, url) {
    _classCallCheck(this, RegexFound);

    var _this = _possibleConstructorReturn(this, (RegexFound.__proto__ || Object.getPrototypeOf(RegexFound)).call(this));

    _this.ranking = ranking;
    _this.url = url;
    return _this;
  }

  return RegexFound;
}(Result);

// reaches end of results and regex still not found
// nrResSearched: number of results searched


var NotFound = exports.NotFound = function (_Result2) {
  _inherits(NotFound, _Result2);

  function NotFound(nrResSearched) {
    _classCallCheck(this, NotFound);

    var _this2 = _possibleConstructorReturn(this, (NotFound.__proto__ || Object.getPrototypeOf(NotFound)).call(this));

    _this2.nrResSearched = nrResSearched;
    return _this2;
  }

  return NotFound;
}(Result);

//  Meaning: there were more links but we were forbidden from searching them
//  due to maxPagesToSearch
//  nextPage: link to the next page


var ReachedMaxPages = exports.ReachedMaxPages = function (_Result3) {
  _inherits(ReachedMaxPages, _Result3);

  function ReachedMaxPages(nextPage, nrResSearched) {
    _classCallCheck(this, ReachedMaxPages);

    var _this3 = _possibleConstructorReturn(this, (ReachedMaxPages.__proto__ || Object.getPrototypeOf(ReachedMaxPages)).call(this));

    _this3.nextPage = nextPage;
    _this3.nrResSearched = nrResSearched;
    return _this3;
  }

  return ReachedMaxPages;
}(Result);

// some kind of error


var Err = exports.Err = function (_Result4) {
  _inherits(Err, _Result4);

  function Err(err) {
    _classCallCheck(this, Err);

    var _this4 = _possibleConstructorReturn(this, (Err.__proto__ || Object.getPrototypeOf(Err)).call(this));

    _this4.err = err;
    return _this4;
  }

  return Err;
}(Result);

// cancelled because of previous error


var Cancelled = exports.Cancelled = function (_Result5) {
  _inherits(Cancelled, _Result5);

  function Cancelled() {
    _classCallCheck(this, Cancelled);

    return _possibleConstructorReturn(this, (Cancelled.__proto__ || Object.getPrototypeOf(Cancelled)).apply(this, arguments));
  }

  return Cancelled;
}(Result);

//  FINISHED WITH CLASSES
///////////////////////////////////////////////////////////////////////////


// time of last request


var lastRequestTime = void 0;

// returns a promise that resolves after toWait milliseconds
function resolveAfterDelay(toWait) {
  return new Promise(function (resolve) {
    setTimeout(function () {
      resolve();
    }, Math.max(0, toWait));
  });
}

function getStats($page) {

  var pageStats = new ResStats();
  // find num of results
  var match = $page('#resultStats').text().match(/ ([0-9,]+) results/);
  if (!match) {
    throw new Error('Format of results stats not as expected');
  }

  pageStats.nrResults = parseInt(match[1].replace(/,/, ''));
  return pageStats;
}

// make request options for url
function makeReqOptsForUrl(url) {
  //  note that {...obj} clones obj
  var configReqOpts = config.reqOpts ? _extends({}, config.reqOpts) : {};
  var reqOpts = Object.assign(configReqOpts, {
    uri: url,
    jar: true, //  remember cookies!
    //  statuses other than 2xx reject the promise (this is actually
    //  true by default, anyway)
    simple: true,
    //  resolve promise with full response since we use transform2xxOnly
    //  and !simple, this will actually only apply to promise rejections
    resolveWithFullResponse: true
  });
  var qsOpts = { num: 100 };
  // let us add to/replace, rather than completely overwrite, qs opts
  if (reqOpts.qs) {
    Object.assign(reqOpts.qs, qsOpts);
  } else {
    reqOpts.qs = qsOpts;
  }
  // console.log('reqOpts:', reqOpts)
  return reqOpts;
}

// make request options for terms
function makeReqestOptsForTerms(terms) {
  var queryString = _qs2.default.stringify({
    q: terms
    // the format parameter makes ' ' into '+' instead of '%20'
  }, { format: 'RFC1738' });
  var url = `https://www.google.com/search?${queryString}`;
  return makeReqOptsForUrl(url);
}

// return an appropriate error message for an error err thrown by
// googlekeywordranking
function genErrMsg(err) {
  var msgStart = void 0; // start of error message
  var msgEnd = void 0; // end of error message

  if (err instanceof _errors2.default.StatusCodeError) {
    msgStart = `StatusCodeError error: ${err.statusCode}`;
    msgEnd = `\n*Content*\n${err.error}`;
  } else if (err instanceof _errors2.default.RequestError) {
    msgStart = `Request error: ${err.error.message}`;
    msgEnd = `\n*With stack*\n${err.error.stack}`;
  }

  var msgMiddle = void 0; // middle part of message
  //  I think processPageInput should always be set, but just in case
  if (err.processPageInput) {
    var i = err.processPageInput;
    msgMiddle = `While retrieving: ${i.url}` + `\nPage nr: ${i.pageNr}` + `\nResult nr. on page: ${i.curResNr - i.pageNr}`;
  }

  return (msgStart ? `$(msgStart)\n` : '') + msgMiddle + (msgEnd ? `\n$(msgEnd)` : '');
};;
//# sourceMappingURL=googlekeywordranking.js.map