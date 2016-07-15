Ext.namespace("gxp.plugins");
gxp.plugins.FlexCityLegendTool = Ext.extend(gxp.plugins.Tool, {
	ptype : "gxp_flexcitylegendtool",
	popupTitle : "Legend Aç/Kapat",
	tooltip : "Legend Aç/Kapat",
	menuText : "Legend Aç/Kapat",
	busyMask : null,
	constructor : function(config) {
		gxp.plugins.FlexCityLegendTool.superclass.constructor.apply(this,
				arguments);
	},
	init : function(target) {
		this.busyMask = new Ext.LoadMask(target.mapPanel.map.div, {
			msg : "Lütfen bekleyiniz."
		});
		gxp.plugins.FlexCityLegendTool.superclass.init.apply(this, arguments);
	},
	addActions : function() {
		var actions = [ new GeoExt.Action({
			tooltip : "Legend Aç/Kapat",
			menuText : "Legend Aç/Kapat",
			iconCls : "gxp-icon-flexcitylegendtool",
			enableToggle : false,
			pressed : false,
			allowDepress : false,
			scope : this,
			handler : function(evt) {
				if (this.target.portalItems[0].items[1].isVisible())
					this.target.portalItems[0].items[1].collapse();
				else
					this.target.portalItems[0].items[1].expand();
			}
		}) ];
		return actions = gxp.plugins.FlexCityLegendTool.superclass.addActions
				.call(this, actions);
	}
});
Ext.preg(gxp.plugins.FlexCityLegendTool.prototype.ptype,gxp.plugins.FlexCityLegendTool);
