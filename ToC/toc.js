/*!
 * 
 * ToC - Enterprise application framework based on many sources I'll list soon.
 * 2011/12/15 - AL
 * In experimental stage.  Designed to wrap other frameworks in a common
 * interface for faster and more intuitive development, framework combinations,
 * faster debugging, and many other benefits.
 *    
 * Currently implements error handling, multi-dependency pubsub, simple script
 * loading, speed profiling, and a few other things. Nearly everything is a
 * $.Deferred object.
 * 
 * Definitely a work in progress.
 * 
 * Copyright 2011, Adam Laughlin
 * http://a-laughlin.com
 * Licensed under MIT & GPL version 2
 * http://static.a-laughlin.com/mit_license.txt
 * http://static.a-laughlin.com/gpl_license.txt
 */

var $=jQuery; //temp...
// a few tests to check deferred execution order
$.fn.delayedPublish1000=function(row,table){
  row.promises.push($.Deferred(
    function(dfd){
      setTimeout(function(){dfd.resolve();console.debug('row1000 resolved')},1000);
    }
  ));
  return this;
};

$.fn.backboneTest=function(row,table){
  console.debug('backbone test running');
  return this;
};

$.fn.delayedPublish5000=function(row,table){
  row.promises.push($.Deferred(
    function(dfd){
      setTimeout(function(){
        dfd.resolve();
        console.debug('row5000 resolved')
        table.profile('sectionName','requires','provides','promisesResolved');
      },5000);
    }
  ));
  return this;
};
$.fn.logFileArrival=function(row,table){
  console.debug('file arrived');
  console.debug(table.data.get('F_bkb'));
  return this;
};


