core.init = function() {
	core.error.init();
	return core.auth.login();
}