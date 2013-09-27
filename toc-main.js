// run a table
TOC({
  LOCATIONS: {
    index1: {href: 'index.html'},
    index2: {href: 'index2.html'}
  },
  FILES: {
    dynamicLoad: {when: 'afterPrompt', load: 'js/fns_file2.js'}, // waits to load this file until after the user has clicked a prompt
  },
  FUNCTIONS: {
    divClick: {when: 'index1,main_ready', container: 'body', target: 'div', on: 'click' , fn: 'delayedPublish1000'},
    afterPrompt: {when: 'divClick,main_ready', container: 'body', fn: {prompt:'Hello World!'} },
  },
  SHORTCUTS:{
    main_ready: {when: 'toc_main,scripts_main,dom_ready'} // aggregates common names as shortcuts
  },
});