// initialize ToC fn and set window.ToC
(function ($){
  
  var defaults={
    debug:'error', // debug mode, accepts either console[foo] arguments or true/false; True throws errors. False logs them to server. foo does console[foo]()
    errLogFn:function(e){/*$(<'img src='++'>')*/}, // override for logging messages to the server
    profilerFn: function(deferred){},
    profile:function(sort){},
    data:(function(){
      var datastore={},errMsg='data key must be a string';
      function set(key,dataToSet){
        if(typeof key!=='string') throw new Error(errMsg);
        return datastore[key]=datastore[key]||dataToSet;
      };
      function get(key){
        if(typeof key!=='string') throw new Error(errMsg);
        return datastore[key]||false;
      };
      return {get:get,set:set};
    })(),
    defSub:(function(){ // simple pubsub based on $.Deferred
      var callbacks={};
      return function(namesStr){
        if(typeof namesStr!=='string') throw {name:'defSub error',message:'defSub only accepts strings'};
        function publish(msg){
          return $.map(namesStr.split(','),function(cbname){
            try{
              return (callbacks[cbname] = callbacks[cbname]||$.Deferred()).resolve();
            }
            catch(er){
              console.debug('caught in defSub');
              console.debug(er);
            }
          });
        };
        function subscribe(){
          return $.when.apply(null,$.map(namesStr.split(','),function(cbname){
            return callbacks[cbname] = callbacks[cbname]||$.Deferred();
          }))
        }
        return {publish:publish,subscribe:subscribe}
      }
    })()
  };
  
  function DeferredObj(props){
    var def = $.extend($.Deferred(),props,{
      promises:[],
      timers:{
        start:new Date,
        requires:'',
        resolved:'',
        promisesResolved:'',
        provides:''
      },
      errParser:function(e,row,section,table){
        var c=window.console,
            d=ToC.debug;
        if(!c){c=window.console={};c.debug=c.log=c.error=c.table=c.dir=c.assert=function(){}};

        ToC.errLogFn(e,row,section,table);
        if(def.error) def.error(e,row,section,table);
        if(d){
          if(c[d]) return console[d](e),true;
          throw e;
        }
        return true;
      }
    });
    if(ToC.profilerFn) ToC.profilerFn(def);
    return def;
  };

  function Section(arr,table,rowsArray){
    var s = DeferredObj($.extend(table.sections[arr[0]],{
      name:arr[0],
      type:'section',
      columnsArray:arr.slice(1),
      rowsArray:rowsArray,
      init:function(table){
         this.parse(table);
         table.promises.push.apply(table.promises,this.promises);
         this.resolve();
         return s;
      },
      parse:function(table){
        var rArr=s.rowsArray,
        rowsLen=rArr.length,
        rowIter=0;
        for(;rowIter<rowsLen;rowIter++ ){
          rArr[rowIter]=new Row(rArr[rowIter],s,rowIter);
          rArr[rowIter].init(s,table);
        }
      }
    }));
    return s;
  }

  
  function Row(rowArray,section,rowNum){
    var row=DeferredObj({
      rawArray:rowArray,
      index:rowNum,
      type:'row',
      sectionName:section.name,
      init:function(section,table){
        var a=row.rawArray,
        c=section.columnsArray,
        L=a.length;
        for(;L--;){
          row[c[L]]=a[L]
        }
        row.parse(section,table);
        section.promises.push.apply(section.promises,row.promises);
        row.resolve();
        return row;
      },
      parse:function(section,table){
        try{
          var subscribedRow=table.defSub(row.requires).subscribe();
          row.promises.push(subscribedRow);
          return subscribedRow.done(function(){
            try{
              var args=[row,table];
              args.push.apply(args,arguments);
              var secReturn = section.handler.apply(section,args);
              if(secReturn) {
                row.promises.push(secReturn);
              }
              $.when.apply(null,row.promises)
              .done(table.defSub(row.provides).publish)
              .fail(function(){throw new Error('promises rejected'+row.rawArray.toString())});
            }catch(errorObj){
              section.errParser(errorObj,row,section,table);
            }
          })
          .fail(function(){throw {name:'ROW REJECTION',message:'row promises failed on row '}})
        }catch(err){
          
          section.errParser({original:err,row:row,table:table,section:section});
        }
      }
    });
    return row;
  };

  function Table(tableArray){
    return new DeferredObj({
      error:ToC.errorFn,
      type:'table',
      rows:{},
      sections:ToC.sections,
      data:ToC.data,
      columns:{},
      sectionsArray:[],
      profile:ToC.profile,
      profilerFn:ToC.profilerFn,
      defSub:ToC.defSub,
      init:function(table){
        var taLen=tableArray.length,
        rowsArray=[],
        secLen;
        for(;taLen--;){ // parse the table backward
          var row,
          sec,
          arr=tableArray[taLen].match(/([^\s]+)/g),
          isSection=ToC.sections[arr[0]];
          if(isSection){
            sec=new Section(arr,table,rowsArray.slice(0));
             rowsArray=[];
            table.sectionsArray.push(sec);
          } else{
            rowsArray.push(arr);
          }
        }
        table.parse(table);
        table.resolve();
        return table;
      },
      parse:function(table){
        for(var rowIter,rowsLen,secIter=0,secLen=table.sectionsArray.length;secIter<secLen;secIter++){ // parse the sections forward
          var sect=table.sectionsArray[secIter];
          sect.init(table);
        };
        return table;
      }
    });
  }
  
  window.ToC=window.ToC||function init(tableArray){
    try{
      if(tableArray.constructor !== Array) {
        if($.isPlainObject(tableArray)) return $.extend(ToC,defaults,tableArray);
        throw {name:'INIT ERROR', message:'ToC only accepts an array or a configuration object'};
      }
      
      var table= new Table(tableArray),
      oldWinFns={};
      table.init(table);
      table.defSub('asap').publish();
      $(table.defSub('dom-ready').publish);
      window.onload=table.defSub('window-load').publish;
      window.onunload=table.defSub('window-unload').publish;
      if(!ToC.debug)window.onerror=function(){ToC.errLogFn(arguments)};
      return table;
    } catch(err){
      (table||DeferredObj()).errParser(err,null,null,table);
    }
  };
  return ToC;
})(jQuery);



