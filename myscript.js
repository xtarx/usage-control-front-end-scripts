var uc = {
    version: "1.0"
}
var pmp_server_url = "http://localhost:21010/pmp";
// var icon_uri = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAB/klEQVQ4jZWRy2sTURTGvzuTTCczTWYmiU46oT5TJD4Kpl2UdmGLUStFQbsR3bgriNK/QFEQN27ciaWKCAWhqNQQrBSh4qNSEQSpuzYtlbaESBrSRJPeO9dNAiWdYHrgwuE73/2dc+4FHKK/xzqUGI8/nps9/2bqRXxs8Kx13MnnGF2xQHT+52C6kLnEvk6fWcsvX6Dz3/rzvZ3G0YYAz5+eeGJvXOb3b8fuApBuDkev0ZVz9vjDjpGGANPJUzPZxYs2gMMVSUt96itPjHZ8dPILtUIuW1r1SBxdRwwDADQNAU0lYqm4+ashwMTrpTHOKK4P7b8BgNwaaruqejiZnFp9+b/pTQB+AMqr0c632R9xemUgdGfpfXc++ejYFwC+St3ceolUk5lEXzJsuU9m0n+KufVSsTvmCzNK4YKND59/r3lVIvmbibqQKrw7PbwwsG0FSbSJV4Y7qIteKyjqqcX8X49oI5Uq5BQZblmwJTAmbJYZd5y/NQgLQARAK4CmZ/ciI3yuhycetCUBNFXO7toVXNVkOYOVrQVdFfaBUqgyDgIoA+AA0rWNt/1C9W1UGQfAGHSFhAEodXx1Ac2GIrSAUoR0QQUQ2inAbPETDxiDaRDSHsDeHQHaTezZpQkElELgDL0xX7QewOUkRiyZzn7fmLSpDTAG7mLr9QD/ANHUpo+Ln4lLAAAAAElFTkSuQmCC";
//utils
var policies = [];
var selected_policies = "";
var Utils = uc.Utils = {
    isArray: function(obj) {
        return Object.prototype.toString.call(obj) === '[object Array]';
    },
    addEvent: function(ele, evtName, func, captureEventPhase) {
        captureEventPhase = captureEventPhase || false;
        ele.addEventListener(evtName, func, captureEventPhase);
    },
    removeEvent: function(ele, evtName, func, captureEventPhase) {
        captureEventPhase = captureEventPhase || false;
        ele.removeEventListener(evtName, func, captureEventPhase);
    },
    /**
     * return a unique identifier (string)
     */
    guid: function() {
        return ((new Date().getTime()) + "-" + Math.random()).replace(".", "");
    },
    trim: function(str) {
        return str.replace(/^\s+/, '').replace(/\s+$/, '');
    },
    sendMessage: function(win, obj, domain) {
        win.postMessage(JSON.stringify(obj), domain || '*');
    },
    addMessageListener: function(win, func) {
        win.addEventListener("message", function(evt) {
            func(JSON.parse(evt.data), evt);
        }, false);
    },
    clone: function(obj) {
        switch (typeof obj) {
            //don't clone functions
            case "function":
                return;
            case "boolean":
            case "number":
            case "string":
                return obj;
            case "object":
                if (obj === null) {
                    return null;
                } else if (Utils.isArray(obj)) {
                    var newArr = [];
                    for (var i = 0; i < obj.length; i++) {
                        newArr[i] = this.clone(obj[i]);
                    }
                    return newArr;
                } else {
                    var newObj = {};
                    for (var prop in obj) {
                        newObj[prop] = this.clone(obj[prop]);
                    }
                    return newObj;
                }
            default:
                throw Error("clone: unknown data type '" + typeof obj + "'");
        }
    },
    timestamp: function(includeMs) {
        var s = (new Date()).getTime() / 1000;
        return includeMs ? s : Math.floor(s);
    },
    microtime: function() {
        return (new Date()).getTime();
    },
    insertAfter: function(ele, newNode) {
        ele.parentNode.insertBefore(newNode, ele.nextSibling);
    },
    findParent: function(ele, searchFunc) {
        if (typeof searchFunc == "string") {
            var nodeName = searchFunc.toLowerCase();
            searchFunc = function(ele) {
                if (ele.nodeName.toLowerCase() == nodeName) {
                    return ele;
                } else {
                    return null;
                }
            }
        }
        while (ele && ele.nodeName) {
            var result = searchFunc(ele);
            if (result) {
                return result;
            } else {
                ele = ele.parentNode;
            }
        }
        return null;
    },
    inArray: function(val, arr) {
        for (var i = 0; i < arr.length; i++) {
            if (arr[i] == val) {
                return true;
            }
        }
        return false;
    },
    /***
     * return TRUE if value is set (this includes if value == "" or value == 0, but not if value === null or undefined)
     ***/
    isSet: function(val) {
        return (typeof val !== "undefined") && (val !== null);
    },
    /**
     * calls an array of asyncronous functions and then calls callback when they have all finished
     * functions are called in series, the second function waiting for the first function to finish before being called
     * NOTE: the last argument of ALL the functions must be the callback and should be left out of the arguments array (if that makes sence)
     * NOTE: fns should return only one paramenter to it's callback with the results of the asyncronous function
     * IMPORTANT: args should be an array of arrays where the internal arrays are the arguments to pass to an individual function
     **/
    callAsyncs: function(fns, args, finalCallback) {
        //allow a single function to be called multiple times with different arguments
        if (typeof fns == "function") {
            var origFn = fns;
            fns = [];
            for (var i = 0; i < args.length; i++) {
                fns.push(origFn);
            }
        }
        var results = [];
        var callNextFunc = function() {
            if (fns.length) {
                var fn = fns.shift();
                var fnArgs = args.shift();
                //add a callback to this functions arguments
                fnArgs.push(function(result) {
                    results.push(result);
                    callNextFunc();
                });
                fn.apply(fn, fnArgs);
            } else {
                finalCallback(results);
            }
        }
        callNextFunc();
    },
    jsToCSSStyleName: function(jsStyle) {
        return jsStyle.replace(/([A-Z])/g, function(m) {
            return '-' + m.toLowerCase();
        });
    },
    getStyle: function(ele, style) {
        return ele.style[style];
    },
    setStyle: function(ele, style, value) {
        ele.origStyle = ele.origStyle || {};
        if (typeof ele.origStyle[style] === "undefined") {
            ele.origStyle[style] = ele.ownerDocument.defaultView.getComputedStyle(ele, null).getPropertyValue(Utils.jsToCSSStyleName(style));
        }
        if (ele.style[style] != value) {
            ele.style[style] = value;
        }
    },
    restoreStyle: function(ele, style) {
        //restore all saved styles 
        if (ele.origStyle) {
            if (arguments.length === 1) {
                for (var key in ele.origStyle) {
                    ele.style[key] = ele.origStyle[key];
                }
            }
            //or just the one
            else if (typeof ele.origStyle[style] !== "undefined") {
                ele.style[style] = ele.origStyle[style];
            }
        }
    },
    setAttr: function(ele, attr, val) {
        ele.origAttrs = ele.origAttrs || {};
        if (typeof ele.origAttrs[attr] === "undefined") {
            ele.origAttrs[attr] = ele.getAttribute(attr);
        }
        if (ele.getAttribute(attr) != val) {
            ele.setAttribute(attr, val);
        }
    },
    restoreAttr: function(ele, attr) {
        if (ele.origAttrs && typeof ele.origAttrs[attr] != "undefined") {
            if (ele.origAttrs[attr] === null) {
                ele.removeAttribute(attr);
            } else {
                ele.setAttribute(attr, ele.origAttrs[attr]);
            }
        }
    },
    //get the position of an element relative to the document
    getBox: function(ele) {
        var box = ele.getBoundingClientRect();
        //adjustments from jQuery
        var body = ele.ownerDocument.body,
            win = ele.ownerDocument.defaultView,
            docElem = ele.ownerDocument.documentElement,
            clientTop = docElem.clientTop || body.clientTop || 0,
            clientLeft = docElem.clientLeft || body.clientLeft || 0,
            scrollTop = (win.pageYOffset || docElem.scrollTop || body.scrollTop),
            scrollLeft = (win.pageXOffset || docElem.scrollLeft || body.scrollLeft);
        return {
            top: box.top + scrollTop - clientTop,
            left: box.left + scrollLeft - clientLeft,
            width: box.right - box.left,
            height: box.top - box.bottom,
            right: box.right,
            bottom: box.bottom
        };
    },
    fixEvent: function(evt) {
        //offsetX/Y = offset of the mouse event with the event target.
        //this can be calculated from layerX and the 
        if (typeof evt.offsetX == "undefined") {
            //offset = pageX - elements pageX
            var box = Utils.getBox(evt.target);
            evt.offsetX = evt.pageX - box.left;
            evt.offsetY = evt.pageY - box.top;
        }
        return evt;
    },
    ele: function(tagname, attrs, childNodes, parent) {
        var doc = parent ? parent.ownerDocument : document;
        attrs = attrs || {};
        var ele = doc.createElement(tagname);
        //attributes
        for (var attr in attrs) {
            if (attr == "style" && typeof attrs[attr] == "object") {
                var styleStr = "";
                for (var style in attrs[attr]) {
                    styleStr += style + ":" + attrs[attr][style] + ";";
                }
                ele.setAttribute(attr, styleStr);
            } else {
                ele.setAttribute(attr, attrs[attr]);
            }
        }
        //children
        if (childNodes) {
            if (!Utils.isArray(childNodes)) {
                // alert("not array");
                childNodes = [childNodes];
            }
            console.log(childNodes);
            for (var i = 0; i < childNodes.length; i++) {
                if (typeof childNodes[i] == "string") {
                    // alert("append "+i)
                    ele.appendChild(doc.createTextNode(childNodes[i]));
                } else {
                    ele.appendChild(childNodes[i]);
                }
            }
        }
        //and append?
        if (parent) {
            parent.appendChild(ele);
        }
        return ele;
    },
    remove: function(ele) {
        ele.parentNode.removeChild(ele);
    },
    injectCSS: function(css, doc) {
        doc = doc || document;
        return Utils.ele('style', {
            type: 'text/css'
        }, css, doc.getElementsByTagName('head')[0]);
    },
    insertScript: function(src, doc, id) {
        doc = doc || document;
        var script = doc.createElement('script');
        script.setAttribute('type', "text/javascript");
        script.setAttribute('src', src);
        if (id) {
            script.setAttribute('id', id);
        }
        doc.documentElement.appendChild(script);
    },
    extend: function() {
        var newObj = {};
        for (var i = 0; i < arguments.length; i++) {
            for (var key in arguments[i]) {
                newObj[key] = arguments[i][key];
            }
        }
        return newObj;
    },
    //safely base64 encode an object
    base64Encode: function(obj) {
        //convert to string
        var str = JSON.stringify(obj);
        // stringified objects can still contain unicode character
        var escapedStr = encodeURIComponent(str);
        //and finally
        return btoa(escapedStr);
    },
    //safely base64 encode an object
    base64Decode: function(str) {
        try {
            var escapedJson = atob(str);
            var json = decodeURIComponent(escapedJson);
            return JSON.parse(json);
        } catch (e) {
            //uc.logger.error(e);
            return null;
        }
    },
    //convert an array into a hash map (javascript object)
    // eg arrayToMap(['a', 'b', 'c'])
    // returns {'a': true, 'b': true, 'c': true}
    arrayToMap: function(arr, value) {
        value = (typeof value == "undefined") ? true : value;
        var map = {};
        for (var i = 0; i < arr.length; i++) {
            map[arr[i]] = value;
        }
        return map;
    },
    //converts a map into an array
    //NOTE: map keys will be lost
    mapToArray: function(map) {
        var arr = [];
        for (var key in map) {
            arr.push(map[key]);
        }
        return arr;
    },
    mapKeys: function(map) {
        var keys = [];
        for (var key in map) {
            keys.push(key);
        }
        return keys;
    },
    /*
    Compare two version strings (of the form X.X.X.X when X is on integer)
    comparison can be "=", ">", or "<", eg:
    versionCompare("1.2.3", ">", "1.2.0.7");
    returns true;
    */
    versionCompare: function(verStr, comparison, compareToStr) {
        var ver1 = verStr.split(/\./g);
        var ver2 = compareToStr.split(/\./g);
        var segments = (ver1.length > ver2.length) ? ver1.length : ver2.length;
        var result = "";
        for (var i = 0; i < segments; i++) {
            var num1 = ver1[i] ? parseInt(ver1[i]) : 0;
            var num2 = ver2[i] ? parseInt(ver2[i]) : 0;
            if (num1 > num2) {
                result = ">";
                break;
            } else if (num1 < num2) {
                result = "<";
                break;
            }
        }
        if (!result) {
            result = '=';
        }
        return (comparison.indexOf(result) > -1);
    },
    //generate a random alphanumeric string of length x
    randomStr: function(len) {
        var str = '';
        var chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        for (var i = 0; i < len; i++) {
            str += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return str;
    },
    //decodes the query segment of a URL into key/value pairs 
    decodeQuery: function(query) {
        var m, params = {};
        //strip the "?" at the beginning of the query if it exists
        query = query.replace(/^\?/, '');
        //query string should now be of the form aa=bbb&cc=ddd&ee=fff...
        var m = query.match(/([^&=]+)=?([^&]*)/g);
        if (m) {
            for (var i = 0; i < m.length; i++) {
                var bits = m[i].split('=', 2);
                var key = decodeURIComponent(bits[0].replace(/\+/g, ' '));
                var value = decodeURIComponent(bits[1].replace(/\+/g, ' '));
                if (Utils.isArray(params[key])) {
                    params[key].push(value);
                } else if (params[key]) {
                    //convert into an array
                    params[key] = [params[key]];
                    //and add the new value
                    params[key].push(value);
                } else {
                    params[key] = value;
                }
            }
        }
        return params;
    },
    isLargeTextField: function(fieldType) {
        //allow fields and fieldTypes to  be passed
        if (typeof(fieldType) !== "string") {
            fieldType = uc.Content.getFieldType(fieldType);
        }
        //TODO: add wysiwyg/contenteditable iframe
        return (fieldType == "textarea" || fieldType == "contenteditable");
    },
    isLargeTextFieldType: function(fieldType) {
        return (fieldType == "textarea" || fieldType == "contenteditable");
    },
    /**
     * return TRUE if the given document is in edit mode
     */
    isEditableDoc: function(doc) {
        return (doc && (doc.designMode == "on" || (doc.body && doc.body.contentEditable === "true")));
    }
}
// })();
//utils
// menu
ucMenu = function() {
    var self = this;
    self.items = [];
    self.menuEle = null;
    //kludge, so we can tell how wide the menu is before actually showing it
    self.width = 210;
    self.styleEle = null;
    self.css = "ucmenu {\
      background: Menu url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAIAAAB7QOjdAAAALHRFWHRDcmVhdGlvbiBUaW1lAFNhdCAxMyBOb3YgMjAxMCAwOTo0NjoxNSArMTIwMABkIFgAAAAHdElNRQfaCwwULhU/gv0rAAAACXBIWXMAAAsSAAALEgHS3X78AAAABGdBTUEAALGPC/xhBQAAAA9JREFUeNpjePT48f///wETSAWmuDmLnAAAAABJRU5ErkJggg==') repeat-y 28px 0px;\
      border: 1px solid #979797; \
      padding: 2px 2px 2px 2px; \
      font: menu; \
      -webkit-box-shadow: 2px 2px 1px rgba(127, 127, 127, 0.5);\
      color: MenuText; \
      width: 200px;\
      position: absolute;\
      top: 0px;\
      left: 0px;\
      z-index: 9999;\
      display: none;\
    }\
    ucmenuseparator {\
      display: block;\
      height: 0px; \
      margin-top: 3px;\
      margin-bottom: 3px;\
      margin-left: 28px;\
      border-top: 1px solid #E0E0E0;\
      border-bottom: 1px solid ThreeDHighlight;\
    }\
    ucmenuitem {\
      border: 1px solid transparent;\
      display: block;\
      height: 20px;\
      clear: both;\
      cursor: default;\
    }\
    ucmenuitem.disabled {\
      color: #888;\
    }\
    ucmenuitem:hover {\
      border: 1px solid #AECFF7;\
      border-radius: 3px;\
      background: #F2F4F6;\
      background: -moz-linear-gradient(top,  #F2F4F6,  #E6EDF6);\
      background: -webkit-gradient(linear, left top, left bottom, from(#F2F4F6), to(#E6EDF6));\
    }\
    ucmenuitemtext {\
      height: 20px;\
      line-height: 20px;\
      overflow: hidden;\
      white-space: nowrap;\
      text-overflow: ellipsis;\
      width: 165px;\
      padding-left: 8px;\
      display: block;\
      float: left;\
      color: black;\
    }\
    ucmenuitemicon {\
      width: 25px;\
      height: 20px;\
      display: block;\
      float: left;\
    }";
    self.init = function(doc) {
        doc = doc || document;
        //inject styles for this menu
        self.styleEle = uc.Utils.injectCSS(self.css, doc);
        //and build the menuelement
        self.menuEle = uc.Utils.ele('ucmenu', null, null, doc.documentElement);
    }
    self.addItem = function(text, options) {
        var settings = uc.Utils.extend(ucMenu.defaults, options);
        var menuitem = uc.Utils.ele('ucmenuitem', {
            title: settings.tooltip
        }, null, self.menuEle);
        if (settings.disabled) {
            menuitem.setAttribute("class", "disabled");
        }
        menuitem.data = uc.Utils.clone(settings.data);
        uc.Utils.addEvent(menuitem, "mousedown", function(evt) {
            // alert("a7a am clicked "+ evt)
            console.log(evt)
            wTile = evt.target.parentNode;
            console.log(wTile)
            settings.onclick(evt);
            evt.stopPropagation();
            evt.preventDefault();
            self.hide();
            return false;
        });
        var iconStyle = settings.icon ? "background: url('" + settings.icon + "') no-repeat center center" : "";
        menuitem.icon = uc.Utils.ele('ucmenuitemicon', {
            style: iconStyle
        }, null, menuitem);
        menuitem.text = uc.Utils.ele('ucmenuitemtext', null, text, menuitem);
        self.items.push(menuitem);
        return menuitem;
    }
    self.removeItem = function(index) {
        if (self.items[index]) {
            var item = self.items[index];
            item.parentNode.removeChild(item);
            self.items.splice(index, 1);
        } else {
            throw Error("removeItem: item " + index + " doesn't exist");
        }
    }
    self.removeAll = function() {
        self.menuEle.innerHTML = '';
        self.items = [];
    }
    self.addSeparator = function() {
        self.items.push(uc.Utils.ele('ucmenuseparator', null, null, self.menuEle));
    }
    self.remove = function() {
        if (self.menuEle.parentNode) {
            self.menuEle.parentNode.removeChild(self.menuEle);
        }
        if (self.styleEle.parentNode) {
            self.styleEle.parentNode.removeChild(self.styleEle);
        }
    }
    self.position = function(left, top) {
        self.menuEle.style.left = left + "px";
        self.menuEle.style.top = top + "px";
    }
    self.show = function(x, y) {
        if (x || y) {
            self.position(x, y);
        }
        self.menuEle.style.display = "block";
        uc.Utils.addEvent(self.menuEle.ownerDocument, "mousedown", self.onDocClick);
    }
    self.onDocClick = function(evt) {
        //if we click anything except the menu,
        if (!uc.Utils.findParent(evt.target, "ucmenu")) {
            //then hide the menu
            self.hide();
        }
    }
    self.hide = function() {
        // alert("hidign")
        self.menuEle.style.left = "-9999px";
        self.menuEle.style.top = "-9999px";
        self.menuEle.style.display = "none";
        uc.Utils.removeEvent(self.menuEle.ownerDocument, "click", self.onDocClick);
    }
}
ucMenu.defaults = {
    tooltip: '',
    onclick: function() {},
    icon: '',
    data: null,
}
// menu
function addStyleString(str) {
    var node = document.createElement('style');
    node.innerHTML = str;
    document.body.appendChild(node);
}
BUTTON_WIDTH = 16, //pixels
    BUTTON_HEIGHT = 16, //pixels
    current_policy = 0;
// inject_circle()
//add focus lister to everyinput field
function addInputListeners() {
    sels = document.getElementsByTagName('input');
    for (i = 0; i < sels.length; i++) {
        sels[i].addEventListener("click", function(event) {
            var targetElement = event.target || event.srcElement;
            showButton(targetElement);
        }, false);
    }
}

function hideButton(ele) {
    ele.style["backgroundRepeat"] = "no-repeat"
    ele.style["backgroundImage"] = ""
    ele.ucButtonX = (ele.clientWidth - BUTTON_WIDTH);
    ele.style["backgroundPosition"] = ele.ucButtonX + "px 0px"
    // ele.addEventListener("mousedown", buildMenu(ele));
}

function showButton(ele) {
    // alert("show butt")
    ele.style["backgroundRepeat"] = "no-repeat"
    ele.style["backgroundImage"] = "url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAB/klEQVQ4jZWRy2sTURTGvzuTTCczTWYmiU46oT5TJD4Kpl2UdmGLUStFQbsR3bgriNK/QFEQN27ciaWKCAWhqNQQrBSh4qNSEQSpuzYtlbaESBrSRJPeO9dNAiWdYHrgwuE73/2dc+4FHKK/xzqUGI8/nps9/2bqRXxs8Kx13MnnGF2xQHT+52C6kLnEvk6fWcsvX6Dz3/rzvZ3G0YYAz5+eeGJvXOb3b8fuApBuDkev0ZVz9vjDjpGGANPJUzPZxYs2gMMVSUt96itPjHZ8dPILtUIuW1r1SBxdRwwDADQNAU0lYqm4+ashwMTrpTHOKK4P7b8BgNwaaruqejiZnFp9+b/pTQB+AMqr0c632R9xemUgdGfpfXc++ejYFwC+St3ceolUk5lEXzJsuU9m0n+KufVSsTvmCzNK4YKND59/r3lVIvmbibqQKrw7PbwwsG0FSbSJV4Y7qIteKyjqqcX8X49oI5Uq5BQZblmwJTAmbJYZd5y/NQgLQARAK4CmZ/ciI3yuhycetCUBNFXO7toVXNVkOYOVrQVdFfaBUqgyDgIoA+AA0rWNt/1C9W1UGQfAGHSFhAEodXx1Ac2GIrSAUoR0QQUQ2inAbPETDxiDaRDSHsDeHQHaTezZpQkElELgDL0xX7QewOUkRiyZzn7fmLSpDTAG7mLr9QD/ANHUpo+Ln4lLAAAAAElFTkSuQmCC)"
    ele.ucButtonX = (ele.clientWidth - BUTTON_WIDTH);
    ele.style["backgroundPosition"] = ele.ucButtonX + "px 0px"
    ele.addEventListener("mousedown", buildMenu(ele));
}

function buildMenu(ele) {
    console.log("sexy us")
    console.log(ele)
    // alert("build menu")
    var doc = ele.ownerDocument;
    //remove any old menu
    if (doc.ucMenu) {
        doc.ucMenu.remove();
    }
    //build the new menu
    doc.ucMenu = new ucMenu();
    doc.ucMenu.init(doc);
    policies.forEach(function(element) {
        doc.ucMenu.addItem(element.name, {
            onclick: function() {
                setFieldValue(ele, element.name);
                doc.ucMenu.hide();
                ele.focus();
            }
        });
    });
    positionMenu(doc.ucMenu, ele);
    doc.ucMenu.show();
    return doc.ucMenu;
}

function positionMenu(menu, ele) {
    //and show it next to the element
    //XXX FIXME: make this work on framed pages (especially disqus forms which appear inside iframes!)
    var doc = ele.ownerDocument;
    var box = getBox(ele);
    var docBox = getBox(doc.documentElement);
    //default is to attach the menu to the top right corner of the element,
    var x = box.right;
    var y = box.top;
    if (box.right + menu.width >= docBox.right) {
        //if that won't work then we're going to move it to the left so that it actually overlaps the element
        x = box.right - (menu.width + BUTTON_WIDTH);
    }
    menu.position(x, y);
}

function getBox(ele) {
    var box = ele.getBoundingClientRect();
    //adjustments from jQuery
    var body = ele.ownerDocument.body,
        win = ele.ownerDocument.defaultView,
        docElem = ele.ownerDocument.documentElement,
        clientTop = docElem.clientTop || body.clientTop || 0,
        clientLeft = docElem.clientLeft || body.clientLeft || 0,
        scrollTop = (win.pageYOffset || docElem.scrollTop || body.scrollTop),
        scrollLeft = (win.pageXOffset || docElem.scrollLeft || body.scrollLeft);
    return {
        top: box.top + scrollTop - clientTop,
        left: box.left + scrollLeft - clientLeft,
        width: box.right - box.left,
        height: box.top - box.bottom,
        right: box.right,
        bottom: box.bottom
    };
}

function addRestoreTextMenuitem(menu, tidyText, field) {
    // alert("addRestoreTextMenuitem")
    //add the menuitem to the menu
    var menuitem = menu.addItem(tidyText, {
        onclick: function() {
            alert("i am clicked by " + tidyText + "on field " + field.srcElement)
            //console.log("restoring text", text);
            //prevent the onmouseout handler (which will fire when the menu dissapears) from restoring the original text          
            //restore the text
            setFieldValue(field, text);
            menu.hide();
            field.focus();
        }
    });
    //when the user mouses over the menuitem, we want to show the current text temporarily inside the textbox
}

function setFieldValue(field, value) {
    field.setAttribute("concon", "sssc_policy_" + value + "_" + field.name);
    field.style["border"] = "2px solid green"
    field.innerHTML = value;
    //add to array
    //first_name!&!policy1##last_name!&!policy2##age!&!policy3#
    selected_policies += field.name + "!&!" + value + "##";
    var uc_hidden = document.getElementById("uc_protected_fields");
    uc_hidden.value = selected_policies
}

function addHiddenValue() {
    forms = document.getElementsByTagName('form');
    var input = document.createElement("input");
    input.type = "hidden";
    input.name = "uc_protected_fields";
    input.id = "uc_protected_fields";
    forms[0].appendChild(input)
}

function getPolicies() {
    // var transport = new Thrift.Transport(pmp_server_url);
    // var protocol = new Thrift.Protocol(transport);
    // var client = new TAny2PmpClient(protocol);
    // var msg = JSON.stringify(client.listPoliciesPmp());
    // msg = JSON.parse(msg);
    // msg.forEach(function(element) {
    policies.push("hi");
    policies.push("hey");
    // });
}
window.onload = function() {
    getPolicies()
    addInputListeners();
    //append hiddenvalue to form
    addHiddenValue();
}