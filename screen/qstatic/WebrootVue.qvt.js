/* This software is in the public domain under CC0 1.0 Universal plus a Grant of Patent License. */

// simple stub for define if it doesn't exist (ie no require.js, etc); mimic pattern of require.js define()
if (!window.define) window.define = function(name, deps, callback) {
    if (!moqui.isString(name)) { callback = deps; deps = name; name = null; }
    if (!moqui.isArray(deps)) { callback = deps; deps = null; }
    if (moqui.isFunction(callback)) { return callback(); } else { return callback }
};
// map locale to a locale that exists in moment-with-locales.js
moqui.localeMap = { 'zh':'zh-cn' };
moqui.objToSearch = function(obj) {
    var search = '';
    if (moqui.isPlainObject(obj)) $.each(obj, function (key, value) { search = search + (search.length > 0 ? '&' : '') + key + '=' + value; });
    return search;
};
moqui.searchToObj = function(search) {
    if (!search || search.length === 0) { return {}; }
    var newParams = {};
    var parmList = search.split("&");
    for (var i=0; i<parmList.length; i++) {
        var parm = parmList[i]; var ps = parm.split("=");
        if (ps.length > 1) {
            var key = ps[0]; var value = ps[1]; var exVal = newParams[key];
            if (exVal) { if (moqui.isArray(exVal)) { exVal.push(value); } else { newParams[key] = [exVal, value]; } }
            else { newParams[key] = value; }
        }
    }
    return newParams;
};
Vue.filter('decodeHtml', moqui.htmlDecode);
Vue.filter('format', moqui.format);

moqui.getQuasarColor = function(bootstrapColor) {
    // Quasar colors (https://quasar.dev/style/color-palette): primary, secondary, accent, dark, positive, negative, info, warning
    // success => positive, danger => negative
    if (bootstrapColor === 'success') return 'positive';
    if (bootstrapColor === 'danger') return 'negative';
    return bootstrapColor;
}

/* ========== script and stylesheet handling methods ========== */
moqui.loadScript = function(src) {
    // make sure the script isn't loaded
    var loaded = false;
    $('head script').each(function(i, hscript) { if (hscript.src.indexOf(src) !== -1) loaded = true; });
    if (loaded) return;
    // add it to the header
    var script = document.createElement('script'); script.src = src; script.async = false;
    document.head.appendChild(script);
};
moqui.loadStylesheet = function(href, rel, type) {
    if (!rel) rel = 'stylesheet'; if (!type) type = 'text/css';
    // make sure the stylesheet isn't loaded
    var loaded = false;
    $('head link').each(function(i, hlink) { if (hlink.href.indexOf(href) !== -1) loaded = true; });
    if (loaded) return;
    // add it to the header
    var link = document.createElement('link'); link.href = href; link.rel = rel; link.type = type;
    document.head.appendChild(link);
};
moqui.retryInlineScript = function(src, count) {
    try { eval(src); } catch(e) {
        src = src.trim();
        var retryTime = count <= 5 ? count*count*100 : 'N/A';
        console.warn('inline script error ' + count + ' retry ' + retryTime + ' script: ' + src.slice(0, 80) + '...');
        console.warn(e);
        if (count <= 5) setTimeout(moqui.retryInlineScript, retryTime, src, count+1);
    }
};

/* ========== notify and error handling ========== */
moqui.notifyOpts = { timeout:1500, type:'positive' };
moqui.notifyOptsInfo = { timeout:5000, type:'info' };
moqui.notifyOptsError = { timeout:15000, type:'negative' };
moqui.notifyMessages = function(messages, errors, validationErrors) {
    var notified = false;
    if (messages) {
        if (moqui.isArray(messages)) {
            for (var mi=0; mi < messages.length; mi++) {
                var messageItem = messages[mi];
                if (moqui.isPlainObject(messageItem)) {
                    var msgType = moqui.getQuasarColor(messageItem.type);
                    if (!msgType || !msgType.length) msgType = 'info';
                    moqui.webrootVue.$q.notify($.extend({}, moqui.notifyOptsInfo, { type:msgType, message:messageItem.message }));
                    moqui.webrootVue.addNotify(messageItem.message, msgType);
                } else {
                    moqui.webrootVue.$q.notify($.extend({}, moqui.notifyOptsInfo, { message:messageItem }));
                    moqui.webrootVue.addNotify(messageItem, 'info');
                }
                notified = true;
            }
        } else {
            moqui.webrootVue.$q.notify($.extend({}, moqui.notifyOptsInfo, { message:messageItem }));
            moqui.webrootVue.addNotify(messages, 'info');
            notified = true;
        }
    }
    if (errors) {
        if (moqui.isArray(errors)) {
            for (var ei=0; ei < errors.length; ei++) {
                moqui.webrootVue.$q.notify($.extend({}, moqui.notifyOptsError, { message:errors[ei] }));
                moqui.webrootVue.addNotify(errors[ei], 'negative');
                notified = true;
            }
        } else {
            moqui.webrootVue.$q.notify($.extend({}, moqui.notifyOptsError, { message:errors }));
            moqui.webrootVue.addNotify(errors, 'negative');
            notified = true;
        }
    }
    if (validationErrors) {
        if (moqui.isArray(validationErrors)) {
            for (var vei=0; vei < validationErrors.length; vei++) { moqui.notifyValidationError(validationErrors[vei]); notified = true; }
        } else { moqui.notifyValidationError(validationErrors); notified = true; }
    }
    return notified;
};
moqui.notifyValidationError = function(valError) {
    var message = valError;
    if (moqui.isPlainObject(valError)) {
        message = valError.message;
        if (valError.fieldPretty && valError.fieldPretty.length) message = message + " (for field " + valError.fieldPretty + ")";
    }
    moqui.webrootVue.$q.notify($.extend({}, moqui.notifyOptsError, { message:message }));
    moqui.webrootVue.addNotify(message, 'negative');
};
moqui.handleAjaxError = function(jqXHR, textStatus, errorThrown) {
    var resp = jqXHR.responseText;
    var respObj;
    try { respObj = JSON.parse(resp); } catch (e) { /* ignore error, don't always expect it to be JSON */ }
    console.warn('ajax ' + textStatus + ' (' + jqXHR.status + '), message ' + errorThrown /*+ '; response: ' + resp*/);
    // console.error('respObj: ' + JSON.stringify(respObj));
    var notified = false;
    if (respObj && moqui.isPlainObject(respObj)) { notified = moqui.notifyMessages(respObj.messageInfos, respObj.errors, respObj.validationErrors); }
    else if (resp && moqui.isString(resp) && resp.length) { notified = moqui.notifyMessages(resp); }

    // reload on 401 (Unauthorized) so server can remember current URL and redirect to login screen
    if (jqXHR.status === 401) {
        if (moqui.webrootVue) { window.location.href = moqui.webrootVue.currentLinkUrl; } else { window.location.reload(true); }
    } else if (jqXHR.status === 0) { if (errorThrown.indexOf('abort') < 0) { var msg = 'Could not connect to server';
        moqui.webrootVue.$q.notify($.extend({}, moqui.notifyOptsError, { message:msg }));
        moqui.webrootVue.addNotify(msg, 'negative'); }
    } else if (!notified) { var errMsg = 'Error: ' + errorThrown + ' (' + textStatus + ')';
        moqui.webrootVue.$q.notify($.extend({}, moqui.notifyOptsError, { message:errMsg }));
        moqui.webrootVue.addNotify(errMsg, 'negative');
    }
};

/* ========== component loading methods ========== */
moqui.componentCache = new moqui.LruMap(50);

moqui.handleLoadError = function (jqXHR, textStatus, errorThrown) {
    if (textStatus === 'abort') {
        console.warn('load aborted: ' + textStatus + ' (' + jqXHR.status + '), message ' + errorThrown);
        return;
    }
    moqui.webrootVue.loading = 0;
    moqui.handleAjaxError(jqXHR, textStatus, errorThrown);
};
// NOTE: this may eventually split to change the activeSubscreens only on currentPathList change (for screens that support it)
//     and if ever needed some sort of data refresh if currentParameters changes
moqui.loadComponent = function(urlInfo, callback, divId) {
    var path, extraPath, search, bodyParameters, renderModes;
    if (typeof urlInfo === 'string') {
        var questIdx = urlInfo.indexOf('?');
        if (questIdx > 0) { path = urlInfo.slice(0, questIdx); search = urlInfo.slice(questIdx+1); }
        else { path = urlInfo; }
    } else {
        path = urlInfo.path; extraPath = urlInfo.extraPath; search = urlInfo.search;
        bodyParameters = urlInfo.bodyParameters; renderModes = urlInfo.renderModes;
    }

    /* CACHE DISABLED: issue with more recent Vue JS where cached components don't re-render when assigned so screens don't load
     * to reproduce: make a screen like a dashboad slow loading with a Thread.sleep(5000), from another screen select it
     * in the menu and before it loads click on a link for another screen, won't load and gets into a bad state where
     * nothing in the same path will load, need to somehow force it to re-render;
     * note that vm.$forceUpdate() in subscreens-active component before return false did not work
    // check cache
    // console.info('component lru ' + JSON.stringify(moqui.componentCache.lruList));
    var cachedComp = moqui.componentCache.get(path);
    if (cachedComp) {
        console.info('found cached component for path ' + path + ': ' + JSON.stringify(cachedComp));
        callback(cachedComp);
        return;
    }
    */

    // prep url
    var url = path;
    var isJsPath = (path.slice(-3) === '.js');
    if (!isJsPath && urlInfo.renderModes && urlInfo.renderModes.indexOf("js") >= 0) {
        // screen supports js explicitly so do that
        url += '.js';
        isJsPath = true;
    }
    if (!isJsPath) url += '.qvt';
    if (extraPath && extraPath.length > 0) url += ('/' + extraPath);
    if (search && search.length > 0) url += ('?' + search);

    console.info("loadComponent " + url + (divId ? " id " + divId : ''));
    var ajaxSettings = { type:"GET", url:url, error:moqui.handleLoadError, success: function(resp, status, jqXHR) {
        if (jqXHR.status === 205) {
            var redirectTo = jqXHR.getResponseHeader("X-Redirect-To")
            moqui.webrootVue.setUrl(redirectTo);
            return;
        }
        // console.info(resp);
        if (!resp) { callback(moqui.NotFound); }
        var isServerStatic = (jqXHR.getResponseHeader("Cache-Control").indexOf("max-age") >= 0);
        if (moqui.isString(resp) && resp.length > 0) {
            if (isJsPath || resp.slice(0,7) === 'define(') {
                console.info("loaded JS from " + url + (divId ? " id " + divId : ""));
                var jsCompObj = eval(resp);
                if (jsCompObj.template) {
                    if (isServerStatic) { moqui.componentCache.put(path, jsCompObj); }
                    callback(jsCompObj);
                } else {
                    var htmlUrl = (path.slice(-3) === '.js' ? path.slice(0, -3) : path) + '.qvt';
                    $.ajax({ type:"GET", url:htmlUrl, error:moqui.handleLoadError, success: function (htmlText) {
                        jsCompObj.template = htmlText;
                        if (isServerStatic) { moqui.componentCache.put(path, jsCompObj); }
                        callback(jsCompObj);
                    }});
                }
            } else {
                var templateText = resp.replace(/<script/g, '<m-script').replace(/<\/script>/g, '</m-script>').replace(/<link/g, '<m-stylesheet');
                console.info("loaded HTML template from " + url + (divId ? " id " + divId : "") /*+ ": " + templateText*/);
                // using this fixes encoded values in attributes and such that Vue does not decode (but is decoded in plain HTML),
                //     but causes many other problems as all needed encoding is lost too: moqui.decodeHtml(templateText)
                var compObj = { template: '<div' + (divId && divId.length > 0 ? ' id="' + divId + '"' : '') + '>' + templateText + '</div>' };
                if (isServerStatic) { moqui.componentCache.put(path, compObj); }
                callback(compObj);
            }
        } else if (moqui.isPlainObject(resp)) {
            if (resp.screenUrl && resp.screenUrl.length > 0) { moqui.webrootVue.setUrl(resp.screenUrl); }
            else if (resp.redirectUrl && resp.redirectUrl.length > 0) { window.location.replace(resp.redirectUrl); }
        } else { callback(moqui.NotFound); }
    }};
    if (bodyParameters && !$.isEmptyObject(bodyParameters)) { ajaxSettings.type = "POST"; ajaxSettings.data = bodyParameters; }
    return $.ajax(ajaxSettings);
};

