var Vue = require('<%= root %>/vue.js');
<%
    var i, item;
    for (i = 0; i < widgetList.length; i++) {
        item = widgetList[i];
%>
Vue.component('widget-<%= item %>', require('<%= projectRoot %>/src/ui/widget/<%= item %>/widget.vue'));
<%
    }
%>
