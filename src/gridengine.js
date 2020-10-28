
class GridEngine {

	constructor(opts = {}, nodes = [], onchange = function(){}) {

		this.width = opts.width;
		this.height = opts.height;
		this.maxMoveIterations = opts.maxMoveIterations || 1;
		this.allowFallbackResize = !!opts.allowFallbackResize;

		this.nodes = nodes;
		this.onchange = onchange;

		// to populate origX etc fields so the revert does not set all to undefined
		this.saveUpdate();
	}

	canAddNode(node) {

		if (!this.isPositionValid(node.x, node.y, node.width, node.height)) {
			return false;
		}

		let clonedNode,
			clonedGrid = this.cloneGrid();

		clonedNode = clonedGrid.addNode(Object.assign({}, node));

		let changesForMove = clonedGrid.getChangesForMove(clonedNode, clonedNode.x, clonedNode.y, clonedNode.width, clonedNode.height);

		return !!changesForMove;
	}

	addNode(node) {

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

	moveNode(node, x, y, width, height) {

		let self = this,
			changesForMove;

		changesForMove = this.getChangesForMove(node, x, y, width, height);

		if (!changesForMove) {
			return;
		}

		changesForMove.forEach(function(change){
			let n = self.nodes.find(nn => nn.id === change.id);
			if (n) {
				self.setNewPosition(n, change.x, change.y, change.width, change.height);
			}
		});

		this.triggerChangeEvent();

		return true;
	}

	removeNode(node) {

		if (!node) {
			return;
		}

		node.id = null; // mark it for deletion
		this.nodes = this.nodes.filter(n => n !== node);
		this.triggerChangeEvent(node);
		this.onNodePositionChange();
	}

	getNodeById(nodeId) {
		return this.nodes.find(n => nodeId === n.id);
	}

	cleanNodes() {
		this.nodes.forEach(function(n){ n._dirty = false; });
	}

	getDirtyNodes() {
		return this.nodes.filter(n => n._dirty);
	}

	isPositionValid(x, y, width, height) {
		let isValid = true;

		if (   y < 0
			|| x < 0
			|| y + height > this.height
			|| x + width > this.width
		) {
			isValid = false;
		}

		return isValid;
	}

	whatIsHere(x = 0, y = 0, width = 1, height = 1) {
		return this.nodes.filter(n => {
			return !(n.x + n.width <= x
				|| x + width <= n.x
				|| n.y + n.height <= y
				|| y + height <= n.y
			);
		});
	}

	isAreaEmpty(x, y, width, height, exceptNode) {

		// first check if is not out of bounds
		if (!this.isPositionValid(x, y, width, height)) {
			return false;
		}
		let collisionNodes = this.whatIsHere(x, y, width, height);

		if (exceptNode) {
			collisionNodes = collisionNodes.filter(n => n !== exceptNode);
		}

		return !collisionNodes.length;
	}

	findFreeSpace(w = 1, h = 1, forNode) {

		let freeSpace = null,
			i, j;

		for (i = 0; i <= (this.width - w); i++) {
			if (freeSpace) {
				break;
			}
			for (j = 0; j <= (this.height - h); j++) {
				if (freeSpace) {
					break;
				}
				if (this.isAreaEmpty(i, j, w, h, forNode)) {
					freeSpace = {x: i, y: j, w, h};
				}
			}
		}

		return freeSpace;
	}

	isNodeChangedPosition(node, x, y, width, height) {
		return !(  node.x === x
				&& node.y === y
				&& node.width === width
				&& node.height === height
			);
	}

	fixOverlappingPositions(maxMoves, allowResize) {
		let self = this,
			// save to set back after
			origMaxMoves = this.maxMoveIterations,
			origAllowResize = this.allowFallbackResize;

		this.maxMoveIterations = maxMoves;
		this.allowFallbackResize = allowResize;

		// in theory, we only need to fix one
		this.nodes.some(function(node){
			if (!self.isAreaEmpty(node.x, node.y, node.width, node.height, node)) {
				return self.moveNode(node, node.x, node.y, node.width, node.height);
			}
		});

		this.maxMoveIterations = origMaxMoves;
		this.allowFallbackResize = origAllowResize;
	}

	cloneGrid(nodeMapperFn) {

		if (!nodeMapperFn) {
			nodeMapperFn = function(n) {
				return Object.assign({}, n);
			}
		}

		let clonedGrid = new GridEngine({
			width: this.width,
			height: this.height,
			maxMoveIterations: this.maxMoveIterations,
			allowFallbackResize: this.allowFallbackResize
		}, this.nodes.map(nodeMapperFn));

		return clonedGrid;
	}

	saveUpdate() {

		this.nodes.forEach(n => {
			n._origX = n.x;
			n._origY = n.y;
			n._origWidth = n.width;
			n._origHeight = n.height;
		});
	}

	revertUpdate() {

		this.nodes.forEach(n => {
			n.x = n._origX;
			n.y = n._origY;
			n.width = n._origWidth;
			n.height = n._origHeight;
		});

		this.onNodePositionChange();
	}

	onNodePositionChange() {
		// can be overwritten from outside -> called when nodes change positions
		// even temporary, while dragging / resizing
	}

	triggerChangeEvent(node) {

		let nodes = [];

		if (node) {
			nodes.push(node);
		}

		let changedNodes = nodes.concat(this.getDirtyNodes());

		this.onchange(changedNodes);
	}

	setNewPosition(node, x, y, width, height) {

		if (!node) {
			return;
		}

		if (!this.isNodeChangedPosition(node, x, y, width, height)) {
			return true;
		}

		if (!this.isPositionValid(x, y, width, height)) {
			return false;
		}

		let resizing = node.width != width || node.height != height;
		node._dirty = true;

		node.x = x;
		node.y = y;
		node.width = width;
		node.height = height;

		node = this._prepareNode(node, resizing);

		this.onNodePositionChange();

		return true;
	}

	getChangesForMove(node, x, y, width, height) {

		// returns changes on all nodes on this grid
		// required to move the given node to the given position
		// limited to certain move count

		let clonedNode,
			clonedGrid;

		clonedGrid = this.cloneGrid(function(n){
			let nn = Object.assign({}, n);
			nn.x = n._origX;
			nn.y = n._origY;
			nn.width = n._origWidth;
			nn.height = n._origHeight;
			return nn;
		});

		clonedNode = clonedGrid.nodes.find(n => n.id === node.id);

		var unmovableNodes = [];
		clonedGrid.nodes.forEach(function (n) {
			if (n.noMove) {
				unmovableNodes.push(n.id);
			}
		});

		let changes = null,
			results = clonedGrid._findPos(node, x, y, width, height, unmovableNodes);

		if (results === null && clonedGrid.allowFallbackResize) {
			// if cannot achieve the position with just moving other blocks, try ONE resize
			results = clonedGrid._resizeToFreeSpaceForNode(clonedNode, x, y, width, height);
		}

		if (results) {
			changes = [];
			this.nodes.forEach(function(n){
				let cn = results.grid.nodes.find(function(nn){ return nn.id === n.id; });
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

	_resizeToFreeSpaceForNode(clonedNode, x, y, width, height) {
		let results = null,
			collisionNodes = this.whatIsHere(x, y, width, height).filter(n => clonedNode.id !== n.id);

		if (collisionNodes.length === 1) {
			let cNode = collisionNodes[0],
				howWideCanCNodeStay = 0,
				howHighCanCNodeStay = 0;

			if (!cNode.noResize) {

				if (cNode.y < y) {
					howHighCanCNodeStay = y - cNode.y;
				} else {
					howHighCanCNodeStay = Math.max(0, (cNode.y + cNode.height) - (y + height));
				}

				if (cNode.x < x) {
					howWideCanCNodeStay = x - cNode.x;
				} else {
					howWideCanCNodeStay = Math.max(0, (cNode.x + cNode.width) - (x + width));
				}

				if (howWideCanCNodeStay > 0 || howHighCanCNodeStay > 0) {
					// find direction where collision node is losing less squares
					let lostSquaresIfReducingWidth = (cNode.width - howWideCanCNodeStay) * cNode.height;
					let lostSquaresIfReducingHeight = (cNode.height - howHighCanCNodeStay) * cNode.width;

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
		}

		return results;
	}

	_findPos(node, x, y, width, height, nodesAlreadyMoved = []) {

		// returns false if invalid position and null if not found
		// difference will be when we decide if we try resizing or not

		if (this.maxMoveIterations <= nodesAlreadyMoved.length) {
			return null;
		}

		if (!this.isPositionValid(x, y, width, height)) {
			return false;
		}

		let clonedGrid = this.cloneGrid(),
			clonedNode = clonedGrid.nodes.find(n => n.id === node.id);

		if (!clonedNode) {
			// create this node if does not exist
			clonedNode = clonedGrid.addNode(Object.assign({}, node));
		}

		let isMoved = clonedGrid.setNewPosition(clonedNode, x, y, width, height);

		if (isMoved) {

			let copyOfMovedNodes = nodesAlreadyMoved.slice();
			copyOfMovedNodes.push(clonedNode.id);

			// fixing collisions
			// for each collision, call _findPos and get grid & moved nodes back.
			// if we get null, is unfixable and try next direction
			// the one with least nodes moved wins

			let result = clonedGrid._fixCollisions(clonedNode, copyOfMovedNodes);

			return result;

		} else {
			return null;
		}
	}

	_fixCollisions(node, nodesAlreadyMoved = []) {

		/*eslint no-constant-condition: ["error", { "checkLoops": false }]*/

		// for the given node, try moving other nodes (except nodesAlreadyMoved) out of the way
		// every iteration (with limited move count) is a new branched option / copy of the grid
		// returns the option with the least nodes moved, or null if none possible

		let validResults = null,
			nodesIteratedOn = [],
			collisionNodes,
			collisionNode;

		while (true) {

			collisionNodes = this.whatIsHere(node.x, node.y, node.width, node.height);
			collisionNode = collisionNodes.find(function(n){ return !nodesIteratedOn.includes(n) && node.id !== n.id; });

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
				validResults = this._getValidMovesForCollisionNodeAwayFromNode(
					collisionNode,
					node,
					nodesAlreadyMoved
				);

			} else {
				// each collision node (if multiple exist) must work with previous iterations
				let newValidResults = [];
				validResults.forEach(function(resultData){

					let collisionNodeInThisGrid = resultData.grid.nodes.find(function(n) {return n.id === collisionNode.id;}),
						nodeInThisGrid = resultData.grid.nodes.find(function(n) {return n.id === node.id;}),
						newResults = [];

					if (collisionNodeInThisGrid && nodeInThisGrid) {
						newResults = resultData.grid._getValidMovesForCollisionNodeAwayFromNode(
							collisionNodeInThisGrid,
							nodeInThisGrid,
							resultData.moved
						);
					}

					newResults.forEach(function(result){
						newValidResults.push(result);
					});

				});

				validResults = newValidResults;
			}

			if (!validResults.length) {
				break;
			}
		}

		let result = null;

		if (validResults && validResults.length) {

			// find the one with the least nodes moved
			result = validResults[0];
			for (let i = 1; i < validResults.length; i++) {
				if (validResults[i].moved.length < result.moved.length) {
					result = validResults[i];
				}
			}
		}

		return result;

	}

	_getValidMovesForCollisionNodeAwayFromNode(collisionNode, node, unmovableNodes) {

		let validMoves = [];

		// move collisionNode under node
		let resultMoveDown = this._findPos(collisionNode, collisionNode.x, node.y + node.height, collisionNode.width, collisionNode.height, unmovableNodes);

		// move collisionNode above node
		let resultMoveUp = this._findPos(collisionNode, collisionNode.x, node.y - collisionNode.height, collisionNode.width, collisionNode.height, unmovableNodes);

		// move collisionNode to the right side of node
		let resultMoveRight = this._findPos(collisionNode, node.x + node.width, collisionNode.y, collisionNode.width, collisionNode.height, unmovableNodes);

		// move collisionNode to the left side of node
		let resultMoveLeft = this._findPos(collisionNode, node.x - collisionNode.width, collisionNode.y, collisionNode.width, collisionNode.height, unmovableNodes);

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

	_prepareNode(node, resizing) {

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

}

export default GridEngine;
