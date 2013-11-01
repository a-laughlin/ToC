/*!
 * TOCjs.  A Table of Contents for your site's code.
 * @version 0.2
 * @author Adam Laughlin
 * @requires jQuery >= 1.7 (jQuery.fn.on)
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
    try {
      if(!$.isPlainObject(tableObj)) {_log('ERROR: TOC requires an {}'); }
      _log('TOC Parse',tableObj);
      // set the window.onerror handler to catch errors when not in development mode.  Don't overwrite it if already exists.
      if(TOC.debug !== 'development' && typeof _win.onerror !== 'function'){
        _win.onerror = function () {
          _log('Window.onerror called with arguments: ',arguments);
          return true; // prevent error from being thrown to user.
        };
      }
      
      var sectionKey,rowKey,sectionObj,rowObj;
      
      // parse the sections and rows
      for(sectionKey in tableObj) {
        if(tableObj.hasOwnProperty(sectionKey)){
          sectionObj = tableObj[sectionKey];
          for(rowKey in sectionObj) {
            if(sectionObj.hasOwnProperty(rowKey)){
              rowObj = sectionObj[rowKey];
              if (rowKey in _rows) {throw 'All row keys must be unique. Key ' + rowKey + ' appears more than once.'; }
              _parseRow(rowKey, rowObj, sectionKey); // parse the row
              _rows[rowKey] = true; // set to true for future checks
            }
          }
        }
      }

      _log('TOC Parse End');
    }  catch(err) {
      TOC.errorParser({ERROR:err.ERROR||err, sectionKey:sectionKey, rowKey:rowKey, type:'TOC() Table Parsing Error'});
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
    var thisRowRequirementsStr = rowObj.when || 'dom_ready'; // stores the names of rows this row will require data from
    var thisRowData = {}; // stores the data from required rows;
    if (typeof thisRowRequirementsStr !== 'string') {
      throw {message:'ERROR "when:" only accepts strings'};
    }

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
          try{
            if(!$.isPlainObject(msg)){
              throw 'section handler ' + sectionKey + ' must return a {}, or $.Deferred that resolves one.';
            }

            if (msg.publish === false) {return; } // don't publish if the returned object has publish.false set
            _pubSub(rowKey).publish(msg); // and publish this row.
          } catch (er){
            TOC.errorParser({type:'ERROR', sectionKey:sectionKey, rowKey:rowKey, ERROR:er.ERROR||er});
          }
        });
      } catch (err) {
        // TODO figure out how to throw an error in a handler and get intuitive line number reporting in the console.
        TOC.errorParser({type:'ERROR', sectionKey:sectionKey, rowKey:rowKey, ERROR:err.ERROR||err});
      }
    });
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
          _log(cbname+': ',msg||''); // log the messages as intuitively as possible
          _rowData[namesStr] = msg; // store the published message in row data for reference when other rows use "when".
          (callbacks[cbname] = callbacks[cbname] || $.Deferred()).resolve(msg); // use existing deferred or create one, then resolve.
          // TODO This only checks for all whens being met..
          // Add logic for checking if only one of multiple requirements needs to be met... e.g., && vs ||.
        });
      }

      function subscribe() { // subscribe to all rows specified in rowKey:{when:...}
        return $.when.apply(null, $.map(namesStr.split(','), function (cbname) { // return $.when so we can call subscribe().done()
          return callbacks[cbname] = callbacks[cbname] || $.Deferred(); // creating deferreds for each subscribed name
        }));
      }

      return {publish: publish, subscribe: subscribe };
    };
  })();

  // for debugging
  function _log () {
    if (TOC.debug === 'development') {
      var args = [((new Date()) - startTime)+'ms'];
      args.push.apply(args,arguments);
      _console.log.apply(_console,args);
    }
  };

  TOC.log = _log; // enable users to use _log fn in handlers

  
  /*============================================================
  =            Public Default Functions                        =
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
    _console.error(errorObj);
  };


  // Public var debug.  If set to anything other than 'development', prevents errors from being thrown to the user;
  TOC.debug = 'development';

  TOC.version = "0.2";

  // define private variables;
  var _console = _win.console || {log: function(){},error:function(){} }; // ensure calling console doesn't cause errors.
  var _rowData = {}; // stores all data passed by each row;
  var _rows = {}; // stores rows to check for uniques
  var immediateEventName = 'asap'; // the event name that's published as soon as this script runs
  var startTime = new Date(); // for debugging
  // publish commonly needed events
  _pubSub('immediate').publish(); // publish immediate immediately
  $(function(){_pubSub('dom_ready').publish()}); // publish dom_ready when $(document).ready();
  _win.onload = function(){_pubSub('window_load').publish()};
  _win.onunload = function(){_pubSub('window_unload').publish()};
  
  if (_win.TOC) {_log('TOC defined more than once.  Aborting'); }
  _win.TOC=TOC;
})(jQuery,window);






/*============================================================
=            Default Section Handlers to Override            =
============================================================*/

