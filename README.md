# TOC

A Table of Contents for your JavaScript.

<!-- MarkdownTOC -->
- Who is TOCjs for?
- Why use TOCjs?
- What does TOCjs Do?
- How to use TOCjs?
  - TOC Structure and Default Sections
    - SCRIPTS
    - LOCATIONS: Only act When it's appropriate
    - FUNCTIONS
  - Create New TOC Sections (And share them with the community!)
    - ELEMENT_LOCATIONS: Take Actions When An Element Exists
    - SHORTCUTS: Combine locations and files into single terms for readability
    - DATA_LOCATIONS: Take Actions When Cookie Data Matches
    - ANALYTICS: Trigger Custom Analytics When Specific Functions Run
    - EXTERNAL_CONTENT: Dynamically Load HTML Content
    - JSON: Dynamically Load JSON Data
  - Removing boilerplate
  - Common events
  - Errors and Debugging
    - Debug Mode : Errors
    - Debug Mode: Timing
    - Production Mode: Errors
  - Apply TOCjs in Different Scenarios
    - Organize and Integrate Other Developers' Code (i.e., Legacy Code)
    - Have another scenario you don't see here? Ask!
<!-- /MarkdownTOC -->


## Who is TOCjs for?

TOCjs is for Developers.  Specifically those asking:
* How should I orgsnize my JavaScript functions?
* How should I organize my jQuery plugins?
* What's the best way to organize my JavaScript files?
* How can I clean up this legacy JavaScript code?
* How should I integrate vendors' code? (e.g., vendors)
* How should I orgsnize my JavaScript across multiple web sites?

## Why use TOCjs?

## What does TOCjs Do?

## How to use TOCjs?

### TOC Structure and Default Sections

TOC is simple.  There is only one function to call: ```TOC()```, and it accepts one argument: a Table of Contents object ```TOC({})```.
Each Table of Contents object contains sections to organize your code by.  TOC provides some default sections: scripts, locations, and functions, and you can write your own if those don't suit you.  Here's a simple Table of Contents using the defaults:

```JavaScript
TOC({
  SCRIPTS: {},
  LOCATIONS: {},
  FUNCTIONS: {}
});
```

While the table is technically correct, it doesn't do anything.  Let's give it some functionality.

#### SCRIPTS

Let's say we want to load a file called "home.js" that has functions we want on our homepage.  To load it, we just tell SCRIPTS about it:

```JavaScript
TOC({
  SCRIPTS: {
    home_js:{ load:'home.js' }
  },
  LOCATIONS: {},
  FUNCTIONS: {}
});
```

#### LOCATIONS: Only act When it's appropriate

Great! home.js is loading.  But wait!  It's loading everywhere!  It only needs to load on the homepage!  No problem.  First we tell LOCATIONS where the homepage is.

```JavaScript
TOC({
  LOCATIONS: {
    homepage:{ href:'home.html' }
  }
});
```

Then we tell the home.js script to load only on the homepage location.

```JavaScript
TOC({
  SCRIPTS: {
    home_js:{ when:'homepage', load:'home.js' }
  },
  LOCATIONS: {
    homepage:{ href:'home.html' }
  }
});
```

Done!  Now it only loads on the homepage.

#### FUNCTIONS

But wait again!  We want to run some functions in that file after it loads.  The first turns the header blue, and the second is an alert that tells us its color.

```JavaScript
TOC({
  SCRIPTS: {
    home_js:{ when:'homepage', load:'home.js' }
  },
  LOCATIONS: {
    homepage:{ href:'home.html' }
  },
  FUNCTIONS: {
    blueHeader:{ when:'home_js', target:'#header', fn:'makeBlue' },
    alertHeaderColor: { when: 'blueHeader', fn:'alertHeaderColor' }
  }
});
```

Oops.  Nothing happens.  Under the hood, TOC is calling ```$('#header').makeBlue();``` before the browser renders the ```<div id="header"></div>``` element.
No problem!  That's what jQuery's ```$(document).ready()``` is for.  TOC provides a built in "when" event for it, called "dom_ready".  Let's add it.

```JavaScript
TOC({
  SCRIPTS: {
    home_js:{ when:'homepage', load:'home.js' }
  },
  LOCATIONS: {
    homepage:{ href:'home.html' }
  },
  FUNCTIONS: {
    blueHeader:{ when:'home_js', target:'#header', fn:'makeBlue' },
    alertHeaderColor: { when: 'blueHeader', fn:'alertHeaderColor' }
  }
});
```

