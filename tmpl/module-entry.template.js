var Vue = require('<%= root %>/vue.js');
require('<%= modulePath %>/style.css');
var script = require('<%= modulePath %>/script.js');
var dataEmpty = require('<%= modulePath %>/data-empty.json');
var name = '<%= name %>';
var template = require('<%= modulePath %>/template.html');
var config = require('<%= projectRoot %>/src/config.json');
var evt = require('../ev.js');


var ev = {
    emptyFn: function () {},
    decorator: function (object, ename) {
        var _this = this;

        if (typeof object[ename] !== 'function') {
            object[ename] = _this.emptyFn;
        }

        var originFn = object[ename];
        var fn = function () {
            var _this = this;

            evt.trigger(name, ename);
            originFn.bind(_this)();
        };
        object[ename] = fn;

        if (ename === 'beforeMount') {
            (function () {
                if (config['data-model'] !== 'full') {
                    return;
                }
                var beforeMount = object[ename];
                var fn = function () {
                    var _this = this;

                    require.ensure([], function (require) {
                        var data = require('<%= modulePath %>/data-full.json');
                        var key;
                        for (key in data) {
                            if (dataEmpty.hasOwnProperty(key)) {
                                _this[key] = data[key];
                            }
                        }
                    }, 'data-full.json');

                    beforeMount.bind(_this)();
                };
                object[ename] = fn;
            }());
        }
    },
    decoratorMethods: function (object) {
        var _this = this;

        if (!(object.methods instanceof Object === true && object.methods instanceof Array === false)) {
            object.methods = {};
            return;
        }

        var methods = object.methods;
        var key, val;
        for (key in methods) {
            if (methods.hasOwnProperty(key)) {
                if (typeof methods[key] !== 'function') {
                    methods[key] = _this.emptyFn();
                }

                (function () {
                    var originFn = methods[key];
                    var fn = function () {
                        var _this = this;

                        evt.triggerNext(name, this.key, originFn, arguments);
                    };
                    methods[key] = fn.bind({key: key});
                }());
            }
        }
    }
};


var fnGetComponentConfig = function () {
    var ModuleComponentConfig = {
        template: template,
        data: function () {
            var data = JSON.parse(JSON.stringify(dataEmpty));
            if (data instanceof Object === false) {
                data = {};
            }
            return data;
        },
        beforeMount: script.beforeMount,
        mounted: script.mounted,
        beforeUpdate: script.beforeUpdate,
        updated: script.updated,
        methods: script.methods,
        watch: script.watch || {},
        computed: script.computed || {}
    };

    ev.decorator(ModuleComponentConfig, 'beforeMount');
    ev.decorator(ModuleComponentConfig, 'mounted');
    ev.decorator(ModuleComponentConfig, 'beforeUpdate');
    ev.decorator(ModuleComponentConfig, 'updated');
    ev.decoratorMethods(ModuleComponentConfig);

    return ModuleComponentConfig;
};


var ModuleComponent = Vue.extend(fnGetComponentConfig())


module.exports = new ModuleComponent();