/* ========== placeholder components ========== */
moqui.NotFound = Vue.extend({ template: '<div id="current-page-root"><h4>Screen not found at {{this.$root.currentPath}}</h4></div>' });
moqui.EmptyComponent = Vue.extend({ template: '<div id="current-page-root"><div class="spinner"><div>&nbsp;</div></div></div>' });

/* ========== inline components ========== */
Vue.component('m-link', {
    props: { href:{type:String,required:true}, loadId:String, confirmation:String },
    template: '<a :href="linkHref" @click.prevent="go" class="q-link"><slot></slot></a>',
    methods: { go: function(event) {
        if (event.button !== 0) { return; }
        if (this.confirmation && this.confirmation.length) { if (!window.confirm(this.confirmation)) { return; } }
        if (this.loadId && this.loadId.length > 0) {
            this.$root.loadContainer(this.loadId, this.href);
        } else {
            if (event.ctrlKey || event.metaKey) {
                window.open(this.linkHref, "_blank");
            } else {
                this.$root.setUrl(this.linkHref);
            }
        }
    }},
    computed: { linkHref: function () { return this.$root.getLinkPath(this.href); } }
});
// NOTE: router-link simulates the Vue Router RouterLink component (somewhat, at least enough for Quasar to use with its various 'to' attributes on q-btn, etc)
Vue.component('router-link', {
    props: { to:{type:String,required:true} },
    template: '<a :href="linkHref" @click.prevent="go"><slot></slot></a>',
    methods: {
        go: function(event) {
            if (event.button !== 0) { return; }
            if (event.ctrlKey || event.metaKey) {
                window.open(this.linkHref, "_blank");
            } else {
                this.$root.setUrl(this.linkHref);
            }
        }
    },
    computed: {
        linkHref: function () { return this.$root.getLinkPath(this.to); },
        isActive: function () {
            var path = this.to;
            var questIdx = path.indexOf('?');
            if (questIdx > 0) { path = path.slice(0, questIdx); }
            var activePath = this.$root.currentPath;
            console.warn("router-link path [" + path + "] active path [" + activePath + "]");
            return (activePath.startsWith(path));
        },
        // TODO: this should be equals instead of startsWith()
        isExactActive: function () { return this.isActive; }
    }
});

Vue.component('m-script', {
    props: { src:String, type:{type:String,'default':'text/javascript'} },
    template: '<div :type="type" style="display:none;"><slot></slot></div>',
    created: function() { if (this.src && this.src.length > 0) { moqui.loadScript(this.src); } },
    mounted: function() {
        var innerText = this.$el.innerText;
        if (innerText && innerText.trim().length > 0) {
            // console.info('running: ' + innerText);
            moqui.retryInlineScript(innerText, 1);
            /* these don't work on initial load (with script elements that have @src followed by inline script)
            // eval(innerText);
            var parent = this.$el.parentElement; var s = document.createElement('script');
            s.appendChild(document.createTextNode(this.$el.innerText)); parent.appendChild(s);
            */
        }
        // maybe better not to, nice to see in dom: $(this.$el).remove();
    }
});
Vue.component('m-stylesheet', {
    props: { href:{type:String,required:true}, rel:{type:String,'default':'stylesheet'}, type:{type:String,'default':'text/css'} },
    template: '<div :type="type" style="display:none;"></div>',
    created: function() { moqui.loadStylesheet(this.href, this.rel, this.type); }
});
/* ========== layout components ========== */
Vue.component('container-box', {
    props: { type:{type:String,'default':'default'}, title:String, initialOpen:{type:Boolean,'default':true} },
    data: function() { return { isBodyOpen:this.initialOpen }},
    // TODO: handle type, somehow, with text color and Bootstrap to Quasar mapping
    template:
    '<q-card flat bordered class="q-ma-sm">' +
        '<q-card-actions @click.self="toggleBody">' +
            '<h5 v-if="title && title.length" @click="toggleBody">{{title}}</h5>' +
            '<slot name="header"></slot>' +
            '<q-space></q-space>' +
            '<slot name="toolbar"></slot>' +
        '</q-card-actions>' +
        '<q-card-section :class="{in:isBodyOpen}"><slot></slot></q-card-section>' +
    '</q-card>',
    methods: { toggleBody: function() { this.isBodyOpen = !this.isBodyOpen; } }
});
Vue.component('box-body', {
    props: { height:String },
    data: function() { return this.height ? { dialogStyle:{'max-height':this.height+'px', 'overflow-y':'auto'}} : {dialogStyle:{}}},
    template: '<div class="q-pa-xs" :style="dialogStyle"><slot></slot></div>'
});
Vue.component('m-dialog', {
    name: "mDialog",
    props: { draggable:{type:Boolean,default:true}, value:{type:Boolean,'default':false}, id:String, color:String, width:{type:String}, title:{type:String} },
    data: function() { return { isShown:false }; },
    template:
    '<q-dialog v-bind:value="value" v-on:input="$emit(\'input\', $event)" :id="id" @show="onShow" @hide="onHide">' +
        '<q-card ref="dialogCard" flat bordered :style="{\'min-width\':((width||200)+\'px\')}">' +
            '<q-card-actions ref="dialogHeader" :style="{cursor:(draggable?\'move\':\'default\')}">' +
                '<h5 class="q-pl-sm non-selectable">{{title}}</h5><q-space></q-space>' +
                '<q-btn icon="close" flat round dense v-close-popup></q-btn>' +
            '</q-card-actions><q-separator></q-separator>' +
            '<q-card-section ref="dialogBody"><slot></slot></q-card-section>' +
        '</q-card>' +
    '</q-dialog>',
    methods: {
        onShow: function() {
            if (this.draggable) { this.$refs.dialogHeader.$el.addEventListener("mousedown", this.onGrab); }
            this.focusFirst();
            this.$emit("onShow");
        },
        onHide: function() {
            if (this.draggable) {
                document.removeEventListener("mousemove", this.onDrag);
                document.removeEventListener("mouseup", this.onLetGo);
                this.$refs.dialogHeader && this.$refs.dialogHeader.$el.removeEventListener("mousedown", this.onGrab);
            }
            this.$emit("onHide");
        },
        onDrag: function(e) {
            var targetEl = this.$refs.dialogCard.$el;
            var originalStyles = window.getComputedStyle(targetEl);
            var newLeft = parseInt(originalStyles.left) + e.movementX;
            var newTop = parseInt(originalStyles.top) + e.movementY;

            var windowWidth = window.innerWidth / 2; var windowHeight = window.innerHeight / 2;
            var elWidth = targetEl.offsetWidth / 2; var elHeight = targetEl.offsetHeight / 2;
            var minLeft = -(windowWidth - elWidth - 10);
            var maxLeft = (windowWidth - elWidth - 10);
            var minTop = -(windowHeight - elHeight - 10);
            var maxTop = (windowHeight - elHeight - 10);
            if (newLeft < minLeft) { newLeft = minLeft; } else if (newLeft > maxLeft) { newLeft = maxLeft; }
            if (newTop < minTop) { newTop = minTop; } else if (newTop > maxTop) { newTop = maxTop; }

            targetEl.style.left = newLeft + "px";
            targetEl.style.top = newTop + "px";
        },
        onLetGo: function() {
            document.removeEventListener("mousemove", this.onDrag);
            document.removeEventListener("mouseup", this.onLetGo);
        },
        onGrab: function() {
            document.addEventListener("mousemove", this.onDrag);
            document.addEventListener("mouseup", this.onLetGo);
        },
        focusFirst: function() {
            var jqEl = $(this.$refs.dialogBody.$el);
            var defFocus = jqEl.find(".default-focus");
            if (defFocus.length) { defFocus.focus(); } else { jqEl.find("form :input:visible:not([type='submit']):first").focus(); }
        }
    }
});
Vue.component('container-dialog', {
    name: "containerDialog",
    props: { id:String, color:String, buttonText:String, buttonClass:String, title:String, width:{type:String}, openDialog:{type:Boolean,'default':false} },
    data: function() { return { isShown:false }},
    template:
    '<span>' +
        '<q-btn dense outline no-caps icon="open_in_new" :label="buttonText" :color="color" :class="buttonClass" @click="isShown = true"></q-btn>' +
        '<m-dialog v-model="isShown" :id="id" :title="title" :color="color" :width="width"><slot></slot></m-dialog>' +
    '</span>',
    methods: {
        hide: function() { this.isShown = false; },
    },
    mounted: function() { if (this.openDialog) { this.isShown = true; } }
});
Vue.component('dynamic-container', {
    name: "dynamicContainer",
    props: { id:{type:String,required:true}, url:{type:String} },
    data: function() { return { curComponent:moqui.EmptyComponent, curUrl:"" } },
    template: '<component :is="curComponent"></component>',
    methods: { reload: function() { var saveUrl = this.curUrl; this.curUrl = ""; var vm = this; setTimeout(function() { vm.curUrl = saveUrl; }, 20); },
        load: function(url) { if (this.curUrl === url) { this.reload(); } else { this.curUrl = url; } }},
    watch: { curUrl: function(newUrl) {
        if (!newUrl || newUrl.length === 0) { this.curComponent = moqui.EmptyComponent; return; }
        var vm = this; moqui.loadComponent(newUrl, function(comp) { vm.curComponent = comp; }, this.id);
    }},
    mounted: function() { this.$root.addContainer(this.id, this); this.curUrl = this.url; }
});
Vue.component('dynamic-dialog', {
    name: "dynamicDialog",
    props: { id:{type:String}, url:{type:String,required:true}, color:String, buttonText:String, buttonClass:String, title:String, width:{type:String},
        openDialog:{type:Boolean,'default':false}, dynamicParams:{type:Object,'default':null} },
    data: function() { return { curComponent:moqui.EmptyComponent, curUrl:"", isShown:false} },
    template:
    '<span>' +
        '<q-btn dense outline no-caps icon="open_in_new" :label="buttonText" :color="color" :class="buttonClass" @click="isShown = true"></q-btn>' +
        '<m-dialog ref="dialog" v-model="isShown" :id="id" :title="title" :color="color" :width="width"><component :is="curComponent"></component></m-dialog>' +
    '</span>',
    methods: {
        reload: function() { if (this.isShown) { this.isShown = false; this.isShown = true; }}, // TODO: needs delay? needed at all?
        load: function(url) { this.curUrl = url; },
        hide: function() { this.isShown = false; }
    },
    watch: {
        curUrl: function(newUrl) {
            if (!newUrl || newUrl.length === 0) { this.curComponent = moqui.EmptyComponent; return; }
            var vm = this;
            if (moqui.isPlainObject(this.dynamicParams)) {
                var dpStr = '';
                $.each(this.dynamicParams, function (key, value) {
                    var dynVal = $("#" + value).val();
                    if (dynVal && dynVal.length) dpStr = dpStr + (dpStr.length > 0 ? '&' : '') + key + '=' + dynVal;
                });
                if (dpStr.length) newUrl = newUrl + (newUrl.indexOf("?") > 0 ? '&' : '?') + dpStr;
            }
            moqui.loadComponent(newUrl, function(comp) {
                comp.mounted = function() { this.$nextTick(function () { vm.$refs.dialog.focusFirst(); }); };
                vm.curComponent = comp;
            }, this.id);
        },
        isShown: function(newShown) {
            if (newShown) {
                this.curUrl = this.url;
            } else {
                this.curUrl = "";
            }
        }
    },
    mounted: function() {
        this.$root.addContainer(this.id, this);
        if (this.openDialog) { this.isShown = true; }
    }
});
Vue.component('tree-top', {
    template: '<ul :id="id" class="tree-list"><tree-item v-for="model in itemList" :key="model.id" :model="model" :top="top"/></ul>',
    props: { id:{type:String,required:true}, items:{type:[String,Array],required:true}, openPath:String, parameters:Object },
    data: function() { return { urlItems:null, currentPath:null, top:this }},
    computed: {
        itemList: function() { if (this.urlItems) { return this.urlItems; } return moqui.isArray(this.items) ? this.items : []; }
    },
    methods: { },
    mounted: function() { if (moqui.isString(this.items)) {
        this.currentPath = this.openPath;
        var allParms = $.extend({ moquiSessionToken:this.$root.moquiSessionToken, treeNodeId:'#', treeOpenPath:this.openPath }, this.parameters);
        var vm = this; $.ajax({ type:'POST', dataType:'json', url:this.items, headers:{Accept:'application/json'}, data:allParms,
            error:moqui.handleAjaxError, success:function(resp) { vm.urlItems = resp; /*console.info('tree-top response ' + JSON.stringify(resp));*/ } });
    }}
});
Vue.component('tree-item', {
    template:
    '<li :id="model.id">' +
        '<i v-if="isFolder" @click="toggle" class="glyphicon" :class="{\'glyphicon-chevron-right\':!open, \'glyphicon-chevron-down\':open}"></i>' +
        '<i v-else class="fa fa-square-o"></i>' +
        ' <span @click="setSelected">' +
            '<m-link v-if="model.a_attr" :href="model.a_attr.urlText" :load-id="model.a_attr.loadId" :class="{\'text-success\':selected}">{{model.text}}</m-link>' +
            '<span v-if="!model.a_attr" :class="{\'text-success\':selected}">{{model.text}}</span>' +
        '</span>' +
        '<ul v-show="open" v-if="hasChildren"><tree-item v-for="model in model.children" :key="model.id" :model="model" :top="top"/></ul></li>',
    props: { model:Object, top:Object },
    data: function() { return { open:false }},
    computed: {
        isFolder: function() { var children = this.model.children; if (!children) { return false; }
            if (moqui.isArray(children)) { return children.length > 0 } return true; },
        hasChildren: function() { var children = this.model.children; return moqui.isArray(children) && children.length > 0; },
        selected: function() { return this.top.currentPath === this.model.id; }
    },
    watch: { open: function(newVal) { if (newVal) {
        var children = this.model.children;
        var url = this.top.items;
        if (this.open && children && moqui.isBoolean(children) && moqui.isString(url)) {
            var li_attr = this.model.li_attr;
            var allParms = $.extend({ moquiSessionToken:this.$root.moquiSessionToken, treeNodeId:this.model.id,
                treeNodeName:(li_attr && li_attr.treeNodeName ? li_attr.treeNodeName : ''), treeOpenPath:this.top.currentPath }, this.top.parameters);
            var vm = this; $.ajax({ type:'POST', dataType:'json', url:url, headers:{Accept:'application/json'}, data:allParms,
                error:moqui.handleAjaxError, success:function(resp) { vm.model.children = resp; } });
        }
    }}},
    methods: {
        toggle: function() { if (this.isFolder) { this.open = !this.open; } },
        setSelected: function() { this.top.currentPath = this.model.id; this.open = true; }
    },
    mounted: function() { if (this.model.state && this.model.state.opened) { this.open = true; } }
});
/* ========== general field components ========== */
Vue.component('m-editable', {
    props: { id:{type:String,required:true}, labelType:{type:String,'default':'span'}, labelValue:{type:String,required:true},
        url:{type:String,required:true}, urlParameters:{type:Object,'default':{}},
        parameterName:{type:String,'default':'value'}, widgetType:{type:String,'default':'textarea'},
        loadUrl:String, loadParameters:Object, indicator:{type:String,'default':'Saving'}, tooltip:{type:String,'default':'Click to edit'},
        cancel:{type:String,'default':'Cancel'}, submit:{type:String,'default':'Save'} },
    mounted: function() {
        var reqData = $.extend({ moquiSessionToken:this.$root.moquiSessionToken, parameterName:this.parameterName }, this.urlParameters);
        var edConfig = { indicator:this.indicator, tooltip:this.tooltip, cancel:this.cancel, submit:this.submit,
                name:this.parameterName, type:this.widgetType, cssclass:'editable-form', submitdata:reqData };
        if (this.loadUrl && this.loadUrl.length > 0) {
            var vm = this; edConfig.loadurl = this.loadUrl; edConfig.loadtype = "POST";
            edConfig.loaddata = function(value) { return $.extend({ currentValue:value, moquiSessionToken:vm.$root.moquiSessionToken }, vm.loadParameters); };
        }
        $(this.$el).editable(this.url, edConfig);
    },
    render: function(createEl) { return createEl(this.labelType, { attrs:{ id:this.id, 'class':'editable-label' }, domProps: { innerHTML:this.labelValue } }); }
});

