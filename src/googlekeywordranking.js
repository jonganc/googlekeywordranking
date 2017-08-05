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

import urlLib from 'url';
import request from 'request-promise-native';
import requestErrors from 'request-promise-native/errors';
import SourceMapSupport from 'source-map-support';
import qs from 'qs';
import $ from 'cheerio';
import nconf from 'nconf';

SourceMapSupport.install();

// the config file
let config;
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
export const minRequestDelay = 10000;
// exports.minRequestDelay = minRequestDelay;
// const minRequestDelay = 1;

//////////////////////////////////////////////////////////////////////////
//  DEFINE CLASSES

//  stats about the result
export class ResStats {
  constructor(nrResults) {
    // number of results
    this.nrResults = nrResults;
  }
}

//  a class to wrap either the result or the reason for failure
//
//  we set nrResults on the first page (for some reason)
export class Result {
  constructor() {
    this.stats = null;
  }

  // function for adding stats
  setStats(stats) {
    this.stats = stats;
  }
}

export class RegexFound extends Result {
  constructor(ranking, url) {
    super();
    this.ranking = ranking;
    this.url = url;
  }
}

// reaches end of results and regex still not found
// nrResSearched: number of results searched
export class NotFound extends Result {
  constructor(nrResSearched) {
    super();
    this.nrResSearched = nrResSearched;
  }
}

//  Meaning: there were more links but we were forbidden from searching them
//  due to maxPagesToSearch
//  nextPage: link to the next page
export class ReachedMaxPages extends Result {
  constructor(nextPage, nrResSearched) {
    super();
    this.nextPage = nextPage;
    this.nrResSearched = nrResSearched;
  }
}

// some kind of error
export class Err extends Result {
  constructor(err) {
    super();
    this.err = err;
  }
}

// cancelled because of previous error
export class Cancelled extends Result {
}

//  FINISHED WITH CLASSES
///////////////////////////////////////////////////////////////////////////


// time of last request
let lastRequestTime;

// returns a promise that resolves after toWait milliseconds
export function resolveAfterDelay(toWait) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, Math.max(0, toWait));
  });
}

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
async function processPage(input) {

  if (!(typeof input === 'object'
         && input.requestOpts && input.urlRegex && input.maxPagesToSearch)) {
    throw new Error('processPage called without needed options');
  }

  const defaults = {
    pageNr: 1,
    curResNr: 0,
    reqContext: null,
    _debugHtmlArray: null,
  };

  let { requestOpts, urlRegex, maxPagesToSearch,
       pageNr, curResNr, _debugHtmlArray}
      = Object.assign(defaults, input);

  // console.log(
  //   '{ requestOpts, urlRegex, maxPagesToSearch,'
  //     + ' pageNr, curResNr, _debugHtmlArray}:',
  //   { requestOpts, urlRegex, maxPagesToSearch,
  //     pageNr, curResNr, _debugHtmlArray});

  let response;
  if (! _debugHtmlArray) {
    try {
      const curTime = new Date();
      if (lastRequestTime) {
        await resolveAfterDelay(
          minRequestDelay
            - (curTime.getTime() - lastRequestTime.getTime()));
      }
      lastRequestTime = new Date();
      response = await request(requestOpts);
    } catch (e) {
      // add current input to error and then rethrow
      e.processPageInput = input;
      throw (e);
    }
  } else {
    // we simulate enough of a response object for our purposes
    response = {
      body: _debugHtmlArray.pop(),
      request: {
        href: `_debugHtmlArray page ${pageNr}`
      }
    };
  }

  const $page = $.load(response.body);
  const reqUrl = response.request.href;

  //  get stats if we are on the first page
  let stats;
  if (pageNr === 1) stats = getStats($page);

  try {
    $page('.g').each(/* @this elt */function() {
      const $res = $(this);
      //  it turns out that we only want the results which have the class 'g'
      //  and only the class 'g'
      if (! ($res.attr('class') === 'g' && ! $res.attr('id'))) {
        return;
      }

      curResNr++;
      if ($res.find('cite').text().replace(/›.*/, '').match(urlRegex)) {
        throw new RegexFound(curResNr, reqUrl);
      }
    });
    
    //  we've searched through all links on this page and not found result

    // next, let us check for more page links
    let next = $page('#pnnext').attr('href');
    if (next) {
      next = urlLib.resolve(reqUrl, next);
      
      //  if we are not allowed to search more pages, notify that
      if (pageNr + 1 > maxPagesToSearch) {
        throw new ReachedMaxPages(next, curResNr);
      }
      
      // otherwise, proceed to next page.
      // we rethrow the result so that we can ad stats if needed
      throw await processPage({
        requestOpts: makeReqOptsForUrl(next),
        urlRegex,
        maxPagesToSearch,
        pageNr: pageNr + 1,
        curResNr,
        _debugHtmlArray
      });
    } else {
      // no more links
      throw new NotFound(curResNr);
    }
    // eslint-disable-next-line no-unreachable
    throw new Error('Should never reach this point');
  } catch (e) {
    // if we caught a result, pass it along
    if (e instanceof Result) {
      if (pageNr === 1) e.setStats(stats);
      return e;
    }
    // rethrow other errors, adding options and curResNr
    e.processPageInput = input;
    e.curResNr = curResNr;
    throw e;
  }
}

