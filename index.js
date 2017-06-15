var fs = require('fs');
var path = require('path');
var _ = require('underscore');
var base = path.normalize(__dirname).replace(/\\/g, '/');


function VueMiddleWare (options) {
    var _this = this;

    _this.options = {};
    _this.options.root = options && options.root;
    _this.options.root = path.normalize(_this.options.root).replace(/\\/g, '/');
    _this.options.projectRoot = options && options.projectRoot;
    _this.options.projectRoot = path.normalize(_this.options.projectRoot).replace(/\\/g, '/');
}


var vueParser = {
    init: function (root, projectRoot) {
        var tree = {
            'src': {
                'config.json': 'file',
                'data': {
                    'app.js': 'file',
                    'app.html': 'file'
                },
                'ui': {
                    'module': 'dir',
                    'widget': 'dir',
                    'route.json': 'file'
                }
            }
        };

        var walk = function (root, deep) {
            var key, val, dist;
            for (key in root) {
                val = root[key];
                dist = `${deep}/${key}`;
                if (val instanceof Object === true) {
                    if (!fs.existsSync(dist)) {
                        fs.mkdirSync(dist);
                    }
                    walk(val, `${deep}/${key}`);
                }
                if (val === 'dir') {
                    if (!fs.existsSync(dist)) {
                        fs.mkdirSync(dist);
                    }
                }
                if (val === 'file') {
                    if (!fs.existsSync(dist)) {
                        if (key.match(/\.json$/)) {
                            fs.writeFileSync(dist, '{}', 'utf8');
                        } else {
                            fs.writeFileSync(dist, '', 'utf8');
                        }
                    }
                }
            }
        };
        walk(tree, projectRoot);
    },
    getWorkPath: function (root, projectRoot) {
        var temp = root + '/temp';
        if (!fs.existsSync(temp)) {
            fs.mkdirSync(temp);
        }
        return temp;
    },
    parseModule: function (root, projectRoot) {
        var p = projectRoot + '/src/ui/module';
        var feed = 0;
        var modules = {};

        var getChildren = function (template) {
            var arr = [];
            template.split('\n').forEach(function (item) {
                var m = item.match(/<(module-.*?)\s*\/>/);
                if (m && arr.indexOf(m[1]) < 0) {
                    arr.push(m[1])
                }
            });
            return arr;
        };

        var formatTemplate = function (m) {
            var template = m.template;
            var date = new Date();
            var pre = +(new Date(date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate()));
            m.children.forEach(function (item) {
                var reg = new RegExp('<(' + item + '.*?)\s*\\/>');
                var id;
                while (template.match(reg)) {
                    id = 'module-' + pre + (feed++);
                    template = template.replace(reg, '<div id="' + id + '"></div>');
                    modules[item].parents.push(id);
                }
            });
            m.template = template;
        };

        var createIndexFile = function (m) {
            var moduleIndexTmpl = _.template(fs.readFileSync(base + '/tmpl/module-entry.template.js', 'utf8'));
            var content = moduleIndexTmpl({
                root: root,
                projectRoot: projectRoot,
                name: m.name,
                modulePath: m.path,
                moduleTemplate: m.template
            });
            fs.writeFileSync(root + '/temp/' + m.name + '-entry.js', content,  'utf8');
        };

        var createMapFiles = function (modules) {
            var temp = root + '/temp';

            _.map(modules, function (module, name) {
                delete module.template;
                delete module.path;
                module.instance = 'require("' + root + '/temp/' + name + '-entry.js")require-end';
            });

            var maps = JSON.stringify(modules, null, 4);
            maps = 'module.exports = ' + maps.replace(/"require\(\\/g, 'require(').replace(/\\"\)require-end"/g, '")');
            fs.writeFileSync(root + '/temp/module-map.js', maps,  'utf8');
        };

        var temp = root + '/temp';
        if (!fs.existsSync(temp)) {
            fs.mkdirSync(temp);
        }

        var moduleList = fs.readdirSync(p);
        var tmpList = [];
        moduleList.forEach(function (item) {
            if (!fs.statSync(`${p}/${item}`).isDirectory()) {
                return;
            }
            tmpList.push(item);
            var m = {
                name: 'module-' + item,
                path: p + '/' + item,
                parents: []
            };
            modules['module-' + item] = m;
        });
        moduleList = tmpList;

        moduleList.forEach(function (item) {
            var m = modules['module-' + item];

            m.template = fs.readFileSync(m.path + '/template.html', 'utf8');
            m.children = getChildren(m.template);
            formatTemplate(m);
            createIndexFile(m);
        });

        createMapFiles(modules);
        
        var moduleTmpl = _.template(fs.readFileSync(base + '/tmpl/register-module.template.js', 'utf8'));
        var content = moduleTmpl({
            root: root,
            projectRoot: projectRoot,
            moduleList: moduleList
        });
        fs.writeFileSync(root + '/temp/register-module.js', content,  'utf8');
    },
    parseWidget: function (root, projectRoot) {
        var p = projectRoot + '/src/ui/widget';
        var widgetList = fs.readdirSync(p);
        var widgetTmpl = _.template(fs.readFileSync(base + '/tmpl/register-widget.template.js', 'utf8'));
        var content = widgetTmpl({
            root: root,
            projectRoot: projectRoot,
            widgetList: widgetList
        });
        fs.writeFileSync(root + '/temp/register-widget.js', content,  'utf8');
    },
    parseConfig: function (root, projectRoot) {
        var _this = this;
        var p = projectRoot + '/src/config.json';
        var config = require(p);


        // global-library
        var work = _this.getWorkPath(root);
        var glibTmpl = _.template(fs.readFileSync(base + '/tmpl/global-library.template.js', 'utf8'));
        var content = glibTmpl({
            root: root,
            projectRoot: projectRoot,
            config: config
        });
        fs.writeFileSync(`${work}/global-library.js`, content, 'utf8');
    }
};


VueMiddleWare.prototype.apply = function (compiler) {
    var _this = this;

    compiler.plugin('make', function (compilation, callback) {
        vueParser.init(_this.options.root, _this.options.projectRoot);
        vueParser.parseModule(_this.options.root, _this.options.projectRoot);
        vueParser.parseWidget(_this.options.root, _this.options.projectRoot);
        vueParser.parseConfig(_this.options.root, _this.options.projectRoot);

        callback();
    });
};


module.exports = VueMiddleWare;
