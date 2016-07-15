Ext.namespace("gxp.plugins");

gxp.plugins.KocaeliGisSorgu = Ext.extend(gxp.plugins.Tool, {

	ptype: "gxp_kocaeligissorgu",
	outputTarget: "map",
	popupTitle: "Mahalle/Sokak Sorgusu",
	tooltip: "Mahalle/Sokak Sorgusu",
	menuText: "Mahalle/Sokak Sorgusu",
	featureLayer:null,
	style: null,
	EnumAdres:null,
	enumAdresDeger:null,
	cbx_ilce:null,
	cbx_mahalle:null,
	cbx_sokak:null,
	cbx_kapi:null,
	cbx_koy:null,
	constructor: function(config) {
		gxp.plugins.KocaeliGisSorgu.superclass.constructor.apply(this, arguments);
	},
	init: function(target) {
		gxp.plugins.KocaeliGisSorgu.superclass.init.apply(this, arguments);

		this.EnumAdres = {
			ILCE : 0,
			MAHALLE : 1,
			SOKAK : 2,
			KAPI:3,
			KOY:4
		}
		this.enumAdresDeger=this.EnumAdres.MAHALLE;



		this.style = {
			"all": new OpenLayers.Style(null, {
				rules: [new OpenLayers.Rule({
					symbolizer: this.initialConfig.symbolizer || {
						"Point": {
							pointRadius: 4,
							graphicName: "square",
							fillColor: "white",
							fillOpacity: 1,
							strokeWidth: 1,
							strokeOpacity: 1,
							strokeColor: "#333333"
						},
						"Line": {
							strokeWidth: 4,
							strokeOpacity: 1,
							strokeColor: "#ff9933"
						},
						"Polygon": {
							strokeWidth: 2,
							strokeOpacity: 1,
							strokeColor: "#ff6633",
							fillColor: "white",
							fillOpacity: 0.3
						}
					}
				})]
			}),
			"selected": new OpenLayers.Style(null, {
				rules: [new OpenLayers.Rule({symbolizer: {display: "none"}})]
			})
		};


		this.featureLayer = new OpenLayers.Layer.Vector(this.id, {
			displayInLayerSwitcher: false,
			visibility: true,
			projection: new OpenLayers.Projection("EPSG:4326"),//"EPSG:900915"),
			displayProjection: new OpenLayers.Projection("EPSG:102113"),//"EPSG:900913"),
			reproject:true,
			styleMap: new OpenLayers.StyleMap({
				"vertex": OpenLayers.Util.extend({display: ""},
					OpenLayers.Feature.Vector.style["select"]),
				"select": this.style["all"]
			}, {extendDefault: false})
		});


		this.target.on({
			ready: function() {
				this.target.mapPanel.map.addLayer(this.featureLayer);
			},
			scope: this
		});
		this.on({
			beforedestroy: function() {
				this.target.mapPanel.map.removeLayer(this.featureLayer);
			},
			scope: this
		});

		this.target.mapPanel.on({
			aftermapmove: function() {
				try {

					var li_zoomLevel = this.target.mapPanel.map.getZoom();

					//google için kontrol konulmuştu kaldırıldı.Extent dışına çıkması engellenmişti
					// if(  li_zoomLevel < 1 )//&& this.target.mapPanel.map.baseLayer.CLASS_NAME == "OpenLayers.Layer.WMS" )
					//	 this.target.mapPanel.map.zoomTo(1);

					var lo_Extent = this.target.mapPanel.map.getExtent().clone().transform(new OpenLayers.Projection(this.target.mapPanel.map.projection),new OpenLayers.Projection("EPSG:900915"));
					if(this.target.mapintializedcomplete)
						this.target.setCookieValue("extent",this.target.mapPanel.map.getExtent().toString());

					if(window.parent!=null)
						window.parent.OverviewExtent(lo_Extent.toString());

				}
				catch (err) {
					//console.log("Overview Penceresi yok.");
					// TODO: improve destroy
				}
			},
			scope: this
		});


		Ext.Ajax.on(
			"CallzoomToFeature",
			function(ao_layerName,as_cqlQuery){
				console.log("CallzoomToFeature: layerName=" + ao_layerName + " CQL_FILTER=" + as_cqlQuery );
				var lo_layer = this.getLayer(ao_layerName);
				if(lo_layer!=null)
					this.queryLayer(lo_layer, as_cqlQuery,"",true);
				else
					alert("Katman bulunamadı.");
			},
			this
		);
		Ext.Ajax.on(
			"QueryObjectID",
			function(ao_layerName,as_objectIDs){
				console.log("QueryObjectID: layerName=" + ao_layerName + " ObjectIDs=" + as_objectIDs );
				var lo_layer = this.getLayer(ao_layerName);
				if(lo_layer!=null)
				{
					var ls_featureIdsQuery = this.getQueryObjectIDs(lo_layer.data.name,as_objectIDs); //featureid filter olusturuluyor. (, ile ayrılmıs objectidler geliyor.)
					this.queryLayer(lo_layer, ls_featureIdsQuery,"",false);
				}
				else
					alert("Katman bulunamadı.");
			},
			this
		);
		Ext.Ajax.on(
			"MapExtent",
			function(extent){
				//console.log("MapExtent:" + extent);
				var lo_extent = new OpenLayers.Bounds.fromString(extent,this.target.mapPanel.map.projection);
				lo_extent.transform(new OpenLayers.Projection("EPSG:900915"),new OpenLayers.Projection(this.target.mapPanel.map.projection));
				this.target.mapPanel.map.zoomToExtent(lo_extent,true);
			},
			this
		);


	},
	addActions: function() {

		var actions = [new GeoExt.Action({
			tooltip: "Adres Sorgula",
			menuText: "Adres Sorgula",
			iconCls: "gxp-icon-find",
			enableToggle: false,
			pressed: false,
			allowDepress: false,
			layers:null,
			handler: function(evt)
			{
				this.enumAdresDeger = this.EnumAdres.ILCE;//default value
				//this.layers = this.getLayers();
				this.cbx_ilce  = this.createCbx("İlce",new Ext.data.ArrayStore({id: 0,fields: ['ad','kod'], data: [['İlçe Seçiniz.', '-']]}));
				this.cbx_mahalle  = this.createCbx("Mahalle",new Ext.data.ArrayStore({id: 0,fields: ['ad','kod'], data: [['Mahalle Seçiniz.', '-']]}));
				this.cbx_sokak  = this.createCbx("Sokak",new Ext.data.ArrayStore({id: 0,fields: ['ad','kod'], data: [['Sokak Seçiniz.', '-']]}));
				this.cbx_kapi  = this.createCbx("Kapi",new Ext.data.ArrayStore({id: 0,fields: ['ad','kod'], data: [['Kapı Seçiniz.', '-']]}));

				this.serviceUrl = "http://10.1.1.145:8080/geoserver/UNIVERSAL/ows?service=WFS";
				this.maksServiceUrl = "https://maksu:maksp@kpsv2.nvi.gov.tr/Services/WFSService/?SERVICE=WFS&VERSION=1.1.0&request=GetFeature";
				var featuresIlce = this.queryWFSLayerComboBox(this.serviceUrl + "&" + "typeName=UNIVERSAL:cbxilce","propertyName=ID,ADI,KOD,UST_ID&CQL_FILTER=1=1");
				this.getAddress_result(featuresIlce);

				this.cbx_ilce.on('select', function(box, record, index) {
					if(index>0){
						this.enumAdresDeger=this.EnumAdres.MAHALLE;
						var featuresMahalleler = this.queryWFSLayerComboBox(this.serviceUrl+ "&" + "typeName=UNIVERSAL:cbxmahalle","propertyName=ID,ADI,KOD,UST_ID"+"&CQL_FILTER=UST_ID="+this.cbx_ilce.getValue().attributes["ID"] );//	INTERSECTS(geometryetry," + this.cbx_mahalle.getValue().geometry.components[0]+ ")");
						this.getAddress_result(featuresMahalleler);
						//this.queryWFSLayer(this.maksServiceUrl + "&TYPENAME=maks:Ilce",this.cbx_ilce.getValue().attributes["KOD"],"kimlikNo");
					}},this);

				this.cbx_mahalle.on('select', function(box, record, index) {
					if(index>0){
						this.enumAdresDeger=this.EnumAdres.SOKAK;
						var featuresSokakCbx = this.queryWFSLayerComboBox(this.serviceUrl + "&" + "typeName=UNIVERSAL:cbxsokak","propertyName=ID,ADI,KOD,UST_ID"+"&CQL_FILTER=UST_ID="+this.cbx_mahalle.getValue().attributes["ID"]);
						this.getAddress_result(featuresSokakCbx);
						this.queryWFSLayer(this.maksServiceUrl + "&TYPENAME=maks:Mahalle",this.cbx_mahalle.getValue().attributes["KOD"],"kimlikNo");
					}},this);

				this.cbx_sokak.on('select', function(box, record, index) {
					if(index>0){

						this.enumAdresDeger=this.EnumAdres.KAPI;
						var featuresKapiCbx = this.queryWFSLayerComboBox(this.serviceUrl+ "&" + "typeName=UNIVERSAL:cbxkapi","propertyName=ID,ADI,KOD,UST_ID,YAPIKIMLIKNO,BINAADI,BINAACIKLAMA,KATSAYISI"+"&viewparams=UST_ID:"+this.cbx_sokak.getValue().attributes["ID"] );
						this.getAddress_result(featuresKapiCbx);

						this.queryWFSLayer(this.maksServiceUrl  + "&TYPENAME=maks:YolOrtaHat",this.cbx_sokak.getValue().attributes["ADI"],"ad");

					}},this);
				this.cbx_kapi.on('select', function(box, record, index) {
					if(index>0){
						this.queryWFSLayer(this.maksServiceUrl  + "&TYPENAME=maks:Yapi",this.cbx_kapi.getValue().attributes["YAPIKIMLIKNO"],"kimlikNo");
					}},this);
				this.createForm([this.cbx_ilce,this.cbx_mahalle,this.cbx_sokak,this.cbx_kapi]);
				//this.createForm([this.cbx_ilce,this.cbx_mahalle,this.cbx_sokak]);
			},
			mapPanel: this.target.mapPanel,scope:this})];

		return actions = gxp.plugins.KocaeliGisSorgu.superclass.addActions.call(this, actions);
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
					case "cbxilce":
						layers.ilce = layer;
						break;
					case "cbxmahalle":
						layers.mahalle = layer;
						break;
					case "cbxsokak":
						layers.sokak = layer;
						break;
					case "cbxkapi":
						layers.kapi = layer;
						break;
					case "koy":
						layers.koy  = layer;
						break;

				}
			});
		});

		return layers;
	},
	getLayer: function(layername)
	{
		var ds = this.target.layerSources.local.store.data.items;

		for(var i=0;i<ds.length;i++)
		{
			var keywords = ds[i].data.keywords;
			for(var j=0;j<keywords.length;j++)
			{
				if(keywords[j] == layername)
					return ds[i];

			}

		}

		return null;
	},
	getQueryObjectIDs: function(as_layerName,as_queryObjectIDs)
	{
		var lo_tempArray = as_layerName.split(":");
		var ls_layerNameWOWorkspaceName = "";
		var ls_fidQuery = "featureid=";
		if(lo_tempArray.length>1)
		{
			ls_layerNameWOWorkspaceName = lo_tempArray[1];
			var lo_tempArrayFID = as_queryObjectIDs.split(",");
			for(var i=0;i<lo_tempArrayFID.length;i++)
			{
				ls_fidQuery += ls_layerNameWOWorkspaceName +"."+ lo_tempArrayFID[i];
				if(i!=lo_tempArrayFID.length-1)
					ls_fidQuery += ",";
			}

		}
		return ls_fidQuery;
	},
	createForm: function(ao_controlItems)
	{
		var selectRegionWin = new Ext.Window({
			title: "Adres Sorgusu",
			layout: "fit",
			height: 170,
			width: 280,
			x:350,y:50,
			items: [
				{
					xtype: "form",
					bodyStyle: "padding: 5px;",
					labelWidth: 40,
					items: ao_controlItems
				}],
			modal: false
		});
		selectRegionWin.on('close', function() { //form kapatildiginda secili nesnelerin temizlenmesi.
			this.featureLayer.removeAllFeatures();

		},this);
		selectRegionWin.show();

	},
	createCbx: function(as_labelField,ao_store)
	{

		var cbxCombobox = new Ext.form.ComboBox({
			typeAhead: true,
			triggerAction: 'all',
			lazyRender:true,
			editable: false,
			allowBlank: false,
			forceSelection: true,
			width: 200,
			mode: 'local',
			fieldLabel: as_labelField,
			store: ao_store,
			valueField: 'kod',
			displayField: 'ad',
			sorters: {
				property: 'ad',
				direction: 'DESC'
			}
		});
		cbxCombobox.setValue("-");
		cbxCombobox.store.sort('ad', 'DESC');
//		  cbxCombobox.store.sort({
//            property: 'ad',
//            direction: 'DESC'
//			  });
		return cbxCombobox;
	},
	getFCollectionMaxExtent: function(ao_featureColl)
	{
		var ld_buttom = 0;
		var ld_left = 0;
		var ld_top = 0;
		var ld_right = 0;

		for(var i=0;i<ao_featureColl.length;i++)
		{
			var lo_featureExtent = ao_featureColl[i].geometry.getBounds();

			if(ld_buttom==0 ||lo_featureExtent.bottom<ld_buttom)
				ld_buttom = lo_featureExtent.bottom;

			if(ld_left==0 || lo_featureExtent.left<ld_left)
				ld_left = lo_featureExtent.left;

			if(ld_top==0 || lo_featureExtent.top>ld_top)
				ld_top = lo_featureExtent.top;
			if(ld_right==0 || lo_featureExtent.right>ld_right)
				ld_right = lo_featureExtent.right;
		}
		return new OpenLayers.Bounds(ld_left,ld_buttom ,ld_right ,ld_top);
	},
	queryWFSLayer: function(ao_layer_url,value,filterProperty)
	{

		var gmlFormattter = new OpenLayers.Format.GML.v3();
		var filter_1_0 = new OpenLayers.Format.Filter({version: "1.0.0"});
		var xmlFormatter = new OpenLayers.Format.XML();
		var ogcFilter = new OpenLayers.Filter.Comparison({
			type: OpenLayers.Filter.Comparison.EQUAL_TO,
			property: filterProperty,
			value: value
		});

		Ext.getBody().mask("Lütfen bekleyiniz.", 'loading');
		var lo_request = OpenLayers.Request.GET({
			url: ao_layer_url +"&FILTER=" +  encodeURIComponent(xmlFormatter.write(filter_1_0.write(ogcFilter))),
			timeout:5000,
			async: false
		});
		Ext.getBody().unmask();

		this.target.mapPanel.map.raiseLayer(this.featureLayer, this.target.mapPanel.map.layers.length); // topmostlayer (selectionlayer)
		this.featureLayer.removeAllFeatures();
		var features = gmlFormattter.read(lo_request.responseText);

		if(features.length>0){
			for(var i=0;i<features.length;i++) {
				if (i == 0) {
					var transformedGeometry = features[i].geometry.transform(new OpenLayers.Projection("EPSG:4326"), new OpenLayers.Projection("EPSG:102113"));
					transformedGeometry.calculateBounds();
					this.featureLayer.addFeatures(features[i]);
				}
			}
			this.target.mapPanel.map.zoomToExtent(this.getFCollectionMaxExtent(this.featureLayer.features),true);//lo_feature.geometry.getBounds(), true);
		}

	},
	queryWFSLayerComboBox: function(ao_layer_url,as_cqlFilter)
	{
		var ls_wfsURL = ao_layer_url + "&VERSION=1.0.0"
			+ "&REQUEST=" + "GetFeature"
			+"&srsName=" + this.target.mapPanel.map.projection //coordinates system for transformation
			+ "&outputFormat=gml3"
			+ "&" + as_cqlFilter;

		//+ "&CQL_FILTER=" + as_cqlFilter;

		Ext.getBody().mask("Lütfen bekleyiniz.", 'loading');
		var lo_request = OpenLayers.Request.GET({
			url: ls_wfsURL,
			timeout:5000,
			async: false
		});
		Ext.getBody().unmask();

		var gmlFormattter = new OpenLayers.Format.GML.v3();
		//var jsonFormatter =  new OpenLayers.Format.GeoJSON();

		return gmlFormattter.read(lo_request.responseText);

	},
	queryLayer: function(ao_layer,as_Filter,propertyName,isCqlFilter)
	{
		if(isCqlFilter)
			this.queryWFSLayer(ao_layer,propertyName+"&CQL_FILTER=" + as_Filter);
		else
			this.queryWFSLayer(ao_layer,as_Filter);

	},
	getAddressDataset: function(serviceUrl) {
		Ext.getBody().mask("Lütfen bekleyiniz.", 'loading');
		var requestGetAddress = OpenLayers.Request.GET({
			url: serviceUrl,
			async: true,
			success:this.getAddress_result,
			failure:this.getAddress_fault,
			scope:this

		});
	},
	clearCbx:function(cbx,selectedValue)
	{
		var tempDataSet = new Ext.data.ArrayStore({
			id: 0,
			fields: ['ad','kod']
		});
		tempDataSet.add(new Ext.data.Record({"ad":selectedValue,"kod":"-"}));
		cbx.bindStore(tempDataSet);
		return tempDataSet;
	},
	getAddress_result:function(resultValue)
	{
		Ext.getBody().unmask();
		var addressDataSet = new Ext.data.ArrayStore({
			id: 0,
			fields: ['ad','kod']
		});

		addressDataSet.add(new Ext.data.Record({"ad":"Mahalle","kod":"-"}));





		switch (this.enumAdresDeger)
		{
			case this.EnumAdres.ILCE:

				Ext.each(resultValue, function(bilgi){
					addressDataSet.add(new Ext.data.Record({'ad':bilgi.attributes["ADI"],'kod':bilgi}));
				});

				if(addressDataSet.data.items.length>0)
					addressDataSet.data.items[0].data.ad = " İlçe Seçiniz";



				this.cbx_ilce.bindStore(addressDataSet);
				this.cbx_ilce.setValue("-");
				this.clearCbx(this.cbx_mahalle, " Mahalle Seçiniz");
				this.clearCbx(this.cbx_sokak, " Sokak Seçiniz");
				//this.clearCbx(this.cbx_kapi, " Kapı Seçiniz");
				this.cbx_mahalle.setValue("-");
				this.cbx_sokak.setValue("-");
				//this.cbx_kapi.setValue("-");

				break;
			case this.EnumAdres.MAHALLE:

				Ext.each(resultValue, function(bilgi){
					addressDataSet.add(new Ext.data.Record({'ad':bilgi.attributes["ADI"],'kod':bilgi}));
				});

				if(addressDataSet.data.items.length>0)
					addressDataSet.data.items[0].data.ad = " Mahalle Seçiniz";
				this.cbx_mahalle.bindStore(addressDataSet);
				this.cbx_mahalle.setValue("-");

				this.clearCbx(this.cbx_sokak, " Sokak Seçiniz");
				this.clearCbx(this.cbx_kapi, " Kapı Seçiniz");
				this.cbx_sokak.setValue("-");
				this.cbx_kapi.setValue("-");
				break;
			case this.EnumAdres.SOKAK:
				var sokakTekrarKontrol;
				Ext.each(resultValue, function(bilgi){
					if(sokakTekrarKontrol!=bilgi.attributes["ADI"])
					{
						addressDataSet.add(new Ext.data.Record({'ad':bilgi.attributes["ADI"],'kod':bilgi}));
						sokakTekrarKontrol = bilgi.attributes["ADI"];

					}
				});

				if(addressDataSet.data.items.length>0)
					addressDataSet.data.items[0].data.ad = " Mahalle Seçiniz";
				addressDataSet.data.items[0].data.ad = " Sokak Seçiniz";
				this.cbx_sokak.setValue("-");
				this.cbx_sokak.bindStore(addressDataSet);
				this.cbx_sokak.store.sort('ad', 'ASC');
				this.clearCbx(this.cbx_kapi, " Kapı Seçiniz");
				this.cbx_kapi.setValue("-");
				break;
			case this.EnumAdres.KAPI:
				Ext.each(resultValue, function(bilgi){
					addressDataSet.add(new Ext.data.Record({'ad':bilgi.attributes["ADI"],'kod':bilgi}));
				});
				if(addressDataSet.data.items.length>0)
					addressDataSet.data.items[0].data.ad = " Mahalle Seçiniz";
				addressDataSet.data.items[0].data.ad = " Kapı Seçiniz";
				this.cbx_kapi.setValue("-");
				this.cbx_kapi.bindStore(addressDataSet);
				this.cbx_kapi.store.sort('ad', 'ASC');
				break;
		}
		addressDataSet.sort('ad', 'ASC');



	},
	getAddress_fault:function(event)
	{
		Ext.getBody().unmask();
		alert("Hata oluştu.");
	},
	getUyduTileLayerServiceUrl:function(bounds) {
		var tileOrigin = new OpenLayers.LonLat(-5123200, 10002100);
		var res = this.map.getResolution();
		var centerLonLat = bounds.getCenterLonLat();
		var column = Math.floor((centerLonLat.lon - tileOrigin.lon) / (res * 256));
		var row = Math.floor((tileOrigin.lat - centerLonLat.lat) / (res * 256));
		var z = this.map.getZoom();

		var columnValue = "00000000" + column.toString(16);
		columnValue = columnValue.substring(columnValue.length - 8, columnValue.length);
		var rowValue = "00000000" + row.toString(16);
		rowValue = rowValue.substring(rowValue.length - 8, rowValue.length);

		var tilePath = "L0" + z + "/R" + rowValue + "/C" + columnValue;
		var requestURL = this.url + tilePath;
		//console.log(requestURL);
		return requestURL;
	}
