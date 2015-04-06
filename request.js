var opts = {
	baseUrl: '/',
	spinnerComponent: null
};

var animate = Velocity;
var spinner = null;
var spinnerActive = 0;

var showSpinner = function(flag) {
	if (!spinner) {
		spinner = document.createElement('div');
		if (opts.spinnerComponent) {
			m.mount(spinner, opts.spinnerComponent());
		}
	}

	if (flag) {
		if (spinnerActive === 0) {
			spinner.style.opacity = 1;
			document.body.appendChild(spinner);
		}
		animate(spinner, 'stop');
		++ spinnerActive;
	} else {
		-- spinnerActive;

		if (spinnerActive == 0) {
			alert('2');
			animate(spinner, 'stop');
			animate(spinner, { opacity: 0 }, { 
				complete: function() {
					document.body.removeChild(spinner);
				}	
			});
			//spinnerActive = 0;
		}
	}
};

var config = function(xhr, xhrOptions) {
	var user = core.auth.user();
	if (user) {
		xhr.setRequestHeader('Authorization', 'Session ' + user.token);
	}

	if (xhrOptions.headers) {
		_.each(xhrOptions.headers, function(v, k) {
			xhr.setRequestHeader(k, v);
		});
	}
};

var extract = function(xhr, xhrOptions) {
	if (!xhr.status) {
		throw new Error('Service offline');
	}

	// handle 401
	if (xhr.status === 401 && xhrOptions.url.indexOf(opts.baseUrl) === 0) {
		var error = new Error("Unauthorized");
		error.recoverable = true;
		error.status = xhr.status;
        error.xhr = xhr;
        error.xhrOptions = xhrOptions;
        throw error;
	}

	var responseText = xhr.responseText || 'null';
	var data;
    try {
        data = JSON.parse(responseText)
    }
    catch (e) {
        //e instanceof SyntaxError == true
        //by default `e` would be caught by Mithril's promise exception monitor and rethrown to the console
        //this new error follows Promises/A+ specifications and triggers a rejection in the downstream promises without hitting the console.
        throw new Error("Invalid server response");
    }

    var resposneError = data.error;
    // handle validation error
	if (xhr.status === 400 && resposneError && resposneError.errors) {
		var error = new Error("Validation Error");
		error.recoverable = true;
		error.status = xhr.status;
		error.errors = resposneError.errors;
        throw error;
	}

	if (xhr.status < 200 || xhr.status > 299) {
		var message;
		if (resposneError && resposneError.message) {
			message = resposneError.message;
		}
		throw new Error(message || 'Internal error');
	}
    return responseText;
};

var buildQueryString = function(params) {
	return _.map(params, function(v, k) {
		return k + '=' + encodeURIComponent(v);
	}).join('&');
};

var request = function(params, raw) {
	if (params.background) {
		showSpinner = function() {}
	} else {
		showSpinner(true);
	}
	
	if (!raw) {
		params.extract = extract;
		if (params.url && params.url.charAt(0) === '/') {
			params.url = opts.baseUrl + params.url;
		}
		if (!_.isEmpty(params.params)) {
			params.url += ('?' + buildQueryString(params.params));
		}
		if (params.config) {
			var userConfig = params.config;
			params.config = function() {
				config.apply(null, arguments);
				userConfig.apply(null, arguments);
			}
		} else {
			params.config = config;
		}
	}

	return m.request(params).then(function(value) {
		showSpinner(false);
		return value;
	}, function(e) {
		showSpinner(false);
		if (e.status === 401 && params.url.indexOf(opts.baseUrl) === 0) {
			return core.auth.resolve().then(function() {
				return request(params, true);
			}, function(e) {
				throw e;
			});
		}
		throw e;
	});
};

request.config = function(options) {
	_.assign(opts, options);
};
request.showSpinner = showSpinner;

core.request = request;