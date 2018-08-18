Gridboard
=========

Gridboard is a JS library for making a static width and height dashboards that support drag'n'drop and a basic node move / resize logic.

## Requirements

* [jQuery](http://jquery.com) (>= 3.1.0)
* [jQuery UI](http://jqueryui.com) (>= 1.12.0). Minimum required components: Core, Widget, Mouse, Draggable, Resizable
* (Optional) [jquery-ui-touch-punch](https://github.com/furf/jquery-ui-touch-punch) for touch-based devices support

## Usage

Use pre-built files from `dist` directory directly, or include modules from `src` for custom build.

## Options

- `width` and `height` kinda obvious, and also mandatory. You'll also need to edit the CSS to make different grid widths work - read [here](https://github.com/gridstack/gridstack.js#change-grid-width).

- `acceptDraggables` - jquery selector for external draggable nodes that gridboard should accept. If empty, grid does not accept external nodes.

- `maxMoveIterations` - if node that we are moving / adding / resizing does not have free space, Gridboard will try to move other nodes out of the way. This option sets the maximum move count. Minimum is `1` (to move the original node itself). (default `4`)

- `allowFallbackResize` - if `maxMoveIterations` are exhausted and no option found, allow resizing ONE node at the target location. (default `false`)

- `animate`, `staticGrid`, `minWidth` are pretty much the same as [GridStack options](https://github.com/gridstack/gridstack.js/tree/develop/doc#options).

## Credits

Gridboard is inspired from [gridstack.js](https://github.com/gridstack/gridstack.js), that is an awesome library, but for slightly different use case.

Use Gridboard (this library!) if you have a dashboard with static width and height.

Use [gridstack.js](https://github.com/gridstack/gridstack.js) if your dashboard extends in one of the directions based on number of items.

Gridboard is made for [Databox](https://databox.com), and as such, new versions might include breaking changes, and feature requests probably will be ignored (it's really not personal). Feel free to fork it and make it more awesome though ;)
