
import $ from 'jquery';

class GridBoardJQueryUI {

	constructor(grid) {
		this.grid = grid;
	}

	resizable(el, opts, key = null, value = null) {
		el = $(el);
		if (opts === 'disable' || opts === 'enable') {
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
		if (opts === 'disable' || opts === 'enable') {
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
		if (opts === 'disable' || opts === 'enable') {
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
}

export default GridBoardJQueryUI;