function getStats($page) {

  const pageStats = new ResStats();
  // find num of results
  let match = $page('#resultStats').text().match(/ ([0-9,]+) results/);
  if (!match) {
    throw new Error('Format of results stats not as expected');
  }

  pageStats.nrResults = parseInt(match[1].replace(/,/, ''));
  return pageStats;
}

// make request options for url
function makeReqOptsForUrl(url) {
  //  note that {...obj} clones obj
  const configReqOpts = config.reqOpts ? {...config.reqOpts} : {};
  const reqOpts = Object.assign(configReqOpts, {
    uri: url,
    jar: true,  //  remember cookies!
    //  statuses other than 2xx reject the promise (this is actually
    //  true by default, anyway)
    simple: true,
    //  resolve promise with full response since we use transform2xxOnly
    //  and !simple, this will actually only apply to promise rejections
    resolveWithFullResponse: true,
  });
  const qsOpts = { num: 100 };
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
  const queryString = qs.stringify({
    q: terms
    // the format parameter makes ' ' into '+' instead of '%20'
  }, {format: 'RFC1738'});
  const url = `https://www.google.com/search?${queryString}`;
  return makeReqOptsForUrl(url);
}

// return an appropriate error message for an error err thrown by
// googlekeywordranking
export function genErrMsg(err) {
  let msgStart;  // start of error message
  let msgEnd;    // end of error message

  if (err instanceof requestErrors.StatusCodeError) {
    msgStart = `StatusCodeError error: ${err.statusCode}`;
    msgEnd = `\n*Content*\n${err.error}`;
  } else if (err instanceof requestErrors.RequestError) {
    msgStart = `Request error: ${err.error.message}`;
    msgEnd = `\n*With stack*\n${err.error.stack}`;
  }

  let msgMiddle; // middle part of message
  //  I think processPageInput should always be set, but just in case
  if (err.processPageInput) {
    const i = err.processPageInput;
    msgMiddle = `While retrieving: ${i.url}`
      + `\nPage nr: ${i.pageNr}`
      + `\nResult nr. on page: ${i.curResNr - i.pageNr}`;
  }

  return (
    (msgStart ? `$(msgStart)\n` : '') + msgMiddle
      + (msgEnd ? `\n$(msgEnd)` : ''));
};

// returns a result object indicating where the term was found
export async function getRanking({
  searchTerms, urlRegex,
  maxPagesToSearch = 4, _debugHtmlArray = null}) {
  let result;
  try {
    result = 
      await processPage({
        requestOpts: makeReqestOptsForTerms(searchTerms),
        urlRegex,
        maxPagesToSearch,
        _debugHtmlArray
      });
  } catch (err) {
    result = new Err(err);
  }
  return result;
}

// takes an array of objects, passing them each to getRanking. If any of
// them returns Error, all subsequent requests return Cancelled
export async function getRankingArr(arr) {
  // indicates if any of the attempts so far have failed
  let failed = false;
  return Promise.all(arr.map(async (searchOpts) => {
    if (failed) {
      return new Cancelled();
    }
    const result = await getRanking(searchOpts);
    if (result instanceof Err) {
      failed = true;
    }
    return result;
  }));
};
