/**
 * Copyright (c) 2008-2011 The Open Planning Project
 * 
 * Published under the GPL license.
 * See https://github.com/opengeo/gxp/raw/master/license.txt for the full text
 * of the license.
 */

/**
 * @requires plugins/Tool.js
 */

/** api: (define)
 *  module = gxp.plugins
 *  class = Zoom
 */

/** api: (extends)
 *  plugins/Tool.js
 */
Ext.namespace("gxp.plugins");

/** api: constructor
 *  .. class:: Zoom(config)
 *
 *    Provides two actions for zooming in and out.
 */
gxp.plugins.Zoom = Ext.extend(gxp.plugins.Tool, {
    
    /** api: ptype = gxp_zoom */
    ptype: "gxp_zoom",
    
    /** api: config[zoomInMenuText]
     *  ``String``
     *  Text for zoom in menu item (i18n).
     */
    zoomInMenuText: "Yakınlaştır",

    /** api: config[zoomOutMenuText]
     *  ``String``
     *  Text for zoom out menu item (i18n).
     */
    zoomOutMenuText: "Uzaklaştır",

    /** api: config[zoomInTooltip]
     *  ``String``
     *  Text for zoom in action tooltip (i18n).
     */
    zoomInTooltip: "Yakınlaştır",

    /** api: config[zoomOutTooltip]
     *  ``String``
     *  Text for zoom out action tooltip (i18n).
     */
    zoomOutTooltip: "Uzaklaştır",
    
    /** private: method[constructor]
     */
    constructor: function(config) {
        gxp.plugins.Zoom.superclass.constructor.apply(this, arguments);
    },

    /** api: method[addActions]
     */
    addActions: function() {
        var actions = [
	    new GeoExt.Action({
	    	tooltip: this.zoomInMenuText,
            iconCls: "gxp-icon-zoom-in",
            map: this.target.mapPanel.map,
            control: new OpenLayers.Control.ZoomBox({alwaysZoom:true}),
            toggleGroup: this.toggleGroup,
            group: this.toggleGroup,
            scope: this
	    })];
        return gxp.plugins.Zoom.superclass.addActions.apply(this, [actions]);
    }
        
});

Ext.preg(gxp.plugins.Zoom.prototype.ptype, gxp.plugins.Zoom);
