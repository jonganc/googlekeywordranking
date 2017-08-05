<!-- 
    Copyright 2017 Jonathan Ganc
    
    This file is part of googlekeywordranking.
  
    googlekeywordranking is free software: you can redistribute it and/or
    modify it under the terms of the GNU General Public License as
    published by the Free Software Foundation, either version 3 of the
    License, or (at your option) any later version.
  
    Foobar is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.
  
    You should have received a copy of the GNU General Public License
    along with Foobar.  If not, see <http:  www.gnu.org/licenses/>.
 -->
# Google Keyword Ranking
Get the ranking of a different url for certain keywords in Google.

**Use responsibly. Please don't spam Google.**

Using this is quite straightforward. You will node.js v4.3+ installed for this to work.

1. First, clone the repository:<br><br>`git clone https://github.com/jonganc/googlekeywordranking.git`
    
2. Change to the directory, set permissions:<br><br>`cd googlekeywordranking && chmod +x gkr-tsv`
    
3. Install requirements:<br><br>`npm install`
    
4. Run the program as desired. E.g.:<br><br>`./gkr-tsv example.tsv`

Google Keyword Ranking will then lookup the rankings specified in example.tsv, saving the results to that file.

**It will be slow. This is not because there is any great computation happening; there isn't. There is an explicit, long delay between requests. Google doesn't like lots of quick requests.**

And after all this work, you will get... _the wrong result_. Why? I'll give you a hint: by default, _node request does not set the user-agent header_. However, you can manually add headers by [setting options in config.js](#other-options).

## the example

An example input file (where `⇥` is a tab character):

    search term ⇥     url regex ⇥         max result pages
    football teams ⇥  (^|\.|/)und\.com ⇥  4
    university ⇥      (^|\.|/)cmu\.edu ⇥  4

This will become, e.g. 

    search term ⇥     url regex ⇥         max result pages ⇥  2017/08/05
    football teams ⇥  (^|\.|/)und\.com ⇥  4 ⇥                 101
    university ⇥      (^|\.|/)cmu\.edu ⇥  4 ⇥                 128

indicating that und.com is the 101st result for 'football teams' and cmd.edu is the 128th result for 'university'.

## syntax

The full syntax is

    gkr-tsv [-d|--date DATE] INPUTFILE [OUTPUTFILE]

### -d | --d DATE

Ordinarily, gkr-tsv will use the current date. If there are already results for the current date, it will try to fill in any errors or blanks. Using `--date`, you can manually specify the date. Actually "date" is a misnomer. DATE can be any string.

### OUTPUTFILE

If OUTPUTFILE is given, output is saved there instead of in INPUTFILE.

## tsv format

The input file should be a tab separated document (i.e. a TSV). See `example.tsv` for an example input file.

The first row is a header row. The first three columns of the first row **must be**

    search term⇥url regex⇥max result pages

replacing `⇥` with the tab character. The next columns are dates; the default format is YYYY/MM/DD. As mentioned above, though, if the `--date` option is used, the headers might be any string.

Each subsequent row is one search term. The first three columns specify the settings for that term. The remaining columns give the ranking on a particular date.

The settings for each term are:
1. search term: what is looked up in Google, e.g. 'sinus boca raton'
2. url regex: a regex for what is searched for in the url, e.g. 'danielgancmd\.com'
3. max result pages to download

If a line has only one or two columns, the previous value of 'search term', 'max result pages' is used. Thus, the first line must have three columns at least.

## output format

The output possiblities for a given column are:
- _[ranking]_: the term's ranking
- _N[results searched]_: the term was not found after searching through all search results returned. [results searched] terms were given.
- _M[results searched]_: the term was not found after loading the maximum allowed number of pages. [results searched] terms were searched.
- _E[error object]_: an error occurred. Following the 'E' will be the error message. This is not currently very elegant.

## other options

Other options can be placed in a config.js file in the repo main directory (see config-template.js). config.js should export an object (using `module.exports`), with keys for different options. Right now, the only meaningful setting is `reqOpts`.

Example config.js:

    module.exports = {
      reqOpts: {
        gzip: true,
        headers: {
          x-custom-header: 'abcdef'
        }
      }
    }

### reqOpts

These options are added to the options object passed to [node's request module](https://github.com/request/request).

