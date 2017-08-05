#!/usr/bin/node

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

import fs from 'mz/fs';
import requestErrors from 'request-promise-native/errors';
import path from 'path';
import SourceMapSupport from 'source-map-support';

import googlekeywordranking from './googlekeywordranking.js';

SourceMapSupport.install();

const Result = googlekeywordranking.Result;
const RegexFound = googlekeywordranking.RegexFound;
const NotFound = googlekeywordranking.NotFound;
const ReachedMaxPages = googlekeywordranking.ReachedMaxPages;

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
  console.error(googlekeywordranking.genErrMsg(err));

  // rethrow the error?
  let rethrow = true;
  // exit status code
  let exitState=-1;
  
  if (err instanceof requestErrors.StatusCodeError) {
    rethrow = false;
    exitState = 1;
  } else if (err instanceof requestErrors.RequestError) {
    rethrow = false;
    exitState = 2;
  }

  if (rethrow) throw (err);
  process.exit(exitState);
}

async function main() {

  if (!(process.argv.length >= 4 && process.argv.length <= 5) ) {
    console.error(
      `Usage: ${path.basename(process.argv[1])}`
        + ' searchTerms urlRegex [maxPagesToSearch]'
        + '\nwhere searchTerms are the terms to search for and'
        + '\nurlRegex is the URL as a regular expression');
    process.exit(1);
  }

  const searchTerms = process.argv[2];
  const urlRegex = new RegExp(process.argv[3], 'i');
  let maxPagesToSearch = 4;
  if (process.argv.length === 5) {
    maxPagesToSearch = parseInt(process.argv[4]);
  }
  
  let _debugHtmlArray = null;
  let useDebugHtmlArray = false;
  if (useDebugHtmlArray) {
    const outputFile = './daniel ganc - Google Search.html';
    const file = await fs.open(outputFile, 'r');
    _debugHtmlArray = [(await fs.readFile(file)).toString()];
    await fs.close(file);
  }

  try {
    const res = await googlekeywordranking.getRanking({
      searchTerms, urlRegex, maxPagesToSearch, _debugHtmlArray});
    printResultAndExit(res);
  } catch (e) {
    printErrAndExit(e);
  }
}

main();
