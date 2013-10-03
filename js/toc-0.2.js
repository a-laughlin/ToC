/*!
 * TOCjs.  A Table of Contents for your site's code.
 * @a
 * @version 0.2
 * @author Adam Laughlin
 * @requires jQuery.Deferred and jQuery.fn.on. ( jQuery >= 1.7 )
 * 
 * Copyright 2013, Adam Laughlin
 * http://a-laughlin.com
 * Licensed under MIT & GPL version 2
 * http://static.a-laughlin.com/mit_license.txt
 * http://static.a-laughlin.com/gpl_license.txt
 */

;(function ($, _win) {
  'use strict';
  
  /*=========================================
  =            Main TOC Function            =
  =========================================*/

  /** Public function TOC
   * @description Parses a Table of Contents Object
   * @param       {Object} tableObj: The Table of Contents Object Literal
   * @returns     {undefined}
   */
  function TOC(tableObj) {
    try{
      if(!$.isPlainObject(tableObj)) {throw 'TOC requires an {}'; }
      _log('TOC Parse');
      // set the window.onerror handler to catch errors when not in development mode, but don't overwrite it if it exists.
      if(TOC.debug !== 'development' && typeof _win.onerror !== 'function'){
        _win.onerror = function () {
          _log('Window.onerror called with arguments: ',arguments);
          return true; // prevent error from being thrown to user.
        };
      }

      $.each(tableObj, function (sectionKey, sectionObj) { // loop over the table sections
        $.each(sectionObj, function (rowKey, rowObj) { // loop over rows
          if (rowKey in _rows) {throw 'All row keys must be unique. Key ' + rowKey + ' appears more than once.'; }
          _parseRow(rowKey, rowObj, sectionKey); // parse the row
          _rows[rowKey] = true; // set to true for future checks
        });
      });
      _log('TOC Parse End');
    } catch(err) {
      TOC.errorParser({orig:err, type:'TOC() Table Parsing Error'});
    }
  }

  /*=================================================
  =            Private Utility Functions            =
  =================================================*/

  /** Private function _parseRow
   * @description Parses a Table of Contents row
   * @param       {String} rowKey     In the Table of Contents object, the name for each row tableofcontents = { key:{} }
   * @param       {Object} rowObj     The row object itself sectionKey:{rowKey:rowObj}
   * @param       {String} sectionKey the name of a section of rows (e.g., LOCATION) sectionKey:{rowKey:rowObj}
   * @return      {undefined}
   */
  function _parseRow(rowKey, rowObj, sectionKey) {
    var thisRowRequirementsStr = rowObj.when || _immediateEventName; // stores the names of rows this row will require data from
    var thisRowData = {}; // stores the data from required rows;

    _pubSub(thisRowRequirementsStr).subscribe() // wait for the required rows to publish
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
          // enforce a consistent sectionHandler interface.
          if(!$.isPlainObject(msg)){
            throw 'section handler for ' + sectionKey + ' must return plain object e.g., {}, or $.Deferred that resolves one.';
          }

          if (msg.publish === false) {return; } // don't publish if the returned object has publish.false set
          _pubSub(rowKey).publish(msg); // and publish this row.
        })
        .fail(function(){
          _log('sectionHandler' + sectionKey + ' deferred failed at row ' + rowKey);
        });
      } catch (err) {
        TOC.errorParser({orig:err, type:'Row Error', sectionKey:sectionKey, rowKey:rowKey, rowObj:rowObj });
      }
    });
    // .fail(function () {
    //   throw 'Row ' + rowKey + ' reached fail instead of done state. This should never happen.';
    // });
  }

  /** Private function _pubSub
  * @description $.Deferred-based pubsub for handling {when:'foo'} properties in a Table of Contents
  *              Stores the published property for subscribers to access.
  * @param       {String} namesStr: A key to subscribe or publish to.  Must be unique.
  * @returns     {Object}           A plain object ({publish: function(){...}, subscribe: function(){...} })
  * @example:    _pubSub('foo').subscribe();  _pubSub('foo').publish('Fired!')
  */
  var _pubSub = (function () {
    var callbacks = {};
    return function (namesStr) {

      function publish(msg) {
        $.map(namesStr.split(','), function (cbname) {
          try {
            _log('publishing',cbname,msg);
            _rowData[namesStr] = msg; // store the published message in row data for reference when other rows "require" it.
            (callbacks[cbname] = callbacks[cbname] || $.Deferred()).resolve(msg); // use existing deferred or create one, then resolve.
            // TODO This only checks for all whens being met..
            // Add logic for checking if only one of multiple requirements needs to be met
          } catch (err) {
            TOC.errorParser({orig:err, type:'PubSub publish Error'});
          }
        });
      }

      function subscribe() { // subscribe to all rows specified in rowKey:{when:...}
        return $.when.apply(null, $.map(namesStr.split(','), function (cbname) { // return $.when so we can call subscribe().done()
          return callbacks[cbname] = callbacks[cbname] || $.Deferred(); // creating deferreds for each subscribed name
        }));
      }

      if (typeof namesStr !== 'string') {
        throw '_pubSub(...name...) only accepts strings';
      }

      return {publish: publish, subscribe: subscribe };
    };
  })();

  // for debugging
  function _log () {
    if (TOC.debug === 'development') {
      _console.log.apply(_console,[((new Date()) - startTime)+'ms', arguments]);
    }
  }

  
  /*============================================================
  =            Public Default Functions to Override            =
  ============================================================*/

  /** Public function TOC.logErrorToServer
   * Override this fn to log errors to a server instead of throwing them to the user.
   * Useful for sending errors to Google Analytics so you can track down which pages
   * they occur on.
   * @param  {Object} errorObj: A plain object.
   */
  TOC.logErrorToServer = function (errorObj) {};

  
  /** Public function TOC.errorParser
   * handles all thrown errors in TOC.
   * @param  {Object} errorObj:  {orig:err, name:'errorName', message:'placeYourMessageHere' };
   * @returns {undefined} if TOC.debug !== 'development'
   * @returns {Error} else throws the error to the developer
   */
  TOC.errorParser = function (errorObj) {
    if(TOC.debug!=='development'){
      TOC.logErrorToServer(errorObj);
      return;
    }
    _log(errorObj);
    throw errorObj;
  };


  /*============================================================
  =            Public Default Section Handlers to Override     =
  ============================================================*/

  /* 
   * Public var TOC.sectionHandlers
   * Set some default section handlers for TOC
   * Handlers must match the sections in the TOC
   * Each handler's parse fn determines how each row in the TOC section will be parsed
   * All return a plain object (includes deferreds) to pass TOC.handlerParseTest()
   */
  TOC.sectionHandlers = {
    SHORTCUTS:{
      // to aggregate common names as shortcuts.  Return a plain object to pass the interface check.
      parse:function(rowKey, rowObj, whenObjs){
        return {}; // we're just aggregating.  No need to do anything.
      }
    },
    LOCATIONS: {
      // checks rowObj.href against location.href before publishing the row.
      parse: function (rowKey, rowObj, whenObjs) {
        if (typeof rowObj.href === 'string' && window.location.href.indexOf(rowObj.href) > -1 ) { // if string passed, check location href for it.
          return { location: rowObj.href }; // return something to indicate it passed.
        }
        if( rowObj.href.test && rowObj.href.test(location.href) ){  // else duck type for regex and check the location
          return { location: rowObj.href }; // return something to indicate it passed.
        }
        return {publish: false }; // else return something telling the row not to publish its name for other rows.
      }
    },
    SCRIPTS: {
      // loads files that other rows can wait for
      parse: function (rowKey, rowObj, whenObjs) {
        // $.getScript() doesn't cache the scripts, so use $.ajax
        return $.ajax({
          url: rowObj.load,
          cache: true, 
          dataType: 'script'
        })
        .fail(function(){
          _log('SCRIPTS $.ajax failed on file: ' + rowObj.load);
        });
      }
    },
    FUNCTIONS: {
      // executes any functions when rowObj.fn is defined
      parse: function (rowKey, rowObj, whenObjs){
        /**
         * Private function _execRowFns
         * Execute any functions in rowObj.fn, and resolve a deferred when complete;
         * @param  {Object} event: A plain object {}, or a jQuery event wrapped as {event:eventObj} to pass TOC.handlerParseTest
         * @return {undefined}
         */
        function _execRowFns(event){ // determine whether to exec one function or many
          var fnReturns = []; // store the fn returns so that we can wait for them in case one contains a deferred.
          typeof rowObj.fn==='string' ? // is rowObj.fn a function name string by itself?
            fnReturns.push(_execOneFn(rowObj.fn)): // yes, execute it
            $.each(rowObj.fn,function(fnam,arg){ // no, assume it's an object
              fnReturns.push(_execOneFn(fnam, arg)); // execute each function in rowObj.fn object with key as fnname and value as args
            });

          $.when.apply(null,fnReturns) // after all functions finish, execute immediately if no deferreds, else wait for them.
          .always(function(){ // execute whether results succeed or fail (or aren't deferreds)
            rowFnsStatusDeferred.resolve(event); // resolve the row's fnStatus deferred to publish the row.
          })
        }

        /**
         * Private function _execOneFn
         * Decides how to execute one function, then executes it
         * @param  {String} fname: a function name
         * @param  {Anything} arg: an argument to pass it
         * @return {Anything} returns whatever the function returns
         */
        function _execOneFn (fname, arg){ // execute a function
          _log('executing ' + fname);
          var argArray = $.isArray(arg) ? arg : [arg];
          if(fname in $container){ // if fname is a jQuery.fn. function
            var retVal = $container[fname].apply($container, argArray); // execute it on the collection
            if(retVal instanceof $) $container = retVal; // if it returns a jquery object, reassign it to $container to preserver chain
            return $container; // and return the value;
          }
          if (fname in executionContext){
            return executionContext[fname].apply(executionContext, argArray); // else execute the fn in its context
          }
          throw '{context:...} error. No function named ' + fname + ' exists in ' + (rowObj.context||'window');
        }

        /**
         * Private function _getContext
         * Resolve an object's descendent property from a string without running eval
         * @param  {String} contextStr: A period-separated string. e.g., 'window.location'
         * @return {anything}: e.g., _getContext('window.location') returns the
         *                     window.location object.
         */
        function _getContext(contextStr){
          var contextObj = _win;
          if(contextStr === undefined) { return _win; }
          var i = 0;
          var contextStringsArray = contextStr.split('.');
          var L = contextStringsArray.length;
          for(;i<L;i++){
            if(contextStringsArray[i] in contextObj){
              contextObj = contextObj[contextStringsArray[i]];
            } else {
              throw '{context:...} error.  No property named ' + contextStringsArray[i] + ' in ' + contextStringsArray[i-1];
            }
          }
          return contextObj;
        }
        
        // begin rowObj.fn parsing
        var executionContext = _getContext(rowObj.context);  // set a context if it exists. Default === window.
        var rowFnsStatusDeferred = $.Deferred(); // Tracks when all the row's functions have executed.
        var $container = $(rowObj.container); // shortcut the container
        rowObj.on? // does rowObj.on exist? (e.g., {on:'click'}), 
          $container.on(rowObj.on, rowObj.target||rowObj.container, function(event){ // yes, bind the event
            _execRowFns({event:event});// execute the functions
          }):
          _execRowFns({});// no event type specified. execute immediately

        return rowFnsStatusDeferred;
      }
    }
  };


  
  // Public var debug.  If set to anything other than 'development', prevents errors from being thrown to the user;
  TOC.debug = 'development';

  TOC.version = "0.2";

  // define private variables;
  var _console = _win.console || {log: function(){} }; // ensure calling console doesn't cause errors.
  var _rowData = {}; // stores all data passed by each row;
  var _rows = {}; // stores rows to check for uniques
  var _immediateEventName = 'asap'; // the event name that's published as soon as this script runs
  var startTime = new Date(); // for debugging
  // publish commonly needed events
  _pubSub(_immediateEventName).publish();
  $(_pubSub('dom_ready').publish);
  _win.onload = _pubSub('window_load').publish;
  _win.onunload = _pubSub('window_unload').publish;
  
  if (_win.TOC) {_log('TOC defined more than once.  Aborting'); }
  _win.TOC=TOC;
})(jQuery,window);