//	getUyduTileLayerServiceUrl:function(bounds) {
//		var mapProjCode = this.map.projection;
//		var transbounds  = bounds.clone();//.transform(new OpenLayers.Projection(mapProjCode),new OpenLayers.Projection("PROJCS[\"TMSUDAN\",GEOGCS[\"GCS_WGS_1984\",DATUM[\"D_WGS_1984\",SPHEROID[\"WGS_1984\",6378137.0,298.257223563]],PRIMEM[\"Greenwich\",0.0],UNIT[\"Degree\",0.0174532925199433]],PROJECTION[\"Transverse_Mercator\"],PARAMETER[\"false_easting\",500000.0],PARAMETER[\"false_northing\",0.0],PARAMETER[\"central_meridian\",30.0],PARAMETER[\"scale_factor\",1.0],PARAMETER[\"latitude_of_origin\",0.0],UNIT[\"Meter\",1.0]]"));
//		var transExtent  = this.map.getMaxExtent().clone();//.transform(new OpenLayers.Projection(mapProjCode),new OpenLayers.Projection("PROJCS[\"TMSUDAN\",GEOGCS[\"GCS_WGS_1984\",DATUM[\"D_WGS_1984\",SPHEROID[\"WGS_1984\",6378137.0,298.257223563]],PRIMEM[\"Greenwich\",0.0],UNIT[\"Degree\",0.0174532925199433]],PROJECTION[\"Transverse_Mercator\"],PARAMETER[\"false_easting\",500000.0],PARAMETER[\"false_northing\",0.0],PARAMETER[\"central_meridian\",30.0],PARAMETER[\"scale_factor\",1.0],PARAMETER[\"latitude_of_origin\",0.0],UNIT[\"Meter\",1.0]]"));
//        var res = this.map.getResolution();
//        //111.9999841264659, 56.00014022076714, 28.00007011038352, 14.00003505519176, 7.000165688657728, 4.200040148351785, 1.400210957351069, 0.7001054786755356, 0.2802795153612903, 0.1401397576806451
//        var z = this.map.getZoom();
////		switch (this.map.getZoom())
////		{
////			case 20:
////				res=0.1401397576806451;
////				z = 10;
////				break;
////			case 19:
////				res=0.2802795153612903;
////				z=9;
////				break;
////			case 18:
////				res=0.7001054786755356;
////				z=8;
////				break;
////			case 17:
////				res=1.400210957351069;
////				z=7;
////				break;
////			case 16:
////				res=4.200040148351785;
////				z=6;
////				break;
////			case 15:
////				res=111.9999841264659;
////				z=5;
////			case 14:
////				res=7.000165688657728;
////				z=4;
////			case 13:
////				res=14.00003505519176;
////				z=3;
////			case 12:
////				res=28.00007011038352;
////				z=2;
////			case 11:
////				res=56.00014022076714;
////				z=1;
////				break;
////			case 10:
////				res=111.9999841264659;
////				z=0;
////				break;
////
////		}
//
//        var x = Math.round((transbounds.left - transExtent.left) / (res * 256));
//        var y = Math.round((transExtent.top - transbounds.top) / (res * 256));
//
//
//        var xValue = "00000000" + y.toString(16);
//        var xValue = xValue.substring(xValue.length - 8, xValue.length);
//        var yValue = "00000000" + x.toString(16);
//        yValue = yValue.substring(yValue.length - 8, yValue.length);
//
//        var tilePath = "/L0" + z + "/R" + yValue + "/C" + xValue;
//        var requestURL = "http://tileservices.kocaeli.bel.tr/uydu/2013" + tilePath;
//        console.log(requestURL);
//        return requestURL;
//    }



});

Ext.preg(gxp.plugins.KocaeliGisSorgu.prototype.ptype, gxp.plugins.KocaeliGisSorgu);