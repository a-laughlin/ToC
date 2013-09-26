# TOC

A Table of Contents for your JavaScript.

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
Each Table of Contents object contains sections to organize your code by.  TOC provides some default sections: scripts, locations, and functions.  Here's a simple Table of Contents using the defaults:

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
  SCRIPTS: {
    home_js:{ load:'home.js' }
  },
  LOCATIONS: {
    homepage:{ href:'home.html' }
  },
  FUNCTIONS: {}
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
  },
  FUNCTIONS: {}
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
    blueHeader:{ when:'home_js', target:'#header', fn:'makeHeaderBlue' },
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
    blueHeader:{ when:'home_js,dom_ready', target:'#header', fn:'makeBlue' },
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

### Apply TOCjs in Different Scenarios
#### Organize and Integrate Other Developers' Code (i.e., Legacy Code)
#### Test Your Code Before It Goes "live"
#### Ensure Your Analytics Code is Running on All your Sites' Pages
#### Have another scenario you don't see here? Ask!