/* ========== form components ========== */
Vue.component('m-form', {
    props: { fieldsInitial:Object, action:{type:String,required:true}, method:{type:String,'default':'POST'},
        submitMessage:String, submitReloadId:String, submitHideId:String, focusField:String, noValidate:Boolean },
    data: function() { return { fields:Object.assign({}, this.fieldsInitial), fieldsChanged:{}, buttonClicked:null }},
    // NOTE: <slot v-bind:fields="fields"> also requires prefix from caller, using <m-form v-slot:default="formProps"> in qvt.ftl macro
    // see https://vuejs.org/v2/guide/components-slots.html
    template: '<q-form ref="qForm" @submit.prevent="submitForm" @reset.prevent="resetForm"><slot v-bind:fields="fields"></slot></q-form>',
    methods: {
        submitForm: function() {
            if (this.noValidate) {
                this.submitGo();
            } else {
                var jqEl = $(this.$el);
                var vm = this;
                this.$refs.qForm.validate().then(function(success) {
                    if (success) {
                        vm.submitGo();
                    } else {
                        // For convenience, attempt to focus the first invalid element.
                        // Begin by finding the first invalid input
                        var invEle = jqEl.find('div.has-error input, div.has-error select, div.has-error textarea').first();
                        if (invEle.length) {
                            // TODO remove this or change to handle Quasar flavor of accordian/panel
                            // If the element is inside a collapsed panel, attempt to open it.
                            // Find parent (if it exists) with class .panel-collapse.collapse (works for accordion and regular panels)
                            var nearestPanel = invEle.parents('div.panel-collapse.collapse').last();
                            if (nearestPanel.length) {
                                // Only bother if the panel is not currently open
                                if (!nearestPanel.hasClass('in')) {
                                    // From there find sibling with class panel-heading
                                    var panelHeader = nearestPanel.prevAll('div.panel-heading').last();
                                    if (panelHeader.length) {
                                        // Here is where accordion and regular panels diverge.
                                        var panelLink = panelHeader.find('a[data-toggle="collapse"]').first();
                                        if (panelLink.length) panelLink.click();
                                        else panelHeader.click();
                                        setTimeout(function() { invEle.focus(); }, 250);
                                    } else invEle.focus();
                                } else invEle.focus();
                            } else invEle.focus();
                        }
                    }
                })
            }
        },
        resetForm: function() {
            this.fields = Object.assign({}, this.fieldsInitial);
            this.fieldsChanged = {};
        },
        submitGo: function() {
            var jqEl = $(this.$el);
            // get button pressed value and disable ASAP to avoid double submit
            var btnName = null, btnValue = null;
            var $btn = $(this.buttonClicked || document.activeElement);
            if ($btn.length && jqEl.has($btn) && $btn.is('button[type="submit"], input[type="submit"], input[type="image"]')) {
                if ($btn.is('[name]')) { btnName = $btn.attr('name'); btnValue = $btn.val(); }
                $btn.prop('disabled', true);
                setTimeout(function() { $btn.prop('disabled', false); }, 3000);
            }
            var formData = new FormData(this.$refs.qForm.$el);
            formData.set('moquiSessionToken', this.$root.moquiSessionToken);
            // NOTE: was using FormData.append() but with 'proper' fields
            $.each(this.fields, function (key, value) { formData.set(key, value); });
            if (btnName) { formData.set(btnName, btnValue); }

            // console.info('m-form parameters ' + JSON.stringify(formData));
            // for (var key of formData.keys()) { console.log('m-form key ' + key + ' val ' + JSON.stringify(formData.get(key))); }
            this.$root.loading++;
            $.ajax({ type:this.method, url:(this.$root.appRootPath + this.action), data:formData, contentType:false, processData:false,
                headers:{Accept:'application/json'}, error:moqui.handleLoadError, success:this.handleResponse });
        },
        handleResponse: function(resp) {
            this.$root.loading--;
            var notified = false;
            // console.info('m-form response ' + JSON.stringify(resp));
            if (resp && moqui.isPlainObject(resp)) {
                notified = moqui.notifyMessages(resp.messageInfos, resp.errors);
                if (resp.screenUrl && resp.screenUrl.length > 0) { this.$root.setUrl(resp.screenUrl); }
                else if (resp.redirectUrl && resp.redirectUrl.length > 0) { window.location.href = resp.redirectUrl; }
            } else { console.warn('m-form no response or non-JSON response: ' + JSON.stringify(resp)) }
            var hideId = this.submitHideId; if (hideId && hideId.length > 0) { $('#' + hideId).modal('hide'); }
            var reloadId = this.submitReloadId; if (reloadId && reloadId.length > 0) { this.$root.reloadContainer(reloadId); }
            var subMsg = this.submitMessage;
            if (subMsg && subMsg.length) {
                var responseText = resp; // this is set for backward compatibility in case message relies on responseText as in old JS
                var message = eval('"' + subMsg + '"');
                moqui.webrootVue.$q.notify($.extend({}, moqui.notifyOpts, { message:message }));
                moqui.webrootVue.addNotify(message, 'success');
            } else if (!notified) {
                moqui.webrootVue.$q.notify($.extend({}, moqui.notifyOpts, { message:"Submit successful" }));
            }
        },
        fieldChange: function (evt) {
            var targetDom = evt.delegateTarget; var targetEl = $(targetDom);
            if (targetEl.hasClass("input-group") && targetEl.children("input").length) {
                // special case for date-time using bootstrap-datetimepicker
                targetEl = targetEl.children("input").first();
                targetDom = targetEl.get(0);
            }
            var changed = false;
            if (targetDom.nodeName === "INPUT" || targetDom.nodeName === "TEXTAREA") {
                if (targetEl.attr("type") === "radio" || targetEl.attr("type") === "checkbox") {
                    changed = targetDom.checked !== targetDom.defaultChecked; }
                else { changed = targetDom.value !== targetDom.defaultValue; }
            } else if (targetDom.nodeName === "SELECT") {
                /* TODO
                if (targetDom.multiple) {
                    var optLen = targetDom.options.length;
                    for (var i = 0; i < optLen; i++) {
                        var opt = targetDom.options[i];
                        if (opt.selected !== opt.defaultSelected) { changed = true; break; }
                    }
                } else {
                    changed = !targetDom.options[targetDom.selectedIndex].defaultSelected;
                }
                 */
            }
            // console.log("changed? " + changed + " node " + targetDom.nodeName + " type " + targetEl.attr("type") + " " + targetEl.attr("name") + " to " + targetDom.value + " default " + targetDom.defaultValue);
            // console.log(targetDom.defaultValue);
            if (changed) {
                this.fieldsChanged[targetEl.attr("name")] = true;
                targetEl.parents(".form-group").children("label").addClass("is-changed");
                targetEl.parents(".form-group").find(".select2-selection").addClass("is-changed");
                targetEl.addClass("is-changed");
            } else {
                this.fieldsChanged[targetEl.attr("name")] = false;
                targetEl.parents(".form-group").children("label").removeClass("is-changed");
                targetEl.parents(".form-group").find(".select2-selection").removeClass("is-changed");
                targetEl.removeClass("is-changed");
            }
        }
    },
    mounted: function() {
        var vm = this;
        var jqEl = $(this.$el);
        /* TODO if (!this.noValidate) jqEl.validate({ errorClass: 'help-block', errorElement: 'span',
            highlight: function(element, errorClass, validClass) { $(element).parents('.form-group').removeClass('has-success').addClass('has-error'); },
            unhighlight: function(element, errorClass, validClass) { $(element).parents('.form-group').removeClass('has-error').addClass('has-success'); }
        });*/
        // TODO jqEl.find('[data-toggle="tooltip"]').tooltip({placement:'auto top'});
        if (this.focusField && this.focusField.length > 0) jqEl.find('[name^="' + this.focusField + '"]').addClass('default-focus').focus();
        // TODO: should not need to watch input fields any more
        // watch changed fields
        jqEl.find(':input').on('change', this.fieldChange);
        // special case for date-time using bootstrap-datetimepicker
        jqEl.find('div.input-group.date').on('change', this.fieldChange);
        // TODO: find other way to get button clicked (Vue event?)
        // watch button clicked
        jqEl.find('button[type="submit"], input[type="submit"], input[type="image"]').on('click', function() { vm.buttonClicked = this; });
    }
});
Vue.component('form-link', {
    props: { fieldsInitial:Object, action:{type:String,required:true}, focusField:String, noValidate:Boolean, bodyParameterNames:Array },
    data: function() { return { fields:Object.assign({}, this.fieldsInitial) }},
    template: '<q-form ref="qForm" @submit.prevent="submitForm" @reset.prevent="resetForm"><slot :clearForm="clearForm" :fields="fields"></slot></q-form>',
    methods: {
        submitForm: function() {
            if (this.noValidate) {
                this.submitGo();
            } else {
                var vm = this;
                this.$refs.qForm.validate().then(function(success) {
                    if (success) {
                        vm.submitGo();
                    } else {
                        // oh no, user has filled in at least one invalid value
                    }
                })
            }
        },
        submitGo: function() {
            // get button pressed value and disable ASAP to avoid double submit
            var btnName = null, btnValue = null;
            var $btn = $(document.activeElement);
            if ($btn.length && $btn.is('button[type="submit"], input[type="submit"], input[type="image"]')) {
                if ($btn.is('[name]')) { btnName = $btn.attr('name'); btnValue = $btn.val(); }
                $btn.prop('disabled', true);
                setTimeout(function() { $btn.prop('disabled', false); }, 3000);
            }

            /* old approach with jQuery serializeArray()
            var parmList = $(this.$refs.qForm.$el).serializeArray();
            $.each(this.fields, function (key, value) { parmList.push({name:key, value:value}); });
            for (var pi=0; pi<parmList.length; pi++) { var parm = parmList[pi]; var key = parm.name; var value = parm.value;
             */

            var formData = new FormData(this.$refs.qForm.$el);
            $.each(this.fields, function (key, value) { formData.set(key, value); });

            var extraList = [];
            var plainKeyList = [];
            var parmStr = "";
            var bodyParameters = null;
            for(var pair of formData.entries()) {
                var key = pair[0]; var value = pair[1];
                if (value.trim().length === 0 || key === "moquiSessionToken" || key === "moquiFormName" || key.indexOf('[]') > 0) continue;
                if (key.indexOf("_op") > 0 || key.indexOf("_not") > 0 || key.indexOf("_ic") > 0) {
                    extraList.push(parm);
                } else {
                    plainKeyList.push(key);
                    if (this.bodyParameterNames && this.bodyParameterNames.indexOf(key) >= 0) {
                        if (!bodyParameters) bodyParameters = {};
                        bodyParameters[key] = value;
                    } else {
                        if (parmStr.length > 0) { parmStr += '&'; }
                        parmStr += (encodeURIComponent(key) + '=' + encodeURIComponent(value));
                    }
                }
            }
            for (var ei=0; ei<extraList.length; ei++) {
                var eparm = extraList[ei]; var keyName = eparm.name.substring(0, eparm.name.indexOf('_'));
                if (plainKeyList.indexOf(keyName) >= 0) {
                    if (parmStr.length > 0) { parmStr += '&'; }
                    parmStr += (encodeURIComponent(eparm.name) + '=' + encodeURIComponent(eparm.value));
                }
            }
            if (btnName && btnValue && btnValue.trim().length) {
                if (parmStr.length > 0) { parmStr += '&'; }
                parmStr += (encodeURIComponent(btnName) + '=' + encodeURIComponent(btnValue));
            }
            var url = this.action;
            if (url.indexOf('?') > 0) { url = url + '&' + parmStr; } else { url = url + '?' + parmStr; }
            // console.log("form-link url " + url + " bodyParameters " + JSON.stringify(bodyParameters));
            this.$root.setUrl(url, bodyParameters);

        },
        resetForm: function() {
            this.fields = Object.assign({}, this.fieldsInitial);
        },
        clearForm: function() {
            // TODO: probably need to iterate over object and clear each value
            this.fields = {};
        }
    },
    mounted: function() {
        var jqEl = $(this.$el);
        /* TODO if (!this.noValidate) jqEl.validate({ errorClass: 'help-block', errorElement: 'span',
            highlight: function(element, errorClass, validClass) { $(element).parents('.form-group').removeClass('has-success').addClass('has-error'); },
            unhighlight: function(element, errorClass, validClass) { $(element).parents('.form-group').removeClass('has-error').addClass('has-success'); }
        });*/
        // TODO jqEl.find('[data-toggle="tooltip"]').tooltip({placement:'auto top'});
        if (this.focusField && this.focusField.length > 0) jqEl.find('[name=' + this.focusField + ']').addClass('default-focus').focus();
    }
});

