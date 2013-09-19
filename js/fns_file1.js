// a few tests to check deferred execution order
$.fn.delayedPublish1000=function(rowKey,rowObj){
  setTimeout(function(){
    console.debug('row1000 resolved')
  },1000);
  return this;
};


$.fn.delayedPublish5000=function(rowKey,rowObj){
  setTimeout(function(){
    console.debug('row5000 resolved')
  },5000);
  return this;
};

$.fn.logFileArrival = function( rowKey, rowObj ){
  console.debug( 'file arrived' );
  return this;
};