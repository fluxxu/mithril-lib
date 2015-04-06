var opts = {
	authUrl: '/token',
	modalComponent: null
};

var modalContainer = null;
var modalProps = {
	visible: m.prop(false),
	error: m.prop(null),
	message: m.prop(null)
};
var localUser = m.prop(null);
var loginDeferred = null;

var getSavedToken = function() {
	return core.cookie.getItem('session') || localStorage.getItem('token');
};

var saveToken = function(token) {
	core.cookie.setItem('session', token, 0, '/');
	localStorage.setItem('session', token);
};

var unsetToken = function() {
	core.cookie.removeItem('session', '/');
	localStorage.removeItem('session');
};

var requestToken = function(email, password) {
	modalProps.error(null);
	return m.request({
		method: 'POST',
		url: opts.authUrl,
		data: {
			email: email,
			password: password
		}
	}).then(function(data) {
		if (data.id && data.user) {
			saveToken(data.id);
			data.user.token = data.id;
			localUser(data.user);
			loginDeferred.resolve();
			loginDeferred = null;
			modalProps.visible(false);
		} else {
			modalProps.error('Login failed.');
		}
	}, function() {
		modalProps.error('Login failed.');
	});
};

core.auth = {
	config: function(options) {
		_.assign(opts, options);		
	},
	user: function() {
		return localUser();
	},
	login: function() {
		var headers = {};
		var localToken = getSavedToken();
		if (localToken) {
			localUser({
				token: localToken
			});
		}

		return core.request({
			method: 'GET',
			url: opts.authUrl,
			headers: headers
		}).then(function (data) {
			saveToken(data.id);
			data.user.token = data.id;
			localUser(data.user);
		});
	},
	logout: function() {
		unsetToken();
		return core.Promise.resolve();
	},
	resolve: function() {
		if (!modalContainer) {
			modalContainer = document.createElement('div');
			document.body.appendChild(modalContainer);
			m.mount(modalContainer, opts.modalComponent(modalProps, requestToken));
		}
		if (!loginDeferred) {
			loginDeferred = m.deferred();
			modalProps.visible(true);
		}
		return loginDeferred.promise;
	},
	checkAccess: function(op) {
		if (Auth.checkRole('admin')) {
			return true;
		}

		var user = localUser();
		if (user && _.isArray(user.operations)) {
			return user.operations.indexOf(op) !== -1;
		}
		return false;
	},
	checkRole: function(role) {
		var user = localUser();
		if (user && _.isArray(user.roles)) {
			return user.roles.indexOf(role) !== -1;
		}
		return false;
	}
};