Vue.component('form-paginate', {
    props: { paginate:Object, formList:Object },
    template:
    '<div v-if="paginate" class="q-pagination row no-wrap items-center">' +
        '<template v-if="paginate.pageIndex > 0">' +
            '<q-btn dense flat no-caps @click.prevent="setIndex(0)" icon="skip_previous"></q-btn>' +
            '<q-btn dense flat no-caps @click.prevent="setIndex(paginate.pageIndex-1)" icon="fast_rewind"></q-btn></template>' +
        '<template v-else><q-btn dense flat no-caps disabled icon="skip_previous"></q-btn><q-btn dense flat no-caps disabled icon="fast_rewind"></q-btn></template>' +
        '<q-btn v-for="prevIndex in prevArray" dense flat no-caps @click.prevent="setIndex(prevIndex)" :label="prevIndex+1" color="primary"></q-btn>' +
        '<q-btn dense flat no-caps disabled>{{paginate.pageIndex+1}} / {{paginate.pageMaxIndex+1}} ({{paginate.pageRangeLow}}-{{paginate.pageRangeHigh}} / {{paginate.count}})</q-btn>' +
        '<q-btn v-for="nextIndex in nextArray" dense flat no-caps @click.prevent="setIndex(nextIndex)" :label="nextIndex+1" color="primary"></q-btn>' +
        '<template v-if="paginate.pageIndex < paginate.pageMaxIndex">' +
            '<q-btn dense flat no-caps @click.prevent="setIndex(paginate.pageIndex+1)" icon="fast_forward"></q-btn>' +
            '<q-btn dense flat no-caps @click.prevent="setIndex(paginate.pageMaxIndex)" icon="skip_next"></q-btn></template>' +
        '<template v-else><q-btn dense flat no-caps disabled icon="fast_forward"></q-btn><q-btn dense flat no-caps disabled icon="skip_next"></q-btn></template>' +
    '</div>',
    computed: {
        prevArray: function() {
            var pag = this.paginate; var arr = []; if (!pag || pag.pageIndex < 1) return arr;
            var pageIndex = pag.pageIndex; var indexMin = pageIndex - 3; if (indexMin < 0) { indexMin = 0; } var indexMax = pageIndex - 1;
            while (indexMin <= indexMax) { arr.push(indexMin++); } return arr;
        },
        nextArray: function() {
            var pag = this.paginate; var arr = []; if (!pag || pag.pageIndex >= pag.pageMaxIndex) return arr;
            var pageIndex = pag.pageIndex; var pageMaxIndex = pag.pageMaxIndex;
            var indexMin = pageIndex + 1; var indexMax = pageIndex + 3; if (indexMax > pageMaxIndex) { indexMax = pageMaxIndex; }
            while (indexMin <= indexMax) { arr.push(indexMin++); } return arr;
        }
    },
    methods: { setIndex: function(newIndex) {
        if (this.formList) { this.formList.setPageIndex(newIndex); } else { this.$root.setParameters({pageIndex:newIndex}); }
    }}
});
Vue.component('form-go-page', {
    props: { idVal:{type:String,required:true}, maxIndex:Number, formList:Object },
    template:
    '<form v-if="!formList || (formList.paginate && formList.paginate.pageMaxIndex > 4)" @submit.prevent="goPage" class="form-inline" :id="idVal+\'_GoPage\'">' +
        '<div class="form-group">' +
            '<label class="sr-only" :for="idVal+\'_GoPage_pageIndex\'">Page Number</label>' +
            '<input type="text" class="form-control" size="6" name="pageIndex" :id="idVal+\'_GoPage_pageIndex\'" placeholder="Page #">' +
        '</div><button type="submit" class="btn btn-default">Go</button>' +
    '</form>',
    methods: { goPage: function() {
        var formList = this.formList;
        var jqEl = $('#' + this.idVal + '_GoPage_pageIndex');
        var newIndex = jqEl.val() - 1;
        if (newIndex < 0 || (formList && newIndex > formList.paginate.pageMaxIndex) || (this.maxIndex && newIndex > this.maxIndex)) {
            jqEl.parents('.form-group').addClass('has-error');
        } else {
            jqEl.parents('.form-group').removeClass('has-error');
            if (formList) { formList.setPageIndex(newIndex); } else { this.$root.setParameters({pageIndex:newIndex}); }
            jqEl.val('');
        }
    }}
});
Vue.component('form-list', {
    // rows can be a full path to a REST service or transition, a plain form name on the current screen, or a JS Array with the actual rows
    props: { name:{type:String,required:true}, id:String, rows:{type:[String,Array],required:true}, search:{type:Object},
            action:String, multi:Boolean, skipForm:Boolean, skipHeader:Boolean, headerForm:Boolean, headerDialog:Boolean,
            savedFinds:Boolean, selectColumns:Boolean, allButton:Boolean, csvButton:Boolean, textButton:Boolean, pdfButton:Boolean,
            columns:[String,Number] },
    data: function() { return { rowList:[], fields:{}, paginate:null, searchObj:null, moqui:moqui } },
    // slots (props): headerForm (search), header (search), nav (), rowForm (fields), row (fields)
    // TODO: QuickSavedFind drop-down
    // TODO: change find options form to update searchObj and run fetchRows instead of changing main page and reloading
    // TODO: update window url on paginate and other searchObj update?
    // TODO: review for actual static (no server side rendering, cachable)
    template:
    '<div>' +
        '<template v-if="!multi && !skipForm">' +
            '<m-form v-for="(fields, rowIndex) in rowList" :name="idVal+\'_\'+rowIndex" :id="idVal+\'_\'+rowIndex" :action="action">' +
                '<slot name="rowForm" :fields="fields"></slot></m-form></template>' +
        '<m-form v-if="multi && !skipForm" :name="idVal" :id="idVal" :action="action">' +
            '<input type="hidden" name="moquiFormName" :value="name"><input type="hidden" name="_isMulti" value="true">' +
            '<template v-for="(fields, rowIndex) in rowList"><slot name="rowForm" :fields="fields"></slot></template></m-form>' +
        '<form-link v-if="!skipHeader && headerForm && !headerDialog" :name="idVal+\'_header\'" :id="idVal+\'_header\'" :action="$root.currentLinkPath">' +
            '<input v-if="searchObj && searchObj.orderByField" type="hidden" name="orderByField" :value="searchObj.orderByField">' +
            '<slot name="headerForm"  :search="searchObj"></slot></form-link>' +
        '<div class="q-table__container q-table__card q-table--horizontal-separator q-table--dense q-table--flat"><table class="q-table" :id="idVal+\'_table\'"><thead>' +
            '<tr class="form-list-nav-row"><th :colspan="columns?columns:\'100\'"><nav class="form-list-nav">' +
                '<button v-if="savedFinds || headerDialog" :id="idVal+\'_hdialog_button\'" type="button" data-toggle="modal" :data-target="\'#\'+idVal+\'_hdialog\'" data-original-title="Find Options" data-placement="bottom" class="btn btn-default"><i class="fa fa-share"></i> Find Options</button>' +
                '<button v-if="selectColumns" :id="idVal+\'_SelColsDialog_button\'" type="button" data-toggle="modal" :data-target="\'#\'+idVal+\'_SelColsDialog\'" data-original-title="Columns" data-placement="bottom" class="btn btn-default"><i class="fa fa-share"></i> Columns</button>' +
                '<form-paginate :paginate="paginate" :form-list="this"></form-paginate>' +
                '<form-go-page :id-val="idVal" :form-list="this"></form-go-page>' +
                '<a v-if="csvButton" :href="csvUrl" class="btn btn-default">CSV</a>' +
                '<button v-if="textButton" :id="idVal+\'_TextDialog_button\'" type="button" data-toggle="modal" :data-target="\'#\'+idVal+\'_TextDialog\'" data-original-title="Text" data-placement="bottom" class="btn btn-default"><i class="fa fa-share"></i> Text</button>' +
                '<button v-if="pdfButton" :id="idVal+\'_PdfDialog_button\'" type="button" data-toggle="modal" :data-target="\'#\'+idVal+\'_PdfDialog\'" data-original-title="PDF" data-placement="bottom" class="btn btn-default"><i class="fa fa-share"></i> PDF</button>' +
                '<slot name="nav"></slot>' +
            '</nav></th></tr>' +
            '<slot name="header" :search="searchObj"></slot>' +
        '</thead><tbody><tr v-for="(fields, rowIndex) in rowList"><slot name="row" :fields="fields" :row-index="rowIndex" :moqui="moqui"></slot></tr>' +
        '</tbody></table></div>' +
    '</div>',
    computed: {
        idVal: function() { if (this.id && this.id.length > 0) { return this.id; } else { return this.name; } },
        csvUrl: function() { return this.$root.currentPath + '?' + moqui.objToSearch($.extend({}, this.searchObj,
                { renderMode:'csv', pageNoLimit:'true', lastStandalone:'true', saveFilename:(this.name + '.csv') })); }
    },
    methods: {
        fetchRows: function() {
            if (moqui.isArray(this.rows)) { console.warn('Tried to fetch form-list-body rows but rows prop is an array'); return; }
            var vm = this;
            var searchObj = this.search; if (!searchObj) { searchObj = this.$root.currentParameters; }
            var url = this.rows; if (url.indexOf('/') === -1) { url = this.$root.currentPath + '/actions/' + url; }
            console.info("Fetching rows with url " + url + " searchObj " + JSON.stringify(searchObj));
            $.ajax({ type:"GET", url:url, data:searchObj, dataType:"json", headers:{Accept:'application/json'},
                     error:moqui.handleAjaxError, success: function(list, status, jqXHR) {
                if (list && moqui.isArray(list)) {
                    var getHeader = jqXHR.getResponseHeader;
                    var count = Number(getHeader("X-Total-Count"));
                    if (count && !isNaN(count)) {
                        vm.paginate = { count:Number(count), pageIndex:Number(getHeader("X-Page-Index")),
                            pageSize:Number(getHeader("X-Page-Size")), pageMaxIndex:Number(getHeader("X-Page-Max-Index")),
                            pageRangeLow:Number(getHeader("X-Page-Range-Low")), pageRangeHigh:Number(getHeader("X-Page-Range-High")) };
                    }
                    vm.rowList = list;
                    console.info("Fetched " + list.length + " rows, paginate: " + JSON.stringify(vm.paginate));
                }
            }});
        },
        setPageIndex: function(newIndex) {
            if (!this.searchObj) { this.searchObj = { pageIndex:newIndex }} else { this.searchObj.pageIndex = newIndex; }
            this.fetchRows();
        }
    },
    watch: {
        rows: function(newRows) { if (moqui.isArray(newRows)) { this.rowList = newRows; } else { this.fetchRows(); } },
        search: function () { this.fetchRows(); }
    },
    mounted: function() {
        if (this.search) { this.searchObj = this.search; } else { this.searchObj = this.$root.currentParameters; }
        if (moqui.isArray(this.rows)) { this.rowList = this.rows; } else { this.fetchRows(); }
    }
});

