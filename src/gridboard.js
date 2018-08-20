
import GridEngine from './gridengine';
import GridBoardJQueryUI from './gridboard.jQueryUI';
import Utils from './utils';

import $ from 'jquery';

class GridBoard {

	constructor(el, opts = {}) {

		let self = this;

		this.container = $(el);

		this.baseClass = 'gridboard-';
		this.containerClass = this.baseClass + 'instance-' + (Math.random() * 10000).toFixed();
		this.itemClass = this.baseClass + 'item';
		this.placeholderClass = this.baseClass + 'item-placeholder';
		this.dataPrefix = 'data-gb-';

		this.opts = Object.assign({
			// default options
			staticGrid: false,
			animate: true,
			minWidth: 768, // when to turn on one column mode
			maxMoveIterations: 4, // how many blocks (including the given block) we may move on collision
			allowFallbackResize: false, // if after maxMoveIterations we dont find a move, do we allow to do one resize of the collision node
			resizable: Object.assign({
				handles: 'e, se, s, sw, w, nw, n, ne'
			}, opts.resizable),
			draggable: Object.assign({
				scroll: false,
				appendTo: 'body'
			}, opts.draggable),
		}, opts);

		this.container.addClass(this.containerClass);
		this.container.toggleClass(this.baseClass + 'static', !!this.opts.staticGrid);

		// setup drag'n'drop
		this.dd = new GridBoardJQueryUI(this);
		if (!this.opts.staticGrid && this.opts.acceptDraggables) {
			this._bindExternalDragNDropHandler();
		}

		// init gridengine
		this.grid = new GridEngine({
			width: this.opts.width,
			height: this.opts.height,
			maxMoveIterations: this.opts.maxMoveIterations,
			allowFallbackResize: this.opts.allowFallbackResize
		}, [], function(changedNodes) {
			changedNodes.forEach(function(n) {
				if (n.id === null) {
					if (n.el) {
						n.el.remove();
					}
				} else {
					self.setElAttributes(n.el, {
						x: n.x,
						y: n.y,
						width: n.width,
						height: n.height
					});
				}
			});
		});

		this._setCellSize();

		this.container.children('.' + this.itemClass + ':not(.' + this.placeholderClass + ')').each(function(i, item) {
			self._prepareElement(item);
		});

		this._setAnimation(this.opts.animate);

		this.placeholder = $("<div class=\"`${this.placeholderClass}` `${this.itemClass}`\"><div class=\"placeholder-content\"></div></div>").hide();

		// binding recalculate height on resize
		this._bindResizeHandler();

	}

	addElement(el, x, y, width, height, minWidth, maxWidth, minHeight, maxHeight, id) {

		el = $(el);

		this.setElAttributes(el, {x, y, width, height, minWidth, maxWidth, minHeight, maxHeight, id});

		this.container.append(el);

		this._prepareElement(el);

		this._triggerChangeEvent(true);

		return el;
	}

	removeElement(el, removeFromDOM) {

		el = $(el);
		let node = el.data(this.dataPrefix + 'node');

		this.grid.removeNode(node);
		el.removeData(this.dataPrefix + 'node');

		if (removeFromDOM) {
			el.remove();
		}

		this._triggerChangeEvent(true);
	}

	setElAttributes(el, attrs) {

		if (!el) {
			return;
		}

		let elAttrs = {};

		if (typeof attrs.x !== 'undefined') {
			elAttrs[this.dataPrefix + 'x'] = attrs.x;
		}
		if (typeof attrs.y !== 'undefined') {
			elAttrs[this.dataPrefix + 'y'] = attrs.y;
		}
		if (typeof attrs.width !== 'undefined') {
			elAttrs[this.dataPrefix + 'width'] = attrs.width;
		}
		if (typeof attrs.height !== 'undefined') {
			elAttrs[this.dataPrefix + 'height'] = attrs.height;
		}
		if (typeof attrs.minWidth !== 'undefined') {
			elAttrs[this.dataPrefix + 'min-width'] = attrs.minWidth;
		}
		if (typeof attrs.maxWidth !== 'undefined') {
			elAttrs[this.dataPrefix + 'max-width'] = attrs.maxWidth;
		}
		if (typeof attrs.minHeight !== 'undefined') {
			elAttrs[this.dataPrefix + 'min-height'] = attrs.minHeight;
		}
		if (typeof attrs.maxHeight !== 'undefined') {
			elAttrs[this.dataPrefix + 'max-height'] = attrs.maxHeight;
		}
		if (typeof attrs.id !== 'undefined') {
			elAttrs[this.dataPrefix + 'id'] = attrs.id;
		}

		el.attr(elAttrs);
	}

