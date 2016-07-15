Ext.namespace("gxp.plugins");

gxp.plugins.FlexCityCurrentLocation = Ext.extend(
				gxp.plugins.Tool,
				{
					ptype : "gxp_flexcitycurrentlocation",
					popupTitle : "Adres Al",
					tooltip : "Adres Al",
					menuText : "Adres Al",
					dataLayers : null,
					busyMask : null,
					constructor : function(config) {
						gxp.plugins.FlexCityCurrentLocation.superclass.constructor
								.apply(this, arguments);
					},
					init : function(target) {
						this.busyMask = new Ext.LoadMask(
								target.mapPanel.map.div, {
									msg : "Lütfen bekleyiniz."
								});

						gxp.plugins.FlexCityCurrentLocation.superclass.init
								.apply(this, arguments);
					},
					addActions : function() {
						OpenLayers.Control.Click = OpenLayers
								.Class(
										OpenLayers.Control,
										{
											defaultHandlerOptions : {
												'single' : true,
												'double' : false,
												'pixelTolerance' : 0,
												'stopSingle' : false,
												'stopDouble' : false
											},
											initialize : function(options) {
												this.handlerOptions = OpenLayers.Util
														.extend(
																{},
																this.defaultHandlerOptions);
												OpenLayers.Control.prototype.initialize
														.apply(this, arguments);
												this.handler = new OpenLayers.Handler.Click(
														this,
														{
															'click' : this.trigger
														}, this.handlerOptions);
											},
											trigger : function(e) {
											},
											scope : this
										});
						var actions = [ new GeoExt.Action(
								{
									tooltip : "Konumum",
									menuText : "Konumum",
									iconCls : "gxp-icon-flexcitycurrentlocation",
									enableToggle : false,
									pressed : false,
									allowDepress : false,
									scope : this,
									handler : function(evt) {
										navigator.geolocation
												.getCurrentPosition(this.zoomCurrentPosition);
									}
								}) ];
						return actions = gxp.plugins.FlexCityCurrentLocation.superclass.addActions
								.call(this, actions);
					},
					uniWaiting : function(msecs) {
						var start = new Date().getTime();
						var cur = start
						while (cur - start < msecs) {
							cur = new Date().getTime();
						}
					},
					zoomCurrentPosition : function(position) {
						var proj4326 = new OpenLayers.Projection('EPSG:4326');
						var zoomLevel = 18;
						var lat = position.coords.latitude;
						var lon = position.coords.longitude;
						window.app.mapPanel.map.setCenter(
								new OpenLayers.LonLat(lon, lat).transform(
										proj4326, window.app.mapPanel.map
												.getProjectionObject()),
								zoomLevel);
					}
				});

Ext.preg(gxp.plugins.FlexCityCurrentLocation.prototype.ptype,gxp.plugins.FlexCityCurrentLocation);