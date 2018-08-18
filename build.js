
const rollup = require('rollup');
const babel = require('rollup-plugin-babel');
const minify = require('rollup-plugin-babel-minify');
const less = require('rollup-plugin-less');

const outputOpts = {
	format: 'iife',
	globals: { jquery: '$' }
};

const inputJS = 'src/main.js';
const outputJS = 'dist/gridboard.js';
const outputJSMin = 'dist/gridboard.min.js';

const inputCSS = 'src/gridboard.less';
const outputCSS = 'dist/gridboard.css';

function transpileJS() {

	return rollup.rollup({
		input: inputJS,
		plugins: [
			babel({
				exclude: 'node_modules/**',
				presets: ['babel-preset-es2015-rollup']
			})
		],
		external: ['jquery']
	}).then(function(bundle){
		return bundle.write(Object.assign({
			file: outputJS,
		}, outputOpts));
	});

}

function minifyJS() {

	return rollup.rollup({
		input: outputJS,
		plugins: [
			minify({
				comments: false
			})
		]
	}).then(function(bundle){
		return bundle.write(Object.assign({
			file: outputJSMin,
		}, outputOpts));
	});

}

function transformLess() {

	return rollup.rollup({
		input: inputCSS,
		plugins: [
			less({
				output: outputCSS
			})
		]
	});

}

transpileJS()
	.then(minifyJS)
	.then(transformLess)
	.then(function(){
		console.log('\x1b[32m%s\x1b[0m', 'Distribution files created.');
	});