	destroy(detachContainer = false) {
		this.container.off('resize', this.onResize);
		this.container.off('dropover dropout drop');
		this.dd.destroy(this.container);

		this._setMoveEvents(false);
		this._setResizeEvents(false);

		if (detachContainer) {
			this.container.remove();
		} else {
			// remove all node info but don't destroy elements
			this.grid.nodes.forEach(node => this.removeElement(node.el));
			this.grid.nodes = [];
			this.container.removeData('gridboard');
		}

		Utils.Stylesheet.remove(this._stylesId);

		if (this.grid) {
			this.grid = null;
		}
	}

	getCellFromAbsolutePixel(nodeOffset) {
		let offset = this.container.offset(),
			position = this.container.position();

		// offset relative to container itself
		nodeOffset = {
			left: nodeOffset.left - offset.left + position.left,
			top: nodeOffset.top - offset.top + position.top
		};

		return this._getCellFromPixel(nodeOffset);
	}

	getAdjustedNodeProps(x, y, width, height) {
		// can be overwritten from outside
		// useful when need to change placeholder width and height depending on the current coordinates
		return {x, y, width, height};
	}

	_getCellFromPixel(position, useOffset) {
		let containerPos = useOffset ? this.container.offset() : this.container.position();
		let relativeLeft = position.left - containerPos.left;
		let relativeTop = position.top - containerPos.top;

		let columnWidth = Math.floor(this.container.width() / this.opts.width);
		let rowHeight = Math.floor(this.container.height() / this.opts.height);

		return {
			x: Math.floor(relativeLeft / columnWidth),
			y: Math.floor(relativeTop / rowHeight)
		};
	}

	_setCellSize() {

		let cellWidth = Math.round(this.container.width() / this.opts.width);
		if (cellWidth) {
			this.cellWidth = cellWidth;
		}

		let cellHeight = Math.round(this.container.height() / this.opts.height);
		if (cellHeight) {
			this.cellHeight = cellHeight;
			this._updateStyles();
		}
	}

	_updateStyles() {

		// always recreate styles since the grid cell count is static
		if (this._stylesId) {
			Utils.Stylesheet.remove(this._stylesId);
		}
		this._stylesId = 'gridboard-style-' + (Math.random() * 100000).toFixed();

		let self = this,
			prefix = '.' + this.containerClass + ' .' + this.itemClass,
			stylesheet = Utils.Stylesheet.create(this._stylesId),
			getHeight;

		getHeight = function(row) {
			return (self.cellHeight * row) + 'px';
		};

		Utils.Stylesheet.insertCSSRule(stylesheet, prefix, 'min-height: ' + getHeight(1, 0) + ';', 0);

		for (let i = 0; i < this.opts.height; i++) {
			Utils.Stylesheet.insertCSSRule(stylesheet,
				prefix + '[' + this.dataPrefix + 'height="' + (i + 1) + '"]',
				'height: ' + getHeight(i + 1, i) + ';',
				i
			);
			Utils.Stylesheet.insertCSSRule(stylesheet,
				prefix + '[' + this.dataPrefix + 'min-height="' + (i + 1) + '"]',
				'min-height: ' + getHeight(i + 1, i) + ';',
				i
			);
			Utils.Stylesheet.insertCSSRule(stylesheet,
				prefix + '[' + this.dataPrefix + 'max-height="' + (i + 1) + '"]',
				'max-height: ' + getHeight(i + 1, i) + ';',
				i
			);
			Utils.Stylesheet.insertCSSRule(stylesheet,
				prefix + '[' + this.dataPrefix + 'y="' + i + '"]',
				'top: ' + getHeight(i, i) + ';',
				i
			);
		}
	}

