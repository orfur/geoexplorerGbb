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
 *  class = WMSGetFeatureInfo
 */

/** api: (extends)
 *  plugins/Tool.js
 */
Ext.namespace("gxp.plugins");

/** api: constructor
 *  .. class:: WMSGetFeatureInfo(config)
 *
 *    This plugins provides an action which, when active, will issue a
 *    GetFeatureInfo request to the WMS of all layers on the map. The output
 *    will be displayed in a popup.
 */   
gxp.plugins.WMSGetFeatureInfo = Ext
		.extend(
				gxp.plugins.Tool,
				{
					ptype : "gxp_wmsgetfeatureinfo",
					outputTarget : "map",
					popupCache : null,
					infoActionTip : "Get Feature Info",
					popupTitle : "Feature Info",
					format : "html",
					addActions : function() {
						this.popupCache = {};
						var actions = gxp.plugins.WMSGetFeatureInfo.superclass.addActions
								.call(
										this,
										[ {
											tooltip : this.infoActionTip,
											iconCls : "gxp-icon-getfeatureinfo",
											toggleGroup : this.toggleGroup,
											enableToggle : true,
											allowDepress : true,
											toggleHandler : function(button,
													pressed) {
												for ( var i = 0, len = info.controls.length; i < len; i++) {
													if (pressed) {
														info.controls[i]
																.activate();
													} else {
														info.controls[i]
																.deactivate();
													}
												}
											}
										} ]);
						var infoButton = this.actions[0].items[0];
						var info = {
							controls : []
						};
						var updateInfo = function() {
							var queryableLayers = this.target.mapPanel.layers
									.queryBy(function(x) {
										return x.get("queryable");
									});
							var map = this.target.mapPanel.map;
							var control;
							for ( var i = 0, len = info.controls.length; i < len; i++) {
								control = info.controls[i];
								control.deactivate();
								control.destroy();
							}
							info.controls = [];
							queryableLayers
									.each(
											function(x) {
												var layer = x.getLayer();
												var vendorParams = Ext.apply(
														{}, this.vendorParams), param;
												if (this.layerParams) {
													for ( var i = this.layerParams.length - 1; i >= 0; --i) {
														param = this.layerParams[i]
																.toUpperCase();
														vendorParams[param] = layer.params[param];
													}
												}
												var infoFormat = x
														.get("infoFormat");
												if (infoFormat === undefined) {
													infoFormat = this.format == "html" ? "text/html"
															: "application/vnd.ogc.gml";
												}
												var control = new OpenLayers.Control.WMSGetFeatureInfo(
														Ext
																.applyIf(
																		{
																			url : layer.url,
																			queryVisible : true,
																			layers : [ layer ],
																			infoFormat : infoFormat,
																			vendorParams : vendorParams,
																			eventListeners : {
																				getfeatureinfo : function(
																						evt) {
																					var title = x
																							.get("title")
																							|| x
																									.get("name");
																					if (infoFormat == "text/html") {
																						var match = evt.text
																								.match(/<body[^>]*>([\s\S]*)<\/body>/);
																						if (match
																								&& !match[1]
																										.match(/^\s*$/)) {
																							this
																									.displayPopup(
																											evt,
																											title,
																											match[1]);
																						}
																					} else if (infoFormat == "text/plain") {
																						this
																								.displayPopup(
																										evt,
																										title,
																										'<pre>'
																												+ evt.text
																												+ '</pre>');
																					} else {
																						this
																								.displayPopup(
																										evt,
																										title);
																					}
																				},
																				scope : this
																			}
																		},
																		this.controlOptions));
												map.addControl(control);
												info.controls.push(control);
												if (infoButton.pressed) {
													control.activate();
												}
											}, this);
						};
						this.target.mapPanel.layers.on("update", updateInfo,
								this);
						this.target.mapPanel.layers.on("add", updateInfo, this);
						this.target.mapPanel.layers.on("remove", updateInfo,
								this);
						return actions;
					},
					displayPopup : function(evt, title, text) {
						var popup;
						var popupKey = evt.xy.x + "." + evt.xy.y;
						if (!(popupKey in this.popupCache)) {
							popup = this.addOutput({
								xtype : "gx_popup",
								title : this.popupTitle,
								layout : "accordion",
								location : evt.xy,
								map : this.target.mapPanel,
								width : 250,
								height : 300,
								defaults : {
									title : title,
									layout : "fit",
									autoScroll : true,
									autoWidth : true,
									collapsible : true
								},
								listeners : {
									close : (function(key) {
										return function(panel) {
											delete this.popupCache[key];
										};
									})(popupKey),
									scope : this
								}
							});
							this.popupCache[popupKey] = popup;
						} else {
							popup = this.popupCache[popupKey];
						}
						var features = evt.features, config = [];
						if (!text && features) {
							var feature;
							for ( var i = 0, ii = features.length; i < ii; ++i) {
								feature = features[i];
								config.push(Ext.apply({
									xtype : "propertygrid",
									title : feature.fid ? feature.fid : title,
									source : feature.attributes
								}, this.itemConfig));
							}
						} else if (text) {
							config.push(Ext.apply({
								title : title,
								html : text
							}, this.itemConfig));
						}
						popup.add(config);
						popup.doLayout();
					}
				});
Ext.preg(gxp.plugins.WMSGetFeatureInfo.prototype.ptype,
		gxp.plugins.WMSGetFeatureInfo);
