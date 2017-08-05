#!/usr/bin/env node
'use strict';

//  save the output array to OUTPUTOBJ non-destructively, padding each line
//  to have the same of lines.
//
//  OUTPUTOBJ is an object { outputFile, outputPath, colHeaders }.
//
//  It is assumed that OUTPUTFILE is an open file descriptor to OUTPUTPATH.
//  It will be closed and reopened over the course of this function.
//  We do this to try and  keep OUTPUTPATH always in use.
//  COLHEADERS is save to first row after REQUIREDHEADER
var saveOutput = function () {
  var _ref = _asyncToGenerator(regeneratorRuntime.mark(function _callee(outputObj, output) {
    var numCols, paddedOutput;
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            numCols = Math.max.apply(Math, _toConsumableArray(output.map(function (line) {
              return line.length;
            })));
            paddedOutput = output.map(function (line) {
              return line.concat(Array(numCols - line.length).fill(''));
            });
            _context.next = 4;
            return _fs2.default.close(outputObj.outputFile);

          case 4:
            _context.next = 6;
            return _fs2.default.open(outputObj.outputPath, 'w');

          case 6:
            outputObj.outputFile = _context.sent;
            _context.next = 9;
            return _fs2.default.write(outputObj.outputFile,
            // eslint-disable-next-line prefer-template
            requiredHeader + '\t' + outputObj.colHeaders.join('\t') + '\n' + paddedOutput.map(function (line) {
              return line.join('\t');
            }).join('\n') + '\n');

          case 9:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this);
  }));

  return function saveOutput(_x, _x2) {
    return _ref.apply(this, arguments);
  };
}();

// return an escaped version of ERR for TSV files
// replace TAB, RET with \t, \n. Not perfect but OK


