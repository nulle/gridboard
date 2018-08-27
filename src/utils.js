
import $ from 'jquery';

const Stylesheet = {
	create(id) {
		let style = document.createElement('style');
		style.type = 'text/css';
		style.setAttribute('data-gb-style-id', id);
		style.appendChild(document.createTextNode(' '));
		document.getElementsByTagName('head')[0].appendChild(style);
		return style.sheet;
	},
	remove: function(id) {
		$('STYLE[data-gb-style-id=' + id + ']').remove();
	},
	insertCSSRule: function(sheet, selector, rules, index) {
		sheet.insertRule(selector + '{' + rules + '}', index);
	}
};

const Utils = {

	Stylesheet,

	// from https://dustinpfister.github.io/2017/10/20/lodash_throttle/
	// usage: var f = throttle(function(){/* do something */}, 1000); setTimeout(f, 100);
	throttle(fn, ms) {
		let called = Date.now(),
			throttleFn;

		ms = ms || 1000;

		// define the api
		throttleFn = function () {
			let now = Date.now();
			if (now - called >= ms) {
				fn(...arguments);
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
	debounce(func, wait, immediate) {
		var timeout;
		return function() {
			var context = this, args = arguments;
			var later = function() {
				timeout = null;
				if (!immediate) func.apply(context, args);
			};
			var callNow = immediate && !timeout;
			clearTimeout(timeout);
			timeout = setTimeout(later, wait);
			if (callNow) func.apply(context, args);
		};
	},

	removePositioningStyles(el) {
		let style = el[0].style;
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

export default Utils;
