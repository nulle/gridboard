
import $ from 'jquery';

class GridBoardJQueryUI {

	constructor(grid) {
		this.grid = grid;
	}

	resizable(el, opts, key = null, value = null) {
		el = $(el);
		if (['disable', 'enable', 'destroy'].includes(opts)) {
			el.resizable(opts);
		} else if (opts === 'option') {
			el.resizable(opts, key, value);
		} else {
			el.resizable(Object.assign({}, this.grid.opts.resizable, {
				handles: el.data('gb-resize-handles') || this.grid.opts.resizable.handles,
				start: opts.start || function() {},
				stop: opts.stop || function() {},
				resize: opts.resize || function() {}
			}));
		}
		return this;
	}

	draggable(el, opts) {
		el = $(el);
		if (['disable', 'enable', 'destroy'].includes(opts)) {
			el.draggable(opts);
		} else {
			el.draggable(Object.assign({}, this.grid.opts.draggable, {
				containment: null,
				start: opts.start || function() {},
				stop: opts.stop || function() {},
				drag: opts.drag || function() {}
			}));
		}
		return this;
	}

	droppable(el, opts) {
		el = $(el);
		if (['disable', 'enable', 'destroy'].includes(opts)) {
			el.droppable(opts);
		} else {
			el.droppable({
				accept: opts.accept
			});
		}
		return this;
	}

	isDroppable(el) {
		el = $(el);
		return !!el.data('droppable');
	}

	on(el, eventName, callback) {
		$(el).on(eventName, callback);
		return this;
	}

	destroy(el) {
		try {
			this.resizable(el, 'destroy');
		} catch (e) {
			//skip
		}
		try {
			this.draggable(el, 'destroy');
		} catch (e) {
			//skip
		}
		try {
			this.droppable(el, 'destroy');
		} catch (e) {
			//skip
		}
	}
}

export default GridBoardJQueryUI;
