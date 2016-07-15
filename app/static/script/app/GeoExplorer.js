/**
 * Copyright (c) 2009-2011 The Open Planning Project
 */

Ext.USE_NATIVE_JSON = true;

(function() {
    // backwards compatibility for reading saved maps
    // these source plugins were renamed after 2.3.2
    Ext.preg("gx_wmssource", gxp.plugins.WMSSource);
    Ext.preg("gx_olsource", gxp.plugins.OLSource);
    Ext.preg("gx_googlesource", gxp.plugins.GoogleSource);
    Ext.preg("gx_bingsource", gxp.plugins.BingSource);
    Ext.preg("gx_osmsource", gxp.plugins.OSMSource);
})();

/**
 * api: (define)
 * module = GeoExplorer
 * extends = gxp.Viewer
 */

/** api: constructor
 *  .. class:: GeoExplorer(config)
 *     Create a new GeoExplorer application.
 *
 *     Parameters:
 *     config - {Object} Optional application configuration properties.
 *
 *     Valid config properties:
 *     map - {Object} Map configuration object.
 *     sources - {Object} An object with properties whose values are WMS endpoint URLs
 *
 *     Valid map config properties:
 *         projection - {String} EPSG:xxxx
 *         units - {String} map units according to the projection
 *         maxResolution - {Number}
 *         layers - {Array} A list of layer configuration objects.
 *         center - {Array} A two item array with center coordinates.
 *         zoom - {Number} An initial zoom level.
 *
 *     Valid layer config properties (WMS):
 *     name - {String} Required WMS layer name.
 *     title - {String} Optional title to display for layer.
 */