/* ========== form field widget components ========== */
Vue.component('date-time', {
    props: { id:String, name:{type:String,required:true}, value:String, type:{type:String,'default':'date-time'}, label:String,
        size:String, format:String, tooltip:String, form:String, required:String, autoYear:String, minuteStep:{type:Number,'default':5} },
    template:
    // NOTE: tried :fill-mask="formatVal" but results in all Y, only supports single character for mask placeholder... how to show more helpful date mask?
    // TODO: add back @focus="focusDate" @blur="blurDate" IFF needed given different mask/etc behavior
    '<q-input dense outlined stack-label :label="label" v-bind:value="value" v-on:input="$emit(\'input\', $event)"' +
            ' :mask="inputMask" fill-mask :id="id" :name="name" :form="form">' +
        '<template v-slot:prepend v-if="type==\'date\' || type==\'date-time\' || !type">' +
            '<q-icon name="event" class="cursor-pointer">' +
                '<q-popup-proxy transition-show="scale" transition-hide="scale">' +
                    '<q-date v-bind:value="value" v-on:input="$emit(\'input\', $event)" :mask="formatVal"></q-date>' +
                '</q-popup-proxy>' +
            '</q-icon>' +
        '</template>' +
        '<template v-slot:append v-if="type==\'time\' || type==\'date-time\' || !type">' +
            '<q-icon name="access_time" class="cursor-pointer">' +
                '<q-popup-proxy transition-show="scale" transition-hide="scale">' +
                    '<q-time v-bind:value="value" v-on:input="$emit(\'input\', $event)" :mask="formatVal" format24h></q-time>' +
                '</q-popup-proxy>' +
            '</q-icon>' +
        '</template>' +
    '</q-input>',
    // TODO handle required (:required="required == 'required' ? true : false")
    methods: {
        focusDate: function(event) {
            if (this.type === 'time' || this.autoYear === 'false') return;
            var curVal = this.value;
            if (!curVal || !curVal.length) {
                var startYear = (this.autoYear && this.autoYear.match(/^[12]\d\d\d$/)) ? this.autoYear : new Date().getFullYear()
                this.$emit('input', startYear);
            }
        },
        blurDate: function(event) {
            if (this.type === 'time') return;
            var curVal = this.value;
            // console.log("date/time unfocus val " + curVal);
            // if contains 'd ' (month/day missing, or month specified but date missing or partial) clear input
            // Sufficient to check for just 'd', since the mask handles any scenario where there would only be a single 'd'
            if (curVal.indexOf('d') > 0) { this.$emit('input', ''); return; }
            // default time to noon, or minutes to 00
            if (curVal.indexOf('hh:mm') > 0) { this.$emit('input', curVal.replace('hh:mm', '12:00')); return; }
            if (curVal.indexOf(':mm') > 0) { this.$emit('input', curVal.replace(':mm', ':00')); return; }
        }
    },
    computed: {
        formatVal: function() { var format = this.format; if (format && format.length > 0) { return format; }
            return this.type === 'time' ? 'HH:mm' : (this.type === 'date' ? 'YYYY-MM-DD' : 'YYYY-MM-DD HH:mm'); },
        inputMask: function() { var formatMask = this.formatVal; return formatMask.replace(/\w/g, '#') },
        extraFormatsVal: function() { return this.type === 'time' ? ['LT', 'LTS', 'HH:mm'] :
            (this.type === 'date' ? ['l', 'L', 'YYYY-MM-DD'] : ['YYYY-MM-DD HH:mm', 'YYYY-MM-DD HH:mm:ss', 'MM/DD/YYYY HH:mm']); },
        sizeVal: function() { var size = this.size; if (size && size.length > 0) { return size; }
            return this.type === 'time' ? '9' : (this.type === 'date' ? '10' : '16'); },
        timePattern: function() { return '^(?:(?:([01]?\\d|2[0-3]):)?([0-5]?\\d):)?([0-5]?\\d)$'; }
    },
    mounted: function() {
        var vm = this;
        var value = this.value;
        var format = this.formatVal;
        var jqEl = $(this.$el);
        if (this.type === "time") {
            /* TODO
            jqEl.datetimepicker({toolbarPlacement:'top', debug:false, showClose:true, showClear:true, showTodayButton:true, useStrict:true,
                defaultDate:(value && value.length ? moment(value,this.formatVal) : null), format:format,
                extraFormats:this.extraFormatsVal, stepping:this.minuteStep, locale:this.$root.locale,
                keyBinds: {up: function () { if(this.date()) this.date(this.date().clone().add(1, 'H')); },
                           down: function () { if(this.date()) this.date(this.date().clone().subtract(1, 'H')); },
                           'control up': null, 'control down': null,
                           'shift up': function () { if(this.date()) this.date(this.date().clone().add(this.stepping(), 'm')); },
                           'shift down': function () { if(this.date()) this.date(this.date().clone().subtract(this.stepping(), 'm')); }}});
            jqEl.on("dp.change", function() { jqEl.val(jqEl.find("input").first().val()); jqEl.trigger("change"); vm.$emit('input', this.value); })

            jqEl.val(jqEl.find("input").first().val());
             */

            // TODO if (this.tooltip && this.tooltip.length) jqEl.tooltip({ title: this.tooltip, placement: "auto" });
        } else {
            /* TODO
            jqEl.datetimepicker({toolbarPlacement:'top', debug:false, showClose:true, showClear:true, showTodayButton:true, useStrict:true,
                defaultDate:(value && value.length ? moment(value,this.formatVal) : null), format:format,
                extraFormats:this.extraFormatsVal, stepping:this.minuteStep, locale:this.$root.locale,
                keyBinds: {up: function () { if(this.date()) this.date(this.date().clone().add(1, 'd')); },
                           down: function () { if(this.date()) this.date(this.date().clone().subtract(1, 'd')); },
                           'alt up': function () { if(this.date()) this.date(this.date().clone().add(1, 'M')); },
                           'alt down': function () { if(this.date()) this.date(this.date().clone().subtract(1, 'M')); },
                           'control up': null, 'control down': null,
                           'shift up': function () { if(this.date()) this.date(this.date().clone().add(1, 'y')); },
                           'shift down': function () { if(this.date()) this.date(this.date().clone().subtract(1, 'y')); } }});
            jqEl.on("dp.change", function() { jqEl.val(jqEl.find("input").first().val()); jqEl.trigger("change"); vm.$emit('input', this.value); })

            jqEl.val(jqEl.find("input").first().val());
             */

            // TODO if (this.tooltip && this.tooltip.length) jqEl.tooltip({ title: this.tooltip, placement: "auto" });
        }
        // TODO if (format === "YYYY-MM-DD") { jqEl.find('input').inputmask("yyyy-mm-dd", { clearIncomplete:false, clearMaskOnLostFocus:true, showMaskOnFocus:true, showMaskOnHover:false, removeMaskOnSubmit:false }); }
        // TODO if (format === "YYYY-MM-DD HH:mm") { jqEl.find('input').inputmask("yyyy-mm-dd hh:mm", { clearIncomplete:false, clearMaskOnLostFocus:true, showMaskOnFocus:true, showMaskOnHover:false, removeMaskOnSubmit:false }); }
    }
});
moqui.dateOffsets = [{id:'0',text:'This'},{id:'-1',text:'Last'},{id:'1',text:'Next'},
    {id:'-2',text:'-2'},{id:'2',text:'+2'},{id:'-3',text:'-3'},{id:'-4',text:'-4'},{id:'-6',text:'-6'},{id:'-12',text:'-12'}];
