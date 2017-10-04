#!/usr/bin/node
'use strict';

var main = function () {
  var _ref = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee() {
    var searchTerms, urlRegex, maxPagesToSearch, _debugHtmlArray, useDebugHtmlArray, outputFile, file, res;

    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:

            if (!(process.argv.length >= 4 && process.argv.length <= 5)) {
              console.error(`Usage: ${_path2.default.basename(process.argv[1])}` + ' searchTerms urlRegex [maxPagesToSearch]' + '\nwhere searchTerms are the terms to search for and' + '\nurlRegex is the URL as a regular expression');
              process.exit(1);
            }

            searchTerms = process.argv[2];
            urlRegex = new RegExp(process.argv[3], 'i');
            maxPagesToSearch = 4;

            if (process.argv.length === 5) {
              maxPagesToSearch = parseInt(process.argv[4]);
            }

            _debugHtmlArray = null;
            useDebugHtmlArray = false;

            if (!useDebugHtmlArray) {
              _context.next = 18;
              break;
            }

            outputFile = './daniel ganc - Google Search.html';
            _context.next = 11;
            return _fs2.default.open(outputFile, 'r');

          case 11:
            file = _context.sent;
            _context.next = 14;
            return _fs2.default.readFile(file);

          case 14:
            _context.t0 = _context.sent.toString();
            _debugHtmlArray = [_context.t0];
            _context.next = 18;
            return _fs2.default.close(file);

          case 18:
            _context.prev = 18;
            _context.next = 21;
            return _googlekeywordranking2.default.getRanking({
              searchTerms, urlRegex, maxPagesToSearch, _debugHtmlArray });

          case 21:
            res = _context.sent;

            printResultAndExit(res);
            _context.next = 28;
            break;

          case 25:
            _context.prev = 25;
            _context.t1 = _context['catch'](18);

            printErrAndExit(_context.t1);

          case 28:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this, [[18, 25]]);
  }));

  return function main() {
    return _ref.apply(this, arguments);
  };
}();

var _fs = require('mz/fs');

var _fs2 = _interopRequireDefault(_fs);

var _errors = require('request-promise-native/errors');

var _errors2 = _interopRequireDefault(_errors);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _sourceMapSupport = require('source-map-support');

var _sourceMapSupport2 = _interopRequireDefault(_sourceMapSupport);

var _googlekeywordranking = require('./googlekeywordranking.js');

var _googlekeywordranking2 = _interopRequireDefault(_googlekeywordranking);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

//  Copyright 2017 Jonathan Ganc
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


// command line version of googlekeywordranking

_sourceMapSupport2.default.install();

var Result = _googlekeywordranking2.default.Result;
var RegexFound = _googlekeywordranking2.default.RegexFound;
var NotFound = _googlekeywordranking2.default.NotFound;
var ReachedMaxPages = _googlekeywordranking2.default.ReachedMaxPages;

//  print res and exit
//
//  exit code in parenthesis, output is printed on different lines
//  if result found (0):
//    prints: ranking; URL of page where found
//  if result not found and no more search results (100):
//    prints: number of results search
//  if result not found before maximum number of pages to search (101):
//    prints: number of results search; URL of next search page
function printResultAndExit(res) {
  if (!(res instanceof Result)) {
    throw new Error(`res should be an instance of Result: ${res}`);
  } else if (res instanceof RegexFound) {
    console.log(res.ranking);
    console.log(res.url);
    process.exit(0);
  } else if (res instanceof NotFound) {
    process.exit(100);
  } else if (res instanceof ReachedMaxPages) {
    console.log(res.nrResSearched);
    console.log(res.nextPage);
    process.exit(101);
  }
}

//  print an error message for err and exit
//
//  exit code in parenthesis, output is printed on different lines
//  RequestError (1)
//  StatusCodeError (2)
//  if result not found and no more search results (100):
//    prints: number of results search
//  if result not found before maximum number of pages to search (101):
//    prints: number of results search; URL of next search page
function printErrAndExit(err) {
  console.error(_googlekeywordranking2.default.genErrMsg(err));

  // rethrow the error?
  var rethrow = true;
  // exit status code
  var exitState = -1;

  if (err instanceof _errors2.default.StatusCodeError) {
    rethrow = false;
    exitState = 1;
  } else if (err instanceof _errors2.default.RequestError) {
    rethrow = false;
    exitState = 2;
  }

  if (rethrow) throw err;
  process.exit(exitState);
}

main();
//# sourceMappingURL=gkr.js.map