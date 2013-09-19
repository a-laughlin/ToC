;(function ($) {
  'use strict';

  $.fn.toggleColor = function (rowKey, rowObj) {
    return this.each(function () {

    });
  };


  $.fn.delayedPublish5000 = function(rowKey, rowObj) {
    setTimeout(function () {
      console.debug('row5000 resolved');
    }, 5000);
    return this;
  };

  $.fn.logFileArrival = function(rowKey, rowObj) {
    console.debug('file arrived');
    return this;
  };
  
})(jQuery)