moqui.datePeriods = [{id:'day',text:'Day'},{id:'7d',text:'7 Days'},{id:'30d',text:'30 Days'},{id:'week',text:'Week'},{id:'weeks',text:'Weeks'},
    {id:'month',text:'Month'},{id:'months',text:'Months'},{id:'quarter',text:'Quarter'},{id:'year',text:'Year'},{id:'7r',text:'+/-7d'},{id:'30r',text:'+/-30d'}];
moqui.emptyOpt = {id:'',text:'\u00a0'};
Vue.component('date-period', {
    props: { name:{type:String,required:true}, id:String, allowEmpty:Boolean, offset:String, period:String, date:String,
        fromDate:String, thruDate:String, fromThruType:{type:String,'default':'date'}, form:String },
    data: function() { return { fromThruMode:false, dateOffsets:moqui.dateOffsets.slice(), datePeriods:moqui.datePeriods.slice() } },
    template:
    '<div v-if="fromThruMode"><date-time :name="name+\'_from\'" :id="id+\'_from\'" :form="form" :type="fromThruType" :value="fromDate"/> - ' +
        '<date-time :name="name+\'_thru\'" :id="id+\'_thru\'" :form="form" :type="fromThruType" :value="thruDate"/>' +
        ' <i @click="toggleMode" class="fa fa-arrows-v"></i></div>' +
    '<div v-else class="date-period" :id="id">' +
        '<drop-down :name="name+\'_poffset\'" :options="dateOffsets" :value="offset" :allow-empty="allowEmpty" :form="form"></drop-down> ' +
        '<drop-down :name="name+\'_period\'" :options="datePeriods" :value="period" :allow-empty="allowEmpty" :form="form"></drop-down> ' +
        '<date-time :name="name+\'_pdate\'" :id="id+\'_pdate\'" :form="form" type="date" :value="date"/>' +
        ' <i @click="toggleMode" class="fa fa-arrows-h"></i></div>',
    methods: { toggleMode: function() { this.fromThruMode = !this.fromThruMode; } },
    beforeMount: function() { if (((this.fromDate && this.fromDate.length) || (this.thruDate && this.thruDate.length))) this.fromThruMode = true; }
});
Vue.component('drop-down', {
    props: { value:[Array,String], options:{type:Array,'default':[]}, combo:Boolean, allowEmpty:Boolean, multiple:Boolean, optionsUrl:String,
        serverSearch:{type:Boolean,'default':false}, serverDelay:{type:Number,'default':300}, serverMinLength:{type:Number,'default':1},
        optionsParameters:Object, labelField:{type:String,'default':'label'}, valueField:{type:String,'default':'value'},
        dependsOn:Object, dependsOptional:Boolean, optionsLoadInit:Boolean, form:String, tooltip:String, label:String, name:String, id:String },
    data: function() { return { curOptions:null, lastVal:null, loading:false, fields:this.$parent.fields } },
    template:
        '<q-select ref="qSelect" v-bind:value="value" v-on:input="$emit(\'input\', $event)"' +
                ' dense outlined options-dense use-input fill-input hide-selected :name="name" :id="id" :form="form"' +
                ' input-debounce="500" @filter="filterFn" :clearable="allowEmpty"' +
                ' :multiple="multiple" :use-chips="multiple" :emit-value="true" :map-options="true"' +
                ' stack-label :label="label" :loading="loading" :options="curOptions">' +
            '<q-tooltip v-if="tooltip">{{tooltip}}</q-tooltip>' +
            '<template v-slot:no-option><q-item><q-item-section class="text-grey">No results</q-item-section></q-item></template>' +
        '<slot></slot></q-select>',
    methods: {
        filterFn: function(val, doneFn, abortFn) {
            if (this.options && this.options.length) {
                var vm = this;
                doneFn(function() {
                    if (val && val.length) {
                        var needle = val.toLowerCase();
                        vm.curOptions = vm.options.filter(function (v) {
                            return v.label && v.label.toLowerCase().indexOf(needle) > -1;
                        });
                    } else {
                        vm.curOptions = vm.options;
                    }
                });
            } else if (this.optionsUrl && this.optionsUrl.length) {
                console.log("filterFn calling populateFromUrl" + val);
                if (this.serverSearch && val.length < this.serverMinLength) { abortFn(); return; }
                this.populateFromUrl({term:val}, doneFn, abortFn);
            } else {
                console.error("drop-down " + this.name + " has no options and is no options-url");
                abortFn();
            }
        },
        processOptionList: function(list, page, term) {
            var newData = [];
            var labelField = this.labelField;
            var valueField = this.valueField;
            $.each(list, function(idx, curObj) {
                var valueVal = curObj[valueField];
                var labelVal = curObj[labelField];
                newData.push({ value:valueVal||labelVal, label:labelVal||valueVal });
            });
            return newData;
        },
        serverData: function(params) {
            var hasAllParms = true;
            var dependsOnMap = this.dependsOn;
            var parmMap = this.optionsParameters;
            var reqData = { moquiSessionToken: this.$root.moquiSessionToken };
            for (var parmName in parmMap) { if (parmMap.hasOwnProperty(parmName)) reqData[parmName] = parmMap[parmName]; }
            for (var doParm in dependsOnMap) { if (dependsOnMap.hasOwnProperty(doParm)) {
                var doParmJqEl = $('#' + dependsOnMap[doParm]);
                var doValue = doParmJqEl.val();
                if (!doValue) doValue = doParmJqEl.find('select').val();
                // TODO: support other ways of getting values for other form fields like by 'fields' Object from m-form and form-link
                if (!doValue) { hasAllParms = false; } else { reqData[doParm] = doValue; }
            }}
            if (params) { reqData.term = params.term || ''; reqData.pageIndex = (params.page || 1) - 1; }
            else if (this.serverSearch) { reqData.term = ''; reqData.pageIndex = 0; }
            reqData.hasAllParms = hasAllParms;
            return reqData;
        },
        processResponse: function(data, params) {
            if (moqui.isArray(data)) {
                return { results:this.processOptionList(data, null, params.term) };
            } else {
                params.page = params.page || 1; // NOTE: 1 based index, is 0 based on server side
                var pageSize = data.pageSize || 20;
                return { results: this.processOptionList(data.options, params.page, params.term),
                    pagination: { more: (data.count ? (params.page * pageSize) < data.count : false) } };
            }
        },
        populateFromUrl: function(params, doneFn, abortFn) {
            var reqData = this.serverData(params);
            console.log("populateFromUrl 1 " + this.optionsUrl + " reqData.hasAllParms " + reqData.hasAllParms + " dependsOptional " + this.dependsOptional);
            console.log(reqData);
            if (!this.optionsUrl || !this.optionsUrl.length) {
                console.warn("In drop-down tried to populateFromUrl but no optionsUrl");
                if (abortFn) abortFn();
                return;
            }
            if (!reqData.hasAllParms && !this.dependsOptional) {
                console.warn("In drop-down tried to populateFromUrl but not hasAllParms and not dependsOptional");
                this.curOptions = [];
                if (abortFn) abortFn();
                return;
            }
            var vm = this;
            this.loading = true;
            $.ajax({ type:"POST", url:this.optionsUrl, data:reqData, dataType:"json", headers:{Accept:'application/json'},
                error:function(jqXHR, textStatus, errorThrown) {
                    vm.loading = false;
                    if (abortFn) abortFn();
                    moqui.handleAjaxError(jqXHR, textStatus, errorThrown);
                },
                success: function(data) {
                    var list = moqui.isArray(data) ? data : data.options;
                    var procList = vm.processOptionList(list, null, (params ? params.term : null));
                    if (list) {
                        if (doneFn) {
                            doneFn(function() { vm.curOptions = procList; })
                        } else {
                            vm.curOptions = procList;
                            vm.$refs.qSelect.refresh();
                            vm.$refs.qSelect.updateInputValue();
                        }
                    }
                    vm.loading = false;
                }});
        }
    },
    mounted: function() {
        // TODO: handle combo somehow: if (this.combo) { opts.tags = true; opts.tokenSeparators = [',',' ']; }

        if (this.serverSearch) {
            if (!this.optionsUrl) console.error("drop-down in form " + this.form + " has no options-url but has server-search=true");
        }
        if (this.optionsUrl && this.optionsUrl.length > 0) {
            var dependsOnMap = this.dependsOn;
            for (var doParm in dependsOnMap) { if (dependsOnMap.hasOwnProperty(doParm)) {
                var doJqEl = $('#' + dependsOnMap[doParm]);
                var doSelectJqEl = doJqEl.find("select");
                if (doSelectJqEl && doSelectJqEl.length) {
                    doSelectJqEl.on('input-value', function() { this.populateFromUrl({term:this.value}); });
                } else {
                    doJqEl.on('change', function() { this.populateFromUrl({term:this.value}); });
                }
            } }
            // do initial populate if not a serverSearch or for serverSearch if we have an initial value do the search so we don't display the ID
            if (this.optionsLoadInit) {
                if (!this.serverSearch) { this.populateFromUrl(); }
                else if (this.value && this.value.length && moqui.isString(this.value)) { this.populateFromUrl({term:this.value}); }
            }
        }
    },
    watch: {
        // curVal: function(value) { this.$emit('input', value); },
        // value: function(newVal) { console.trace("drop-down new value " + newVal); },
        options: function(options) { this.curOptions = options; },
        curOptions: function(options) {
            // save the lastVal if there is one to remember what was selected even if new options don't have it, just in case options change again
            if (this.value && this.value.length) this.lastVal = this.value;

            var jqEl = $(this.$el);
            var vm = this;
            // TODO: maybe change this to nextTick()
            setTimeout(function() {
                var setVal = vm.lastVal;
                if (!setVal || !setVal.length) { setVal = vm.value; }
                if (setVal) {
                    var isInList = false;
                    var setValIsArray = moqui.isArray(setVal);
                    $.each(options, function(idx, curObj) {
                        if (setValIsArray ? $.inArray(curObj.value, setVal) : curObj.value === setVal) isInList = true; });
                    // for v-model approach don't set vm.value directly, instead emit input signal
                    if (isInList) vm.$emit('input', setVal);
                }
                // TODO needed? jqEl.trigger('change');
            }, 50);
        }
    },
    destroyed: function() { /* $(this.$el).off().select2('destroy'); */ }
});

