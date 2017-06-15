var Vue = require('<%= root %>/vue.js');
var moduleView = {};
Vue.config.devtools = false;

<%
    var i, item;
    for (i = 0; i < moduleList.length; i++) {
        item = moduleList[i];
%>

moduleView['module-<%= item %>'] = {
    wrapperIds: []
};

Vue.component('module-<%= item %>', {
    template: '<div v-bind:id="id"></div>',
    computed: {
        id: function () {
            return 'module-view-' + Math.random();
        },
        name: function () {
            return 'module-<%= item %>';
        }
    },
    beforeMount: function () {
        var _this = this;
        moduleView[_this.name].wrapperIds.push(_this.id);
    }
});
<%
    }
%>

module.exports = moduleView;
