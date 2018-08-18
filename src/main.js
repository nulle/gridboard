
import GridBoard from './gridboard';
import $ from 'jquery';

window.GridBoard = GridBoard;

$.fn.gridboard = function(opts) {
	return this.each(function() {
		let el = $(this);
		if (!el.data('gridboard')) {
			el.data('gridboard', new GridBoard(this, opts));
		}
	});
};