/* ========== webrootVue - root Vue component with router ========== */
Vue.component('subscreens-tabs', {
    data: function() { return { pathIndex:-1 }},
    // TODO: how to handle tab.active?
    template:
    '<div v-if="subscreens.length > 0"><q-tabs dense no-caps align="left" active-color="primary" indicator-color="primary" :value="activeTab">' +
        '<q-tab v-for="tab in subscreens" :name="tab.name" :label="tab.title" :disable="tab.disableLink" @click.prevent="goTo(tab.pathWithParams)"></q-tab>' +
    '</q-tabs><q-separator class="q-mb-md"></q-separator></div>',
    methods: {
        goTo: function(pathWithParams) { this.$root.setUrl(this.$root.getLinkPath(pathWithParams)); }
    },
    computed: {
        subscreens: function() {
            if (!this.pathIndex || this.pathIndex < 0) return [];
            var navMenu = this.$root.navMenuList[this.pathIndex];
            if (!navMenu || !navMenu.subscreens) return [];
            return navMenu.subscreens;
        },
        activeTab: function () {
            if (!this.pathIndex || this.pathIndex < 0) return null;
            var navMenu = this.$root.navMenuList[this.pathIndex];
            if (!navMenu || !navMenu.subscreens) return null;
            var activeName = null;
            $.each(navMenu.subscreens, function(idx, tab) { if (tab.active) activeName = tab.name; });
            return activeName;
        }
    },
    // this approach to get pathIndex won't work if the subscreens-active tag comes before subscreens-tabs
    mounted: function() { this.pathIndex = this.$root.activeSubscreens.length; }
});
Vue.component('subscreens-active', {
    data: function() { return { activeComponent:moqui.EmptyComponent, pathIndex:-1, pathName:null } },
    template: '<component :is="activeComponent"></component>',
    // method instead of a watch on pathName so that it runs even when newPath is the same for non-static reloading
    methods: { loadActive: function() {
        var vm = this;
        var root = vm.$root;
        var pathIndex = vm.pathIndex;
        var curPathList = root.currentPathList;
        var newPath = curPathList[pathIndex];
        var pathChanged = (this.pathName !== newPath);
        this.pathName = newPath;
        if (!newPath || newPath.length === 0) {
            console.info("in subscreens-active newPath is empty, loading EmptyComponent and returning true");
            this.activeComponent = moqui.EmptyComponent;
            return true;
        }
        var fullPath = root.basePath + '/' + curPathList.slice(0, pathIndex + 1).join('/');
        if (!pathChanged && moqui.componentCache.containsKey(fullPath)) {
            // no need to reload component
            // console.info("in subscreens-active returning false because pathChanged is false and componentCache contains " + fullPath);
            return false;
        }
        var urlInfo = { path:fullPath };
        if (pathIndex === (curPathList.length - 1)) {
            var extra = root.extraPathList;
            if (extra && extra.length > 0) { urlInfo.extraPath = extra.join('/'); }
        }
        var search = root.currentSearch;
        if (search && search.length > 0) { urlInfo.search = search; }
        urlInfo.bodyParameters = root.bodyParameters;
        var navMenuItem = root.navMenuList[pathIndex + root.basePathSize];
        if (navMenuItem && navMenuItem.renderModes) urlInfo.renderModes = navMenuItem.renderModes;
        console.info('subscreens-active loadActive pathIndex ' + pathIndex + ' pathName ' + vm.pathName + ' urlInfo ' + JSON.stringify(urlInfo));
        root.loading++;
        root.currentLoadRequest = moqui.loadComponent(urlInfo, function(comp) {
            root.currentLoadRequest = null;
            vm.activeComponent = comp;
            root.loading--;
        });
        return true;
    }},
    mounted: function() { this.$root.addSubscreen(this); }
});

