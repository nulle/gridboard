
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

	throttle(fn, ms) {
		let called = Date.now(),
			throttleFn;

		ms = ms || 1000;

		// define the api
		throttleFn = function () {
			let now = Date.now();
			if (now - called >= ms) {
				fn();
				called = now;
			}
		};

		return throttleFn;
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