	_bindNodeDragNDropNResizeHandler(el, node) {

		let self = this,
			dragOrResize,
			onStartMoving,
			onEndMoving;

		dragOrResize = function(event, ui) {

			let width,
				height,
				x = Math.round(ui.position.left / self.cellWidth),
				y = Math.floor((ui.position.top + self.cellHeight / 2) / self.cellHeight);

			if (event.type === 'resize') {
				width = Math.round(ui.size.width / self.cellWidth);
				height = Math.round(ui.size.height / self.cellHeight);
			} else {
				width = node.width;
				height = node.height;
			}

			if (event.type === 'drag' && !self.grid.isPositionValid(x, y, width, height)) {
				return;
			}

			if (event.type === 'resize' && (x < 0 || y < 0)) {
				return;
			}

			self.grid.moveNode(node, x, y, width, height);

		};

		onStartMoving = function(event, ui) {

			self.container.append(self.placeholder);
			self.container.addClass('drag-or-drop-hover');

			let o = $(this);

			self.grid.cleanNodes();
			self.grid.saveUpdate();

			self.setElAttributes(self.placeholder, {
				x: o.attr(self.dataPrefix + 'x'),
				y: o.attr(self.dataPrefix + 'y'),
				width: o.attr(self.dataPrefix + 'width'),
				height: o.attr(self.dataPrefix + 'height')
			});

			self.placeholder.show();

			node.el = self.placeholder;

			self.dd.resizable(el, 'option', 'minWidth', self.cellWidth * (node.minWidth || 1));
			self.dd.resizable(el, 'option', 'minHeight', self.cellHeight * (node.minHeight || 1));

			if (typeof self.opts.draggable.start === 'function') {
				self.opts.draggable.start(event, ui);
			}
		};

		onEndMoving = function() {

			self.container.removeClass('drag-or-drop-hover');

			let o = $(this);

			if (!o.data(self.dataPrefix + 'node')) {
				return;
			}

			self.placeholder.detach();
			self.placeholder.hide();

			node.el = o;

			Utils.removePositioningStyles(o);

			self.setElAttributes(o, {
				x: node.x,
				y: node.y,
				width: node.width,
				height: node.height
			});

			self._triggerChangeEvent();

			self.grid.saveUpdate();
		};

		this.dd
			.draggable(el, {
				start: onStartMoving,
				stop: onEndMoving,
				drag: dragOrResize
			})
			.resizable(el, {
				start: onStartMoving,
				stop: onEndMoving,
				resize: dragOrResize
			});

		if (this.opts.staticGrid || this._isOneColumnMode()) {
			this.dd.draggable(el, 'disable');
			this.dd.resizable(el, 'disable');
		}

	}

	_triggerChangeEvent(forceTrigger) {
		let elements = this.grid.getDirtyNodes(),
			eventParams = [],
			hasChanges = false;

		if (elements && elements.length) {
			eventParams.push(elements);
			hasChanges = true;
		}

		if (hasChanges || forceTrigger) {
			this.container.trigger('change', eventParams);
		}
	}

	_isOneColumnMode() {
		return this.opts.minWidth
			&& $(window).width() <= this.opts.minWidth;
	}

	_setAnimation(enable) {
		let className = this.baseClass + 'animate';
		this.container.toggleClass(className, enable);
	}

	_prepareElement(el) {

		let self = this;

		el = $(el);
		el.addClass(this.itemClass);

		let getAttr = function(el, name) {
			return el.attr(self.dataPrefix + name);
		};
		let getNumericAttr = function(el, name) {
			return parseInt(getAttr(el, name), 10);
		};

		let props = {
			x: getNumericAttr(el, 'x'),
			y: getNumericAttr(el, 'y'),
			width: getNumericAttr(el, 'width') || 1,
			height: getNumericAttr(el, 'height') || 1,
			maxWidth: getNumericAttr(el, 'max-width') || this.opts.width,
			minWidth: getNumericAttr(el, 'min-width') || 1,
			maxHeight: getNumericAttr(el, 'max-height') || this.opts.height,
			minHeight: getNumericAttr(el, 'min-height') || 1,
			resizeHandles: getAttr(el, 'resize-handles'),
			el: el,
			id: getAttr(el, 'id'),
			_grid: this
		};

		if (!this.grid.isAreaEmpty(props.x, props.y, props.width, props.height)) {
			let freeSpace = this.grid.findFreeSpace(props.width, props.height);
			if (!freeSpace) {
				freeSpace = this.grid.findFreeSpace(1, 1);
			}
			if (freeSpace) {
				props.x = freeSpace.x;
				props.y = freeSpace.y;
				props.width = freeSpace.w;
				props.height = freeSpace.h;
			}
		}

		let node = this.grid.addNode(props);
		el.data(this.dataPrefix + 'node', node);

		this._bindNodeDragNDropNResizeHandler(el, node);
	}

