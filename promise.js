// polyfill using m.deferred

var Promise = function (exec) {
	var deferred = m.deferred();
	var resolve = deferred.resolve.bind(deferred);
	var reject = deferred.reject.bind(deferred);
	core.nextTick(exec.bind(null, resolve, reject));
	return deferred.promise;
};

Promise.resolve = function(value) {
	return new Promise(function(resolve) {
		resolve(value);
	});
};

Promise.reject = function(value) {
	return new Promise(function(resolve, reject) {
		reject(value);
	});
};

Promise.all = function(items) {
	if (!items.length) {
		return Promise.resolve([]);
	}
	var results = new Array(items.length);
	var resolved = 0;
	var done = false;

	items.forEach(function(p, index) {
		p.then(function(value) {
			if (done) return;
			results[index] = value;
			++ resolved;
			if (resolved === items.length) {
				done = true;
				return Promise.resolve(results);
			}
		}, function(value) {
			if (done) return;
			done = true;
			return Promise.reject(value);
		});
	});
};

core.Promise = Promise;

