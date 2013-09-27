/*!
 * TOCjs.  A Table of Contents for your site's code.
 *
 * Version 0.2
 *
 * Requires: jQuery.Deferred and jQuery.fn.on. ( jQuery >= 1.7 )
 * 
 * Copyright 2013, Adam Laughlin
 * http://a-laughlin.com
 * Licensed under MIT & GPL version 2
 * http://static.a-laughlin.com/mit_license.txt
 * http://static.a-laughlin.com/gpl_license.txt
 */

;(function ($, _win) {
  'use strict';
  
  /* Public function TOC
   * Parses a Table of Contents object
   * Param tableObj Object: The Table of Contents Object Literal
   * Returns the Table of Contents object
   */
  function TOC(tableObj) {
    // parse the table;
    try{
      if(!$.isPlainObject(tableObj)) {throw 'TOC requires an {}'; }
      // set the window.onerror handler to catch errors when not in development mode, but don't overwrite it if it exists.
      if(TOC.debug!=='development' && typeof _win.onerror !== 'function'){
        _win.onerror = function () {
          _log('Window.onerror called with arguments: ',arguments);
          return true; // prevent error from being thrown to user.
        };
      }

      $.each(tableObj, function (sectionKey, sectionObj) {
        $.each(sectionObj, function (rowKey, rowObj) {
          if (_rows[rowKey]) {throw 'All row keys must be unique. Key ' + rowKey + ' appears more than once.'; }
          _rows[rowKey] = new Row(rowKey, rowObj, sectionKey);
        });
      });
      return tableObj;
    } catch(err) {
      TOC.errorParser({orig:err, type:'TOC() Table Parsing Error'});
    }
  }

  /* Private function ROW
   * Parses each row in a Table of Contents object
   * Param rowKey String: // In the Table of Contents object, the name for each row tableofcontents = { key:{} }
   * Param rowObj Object:
   * Param sectionKey String:
   * Returns true;
   */
  function Row(rowKey, rowObj, sectionKey) {
    var thisRowRequirementsStr = rowObj.when || _immediateEventName; // stores the names of rows this row will require data from
    var thisRowData = {}; // stores the data from required rows;

    pubSub(thisRowRequirementsStr).subscribe() // wait for the required rows to publish
    .done(function () { // when required rows are ready...
      try {
        $.map(thisRowRequirementsStr.split(','), function (requirement) {
          thisRowData[requirement] = _rowData[requirement]; // add each requirement rows' data to this row's data
        });

        var sectionHandlerReturn = TOC.sectionHandlers[sectionKey].parse(rowKey, rowObj, thisRowData); // parse the row with its sectionHandler's parser fn

        if (!(sectionHandlerReturn && sectionHandlerReturn.resolve && sectionHandlerReturn.done)) { // duck type check for deferred
          sectionHandlerReturn = $.Deferred().resolve(sectionHandlerReturn); // wrap non-deferreds in a deferred to normalize code flow
        }
        
        sectionHandlerReturn
        .done(function (msg) { // when the section handler is done parsing (optionally accepts deferred)
          var result = TOC.handlerParseTest(rowKey, rowObj, sectionKey, msg); // check that the interface passes
          if (result !== 'passed') {throw result; } // if it doesn't, throw the return message.
          if (msg.publish === false) {return; } // don't publish if the returned object has publish.false set
          pubSub(rowKey).publish(msg); // and publish this row.
        })
        .fail(function(){
          throw 'sectionHandler deferred fail';
        });
      } catch (err) {
        TOC.errorParser({orig:err, type:'Row Error', sectionKey:sectionKey, rowKey:rowKey, rowObj:rowObj });
      }
    })
    .fail(function () {
      TOC.errorParser({ orig:'Row reached fail instead of done state. This should never happen.'});
    });
    return true;
  }

  // simple pubsub for parsing the TOC. Based on $.Deferred
  /* Private function pubSub.  Used by TOC internally.
  *  Simple pubsub for parsing the Table of Contents.
  *  Waits appropriately for rows. Based on $.Deferred
  *
  *  param namesStr String: 'the unique name to subscribe with. Acceps comma delimited names.'
  */
  var pubSub = (function () {
    var callbacks = {};
    return function (namesStr) {

      function publish(msg) {
        $.map(namesStr.split(','), function (cbname) {
          try {
            _log('publishing',namesStr,msg);
            _rowData[namesStr] = msg; // store the published message in row data for reference when other rows "require" it.
            (callbacks[cbname] = callbacks[cbname] || $.Deferred()).resolve(msg); // store resolved deferreds
            // TODO This only checks for all requires being met.
            // TODO Add logic for checking if only one of multiple requirements needs to be met
          } catch (err) {
            TOC.errorParser({orig:err, type:'PubSub publish Error'});
          }
        });
      }

      function subscribe() {
        return $.when.apply(null, $.map(namesStr.split(','), function (cbname) {
          return callbacks[cbname] = callbacks[cbname] || $.Deferred();
        }));
      }

      if (typeof namesStr !== 'string') {
        throw { name: 'PubSub Naming Error', message: 'pubSub(...name...) only accepts strings' };
      }

      return {publish: publish, subscribe: subscribe };
    };
  })();


  // Public vars as defaults for overrides

  /* Public function TOC.logErrorToServer
  *  Override this fn logging messages to a server
  *  Useful for sending errors to Google Analytics so you can track down where occur.
  */
  TOC.logErrorToServer = function (errorObj) {};

  
  /* Public function TOC.errorParser
  *  handles all thrown errors in TOC.
  *  param errorObj Object: {orig:err, ... } The original error is in the orig property.
  *  returns: undefined, or throws error if in development mode 
  */
  TOC.errorParser = function (errorObj) {
    if(TOC.debug!=='development'){
      TOC.logErrorToServer(errorObj);
      return;
    }
    _log(errorObj);
    throw errorObj.orig||'errorObj must have an "orig" property that contains the originally passed error';
  };

  
  /* Public function TOC.handlerParseTest(rowKey, rowObj, sectionName, returnVal)
  *  Ensures section handlers return a consistent response.
  *  Default is a plain object, but can be overridden. (not recommended unless you know what you're doing)
  *  
  *  param rowKey: The Table of Contents row key
  *  param rowObj: The Table of Contents row object
  *  param sectionname: The Table of Contents section name
  *  param returnVal: The value to check for consistency
  *  returns: 'passed' if true, else an error message.
  */
  TOC.handlerParseTest = function (rowKey, rowObj, sectionName, returnVal) {
    return $.isPlainObject(returnVal) ?
      'passed' :
      'section handler for ' + sectionName + ' must return plain object e.g., {}, or $.Deferred that resolves one.';
  };

  /* 
   * Public var TOC.sectionHandlers
   * Set some default section handlers for TOC
   * Handlers must match the sections in the TOC
   * Each handler's parse fn determines how each row in the TOC section will be parsed
   * By default, all return a plain object or deferred to pass TOC.handlerParseTest()
   */
  TOC.sectionHandlers = {
    SHORTCUTS:{
      parse:function(rowKey, rowObj, whenObjs){
        // to aggregate common names as shortcuts
        return {};
      }
    },
    LOCATIONS: {
      // provides location-dependent row execution
      parse: function (rowKey, rowObj, whenObjs) {
        return (new RegExp(rowObj.href).test(location.href)) ? // does the specified location match the current href?
          {location: rowObj.href } : // yes, return the row's specified location object
          {publish: false }; // no, do not publish the row
      }
    },
    FILES: {
      parse: function (rowKey, rowObj, whenObjs) {
        // provides files-dependent row execution
        return $.ajax({
          url: rowObj.load,
          cache: true,
          dataType: 'script'
        })
        .fail(function(){
          throw 'FILES $.ajax failed on file: ' + rowObj.load;
        });
      }
    },
    FUNCTIONS: {
      // executes any functions on the row
      parse: function (rowKey, rowObj, whenObjs){

        // parsing helper functions
        function execRowFns(event){ // determine whether to exec one function or many
          typeof rowObj.fn==='string' ? // is rowObj.fn a function name string by itself?
            execOneFn(rowObj.fn): // yes, execute it
            $.each(rowObj.fn,function(fnam,arg){ // no, assume it's an object
              execOneFn(fnam, arg); // execute each function in rowObj.fn object with key as fnname and value as args
            });
            executedDeferred.resolve(event);
        }

        /* Private function execOneFn
         * execute a single function
         * param fname String: the name of a function
         * param arg anything: an argument to pass it.
         * 
         * returns whatever exists at that namespace
         * getContext('window.location.toString') returns the window.location.toString function.
         */
        function execOneFn (fname, arg){ // execute a function
          _log('executing ' + fname);
          var argArray = $.isArray(arg) ? arg : [arg];
          fname in $container ? // does $.fn[fname] exist as a jQuery.fn. function?
            ($container = $container[fname].apply($container, argArray)): // yes, execute, reassign $container to preserve chain, and pass the argument 
            (executionContext)[fname].apply(executionContext, argArray); // no, try execute in specified context
        }

        /* Private function getContext
         * get a context from a string without running eval
         * param contextStr String: 'console.log'
         * 
         * returns whatever exists at that namespace
         * getContext('window.location') returns the window.location object.  You could then call window.location
         */
        function getContext(contextStr){
          var contextObj = _win;
          var i = 0;
          var contextStringsArray = contextStr.split('.');
          var L = contextStringsArray.length;
          for(;i<L;i++){
            if(contextStringsArray[i] in contextObj){
              contextObj = contextObj[contextStringsArray[i]];
            }
          }
          return contextObj;
        }
        
        _log('running parse on FUNCTIONS: '+ rowKey);
        var executionContext = rowObj.context ? getContext(rowObj.context) : _win;
        var executedDeferred = $.Deferred();
        var $container = $(rowObj.container); // shortcut the container
        rowObj.on? // does rowObj.on exist? (e.g., {on:'click'}), 
          $container.on(rowObj.on, rowObj.target||rowObj.container, function(event){ // yes, bind the event
            execRowFns({event:event});// execute the functions
          }):
          execRowFns({});// no event type specified. execute immediately

        return executedDeferred;
      }
    }
  };


  // Public var debug.  If set to anything other than 'development', prevents errors from being thrown to the user;
  TOC.debug = 'development';

  TOC.version = "0.2";

  // define private variables;
  var _console = _win.console || {log: function(){} }; // ensure calling console doesn't cause errors.
  var _log = function(){if (TOC.debug === 'development') {_console.log.apply(_console,arguments);} };
  var _rowData = {}; // stores all data passed by each row;
  var _rows = {}; // stores rows to check for uniques
  var _immediateEventName = 'asap'; // the event name that's published as soon as this script runs

  // publish commonly needed events
  pubSub(_immediateEventName).publish();
  $(pubSub('dom_ready').publish);
  _win.onload = function () { pubSub('window_load').publish(); };
  _win.onunload = function () {pubSub('window_unload').publish(); };
  
  if (_win.TOC) {_log('TOC defined more than once.  Aborting'); }
  _win.TOC=TOC;
})(jQuery,window);