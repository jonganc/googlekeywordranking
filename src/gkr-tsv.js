#!/usr/bin/env node

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

import fs from 'mz/fs';
import yargs from 'yargs';
import * as gkr from './googlekeywordranking.js';
import SourceMapSupport from 'source-map-support';

SourceMapSupport.install();

const requiredHeader = 'search term\turl regex\tmax result pages';

// how long to wait to retry after an error
const waitAfterError = 180000;
const maxRetries = 3;

//  Drop the trailing blank elements (i.e. '') in ARR
//  This is not destructive.
function dropTrailingBlanks(arr) {
  // split on tabs and drop trailing blanks
  const arrRevd = arr.slice().reverse();
  while (arrRevd[0] === '') {
    arrRevd.shift();
  }
  return arrRevd.reverse();
}

//  save the output array to OUTPUTOBJ non-destructively, padding each line
//  to have the same of lines.
//
//  OUTPUTOBJ is an object { outputFile, outputPath, colHeaders }.
//
//  It is assumed that OUTPUTFILE is an open file descriptor to OUTPUTPATH.
//  It will be closed and reopened over the course of this function.
//  We do this to try and  keep OUTPUTPATH always in use.
//  COLHEADERS is save to first row after REQUIREDHEADER
async function saveOutput(outputObj, output) {
  const numCols = Math.max(...output.map( (line) => line.length ));
  
  const paddedOutput = output.map(
    (line) => line.concat(Array(numCols - line.length).fill('')));

  await fs.close(outputObj.outputFile);
  outputObj.outputFile = await fs.open(outputObj.outputPath, 'w');
  await fs.write(outputObj.outputFile,
                 // eslint-disable-next-line prefer-template
                 requiredHeader + '\t'
                 + outputObj.colHeaders.join('\t') + '\n'
                 + paddedOutput.map(
                   (line) => (line).join('\t')).join('\n') + '\n');
}

// return an escaped version of ERR for TSV files
// replace TAB, RET with \t, \n. Not perfect but OK
function escapeErr(err) {
  return err.replace(/\t/, '\\t').replace(/\n/, '\\n');
}

async function main() {
  // parse arguments
  const argv = yargs
        .demandCommand(
          1, 2,
          'Please provide an input file', 'Too many commands given')
        .option('d', {
          alias: 'date',
          describe:
          'Text used in date column.'
            + ' By default, it will be the current date in the'
            + ' format YYYY/MM/DD',
          type: 'string',
          nargs: 1,
          default: (
            (date) => 
              /* eslint-disable prefer-template */
              date.getFullYear()
              + '/' + ('0' + (date.getMonth() + 1)).slice(-2)
              + '/' + ('0' + date.getDate()).slice(-2))(new Date()),
          /* eslint-enable prefer-template */
        })
        .strict()
        .argv;

  const inputFile = await fs.open(argv._[0], 'r');
  // the processed input is the output
  let output = (await fs.readFile(inputFile)).toString();
  await fs.close(inputFile);

  //  see saveOutput for more about outputObj
  let outputObj = {};
  if (argv._.length === 1) {
    outputObj.outputPath = argv._[0];
  } else {
    outputObj.outputPath = argv._[1];
  }

  // check that output has required header
  if (output.slice(0, requiredHeader.length) !== requiredHeader) {
    throw new Error(
      `${outputObj.outputPath} missing expected header: ${requiredHeader}`);
  }

  // split output
  output = output.toString().split('\n')
    .filter( (line) => line !== '')
    .map( (line) => dropTrailingBlanks(line.split('\t')) );
  
  //  first row is a header row.
  //  any columns after the first three represent the col headers
  const colHeaders = outputObj.colHeaders = output.shift().slice(3);

  let curCol = colHeaders.findIndex( (date) => date === argv.d);
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
  if (output[0].length < 3) {
    throw new Error('The first settings line must have at least 3 columns');
  }

  //  open output and write what we have
  outputObj.outputFile = await fs.open(outputObj.outputPath, 'w');
  await saveOutput(outputObj, output);

  //  Fill in any blank settings
  output.forEach(
    (curVal, idx) => {
      if (curVal.length === 1) {
        curVal.push(output[idx - 1][1]);
      }
      if (curVal.length === 2) {
        curVal.push(output[idx - 1][2]);
      }
      const parsedMaxPages = parseInt(curVal[2]);
      if (isNaN(parsedMaxPages)) {
        throw new Error(
          `request ${idx} -- with search term '${curVal[0]}' --`
            + ` has a non-parseable max pages: ${curVal[2]}`);
      }
      curVal[2] = parsedMaxPages;
    });

  let err = null;
  try {
    let idx = 0;
    let retries = 0;
    // the code for searching for terms
    while (idx < output.length) {
      const line = output[idx];
      if (!line[curCol] || ['E', 'C'].includes(line[curCol][0])) {
        console.log(`looking up: ${line.slice(0, 3)}`);
        const result = await gkr.getRanking({
          searchTerms: line[0],
          urlRegex: line[1],
          maxPagesToSearch: line[2],
        });
        /* eslint-disable prefer-template */
        if (result instanceof gkr.RegexFound) {
          // add new elements
          line[curCol] = result.ranking;
        } else if (result instanceof gkr.NotFound) {
          // add new elements
          line[curCol] = 'N' + result.nrResSearched;
        } else if (result instanceof gkr.ReachedMaxPages) {
          // add new elements
          line[curCol] = 'M' + result.nrResSearched;
        } else if (result instanceof gkr.Err) {
          //  retry after delay unless we've exceeded max retries
          retries += 1;
          if (retries < maxRetries) {
            console.log(
              `#${retries}: waiting ${waitAfterError/1000} seconds`
              + ` before retrying because of error: ${result.err}`);
            await gkr.resolveAfterDelay(waitAfterError);
            continue;
          }
          line[curCol] = 'E' + escapeErr(String(result.err));
        } else {
          line[curCol] = 'EUnknown result code.';
        }
        /* eslint-enable prefer-template */

        // save output
        await saveOutput(outputObj, output);
        if (line[curCol][0] === 'E') {
          throw new Error(
            `googlekeywordranking error on line ${idx}:`
              + ` ${line[curCol].slice(1)}`);
        }
        
        // if we are not on the last one, delay before moving on
        if (idx + 1 < output.length) {
          await gkr.resolveAfterDelay(gkr.minRequestDelay);
        }
      }
      // move to next line
      retries = 0;
      idx += 1;
    }
  } catch (e) {
    err = e;
  } finally {
    await fs.close(outputObj.outputFile);
  }

  if (err) throw err;
}

// a wrapper to catch errors
async function mainWrapper() {
  try {
    await main();
  } catch (err) {
    console.log(err);
  }
}

module.exports = mainWrapper;

// try {
//   main();
// } catch (err) {
//   console.log('hi');
//   throw new Error('the error' + String(err));
// }
