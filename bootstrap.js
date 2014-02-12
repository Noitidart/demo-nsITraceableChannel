//rsrch experiment observe http modify and respone flags to identify if its a document or not  bootstrap
const {interfaces: Ci,	utils: Cu, classes: Cc} = Components;
Cu.import('resource://gre/modules/Services.jsm');
const chromePath = 'chrome://ghforkable/content/';
const locationToMatch = /http.?:\/\/(.*?.)?github\./;
const ignoreFrames = false;

const httpFlags = { //flags for nsIHttpChannel
	LOAD_REQUESTMASK: 65535,
	LOAD_NORMAL: 0,
	LOAD_BACKGROUND: 1,
	INHIBIT_PIPELINE: 64,
	INHIBIT_CACHING: 128,
	INHIBIT_PERSISTENT_CACHING: 256,
	LOAD_BYPASS_CACHE: 512,
	LOAD_FROM_CACHE: 1024,
	VALIDATE_ALWAYS: 2048,
	VALIDATE_NEVER: 4096,
	VALIDATE_ONCE_PER_SESSION: 8192,
	LOAD_ANONYMOUS: 16384,
	LOAD_FRESH_CONNECTION: 32768,
	LOAD_DOCUMENT_URI: 65536,
	LOAD_RETARGETED_DOCUMENT_URI: 131072,
	LOAD_REPLACE: 262144,
	LOAD_INITIAL_DOCUMENT_URI: 524288,
	LOAD_TARGETED: 1048576,
	LOAD_CALL_CONTENT_SNIFFERS: 2097152,
	LOAD_CLASSIFY_URI: 4194304,
	LOAD_TREAT_APPLICATION_OCTET_STREAM_AS_UNKNOWN: 8388608,
	LOAD_EXPLICIT_CREDENTIALS: 16777216,
	DISPOSITION_INLINE: 0,
	DISPOSITION_ATTACHMENT: 1,
};

function addDiv(theDoc) {
	Cu.reportError('addDiv');
	return;
	if (!theDoc) { Cu.reportError('no doc!'); return; }//document not provided, it is undefined likely
	if (!theDoc instanceof Ci.nsIDOMHTMLDocument) { Cu.reportError('not html doc'); return; }//not html document, so its likely an xul document
	if(!(theDoc.location  && theDoc.location.host.indexOf('github.com') > -1)) {Cu.reportError('location not match host:' + theDoc.location.host); return;}
	Cu.reportError('addDiv match - theDoc.location = "' + theDoc.location + '" | theDoc.location.host = "' + theDoc.location.host + '"');
	
	if (!theDoc.querySelector) {
		theDoc = theDoc.document; //no idea but this is the magic fix for when document-element-inserted calls add div
	}
	
	/*
				var aDOMWindow = thDoc.defaultView.top.QueryInterface(Ci.nsIInterfaceRequestor) //aDOMWindow is the browser
														.getInterface(Ci.nsIWebNavigation)
														.QueryInterface(Ci.nsIDocShellTreeItem)
														.rootTreeItem
														.QueryInterface(Ci.nsIInterfaceRequestor)
														.getInterface(Ci.nsIDOMWindow);
				var gBrowser = aDOMWindow.gBrowser;
				var aTab = gBrowser._getTabForContentWindow(contentWindow.top); //this is the clickable tab xul element, the one found in the tab strip of the firefox window, aTab.linkedBrowser is same as browser var above //can stylize tab like aTab.style.backgroundColor = 'blue'; //can stylize the tab like aTab.style.fontColor = 'red';
				var browser = aTab.linkedBrowser; //this is the browser within the tab //this is where the example in the previous section ends			
	*/
	
	//add here
}

function removeDiv(theDoc, skipChecks) {
	Cu.reportError('removeDiv');
	return;
	if (!skipChecks) {
		if (!theDoc) { Cu.reportError('no doc!'); return; }//document not provided, it is undefined likely
		if (!theDoc instanceof Ci.nsIDOMHTMLDocument) { Cu.reportError('not html doc'); return; }//not html document, so its likely an xul document
		if(!(theDoc.location  && theDoc.location.host.indexOf('github.com') > -1)) {Cu.reportError('location not match host:' + theDoc.location.host); return;}
		Cu.reportError('removeDiv match - theDoc.location = "' + theDoc.location + '" | theDoc.location.host = "' + theDoc.location.host + '"');
	}
	//cDump(theDoc, 'theDoc', 1);
	if (!theDoc.querySelector) {
		theDoc = theDoc.document; //no idea but this is the magic fix for when document-element-inserted calls add div
	}
	
	//remove here
}