var main = function () {
  var _ref2 = _asyncToGenerator(regeneratorRuntime.mark(function _callee2() {
    var argv, inputFile, output, outputObj, colHeaders, curCol, err, idx, retries, line, result;
    return regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            // parse arguments
            argv = _yargs2.default.demandCommand(1, 2, 'Please provide an input file', 'Too many commands given').option('d', {
              alias: 'date',
              describe: 'Text used in date column.' + ' By default, it will be the current date in the' + ' format YYYY/MM/DD',
              type: 'string',
              nargs: 1,
              default: function (date) {
                return (
                  /* eslint-disable prefer-template */
                  date.getFullYear() + '/' + ('0' + (date.getMonth() + 1)).slice(-2) + '/' + ('0' + date.getDate()).slice(-2)
                );
              }(new Date())
              /* eslint-enable prefer-template */
            }).strict().argv;
            _context2.next = 3;
            return _fs2.default.open(argv._[0], 'r');

          case 3:
            inputFile = _context2.sent;
            _context2.next = 6;
            return _fs2.default.readFile(inputFile);

          case 6:
            output = _context2.sent.toString();
            _context2.next = 9;
            return _fs2.default.close(inputFile);

          case 9:

            //  see saveOutput for more about outputObj
            outputObj = {};

            if (argv._.length === 1) {
              outputObj.outputPath = argv._[0];
            } else {
              outputObj.outputPath = argv._[1];
            }

            // check that output has required header

            if (!(output.slice(0, requiredHeader.length) !== requiredHeader)) {
              _context2.next = 13;
              break;
            }

            throw new Error(`${outputObj.outputPath} missing expected header: ${requiredHeader}`);

          case 13:

            // split output
            output = output.toString().split('\n').filter(function (line) {
              return line !== '';
            }).map(function (line) {
              return dropTrailingBlanks(line.split('\t'));
            });

            //  first row is a header row.
            //  any columns after the first three represent the col headers
            colHeaders = outputObj.colHeaders = output.shift().slice(3);
            curCol = colHeaders.findIndex(function (date) {
              return date === argv.d;
            });
            // date not found

            if (curCol === -1) {
              colHeaders.push(argv.d);
              curCol = colHeaders.length - 1;
            }
            // move past 3 header rows
            curCol += 3;

            //  Add 'to search for' to all lines if not present
            //
            //  First line must have 'url regex', 'max pages' defined

            if (!(output[0].length < 3)) {
              _context2.next = 20;
              break;
            }

            throw new Error('The first settings line must have at least 3 columns');

          case 20:
            _context2.next = 22;
            return _fs2.default.open(outputObj.outputPath, 'w');

          case 22:
            outputObj.outputFile = _context2.sent;
            _context2.next = 25;
            return saveOutput(outputObj, output);

          case 25:

            //  Fill in any blank settings
            output.forEach(function (curVal, idx) {
              if (curVal.length === 1) {
                curVal.push(output[idx - 1][1]);
              }
              if (curVal.length === 2) {
                curVal.push(output[idx - 1][2]);
              }
              var parsedMaxPages = parseInt(curVal[2]);
              if (isNaN(parsedMaxPages)) {
                throw new Error(`request ${idx} -- with search term '${curVal[0]}' --` + ` has a non-parseable max pages: ${curVal[2]}`);
              }
              curVal[2] = parsedMaxPages;
            });

            err = null;
            _context2.prev = 27;
            idx = 0;
            retries = 0;
            // the code for searching for terms

          case 30:
            if (!(idx < output.length)) {
              _context2.next = 71;
              break;
            }

            line = output[idx];

            if (!(!line[curCol] || ['E', 'C'].includes(line[curCol][0]))) {
              _context2.next = 67;
              break;
            }

            console.log(`looking up: ${line.slice(0, 3)}`);
            _context2.next = 36;
            return gkr.getRanking({
              searchTerms: line[0],
              urlRegex: line[1],
              maxPagesToSearch: line[2]
            });

          case 36:
            result = _context2.sent;

            if (!(result instanceof gkr.RegexFound)) {
              _context2.next = 41;
              break;
            }

            // add new elements
            line[curCol] = result.ranking;
            _context2.next = 60;
            break;

          case 41:
            if (!(result instanceof gkr.NotFound)) {
              _context2.next = 45;
              break;
            }

            // add new elements
            line[curCol] = 'N' + result.nrResSearched;
            _context2.next = 60;
            break;

          case 45:
            if (!(result instanceof gkr.ReachedMaxPages)) {
              _context2.next = 49;
              break;
            }

            // add new elements
            line[curCol] = 'M' + result.nrResSearched;
            _context2.next = 60;
            break;

          case 49:
            if (!(result instanceof gkr.Err)) {
              _context2.next = 59;
              break;
            }

            //  retry after delay unless we've exceeded max retries
            retries += 1;

            if (!(retries < maxRetries)) {
              _context2.next = 56;
              break;
            }

            console.log(`#${retries}: waiting ${waitAfterError / 1000} seconds` + ` before retrying because of error: ${result.err}`);
            _context2.next = 55;
            return gkr.resolveAfterDelay(waitAfterError);

          case 55:
            return _context2.abrupt('continue', 30);

          case 56:
            line[curCol] = 'E' + escapeErr(String(result.err));
            _context2.next = 60;
            break;

          case 59:
            line[curCol] = 'EUnknown result code.';

          case 60:
            _context2.next = 62;
            return saveOutput(outputObj, output);

          case 62:
            if (!(line[curCol][0] === 'E')) {
              _context2.next = 64;
              break;
            }

            throw new Error(`googlekeywordranking error on line ${idx}:` + ` ${line[curCol].slice(1)}`);

          case 64:
            if (!(idx + 1 < output.length)) {
              _context2.next = 67;
              break;
            }

            _context2.next = 67;
            return gkr.resolveAfterDelay(gkr.minRequestDelay);

          case 67:
            // move to next line
            retries = 0;
            idx += 1;
            _context2.next = 30;
            break;

          case 71:
            _context2.next = 76;
            break;

          case 73:
            _context2.prev = 73;
            _context2.t0 = _context2['catch'](27);

            err = _context2.t0;

          case 76:
            _context2.prev = 76;
            _context2.next = 79;
            return _fs2.default.close(outputObj.outputFile);

          case 79:
            return _context2.finish(76);

          case 80:
            if (!err) {
              _context2.next = 82;
              break;
            }

            throw err;

          case 82:
          case 'end':
            return _context2.stop();
        }
      }
    }, _callee2, this, [[27, 73, 76, 80]]);
  }));

  return function main() {
    return _ref2.apply(this, arguments);
  };
}();

