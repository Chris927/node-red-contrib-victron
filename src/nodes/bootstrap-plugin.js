'use strict'

module.exports = function PluginDefinition(RED) {

  console.log('######### Victron Bootstrap Plugin loaded');

  // register plugin
  RED.plugins.registerPlugin('bootstrap-plugin', {
    // type: 'bootstrap-plugin',
    name: 'Victron Bootstrap Plugin, Experimental',
    settings: {
      bla: 42
    },
    onadd: function() {
      console.log('######### Victron Bootstrap Plugin, onadd');
    }
  });
}
