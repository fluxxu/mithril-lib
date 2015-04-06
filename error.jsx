var opts = {
	appBaseUrl: '/',
	modalComponent: null
};

var err = m.prop(null);
core.error = {
	config: function(o) {
		_.assign(opts, o);
	},
	init: function() {
		var element = document.createElement('div');
		document.body.appendChild(element);

		if (!opts.modalComponent) {
			opts.modalComponent = m.component({
				controller: function() {},
				view: function() {
					var error = err();
					if (error) {
						var message = error.message ? error.message : 'Internal Error';
						return (
							<div style="position:fixed;z-index:100;width:100%;height:100%;top:0;left:0;background:#fff;padding:15px">
								<h1>Error</h1>
								<p>
									{message}
								</p>
							</div>
						);
					}
				}
			});
		}

		m.mount(element, opts.modalComponent(err));

		var onerror = m.deferred.onerror;
		m.deferred.onerror = function(e) {
			if (!e.recoverable) {
				err(e);
				m.redraw();
				throw e;
			}
		};
	},
	show: function(e) {
		err(e);
		m.redraw();
	}
};