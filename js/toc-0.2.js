/*!
 * ToCjs.  A Table of Contents for your site's code.
 *
 * Version 0.2
 *
 * Requires: jQuery > 1.7
 * 
 * Copyright 2013, Adam Laughlin
 * http://a-laughlin.com
 * Licensed under MIT & GPL version 2
 * http://static.a-laughlin.com/mit_license.txt
 * http://static.a-laughlin.com/gpl_license.txt
 */

// initialize ToC fn and set window.ToC
;(function ($, _win) {
  'use strict';
  
  // parses a Table of Contents object
  function ToC(tableObj) {
    // parse the table;
    try{
      if(!$.isPlainObject(tableObj)) {throw 'ToC requires an {}'; }
      if($.fn)
      // set the window.onerror handler to catch errors when not in development mode, but don't overwrite it if it exists.
      if(ToC.debug!=='development' && typeof _win.onerror !== 'function'){
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
      ToC.errorParser({orig:err, type:'ToC() Table Parsing Error'});
    }
  }

  // parses each row in a Table of Contents object
  function Row(rowKey, rowObj, sectionKey) {
    var thisRowRequirementsStr = rowObj.when || _immediateEventName; // stores the names of rows this row will require data from
    var thisRowData = {}; // stores the data from required rows;

    pubSub(thisRowRequirementsStr).subscribe() // wait for the required rows to publish
    .done(function () { // when required rows are ready...
      try {
        $.map(thisRowRequirementsStr.split(','), function (requirement) {
          thisRowData[requirement] = _rowData[requirement]; // add each requirement rows' data to this row's data
        });

        var sectionHandlerReturn = ToC.sectionHandlers[sectionKey].parse(rowKey, rowObj, thisRowData); // parse the row with its sectionHandler's parser fn

        if (!(sectionHandlerReturn && sectionHandlerReturn.resolve && sectionHandlerReturn.done)) { // duck type check for deferred
          sectionHandlerReturn = $.Deferred().resolve(sectionHandlerReturn); // wrap non-deferreds in a deferred to normalize code flow
        }
        
        sectionHandlerReturn
        .done(function (msg) { // when the section handler is done parsing (optionally accepts deferred)
          var result = ToC.handlerParseTest(rowKey, rowObj, sectionKey, msg); // check that the interface passes
          if (result !== 'passed') {throw result; } // if it doesn't, throw the return message.
          if (msg.publish === false) {return; } // don't publish if the returned object has publish.false set
          pubSub(rowKey).publish(msg); // and publish this row.
        })
        .fail(function(){
          throw 'sectionHandler deferred fail';
        });
      } catch (err) {
        ToC.errorParser({orig:err, type:'Row Error', sectionKey:sectionKey, rowKey:rowKey, rowObj:rowObj });
      }
    })
    .fail(function () {
      ToC.errorParser({ orig:'Row reached fail instead of done state. This should never happen.'});
    });
  }

  // simple pubsub for parsing the ToC. Based on $.Deferred
  /* Private function pubSub.  Used by ToC internally.
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
            ToC.errorParser({orig:err, type:'PubSub publish Error'});
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

  /* Public function ToC.logErrorToServer
  *  Override this fn logging messages to a server
  *  Useful for sending errors to Google Analytics so you can track down where occur.
  */
  ToC.logErrorToServer = function (errorObj) {};

  
  /* Public function ToC.errorParser
  *  handles all thrown errors in ToC.
  *  param errorObj Object: {orig:err, ... } The original error is in the orig property.
  *  returns: undefined, or throws error if in development mode 
  */
  ToC.errorParser = function (errorObj) {
    if(ToC.debug!=='development'){
      ToC.logErrorToServer(errorObj);
      return;
    }
    _log(errorObj);
    throw errorObj.orig||'errorObj must have an "orig" property that contains the originally passed error';
  };

  
  /* Public function ToC.handlerParseTest(rowKey, rowObj, sectionName, returnVal)
  *  Ensures section handlers return a consistent response.
  *  Default is a plain object, but can be overridden. (not recommended unless you know what you're doing)
  *  
  *  param rowKey: The Table of Contents row key
  *  param rowObj: The Table of Contents row object
  *  param sectionname: The Table of Contents section name
  *  param returnVal: The value to check for consistency
  *  returns: 'passed' if true, else an error message.
  */
  ToC.handlerParseTest = function (rowKey, rowObj, sectionName, returnVal) {
    return $.isPlainObject(returnVal) ?
      'passed' :
      'section handler for ' + sectionName + ' must return plain object e.g., {}, or $.Deferred that resolves one.';
  };

  /* 
   * Public var ToC.sectionHandlers
   * Set some default section handlers for ToC
   * Handlers must match the sections in the ToC
   * Each handler's parse fn determines how each row in the ToC section will be parsed
   * By default, all return a plain object or deferred to pass ToC.handlerParseTest()
   */
  ToC.sectionHandlers = {
    SHORTCUTS:{
      parse:function(rowKey, rowObj, requirementsObjs){
        // to aggregate common names as shortcuts
        return {};
      }
    },
    LOCATIONS: {
      // provides location-dependent row execution
      parse: function (rowKey, rowObj, requirementsObjs) {
        return (new RegExp(rowObj.href).test(location.href)) ? // does the specified location match the current href?
          {location: rowObj.href } : // yes, return the row's specified location object
          {publish: false }; // no, do not publish the row
      }
    },
    FILES: {
      parse: function (rowKey, rowObj, requirementsObjs) {
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
      parse: function (rowKey, rowObj, requirementsObjs){

        // parsing helper functions
        function execRowFns(event){ // determine whether to exec one function or many
          typeof rowObj.fn==='string' ? // is rowObj.fn a function name string by itself?
            execOneFn(rowObj.fn): // yes, execute it
            $.each(rowObj.fn,function(fnam,arg){ // no, assume it's an object
              execOneFn(fnam, arg); // execute each function in rowObj.fn object with key as fnname and value as args
            });
            executedDeferred.resolve(event);
        }

        function execOneFn (fname, arg){ // execute a function
          _log('executing ' + fname);
          $container[fname] ? // does $.fn[fname] exist as a jQuery.fn. function?
            ($container = $container[fname].call($container, arg )): // yes, execute, reassign $container to preserve chain, and pass the argument 
            (rowObj.context||_win)[fname](arg); // no, try execute in specified context, else window
        }

        _log('running parse on FUNCTIONS: '+ rowKey);
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
  ToC.debug = 'development';

  ToC.version = "0.2";

  // define private variables;
  var _console = window.console || {log: function(){} }; // ensure calling console doesn't cause errors.
  var _log = function(){if (ToC.debug === 'development') {_console.log.apply(_console,arguments);} };
  var _rowData = {}; // stores all data passed by each row;
  var _rows = {}; // stores rows to check for uniques
  var _immediateEventName = 'asap'; // the event name that's published as soon as this script runs

  // publish commonly needed events
  pubSub(_immediateEventName).publish();
  $(pubSub('dom_ready').publish);
  _win.onload = function () { pubSub('window_load').publish(); };
  _win.onunload = function () {pubSub('window_unload').publish(); };
  
  if (_win.ToC) {_log('ToC defined more than once.  Aborting'); }
  _win.ToC=ToC;
})(jQuery,window);