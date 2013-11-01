// // run a table
// TOC({
//   LOCATIONS: {
//     index1: {href: 'index.html'},
//     index2: {href: 'index2.html'}
//   },
//   SCRIPTS: {
//     dynamicLoad: {when: 'afterPrompt', load: 'js/fns_file2.js'}, // waits to load this file until after the user has clicked a prompt
//   },
//   FUNCTIONS: {
//     divClick: {when: 'index1,main_ready', container: 'body', target: 'div', on: 'click' , fn: 'delayedPublish1000'},
//     afterPrompt: {when: 'divClick,main_ready', container: 'body', fn: {prompt:'Hello World!'} },
//     tocChanged:{when:'main_ready', container:'.toc-example', target:'textarea', on:'change', fn:'resetExample'}, // create 
//   },
//   SHORTCUTS:{
//     main_ready: {when: 'toc_main,scripts_main,dom_ready'} // aggregates common names as shortcuts
//   },
// });

// scriptLoaded:{when:'changeThree',load:'http://jsfiddle.net/echo/json/'}
TOC({
    SCRIPTS: {
      scriptLoaded:{when:'changeThree',load:'js/fns_file2.js'},
    },
    FUNCTIONS: {
      oneFast: {when: 'scripts_main', target:'.one', fn: 'fnOne'},
      twoClicked: {when: 'scripts_main', container: 'body', target: '.two', on: 'click' , fn: 'fnTwo'},
      changeThree: {when: 'twoClicked', target: '.three', fn: 'fnThree' },
      changeFour:{when:'scriptLoaded', context:'window',fn:'someVendorCode'},
      delayedFive: {when: 'twoClicked', target: '.five', fn: 'delayedPublish5000' },
      delayedSix: {when: 'delayedFive', target: '.six', fn: {css:{backgroundColor:'#D598FD'}} }
    },
});