;(function ($, _win) {
  'use strict';
  
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
      parse:function (rowKey, rowObj, whenObjs){
        return {}; // we're just aggregating.  No need to do anything.
      }
    },
    LOCATIONS: {
      // checks rowObj.href against location.href before publishing the row.
      parse: function (rowKey, rowObj, whenObjs) {
        // if string passed, check location href for it.
        if (( typeof rowObj.href === 'string' && window.location.href.indexOf(rowObj.href) > -1 ) ||
          (rowObj.href.test && rowObj.href.test(location.href))) { // else duck type for regex and check the location
          return { location: rowObj.href }; // if either test passes, return an object to indicate so.
        }
        return {publish: false }; // else return something telling the row not to publish its name for other rows.
      }
    },
    SCRIPTS: {
      // loads files that other rows can wait for
      parse: function (rowKey, rowObj, whenObjs) {
        // $.getScript() doesn't cache the scripts, so use $.ajax
        // create a deferred to ensure we wait appropriately for it.
        // For some reason $.ajax doesn't work by itself despite working like a promise.  Need to look into that.
        var loadingStatus = $.Deferred(); 

        $.ajax({
          url: rowObj.load,
          cache: true, 
          dataType: 'script'
        })
        .done(function(data){
          loadingStatus.resolve({data:data});
        })
        .fail(function(xhr){
          loadingStatus.reject({xhr:xhr});
        });
        return loadingStatus;
      }
    },
    FUNCTIONS: {
      // executes any functions when rowObj.fn is defined
      parse: function (rowKey, rowObj, whenObjs){
        /**
         * Private function _execRowFns
         * Execute any functions in rowObj.fn, and resolve a deferred when complete;
         * @param  {String} ctxt: the context (a.k.a. namespace where the fn lives)
         * @param  {Object} event: A plain object {}, or a jQuery event wrapped as {event:eventObj} to pass TOC.handlerParseTest
         * @return {undefined}
         */
        function _execRowFns(ctxt, event){ // determine whether to exec one function or many
          var fnReturns = []; // store the fn returns so that we can wait for them in case one contains a deferred.
          var self = this;
          typeof rowObj.fn==='string' ? // is rowObj.fn a function name string by itself?
            fnReturns.push(_execOneFn(ctxt,rowObj.fn,event)): // yes, execute it
            $.each(rowObj.fn,function(fnam,arg){ // no, assume it's an object
              fnReturns.push(_execOneFn(ctxt, fnam, event, arg)); // execute each function in rowObj.fn object with key as fnname and value as args
            });

          $.when.apply(null,fnReturns) // after all functions finish, execute immediately if no deferreds, else wait for them.
          .always(function(){ // execute whether results succeed or fail (or aren't deferreds)
            rowFnsStatusDeferred.resolve(event||{}); // resolve the row's fnStatus deferred to publish the row.
          })
        }

        /**
         * Private function _execOneFn
         * Decides how to execute one function, then executes it
         * @param  {String} ctxt: the context (a.k.a. namespace where the fn lives)
         * @param  {String} fname: a function name
         * @param  {Anything} arg: an argument to pass it
         * @return {Anything} returns whatever the function returns
         */
        function _execOneFn (ctxt, fname, event, arg){ // execute a function
          // TOC.log('executing ' + fname);
          var argArray = $.isArray(arg) ? arg : [arg]; // wrap any non-array arguments in an array to normalize flow
          if(fname in ctxt){ // if fname is a jQuery.fn. function
            var retVal = ctxt[fname].apply(ctxt, argArray); // execute it on the collection
            if (retVal instanceof $) return ctxt = retVal; // if it returns a jquery object, reassign it to $container to preserver chain
            return retVal; // and return the value;
          }
          throw 'No function named ' + fname + ' exists in ' + (rowObj.context||'jQuery');
        }

        /**
         * Private function _getContext
         * Resolve an object's descendent property from a string without running eval
         * @param  {String} contextStr: A period-separated string. e.g., 'window.location'
         * @return {anything}: e.g., _getContext('window.location') returns the
         *                     window.location object.
         */
        function _getContext(contextStr){
          var contextObj = window;
          if(contextStr === undefined) { return contextObj; }
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
        
        
        function boundFn(event){ // shortcut for _execRowFns since it is called in three places below
          _execRowFns($(this),{event:event});// execute the functions
        }


        // begin rowObj.fn parsing
        var rowFnsStatusDeferred = $.Deferred(); // Resolves in _execRowFns when all the row's functions have executed.

        if(rowObj.target){
          rowObj.on ? // is an event handler specified via rowObj.on? (e.g., {on:'click'}), 
            rowObj.container ? // yes...  Does it have a container ?
              $(rowObj.container).on(rowObj.on, rowObj.target, boundFn): // yes... delegate event handling to container
              $(rowObj.target).on(rowObj.on, boundFn): // no... bind handler directly
            _execRowFns($(rowObj.target),{}); // no. execute immediately.
        } else if (rowObj.context) {
          _execRowFns(_getContext(rowObj.context)) // call in a context.  Default is window.
        } else {
          throw rowKey + ' must at least have a target or context defined.';
        }


        return rowFnsStatusDeferred;
      }
    }
  };
})(jQuery,window);