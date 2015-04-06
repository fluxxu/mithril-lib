var applyFilter = function(value, filterName) {
	if (value) {
		var param = '';
		if (filterName.indexOf(':') !== -1) {
			var split = filterName.split(':');
			filterName = split[0];
			param = split[1];
		}
		if (filterName in core.filter) {
			value = filter[filterName].apply(null, [value, param]);
		}
	}
	return value;
};

/**
Config
- columns: [
	{ label: 'ID', key: 'id' }
  ]
**/
function Provider(options) {
	options = options || {};

	var that = this;

	var url_ = options.url;
	var columns_ = options.columns || [{ label: '#', key: 'id' }];
	var stat_ = m.prop({});
	var data_ = m.prop([]);
	var filters_ = {};
	var config_ = m.prop({
		query: {}
	});

	//add column filters
	columns_.forEach(function(col) {
		if (col.key) {
			filters_[col.key] = m.prop('');
		}
	});

	if (options.filters) {
		_.each(options.filters, function(v, k) {
			if (filters_[k]) {
				filters_[k] = v;
			} else {
				filters_[k] = m.prop(v);
			}
		});
	}

	var buildQueryParam = function(query) {
		if (!query) {
			return;
		}

		var params = {};
		['take', 'skip', 'stat'].forEach(function(key) {
			if (key in query) {
				params[key] = query[key];
			}
		});

		_.each(filters_, function(prop, k) {
			var v = prop();
			if (v) {
				params['filter_' + k] = prop();
			}
		});

		if (query.filter) {
			_.each(query.filter, function(v, k) {
				params['filter_' + k] = v;
			});
		}

		if (query.sort) {
			params.sort = query.sort;
		}
		return params;
	};

	this.getStat = function() {
		return stat_();
	};

	this.getData = function() {
		return data_();
	};

	this.getConfig = function() {
		return config_();	
	};

	this.getColumns = function() {
		return columns_;
	};

	this.getPageSize = function() {
		return stat_().take || 20;	
	};

	this.getValue = function(item, key) {
		if (typeof item !== 'object') {
			return;
		}
		
		var value;
		if (key.indexOf('.') !== -1) {
			var keys = key.split('.');
			for (var i = 0; i < keys.length; ++i) {
				key = keys[i];
				if (typeof item === 'object' && item[key]) {
					item = item[key];
				} else {
					item = undefined;
					break;
				}
			}
			value = item;
		} else {
			value = item[key];
		}
		return value;
	};

	this.renderModelColumn = function(item, col) {
		if (col.key) {
			var value = this.getValue(item, col.key);
			if (col.filter) {
				value = applyFilter(value, col.filter);
			}

			if (col.link) {
				var url;
				if (_.isString(col.link)) {
					url = col.link;
				} else if (_.isFunction(col.link)) {
					url = col.link(item);
				}
				var isLocal = url.charAt(0) === '/' && (url.length == 1 || url.charAt(1) !== '/');
				return m('a', { href: url, config: isLocal ? m.route : null, target: isLocal ? '' : '__blank' }, value);
			}

			return value;
		}

		if (col.view) {
			return col.view(item);
		}
	};

	this.renderFilter = function(col) {
		var key = col.key;
		if (!key) { return; }
		if (col.filterView !== undefined && !col.filterView) { return; }
		var filterProp = filters_[key];
		if (col.filterView) {
			return col.filter({
				prop: function(value) {
					
				}
			});
		} else {
			return m('input[type=text].form-control.input-sm', {
				value: filterProp(),
				onkeyup: function(evt) {
					if (evt.keyCode == 13) {
						that.provide();
					} else {
						filterProp(evt.target.value);
					}
				}
			});
		}
	};

	this.prevPage = function() {
		var stat = stat_();
		var config = config_();
		if (!stat.skip) { return; }
		stat.skip = Math.max(0, stat.skip - stat.take);
		config.query.skip = stat.skip;
		return this.provide();
	};

	this.nextPage = function() {
		var stat = stat_();
		var config = config_();
		if (stat.skip + stat.take >= stat.count) { return; }
		stat.skip += stat.take;
		config.query.skip = stat.skip;
		return this.provide();
	};

	this.getFilters = function() {
		return filters_;
	};

	this.setFilter = function(key, value) {
		var prop = filters_[key];
		if (prop) {
			prop(value);
		} else {
			filters_[key] = m.prop(value);
		}
		return this;
	};

	this.provide = function() {
		config = config_();
		config.query.stat = true;
		return core.request({
			method: 'GET',
			url: url_,
			params: buildQueryParam(config.query)
		}).then(function(res) {
			if (res.stat) {
				stat_(res.stat);
			}
			data_(res.data);
		});
	};
};

Provider.cast = function(value) {
	if (value instanceof Provider) {
		return value;
	}
	return new Provider(value);
};

core.provider = Provider;