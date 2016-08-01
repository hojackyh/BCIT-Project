
//=======================================================================================================
//Creator: Jacky Ho
//E-Comm 911 Situational Awareness Application
//BCIT Project
//JavaScript
//Created: Jan 04, 2016
//Last Modified: May 26, 2016
//=======================================================================================================

var map;

require([
  "esri/config",
  "esri/domUtils",
  "esri/graphic",
  "esri/InfoTemplate",
  "esri/map",
  "esri/request",
  "esri/urlUtils",
  "esri/dijit/InfoWindowLite",
  "esri/geometry/Multipoint",
  "esri/geometry/Point",
  "esri/geometry/webMercatorUtils",
  "esri/layers/ArcGISDynamicMapServiceLayer",
  "esri/layers/ArcGISImageServiceLayer",  
  "esri/layers/FeatureLayer",
  "esri/symbols/PictureMarkerSymbol",
  "dojo/_base/array",
  "esri/Color",
  "esri/dijit/Geocoder",
  "dijit/registry",                
  "esri/tasks/ClosestFacilityTask",
  "esri/tasks/ClosestFacilityParameters",
  "esri/symbols/SimpleMarkerSymbol",
  "esri/symbols/SimpleLineSymbol",            
  "esri/geometry/screenUtils",
  "dojo/query",
  "esri/layers/GraphicsLayer",
  "esri/renderers/SimpleRenderer",
  "esri/tasks/FeatureSet",            
  "esri/tasks/GeometryService",            
  "esri/tasks/AreasAndLengthsParameters",
  "esri/lang","dojo/number",
  "dojo/dom",
  "dojo/dom-construct",
  "dojo/json",
  "esri/tasks/QueryTask",        
  "esri/tasks/query",  
  "esri/dijit/FeatureTable",      
  "esri/geometry/Extent", 
  "esri/layers/CSVLayer",
  "esri/SpatialReference",
  "esri/geometry/geodesicUtils", 
  "esri/units",
  "esri/geometry/geometryEngine",
  "esri/symbols/PictureMarkerSymbol",
  "dojo/on",
  "dojo/parser",
  "dojo/_base/array",
  "dojo/_base/lang",
  "dojox/data/CsvStore",
  "dojox/encoding/base64",
  "dijit/Dialog",
  "dijit/layout/BorderContainer",
  "dijit/layout/ContentPane",
  "dijit/form/ComboBox",
  "dijit/layout/BorderContainer",
  "dijit/layout/ContentPane",
  "esri/geometry/Geometry",
  "dojo/domReady!"
],
  function (  

  esriConfig, 
  domUtils, 
  Graphic, 
  InfoTemplate, 
  Map, 
  request, 
  urlUtils,
  InfoWindowLite, 
  Multipoint, 
  Point, 
  webMercatorUtils, 
  ArcGISDynamicMapServiceLayer,
  ArcGISImageServiceLayer,  
  FeatureLayer, 
  PictureMarkerSymbol, 
  array,
  Color,
  Geocoder,                
  registry,                   
  ClosestFacilityTask,
  ClosestFacilityParameters,
  SimpleMarkerSymbol,
  SimpleLineSymbol,
  screenUtils,
  query,      
  GraphicsLayer,          
  SimpleRenderer,
  FeatureSet,                
  GeometryService,                
  AreasAndLengthsParameters,                
  esriLang,
  number,
  dom, 
  domConstruct,
  JSON,
  QueryTask, 
  Query,        
  FeatureTable, 
  Extent, 
  CSVLayer, 
  SpatialReference,
  geodesicUtils,
  Units,
  geometryEngine,
  PictureMarkerSymbol,
  on, 
  parser, 
  arrayUtils, 
  lang, 
  CsvStore, 
  base64, 
  Geometry
 
) {
	
    parser.parse();
	//=======================================================================================================
    //list of lat and lon field strings that the csv reader will detect to input points
	//=======================================================================================================
    var latFieldStrings = ["lat", "latitude", "y", "ycenter"];
    var longFieldStrings = ["lon", "long", "longitude", "x", "xcenter"];
	
	//=======================================================================================================
    //Global Variables
	//=======================================================================================================	
	var incidentsGraphicsLayer, routeGraphicLayer, closestFacilityTask, featureLayer1, objfind, buffercopy, timelog, longitude, latitude;				

	//=======================================================================================================
	//The fire action for the clear button
	//=======================================================================================================
    on(dom.byId("clearButton"), "click", clearAll);
    setupDropZone();

        urlUtils.addProxyRule({
            urlPrefix: "route.arcgis.com",
            proxyUrl: "/sproxy/"
        });
			
	//=======================================================================================================
	//	Map Display
	//=======================================================================================================
    map = new Map("mapCanvas", {
      basemap: "topo",
      center: [-123.272, 49.096],
      zoom: 4,
      slider: false
    });

    map.infoWindow.resize(275, 175);
	
	//=======================================================================================================
	//	Geocoder
	//=======================================================================================================
    var geocoder =  new Geocoder({
        arcgisGeocoder: {
            placeholder: "Locate Incident Point"
        },
        autoComplete: true,
        map: map
    }, dom.byId("search"));

    geocoder.on("select", showLocation);
    geocoder.on("clear", removeSpotlight);
			
	
	//=======================================================================================================
	//	TRK TO CSV START
	//=======================================================================================================
	document.getElementById('btn-open').onclick = function() {
		if ('FileReader' in window) {
		document.getElementById('file-browser').click();
		} 
		else {
		alert('Your browser does not support the HTML5 FileReader.');
		}
	};


	var fileToLoad;
	var fileToLoad2;
	var getext;
	document.getElementById('file-browser').onchange = function(event) {
		fileToLoad = event.target.files[0];
		fileToLoad2 = event.target.files;
		if (fileToLoad !== undefined) {
			var reader = new FileReader();
			reader.onload = function(fileLoadedEvent) {
				var textFromFileLoaded = fileLoadedEvent.target.result;
				console.log(textFromFileLoaded);
				var splitdate = textFromFileLoaded.substr(textFromFileLoaded.indexOf((/\n/g) + 1));
				//=======================================================================================================
				//Replace the space with , to make it a csv format
				//=======================================================================================================
				var textreplace = textFromFileLoaded.replace(/ /g, ",");
				//=======================================================================================================
				//Add the headers and what the function reads from the trk file
				//=======================================================================================================
				gettext = "Time,GPS,AVL,VehicleID,UnitID,Lat,Long,XAlbers,YAlbers,Speed,Bearing,Altitude,Source,Status,Attribute,Device,Status,Event#\n" + textreplace;
			};
			reader.readAsText(fileToLoad, "UTF-8");
		}
	};

	//=======================================================================================================
	//	CSV READER FUNCTION
	//=======================================================================================================
    function setupDropZone () {
      // Let's verify that we have proper browser support, before
      // moving ahead. You can also use a library like Modernizr
      // to detect browser capabilities:
      if (!window.File || !window.FileReader) {
        domUtils.show(dom.byId('msg'));
        return;
      }

      var mapCanvas = dom.byId("mapCanvas");

      on(mapCanvas, "dragenter", function (event) {
        // If we don't prevent default behavior here, browsers will
        // perform the default action for the file being dropped i.e,
        // point the page to the file.
        event.preventDefault();
      });

      on(mapCanvas, "dragover", function (event) {
        event.preventDefault();
      });
      on(mapCanvas, "drop", handleDrop);
	  on( document.getElementById("loadtrk"), "click", handleDrop);
    }

    function handleDrop (event) {
	   
	  //=======================================================================================================
	  //Everytime the load button is clicked, clear all previous graphics (essentially the same code as the clear button)
	  //=======================================================================================================	
	  map.graphics.clear();
      var layerIds = map.graphicsLayerIds.slice(0);
      layerIds = layerIds.concat(map.layerIds.slice(1));

      arrayUtils.forEach(layerIds, function (layerId) {
        map.removeLayer(map.getLayer(layerId));
      });
	  
	  
      console.log("Drop: ", event);
      event.preventDefault();

	  files = fileToLoad2;

 
		if (files && files.length === 1) {
			console.log("[ FILES ]");
			var file = files[0]; 
			console.log("type = ", file.type);

			//=======================================================================================================
			//	What file it is looking for
			//=======================================================================================================
			if (file.name.indexOf(".trk") !== -1) {
			handleCSV(file);
			}
		} 
    }


    function handleCSV (file) {
      console.log("Processing CSV: ", file, ", ", file.name, ", ",  file.size);
		if (file.data) {
			var decoded = bytesToString(base64.decode(file.data));
			processCSVData(decoded);
		}
		else {
			var reader = new FileReader();
			reader.onload = function () {
			console.log("Finished reading CSV data");
		  
			//=======================================================================================================
			//	GETTEXT (file reader), what it is adding
			//=======================================================================================================		  
			processCSVData(gettext);
			//console.log(gettext);
			};
        
		reader.readAsText(file);
		}
	}

    var bytesToString = function (b) {
      console.log("bytes to string");
      var s = [];
      arrayUtils.forEach(b, function (c) {
        s.push(String.fromCharCode(c));
      });
      return s.join("");
    };

    function processCSVData (data) {
		var newLineIndex = data.indexOf("\n");
		var firstLine = lang.trim(data.substr(0, newLineIndex));
		var separator = getSeparator(firstLine);
		var csvStore = new CsvStore({
			data: data,
			separator: separator
		});

    csvStore.fetch({
        onComplete: function (items) {
			var objectId = 0;
			var featureCollection = generateFeatureCollectionTemplateCSV(csvStore, items);
			var popupInfo = generateDefaultPopupInfo(featureCollection);
			var infoTemplate = new InfoTemplate(buildInfoTemplate(popupInfo));
			var latField, longField;
			var fieldNames = csvStore.getAttributes(items[0]);
			arrayUtils.forEach(fieldNames, function (fieldName) {
				var matchId;
				matchId = arrayUtils.indexOf(latFieldStrings,
				fieldName.toLowerCase());
				
				if (matchId !== -1) {
				latField = fieldName;
				}

				matchId = arrayUtils.indexOf(longFieldStrings,
				fieldName.toLowerCase());
				
				if (matchId !== -1) {
				longField = fieldName;
				}
			});
		  
		//=======================================================================================================
        // Add records in this CSV store as graphics
		//=======================================================================================================
        arrayUtils.forEach(items, function (item) {
            var attrs = csvStore.getAttributes(item),
            attributes = {};
			  
			//======================================================================================================= 
            // Read all the attributes for  this item
			//=======================================================================================================
            arrayUtils.forEach(attrs, function (attr) {
              var value = Number(csvStore.getValue(item, attr));
              attributes[attr] = isNaN(value) ? csvStore.getValue(item, attr) : value;
            });

			//=======================================================================================================
			//Assigns a different object id after each loop
			//=======================================================================================================
            attributes["__OBJECTID"] = objectId;
            objectId++;
				
		
			//=======================================================================================================
			//Create variables for the time buffer
			//=======================================================================================================
			timelog = attributes["Time"];

            latitude = parseFloat(attributes[latField]);
            longitude = parseFloat(attributes[longField]);	 

			var infograph = new InfoTemplate("${*}");
		
			//Getting the substring of the time attribute, since query.where is incompatible
			var timelogsub = timelog.substring(0,14);
		
			var parsetime = parseFloat(timelogsub);
		
			var attr1 = {"Time":parsetime};
		
			//Turning the getelements into floats to enable math equations
			var timestartparse = parseFloat(document.getElementById('timest').value);
			var timeendparse = parseFloat(document.getElementById('timest').value);			//not needed but can be used as an alternative to the buffer, change the getelemid to use
			var timebuffer = parseFloat(document.getElementById('timebuffer').value);
		
		

            if (isNaN(latitude) || isNaN(longitude)) {
              return;
            }

            var geometry = webMercatorUtils
              .geographicToWebMercator(new Point(longitude, latitude));
			  
			//=======================================================================================================
			// Buffer Types
			//=======================================================================================================
			
			//=======================================================================================================
			// Buffer based on minutes
			//=======================================================================================================
			if (document.getElementById('bufftype').value == "Minutes")
			{
			timebuffer = timebuffer * 100;
			}
			
			//=======================================================================================================
			// Buffer based on hours (uncomment if it is needed, and add a selection option in the html)
			//=======================================================================================================
			/*
			if (document.getElementById('bufftype').value == "Hours")
			{
			timebuffer = timebuffer * 10000;
			}
			*/
			
			//=======================================================================================================
			// When All is selected, display all the points (set the buffer to a big number basically)
			//=======================================================================================================
			if (document.getElementById('bufftype').value == "All")
			{
			//timestartparse = 1;
			timebuffer = 10000000000000;
			}
			  
			  
			  
			//=======================================================================================================
			//Conditions to add the points based on the time buffer
			//=======================================================================================================  
		    if 
			//smaller limit
			(((((timestartparse ) + timebuffer) >= (parsetime + timebuffer)) && (timestartparse - timebuffer) <= parsetime) 
			||
			//larger limit
			((((timestartparse ) + timebuffer) <= (parsetime + timebuffer)) && (timestartparse + timebuffer) >= parsetime)) 
				
			{
            var feature = {
              "geometry": geometry.toJson(),
              "attributes": attributes
            };
            featureCollection.featureSet.features.push(feature);
			} 
		 
			//=======================================================================================================  

		});
		  		  
		//=======================================================================================================	
        // Making the feature layer
	    //=======================================================================================================
        featureLayer1 = new FeatureLayer(featureCollection, {
          infoTemplate: infoTemplate,
          id: 'csvLayer'
        });
		
		//=======================================================================================================	
        // Adding the feature layer items on the map, and assigning the popup info/template
	    //=======================================================================================================		
        featureLayer1.__popupInfo = popupInfo;
        map.addLayer(featureLayer1);
        zoomToData(featureLayer1);
		  
        },
        onError: function (error) {
          console.error("Error fetching items from CSV store: ", error);
        }
	});
    }
	
	//=======================================================================================================	
    //Creates a feature collection for the input csv file
	//=======================================================================================================
    function generateFeatureCollectionTemplateCSV (store, items) {
      var featureCollection = {
        "layerDefinition": null,
        "featureSet": {
          "features": [],
          "geometryType": "esriGeometryPoint"
        }
      };
      featureCollection.layerDefinition = {
        "geometryType": "esriGeometryPoint",
        "objectIdField": "__OBJECTID",
        "type": "Feature Layer",
        "typeIdField": "",
        "drawingInfo": {
          "renderer": {
            "type": "simple",
            "symbol": {
              "type": "esriPMS",
			  //=======================================================================================================
			  //The base64 code for the fire truck/facility icons
			  //Use this site: http://www.askapache.com/online-tools/base64-image-converter/
			  //to convert an image to the code, and paste the code into the line below
			  //=======================================================================================================
              "imageData": "iVBORw0KGgoAAAANSUhEUgAAADEAAAAxCAYAAABznEEcAAAABmJLR0QA/wD/AP+gvaeTAAAGTklEQVRogdXZe0xTVxwH8O+5fVCKaB8U1AuCIYIK6IZigE1BpwymWUwUlxhZtulE43zgspAI+EI0M1FUNIbpZrIREQZu8U0LDOfmFqcsIxHRuShOXkIpRUBoac/+YIUWKH1b/f3TUM655/fp73fo5VwCF0WXwj/i1v2+gpqH2qlJ0YIrYj/dOt+FrV2uWs/poVaw0anLvXq5HFCZiKHeQkLlubLajktTxO7OzapQK9joNYnCPh6X0NIcKe0oY2lKohcVCggtyZHWvfIQtYKNTkn0GgSo5SxVy9nXB2IO8NpAOsvZmA+TzANcDSGOXuB5WcCCTbntFYXlPdxzeyRYHCUYczylwObcDpRW9aAgS3p/0WxhjGjZE5UjOTCOTH4u948zAAqtAAAAIUBemggr4oVYk60Mrfyr5zdHK2I34rncP27TYVW5AbDECoAhCAGOpYmwLNbTKRC7ECqFf7y9gMGFCZCfLnYKxOY9oVL4x289pFI4AjAOPQVSv1Th0s0Xdu8RmxDOBhjCUYjVCFcBDOEIxCqE6hq7cOvRDnmhwjUAQ9gLsbixXxYAGH2zq6/5SyzNG7MSLxNgHCYV2Sl98E6kIGZC4tN2c+PNItwFMIQtkFHbqaOMXeROADCstfYqQyqqe8221ohKdJSxi7Yc6SgbC/BHHYVoHDDN33R6sxLY9Y0OC94gkIkI/m2hkIkJOrso2jqB0ACCxjYKyQSClnYKHgcI8BsYZ3j1FgIcBnjcDEQEEzCEoqhcjcs3X+A7MxUxqYQ1AAD48QbFrXsUANCvA/p1FJp+YPsJHX6vpWhWAjMDAT4fCJoIiLyBPg0QEkDA5wNTfAGGATx4wIzAgVfDeJmYgJURdPcOvNfdS5CfLsbSWE+kmKnI4EdpLQAAMk7pMTMImDed4OMDOvhJCD5bwWDrUR0IAa4c5ELdbXa6TSGdQOEnJoN7ZLSKkOGAs7slSJg3AHj6jKKzZ+TeP3Feh2CWoPoBRc0/AxWZOgl41DRwc1e4i+sUQKAf4OU59LM5CFGXB0RtOdT+61lFD88YAACfH9dBcZs6JSF74uR2Bm/NMv3bYww5kymtSQ7xi2Lu1PZ+W1DWzTuVLjYBvKrBEODkF2LER3pg2xHVrE6xOpWpe9IfJPZm8P58T8tXeEWCywE2r/RGs1KHnl59KBMfKSjRaIG1+9uh0w8NbFVTvNC4L1EAaOskaOsY2c6Pm/qRkq3E27M94MWjRcwMrmRt6X5pVeWdPqzerYS2f2DSjnw9fqlx334AgKzTOuw5ozd5r66+H3GbWsH6cPHDAem68YlNNwgA0OIwfnnTM/nKHcq4mAg+CnZK8LCBQN1FUVsPHCnWmVzooyQGseG2nzGou4H0kzrojT6bJXMJkheavw8VewOhU8ggICGtFUETOajMk62TJjV+DRh9T9DiML6ioUWenNkeFxPOR8EuCXhcAkqBo6V6FCr0YBhg9WIGG5cTcDn2HZSUVOmRV6pHZzcQG06Qs54D0TjL80wAR2WfSpc2njb8ziQTY8ic6Tyc2yuFB29gSL8OAKjdyZusQ4E+LSDgWzf+Xr0W76a1jQoYgbAEcUdYAgBmbsUNkJWZ7XFz3QixBgCM8f+EMWROKA9F2S8Xcq9ei4RtbZg6iYPKYz7rpe81nTI3dsys3AWxBQBYcVBgDIkM5aHYxZDax/+30CQOfrICAFhxUEBW3dUsYf0SSvZJrlff12BVlhJ9Wtd8CRoDqvL8Uq0BADacOw1VRBkXGcJH8T7nVmQ4QJL09Ctr59qUhasgjgAAGw+Uh1pLer36gQarMpXo1TjWWsaAijzfDbYCADtOxYdDPsiyH3L3kSlAltSQb8917O6F4a1VlC2FgG/95e4+0iJxu+MAwMHHXQbIigxl3JvT+Pg+xzrIIGAiBxXHHQMADj7uMrRWaY70+p9/a5CcYbm1TADHfDc6CnBa0OIwvjzXp8pbSOiC2R605dLkUZ+e3sz3peO9GDormEdbL7Mb3J33iLAEMQAignm07Qq70d35mg1jyHwjiDFAeZVNc3eeFoMWh/EvHvT5WSggdHGUgF49LKOicQydEcijrZdfA4AhGi9OFp7f73PHV8yhhIDGhPNp8wU2w1Xruex2lN6ew1O3N39CQGdSkAuihIYKV631HzCcElWVuhLhAAAAAElFTkSuQmCC",
              "contentType": "image/png",
              "width": 15,
              "height": 15
            }
          }
        },
        "fields": [
          {
            "name": "__OBJECTID",
            "alias": "__OBJECTID",
            "type": "esriFieldTypeOID",
            "editable": false,
            "domain": null
          }
        ],
        "types": [],
        "capabilities": "Query"
      };

      var fields = store.getAttributes(items[0]);
      arrayUtils.forEach(fields, function (field) {
        var value = store.getValue(items[0], field);
        var parsedValue = Number(value);
        if (isNaN(parsedValue)) { //check first value and see if it is a number
          featureCollection.layerDefinition.fields.push({
            "name": field,
            "alias": field,
            "type": "esriFieldTypeString",
            "editable": true,
            "domain": null
          });
        }
        else {
          featureCollection.layerDefinition.fields.push({
            "name": field,
            "alias": field,
            "type": "esriFieldTypeDouble",
            "editable": true,
            "domain": null
          });
        }
      });
      return featureCollection;
    }

    function generateDefaultPopupInfo (featureCollection) {
      var fields = featureCollection.layerDefinition.fields;
      var decimal = {
        'esriFieldTypeDouble': 1,
        'esriFieldTypeSingle': 1
      };
      var integer = {
        'esriFieldTypeInteger': 1,
        'esriFieldTypeSmallInteger': 1
      };
      var dt = {
        'esriFieldTypeDate': 1
      };
      var displayField = null;
      var fieldInfos = arrayUtils.map(fields,
        lang.hitch(this, function (item) {
          if (item.name.toUpperCase() === "NAME") {
            displayField = item.name;
          }
          var visible = (item.type !== "esriFieldTypeOID" &&
                         item.type !== "esriFieldTypeGlobalID" &&
                         item.type !== "esriFieldTypeGeometry");
          var format = null;
          if (visible) {
            var f = item.name.toLowerCase();
            var hideFieldsStr = ",stretched value,fnode_,tnode_,lpoly_,rpoly_,poly_,subclass,subclass_,rings_ok,rings_nok,";
            if (hideFieldsStr.indexOf("," + f + ",") > -1 ||
                f.indexOf("area") > -1 || f.indexOf("length") > -1 ||
                f.indexOf("shape") > -1 || f.indexOf("perimeter") > -1 ||
                f.indexOf("objectid") > -1 || f.indexOf("_") == f.length - 1 ||
                f.indexOf("_i") == f.length - 2) {
              visible = false;
            }
            if (item.type in integer) {
              format = {
                places: 0,
                digitSeparator: true
              };
            }
            else if (item.type in decimal) {
              format = {
                places: 2,
                digitSeparator: true
              };
            }
            else if (item.type in dt) {
              format = {
                dateFormat: 'shortDateShortTime'
              };
            }
          }

          return lang.mixin({}, {
            fieldName: item.name,
            label: item.alias,
            isEditable: false,
            tooltip: "",
            visible: visible,
            format: format,
            stringFieldOption: 'textbox'
          });
        }));

      var popupInfo = {
        title: displayField ? '{' + displayField + '}' : '',
        fieldInfos: fieldInfos,
        description: null,
        showAttachments: false,
        mediaInfos: []
      };
      return popupInfo;
    }

    function buildInfoTemplate (popupInfo) {
      var json = {
        content: "<table>"
      };

      arrayUtils.forEach(popupInfo.fieldInfos, function (field) {
        if (field.visible) {
          json.content += "<tr><td valign='top'>" + field.label +
                          ": <\/td><td valign='top'>${" + field.fieldName + "}<\/td><\/tr>";
        }
      });
      json.content += "<\/table>";
      return json;
    }

    //=======================================================================================================
    //The function to remove all graphics on the map
	//=======================================================================================================
    function clearAll () {
      map.graphics.clear();
      var layerIds = map.graphicsLayerIds.slice(0);
      layerIds = layerIds.concat(map.layerIds.slice(1));

      arrayUtils.forEach(layerIds, function (layerId) {
        map.removeLayer(map.getLayer(layerId));
      });
    }

    function getSeparator (string) {
      var separators = [",", "      ", ";", "|"];
      var maxSeparatorLength = 0;
      var maxSeparatorValue = "";
      arrayUtils.forEach(separators, function (separator) {
        var length = string.split(separator).length;
        if (length > maxSeparatorLength) {
          maxSeparatorLength = length;
          maxSeparatorValue = separator;
        }
      });
      return maxSeparatorValue;
    }

	//=======================================================================================================
    //The function to zoom in to the average extent of the loaded points
	//=======================================================================================================
    function zoomToData (featureLayer) {
	
      var multipoint = new Multipoint(map.spatialReference);
      arrayUtils.forEach(featureLayer.graphics, function (graphic) {
        var geometry = graphic.geometry;
        if (geometry) {
          multipoint.addPoint({
            x: geometry.x,
            y: geometry.y
			
          });
        }
      });

      if (multipoint.points.length > 0) {
        map.setExtent(multipoint.getExtent().expand(1.25), true);
      }
    }
	
	//=======================================================================================================
	//	CLOSEST FACILITY START + GEOCODER
	//=======================================================================================================
            function showLocation(evt) {
                map.graphics.clear();
                var point = evt.result.feature.geometry;
                var symbol = new PictureMarkerSymbol('http://gisweb.athena.bcit.ca/students/jho/project/pics/phone.png', 20, 20);
                var graphic = new Graphic(point, symbol);
                map.graphics.add(graphic);

                map.infoWindow.setTitle("Search Result");
                map.infoWindow.setContent(evt.result.name);

                map.infoWindow.show(evt.result.feature.geometry);

                var spotlight = map.on("extent-change", function(extentChange) {
                    var geom = screenUtils.toScreenGeometry(map.extent, map.width, map.height, extentChange.extent);
                    var width = geom.xmax - geom.xmin;
                    var height = geom.ymin - geom.ymax;

                    var max = height;
                    if ( width > height ) {
                        max = width;
                    }

                    var margin = '-' + Math.floor(max/2) + 'px 0 0 -' + Math.floor(max/2) + 'px';

                    query(".spotlight").addClass("spotlight-active").style({
                        width: max + "px",
                        height: max + "px",
                        margin: margin
                    });
                    spotlight.remove();
                });
                var location = new Graphic(point);
                incidentsGraphicsLayer.add(location);

                var features = [];
                features.push(location);
                var incidents = new FeatureSet();
                incidents.features = features;
                params.incidents = incidents;

                map.graphics.enableMouseEvents();

				//=======================================================================================================
				// Hover over the route to get the length on a div
				// removed this function due to overlaps and mobile purposes (can't hover in mobile)
				//=======================================================================================================
				/*
                routeGraphicLayer.on("mouse-over", function(evt){
                    //clear existing directions and highlight symbol
                    map.graphics.clear();
                    dom.byId("directionsDiv").innerHTML= "Hover over the route to view directions";

                    var highlightSymbol = new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([0,255,255],0.25), 4.5);
                    var highlightGraphic = new Graphic(evt.graphic.geometry,highlightSymbol);

                    map.graphics.add(highlightGraphic);
                    dom.byId("directionsDiv").innerHTML = routeLength;
                });
				*/
			
			
				//==========================================================================================================
				//Solve Route. Length.
				//==========================================================================================================
                closestFacilityTask.solve(params, function(solveResult){
                    array.forEach(solveResult.routes, function(route, index){
                        //build an array of route info
                        var attr = array.map(solveResult.directions[index].features, function(feature){
						
						//edit the directions or length
						//return number.format(feature.attributes.length,{places:2});
						return feature.attributes.length;
						
                        });
						params.impedenceAttribute= "Kilometers";
						params.directionsLengthUnits = "esriKilometers";
						params.defaultCutoff= 25.0;
						params.returnIncidents=false;
						params.returnRoutes=true;
						params.returnDirections=true;
				
				
			//==========================================================================================================
            //Calculate the length of the route with Geometry Engine
            //==========================================================================================================
				var routeLength = geometryEngine.geodesicLength(route.geometry);
				var routeLength2 = number.format(routeLength,{places:2});
				var floatlength = parseFloat(routeLength2);
				
			//==========================================================================================================
            //Infotemplate shows the route length
			//default is meters so we /1000 to get kilometers
            //==========================================================================================================
                        var infoTemplate = new InfoTemplate("Length", routeLength/1000 + " Kilometers");

                        route.setInfoTemplate(infoTemplate);
						
                        route.setAttributes(attr);
						
                        routeGraphicLayer.add(route);
                        dom.byId("directionsDiv").innerHTML = "Hover over the route to view directions";
						
						//console.log(route);        
						
                    });
					//=======================================================================================================
                    //display a message if there's an error
					//=======================================================================================================
                    if(solveResult.messages.totalLength > 0){
                        dom.byId("directionsDiv").innerHTML = "<b>Error:</b> " + solveResult.messages[0];
                    }
                });
            }

            function enableSpotlight() {
                var html = "<div id='spotlight' class='spotlight'></div>"
                domConstruct.place(html, dom.byId("map_container"), "first");
            }

            function removeSpotlight() {
                query(".spotlight").removeClass("spotlight-active");
                map.infoWindow.hide();
                map.graphics.clear();
            };

            //==========================================================================================================
            //Set Parameters for the road network
            //==========================================================================================================

            map.on("click", mapClickHandler);

            params = new ClosestFacilityParameters();
            params.impedenceAttribute= "Kilometers";
			params.directionsLengthUnits = "esriKilometers";
            params.defaultCutoff= 25.0;
            params.returnIncidents=false;
            params.returnRoutes=true;
            params.returnDirections=true;
			
			//=======================================================================================================
			//Load the facility layer on to the closest facility function
			//=======================================================================================================
			map.on("extent-change", function (evtObj) {
				
                var map = evtObj.target;
                var facilityPointSymbol = new SimpleMarkerSymbol(
                        SimpleMarkerSymbol.STYLE_SQUARE,
                        20,
                        new SimpleLineSymbol(
                                SimpleLineSymbol.STYLE_SOLID,
                                new Color([	140, 0, 26 ]), 2
                        ),
                        new Color([	255, 255, 255 ,0.40])
                );

				//=======================================================================================================
				// The Icon for the incident/geocoded point
				//=======================================================================================================
				
                var incidentPointSymbol = new PictureMarkerSymbol('http://gisweb.athena.bcit.ca/students/jho/project/pics/phone.png', 20, 20)

                incidentsGraphicsLayer = new GraphicsLayer();

                var incidentsRenderer = new SimpleRenderer(incidentPointSymbol);
                incidentsGraphicsLayer.setRenderer(incidentsRenderer);
                map.addLayer(incidentsGraphicsLayer);

                routeGraphicLayer = new GraphicsLayer();

                var routePolylineSymbol = new SimpleLineSymbol(
                        SimpleLineSymbol.STYLE_SOLID,
                        new Color([	103, 9, 28 ]),
                        4.0
                );
                var routeRenderer = new SimpleRenderer(routePolylineSymbol);
                routeGraphicLayer.setRenderer(routeRenderer);

                map.addLayer(routeGraphicLayer);
				

			//=======================================================================================================
			//	FACILITIES variable
			//  Links the facility parameters to a feature layer
			//=======================================================================================================
				
                var facilities = new FeatureSet();
                facilities.features = featureLayer1.graphics;

                params.facilities = facilities;
                params.outSpatialReference = map.spatialReference;

            });

            //=======================================================================================================
            // REST SERVICE CLOSEST PROXIMITY TASK (Change the url to the appropriate REST service)
            //=======================================================================================================
            closestFacilityTask = new ClosestFacilityTask("https://sp76.athena.bcit.ca:6443/arcgis/rest/services/Network/ClosestFacilityWorking5/NAServer/Closest%20Facility");

            registry.byId("numLocations").on("change", function() {
                params.defaultTargetFacilityCount = this.value;
                clearGraphics();
            });
			
			//=======================================================================================================
			//Not used, keep for ease of use later if we need to add it in again
			//=======================================================================================================
            function clearGraphics() {
                //clear graphics
                dom.byId("directionsDiv").innerHTML= "";
            }

            function mapClickHandler(evt) 
			{
            //    clearGraphics();
                dom.byId("directionsDiv").innerHTML= "";

            }
			
		
			$(document).ready(function(){
				$("#toggle").click(function(){
				$("#rightPane").slideToggle("slow");
				});
			});
});