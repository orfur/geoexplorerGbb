Ext.namespace("gxp.plugins");
  
gxp.plugins.FlexCityAdresAl = Ext.extend(gxp.plugins.Tool, {
    
      ptype: "gxp_flexcityadresal",
      popupTitle: "Adres Al",
      tooltip: "Adres Al",
      menuText: "Adres Al",
      dataLayers:null,
      busyMask:null,
      constructor: function(config) {
    	  gxp.plugins.KocaeliGisSorgu.superclass.constructor.apply(this, arguments);
      }, 
      init: function(target) {
          this.busyMask = new Ext.LoadMask(
                  target.mapPanel.map.div, {
                      msg: "Lütfen bekleyiniz." 
                  }
              );
    	  gxp.plugins.FlexCityAdresAl.superclass.init.apply(this, arguments);   	  
      },
      addActions: function() {
  
    	  OpenLayers.Control.Click  = OpenLayers.Class(OpenLayers.Control, {                
              defaultHandlerOptions: {
                  'single': true,
                  'double': false,
                  'pixelTolerance': 0,
                  'stopSingle': false,
                  'stopDouble': false
              },

              initialize: function(options) {
                  this.handlerOptions = OpenLayers.Util.extend(
                      {}, this.defaultHandlerOptions
                  );
                  OpenLayers.Control.prototype.initialize.apply(
                      this, arguments
                  ); 
                  this.handler = new OpenLayers.Handler.Click(
                      this, {
                          'click': this.trigger
                      }, this.handlerOptions
                  );
              }, 

              trigger: function(e) {
            	  var adresStore = new Ext.data.ArrayStore({
            		  id: 0,
            		  fields: ['NVI_CSBMKOD','BINA_KODU','BINA_ADI','KAPI_NO','YOL_ID','YOL_ISMI','MAH_ID','MAH_ADI','ILCE_ID','ILCE_ADI']
            	  });
            	  
            	  var lonlatWGS84=this.map.getLonLatFromViewPortPx(e.xy);lonlatWGS84=lonlatWGS84.transform(new OpenLayers.Projection(this.map.projection),new OpenLayers.Projection("EPSG:4326"));
                  var lonlat = this.map.getLonLatFromViewPortPx(e.xy);
              	 // var transGeom  = lonlat.transform(new OpenLayers.Projection(this.map.projection),new OpenLayers.Projection("EPSG:4326"));
              	  //alert(transGeom.lon + " " + transGeom.lat);
              	  
              	  //kapi bilgisi
              	  //var response = this.scope.queryOnLayer(this.scope.dataLayers.kapi,"KAPI_NO,NVI_CSBMKOD,NVI_BINAKOD,PARSEL_ID","DWITHIN(SHAPE,POINT("+lonlat.lon+ " " + lonlat.lat +"),1,meters)");
				var intersectGeometry = new OpenLayers.Bounds();
              	intersectGeometry.extend(new OpenLayers.LonLat(lonlat.lon-0.2,lonlat.lat-0.2));
				intersectGeometry.extend(new OpenLayers.LonLat(lonlat.lon+0.2,lonlat.lat+0.2));

				  intersectGeometry = intersectGeometry.transform(new OpenLayers.Projection("EPSG:102113"),new OpenLayers.Projection("EPSG:4326"));
				
				adresStore.data["NVI_CSBMKOD"]="0";
				adresStore.data["KAPI_NO"]="0";
				adresStore.data["YOL_ID"] = "0";
				adresStore.data["YOL_ISMI"] = "-";
				adresStore.data["MAH_ID"] = "0";
				adresStore.data["MAH_ADI"] = "-";
				adresStore.data["ILCE_ID"] = "0";
				adresStore.data["ILCE_ADI"] = "-";
				adresStore.data["BINA_ADI"] = "-";
				adresStore.data["BINA_KODU"] ="0";
              	try{

					this.maksServiceUrl = "https://maksu:maksp@kpsv2.nvi.gov.tr/Services/WFSService/?SERVICE=WFS&VERSION=1.1.0&request=GetFeature";

					var mahalleler = this.scope.queryWFSLayer(this.maksServiceUrl + "&TYPENAME=maks:Mahalle",intersectGeometry);
					var sokaklar = this.scope.queryWFSLayer(this.maksServiceUrl + "&TYPENAME=maks:YolOrtaHat",intersectGeometry);
					var kapilar = this.scope.queryWFSLayer(this.maksServiceUrl + "&TYPENAME=maks:Numarataj",intersectGeometry);
					var yapilar = this.scope.queryWFSLayer(this.maksServiceUrl + "&TYPENAME=maks:Yapi",intersectGeometry);

					if(mahalleler.length>0)
              	  {
		              	  Ext.each(mahalleler, function(mahalle)
		              	  {
							  adresStore.data["MAH_ID"] = mahalle.attributes["kimlikNo"];
							  adresStore.data["MAH_ADI"] = mahalle.attributes["ad"];

		              	  },this);
              	  }


					if(sokaklar.length>0)
					{
						Ext.each(sokaklar, function(sokak)
						{
							adresStore.data["YOL_ID"] = sokak.attributes["kimlikNo"];
							adresStore.data["YOL_ISMI"] = sokak.attributes["ad"];
						},this);
					}

					if(kapilar.length>0)
					{
						Ext.each(kapilar, function(kapi)
						{
							adresStore.data["KAPI_NO"]="0";
						},this);
					}


					if(yapilar.length>0)
					{
						Ext.each(yapilar, function(yapi)
						{

							adresStore.data["BINA_ADI"] = yapi.attributes["ad"];
							adresStore.data["BINA_KODU"] = yapi.attributes["kimlikNo"];
						},this);
					}

		              	try //vaadin service erisim icin kullanilan fonksiyon 
						{
		              		var mapExtent=this.map.getExtent();
		              		var mapImageUrl="";
							mapImageUrl+= "http://10.1.1.145:8080/geoserver/UNIVERSAL/ows?service=wms";
		              		mapImageUrl+="?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&SRS="+this.map.projection;mapImageUrl+="&BBOX="+mapExtent.toString();mapImageUrl+="&FORMAT=image/png&EXCEPTIONS=application/vnd.ogc.se_inimage&LAYERS=UniversalWorkspace:SDE.KOYMAHALLE,UniversalWorkspace:SDE.KARAYOLU,UniversalWorkspace:SDE.KOCAELI_KAPI,UniversalWorkspace:SDE.KOCAELI_YAPI";
		              		mapImageUrl+="&WIDTH="+this.map.size.w+"&HEIGHT="+this.map.size.h+"&TILED=true&TRANSPARENT=TRUE";mapImageUrl=mapImageUrl.replace(/:/gi,"<>");

		              		Ext.MessageBox.buttonText = {
		              	            ok     : "Tamam",
		              	            cancel : "İptal",
		              	            yes    : "Evet",
		              	            no     : "Hayır"
		              	        };
							//Ext.MessageBox.confirm('Uyarı', "Şeçmek istediğiniz adres?\n" +
							//	adresStore.data["ILCE_ADI"] + " İlçesi\n" +
							//	adresStore.data["MAH_ADI"]  + " Mahallesi\n" +
							//	adresStore.data["YOL_ISMI"] + " Cad./Sok. " +
								Ext.MessageBox.confirm('Uyarı', "Şeçmek istediğiniz adres?\n" +
								adresStore.data["MAH_ADI"]  + " Mahallesi\n" + 
								adresStore.data["YOL_ISMI"] + " Cad./Sok. " + 
								' Kapıno ' + adresStore.data["KAPI_NO"], function(btn) {     
		
									window.parent.setAddressScript3('address:' + 
																adresStore.data["NVI_CSBMKOD"]+':'+
																adresStore.data["KAPI_NO"]  +':'+
																adresStore.data["YOL_ID"]   +':'+
																adresStore.data["YOL_ISMI"] +':'+ 
																adresStore.data["MAH_ID"]	+':'+
																adresStore.data["MAH_ADI"]	+':'+
																adresStore.data["ILCE_ID"]	+':'+
																adresStore.data["ILCE_ADI"] +':'+
																adresStore.data["BINA_ADI"]	+':'+
																adresStore.data["BINA_KODU"]+':'+
																lonlatWGS84.lon+':'+
																lonlatWGS84.lat+':'+
																mapExtent+':'+
																mapImageUrl);
								});
						}						    			
						catch(err)
						{
							
							alert("window.parent.setAddress3 fonksiyonu bulunamadı.\n" +err.message );
						}
              	  
              	  
              	}
              	catch(errM)//sorgulamalar icin try catch blok
              	{
              		
              		alert("Mekansal sorgulama yapılırken hata oluştu." + errM.message);
              	}
              	
              	

              	//window.parent.deleteSuccess(true,tableid,buttonid);
              	  //	var element = document.getElementById('returnaddress');
	              //	element.value = ls_returnValue;
	              //	element.onclick(null);
              	  
              },
              scope:this

          });

    	  
        var actions = [new GeoExt.Action({
            tooltip: "Adresi Seç",
            menuText: "Adresi Seç",
            iconCls: "gxp-icon-flexcityadresal",
            enableToggle: true,
            control: new OpenLayers.Control.Click(),
            map: this.target.mapPanel.map,
            toggleGroup: this.toggleGroup,
            scope: this,
            handler: function(evt)
            {
            	this.dataLayers =  this.getLayers();
            }
        })];
            	
        return actions = gxp.plugins.FlexCityAdresAl.superclass.addActions.call(this, actions);
    },
    getLayers: function()
    { 
    		var layers = {};
	        var ds = this.target.layerSources.local.store.data.items;
	        Ext.each(ds, function(layer){
	        	
	              var keywords = layer.data.keywords;
	              Ext.each(keywords, function(keyword){
	                    switch(keyword)
	                    {
	                         case "ilce":
	                               layers.ilce = layer;
	                               break;
	                         case "mahalle":
	                               layers.mahalle = layer;
	                               break;
	                         case "sokak":
	                               layers.sokak = layer;
	                               break;
	                         case "kapi":
	                               layers.kapi = layer;
	                               break;
	                         case "bina":
	                        	   layers.bina = layer;
	                               break;
	                               
	                    }
	              });
	        }); 
	        
	        return layers;
    },
    uniWaiting: function(msecs)
    {
    	var start = new Date().getTime();
    	var cur = start
    	while(cur - start < msecs)
    	{
    	cur = new Date().getTime();
    	} 
    },
	queryWFSLayer: function(ao_layer_url,value)
	{

		var gmlFormattter = new OpenLayers.Format.GML.v3();
		var filter_1_0 = new OpenLayers.Format.Filter({version: "1.1.0"});
		var xmlFormatter = new OpenLayers.Format.XML();

		var ogcFilter = new OpenLayers.Filter.Spatial({
			type: OpenLayers.Filter.Spatial.INTERSECTS,
			property: "geometri",
			value: value
			//projection: "urn:x-ogc:def:crs:EPSG:4326"
		});

		Ext.getBody().mask("Lütfen bekleyiniz.", 'loading');
		var lo_request = OpenLayers.Request.GET({
			url: ao_layer_url +"&FILTER=" +  encodeURIComponent(xmlFormatter.write(filter_1_0.write(ogcFilter))),
			timeout:5000,
			async: false
		});
		Ext.getBody().unmask();

		var features = gmlFormattter.read(lo_request.responseText);

		return features;
	},
    queryOnLayer: function(ao_layer,as_properties,as_cqlFilter)//return request.responseText 
    {
    	var layerTemp = ao_layer.data.layer;
    	var ls_wfsURL = layerTemp.url.replace(/wms/gi,"wfs");
    	var jsonFormatter =  new OpenLayers.Format.GeoJSON(); 
    	
    	Ext.getBody().mask("Lütfen bekleyiniz.", 'loading');
        //this.busyMask.show();
    	//this.uniWaiting(3000);

		var lo_request = OpenLayers.Request.GET({
		    url: ls_wfsURL,
		    params: {	
		    	"version" : "1.0.0",//layerTemp.params.VERSION,
		    	"request" : "GetFeature",
		    	"srs" : "EPSG:900915",
		    	"outputFormat" : "json",
		    	"maxfeatures" : "1",
		    	"typename" : layerTemp.params.LAYERS,
		    	"propertyName" : as_properties,
		    	"cql_filter" : as_cqlFilter
		    	},
		    timeout:5000,
		    async: false
		});
		Ext.getBody().unmask();
		//this.busyMask.hide();
		return jsonFormatter.read(lo_request.responseText);
    				
    }
		
});

Ext.preg(gxp.plugins.FlexCityAdresAl.prototype.ptype, gxp.plugins.FlexCityAdresAl);