var observer = {
    httpModify: {
        observe: function(aSubject, aTopic, aData) {
            //aSubject is i dont know what, but aSubject.documentElement is what we are after
            Cu.reportError('incoming observe httpModify - aSubject: "'+aSubject+'" | aTopic: "'+aTopic+'" | aData: "'+aData+'"');
			
            /*start - do not edit here*/
			var newListener = new TracingListener();
			aSubject.QueryInterface(Ci.nsITraceableChannel);
			newListener.originalListener = aSubject.setNewListener(newListener);
			
			//end trace listening
        },
        register: function() {
            Services.obs.addObserver(observer.httpModify, 'http-on-examine-response', false);
        },
        unregister: function() {
            Services.obs.removeObserver(observer.httpModify, 'http-on-examine-response');
        },
		QueryInterface : function (aIID)    {
			if (aIID.equals(Ci.nsIObserver) || aIID.equals(Ci.nsISupports)) {
				return this;
			}

			throw Components.results.NS_NOINTERFACE;
		}
    }
};
 // Helper function for XPCOM instanciation (from Firebug)
function CCIN(cName, ifaceName) {
    return Cc[cName].createInstance(Ci[ifaceName]);
}

// Copy response listener implementation.
function TracingListener() {
    this.originalListener = null;
    this.receivedData = [];   // array for incoming data.
}

