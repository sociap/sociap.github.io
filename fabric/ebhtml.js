//
// EBHTML version 2.0.3
//
window.ebhtml = (function() {
    var EBBrowser_defconfig = {
        log: undefined
    };

    // create a generic XMLHttpRequest
    var READYSTATE_COMPLETE = 4;   // Indicates completion state
    // Other browsers (including IE 7.x-8.x) ignore this
    // when XMLHttpRequest is predefined
    if (typeof(XMLHttpRequest) == "undefined") {
    XMLHttpRequest =
        function()   {
        try { return new ActiveXObject("Msxml2.XMLHTTP.6.0"); } catch(e) {}
        try { return new ActiveXObject("Msxml2.XMLHTTP.3.0"); } catch(e) {}
        try { return new ActiveXObject("Msxml2.XMLHTTP"); }     catch(e) {}
        try { return new ActiveXObject("Microsoft.XMLHTTP"); }  catch(e) {}
        throw new Error("This browser does not support XMLHttpRequest.");
    };
    };

    //
    // EBBrowser
    //
    function EBBrowser(config)
    {
        // load configuration
        this.config = EBBrowser_defconfig;
        if (typeof config != 'undefined')
            for (var attrname in config)
                this.config[attrname] = config[attrname];

        // use console.log if none passed and available
        if (typeof this.config.log == 'undefined')
        {
            if (typeof console != 'undefined') 
                this.config.log = function(message) { console.log(message); };
            else
                this.config.log = function() {};
        }

        // load app interface

        // check parent to avoid SecurityException
        var parent_ebflashinterface;
        try {

          if (typeof parent != 'undefined' && typeof parent.ebflashinterface != 'undefined') {
            parent_ebflashinterface = parent.ebflashinterface;
          }
        } catch (e) {
          parent_ebflashinterface = null;
        }

        if (typeof ebflashinterface != 'undefined') {
            console.log('[EBFLASHINTERFACE] Using default');
            this.interface = ebflashinterface;
        } else if (parent_ebflashinterface) {
            // check if in parent
            console.log('[EBFLASHINTERFACE] Using parent');
            this.interface = parent_ebflashinterface;
        } else if (typeof parent != 'undefined' && parent !== self && typeof parent.postMessage != 'undefined') {
            // check if in frame and parent has postMessage
            console.log('[EBFLASHINTERFACE] Using postMessage');
            this.interface = ebmessageinterface;
        } else {
            // mock interface
            console.log('[EBFLASHINTERFACE] Not using');
            this.interface = ebdefaultinterface;
        }

        // default values
        this.isloaded = false;
        this.f_data = {};
        this.f_loaded_callback = null;
        this.f_error_callback = null;
        this.isstopped = false;
        this.autoloaded = true;
		this.nodataiserror = true;
        //this.autostop = true;
    }

    EBBrowser.prototype.addData = function(dataName, required, parameters, alias, basePath)
    {
        required = typeof required != 'undefined' ? required : true;
        parameters = typeof parameters != 'undefined' ? parameters : "";
        alias = typeof alias != 'undefined' && alias != "" ? alias : dataName;
        basePath = typeof basePath != 'undefined' && basePath != "" ? basePath : "";

        this.f_data[alias] = new EBBrowserData(this, dataName, required, parameters, alias, basePath);
    };

    EBBrowser.prototype.load = function(callback, errorcallback)
    {
        if (this.isstopped)
            return false;

        this.isloaded = false;
        this.f_loaded_callback = callback;
        this.f_error_callback = errorcallback;

        for (var dn in this.f_data)
        {
            this.f_data[dn].load();
        }

        this.browserdata_checkloaded();

        return true;
    };

    EBBrowser.prototype.data = function(dataName)
    {
        return this.f_data[dataName].first();
    };

    EBBrowser.prototype.datalist = function(dataName)
    {
        return this.f_data[dataName];
    };

    EBBrowser.prototype.mediaLog = function(appId, data)
    {
        this.log('sending medialog '+appId+' - '+data);
        // TODO
    };

    EBBrowser.prototype.browserdata_loaded = function(browserData)
    {
        this.browserdata_checkloaded();
    };

    EBBrowser.prototype.browserdata_error = function(browserData, error)
    {
        this.browserdata_checkloaded();
    };

    EBBrowser.prototype.browserdata_checkloaded = function()
    {
        if (this.isstopped)
            return false;

        if (this.isloaded)
            return true;

        for (var dn in this.f_data)
        {
            if (!this.f_data[dn].isloaded)
            {
                return false;
            }
            else if (this.f_data[dn].required && this.f_data[dn].iserror)
            {
                this.error(this.f_data[dn].errorObject);
                return false;
            }
            else if (this.f_data[dn].required && this.f_data[dn].count() === 0)
            {
				if(this.browser.nodataiserror) {
					this.error('No data found to be loaded');
					return false;
				} else {
					this.browser.log('No data found to be loaded');
					this.browser.finished();
				}
                
				
				
            }
        }

        this.isloaded = true;

        if (this.f_loaded_callback !== undefined)
            this.f_loaded_callback();

        if (this.autoloaded)
            this.loaded();

        return true;
    };

    // BROWSER COMMUNICATION
    EBBrowser.prototype.log = function(message)
    {
        this.interface.eblog(message);
        this.config.log('[log '+message+']');
    };

    EBBrowser.prototype.finished = function()
    {
        this.interface.ebfinished();
        this.config.log('[finished]');

        this.isstopped = true;
    };

    EBBrowser.prototype.loaded = function()
    {
        this.interface.ebloaded();
        this.config.log('[ebloaded]');
    };

    EBBrowser.prototype.error = function(message)
    {
        this.interface.eberror(message);
        this.config.log('[error '+message+']');

        this.isstopped = true;

        if (this.f_error_callback !== undefined)
            this.f_error_callback(message);
    };

    EBBrowser.prototype.queuechange = function()
    {
        this.interface.ebqueuechange();
        this.config.log('[ebqueuechange]');
    };

    EBBrowser.prototype.interactive = function(name)
    {
        name = typeof name != 'undefined' ? name : "";

        this.interface.ebinteractive(name);
        this.config.log('[interactive '+name+']');
    };

    EBBrowser.prototype.resetTimeout = function(timeout)
    {
        timeout = typeof timeout != 'undefined' ? timeout : "";

        this.interface.ebresettimeout(timeout);
        this.config.log('[resettimeout '+timeout+']');
    };

    EBBrowser.prototype.getQueryParams = function (qs) {

        qs = qs.split('+').join(' ');
    
        var params = {},
            tokens,
            re = /[?&]?([^=]+)=([^&]*)/g;
    
        while (tokens = re.exec(qs)) {
            params[decodeURIComponent(tokens[1])] = decodeURIComponent(tokens[2]);
        }
    
        return params;
    }

    // INFO
    EBBrowser.prototype.baseUrl = function(dataName, parameters, basePath)
    {
        parameters = typeof parameters != 'undefined' ? parameters : "";
        basePath = typeof basePath != 'undefined' ? basePath : "";
        var loadUrl = '';

        if(this.getQueryParams(window.location.search).ebpreview_url != undefined ) {

            var paramsFromURL = this.getQueryParams(window.location.search);
            
            basePath = paramsFromURL.ebpreview_url + '?';

            if(paramsFromURL.ebpreview_cd != undefined)
                basePath += 'cd=' + paramsFromURL.ebpreview_cd + '&';
            
            if(paramsFromURL.ebpreview_id != undefined)
                basePath += 'id=' + paramsFromURL.ebpreview_id + '&';

            if(paramsFromURL.ebpreview_cd != undefined)
                basePath += 'PHPSESSID=' + paramsFromURL.PHPSESSID + '&';

            loadUrl = basePath;

        } else {

            if (basePath == '')
                basePath = '/content/data/';
            if (basePath.substr(-1) != '/')
                basePath = basePath + '/';
    
            loadUrl = basePath+dataName+'?';
        }


        if (parameters !== '')
            loadUrl += parameters + '&';            

        return loadUrl;
    };

    //
    // EBBrowserData
    //
    function EBBrowserData(browser, dataName, required, parameters, alias, basePath)
    {
        this.browser = browser;
        this.dataName = dataName;
        this.required = required;
        this.parameters = parameters;
        this.alias = alias;
        this.basePath = basePath;

        this.f_items = [];
        this.isloaded = false;
        this.iserror = false;
        this.errorObject = null;
        this.isreload = false;
        this.f_dataAlias = {};
    };

    EBBrowserData.prototype.get = function(index)
    {
        return this.f_items[index];
    };

    EBBrowserData.prototype.first = function()
    {
        return this.get(0);
    };

    EBBrowserData.prototype.exists = function(index)
    {
        return index >=0 && index < this.f_items.length;
    };

    EBBrowserData.prototype.count = function()
    {
        return this.f_items.length;
    };

    EBBrowserData.prototype.add = function(item)
    {
        return this.f_items.push(item);
    };

    EBBrowserData.prototype.addDataAlias = function(fieldName, fieldAlias)
    {
        fieldname = fieldname.toLowerCase();
        if (!(fieldName in this.f_dataAlias))
            this.f_dataAlias[fieldName] = [];
        this.f_dataAlias[fieldName].push(fieldAlias);
    };

    EBBrowserData.prototype.getDataAlias = function(fieldName)
    {
        if (fieldName in this.f_dataAlias)
            return this.f_dataAlias[fieldName];
        return [];
    };

    EBBrowserData.prototype.load = function()
    {
        if (this.isloaded && !this.isreload)
            return;

        this.isloaded = false;
        this.iserror = false;
        this.errorObject = null;
        this.f_items = [];
        var parser = new DOMParser();

        var url = this.browser.baseUrl(this.dataName, this.parameters, this.basePath);
        url += "time=" + new Date().getTime();

        var request = new XMLHttpRequest();
        var curebdata = this;
        request.open('GET', url, true);
        request.onreadystatechange = function()
        {
            if (request.readyState === READYSTATE_COMPLETE)
            {
                
                if (request.status === 200 && request.responseXML != undefined)
                {
                    curebdata.XMLLoaded(request.responseXML);
                }
                else if(request.status === 200 && request.responseText != undefined && request.responseText != '')
                {
                    curebdata.XMLLoaded( parser.parseFromString(request.responseText.trim(), "text/xml") );
                }
                else
                {
                    curebdata.XMLError('Error downloading with code '+request.status);
                }
            }
        };
        request.send(null);
    };

    EBBrowserData.prototype.XMLError = function(message)
    {
        this.isloaded = true;
        this.iserror = true;
        this.errorObject = message;
        this.browser.browserdata_error(this, message);
    };

    EBBrowserData.prototype.XMLLoaded = function(AXML)
    {
        var i, j;

        var field;
        var value = '';

        // Loop <EBDATA> root tag
        for (i = 0; i < AXML.firstChild.childNodes.length; i++)
        {
            if (AXML.firstChild.childNodes[i].nodeType === 1)
            {
                // Create instante in position
                var item = new EBBrowserDataItem(this);

                // Set value
                for (j = 0; j < (AXML.firstChild.childNodes[i].childNodes.length); j++)
                {
                    if (AXML.firstChild.childNodes[i].childNodes[j].nodeType === 1)
                    {
                        // Get field name its equal nodeName
                        field = AXML.firstChild.childNodes[i].childNodes[j].nodeName;

                        // Finding value
                        if (AXML.firstChild.childNodes[i].childNodes[j].hasChildNodes())
                        {
                            // Handling value
                            value = this.processString(AXML.firstChild.childNodes[i].childNodes[j].firstChild.nodeValue);
                        }
                        else
                        {
                            // Blank set
                            value = '';
                        }

                        item.setValue(field, value);
                    }
                }

                this.add(item);
            }
        }

        this.isloaded = true;

        // Check exists records
        if (this.required && this.f_items.length <= 0)
        {
			if (this.browser.nodataiserror)
            {
      			this.iserror = true;
				this.errorObject = 'No data found to be loaded';
      			this.browser.browserdata_error(this, this.errorObject);
      		}
            else
            {
				this.browser.log('No data found to be loaded');
				this.browser.finished();
      		}
        }
        else
        {
            this.iserror = false;
            this.errorObject = null;

            // Send log
            this.browser.log(this.f_items.length + ' XML records');

            // call browser
            this.browser.browserdata_loaded(this);
        }
    };

    EBBrowserData.prototype.empty = function(string)
    {
        if (this.iserror || this.f_items.lenght === 0)
            return true;
        return false;
    };

    EBBrowserData.prototype.canReload = function()
    {
        return this.isreload;
    };

    EBBrowserData.prototype.setCanReload = function(value)
    {
        this.isreload = value;
    };

    EBBrowserData.prototype.processString = function(string)
    {
        return string;
    };

    //
    // EBBrowserDataItem
    //
    function EBBrowserDataItem(browserData)
    {
        this.browserData = browserData;
        this.f_data = [];
    };

    EBBrowserDataItem.prototype.value = function(name)
    {
        name = name.toLowerCase();

        if (name in this.f_data)
            return this.f_data[name];

        // check aliases
        for(var alias in this.browserData.getDataAlias(name))
        {
            if (alias in this.f_data)
                return this.f_data[alias];
        }

        //trace('[warning] field '+name+' not found, returning empty value');
        return new EBBrowserDataItemValue('['+name+']');
    };

    EBBrowserDataItem.prototype.setValue = function(name, value)
    {
        this.f_data[name.toLowerCase()] = new EBBrowserDataItemValue(value);
    };

    //
    // EBBrowserDataItemValue
    //
    function EBBrowserDataItemValue(value)
    {
        this.value = value;
    };

    EBBrowserDataItemValue.prototype.setValue = function(name, value)
    {
        this.f_data[name] = new BrowserDataItemValue(value);
    };

    EBBrowserDataItemValue.prototype.toString = function()
    {
        // TODO convert html
        return this.value;
    };

    EBBrowserDataItemValue.prototype.toDatetime = function()
    {
        // TODO convert to date
        return this.value;
    };

    EBBrowserDataItemValue.prototype.toDate = function()
    {
        // TODO convert to date
        return this.value;
    };

    EBBrowserDataItemValue.prototype.toFloat = function()
    {
        // TODO convert to float
        return this.value;
    };

    EBBrowserDataItemValue.prototype.toInt = function()
    {
        // TODO convert to int
        return this.value;
    };

    EBBrowserDataItemValue.prototype.formatDatetime = function()
    {
        // TODO convert to date
        return this.value;
    };

    EBBrowserDataItemValue.prototype.formatDate = function()
    {
        // TODO convert to date
        return this.value;
    };

    EBBrowserDataItemValue.prototype.formatTime = function()
    {
        // TODO convert to date
        return this.value;
    };

    EBBrowserDataItemValue.prototype.formatCurrency = function()
    {
        // TODO convert to date
        return this.value;
    };

    EBBrowserDataItemValue.prototype.formatPercent = function()
    {
        // TODO convert to date
        return this.value;
    };

    EBBrowserDataItemValue.prototype.formatShortDate = function()
    {
        // TODO convert to date
        return this.value;
    };

    EBBrowserDataItemValue.prototype.formatShortTime = function()
    {
        // TODO convert to date
        return this.value;
    };

    EBBrowserDataItemValue.prototype.formatWeekday = function()
    {
        // TODO convert to date
        return this.value;
    };

    EBBrowserDataItemValue.prototype.formatFullWeekday = function()
    {
        // TODO convert to date
        return this.value;
    };

    EBBrowserDataItemValue.prototype.formatMonth = function()
    {
        // TODO convert to date
        return this.value;
    };

    EBBrowserDataItemValue.prototype.loadImage = function(target, width, height, xoffset, yoffset)
    {
        target.src = this.value;
    };

    EBBrowserDataItemValue.prototype.loadImageFit = function(target, leftOffset, topOffset, rightOffset, bottomOffset)
    {
        var img = new Image();
		img.src = this.value;

		var addCanvas = document.createElement("canvas");
		addCanvas.id = "canvasId";
		addCanvas.width = target.offsetWidth;
		addCanvas.height = target.offsetHeight;
		target.appendChild(addCanvas);

		var elemCanvas = document.getElementById("canvasId");
		var ctxCanvas = elemCanvas.getContext("2d");

		img.onload = function(){
			var widthDiff = img.naturalWidth/target.offsetWidth;
			var heightDiff = img.naturalHeight/target.offsetHeight;

			var ratio = img.naturalHeight/img.naturalWidth;

			if(heightDiff > widthDiff){

				var newWidth = target.offsetHeight/ratio;
				ctxCanvas.drawImage(img, (target.offsetWidth-newWidth)/2, 0, newWidth, target.offsetHeight);

			}else{

				var newHeight = target.offsetWidth*ratio;
				ctxCanvas.drawImage(img, 0, (target.offsetHeight-newHeight)/2, target.offsetWidth, newHeight);

			}
		};
    };

    EBBrowserDataItemValue.prototype.loadImageFitFull = function(target)
    {
        var img = new Image();
		img.src = this.value;

		var addCanvas = document.createElement("canvas");
		addCanvas.id = "canvasId";
		addCanvas.width = target.offsetWidth;
		addCanvas.height = target.offsetHeight;
		target.appendChild(addCanvas);

		var elemCanvas = document.getElementById("canvasId");
		var ctxCanvas = elemCanvas.getContext("2d");
		img.onload = function(){

			var widthDiff = img.naturalWidth/target.offsetWidth;
			var heightDiff = img.naturalHeight/target.offsetHeight;
			var ratio = img.naturalHeight/img.naturalWidth;

			if(heightDiff < widthDiff){
				if(heightDiff === 0)
					img.width = img.naturalWidth;
				else
					img.width = target.offsetHeight/ratio;

                var sx = ((img.width-target.offsetWidth)/2)/(img.width/img.naturalWidth);

                ctxCanvas.drawImage(img, (-1)*sx, 0, img.width, target.offsetHeight);


			}else{

				if(widthDiff === 0)
					img.height = img.naturalHeight;
				else
					img.height = target.offsetWidth*ratio;

                var sy = ((img.height-target.offsetHeight)/2)/(img.height/img.naturalHeight);

                ctxCanvas.drawImage(img, 0, (-1)*sy, target.offsetWidth, img.height);


			}
		};
    };

    //
    // base object
    //
    var ebhtml = {
        create: function(config) {
            return new EBBrowser(config);
        },
        create2: function(config, callback) {
            // WebKit
            if (typeof ebflashinterface != 'undefined') {
              var browser = new EBBrowser(config);
              if (callback) callback(browser);
              return browser;
            }

            // webchannel (WebEngine)
            if (typeof(qt) !== 'undefined' && typeof(qt.webChannelTransport) !== 'undefined' && typeof(QWebChannel) !== 'undefined') {
              new QWebChannel(qt.webChannelTransport, function(channel) {
                window.ebflashinterface = channel.objects.ebflashinterface;
                var browser = new EBBrowser(config);
                if (callback) callback(browser);
              });
            }
            else{
                console.log("Could not detect browser platform, assuming default");
                var browser = new EBBrowser(config);
                if (callback) callback(browser);
                return browser;
            }
        }
    };

    var ebdefaultinterface = {
        ebloaded: function() {
            //console.log('--EBLOADED');
        },
        eberror: function(message) {
            //console.log('--EBERROR: '+message);
        },
        eblog: function(message) {
            //console.log('--EBLOG: '+message);
        },
        ebfinished: function() {
            //console.log('--EBFINISGHED');
        },
        ebqueuechange: function() {
            //console.log('--EBQUEUECHANGE');
        },
        ebinteractive: function(name) {
            //console.log('--EBINTERACTIVE: '+name);
        },
        ebresettimeout: function(timeout) {
            //console.log('--EBRESETTIMEOUT: '+timeout);
        }
    };

    var interfaceParams = getUrlParams();

    var ebmessageinterface = {
        ebloaded: function() {

            if(window.frameElement) {
                window.frameElement.dispatchEvent(new CustomEvent('@EBLOADED'));
            } else {
                parent.postMessage('@EBLOADED', '*');
            }
        },
        eberror: function(message) {

            if(window.frameElement) {
                window.frameElement.dispatchEvent(new CustomEvent('@EBERROR', {message: message} ));
            } else {
                parent.postMessage('@EBERROR '+message, '*');
            }
        },
        eblog: function(message) {

            if(window.frameElement) {
                window.frameElement.dispatchEvent(new CustomEvent('@EBLOG', {message: message} ));
            } else {
                parent.postMessage('@EBLOG '+message, '*');
            }
        },
        ebfinished: function() {

            if(window.frameElement) {
                window.frameElement.dispatchEvent(new CustomEvent('@EBFINISHED'));
            } else {
                parent.postMessage('@EBFINISHED ', '*');
            }
        },
        ebqueuechange: function() {

            if(window.frameElement) {
                window.frameElement.dispatchEvent(new CustomEvent('@EBQUEUECHANGE'));
            } else {
                parent.postMessage('@EBQUEUECHANGE ', '*');
            }
        },
        ebinteractive: function(name) {

            if(window.frameElement) {
                window.frameElement.dispatchEvent(new CustomEvent('@EBINTERACTIVE'));
            } else {
                parent.postMessage('@EBINTERACTIVE ', '*');
            }
        },
        ebresettimeout: function(timeout) {

            if(window.frameElement) {
                window.frameElement.dispatchEvent(new CustomEvent('@EBRESETTIMEOUT', {timeout: timeout}));
            } else {
                parent.postMessage('@EBRESETTIMEOUT ', '*');
            }
        },
    };
    
    function getUrlParams() {
        var params = new Object();
        var paramList = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
            params[key] = value;
        });

        return params;
    }


    return ebhtml;
}());