var GeoExplorer = Ext.extend(gxp.Viewer, {

    // Begin i18n.
    zoomSliderText: "<div>Zoom Level: {zoom}</div><div>Scale: 1:{scale}</div>",
    loadConfigErrorText: "Trouble reading saved configuration: <br />",
    loadConfigErrorDefaultText: "Server Error.",
    xhrTroubleText: "Communication Trouble: Status ",
    layersText: "Katmanlar",
    titleText: "Title",
    saveErrorText: "Trouble saving: ",
    bookmarkText: "Bookmark URL",
    permakinkText: 'Permalink',
    appInfoText: "GeoExplorer",
    aboutText: "About GeoExplorer",
    mapInfoText: "Map Info",
    descriptionText: "Description",
    contactText: "Contact",
    aboutThisMapText: "About this Map",
    mapintializedcomplete:false,
    // End i18n.
    
    /**
     * private: property[mapPanel]
     * the :class:`GeoExt.MapPanel` instance for the main viewport
     */
    mapPanel: null,
    
    toggleGroup: "toolGroup",
    kurumID:"",
    uniMarkerVectorLayer:null,
    constructor: function(config) {
        this.mapItems = [
            {
                xtype: "gxp_scaleoverlay"
            }, {
                xtype: "gx_zoomslider",
                vertical: true,
                height: 100,
                plugins: new GeoExt.ZoomSliderTip({
                    template: this.zoomSliderText
                })
            }
        ];

        // both the Composer and the Viewer need to know about the viewerTools
        // First row in each object is needed to correctly render a tool in the treeview
        // of the embed map dialog. TODO: make this more flexible so this is not needed.
        config.viewerTools = [
            {
                leaf: true,
                text: gxp.plugins.Print.prototype.tooltip,
                ptype: "gxp_print",
                iconCls: "gxp-icon-print",
                customParams: {outputFilename: 'GeoExplorer-print'},
                printService: config.printService,
                checked: true
            }, {
                leaf: true, 
                text: gxp.plugins.Navigation.prototype.tooltip, 
                checked: true, 
                iconCls: "gxp-icon-pan",
                ptype: "gxp_navigation", 
                toggleGroup: this.toggleGroup
            }, {
                leaf: true, 
                text: gxp.plugins.WMSGetFeatureInfo.prototype.infoActionTip, 
                checked: true, 
                iconCls: "gxp-icon-getfeatureinfo",
                ptype: "gxp_wmsgetfeatureinfo", 
                toggleGroup: this.toggleGroup
            }, {
                leaf: true, 
                text: gxp.plugins.Measure.prototype.measureTooltip, 
                checked: true, 
                iconCls: "gxp-icon-measure-length",
                ptype: "gxp_measure",
                controlOptions: {immediate: true},
                toggleGroup: this.toggleGroup
            }, {
                leaf: true, 
                text: gxp.plugins.Zoom.prototype.zoomInTooltip, 
                checked: true, 
                iconCls: "gxp-icon-zoom-in",
                numberOfButtons: 1,
                ptype: "gxp_zoom",
               toggleGroup: this.toggleGroup
            }, {
                leaf: true, 
                text: gxp.plugins.NavigationHistory.prototype.previousTooltip + " / " + gxp.plugins.NavigationHistory.prototype.nextTooltip, 
                checked: true, 
                iconCls: "gxp-icon-zoom-previous",
                numberOfButtons: 2,
                ptype: "gxp_navigationhistory"
            }, {
                leaf: true, 
                text: gxp.plugins.ZoomToExtent.prototype.tooltip, 
                checked: true, 
                iconCls: gxp.plugins.ZoomToExtent.prototype.iconCls,
                ptype: "gxp_zoomtoextent"
            }, {
                leaf: true, 
                text: gxp.plugins.Legend.prototype.tooltip, 
                checked: true, 
                iconCls: "gxp-icon-legend",
                ptype: "gxp_legend"
            },{
                leaf: true, 
                text: "Adres Sorgu", 
                checked: true, 
                iconCls: "gxp-icon-find",
                numberOfButtons: 2,
                ptype: "gxp_kocaeligissorgu"
            },{
                leaf: true,
                text: gxp.plugins.GoogleEarth.prototype.tooltip,
                checked: true,
                iconCls: "gxp-icon-googleearth",
                ptype: "gxp_googleearth"
        }];

        GeoExplorer.superclass.constructor.apply(this, arguments);
    }, 

    loadConfig: function(config) {
        var mapUrl = window.location.hash.substr(1);
        var match = mapUrl.match(/^maps\/(\d+)$/);
        if (match) {
            this.id = Number(match[1]);
            OpenLayers.Request.GET({
                url: mapUrl,
                success: function(request) {
                    var addConfig = Ext.util.JSON.decode(request.responseText);
                    this.applyConfig(Ext.applyIf(addConfig, config));
                },
                failure: function(request) {
                    var obj;
                    try {
                        obj = Ext.util.JSON.decode(request.responseText);
                    } catch (err) {
                        // pass
                    }
                    var msg = this.loadConfigErrorText;
                    if (obj && obj.error) {
                        msg += obj.error;
                    } else {
                        msg += this.loadConfigErrorDefaultText;
                    }
                    this.on({
                        ready: function() {
                            this.displayXHRTrouble(msg, request.status);
                        },
                        scope: this
                    });
                    delete this.id;
                    window.location.hash = "";
                    this.applyConfig(config);
                },
                scope: this
            });
        } else {
        	var kurumID = this.getKurumID();
        	this.kurumID = kurumID;
        	if (kurumID != null)
        	{
        		this.id = kurumID; 
        		OpenLayers.Request.GET({
                     url: "maps/"+kurumID,
                     success: function(request) {
                         var addConfig = Ext.util.JSON.decode(request.responseText);
                         this.applyConfig(Ext.applyIf(addConfig, config));
                     },
                     failure: function(request) {
                         var obj;
                         try {
                             obj = Ext.util.JSON.decode(request.responseText);
                         } catch (err) {
                             // pass
                         }
                         if (request.status == 404)
                         {
                        	 this.on({
                                 ready: function() {
                                	 //orfur kurum kaydedildi
                                	 this.save(function(){Ext.Msg.alert('Kurum Kaydedildi', '#'+this.id+' Kurum Kaydedildi!')},this,"POST");
                                 }
                        	 });
                         }
                         this.applyConfig(config);
                     },
                     scope: this
                 });
        	}
        	else
        	{
	            var query = Ext.urlDecode(document.location.search.substr(1));
	            if (query && query.q) {
	                var queryConfig = Ext.util.JSON.decode(query.q);
	                Ext.apply(config, queryConfig);
	            }
	            this.applyConfig(config);
        	}
        }

    },
    
    displayXHRTrouble: function(msg, status) {
        
        Ext.Msg.show({
            title: this.xhrTroubleText + status,
            msg: msg,
            icon: Ext.MessageBox.WARNING
        });
        
    },
    isInt:function(x) { 
    	   var y=parseInt(x); 
    	   if (isNaN(y)) return false; 
    	   return x==y && x.toString()==y.toString(); 
    },
    getKurumID: function() {
    	//TODO: Burasi doldurulacak
    	//return 12;
    	var defaultMap = 1000;
    	try{
    		var userJobTitle = window.parent.getUserFromLiferay();//window.parent.getUserJobTitle();
    		if(userJobTitle.length>0)
    		{
    			
    			var lo_tempArray = userJobTitle.split("-");
    			if(lo_tempArray.length>0&&this.isInt(lo_tempArray[0]))
    				defaultMap = lo_tempArray[0]
    			
    		}
    	}catch(err)
    	{
    	}
    	
    	return defaultMap;
    	
    	
    },
    getLocationMarkers: function() {
    	var markerLocations = window.parent.getMarkerLocations();
    	var serverMapExtent = window.parent.getMapExtent();
    	//TODO: Haritada gösterilecek olan coordinate noktaları kullanıcıdan alınıyor.
    	uniMarkerVectorLayer = new OpenLayers.Layer.Vector("Yerlerim", {
            styleMap: new OpenLayers.StyleMap(
                    { 'default': 
                       {
	                       pointRadius: 32,
	                       pointerEvents: "visiblePainted",
	                       externalGraphic:"http://geoserver.kocaeli.bel.tr:8090/geoserver/data/styles/marker_place.png",//localkaynak ayarlanacak
	                       label: "${order}",
	                       fontColor: "#000000",
	                       fontSize: "16px",
	                       fontFamily: "Courier New, monospace",
	                       fontWeight: "bold",
	                       labelAlign: "cm",
	                       labelXOffset: "0",
	                       labelYOffset: "0"
                       }
               })
           });
    	
    	if(markerLocations!=null)
    	{
    		var lo_tempMarkerArray = markerLocations.split("||");
    		
            for (var i=0; i<lo_tempMarkerArray.length; i++) {
            	
            	var lo_tempMarker = lo_tempMarkerArray[i];
            	var lo_tempCoordinateArray = lo_tempMarker.split(":");
    	        var point = new OpenLayers.Geometry.Point(lo_tempCoordinateArray[0],lo_tempCoordinateArray[1]);
    	        point.transform(new OpenLayers.Projection("EPSG:4326"),this.map.projection);
    	        
    	        var pointFeature = new OpenLayers.Feature.Vector(point);
    	        pointFeature.attributes.order = "";
    	        if(lo_tempCoordinateArray.length>2 && lo_tempCoordinateArray[3]!=undefined)
    	        	pointFeature.attributes.order = lo_tempCoordinateArray[3];
    	        
    	        uniMarkerVectorLayer.addFeatures([pointFeature]);
            }
	        this.mapPanel.map.addLayer(uniMarkerVectorLayer);
    	}
        
        if(serverMapExtent!=null&serverMapExtent!="")
        {
  			var lo_extent = new OpenLayers.Bounds.fromString(serverMapExtent,this.mapPanel.map.projection);
  			this.mapPanel.map.zoomToExtent(lo_extent,true);
        }

    },
    
    /** private: method[initPortal]
     * Create the various parts that compose the layout.
     */
    initPortal: function() {
        
        var westPanel = new Ext.Panel({
            border: false,
            layout: "border",
            region: "west",
            width: 250,
            split: true,
            collapsible: true,
            collapseMode: "mini",
            header: false,
            items: [
                {region: 'center', autoScroll: true, tbar: [], border: false, id: 'tree', title: this.layersText}, 
                {region: 'south', xtype: "container", layout: "fit", border: false, height: 200, id: 'legend'}
            ]
        });
        
        this.toolbar = new Ext.Toolbar({
            disabled: true,
            id: 'paneltbar',
            items: this.createTools()
        });
        this.on("ready", function() {
            // enable only those items that were not specifically disabled
            var disabled = this.toolbar.items.filterBy(function(item) {
                return item.initialConfig && item.initialConfig.disabled;
            });
            this.toolbar.enable();
            disabled.each(function(item) {
                item.disable();
            });
            westPanel.collapse();
            
            var mapExtent =  this.getCookieValue("extent");
            if(mapExtent!=null&mapExtent!="")
            {
      			var lo_extent = new OpenLayers.Bounds.fromString(mapExtent,this.mapPanel.map.projection);
      			this.mapPanel.map.zoomToExtent(lo_extent,true);
            }
            
//            var locationMarkerLayer =  this.getLocationMarkers();
//            this.mapPanel.map.addLayer(locationMarkerLayer);
            try {
    			eval(window.parent.gisJavaScriptExecute());
            } catch (err) {
            	//console.log("There is no Parent window");
            }

            this.mapintializedcomplete = true;
			
        });

        var googleEarthPanel = new gxp.GoogleEarthPanel({
            mapPanel: this.mapPanel,
            listeners: {
                beforeadd: function(record) {
                    return record.get("group") !== "background";
                }
            }
        });
        
        // TODO: continue making this Google Earth Panel more independent
        // Currently, it's too tightly tied into the viewer.
        // In the meantime, we keep track of all items that the were already
        // disabled when the panel is shown.
        var preGoogleDisabled = [];

        googleEarthPanel.on("show", function() {
            preGoogleDisabled.length = 0;
            this.toolbar.items.each(function(item) {
                if (item.disabled) {
                    preGoogleDisabled.push(item);
                }
            });
            this.toolbar.disable();
            // loop over all the tools and remove their output
            for (var key in this.tools) {
                var tool = this.tools[key];
                if (tool.outputTarget === "map") {
                    tool.removeOutput();
                }
            }
            var layersContainer = Ext.getCmp("tree");
            var layersToolbar = layersContainer && layersContainer.getTopToolbar();
            if (layersToolbar) {
                layersToolbar.items.each(function(item) {
                    if (item.disabled) {
                        preGoogleDisabled.push(item);
                    }
                });
                layersToolbar.disable();
            }
        }, this);

        googleEarthPanel.on("hide", function() {
            // re-enable all tools
            this.toolbar.enable();
            
            var layersContainer = Ext.getCmp("tree");
            var layersToolbar = layersContainer && layersContainer.getTopToolbar();
            if (layersToolbar) {
                layersToolbar.enable();
            }
            // now go back and disable all things that were disabled previously
            for (var i=0, ii=preGoogleDisabled.length; i<ii; ++i) {
                preGoogleDisabled[i].disable();
            }

        }, this);

        this.mapPanelContainer = new Ext.Panel({
            layout: "card",
            region: "center",
            defaults: {
                border: false
            },
            items: [
                this.mapPanel,
                googleEarthPanel
            ],
            activeItem: 0
        });
        
        this.portalItems = [{
            region: "center",
            layout: "border",
            tbar: this.toolbar,
            items: [
                this.mapPanelContainer,
                westPanel
            ]
        }];
        
        GeoExplorer.superclass.initPortal.apply(this, arguments);        
    },
    
    /** private: method[createTools]
     * Create the toolbar configuration for the main panel.  This method can be 
     * overridden in derived explorer classes such as :class:`GeoExplorer.Composer`
     * or :class:`GeoExplorer.Viewer` to provide specialized controls.
     */
    createTools: function() {
        var tools = [
            "-"
        ];
        return tools;
    },
    
    /** private: method[save]
     *
     * Saves the map config and displays the URL in a window.
     */ 
    save: function(callback, scope, method) {
        var configStr = Ext.util.JSON.encode(this.getState());
        var url;
        //var method, url;
        // if (this.id) {
        //    method = "PUT";
            url = "maps/" + this.id;
        //} else {
        //    method = "POST";
        //    url = "maps";
        //}
        OpenLayers.Request.issue({
            method: method,
            url: url,
            data: configStr,
            callback: function(request) {
                this.handleSave(request);
                if (callback) {
                    callback.call(scope || this);
                }
            },
            scope: this
        });
    },
        
    /** private: method[handleSave]
     *  :arg: ``XMLHttpRequest``
     */
    handleSave: function(request) {
        if (request.status == 200) {
            var config = Ext.util.JSON.decode(request.responseText);
            var mapId = config.id;
            if (mapId) {
                this.id = mapId;
                //window.location.hash = "#maps/" + mapId;
            }
        } else {
            throw this.saveErrorText + request.responseText;
        }
    },
    
    /** private: method[showUrl]
     */
    showUrl: function() {
    	Ext.Msg.alert('Kaydedildi', 'Harita basariyla kaydedildi!');
    	/*
        var win = new Ext.Window({
            title: this.bookmarkText,
            layout: 'form',
            labelAlign: 'top',
            modal: true,
            bodyStyle: "padding: 5px",
            width: 300,
            items: [{
                xtype: 'label',
                fieldLabel: this.permakinkText,
                readOnly: true,
                anchor: "100%",
                selectOnFocus: true,
                value: window.location.href
            }]
        });
        win.show();
        win.items.first().selectText();
        */
    },
    
    /** api: method[getBookmark]
     *  :return: ``String``
     *
     *  Generate a bookmark for an unsaved map.
     */
    getBookmark: function() {
        var params = Ext.apply(
            OpenLayers.Util.getParameters(),
            {q: Ext.util.JSON.encode(this.getState())}
        );
        
        // disregard any hash in the url, but maintain all other components
        var url = 
            document.location.href.split("?").shift() +
            "?" + Ext.urlEncode(params);
        
        return url;
    },
    /** private: method[displayAppInfo]
     * Display an informational dialog about the application.
     */
    displayAppInfo: function() {
        var appInfo = new Ext.Panel({
            title: this.appInfoText,
            html: "<iframe style='border: none; height: 100%; width: 100%' src='about.html' frameborder='0' border='0'><a target='_blank' href='about.html'>"+this.aboutText+"</a> </iframe>"
        });

        var about = Ext.applyIf(this.about, {
            title: '', 
            "abstract": '', 
            contact: ''
        });

        var mapInfo = new Ext.Panel({
            title: this.mapInfoText,
            html: '<div class="gx-info-panel">' +
                  '<h2>'+this.titleText+'</h2><p>' + about.title +
                  '</p><h2>'+this.descriptionText+'</h2><p>' + about['abstract'] +
                  '</p> <h2>'+this.contactText+'</h2><p>' + about.contact +'</p></div>',
            height: 'auto',
            width: 'auto'
        });

        var tabs = new Ext.TabPanel({
            activeTab: 0,
            items: [mapInfo, appInfo]
        });

        var win = new Ext.Window({
            title: this.aboutThisMapText,
            modal: true,
            layout: "fit",
            width: 300,
            height: 300,
            items: [tabs]
        });
        win.show();
    }
});