TracingListener.prototype =
{
    onDataAvailable: function(request, context, inputStream, offset, count)
    {
        var binaryInputStream = CCIN("@mozilla.org/binaryinputstream;1",
                "nsIBinaryInputStream");
        var storageStream = CCIN("@mozilla.org/storagestream;1", "nsIStorageStream");
        var binaryOutputStream = CCIN("@mozilla.org/binaryoutputstream;1",
                "nsIBinaryOutputStream");

        binaryInputStream.setInputStream(inputStream);
        storageStream.init(8192, count, null);
        binaryOutputStream.setOutputStream(storageStream.getOutputStream(0));

        // Copy received data as they come.
        var data = binaryInputStream.readBytes(count);
        this.receivedData.push(data);

        binaryOutputStream.writeBytes(data, count);

        this.originalListener.onDataAvailable(request, context,
            storageStream.newInputStream(0), offset, count);
    },

    onStartRequest: function(request, context) {
        this.originalListener.onStartRequest(request, context);
    },

    onStopRequest: function(request, context, statusCode) //request is same as aSubject from observe
    {
        // Get entire response
        var responseSource = this.receivedData.join();
		
		///////////combining loadContext from http-on-examine-response to get contentWindow
            var oHttp = request.QueryInterface(Ci.nsIHttpChannel); //i used nsIHttpChannel but i guess you can use nsIChannel, im not sure why though //i thought oHttp == request but its not true, i have to QI it //if i set back to = request then load soundcloud site where there is LOAD_DOCUMENT_URI and LOAD_INITIAL_DOCUMENT_URI it will come up with loadContext undefined but if you look at it they look the same
			if (oHttp) {
				try {
					var interfaceRequestor = oHttp.notificationCallbacks.QueryInterface(Components.interfaces.nsIInterfaceRequestor);
					//var DOMWindow = interfaceRequestor.getInterface(Components.interfaces.nsIDOMWindow); //not to be done anymore because: https://developer.mozilla.org/en-US/docs/Updating_extensions_for_Firefox_3.5#Getting_a_load_context_from_a_request //instead do the loadContext stuff below
					var loadContext;
					try {
						loadContext = interfaceRequestor.getInterface(Ci.nsILoadContext);
					} catch (ex) {
						try {
							loadContext = aSubject.loadGroup.notificationCallbacks.getInterface(Components.interfaces.nsILoadContext);
							//in ff26 aSubject.loadGroup.notificationCallbacks was null for me, i couldnt find a situation where it wasnt null, but whenever this was null, and i knew a loadContext is supposed to be there, i found that "interfaceRequestor.getInterface(Components.interfaces.nsILoadContext);" worked fine, so im thinking in ff26 it doesnt use aSubject.loadGroup.notificationCallbacks anymore, but im not sure
						} catch (ex2) {
							loadContext = null;
							//this is a problem i dont know why it would get here
						}
					}
					/*end do not edit here*/
					/*start - do all your edits below here*/
				} catch (ex0) {
					
				}
				
				if (loadContext) {
					//todo: cDump(loadCotext,'loadContext',1); //find how i can get contentWindow so i cant test it agaisnt .frameElement
					var contentWindow = loadContext.associatedWindow; //this is the contentWindow of the document or the frameElement
				} else {
					Cu.reportError('EXCEPTION: Load Context Not Found!!');
				}

				var hasFlags = []; // if has LOAD_DOCUMENT_URI it usually also has LOAD_INITIAL_DOCUMENT_URI if its yop window, but on vie source we just see LOAD_DOCUMENT_URI. If frame we just see LOAD_DOCUMENT_URI. js css files  etc (i think just some imgs fire http modify, not sure, maybe all but not if cached) come in with LOAD_CLASSIFY_URI or no flags (0) 
				//note however, that if there is a redirect, you will get the LOAD_DOC_URI and the LOAD_INIT_DOC_URI on initial and then on consequent redirects until final redirect. All redirects have LOAD_REPLACE flag tho
				//note: i think all imgs throw http-on-modify but cahced images dont. images can also have LOAD_REPLACE flag
				/*
				nly time i saw flag == 0 is for favicon and:
				oHttp.name=http://stats.g.doubleclick.net/__utm.gif?utmwv=5.4.7dc&utms=2&utmn=1676837371&utmhn=www.w3schools.com&utmcs=windows-1252&utmsr=1280x1024&utmvp=1280x930&utmsc=24-bit&utmul=en-us&utmje=0&utmfl=12.0%20r0&utmdt=Tryit%20Editor%20v1.8&utmhid=421453928&utmr=-&utmp=%2Fjs%2Ftryit.asp%3Ffilename%3Dtryjs_myfirst&utmht=1391732799038&utmac=UA-3855518-1&utmcc=__utma%3D119627022.1168943572.1391716829.1391726523.1391732238.5%3B%2B__utmz%3D119627022.1391716904.2.2.utmcsr%3Dbing%7Cutmccn%3D(organic)%7Cutmcmd%3Dorganic%7Cutmctr%3Dw3schools%2520javascript%3B&utmu=q~
				*/
				/*
					//for github after LOAD_DOCUMENT_URI, it the does: 
					"LOAD_REQUESTMASK | 
					LOAD_BACKGROUND | 
					INHIBIT_PIPELINE | 
					LOAD_EXPLICIT_CREDENTIALS | 
					DISPOSITION_ATTACHMENT"
					//so tested on w3schools, if flags come out to be this above, then it is an ajax request, can have INHIBIT_CACHING flag
				*/
				/*
				notes start for http-on-examine-response
				if redirecting, do not get the initial redirects, only get the final redirect with LOAD_REPLACE and LOAD_DOCUMENT_URI and LOAD_INITIAL_DOCUMENT_URI
				*/
				for (var f in httpFlags) {
					if (oHttp.loadFlags & httpFlags[f]) {
						hasFlags.push(f);
					}
				}

				if (oHttp.loadFlags & httpFlags.LOAD_DOCUMENT_URI) {
					//i think if it has these document flags its got to have a loadContext and a .associatedWindow
					if (ignoreFrames) {
						if (oHttp.loadFlags & httpFlags.LOAD_INITIAL_DOCUMENT_URI) {
						
						} else {
							//this is a frame
							Cu.reportError('frame and ignoring frame');
							return;
						}
					}
					//var contentWindow = loadContext.associatedWindow; //this is the where the contents of the web site shows (usually html or xul) window

				}
			}
				var testThese = {
					'vals': {}
				}
				testThese.vals['oHttp'] = oHttp;
				testThese.vals['interfaceRequestor'] = interfaceRequestor;
				testThese.vals['loadContext'] = loadContext;
				try {
					testThese.vals['loadContext.associatedWindow'] =loadContext.associatedWindow;
				} catch (ex) { testThese.vals['loadContext.associatedWindow'] = ex}				
				try {
					testThese.vals['oHttp hasFlags'] = hasFlags.join(' | ');
				} catch (ex) { testThese.vals['oHttp hasFlags'] = ex}
				try {
					testThese.vals['oHttp.loadFlags'] = oHttp.loadFlags;
				} catch (ex) { testThese.vals['oHttp.loadFlags'] = ex}
				try {
					testThese.vals['oHttp.name'] = oHttp.name;
				} catch (ex) { testThese.vals['oHttp.name'] = ex}
				try {
					testThese.vals['uri spec'] = oHttp.URI.spec;
				} catch (ex) { testThese.vals['uri spec'] = ex}
				
				testThese.vals['request'] = request;
				testThese.vals['context'] = context;
				testThese.vals['statusCode'] = statusCode;
				testThese.vals['responseSource'] = String(responseSource).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
				
				
				//i want deep on these:
				testThese['oHttp'] = oHttp;
				try {
					testThese['interfaceRequestor(oHttp.notificationCallbacks)'] = interfaceRequestor;
				} catch (ex) { testThese['interfaceRequestor(oHttp.notificationCallbacks)'] = ex}
				
				testThese['loadContext'] = loadContext;
				try {
					testThese['loadContext.associatedWindow'] = loadContext.associatedWindow;
				} catch (ex) { testThese['loadContext.associatedWindow'] = ex}
				
			
			testThese['request'] = request;
			
			cDump(testThese,'nsitrace',2,false);
		//////////eeeend
		
		
		
		
        this.originalListener.onStopRequest(request, context, statusCode);
    },

    QueryInterface: function (aIID) {
        if (aIID.equals(Ci.nsIStreamListener) ||
            aIID.equals(Ci.nsISupports)) {
            return this;
        }
        throw Components.results.NS_NOINTERFACE;
    }
}

