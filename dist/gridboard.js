(function ($) {
  'use strict';

  $ = $ && $.hasOwnProperty('default') ? $['default'] : $;

  var classCallCheck = function (instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  };

  var createClass = function () {
    function defineProperties(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
      }
    }

    return function (Constructor, protoProps, staticProps) {
      if (protoProps) defineProperties(Constructor.prototype, protoProps);
      if (staticProps) defineProperties(Constructor, staticProps);
      return Constructor;
    };
  }();

  var GridEngine = function () {
  	function GridEngine() {
  		var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  		var nodes = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
  		var onchange = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : function () {};
  		classCallCheck(this, GridEngine);


  		this.width = opts.width;
  		this.height = opts.height;
  		this.maxMoveIterations = opts.maxMoveIterations || 1;
  		this.allowFallbackResize = !!opts.allowFallbackResize;

  		this.nodes = nodes;
  		this.onchange = onchange;

  		// to populate origX etc fields so the revert does not set all to undefined
  		this.saveUpdate();
  	}

  	createClass(GridEngine, [{
  		key: "canAddNode",
  		value: function canAddNode(node) {

  			if (!this.isPositionValid(node.x, node.y, node.width, node.height)) {
  				return false;
  			}

  			var clonedNode = void 0,
  			    clonedGrid = this.cloneGrid();

  			clonedNode = clonedGrid.addNode(Object.assign({}, node));

  			var changesForMove = clonedGrid.getChangesForMove(clonedNode, clonedNode.x, clonedNode.y, clonedNode.width, clonedNode.height);

  			return !!changesForMove;
  		}
  	}, {
  		key: "addNode",
  		value: function addNode(node) {

  			// note: adds even if position is invalid or overlapping
  			// does not trigger collision fixing
  			// if that's not what you want, check with canAddNode before calling

  			node = this._prepareNode(node);

  			if (node.maxWidth) {
  				node.width = Math.min(node.width, node.maxWidth);
  			}

  			if (node.maxHeight) {
  				node.height = Math.min(node.height, node.maxHeight);
  			}

  			if (node.minWidth) {
  				node.width = Math.max(node.width, node.minWidth);
  			}

  			if (node.minHeight) {
  				node.height = Math.max(node.height, node.minHeight);
  			}

  			node._dirty = true;

  			this.nodes.push(node);

  			this.triggerChangeEvent();
  			this.onNodePositionChange();

  			return node;
  		}
  	}, {
  		key: "moveNode",
  		value: function moveNode(node, x, y, width, height) {

  			var self = this,
  			    changesForMove = void 0;

  			changesForMove = this.getChangesForMove(node, x, y, width, height);

  			if (!changesForMove) {
  				return;
  			}

  			changesForMove.forEach(function (change) {
  				var n = self.nodes.find(function (nn) {
  					return nn.id === change.id;
  				});
  				if (n) {
  					self.setNewPosition(n, change.x, change.y, change.width, change.height);
  				}
  			});

  			this.triggerChangeEvent();

  			return true;
  		}
  	}, {
  		key: "removeNode",
  		value: function removeNode(node) {

  			if (!node) {
  				return;
  			}

  			node.id = null; // mark it for deletion
  			this.nodes = this.nodes.filter(function (n) {
  				return n !== node;
  			});
  			this.triggerChangeEvent(node);
  			this.onNodePositionChange();
  		}
  	}, {
  		key: "getNodeById",
  		value: function getNodeById(nodeId) {
  			return this.nodes.find(function (n) {
  				return nodeId === n.id;
  			});
  		}
  	}, {
  		key: "cleanNodes",
  		value: function cleanNodes() {
  			this.nodes.forEach(function (n) {
  				n._dirty = false;
  			});
  		}
  	}, {
  		key: "getDirtyNodes",
  		value: function getDirtyNodes() {
  			return this.nodes.filter(function (n) {
  				return n._dirty;
  			});
  		}
  	}, {
  		key: "isPositionValid",
  		value: function isPositionValid(x, y, width, height) {
  			var isValid = true;

  			if (y < 0 || x < 0 || y + height > this.height || x + width > this.width) {
  				isValid = false;
  			}

  			return isValid;
  		}
  	}, {
  		key: "whatIsHere",
  		value: function whatIsHere() {
  			var x = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
  			var y = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
  			var width = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 1;
  			var height = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 1;

  			return this.nodes.filter(function (n) {
  				return !(n.x + n.width <= x || x + width <= n.x || n.y + n.height <= y || y + height <= n.y);
  			});
  		}
  	}, {
  		key: "isAreaEmpty",
  		value: function isAreaEmpty(x, y, width, height, exceptNode) {

  			// first check if is not out of bounds
  			if (!this.isPositionValid(x, y, width, height)) {
  				return false;
  			}
  			var collisionNodes = this.whatIsHere(x, y, width, height);

  			if (exceptNode) {
  				collisionNodes = collisionNodes.filter(function (n) {
  					return n !== exceptNode;
  				});
  			}

  			return !collisionNodes.length;
  		}
  	}, {
  		key: "findFreeSpace",
  		value: function findFreeSpace() {
  			var w = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;
  			var h = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
  			var forNode = arguments[2];


  			var freeSpace = null,
  			    i = void 0,
  			    j = void 0;

  			for (i = 0; i <= this.width - w; i++) {
  				if (freeSpace) {
  					break;
  				}
  				for (j = 0; j <= this.height - h; j++) {
  					if (freeSpace) {
  						break;
  					}
  					if (this.isAreaEmpty(i, j, w, h, forNode)) {
  						freeSpace = { x: i, y: j, w: w, h: h };
  					}
  				}
  			}

  			return freeSpace;
  		}
  	}, {
  		key: "isNodeChangedPosition",
  		value: function isNodeChangedPosition(node, x, y, width, height) {
  			return !(node.x === x && node.y === y && node.width === width && node.height === height);
  		}
  	}, {
  		key: "fixOverlappingPositions",
  		value: function fixOverlappingPositions(maxMoves, allowResize) {
  			var self = this,

  			// save to set back after
  			origMaxMoves = this.maxMoveIterations,
  			    origAllowResize = this.allowFallbackResize;

  			this.maxMoveIterations = maxMoves;
  			this.allowFallbackResize = allowResize;

  			// in theory, we only need to fix one
  			this.nodes.some(function (node) {
  				if (!self.isAreaEmpty(node.x, node.y, node.width, node.height, node)) {
  					return self.moveNode(node, node.x, node.y, node.width, node.height);
  				}
  			});

  			this.maxMoveIterations = origMaxMoves;
  			this.allowFallbackResize = origAllowResize;
  		}
  	}, {
  		key: "cloneGrid",
  		value: function cloneGrid(nodeMapperFn) {

  			if (!nodeMapperFn) {
  				nodeMapperFn = function nodeMapperFn(n) {
  					return Object.assign({}, n);
  				};
  			}

  			var clonedGrid = new GridEngine({
  				width: this.width,
  				height: this.height,
  				maxMoveIterations: this.maxMoveIterations,
  				allowFallbackResize: this.allowFallbackResize
  			}, this.nodes.map(nodeMapperFn));

  			return clonedGrid;
  		}
  	}, {
  		key: "saveUpdate",
  		value: function saveUpdate() {

  			this.nodes.forEach(function (n) {
  				n._origX = n.x;
  				n._origY = n.y;
  				n._origWidth = n.width;
  				n._origHeight = n.height;
  			});
  		}
  	}, {
  		key: "revertUpdate",
  		value: function revertUpdate() {

  			this.nodes.forEach(function (n) {
  				n.x = n._origX;
  				n.y = n._origY;
  				n.width = n._origWidth;
  				n.height = n._origHeight;
  			});

  			this.onNodePositionChange();
  		}
  	}, {
  		key: "onNodePositionChange",
  		value: function onNodePositionChange() {
  			// can be overwritten from outside -> called when nodes change positions
  			// even temporary, while dragging / resizing
  		}
  	}, {
  		key: "triggerChangeEvent",
  		value: function triggerChangeEvent(node) {

  			var nodes = [];

  			if (node) {
  				nodes.push(node);
  			}

  			var changedNodes = nodes.concat(this.getDirtyNodes());

  			this.onchange(changedNodes);
  		}
  	}, {
  		key: "setNewPosition",
  		value: function setNewPosition(node, x, y, width, height) {

  			if (!node) {
  				return;
  			}

  			if (!this.isNodeChangedPosition(node, x, y, width, height)) {
  				return true;
  			}

  			if (!this.isPositionValid(x, y, width, height)) {
  				return false;
  			}

  			var resizing = node.width != width || node.height != height;
  			node._dirty = true;

  			node.x = x;
  			node.y = y;
  			node.width = width;
  			node.height = height;

  			node = this._prepareNode(node, resizing);

  			this.onNodePositionChange();

  			return true;
  		}
  	}, {
  		key: "getChangesForMove",
  		value: function getChangesForMove(node, x, y, width, height) {

  			// returns changes on all nodes on this grid
  			// required to move the given node to the given position
  			// limited to certain move count

  			var clonedNode = void 0,
  			    clonedGrid = void 0;

  			clonedGrid = this.cloneGrid(function (n) {
  				var nn = Object.assign({}, n);
  				nn.x = n._origX;
  				nn.y = n._origY;
  				nn.width = n._origWidth;
  				nn.height = n._origHeight;
  				return nn;
  			});

  			clonedNode = clonedGrid.nodes.find(function (n) {
  				return n.id === node.id;
  			});

  			var changes = null,
  			    results = clonedGrid._findPos(node, x, y, width, height);

  			if (results === null && clonedGrid.allowFallbackResize) {
  				// if cannot achieve the position with just moving other blocks, try ONE resize
  				results = clonedGrid._resizeToFreeSpaceForNode(clonedNode, x, y, width, height);
  			}

  			if (results) {
  				changes = [];
  				this.nodes.forEach(function (n) {
  					var cn = results.grid.nodes.find(function (nn) {
  						return nn.id === n.id;
  					});
  					if (cn) {
  						changes.push({
  							id: n.id,
  							x: cn.x,
  							y: cn.y,
  							width: cn.width,
  							height: cn.height
  						});
  					}
  				});
  			}

  			return changes;
  		}
  	}, {
  		key: "_resizeToFreeSpaceForNode",
  		value: function _resizeToFreeSpaceForNode(clonedNode, x, y, width, height) {
  			var results = null,
  			    collisionNodes = this.whatIsHere(x, y, width, height).filter(function (n) {
  				return clonedNode.id !== n.id;
  			});

  			if (collisionNodes.length === 1) {
  				var cNode = collisionNodes[0],
  				    howWideCanCNodeStay = 0,
  				    howHighCanCNodeStay = 0;

  				if (cNode.y < y) {
  					howHighCanCNodeStay = y - cNode.y;
  				} else {
  					howHighCanCNodeStay = Math.max(0, cNode.y + cNode.height - (y + height));
  				}

  				if (cNode.x < x) {
  					howWideCanCNodeStay = x - cNode.x;
  				} else {
  					howWideCanCNodeStay = Math.max(0, cNode.x + cNode.width - (x + width));
  				}

  				if (howWideCanCNodeStay > 0 || howHighCanCNodeStay > 0) {
  					// find direction where collision node is losing less squares
  					var lostSquaresIfReducingWidth = (cNode.width - howWideCanCNodeStay) * cNode.height;
  					var lostSquaresIfReducingHeight = (cNode.height - howHighCanCNodeStay) * cNode.width;

  					if (lostSquaresIfReducingHeight < lostSquaresIfReducingWidth) {
  						// reduce height
  						cNode.height = howHighCanCNodeStay;
  						if (cNode.y >= y) {
  							cNode.y = y + height;
  						}
  					} else {
  						// reduce width
  						cNode.width = howWideCanCNodeStay;
  						if (cNode.x >= x) {
  							cNode.x = x + width;
  						}
  					}

  					clonedNode.x = x;
  					clonedNode.y = y;
  					clonedNode.width = width;
  					clonedNode.height = height;

  					if (this.isPositionValid(cNode.x, cNode.y, cNode.width, cNode.height)) {
  						results = {
  							grid: this
  						};
  					}
  				}
  			}

  			return results;
  		}
  	}, {
  		key: "_findPos",
  		value: function _findPos(node, x, y, width, height) {
  			var nodesAlreadyMoved = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : [];


  			// returns false if invalid position and null if not found
  			// difference will be when we decide if we try resizing or not

  			if (this.maxMoveIterations <= nodesAlreadyMoved.length) {
  				return null;
  			}

  			if (!this.isPositionValid(x, y, width, height)) {
  				return false;
  			}

  			var clonedGrid = this.cloneGrid(),
  			    clonedNode = clonedGrid.nodes.find(function (n) {
  				return n.id === node.id;
  			});

  			if (!clonedNode) {
  				// create this node if does not exist
  				clonedNode = clonedGrid.addNode(Object.assign({}, node));
  			}

  			var isMoved = clonedGrid.setNewPosition(clonedNode, x, y, width, height);

  			if (isMoved) {

  				var copyOfMovedNodes = nodesAlreadyMoved.slice();
  				copyOfMovedNodes.push(clonedNode.id);

  				// fixing collisions
  				// for each collision, call _findPos and get grid & moved nodes back.
  				// if we get null, is unfixable and try next direction
  				// the one with least nodes moved wins

  				var result = clonedGrid._fixCollisions(clonedNode, copyOfMovedNodes);

  				return result;
  			} else {
  				return null;
  			}
  		}
  	}, {
  		key: "_fixCollisions",
  		value: function _fixCollisions(node) {
  			var nodesAlreadyMoved = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];


  			/*eslint no-constant-condition: ["error", { "checkLoops": false }]*/

  			// for the given node, try moving other nodes (except nodesAlreadyMoved) out of the way
  			// every iteration (with limited move count) is a new branched option / copy of the grid
  			// returns the option with the least nodes moved, or null if none possible

  			var validResults = null,
  			    nodesIteratedOn = [],
  			    collisionNodes = void 0,
  			    collisionNode = void 0;

  			while (true) {

  				collisionNodes = this.whatIsHere(node.x, node.y, node.width, node.height);
  				collisionNode = collisionNodes.find(function (n) {
  					return !nodesIteratedOn.includes(n) && node.id !== n.id;
  				});

  				if (!collisionNode) {
  					if (!validResults) {
  						validResults = [{
  							grid: this,
  							moved: nodesAlreadyMoved
  						}];
  					}
  					break;
  				}

  				if (this.maxMoveIterations <= nodesAlreadyMoved.length) {
  					break;
  				}

  				nodesIteratedOn.push(collisionNode);

  				if (nodesAlreadyMoved.includes(collisionNode.id)) {
  					validResults = null;
  					break;
  				}

  				if (!validResults) {

  					// first collision node
  					validResults = this._getValidMovesForCollisionNodeAwayFromNode(collisionNode, node, nodesAlreadyMoved);
  				} else {
  					(function () {
  						// each collision node (if multiple exist) must work with previous iterations
  						var newValidResults = [];
  						validResults.forEach(function (resultData) {

  							var collisionNodeInThisGrid = resultData.grid.nodes.find(function (n) {
  								return n.id === collisionNode.id;
  							}),
  							    nodeInThisGrid = resultData.grid.nodes.find(function (n) {
  								return n.id === node.id;
  							}),
  							    newResults = [];

  							if (collisionNodeInThisGrid && nodeInThisGrid) {
  								newResults = resultData.grid._getValidMovesForCollisionNodeAwayFromNode(collisionNodeInThisGrid, nodeInThisGrid, resultData.moved);
  							}

  							newResults.forEach(function (result) {
  								newValidResults.push(result);
  							});
  						});

  						validResults = newValidResults;
  					})();
  				}

  				if (!validResults.length) {
  					break;
  				}
  			}

  			var result = null;

  			if (validResults && validResults.length) {

  				// find the one with the least nodes moved
  				result = validResults[0];
  				for (var i = 1; i < validResults.length; i++) {
  					if (validResults[i].moved.length < result.moved.length) {
  						result = validResults[i];
  					}
  				}
  			}

  			return result;
  		}
  	}, {
  		key: "_getValidMovesForCollisionNodeAwayFromNode",
  		value: function _getValidMovesForCollisionNodeAwayFromNode(collisionNode, node, unmovableNodes) {

  			var validMoves = [];

  			// move collisionNode under node
  			var resultMoveDown = this._findPos(collisionNode, collisionNode.x, node.y + node.height, collisionNode.width, collisionNode.height, unmovableNodes);

  			// move collisionNode above node
  			var resultMoveUp = this._findPos(collisionNode, collisionNode.x, node.y - collisionNode.height, collisionNode.width, collisionNode.height, unmovableNodes);

  			// move collisionNode to the right side of node
  			var resultMoveRight = this._findPos(collisionNode, node.x + node.width, collisionNode.y, collisionNode.width, collisionNode.height, unmovableNodes);

  			// move collisionNode to the left side of node
  			var resultMoveLeft = this._findPos(collisionNode, node.x - collisionNode.width, collisionNode.y, collisionNode.width, collisionNode.height, unmovableNodes);

  			if (resultMoveDown) {
  				validMoves.push(resultMoveDown);
  			}
  			if (resultMoveUp) {
  				validMoves.push(resultMoveUp);
  			}
  			if (resultMoveRight) {
  				validMoves.push(resultMoveRight);
  			}
  			if (resultMoveLeft) {
  				validMoves.push(resultMoveLeft);
  			}

  			return validMoves;
  		}
  	}, {
  		key: "_prepareNode",
  		value: function _prepareNode(node, resizing) {

  			node.x = parseInt(node.x, 10);
  			node.y = parseInt(node.y, 10);
  			node.width = parseInt(node.width, 10) || 1;
  			node.height = parseInt(node.height, 10) || 1;
  			node.noResize = !!node.noResize;
  			node.noMove = !!node.noMove;

  			if (node.width > this.width) {
  				node.width = this.width;
  			} else if (node.width < 1) {
  				node.width = 1;
  			}

  			if (node.height > this.height) {
  				node.height = this.height;
  			} else if (node.height < 1) {
  				node.height = 1;
  			}

  			if (node.x + node.width > this.width) {
  				if (resizing) {
  					node.width = this.width - node.x;
  				} else {
  					node.x = this.width - node.width;
  				}
  			}

  			if (node.x < 0) {
  				node.x = 0;
  			}

  			if (node.y + node.height > this.height) {
  				if (resizing) {
  					node.height = this.height - node.y;
  				} else {
  					node.y = this.height - node.height;
  				}
  			}

  			if (node.y < 0) {
  				node.y = 0;
  			}

  			return node;
  		}
  	}]);
  	return GridEngine;
  }();

  var GridBoardJQueryUI = function () {
  	function GridBoardJQueryUI(grid) {
  		classCallCheck(this, GridBoardJQueryUI);

  		this.grid = grid;
  	}

  	createClass(GridBoardJQueryUI, [{
  		key: 'resizable',
  		value: function resizable(el, opts) {
  			var key = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
  			var value = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;

  			el = $(el);
  			if (['disable', 'enable', 'destroy'].includes(opts)) {
  				el.resizable(opts);
  			} else if (opts === 'option') {
  				el.resizable(opts, key, value);
  			} else {
  				el.resizable(Object.assign({}, this.grid.opts.resizable, {
  					handles: el.data('gb-resize-handles') || this.grid.opts.resizable.handles,
  					start: opts.start || function () {},
  					stop: opts.stop || function () {},
  					resize: opts.resize || function () {}
  				}));
  			}
  			return this;
  		}
  	}, {
  		key: 'draggable',
  		value: function draggable(el, opts) {
  			el = $(el);
  			if (['disable', 'enable', 'destroy'].includes(opts)) {
  				el.draggable(opts);
  			} else {
  				el.draggable(Object.assign({}, this.grid.opts.draggable, {
  					containment: null,
  					start: opts.start || function () {},
  					stop: opts.stop || function () {},
  					drag: opts.drag || function () {}
  				}));
  			}
  			return this;
  		}
  	}, {
  		key: 'droppable',
  		value: function droppable(el, opts) {
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
  	}, {
  		key: 'isDroppable',
  		value: function isDroppable(el) {
  			el = $(el);
  			return !!el.data('droppable');
  		}
  	}, {
  		key: 'on',
  		value: function on(el, eventName, callback) {
  			$(el).on(eventName, callback);
  			return this;
  		}
  	}, {
  		key: 'destroy',
  		value: function destroy(el) {
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
  	}]);
  	return GridBoardJQueryUI;
  }();

  var Stylesheet = {
  	create: function create(id) {
  		var style = document.createElement('style');
  		style.type = 'text/css';
  		style.setAttribute('data-gb-style-id', id);
  		style.appendChild(document.createTextNode(' '));
  		document.getElementsByTagName('head')[0].appendChild(style);
  		return style.sheet;
  	},

  	remove: function remove(id) {
  		$('STYLE[data-gb-style-id=' + id + ']').remove();
  	},
  	insertCSSRule: function insertCSSRule(sheet, selector, rules, index) {
  		sheet.insertRule(selector + '{' + rules + '}', index);
  	}
  };

  var Utils = {

  	Stylesheet: Stylesheet,

  	// from https://dustinpfister.github.io/2017/10/20/lodash_throttle/
  	// usage: var f = throttle(function(){/* do something */}, 1000); setTimeout(f, 100);
  	throttle: function throttle(fn, ms) {
  		var called = Date.now(),
  		    throttleFn = void 0;

  		ms = ms || 1000;

  		// define the api
  		throttleFn = function throttleFn() {
  			var now = Date.now();
  			if (now - called >= ms) {
  				fn.apply(undefined, arguments);
  				called = now;
  			}
  		};

  		return throttleFn;
  	},


  	// from https://davidwalsh.name/javascript-debounce-function
  	// Returns a function, that, as long as it continues to be invoked, will not
  	// be triggered. The function will be called after it stops being called for
  	// N milliseconds. If `immediate` is passed, trigger the function on the
  	// leading edge, instead of the trailing.
  	debounce: function debounce(func, wait, immediate) {
  		var timeout;
  		return function () {
  			var context = this,
  			    args = arguments;
  			var later = function later() {
  				timeout = null;
  				if (!immediate) func.apply(context, args);
  			};
  			var callNow = immediate && !timeout;
  			clearTimeout(timeout);
  			timeout = setTimeout(later, wait);
  			if (callNow) func.apply(context, args);
  		};
  	},
  	removePositioningStyles: function removePositioningStyles(el) {
  		var style = el[0].style;
  		if (style.position) {
  			style.removeProperty('position');
  		}
  		if (style.left) {
  			style.removeProperty('left');
  		}
  		if (style.top) {
  			style.removeProperty('top');
  		}
  		if (style.width) {
  			style.removeProperty('width');
  		}
  		if (style.height) {
  			style.removeProperty('height');
  		}
  	}
  };

  var GridBoard = function () {
  	function GridBoard(el) {
  		var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  		classCallCheck(this, GridBoard);


  		var self = this;

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
  			}, opts.draggable)
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
  		}, [], function (changedNodes) {
  			changedNodes.forEach(function (n) {
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

  		this.container.children('.' + this.itemClass + ':not(.' + this.placeholderClass + ')').each(function (i, item) {
  			self._prepareElement(item);
  		});

  		this._setAnimation(this.opts.animate);

  		this.placeholder = $("<div class=\"`${this.placeholderClass}` `${this.itemClass}`\"><div class=\"placeholder-content\"></div></div>").hide();

  		// binding recalculate height on resize
  		this._bindResizeHandler();
  	}

  	createClass(GridBoard, [{
  		key: 'addElement',
  		value: function addElement(el, x, y, width, height, minWidth, maxWidth, minHeight, maxHeight, id) {

  			el = $(el);

  			this.setElAttributes(el, { x: x, y: y, width: width, height: height, minWidth: minWidth, maxWidth: maxWidth, minHeight: minHeight, maxHeight: maxHeight, id: id });

  			this.container.append(el);

  			this._prepareElement(el);

  			this._triggerChangeEvent(true);

  			return el;
  		}
  	}, {
  		key: 'removeElement',
  		value: function removeElement(el, removeFromDOM) {

  			el = $(el);
  			var node = el.data(this.dataPrefix + 'node');

  			this.grid.removeNode(node);
  			el.removeData(this.dataPrefix + 'node');

  			if (removeFromDOM) {
  				el.remove();
  			}

  			this._triggerChangeEvent(true);
  		}
  	}, {
  		key: 'setElAttributes',
  		value: function setElAttributes(el, attrs) {

  			if (!el) {
  				return;
  			}

  			var elAttrs = {};

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
  	}, {
  		key: 'destroy',
  		value: function destroy() {
  			var _this = this;

  			var detachContainer = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;

  			this.container.off('resize.gridboard', this.onResize);
  			this.container.off('dropover dropout drop');
  			this.dd.destroy(this.container);

  			this._setMoveEvents(false);
  			this._setResizeEvents(false);

  			if (detachContainer) {
  				this.container.remove();
  			} else {
  				// remove all node info but don't destroy elements
  				this.grid.nodes.forEach(function (node) {
  					return _this.removeElement(node.el);
  				});
  				this.grid.nodes = [];
  				this.container.removeData('gridboard');
  			}

  			Utils.Stylesheet.remove(this._stylesId);

  			if (this.grid) {
  				this.grid = null;
  			}
  		}
  	}, {
  		key: 'getCellFromAbsolutePixel',
  		value: function getCellFromAbsolutePixel(nodeOffset) {
  			var offset = this.container.offset(),
  			    position = this.container.position();

  			// offset relative to container itself
  			nodeOffset = {
  				left: nodeOffset.left - offset.left + position.left,
  				top: nodeOffset.top - offset.top + position.top
  			};

  			return this._getCellFromPixel(nodeOffset);
  		}
  	}, {
  		key: 'getAdjustedNodeProps',
  		value: function getAdjustedNodeProps(x, y, width, height) {
  			// can be overwritten from outside
  			// useful when need to change placeholder width and height depending on the current coordinates
  			return { x: x, y: y, width: width, height: height };
  		}
  	}, {
  		key: '_getCellFromPixel',
  		value: function _getCellFromPixel(position, useOffset) {
  			var containerPos = useOffset ? this.container.offset() : this.container.position();
  			var relativeLeft = position.left - containerPos.left;
  			var relativeTop = position.top - containerPos.top;

  			var columnWidth = Math.floor(this.container.width() / this.opts.width);
  			var rowHeight = Math.floor(this.container.height() / this.opts.height);

  			return {
  				x: Math.floor(relativeLeft / columnWidth),
  				y: Math.floor(relativeTop / rowHeight)
  			};
  		}
  	}, {
  		key: '_setCellSize',
  		value: function _setCellSize() {

  			var cellWidth = Math.round(this.container.width() / this.opts.width);
  			if (cellWidth) {
  				this.cellWidth = cellWidth;
  			}

  			var cellHeight = Math.round(this.container.height() / this.opts.height);
  			if (cellHeight) {
  				this.cellHeight = cellHeight;
  				this._updateStyles();
  			}
  		}
  	}, {
  		key: '_updateStyles',
  		value: function _updateStyles() {

  			// always recreate styles since the grid cell count is static
  			if (this._stylesId) {
  				Utils.Stylesheet.remove(this._stylesId);
  			}
  			this._stylesId = 'gridboard-style-' + (Math.random() * 100000).toFixed();

  			var self = this,
  			    prefix = '.' + this.containerClass + ' .' + this.itemClass,
  			    stylesheet = Utils.Stylesheet.create(this._stylesId),
  			    getHeight = void 0;

  			getHeight = function getHeight(row) {
  				return self.cellHeight * row + 'px';
  			};

  			Utils.Stylesheet.insertCSSRule(stylesheet, prefix, 'min-height: ' + getHeight(1, 0) + ';', 0);

  			for (var i = 0; i < this.opts.height; i++) {
  				Utils.Stylesheet.insertCSSRule(stylesheet, prefix + '[' + this.dataPrefix + 'height="' + (i + 1) + '"]', 'height: ' + getHeight(i + 1, i) + ';', i);
  				Utils.Stylesheet.insertCSSRule(stylesheet, prefix + '[' + this.dataPrefix + 'min-height="' + (i + 1) + '"]', 'min-height: ' + getHeight(i + 1, i) + ';', i);
  				Utils.Stylesheet.insertCSSRule(stylesheet, prefix + '[' + this.dataPrefix + 'max-height="' + (i + 1) + '"]', 'max-height: ' + getHeight(i + 1, i) + ';', i);
  				Utils.Stylesheet.insertCSSRule(stylesheet, prefix + '[' + this.dataPrefix + 'y="' + i + '"]', 'top: ' + getHeight(i, i) + ';', i);
  			}
  		}
  	}, {
  		key: '_bindNodeDragNDropNResizeHandler',
  		value: function _bindNodeDragNDropNResizeHandler(el, node) {

  			var self = this,
  			    dragOrResize = void 0,
  			    onStartMoving = void 0,
  			    onEndMoving = void 0;

  			dragOrResize = function dragOrResize(event, ui) {

  				var width = void 0,
  				    height = void 0,
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

  				event.stopPropagation(); // dnno why it's not working
  			};

  			onStartMoving = function onStartMoving(event, ui) {

  				self.container.append(self.placeholder);
  				self.container.addClass('drag-or-drop-hover');

  				var o = $(this);

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

  			onEndMoving = function onEndMoving() {

  				self.container.removeClass('drag-or-drop-hover');

  				var o = $(this);

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

  			this.dd.draggable(el, {
  				start: onStartMoving,
  				stop: onEndMoving,
  				drag: dragOrResize
  			}).resizable(el, {
  				start: onStartMoving,
  				stop: onEndMoving,
  				resize: dragOrResize
  			});

  			if (this.opts.staticGrid || this._isOneColumnMode()) {
  				this.dd.draggable(el, 'disable');
  				this.dd.resizable(el, 'disable');
  			}
  		}
  	}, {
  		key: '_triggerChangeEvent',
  		value: function _triggerChangeEvent(forceTrigger) {
  			var elements = this.grid.getDirtyNodes(),
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
  	}, {
  		key: '_isOneColumnMode',
  		value: function _isOneColumnMode() {
  			return this.opts.minWidth && $(window).width() <= this.opts.minWidth;
  		}
  	}, {
  		key: '_setAnimation',
  		value: function _setAnimation(enable) {
  			var className = this.baseClass + 'animate';
  			this.container.toggleClass(className, enable);
  		}
  	}, {
  		key: '_prepareElement',
  		value: function _prepareElement(el) {

  			var self = this;

  			el = $(el);
  			el.addClass(this.itemClass);

  			var getAttr = function getAttr(el, name) {
  				return el.attr(self.dataPrefix + name);
  			};
  			var getNumericAttr = function getNumericAttr(el, name) {
  				return parseInt(getAttr(el, name), 10);
  			};

  			var props = {
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
  				var freeSpace = this.grid.findFreeSpace(props.width, props.height);
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

  			var node = this.grid.addNode(props);
  			el.data(this.dataPrefix + 'node', node);

  			this._bindNodeDragNDropNResizeHandler(el, node);
  		}
  	}, {
  		key: '_setMoveEvents',
  		value: function _setMoveEvents(enabled) {

  			var self = this,
  			    isDisable = !enabled || self._isOneColumnMode();

  			$(this.container.children('.' + this.itemClass)).each(function (i, el) {

  				el = $(el);

  				var node = el.data(self.dataPrefix + 'node');

  				if (!node) {
  					return;
  				}

  				self.dd.draggable(el, isDisable ? 'disable' : 'enable');
  				el.toggleClass('ui-draggable-handle', !isDisable);
  			});

  			return this;
  		}
  	}, {
  		key: '_setResizeEvents',
  		value: function _setResizeEvents(enable) {

  			var self = this,
  			    isDisable = !enable || self._isOneColumnMode();

  			$(this.container.children('.' + this.itemClass)).each(function (i, el) {

  				el = $(el);

  				var node = el.data(self.dataPrefix + 'node');

  				if (!node) {
  					return;
  				}

  				self.dd.resizable(el, isDisable ? 'disable' : 'enable');
  			});

  			return this;
  		}
  	}, {
  		key: '_bindResizeHandler',
  		value: function _bindResizeHandler() {
  			var self = this,
  			    oneColumnMode = self._isOneColumnMode();

  			this.onResize = function (e) {

  				// ignore events bubbled from resizable nodes
  				if ($(e.target).hasClass('ui-resizable')) {
  					return;
  				}

  				self._setCellSize();

  				var isOneColumnAfterResize = self._isOneColumnMode();

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
  			};

  			this.container.on('resize.gridboard', this.onResize);
  		}
  	}, {
  		key: '_bindExternalDragNDropHandler',
  		value: function _bindExternalDragNDropHandler() {

  			var self = this,
  			    draggingElement = null,
  			    onDrag = void 0;

  			onDrag = function onDrag(event) {

  				var el = draggingElement;
  				var node = el.data(self.dataPrefix + 'node');
  				var cell = self._getCellFromPixel({
  					left: event.pageX,
  					top: event.pageY
  				}, true);

  				var originalWidth = parseInt(el.attr('data-width'), 10) || 1;
  				var originalHeight = parseInt(el.attr('data-height'), 10) || 1;

  				var pos = self.getAdjustedNodeProps(cell.x, cell.y, originalWidth, originalHeight);

  				var x = Math.max(0, pos.x);
  				var y = Math.max(0, pos.y);
  				var width = pos.width;
  				var height = pos.height;

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

  			this.dd.droppable(self.container, {
  				tolerance: 'touch',
  				accept: function accept(el) {
  					return $(el).is(self.opts.acceptDraggables);
  				}
  			}).on(self.container, 'dropover', function (event, ui) {

  				self.grid.saveUpdate();

  				var el = $(ui.draggable);

  				var width = parseInt(el.attr('data-width'), 10) || 1;
  				var height = parseInt(el.attr('data-height'), 10) || 1;

  				draggingElement = el;

  				var node = self.grid._prepareNode({
  					width: width,
  					height: height,
  					_added: false
  				});

  				el.data(self.dataPrefix + 'node', node);

  				el.on('drag', onDrag);
  			}).on(self.container, 'dropout', function (event, ui) {

  				self.grid.revertUpdate();

  				var el = $(ui.draggable),
  				    node = el.data(self.dataPrefix + 'node');

  				if (node) {
  					node.el = null;
  					self.grid.removeNode(node);
  				}

  				el.unbind('drag', onDrag);

  				self.placeholder.detach();
  			}).on(self.container, 'drop', function (event, ui) {

  				var node = $(ui.draggable).data(self.dataPrefix + 'node');

  				if (!self.grid.canAddNode(node)) {
  					return;
  				}

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
  	}]);
  	return GridBoard;
  }();

  GridBoard.Engine = GridEngine;

  window.GridBoard = GridBoard;

  $.fn.gridboard = function (opts) {
  	return this.each(function () {
  		var el = $(this);
  		if (!el.data('gridboard')) {
  			el.data('gridboard', new GridBoard(this, opts));
  		}
  	});
  };

}($));