// configure toc with an options {};
ToC({
  sections:{
    LOCATIONS:{
      handler:function(row,table,message){
        var test = (new RegExp(row.href).test(location.href));
        return $.Deferred()[test ? 'resolve':'reject']()
      },
      error:function(row,table,error){
        //if (opts.debug) throw error.orig;
      },
      profiler:function(){
        
      }
    },
    FILES:{
      handler:function(row,table,message){
        return $.ajax({
          url:row.file,
          cache:true,
          dataType:'script'
        })
        .success(function(){
          table.data.set(row.provides,arguments);
        })
        .fail(function(){
          console.debug('Files fail',arguments);
//          throw {name:'FILES error',message:arguments};
        })
      }//,
//      error:function(row,table,error){
//        //if (opts.debug) throw error.orig;
//      }
    },
    BKB_MODELS:{ // temp to experiment
      handler:function(row,table,message){
        
      },
      error:function(row,table,error){
        //if (opts.debug) throw error.orig;
      }
    },
    BKB_VIEWS:{
      handler:function(row,table,message){
        return $(row.selector||document)[row.actions](row,table);
      },
      error:function(row,table,error){
        //if (opts.debug) throw error.orig;
      }
    },
    BKB_CONTROLLERS:{
      handler:function(row,table,message){
        
      },
      error:function(row,table,error){
        //if (opts.debug) throw error.orig;
      }
    }
  },
  profilerFn: function(deferred,table){
    var o=this;
    if(!o.profileStart) o.profileStart=new Date;
    function getElapsedTime(){
      return Math.round((((new Date).valueOf()-o.profileStart.valueOf())/1000)%1000*1000);
    };
    $.when(deferred).always(function(){
      deferred.timers.resolved=getElapsedTime();
      if(deferred.requires){
        o.defSub(deferred.requires).subscribe()
        .done(function(){deferred.timers.requires=getElapsedTime()});
      }

      $.when.apply(null,deferred.promises)
      .always(function(){
        if(deferred.provides){
          o.defSub(deferred.provides).subscribe()
          .done(function(){deferred.timers.provides=getElapsedTime()})
        }
        deferred.timers.promisesResolved=getElapsedTime();
      })
    })
  },
  profile:function(){
    var args=Array.prototype.slice.call(arguments,0),
    timerArray=$.map(this.sections,function(section){
      return section.rowsArray;
    }),
    columns=[];
    $.each(args,function(num,name){
      if(name=='sectionName') columns.push({property:name, label: 'section'});
      if(name=='provides') columns.push({property:name, label: 'provided'},{property:name+'_time', label: 'after (ms)'});
      if(name=='requires') columns.push({property:name, label: 'requirements met'},{property:name+'_time', label: 'after (ms)'});
      if(name=='promisesResolved') columns.push({property:name, label: name},{property:name+'_time', label: 'after (ms)'});
    });
    var sortedArr=$.map(timerArray,function(def){
      var msg={};//{section:def.sectionName};
      $.each(args,function(num,name){
        msg[name]=def[name]||name;
        msg[name+'_time']=def.timers[name]+'';
      });
      return msg;
    });
    console.table(sortedArr,columns);
    return sortedArr;
  }
});

// run a table
window.toc = ToC([
  'LOCATIONS    requires            href                                      provides',
              'asap                 p=621                                     L_bkbon',
              
  'FILES        requires            file                                      provides',
              'L_bkbon              //cdnjs.cloudflare.com/ajax/libs/json2/20110223/json2.js                      F_json2',
              'L_bkbon              //cdnjs.cloudflare.com/ajax/libs/underscore.js/1.2.2/underscore-min.js        F__',
              'F__                  //cdnjs.cloudflare.com/ajax/libs/backbone.js/0.5.3/backbone-min.js            F_bkb',
              
  'BKB_VIEWS  requires              selector        actions                   provides',
              'delayed1,dom-ready   div:eq(0)       delayedPublish5000        delayed2',
              'dom-ready            a:eq(0)         delayedPublish1000        delayed1',
              'F_bkb                body            logFileArrival            foo',
              'F_bkb                #backbone-test  backboneTest              backbone-loaded'
]);