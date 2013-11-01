;(function($,TOC){
  'use strict';

  // example functions - loading these in an external file with "SCRIPTS" also works.
  $.fn.fnOne = function(){
    return this.each(function(){
      $(this).css({backgroundColor:'beige'}).text("I'm One. I ran immediately, before DOM ready.");
    });
  };

  $.fn.fnTwo = function(){
    return this.each(function(){
      $(this).css({backgroundColor:'pink'}).text("I was clicked!  Commencing file load!");
    });
  };

  $.fn.fnThree = function(){
    return this.each(function(){
      $(this).css({backgroundColor:'#FE9'}).text("I'm Three.  I waited Two to be clicked!");
    });
  };

  window.someVendorCode = function(){
    $('.four').css({backgroundColor:'lightgreen'}).text("I'm Four.  I waited for the file to load.  It loaded!");
    return {};
  };

  $.fn.delayedPublish5000 = function(){
    var $el = this;
    var deferred = $.Deferred();
    deferred.done(function(){
      $el.css({backgroundColor:'lightblue'}).text("I'm Five.  Five seconds passed!");
    });
    setTimeout(function(){
      TOC.log('delayed for 5 seconds');
      deferred.resolve({});
    },5000);
    return deferred;
  };
  
})(jQuery,TOC);