moqui.webrootVue = new Vue({
    el: '#apps-root',
    data: { basePath:"", linkBasePath:"", currentPathList:[], extraPathList:[], activeSubscreens:[], currentParameters:{}, bodyParameters:null,
        navMenuList:[], navHistoryList:[], navPlugins:[], notifyHistoryList:[], lastNavTime:Date.now(), loading:0, currentLoadRequest:null, activeContainers:{},
        moquiSessionToken:"", appHost:"", appRootPath:"", userId:"", locale:"en", notificationClient:null, qzVue:null, leftOpen:false },
    methods: {
        setUrl: function(url, bodyParameters) {
            // make sure any open modals are closed before setting current URL
            // TODO replace if needed: $('.modal.in').modal('hide');
            // cancel current load if needed
            if (this.currentLoadRequest) {
                console.log("Aborting current page load currentLinkUrl " + this.currentLinkUrl + " url " + url);
                this.currentLoadRequest.abort();
                this.currentLoadRequest = null;
                this.loading = 0;
            }
            // always set bodyParameters, setting to null when not specified to clear out previous
            this.bodyParameters = bodyParameters;
            url = this.getLinkPath(url);
            // console.info('setting url ' + url + ', cur ' + this.currentLinkUrl);
            if (this.currentLinkUrl === url && url !== this.linkBasePath) {
                this.reloadSubscreens(); /* console.info('reloading, same url ' + url); */
            } else {
                var href = url;
                var ssIdx = href.indexOf('://');
                if (ssIdx >= 0) {
                    var slIdx = href.indexOf('/', ssIdx + 3);
                    if (slIdx === -1) return;
                    href = href.slice(slIdx);
                }
                var splitHref = href.split("?");
                // clear out extra path, to be set from nav menu data if needed
                this.extraPathList = [];
                // set currentSearch before currentPath so that it is available when path updates
                if (splitHref.length > 1 && splitHref[1].length > 0) { this.currentSearch = splitHref[1]; } else { this.currentSearch = ""; }
                this.currentPath = splitHref[0];
                // with url cleaned up through setters now get current screen url for menu
                var srch = this.currentSearch;
                var screenUrl = this.currentPath + (srch.length > 0 ? '?' + srch : '');
                if (!screenUrl || screenUrl.length === 0) return;
                console.info("current URL changing to " + screenUrl);
                this.lastNavTime = Date.now();
                // TODO: somehow only clear out activeContainers that are in subscreens actually reloaded? may cause issues if any but last screen have dynamic-container
                this.activeContainers = {};

                // update menu, which triggers update of screen/subscreen components
                var vm = this;
                var menuDataUrl = this.appRootPath && this.appRootPath.length && screenUrl.indexOf(this.appRootPath) === 0 ?
                    this.appRootPath + "/menuData" + screenUrl.slice(this.appRootPath.length) : "/menuData" + screenUrl;
                $.ajax({ type:"GET", url:menuDataUrl, dataType:"text", error:moqui.handleAjaxError, success: function(outerListText) {
                    var outerList = null;
                    // console.log("menu response " + outerListText);
                    try { outerList = JSON.parse(outerListText); } catch (e) { console.info("Error parson menu list JSON: " + e); }
                    if (outerList && moqui.isArray(outerList)) {
                        vm.navMenuList = outerList;
                        /* console.info('navMenuList ' + JSON.stringify(outerList)); */
                    }
                }});

                // set the window URL
                window.history.pushState(null, this.ScreenTitle, url);
            }
        },
        setParameters: function(parmObj) {
            if (parmObj) { this.$root.currentParameters = $.extend({}, this.$root.currentParameters, parmObj); }
            this.$root.reloadSubscreens();
        },
        addSubscreen: function(saComp) {
            var pathIdx = this.activeSubscreens.length;
            // console.info('addSubscreen idx ' + pathIdx + ' pathName ' + this.currentPathList[pathIdx]);
            saComp.pathIndex = pathIdx;
            // setting pathName here handles initial load of subscreens-active; this may be undefined if we have more activeSubscreens than currentPathList items
            saComp.loadActive();
            this.activeSubscreens.push(saComp);
        },
        reloadSubscreens: function() {
            // console.info('reloadSubscreens path ' + JSON.stringify(this.currentPathList) + ' currentParameters ' + JSON.stringify(this.currentParameters) + ' currentSearch ' + this.currentSearch);
            var fullPathList = this.currentPathList;
            var activeSubscreens = this.activeSubscreens;
            console.info("reloadSubscreens currentPathList " + JSON.stringify(this.currentPathList));
            if (fullPathList.length === 0 && activeSubscreens.length > 0) {
                activeSubscreens.splice(1);
                activeSubscreens[0].loadActive();
                return;
            }
            for (var i=0; i<activeSubscreens.length; i++) {
                if (i >= fullPathList.length) break;
                // always try loading the active subscreen and see if actually loaded
                var loaded = activeSubscreens[i].loadActive();
                // clear out remaining activeSubscreens, after first changed loads its placeholders will register and load
                if (loaded) activeSubscreens.splice(i+1);
            }
        },
        goPreviousScreen: function() {
            var currentPath = this.currentPath;
            var navHistoryList = this.navHistoryList;
            var prevHist;
            for (var hi = 0; hi < navHistoryList.length; hi++) {
                if (navHistoryList[hi].pathWithParams.indexOf(currentPath) < 0) { prevHist = navHistoryList[hi]; break; } }
            if (prevHist && prevHist.pathWithParams && prevHist.pathWithParams.length) this.setUrl(prevHist.pathWithParams)
        },
        // all container components added with this must have reload() and load(url) methods
        addContainer: function(contId, comp) { this.activeContainers[contId] = comp; },
        reloadContainer: function(contId) { var contComp = this.activeContainers[contId];
            if (contComp) { contComp.reload(); } else { console.error("Container with ID " + contId + " not found, not reloading"); }},
        loadContainer: function(contId, url) { var contComp = this.activeContainers[contId];
            if (contComp) { contComp.load(url); } else { console.error("Container with ID " + contId + " not found, not loading url " + url); }},
        addNavPlugin: function(url) { var vm = this; moqui.loadComponent(this.appRootPath + url, function(comp) { vm.navPlugins.push(comp); }) },
        addNavPluginsWait: function(urlList, urlIndex) { if (urlList && urlList.length > urlIndex) {
            this.addNavPlugin(urlList[urlIndex]);
            var vm = this;
            if (urlList.length > (urlIndex + 1)) { setTimeout(function(){ vm.addNavPluginsWait(urlList, urlIndex + 1); }, 500); }
        } },
        addNotify: function(message, type) {
            var histList = this.notifyHistoryList.slice(0);
            var nowDate = new Date();
            var nh = nowDate.getHours(); if (nh < 10) nh = '0' + nh;
            var nm = nowDate.getMinutes(); if (nm < 10) nm = '0' + nm;
            // var ns = nowDate.getSeconds(); if (ns < 10) ns = '0' + ns;
            histList.unshift({message:message, type:type, time:(nh + ':' + nm)}); //  + ':' + ns
            while (histList.length > 25) { histList.pop(); }
            this.notifyHistoryList = histList;
        },
        switchDarkLight: function() {
            var jqBody = $("body"); jqBody.toggleClass("body--light"); jqBody.toggleClass("body--dark");
            var currentStyle = jqBody.hasClass("body--dark") ? "body--dark" : "body--light";
            $.ajax({ type:'POST', url:(this.appRootPath + '/apps/setPreference'), error:moqui.handleAjaxError,
                data:{ moquiSessionToken:this.moquiSessionToken, preferenceKey:'OUTER_STYLE_QUASAR', preferenceValue:currentStyle } });
        },
        showScreenDocDialog: function(docIndex) {
            $("#screen-document-dialog").modal("show");
            $("#screen-document-dialog-body").load(this.currentPath + '/screenDoc?docIndex=' + docIndex);
        },
        stopProp: function (e) { e.stopPropagation(); },
        getNavHref: function(navIndex) {
            if (!navIndex) navIndex = this.navMenuList.length - 1;
            var navMenu = this.navMenuList[navIndex];
            if (navMenu.extraPathList && navMenu.extraPathList.length) {
                var href = navMenu.path + '/' + navMenu.extraPathList.join('/');
                var questionIdx = navMenu.pathWithParams.indexOf("?");
                if (questionIdx > 0) { href += navMenu.pathWithParams.slice(questionIdx); }
                return href;
            } else {
                return navMenu.pathWithParams || navMenu.path;
            }
        },
        getLinkPath: function(path) {
            if (this.appRootPath && this.appRootPath.length && path.indexOf(this.appRootPath) !== 0) path = this.appRootPath + path;
            if (path.indexOf(this.basePath) === 0) path = path.replace(this.basePath, this.linkBasePath);
            return path;
        },
        getQuasarColor: function(bootstrapColor) { return moqui.getQuasarColor(bootstrapColor); }
    },
    watch: {
        navMenuList: function(newList) { if (newList.length > 0) {
            var cur = newList[newList.length - 1];
            var par = newList.length > 1 ? newList[newList.length - 2] : null;
            // if there is an extraPathList set it now
            if (cur.extraPathList) this.extraPathList = cur.extraPathList;
            // make sure full currentPathList and activeSubscreens is populated (necessary for minimal path urls)
            // fullPathList is the path after the base path, menu and link paths are in the screen tree context only so need to subtract off the appRootPath (Servlet Context Path)
            var basePathSize = this.basePathSize;
            var fullPathList = cur.path.split('/').slice(basePathSize + 1);
            console.info('nav updated fullPath ' + JSON.stringify(fullPathList) + ' currentPathList ' + JSON.stringify(this.currentPathList) + ' cur.path ' + cur.path + ' basePathSize ' + basePathSize);
            this.currentPathList = fullPathList;
            this.reloadSubscreens();

            // update history and document.title
            var newTitle = (par ? par.title + ' - ' : '') + cur.title;
            var curUrl = cur.pathWithParams; var questIdx = curUrl.indexOf("?");
            if (questIdx > 0) {
                var excludeKeys = ["pageIndex", "orderBySelect", "orderByField", "moquiSessionToken"];
                var parmList = curUrl.substring(questIdx+1).split("&");
                curUrl = curUrl.substring(0, questIdx);
                var dpCount = 0;
                var titleParms = "";
                for (var pi=0; pi<parmList.length; pi++) {
                    var parm = parmList[pi];
                    if (curUrl.indexOf("?") === -1) { curUrl += "?"; } else { curUrl += "&"; }
                    curUrl += parm;
                    // from here down only add to title parms
                    if (dpCount > 3) continue; // add up to 4 parms to the title
                    var eqIdx = parm.indexOf("=");
                    if (eqIdx > 0) {
                        var key = parm.substring(0, eqIdx);
                        var value = parm.substring(eqIdx + 1);
                        if (key.indexOf("_op") > 0 || key.indexOf("_not") > 0 || key.indexOf("_ic") > 0 || excludeKeys.indexOf(key) > 0 || key === value) continue;
                        if (titleParms.length > 0) titleParms += ", ";
                        titleParms += decodeURIComponent(value);
                        dpCount++;
                    }
                }
                if (titleParms.length > 0) {
                    if (titleParms.length > 70) titleParms = titleParms.substring(0, 70) + "...";
                    newTitle = newTitle + " (" + titleParms + ")";
                }
            }
            var navHistoryList = this.navHistoryList;
            for (var hi=0; hi<navHistoryList.length;) {
                if (navHistoryList[hi].pathWithParams === curUrl) { navHistoryList.splice(hi,1); } else { hi++; } }
            navHistoryList.unshift({ title:newTitle, pathWithParams:curUrl, image:cur.image, imageType:cur.imageType });
            while (navHistoryList.length > 25) { navHistoryList.pop(); }
            document.title = newTitle;
        }},
        currentPathList: function(newList) {
            // console.info('set currentPathList to ' + JSON.stringify(newList) + ' activeSubscreens.length ' + this.activeSubscreens.length);
            var lastPath = newList[newList.length - 1];
            if (lastPath) { $(this.$el).removeClass().addClass(lastPath); }
        }
    },
    computed: {
        currentPath: {
            get: function() { var curPath = this.currentPathList; var extraPath = this.extraPathList;
                return this.basePath + (curPath && curPath.length > 0 ? '/' + curPath.join('/') : '') +
                    (extraPath && extraPath.length > 0 ? '/' + extraPath.join('/') : ''); },
            set: function(newPath) {
                if (!newPath || newPath.length === 0) { this.currentPathList = []; return; }
                if (newPath.slice(newPath.length - 1) === '/') newPath = newPath.slice(0, newPath.length - 1);
                if (newPath.indexOf(this.linkBasePath) === 0) { newPath = newPath.slice(this.linkBasePath.length + 1); }
                else if (newPath.indexOf(this.basePath) === 0) { newPath = newPath.slice(this.basePath.length + 1); }
                this.currentPathList = newPath.split('/');
            }
        },
        currentLinkPath: function() {
            var curPath = this.currentPathList; var extraPath = this.extraPathList;
            return this.linkBasePath + (curPath && curPath.length > 0 ? '/' + curPath.join('/') : '') +
                (extraPath && extraPath.length > 0 ? '/' + extraPath.join('/') : '');
        },
        currentSearch: {
            get: function() { return moqui.objToSearch(this.currentParameters); },
            set: function(newSearch) { this.currentParameters = moqui.searchToObj(newSearch); }
        },
        currentLinkUrl: function() { var srch = this.currentSearch; return this.currentLinkPath + (srch.length > 0 ? '?' + srch : ''); },
        basePathSize: function() { return this.basePath.split('/').length - this.appRootPath.split('/').length; },
        ScreenTitle: function() { return this.navMenuList.length > 0 ? this.navMenuList[this.navMenuList.length - 1].title : ""; },
        documentMenuList: function() {
            var docList = [];
            for (var i = 0; i < this.navMenuList.length; i++) {
                var screenDocList = this.navMenuList[i].screenDocList;
                if (screenDocList && screenDocList.length) { screenDocList.forEach(function(el) { docList.push(el);}); }
            }
            return docList;
        }
    },
    created: function() {
        this.moquiSessionToken = $("#confMoquiSessionToken").val();
        this.appHost = $("#confAppHost").val(); this.appRootPath = $("#confAppRootPath").val();
        this.basePath = $("#confBasePath").val(); this.linkBasePath = $("#confLinkBasePath").val();
        this.userId = $("#confUserId").val();
        this.locale = $("#confLocale").val(); if (moqui.localeMap[this.locale]) this.locale = moqui.localeMap[this.locale];

        var confOuterStyle = $("#confOuterStyle").val();
        if (confOuterStyle) {
            var jqBody = $("body");
            var currentStyle = jqBody.hasClass("body--dark") ? "body--dark" : "body--light";
            if (currentStyle !== confOuterStyle) { jqBody.removeClass(currentStyle); jqBody.addClass(confOuterStyle); }
        }

        this.notificationClient = new moqui.NotificationClient((location.protocol === 'https:' ? 'wss://' : 'ws://') + this.appHost + this.appRootPath + "/notws");

        var navPluginUrlList = [];
        $('.confNavPluginUrl').each(function(idx, el) { navPluginUrlList.push($(el).val()); });
        this.addNavPluginsWait(navPluginUrlList, 0);
    },
    mounted: function() {
        var jqEl = $(this.$el);
        // load the current screen
        this.setUrl(window.location.pathname + window.location.search);
        // init the NotificationClient and register 'displayNotify' as the default listener
        this.notificationClient.registerListener("ALL");

        // request Notification permission on load if not already granted or denied
        if (window.Notification && Notification.permission !== "granted" && Notification.permission !== "denied") {
            Notification.requestPermission(function (status) {
                if (status === "granted") {
                    moqui.notifyMessages("Browser notifications enabled, if you don't want them use browser notification settings to block");
                } else if (status === "denied") {
                    moqui.notifyMessages("Browser notifications disabled, if you want them use browser notification settings to allow");
                }
            });
        }
    }

});
window.addEventListener('popstate', function() { moqui.webrootVue.setUrl(window.location.pathname + window.location.search); });

// NOTE: simulate vue-router so this.$router.resolve() works in a basic form; required for use of q-btn 'to' attribute along with router-link component defined above
moqui.webrootRouter = {
    resolve: function(to, current, append) { return to; },
    replace: function(location, onComplete, onAbort) { moqui.webrootVue.setUrl(location); },
    push: function(location, onComplete, onAbort) { moqui.webrootVue.setUrl(location); },
}
Object.defineProperty(Vue.prototype, '$router', { get: function get () { return moqui.webrootRouter; } });