	_setMoveEvents(enabled) {

		let self = this,
			isDisable = !enabled || self._isOneColumnMode();

		$(this.container.children('.' + this.itemClass)).each(function(i, el) {

			el = $(el);

			let node = el.data(self.dataPrefix + 'node');

			if (!node) {
				return;
			}

			self.dd.draggable(el, isDisable ? 'disable' : 'enable');
			el.toggleClass('ui-draggable-handle', !isDisable);

		});

		return this;
	}

	_setResizeEvents(enable) {

		let self = this,
			isDisable = !enable || self._isOneColumnMode();

		$(this.container.children('.' + this.itemClass)).each(function(i, el) {

			el = $(el);

			let node = el.data(self.dataPrefix + 'node');

			if (!node) {
				return;
			}

			self.dd.resizable(el, isDisable ? 'disable' : 'enable');

		});

		return this;
	}

	_bindResizeHandler() {
		let self = this,
			oneColumnMode = self._isOneColumnMode();

		this.onResize = Utils.throttle(function(){
			self._setCellSize();

			let isOneColumnAfterResize = self._isOneColumnMode();

			if (oneColumnMode !== isOneColumnAfterResize) {

				oneColumnMode = isOneColumnAfterResize;
				self.container.toggleClass('gridboard-one-column-mode', oneColumnMode);

				if (self.opts.staticGrid) {
					return;
				}

				if (oneColumnMode) {
					this._setMoveEvents(false);
					this._setResizeEvents(false);
				} else {
					this._setMoveEvents(true);
					this._setResizeEvents(true);
				}
			}

		}, 200);

		this.container.on('resize', this.onResize);
	}

	_bindExternalDragNDropHandler() {

		let self = this,
			draggingElement = null,
			onDrag;

		onDrag = function(event) {

			let el = draggingElement;
			let node = el.data(self.dataPrefix + 'node');
			let cell = self._getCellFromPixel({
				left: event.pageX,
				top: event.pageY
			}, true);

			let originalWidth = parseInt(el.attr('data-width'), 10) || 1;
			let originalHeight = parseInt(el.attr('data-height'), 10) || 1;

			let pos = self.getAdjustedNodeProps(cell.x, cell.y, originalWidth, originalHeight);

			let x = Math.max(0, pos.x);
			let y = Math.max(0, pos.y);
			let width = pos.width;
			let height = pos.height;

			// not added
			if (!node._added) {

				node.el = el;
				node.x = x;
				node.y = y;

				node.width = width;
				node.height = height;

				if (!self.grid.canAddNode(node)) {
					return;
				}

				node._added = true;

				self.grid.cleanNodes();
				self.grid.saveUpdate();
				self.grid.addNode(node);

				self.container.append(self.placeholder);

				self.setElAttributes(self.placeholder, {
					x: node.x,
					y: node.y,
					width: node.width,
					height: node.height
				});
				self.placeholder.show();

				node.el = self.placeholder;
			}

			self.grid.moveNode(node, x, y, width, height);

		};

		this.dd
			.droppable(self.container, {
				tolerance: 'touch',
				accept: function(el) {
					return $(el).is(self.opts.acceptDraggables);
				}
			})
			.on(self.container, 'dropover', function(event, ui) {

				self.grid.saveUpdate();

				let el = $(ui.draggable);

				let width = parseInt(el.attr('data-width'), 10) || 1;
				let height = parseInt(el.attr('data-height'), 10) || 1;

				draggingElement = el;

				let node = self.grid._prepareNode({
					width: width,
					height: height,
					_added: false
				});

				el.data(self.dataPrefix + 'node', node);

				el.on('drag', onDrag);
			})
			.on(self.container, 'dropout', function(event, ui) {

				self.grid.revertUpdate();

				let el = $(ui.draggable),
					node = el.data(self.dataPrefix + 'node');

				if (node) {
					node.el = null;
					self.grid.removeNode(node);
				}

				el.unbind('drag', onDrag);

				self.placeholder.detach();

			})
			.on(self.container, 'drop', function(event, ui) {

				let node = $(ui.draggable).data(self.dataPrefix + 'node');
				self.placeholder.detach();

				if (node) {
					node.el = null;
					self.grid.removeNode(node);
				}

				self._triggerChangeEvent();

				self.grid.saveUpdate();
				$(ui.draggable).unbind('drag', onDrag);
				$(ui.draggable).removeData(self.dataPrefix + 'node');

				self.container.trigger('dropped', [null, node, ui]);
			});
	}
}

GridBoard.Engine = GridEngine;

export default GridBoard;