function loadIntoWindow (aDOMWindow, aXULWindow) {
	if (!aDOMWindow) {
		return;
	}
	if (aDOMWindow.gBrowser) {
		if (aDOMWindow.gBrowser.tabContainer) {
			//has tabContainer
			//start - go through all tabs in this window we just added to
			var tabs = aDOMWindow.gBrowser.tabContainer.childNodes;
			for (var i = 0; i < tabs.length; i++) {
				Cu.reportError('DOING tab: ' + i);
				var tabBrowser = tabs[i].linkedBrowser;
				var win = tabBrowser.contentWindow;
				loadIntoContentWindowAndItsFrames(win);
			}
			//end - go through all tabs in this window we just added to
		} else {
			//does not have tabContainer
			var win = aDOMWindow.gBrowser.contentWindow;
			loadIntoContentWindowAndItsFrames(win);
		}
	} else {
		//window does not have gBrowser
		//Cu.reportError('not a match its just doing non-gBrowser-ed window');
		loadIntoContentWindowAndItsFrames(aDOMWindow);
	}
}

function unloadFromWindow(aDOMWindow, aXULWindow) {
	if (!aDOMWindow) {
		return;
	}
	if (aDOMWindow.gBrowser) {
		if (aDOMWindow.gBrowser.tabContainer) {
			//has tabContainer
			//start - go through all tabs in this window we just added to
			var tabs = aDOMWindow.gBrowser.tabContainer.childNodes;
			for (var i = 0; i < tabs.length; i++) {
				Cu.reportError('DOING tab: ' + i);
				var tabBrowser = tabs[i].linkedBrowser;
				var win = tabBrowser.contentWindow;
				unloadFromContentWindowAndItsFrames(win);
			}
			//end - go through all tabs in this window we just added to
		} else {
			//does not have tabContainer
			var win = aDOMWindow.gBrowser.contentWindow;
			unloadFromContentWindowAndItsFrames(win);
		}
	} else {
		//window does not have gBrowser
		Cu.reportError('match in non-gBrowser-ed window');
		unloadFromContentWindowAndItsFrames(aDOMWindow);
	}
}

function loadIntoContentWindowAndItsFrames(theWin) {
	var frames = theWin.frames;
	var winArr = [theWin];
	for (var j = 0; j < frames.length; j++) {
		winArr.push(frames[j].window);
	}
	Cu.reportError('# of frames in tab: ' + frames.length);
	for (var j = 0; j < winArr.length; j++) {
		if (j == 0) {
			Cu.reportError('**checking win: ' + j + ' location = ' + winArr[j].document.location);
		} else {
			Cu.reportError('**checking frame win: ' + j + ' location = ' + winArr[j].document.location);
		}
		var doc = winArr[j].document;
		//START - edit below here
		addDiv(doc);
		if (ignoreFrames) {
			break; //if want to ignore frames then break here
		}
		//END - edit above here
	}
}

function unloadFromContentWindowAndItsFrames(theWin) {
	var frames = theWin.frames;
	var winArr = [theWin];
	for (var j = 0; j < frames.length; j++) {
		winArr.push(frames[j].window);
	}
	Cu.reportError('# of frames in tab: ' + frames.length);
	for (var j = 0; j < winArr.length; j++) {
		if (j == 0) {
			Cu.reportError('**checking win: ' + j + ' location = ' + winArr[j].document.location);
		} else {
			Cu.reportError('**checking frame win: ' + j + ' location = ' + winArr[j].document.location);
		}
		var doc = winArr[j].document;
		//START - edit below here
		removeDiv(doc);
		if (ignoreFrames) {
			break; //if want to ignore frames then break here
		}
		//END - edit above here
	}
}

