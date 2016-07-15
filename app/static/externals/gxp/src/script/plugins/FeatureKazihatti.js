Ext.namespace("gxp.plugins");

gxp.plugins.Featurekazihatti = Ext.extend(gxp.plugins.Tool, {

	ptype: "gxp_featurekazihatti",
	outputTarget: "map",
	popupCache: null,
	wfsURL: null,
	wfsLayers:"GIS:Mahalle,GIS:YolOrtaHat,GIS:Yapi,GIS:Numarataj,GIS:KaziHatlari",
	kaziActionTip: "Kazi hattı oluştur",
	popupTitle: "Kazi hattı oluştur",
	tooltip: "Kazi hattı oluştur",
	saveStrategy:null,
	snap:null,
	layers: {},
	queue : 0,
	queuedFeatures: [],
	vectorLayer : null,
	printService: null,
	aykomeGridId:-1,
	aykomeGridButtonid:-1,
	constructor: function(config) {
		gxp.plugins.Featurekazihatti.superclass.constructor.apply(this, arguments);
	},

	init: function(target) {
		gxp.plugins.Featurekazihatti.superclass.init.apply(this, arguments);
		this.toolsShowingLayer = {};
		this.target.on({
			ready: function() {
				this.target.mapPanel.map.addControl(this.snap);
				this.snap.activate();
				this.target.mapPanel.map.addLayer(this.vectorLayer);
			},
			scope: this
		});
		Ext.Ajax.on(
			"nextFeature",
			function(){
				if (this.queue < this.queuedFeatures.length)
				{
					this.selectRegion(this.queuedFeatures[this.queue]);
				}
				{
					this.queuedFeatures = [];
					this.queue = 0;
				}
			},
			this
		);
		Ext.Ajax.on(
			"deleteFeature",//kazihatti katmanindan belirtilen nesneleri siler.
			function(fid,tableid,buttonid){
				//console.log("deleteFeature: fid=" + fid);
				var lo_layer = this.getLayer("kazihatti");
				if(lo_layer!=null)
				{
					this.aykomeGridId = tableid;
					this.aykomeGridButtonid = buttonid;
					//this.createObjectID(lo_layer.data.name,fid) == this.vectorLayer.features[1].fid
					var vectorFeature = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.MultiLineString(null));
					vectorFeature.fid = this.createObjectID(lo_layer.data.name,fid);
					vectorFeature.state = OpenLayers.State.DELETE;
					this.vectorLayer.addFeatures(vectorFeature);
					this.saveStrategy.save();
				}
				else
					alert("Katman bulunamadı.");
			},
			this
		);

		Ext.Ajax.on(
			"refreshFLayer",
			function(layername){
				var lo_layer = this.getLayer(layername);
				if(lo_layer!=null)
				{
					//lo_layer.
					var layers = this.target.mapPanel.map.layers;
					for(var i=0;i<layers.length;i++)
					{
						var ls_tempLayerName = layers[i].name;
						if(lo_layer.data.layer.name == ls_tempLayerName)
							layers[i].redraw(true);

					}

				}
			},
			this
		);

		Ext.Ajax.on('beforerequest',function(){Ext.getBody().mask("Lütfen bekleyiniz.", 'loading') }, Ext.getBody());
		Ext.Ajax.on('requestcomplete',Ext.getBody().unmask ,Ext.getBody());
		Ext.Ajax.on('requestexception', Ext.getBody().unmask , Ext.getBody());

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
	createObjectID: function(as_layerName,as_queryObjectIDs)
	{
		var lo_tempArray = as_layerName.split(":");
		var ls_layerNameWOWorkspaceName = "";
		var ls_fidQuery = "";//"featureid=";
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
	selectRegion: function(feature)
	{
		var mapProjCode = this.target.mapPanel.map.projection;
		var wfsURL = this.wfsURL;
		var request;
		var jsonFormatter =  new OpenLayers.Format.GeoJSON();
		var mahSokStore = new Ext.data.ArrayStore({
			id: 0,
			fields: ['YOL_ID','YOL_ISMI','YOL_KAPLAMA_CINSI','MAH_ID','MAH_ADI','ILCE_ID','ILCE_ADI','MAH_SOK']
		});

		this.maksServiceUrl = "https://maksu:maksp@kpsv2.nvi.gov.tr/Services/WFSService/?SERVICE=WFS&VERSION=1.1.0&request=GetFeature";

		var geometry = feature.geometry.clone().components[0].transform(new OpenLayers.Projection("EPSG:102113"),new OpenLayers.Projection("EPSG:4326"));

		var sokaklar = this.queryWFSLayer(this.maksServiceUrl + "&TYPENAME=maks:YolOrtaHat",geometry);

		//var ilce = this.queryWFSLayer(this.maksServiceUrl + "&TYPENAME=maks:ilce",geometry);

		Ext.each(sokaklar, function(sokak)
		{
			if (mahSokStore.find("ad",sokak.attributes["ad"])==-1)
			{
				//mahSokStore.add(new Ext.data.Record({'YOL_ID': sokak.attributes["kimlikNo"], 'YOL_ISMI':sokak.attributes["ad"], 'YOL_KAPLAMA_CINSI': ""}));

				var sokakGeometry = sokak.geometry.components[0].simplify();

				var mahalleler = this.queryWFSLayer(this.maksServiceUrl + "&TYPENAME=maks:Mahalle",sokakGeometry)

				Ext.each(mahalleler,function(mah)
				{

					var item = new Ext.data.Record({'YOL_ID': sokak.attributes["kimlikNo"], 'YOL_ISMI':sokak.attributes["ad"]});//, 'YOL_KAPLAMA_CINSI': ""})
					item.data["MAH_ID"] = mah.attributes["kimlikNo"];
					item.data["MAH_ADI"] = mah.attributes["ad"];
					//item.data["ILCE_ID"] = ilce.attributes["kimlikNo"];
					//item.data["ILCE_ADI"] = ilce.attributes["kimlikNo"];
					item.data["MAH_SOK"] = mah.attributes["ad"]+" : "+item.data["YOL_ISMI"];
					mahSokStore.add(item);

				});

				if(mahSokStore.getCount() == 0 )
				{
					var item = new Ext.data.Record({'YOL_ID': sokak.attributes["YOL_ID"], 'YOL_ISMI':sokak.attributes["YOL_ISMI"], 'YOL_KAPLAMA_CINSI': sokak.attributes["KAPLAMA_CINSI"]})
					mahSokStore.add(item);
				}

			}
		},this);
		if (mahSokStore.getCount() > 1)
		{
			var cbxRegion = new Ext.form.ComboBox({
				typeAhead: true,
				triggerAction: 'all',
				lazyRender:true,
				editable: false,
				allowBlank: false,
				forceSelection: true,
				width: 200,
				mode: 'local',
				fieldLabel: "Sokak",
				store: mahSokStore,
				valueField: 'YOL_ID',
				displayField: 'MAH_SOK'
			});
			var selectRegionWin = new Ext.Window({
				title: "Mahalle / Sokak Seçin",
				layout: "fit",
				height: 100,
				width: 280,
				modal: true,
				items: [
					{
						xtype: "form",
						bodyStyle: "padding: 5px;",
						labelWidth: 40,
						items: [cbxRegion]
					}],
				buttons: [{
					text: "Tamam",
					formBind: true,
					handler: function(){
						var item = mahSokStore.getAt(mahSokStore.find("YOL_ID",cbxRegion.getValue()));
						for (r in item.data)
						{
							if (r!='MAH_SOK')
							{
								feature.attributes[r] = item.data[r];
								if(r=='YOL_ISMI' && item.data[r] ==null)
									this.getSokakNewValueForm(feature);
							}

						}
						selectRegionWin.hide();
					},
					scope: this
				}]
			});
			selectRegionWin.show();
		}else if(mahSokStore.getCount() == 1)
		{
			var item = mahSokStore.getAt(0);
			for (r in item.data)
			{
				if (r!='MAH_SOK')
				{
					feature.attributes[r] = item.data[r];
					if(r=='YOL_ISMI' && item.data[r] ==null)
						this.getSokakNewValueForm(feature);

				}
			}
		}
		else
		{
			Ext.Msg.show({
				title:'Mahalle / Sokak Bilgisi Bulunamadı',
				msg: 'Son çizilen kazı hattı için mahalle / sokak bilgisi bulunamadı.\nÇizilen nesne geri alınsınmı?',
				buttons: {ok: "Evet", cancel: "Hayır"},
				scope : this,
				fn: this.processResult,
				icon: Ext.MessageBox.INFO
			});
		}
		this.queue++;
		Ext.Ajax.fireEvent("nextFeature");
	},
	getSokakNewValueForm: function (sokakfeature){

		var sokakTextField = new Ext.form.TextField({

			fieldLabel: 'Sokak Adı',

			name: ''

		});

		var getSokakNewValueWin = new Ext.Window({
			title: "Yeni Sokak Adi",
			layout: "fit",
			height: 100,
			width: 280,
			modal: true,
			items: [
				{
					xtype: "form",
					bodyStyle: "padding: 5px;",
					labelWidth: 80,
					items: [sokakTextField]
				}],
			buttons: [{
				text: "Tamam",
				handler: function(){

					sokakfeature.attributes[r] = sokakTextField.getValue();
					getSokakNewValueWin.hide();
				},
				scope: this
			}]
		});
		getSokakNewValueWin.show();

	}
	,
	processResult : function (btn) {
		if(btn === 'ok' && this.vectorLayer.features.length>0)
			this.vectorLayer.removeFeatures([this.vectorLayer.features[this.vectorLayer.features.length-1]])
	},
	addActions: function() {
		var mapProjCode = this.target.mapPanel.map.projection;
		var wfsLayers = this.wfsLayers;
		this.saveStrategy = new OpenLayers.Strategy.Save();
		//this.saveStrategy.events.register('start', null, saveStart);
		//var kazihattitool =  this;
		this.saveStrategy.events.register('success',this , function(event) {

			var gisUrl="";
			var response = event.response;
			var insertids = response.insertIds;
			var fidsString = "";
			for(var i=0;i<insertids.length;i++)
			{

				Ext.each(this.saveStrategy.layer.features, function(feature)
				{

					if(feature.fid==insertids[i])
					{
						var li_dotIndex = feature.fid.lastIndexOf(".");

						gisUrl+=feature.fid.substr(li_dotIndex+1) + "|";

						gisUrl+=feature.attributes["ILCE_ID"]!=null?feature.attributes["ILCE_ID"]:0;
						gisUrl+= "|";
						gisUrl+=feature.attributes["ILCE_ADI"]!=null?feature.attributes["ILCE_ADI"]:"";
						gisUrl+= "|";
						gisUrl+=feature.attributes["MAH_ID"]!=null?feature.attributes["MAH_ID"]:0;
						gisUrl+= "|";
						gisUrl+=feature.attributes["MAH_ADI"]!=null?feature.attributes["MAH_ADI"]:"";
						gisUrl+= "|";
						gisUrl+=feature.attributes["YOL_ID"]!=null?feature.attributes["YOL_ID"]:0;
						gisUrl+= "|";
						gisUrl+=feature.attributes["YOL_ISMI"]!=null?feature.attributes["YOL_ISMI"]:"";
						gisUrl+= "|";
						gisUrl+=feature.attributes["YOL_KAPLAMA_CINSI"];
						gisUrl+= "|";
						var transGeom  = feature.geometry.clone().transform(new OpenLayers.Projection(mapProjCode),new OpenLayers.Projection("EPSG:40000"));
						gisUrl+= Math.round( transGeom.getLength()*100)/100;

						if(i!=insertids.length-1)
							gisUrl+= "#";
					}

				},this);

				if(i==insertids.length-1)
					fidsString  +="'" + insertids[i] + "'";
				else
					fidsString  +="'" +insertids[i] +"',";

			}

			if(gisUrl.length>0)
			{
				this.vectorLayer.removeAllFeatures();
				Ext.Ajax.fireEvent("refreshFLayer",'kazihatti');

				var mapExtent = this.saveStrategy.layer.map.getExtent();
				var ls_printUrl = "";
				ls_printUrl += this.saveStrategy.layer.protocol.url.replace(/wfs/gi,"wms") + "?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&SRS=" + mapProjCode;//+ "&format_options=layout:legendantep";
				ls_printUrl += "&BBOX=" + mapExtent.toString();
				ls_printUrl += "&FORMAT=image/png&EXCEPTIONS=application/vnd.ogc.se_inimage&LAYERS=" + wfsLayers;
				ls_printUrl += "&CQL_FILTER=1=1;1=1;1=1;1=1;IN%20(" + fidsString + ")";
				ls_printUrl += "&WIDTH="+this.saveStrategy.layer.map.size.w+ "&HEIGHT="+ this.saveStrategy.layer.map.size.h +"&TILED=true&TRANSPARENT=TRUE";
				console.log(gisUrl);
				console.log(ls_printUrl);

				try
				{
					window.parent.setGisData("returnAddress",gisUrl,ls_printUrl);	//mis event (datagrid adres doldurulan form)

				}
				catch(err)
				{
					alert("AdresGrid Bulunamadi");

				}
			}
			else if(this.aykomeGridId!=-1 && this.aykomeGridButtonid !=-1 )//delete işlemi aykome grid ve buttonidleri
			{

				this.vectorLayer.removeAllFeatures();
				Ext.Ajax.fireEvent("refreshFLayer",'Kazı Hatları');
				try
				{
					window.parent.deleteSuccess(true,this.aykomeGridId,this.aykomeGridButtonid);
				}
				catch(err)
				{
					alert("deleteSucces cağrılamadı");
				}

				this.aykomeGridId = -1;
				this.aykomeGridButtonid = -1;
			}
		});

		this.vectorLayer = new OpenLayers.Layer.Vector(this.id, {
			strategies: [this.saveStrategy],
			displayInLayerSwitcher: false,
			visibility: true,
			projection : new OpenLayers.Projection("EPSG:4326"),
			protocol : new OpenLayers.Protocol.WFS({
				version : "1.1.0",
				url : this.wfsURL,
				featureType : "KaziHatlari",
				featureNS : "GIS",
				geometryName : "SHAPE"
			})
		});
		this.snap = new OpenLayers.Control.Snapping({layer: this.vectorLayer});
		var drawControl = new OpenLayers.Control.DrawFeature(this.vectorLayer, OpenLayers.Handler.Path,
			{
				multi: true,
				scope: this,
				eventListeners: {
					featureadded: function(evt) {
						evt.object.scope.queuedFeatures.push(evt.feature);
						evt.object.scope.queue = 0;
						Ext.Ajax.fireEvent("nextFeature");
					}
				}
			});


		OpenLayers.Event.observe(document, "keydown", function(evt) {
			var handled = false;
			switch (evt.keyCode) {
				case 90: // z
					if (evt.metaKey || evt.ctrlKey) {
						drawControl.undo();
						handled = true;
					}
					break;
				case 89: // y
					if (evt.metaKey || evt.ctrlKey) {
						drawControl.redo();
						handled = true;
					}
					break;
				case 27: // esc
					drawControl.cancel();
					handled = true;
					break;
			}
			if (handled) {
				OpenLayers.Event.stop(evt);
			}
		});

		var actions = [
			new GeoExt.Action({
				tooltip: "Kazı Hattı Oluştur",
				menuText: "Kazı Hattı Oluştur",
				iconCls: "gxp-icon-addfeature",
				enableToggle: true,
				control: drawControl,
				map: this.target.mapPanel.map,
				toggleGroup: this.toggleGroup,
				scope: this
			}),
			new GeoExt.Action({
				tooltip: "Çizilen kazı hattını geri al",
				menuText: "Çizilen kazı hattını geri al",
				iconCls: "gxp-icon-featuregerial",
				handler: function(){
					if(this.vectorLayer.features.length>0)
						this.vectorLayer.removeFeatures([this.vectorLayer.features[this.vectorLayer.features.length-1]])
				},
				scope: this,
				map: this.target.mapPanel.map
			}),
			{
				tooltip: "İçeri Aktar",
				iconCls: "gxp-icon-addpackage",
				scope: this,
				handler: function(){
					drawControl.deactivate();
					var frmUpload = new Ext.form.FormPanel(
						{
							bodyStyle: "padding: 5px;",
							labelWidth: 40,
							fileUpload : true,
							items:
								[
									{
										name: "domain",
										value: document.domain,
										xtype: 'hidden'
									},
									{
										xtype: "label",
										html:  "DXF/DWF uzantılı dosyanızı veya ESRI Shape File(SHP) dosyanızın içinde bulunduğu klasörü ZIP formatında paketleyerek (Winzip/Winrar kullanabilirsiniz) <b>Gözat</b> butonu ile <b>Dosya</b> alanına ekleyin.<br/>&nbsp;",

									},
									{
										xtype: "field",
										inputType: "file",
										fieldLabel: "Dosya",
										name: "file",
										allowBlank: false
									}
								]
							//,
							//buttons: [{
							//    text: "Aktar",
							//    formBind: true,
							//    handler: function(){
							//    	if (frmUpload.getForm().isValid()) {
							//    		//console.log("form is valid");
							//    		frmUpload.form.submit(
							//            {
							//            	url: "../GeoImport/",
							//            	waitMsg: 'Aktarılıyor...',
							//       		failure: function(form, action) {
							//       			var jsonFormatter =  new OpenLayers.Format.GeoJSON();
							//            		var geoCollection = jsonFormatter.read(action.response.responseText)[0].geometry;
							//            		geoCollection.transform(new OpenLayers.Projection("EPSG:4326"),new OpenLayers.Projection("EPSG:102113"));//mapProjCode));
							//            		this.target.mapPanel.map.zoomToExtent(geoCollection.getBounds(),true);
							//            		winUpload.hide();
							//            		Ext.each(geoCollection.components,function(geom){
							//            			var vectorFeature = new OpenLayers.Feature.Vector(new OpenLayers.Geometry.MultiLineString([geom]));
							//            			vectorFeature.state = OpenLayers.State.INSERT;
							//            			this.vectorLayer.addFeatures(vectorFeature);
							//            			this.queuedFeatures.push(vectorFeature);
							//            		},this);
							//            		this.queue = 0;
							//            		Ext.Ajax.fireEvent("nextFeature");
							//       		},
							//       		scope: this
							//            });
							//    	}
							//    },
							//    scope: this
							//}]
						}
					);
					var winUpload = new Ext.Window({
						title: "İçe Aktar",
						layout: "fit",
						height: 150,
						width: 500,
						modal: true,
						waitTitle: "Lütfen Bekleyin...",
						items: [frmUpload],
					});
					winUpload.show();
				}
			},
			new GeoExt.Action({
				tooltip: "Kazı hatlarını kaydet",
				menuText: "Kazı hatlarını kaydet",
				iconCls: "gxp-icon-featurekazihattisave",
				handler: function(){
					try
					{
						if(window.parent.hasGrid("gisTable")) //mis function (tablo acikmi kontrolu)
							this.saveStrategy.save();
						else
							alert("Gis Adress Tablosu bulunamadı");
					}
					catch (err) {
						alert("Gis Adress Tablosu bulunamadı");
					}
				},
				scope: this,
				map: this.target.mapPanel.map
			})
		];
		return actions = gxp.plugins.Featurekazihatti.superclass.addActions.apply(this, [actions]);
	}

});
Ext.preg(gxp.plugins.Featurekazihatti.prototype.ptype, gxp.plugins.Featurekazihatti);