// a wrapper to catch errors


var mainWrapper = function () {
  var _ref3 = _asyncToGenerator(regeneratorRuntime.mark(function _callee3() {
    return regeneratorRuntime.wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            _context3.prev = 0;
            _context3.next = 3;
            return main();

          case 3:
            _context3.next = 8;
            break;

          case 5:
            _context3.prev = 5;
            _context3.t0 = _context3['catch'](0);

            console.log(_context3.t0);

          case 8:
          case 'end':
            return _context3.stop();
        }
      }
    }, _callee3, this, [[0, 5]]);
  }));

  return function mainWrapper() {
    return _ref3.apply(this, arguments);
  };
}();

var _fs = require('mz/fs');

var _fs2 = _interopRequireDefault(_fs);

var _yargs = require('yargs');

var _yargs2 = _interopRequireDefault(_yargs);

var _googlekeywordranking = require('./googlekeywordranking.js');

var gkr = _interopRequireWildcard(_googlekeywordranking);

var _sourceMapSupport = require('source-map-support');

var _sourceMapSupport2 = _interopRequireDefault(_sourceMapSupport);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

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


//  Input is a tsv file..
//  The first three columns specify the terms to search for (described
//    below).  The remaining columns give the ranking on a particular date.
//  The first row is a heading row. The first three columns of the first
//    row are ignored. The next columns are dates in the format YYYY/MM/DD,
//    indicating the date for the rankings in that column.
//
//  The settings: The first three columns are
//   1) search term: what is looked up in Google, e.g. 'sinus boca raton'
//   2) url regex: a regex for what is searched for in the url,
//      e.g. 'danielgancmd\.com'
//   3) max result pages to download
//  If a line has only one or two columns, the previous value of
//    'search term', 'max result pages' is used. Thus, the first line must
//    have three columns at least.
//
//  If the program is rerun for an already existing date, only blank or
//    error columns are changed.
//
//  Result column explanations
//    [ranking]           - the term's ranking
//    N[results searched] - the term was not found after searching
//                          through all search results returned.
//                          [results searched] terms were given.
//    M[results searched] - the term was not found after loading the
//                          maximum allowed number of pages.
//                          [results searched] terms were searched.
//    E[error object]     - an error occurred. Following the 'E' will be
//                          the error message

//  usage:
//    gkr-tsv [-d|--date DATE] inputfile [outputfile]
//
//  If no outputfile is given, the inputfile is edited in place.
//
//  Usually, the current date is used. However, the date option allows
//    different text (it need not even be a date) to be used for the date
//    row.

_sourceMapSupport2.default.install();

var requiredHeader = 'search term\turl regex\tmax result pages';

// how long to wait to retry after an error
var waitAfterError = 180000;
var maxRetries = 3;

//  Drop the trailing blank elements (i.e. '') in ARR
//  This is not destructive.
function dropTrailingBlanks(arr) {
  // split on tabs and drop trailing blanks
  var arrRevd = arr.slice().reverse();
  while (arrRevd[0] === '') {
    arrRevd.shift();
  }
  return arrRevd.reverse();
}function escapeErr(err) {
  return err.replace(/\t/, '\\t').replace(/\n/, '\\n');
}

module.exports = mainWrapper;

// try {
//   main();
// } catch (err) {
//   console.log('hi');
//   throw new Error('the error' + String(err));
// }
//# sourceMappingURL=gkr-tsv.js.map