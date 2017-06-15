var Vue = require('<%= root %>/vue.js');


// element-ui
<%
    if (config['element-ui'] === true) {
%>
var eleme = require('element-ui');
Vue.use(eleme);
require('element-ui/lib/theme-default/index.css');
<%
    }
%>


// global-library
<%
    var glib = config['global-library'] || [];
    var i, item;
    for (i = 0; i < glib.length; i++) {
        item = glib[i];
        if (typeof item !== 'string' || !item.match(/^\//)) {
            continue;
        }
%>
require('<%= projectRoot%><%= item %>');
<%
    }
%>