function cDump(obj, title, deep, outputTarget) {
	//Services jsm must be imported
	//set deep to 1 to make it deep but initialize deeps div at none.
	//se deep to 2 to initialize at block
	//outputTarget == 0 then new tab, if set outputTarget to false then will do 0 but will load tab in background, if set to 0 or leave undefined it will load tab in foreground
	//outputTarget == 1 then reportError (cannot do deep in this outputTarget)
	//outputTarget == 2 then new window (not yet setup)
	//outputTarget == 3 then Services.console.logStringMessage
	//outputTarget == 'string', file at that path (not set up yet)
	var outputTargetsDisableDeep = [1,3];
    var tstr = '';
    var bstr = '';
    if (deep && outputTargetsDisableDeep.indexOf(outputTarget) == -1) {
        bstr = '<a href="javascript:void(0)" onclick="var subdivs = document.querySelectorAll(\'div > div\'); for(var i=0;i<subdivs.length;i++) { subdivs[i].style.display = subdivs[i].style.display==\'block\'?\'none\':\'block\'; }">Toggle All</a>\n\n';
    }
    var fstr = '';
    for (var b in obj) {
        try{
            bstr += b+'='+obj[b]+'\n';
            if (deep && outputTargetsDisableDeep.indexOf(outputTarget) == -1) {
                bstr += '<div style="margin-left:35px;color:gray;cursor:pointer;border:1px solid blue;" onclick="this.childNodes[1].style.display=this.childNodes[1].style.display==\'block\'?\'none\':\'block\';this.scrollIntoView(true);">click to toggle<div style="display:' + (deep==2 ? 'block' : 'none') + ';">';
                for (var c in obj[b]) {
                    try {
                        bstr += '\t\t\t' + c+'='+obj[b][c]+'\n';
                    } catch(e0) {
                        bstr += '\t\t\t' + c+'=e0=deep_fstr='+e0+'\n';
                    }	
                }
                bstr += '</div></div>'
            }
        } catch (e) {
                fstr = b+'='+e+'\n';
        }
    }
    if (deep && outputTargetsDisableDeep.indexOf(outputTarget) == -1) {
        bstr = bstr.replace(/<div[^>]*?>click to toggle<div[^>]*?><\/div><\/div>/g,'');
    }
    tstr += '<b>BSTR::</b>\n' + bstr;
    tstr += '\n<b>FSTR::</b>\n' + fstr;
    
	if (!outputTarget) {
		var cWin = Services.wm.getMostRecentWindow('navigator:browser');
		
		var onloadFunc = function() {
			//cWin.gBrowser.selectedTab = cWin.gBrowser.tabContainer.childNodes[cWin.gBrowser.tabContainer.childNodes.length-1];
			newTabBrowser.removeEventListener('load', onloadFunc, true);
			if (title) { newTabBrowser.contentDocument.title = title; }
			newTabBrowser.contentDocument.body.innerHTML = tstr.replace(/\n/g,'<br>')
		};
		
		var newTabBrowser = cWin.gBrowser.getBrowserForTab(cWin.gBrowser.loadOneTab('about:blank',{inBackground:outputTarget===false?true:false}));
		newTabBrowser.addEventListener('load', onloadFunc, true);
	} else if (outputTarget == 1) {
		tstr = 'CDUMP OF "' + title + '">>>\n\n' + tstr + ' "\n\nEND: CDUMP OF "' + title + '" ^^^';
		Cu.reportError(tstr);
	} else if (outputTarget == 2) {
		//to new window
	} else if (outputTarget == 3) {
		tstr = 'CDUMP OF "' + title + '">>>\n\n' + tstr + ' "\n\nEND: CDUMP OF "' + title + '" ^^^';
		Services.console.logStringMessage(tstr);
	}

}

function startup(aData, aReason) {
	let XULWindows = Services.wm.getXULWindowEnumerator(null);
	while (XULWindows.hasMoreElements()) {
		let aXULWindow = XULWindows.getNext();
		let aDOMWindow = aXULWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
		loadIntoWindow(aDOMWindow, aXULWindow);
	}
	
	for (var o in observer) {
		observer[o].register();
	}
}

function shutdown(aData, aReason) {
	if (aReason == APP_SHUTDOWN) return;
	for (var o in observer) {
		observer[o].unregister();
	}
	
	let XULWindows = Services.wm.getXULWindowEnumerator(null);
	while (XULWindows.hasMoreElements()) {
		let aXULWindow = XULWindows.getNext();
		let aDOMWindow = aXULWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
		unloadFromWindow(aDOMWindow, aXULWindow);
	}
}

function install() {}

function uninstall() {}