Now TOC waits for ```$(document).ready()``` before calling ```$('#header').makeBlue();```.  Woo hoo!

That's a simple example. TODO: Make a JSfiddle.

### Create New TOC Sections (And share them with the community!)
#### ELEMENT_LOCATIONS: Take Actions When An Element Exists
#### SHORTCUTS: Combine locations and files into single terms for readability
#### DATA_LOCATIONS: Take Actions When Cookie Data Matches
#### ANALYTICS: Trigger Custom Analytics When Specific Functions Run
#### EXTERNAL_CONTENT: Dynamically Load HTML Content
#### JSON: Dynamically Load JSON Data
### Removing boilerplate
### Common events
If you've ever gotten tired of typing $(document).ready(function(){...}), this is for you.  TOC's built-in events enable you to wait for common events with the following syntax.
* ```JavaScript{when:'immediate'}```
* ```JavaScript{when:'dom_ready'}```
* ```JavaScript{when:'window_load'}```
* ```JavaScript{when:'window_unload'}```
Even better, if you omit the "when" param, it defaults to document ready, so you never need to type it.

### Errors and Debugging
TOCjs aims to make errors stand out clearly to you and disappear for your users.  It does this through different development and production modes.  By default, ```TOC.debug = 'development';```.

#### Debug Mode : Errors
As a design philosophy, the error messages in TOCjs don't stop at telling you there's a problem.  They explain how to fix it and output to the console.  Let's say you did this {when:2, ... } in your table.  Since the "when" parameter only accepts strings, You'd get an error like this (In Chrome Dev Tools):

```
ERROR: Object v
  message: "ERROR "when:" only accepts strings"
  __proto__: Object
rowKey: "delayedFive"
sectionKey: "FUNCTIONS"
type: "TOC() Table Parsing Error"
```
#### Debug Mode: Timing
Since one of the biggest debugging headaches can be timing issues, debugging mode provides lightweight script timing.  For example, this table of contents:
```JavaScript
TOC({
    SCRIPTS: {
      scripts_main:{when:'immediate', load:'js/fns_file1.js'},
      scripts_two:{when:'changeThree', load:'js/fns_file2.js'}
    },
    FUNCTIONS: {
      oneFast: {when: 'scripts_main', target:'.one', fn: 'fnOne'},
      twoClicked: {when: 'scripts_main', container: 'body', target: '.two', on: 'click' , fn: 'fnTwo'},
      changeThree: {when: 'twoClicked', target: '.three', fn: 'fnThree' },
      changeFour:{when:'scripts_two', context:'window',fn:'someVendorCode'},
      delayedFive: {when: 'twoClicked', target: '.five', fn: 'delayedPublish5000' },
      delayedSix: {when: 'delayedFive', target: '.six', fn: {css:{backgroundColor:'#D598FD'}} }
    }
});
```
Produces something close to this (some detail removed for example purposes)
```
0ms immediate:
4ms TOC Parse Object {SCRIPTS: Object}
6ms TOC Parse End
29ms dom_ready:
42ms window_load:
107ms TOC Parse Object {SCRIPTS: Object, FUNCTIONS: Object}
108ms TOC Parse End
109ms toc_main: Object {data:...}
113ms scripts_main: Object {data:...}
118ms oneFast: Object {}
120ms main_ready: Object {}
131ms bootstrap: Object {data: ...}
(I clicked after 2 seconds, which fires fnTwo)
2034ms twoClicked: Object {event: x.Event}
2036ms changeThree: Object {}
2048ms scripts_two: 
2050ms changeFour: Object {}
7040ms delayed for 5 seconds
7040ms delayedFive: Object {}
7041ms delayedSix: Object {} 

```

#### Production Mode: Errors
When ```TOC.debug``` differs from exactly 'development', you're in production mode.  Console logging and timing stop.  Most errors will be invisible to the user.  However, TOC provides a helper function to make debugging production issues easier:
```JavaScript
TOC.logErrorToServer = function (errorObj) {};
```
When an error happens, this function gets called.  It's a great place to put a call to your analytics tool.

### Apply TOCjs in Different Scenarios
#### Organize and Integrate Other Developers' Code (i.e., Legacy Code)
#### Have another scenario you don't see here? Ask!
