window.intCount = 0;

/**
 * Class Animation
 * @author Thiago Henrique Ramos da Mata <thiago.henrique.mata@gmail.com>
 * @date 2012-02-10
 *
 * Provide an easy way to animate many Vehicles
 */
function Animation()
{
	/**
	 * Refresh Rate in
	 * milliseconds
	 * @var integer
	 */
	this.tick = 10;

	/**
	 * Id of the div what the map should exists
	 * @var string
	 */
	this.strIdMap = "map";

	/**
	 * Collections of Vehicles into Animation
	 * @var Vehicle[]
	 */
	this.arrVehicles = new Array();

	/**
	 * Zoom into map
	 */
	this.dblZoom = 17;

	this.intMaxZoom = 17	;

	this.intMinZoom = 5;

	this.dblMaxZoomSpeed = 25;

	this.dblZoomForSpeed = 800;

	/**
	 * Refresh time of animation in miliseconds
	 * @var integer
	 */
	this.intIntervalTimer = 50;

	/**
	 * Make the time go "x" Times more fast than the real world 
	 * into the simulation
	 */
	this.intFastFoward = 10;

	this.booReady = false;
        
        this.objLoading;
        
        this.objLoadingBox;
        
	this.supportsCanvas = function()
	{
		if( document.getElementsByTagName( "CANVAS" ).length == 0 )
		{
			return false;
		}

		if( document.getElementsByTagName( "CANVAS" )[0].getContext )
		{
			return true;
		}
		else
		{
			return false;
		}
	}

        this.initLoading = function()
        {
            this.objLoadingBox = document.createElement( "div" );
            this.objLoadingBox.style.borderColor = "#DDDDDD";
            this.objLoadingBox.style.borderStyle = "solid";
            this.objLoadingBox.style.borderWidth = "1px";
            this.objLoadingBox.style.width = "200px";
            var objMap = document.getElementById( this.strIdMap );
            objMap.parentNode.insertBefore( 
                this.objLoadingBox ,
                objMap
            );
            this.objLoading = document.createElement( "div" );
            this.objLoading.style.borderColor = "green";
            this.objLoading.style.borderStyle = "solid";
            this.objLoading.style.borderWidth = "1px";
            this.objLoading.style.width = "0%";
            this.objLoading.style.styleFloat = "left";
            this.objLoadingBox.appendChild( this.objLoading );
        }
        
        this.drawLoadingProgress = function( intPercentProgress )
        {
            if( this.objLoading == null )
            {
                this.initLoading();
                this.objLoading.style.backgroundColor = "rgb(100,100,233)";
                this.objLoadingBox.style.display = "block";
            }
            
            this.objLoading.style.width = intPercentProgress + "%";
            this.objLoading.innerHTML = "Loading " + intPercentProgress + "%";
            if( intPercentProgress == 100 )
            {
                this.objLoadingBox.style.display = "none";
            }
        }

        this.drawMountingProgress = function( intPercentProgress )
        {
            if( this.objLoading == null )
            {
                this.initLoading();
                this.objLoading.style.backgroundColor = "rgb(100,233,100)";
                this.objLoadingBox.style.display = "block";
            }
            this.objLoading.style.width = intPercentProgress + "%";
            this.objLoading.innerHTML = "Mouting " + intPercentProgress + "%";
            if( intPercentProgress == 100 )
            {
                this.objLoadingBox.style.display = "none";
            }
        }

	this.loadVehicles = function()
	{
		var booReloadVehicles = false;
		for( var intVehicle = 0 ; intVehicle < this.arrVehicles.length ; intVehicle++ )
		{
			var objVehicle = this.arrVehicles[ intVehicle ];
			if( objVehicle.booReady == false )
			{
				booReloadVehicles = true;
			}
			if( objVehicle.booReady == true && objVehicle.booMap == false )
			{
				objVehicle.booMap = true;
				//this.objMap.setCenter( objVehicle.getStartMarker(), this.dblZoom );
				objVehicle.addAllMarkers( this.objMap );
				if ( this.supportsCanvas() )
				{
					objVehicle.objMarker = new ELabel(
						objVehicle.getStartMarker(), 
						'<canvas id="' + objVehicle.strCanvasId + '" width="32" height="32"><\/canvas>' , 
						null , 
						new GSize(-16,16)
					);

					this.objMap.addOverlay( objVehicle.objMarker );
                                        if( objVehicle.booDrawLineOnRun )
                                        {
                                            this.objMap.addOverlay( objVehicle.objDrawLinePoly );
                                        }
                                        if( objVehicle.booDrawFullPath )
                                        {
                                            this.objMap.addOverlay( objVehicle.objPoly );
                                        }
                                        
					var objCanvas = objVehicle.getCanvasContext();
					var objP0 = objVehicle.getStartMarker(); 
					var objP1 = objVehicle.getEndMarker(); 
					var intAngle = this.bearing( objP0 , objP1 );
					this.plotVehicle( objVehicle , intAngle );
				}
				else
				{
					objVehicle.objMarker = new GMarker( objVehicle.getStartMarker(),{icon:Vehicle});
					this.objMap.addOverlay( objVehicle.objMarker );
                                        if( objVehicle.booDrawLineOnRun )
                                        {
                                            this.objMap.addOverlay( objVehicle.objDrawLinePoly );
                                        }
                                        if( objVehicle.booDrawFullPath )
                                        {
                                            this.objMap.addOverlay( objVehicle.objPoly );
                                        }
				}
				objVehicle.onNextStep();
			}
		}
		if( booReloadVehicles )
		{
			this.booReady = false;
		}
                else
                {
                    this.booReady = true;
                }
		setTimeout( this.loadVehicles.bind(this) , 1000 );
	}

	/**
	 * Add some Vehicle to the animation
	 * @param Vehicle
	 */
	this.addVehicle = function( objVehicle )
	{
		this.booReady = false;
		objVehicle.id = this.arrVehicles.length;
		objVehicle.strCanvasId = 'VehicleCanvas' + objVehicle.id;
		this.arrVehicles[ objVehicle.id ] = objVehicle;
	}

	
	/**
	 * Returns the bearing in
	 * radians between two points.
	 *
	 * @see T. Vincenty, Survey Review, 23, No 176, p 88-93,1975. Convert to radians.
	 * @see http://econym.org.uk/gmap/
	 */
	this.bearing = function( from, to )
	{
		var lat1 = from.latRadians();
		var lon1 = from.lngRadians();
		var lat2 = to.latRadians();
		var lon2 = to.lngRadians();

		// Compute the angle.
		var angle = - Math.atan2(
			Math.sin( lon1 - lon2 ) * Math.cos( lat2 ),
			Math.cos( lat1 ) * Math.sin( lat2 ) - Math.sin( lat1 ) * Math.cos( lat2 ) * Math.cos( lon1 - lon2 )
		);

		if ( angle < 0.0 )
			angle  += Math.PI * 2.0;

		return 1 * angle.toFixed(2);
	}

	/**
	 * Draw the elements in the right position
	 */
	this.draw = function()
	{
		var intBiggestSpeed = 0;

		var objBounds = new google.maps.LatLngBounds();
		var booKeepDraw = false;

		for( var intVehicle = 0; intVehicle < this.arrVehicles.length; intVehicle++ )
		{
			var objVehicle = this.arrVehicles[ intVehicle ];
			
			if( !objVehicle.booMap || !objVehicle.booReady )
			{
				continue;
			}

			if( objVehicle.intDistance >= objVehicle.intEndOfLine )
			{
                                if( objVehicle.booMap )
                                {
                                    objVehicle.onTripComplete();
                                }
				continue;
			}
                        
			if( objVehicle.intSpeed > intBiggestSpeed )
			{
				intBiggestSpeed = objVehicle.intSpeed;
			}
	
			booKeepDraw = true;
			var objCurrentPoint = objVehicle.getCurrentPoint();
			objBounds.extend( objCurrentPoint );

			objVehicle.objMarker.setPoint( objCurrentPoint );


			switch( objVehicle.strType )
			{
				case "car":
				{
					this.moveCar( objVehicle );
					break;
				}
				case "plane":
				{
					this.movePlane( objVehicle );
					break;
				}
				default:
				{
					throw new Error( "Unknow vehicle " + objVehicle.strType );
				}
			}
                        
                        var intStepDistance = this.intFastFoward * ( objVehicle.intSpeed / ( (60*60)/this.intIntervalTimer ) );
                        objVehicle.intDistance += intStepDistance;
                        
                        if( objVehicle.booDrawLineOnRun )
                        {
                            objVehicle.intDistanceDrawLine += intStepDistance;

                            if( objVehicle.intDistance < objVehicle.intEndOfLine )
                            {
                                if( objVehicle.intDistanceDrawLine > 300 * ( this.intMaxZoom - this.intMinZoom ) / this.dblZoom )
                                {                    
                                    objVehicle.intDistanceDrawLine = 0;
                                    objVehicle.objDrawLinePoly.insertVertex( 
                                        objVehicle.objDrawLinePoly.getVertexCount() ,
                                        objCurrentPoint
                                    );
                                }
                                else
                                {
                                    objVehicle.objDrawLinePoly.deleteVertex( 
                                        objVehicle.objDrawLinePoly.getVertexCount() - 1
                                    );
                                    objVehicle.objDrawLinePoly.insertVertex( 
                                        objVehicle.objDrawLinePoly.getVertexCount() ,
                                        objCurrentPoint
                                    );
                                }
                            }
                        }
		}

		if( booKeepDraw )
		{
			if( this.objMap.getCenter().distanceFrom( objBounds.getCenter() ) > 10 )
			{
				var objPoly = new GPolyline(
					[  this.objMap.getCenter() , objBounds.getCenter() ] 
				);

				this.objMap.setCenter( objPoly.GetPointAtDistance( this.objMap.getCenter().distanceFrom( objBounds.getCenter() ) / 10 ) );
			}
		
			var intBoundZoom = (this.objMap.getBoundsZoomLevel(objBounds));
			if( intBoundZoom  > this.dblZoom )
			{
				this.dblZoom += 0.1;
			}
			else
			{
				this.dblZoom -= 0.1;
			}

			if( this.dblZoom > this.intMaxZoom )
			{ 
				this.dblZoom = this.intMaxZoom 
			}
			if( this.dblZoom < this.intMinZoom )
			{ 
				this.dblZoom = this.intMinZoom 
			}

			var dblZoomSpeed = this.dblMaxZoomSpeed - this.intFastFoward * intBiggestSpeed / this.dblZoomForSpeed;
		
			if( this.dblZoom > dblZoomSpeed )
			{ 
				this.dblZoom = dblZoomSpeed;// -= 0.1;
			}

			this.objMap.setZoom( Math.round(this.dblZoom) );

			setTimeout( this.draw.bind(this) , this.intIntervalTimer );
		}
		
	}

	this.moveCar = function( objVehicle )
	{
                if( objVehicle.booDrawLineOnRun )
                {
                    if( objVehicle.objDrawLinePoly.getVertexCount() > 20 )
                    {
                            objVehicle.objDrawLinePoly = new GPolyline( [ objVehicle.getCurrentPoint() ] );
                            this.objMap.addOverlay( objVehicle.objDrawLinePoly );
                    }
                }
                
		// if it is not the last step
		if ( ( objVehicle.objDirection.stepnum ) < objVehicle.objDirection.getRoute(0).getNumSteps() )
		{
			if(	objVehicle.getCurrentStep().getPolylineIndex()
				< 
				objVehicle.objPoly.GetIndexAtDistance( objVehicle.intDistance )
			)
			{
				objVehicle.objDirection.stepnum++;
				objVehicle.onNextStep();
		    		var intStepDistMeters = objVehicle.getLastStep().getDistance().meters;
				var intStepDistKm = intStepDistMeters / 1000; 
				var intStepTimeSecond = objVehicle.getLastStep().getDuration().seconds;
				var intStepTimeHour = ( intStepTimeSecond / ( 60 * 60 ) );

				// speed as Km/hour
				var intStepSpeed = ( intStepDistKm / intStepTimeHour ).toFixed(0);
				objVehicle.setSpeed( intStepSpeed );
				
			}
		}
		else
		{
			// is the last step
			var objLastStep = objVehicle.getLastStep();
			if ( objLastStep.getPolylineIndex() < objVehicle.objPoly.GetIndexAtDistance( objVehicle.intDistance ) ) 
			{
				objVehicle.arrive();
			}
		}
		if( objVehicle.intSpeed == 0)
		{
			objVehicle.intSpeed = 1;
		}
                    
		if ( this.supportsCanvas() )
		{
			if ( objVehicle.objPoly.GetIndexAtDistance( objVehicle.intDistance ) > objVehicle.intLastVertex )
			{
				objVehicle.intLastVertex = objVehicle.objPoly.GetIndexAtDistance( objVehicle.intDistance );

				if ( objVehicle.intLastVertex == objVehicle.objPoly.getVertexCount() )
				{
					objVehicle.intLastVertex--;
				}

				window.intCount++;

				var objVertexBefore  = objVehicle.objPoly.getVertex( objVehicle.intLastVertex - 1 );
				var objVertexCurrent = objVehicle.objPoly.getVertex( objVehicle.intLastVertex ); 

				while ( objVertexBefore.equals( objVertexCurrent ) ) 
				{
					objVehicle.intLastVertex--;
					objVertexBefore  = objVehicle.objPoly.getVertex( objVehicle.intLastVertex - 1 );
					objVertexCurrent = objVehicle.objPoly.getVertex( objVehicle.intLastVertex ); 
				}

				var intAngle = this.bearing( 
					objVertexBefore ,
					objVertexCurrent 
				);

				this.plotVehicle( objVehicle , intAngle );
			}
		}
	}

	this.movePlane = function( objVehicle )
	{
//		objVehicle.objFlightPlan.move( ( 1000 / this.intIntervalTimer ) * this.intFastFoward );

		var intAngle = this.bearing( 
			objVehicle.objFlightPlan.objLastVertex ,
			objVehicle.objFlightPlan.objCurrentVertex 
		);

//		objVehicle.intDistance += this.intFastFoward * ( objVehicle.intSpeed / ( (60*60)/this.intIntervalTimer ) );
		objVehicle.objFlightPlan.move( this.intFastFoward * 1000 / this.intIntervalTimer );

		//objVehicle.objFlightPlan.objPoly.GetIndexAtDistance()

		this.plotVehicle( objVehicle , intAngle );

	}

	/**
	 * Draw the rotated canvas Vehicle
	 */
	this.plotVehicle = function( objVehicle , intAngle )
	{
		intAngle += 0.1; // dont ask
		if( !objVehicle.booMap )
		{
			return;
		}
		var dblCosAng = Math.cos( intAngle );
		var dblSinAng = Math.sin( intAngle );
		var objCanvas = objVehicle.getCanvasContext();
		objCanvas.clearRect( 0 , 0 , 32 , 32 );
		objCanvas.save();
		objCanvas.rotate( intAngle );

		objCanvas.translate(
			16 * dblSinAng + 16 * dblCosAng , 
			16 * dblCosAng - 16 * dblSinAng
		);

		var intQtdImages = 8;
		var intAngleArea = 2 * Math.PI / intQtdImages;
		var intImage = Math.round( intAngle  / intAngleArea );
		
		var objImage;
		switch( intImage )
		{
			case 0:
			case 8:
			{
				objImage = objVehicle.objVehicleImage.objImageTop;
				break;
			}
			case 1:
			{
				objImage = objVehicle.objVehicleImage.objImageTopRight;
				break;
			}
			case 2:
			{
				objImage = objVehicle.objVehicleImage.objImageRight;
				break;
			}
			case 3:
			{
				objImage = objVehicle.objVehicleImage.objImageBottomRight;
				break;
			}
			case 4:
			{
				objImage = objVehicle.objVehicleImage.objImageBottom;
				break;
			}
			case 5:
			{
				objImage = objVehicle.objVehicleImage.objImageBottomLeft;
				break;
			}
			case 6:
			{
				objImage = objVehicle.objVehicleImage.objImageLeft;
				break;
			}
			case 7:
			{
				objImage = objVehicle.objVehicleImage.objImageTopLeft;
				break;
			}
			default:
			{
				throw new Error( "Invalid Angle " + intAngle );
			}
		}
		
		objCanvas.drawImage( objImage , -16 , -16 );
		objCanvas.restore();		
	}

	/**
	 * Init the object loading the attributes as ids and values. 
	 * Just call this method after set all the config attributes
	 */
	this.init = function()
	{
		this.objMap = new GMap2( document.getElementById( this.strIdMap ) );
		this.objMap.addControl( new GMapTypeControl() );
		this.objMap.setCenter( new GLatLng(0,0) , 2 );
		this.loadVehicles();
	}

	/**
	 * Run the animation
	 */
	this.run = function()
	{
		if( !this.booReady )
		{
			setTimeout( this.run.bind(this) , this.intIntervalTimer );			
		}
		else
		{

			var objBounds = new google.maps.LatLngBounds();
			for( var intVehicle = 0; intVehicle < this.arrVehicles.length; intVehicle++ )
			{
				var objVehicle = this.arrVehicles[ intVehicle ];
				var objCurrentPoint = objVehicle.getCurrentPoint();
				objBounds.extend( objCurrentPoint );
			}

			this.objMap.setCenter( objBounds.getCenter() );
			this.dblZoom = this.objMap.getBoundsZoomLevel(objBounds);
			this.objMap.setZoom( this.dblZoom );

			document.getElementById("controls").style.display = "none";
			setTimeout( this.draw.bind(this) , this.intIntervalTimer );		
		}
	}

	this.length = function()
	{
		var intLength = 0;
		for( var intVehicle = 0; intVehicle < this.arrVehicles.length; intVehicle++ )
		{
			var objVehicle = this.arrVehicles[ intVehicle ];
			if( objVehicle.booMap && objVehicle.booReady )
			{
				intLength++;
			}
		}
		return intLength;
	}

	this.getCountNotReady = function()
	{
		var intLength = 0;
		for( var intVehicle = 0; intVehicle < this.arrVehicles.length; intVehicle++ )
		{
			var objVehicle = this.arrVehicles[ intVehicle ];
			if( !objVehicle.booReady )
			{
				intLength++;
			}
		}
		return intLength;
	}
}

function VehicleImage()
{
	/**
	 * Image Src
	 */
	this.strPathImages = "./images/";

	/**
	 * Html Image Going To Top
	 *
	 * @Image
	 */
	this.objImageTop;

	/**
	 * Html Image Going To Bottom
	 *
	 * @Image
	 */
	this.objImageBottom;

	/**
	 * Html Image Going To Left
	 *
	 * @Image
	 */
	this.objImageLeft;

	/**
	 * Html Image Going To Right
	 *
	 * @Image
	 */
	this.objImageRight;

	/**
	 * Html Image Going To Bottom Left
	 *
	 * @Image
	 */
	this.objImageBottomLeft;

	/**
	 * Html Image Going To Bottom Right
	 *
	 * @Image
	 */
	this.objImageBottomRight;

	/**
	 * Html Image Going To Bottom Left
	 *
	 * @Image
	 */
	this.objImageBottomLeft;

	/**
	 * Html Image Going To Bottom Right
	 *
	 * @Image
	 */
	this.objImageBottomRight;


	this.loadSimple = function( strImage )
	{
		var objImage = new Image();
		objImage.src = strImage;
		objImage.width = "32px";
		objImage.height = "32px";

		this.objImageTop		= objImage;
		this.objImageBottom		= objImage;
		this.objImageLeft		= objImage;
		this.objImageRight		= objImage;

		this.objImageTopLeft		= objImage;
		this.objImageTopRight		= objImage;
		this.objImageBottomLeft		= objImage;
		this.objImageBottomRight	= objImage;
	}

	this.loadComplete = function()
	{
		this.objImageTop = new Image();
          	this.objImageTop.src = this.strPathImages + "top.png";
		this.objImageTop.width = "32px";
		this.objImageTop.height = "32px";

		this.objImageBottom = new Image();
          	this.objImageBottom.src = this.strPathImages + "bottom.png";
		this.objImageBottom.width = "32px";
		this.objImageBottom.height = "32px";

		this.objImageLeft = new Image();
          	this.objImageLeft.src = this.strPathImages + "left.png";
		this.objImageLeft.width = "32px";
		this.objImageLeft.height = "32px";

		this.objImageRight = new Image();
          	this.objImageRight.src = this.strPathImages + "right.png";
		this.objImageRight.width = "32px";
		this.objImageRight.height = "32px";

		this.objImageTopLeft = new Image();
          	this.objImageTopLeft.src = this.strPathImages + "top_left.png";
		this.objImageTopLeft.width = "32px";
		this.objImageTopLeft.height = "32px";

		this.objImageTopRight = new Image();
          	this.objImageTopRight.src = this.strPathImages + "top_right.png";
		this.objImageTopRight.width = "32px";
		this.objImageTopRight.height = "32px";

		this.objImageBottomLeft = new Image();
          	this.objImageBottomLeft.src = this.strPathImages + "bottom_left.png";
		this.objImageBottomLeft.width = "32px";
		this.objImageBottomLeft.height = "32px";

		this.objImageBottomRight = new Image();
          	this.objImageBottomRight.src = this.strPathImages + "bottom_right.png";
		this.objImageBottomRight.width = "32px";
		this.objImageBottomRight.height = "32px";
	}
}

/**
 * Class Vehicle
 * @author Thiago Henrique Ramos da Mata <thiago.henrique.mata@gmail.com>
 * @date 2012-02-10
 */
function Vehicle()
{
	/**
	 * Flag to control if the init process is done
	 */
	this.booReady = false;

	/**
	 * Flag to control if the element is already loaded on map
	 */
	this.booMap = false;

	/**
	 * Vehicle unique id
	 */
	this.id;

	/**
	 * Each Vehicle has it's own canvas
	 */
	this.strCanvasId;


	this.strType = "car";

	this.arrTypes = [ "car" , "plane" ];

	/**
	 * Last visited vertex
	 * @var integer
	 */
	this.intLastVertex = 0;

	/**
	 * Google Maps Directions Object
	 * @GDirections
	 */
      	this.objDirection = new GDirections();

	/**
	 * Position of Start of Travel
	 */
	this.strFrom = "";

	/**
	 * Position of End of Travel
	 */
	this.strTo = "";

	/**
	 * Places what should be passed by in the travel
	 */	
	this.arrMidlePoint = new Array();

	/**
	 * Step into the travel metres
	 * @var integer
	 */
	this.intStep = 0;

	/**
	 * PolyLine of walk of travel
	 * @GPolyline
	 */
	this.objPoly = null;
	
	/**
	 *
	 * Polyline of current drawing line
	 * @GPolyline
	 */
	this.objDrawLinePoly = null;

	/**
	 * Line Distance. End of Line position
	 * @var integer
	 */
	this.intEndOfLine = 0;

	/**
	 * Icon of element
	 *
	 * @GIcon
	 */
	this.objIcon;

	this.objVehicleImage;

	/**
	 * HTML Id of element what should receive the html description of the current step
	 * @var string
	 */
	this.strStepDescriptionId = "step";

	/**
	 * Boolean flag what controls the step description
	 * @var bool
	 */
	this.booDescribetStep = false;

	/**
	 * Speed of element in Km/h
	 */
	this.intSpeed = 0;

	/**
	 * HTML Id of element what should receive the html description of the current speed
	 * @var string
	 */
	this.strSpeedDescriptionId = "speed";

	/**
	 * Boolean flag what controls the speed description
	 * @var bool
	 */
	this.booDescribetSpeed = false;

	/**
	 * Distance already traveled
	 */
	this.intDistance = 1;

	/**
	 * Distance from the last point in draw line
	 */
	this.intDistanceDrawLine = 0;

	/**
	 * Draw Start Marker
	 * @var bool
	 */
	this.booDrawStartMarker = true;

	/**
	 * Draw End Marker
	 * @var bool
	 */
	this.booDrawEndMarker = true;

	/**
	 * Draw Middle Marker
	 * @var bool
	 */
	this.booDrawMiddleMarker = true;

        /**
         * Draw Line of Path on the car run
	 * @var bool
         */
        this.booDrawLineOnRun = false;
        
        /**
         * Draw Line of Full Path
	 * @var bool
         */
        this.booDrawFullPath = false;
        
	/**
	 * Element Marker 
	 *
	 * @var GMarker / ELabel
	 */
	this.objMarker = null;

        /**
         * Opacity of css canvas 
         * @var integer
         */
        this.intOpacity = 100;
        
	this.getStartMarker = function()
	{
		if( this.strType == "car" )
		{
			return this.objPoly.getVertex(0);
		}
		if( this.strType == "plane" )
		{
			return this.objFlightPlan.objFrom;
		}
	}

	/**
	 * Add into the Origin, the Start Marker into Map
	 * @param GMap2
	 */
	this.addStartMarker = function( objMap )
	{
		if( this.booDrawStartMarker )
		{
			objMap.addOverlay( new GMarker(this.getStartMarker(),G_START_ICON) );
		}
	}

	this.getEndMarker = function()
	{
		if( this.strType == "car" )
		{
			return this.objPoly.getVertex( this.objPoly.getVertexCount() - 1 );
		}
		if( this.strType == "plane" )
		{
			return this.objFlightPlan.objTo;
		}
	}

	/**
	 * Add into the Destiny, the End Marker into Map
	 * @param GMap2
	 */
	this.addEndMarker = function( objMap )
	{
                console.log( "add end marker" );
		if( this.booDrawEndMarker )
		{
			objMap.addOverlay( new GMarker(this.getEndMarker() , G_END_ICON ) );
		}
	}

	/**
	 * Add into some Middle Marker, the Checkpoint marker into Map
	 * @param GMap2
	 */
	this.addMiddleMarker = function( objMap , intVertex )
	{
		if( this.booDrawMiddleMarker )
		{
			new GMarker(this.objPoly.getVertex( intVertex ) , G_PAUSE_ICON  );
		}
	}

	/**
	 * Add the start and the end marker into the map
	 * @param GMap2
	 */
	this.addStartEndMarker = function( objMap )
	{
		this.addStartMarker( objMap );
		this.addEndMarker( objMap );
	}

	/**
	 * Add the start marker, all the checkpoints markers and the end marker into the map
	 * @param GMap2
	 */
	this.addAllMarkers = function( objMap )
	{
                intLastMarker = this.objPoly.getVertexCount();
		for( var intMarker = 0; intMarker <= intLastMarker ; intMarker++ )
		{
			switch( intMarker )
			{
				case 0:
				{
					this.addStartMarker( objMap );
					break;
				}
				case intLastMarker:
				{
					this.addEndMarker( objMap );
					break;
				}
				default:
				{
					this.addMiddleMarker( objMap , intMarker );
					break;
				}
			}
		}
	}

	/**
	 * Init the GIcon
	 */
	this.initIcon = function()
	{
		this.objIcon = new Image();
		this.objIcon.image = this.src;
		this.objIcon.iconSize = new GSize(32,18);
		this.objIcon.iconAnchor = new GPoint(16,9);
	}

	/**
	 * Describe the current step of the travel
	 */
	this.onNextStep = function()
	{
		if( ! this.booDescribetStep )
		{
			return;
		}
		var strSteptext = objVehicle.objDirection.getRoute(0).getCurrentStep( objVehicle.objDirection.stepnum ).getDescriptionHtml();
		document.getElementById( this.strStepDescriptionId ).innerHTML = "<b>Next:<\/b> "+ strSteptext;
	}

	/**
	 * Update the travel report about this Vehicle
	 */
	this.setSpeed = function ( intStepSpeed )
	{
		this.intSpeed = intStepSpeed;
		if( ! this.booDescribetSpeed )
		{
			return;
		}
		var strSpeedText = "<br />Current speed: " + stepspeed +" mph";
	}

	/**
	 * Get the current step
	 * @return integer
	 */
	this.getLastStep = function()
	{
		return this.objDirection.getRoute( 0 ).getStep( this.objDirection.stepnum - 1 );
	}

	/**
	 * Get the last step
	 */
	this.getCurrentStep = function()
	{
		return this.objDirection.getRoute(0).getStep( this.objDirection.stepnum );
	}

	/**
	 * Inform last step
	 */
	this.arrive = function()
	{
		if( ! this.booDescribetStep )
		{
			return;
		}
		document.getElementById( this.strStepDescriptionId ).innerHTML = "<b>Next: Arrive at your destination<\/b>";
	}

	/**
	 * Return the canvas contexts of this Vehicle
	 */
	this.getCanvasContext = function()
	{
		return document.getElementById( this.strCanvasId ).getContext( '2d' );
	}

	/**
	 * On google maps load the car
	 * Init the Gmaps entities
	 */
	this.onLoadCar = function()
	{
		this.objPoly = this.objDirection.getPolyline();
		this.objDrawLinePoly = new GPolyline( this.objPoly.getVertex(0) );
		this.intEndOfLine = this.objPoly.Distance();
		this.booReady = true;
		this.objDirection.stepnum = 0;
	}

	/**
	 * Receive the error message fro the google maps and create a exception
	 */
	this.onError = function()
	{
		switch( this.objDirection.getStatus() )
		{
			case G_GEO_TOO_MANY_QUERIES:
			{
				throw new Error( "To many queries. Don't be so greedy!" );
			}
			case G_GEO_UNKNOWN_DIRECTIONS:
			{
				throw new Error( "Are you kidding me? This directions are unknow." );
			}			
			case G_GEO_UNAVAILABLE_ADDRESS:
			{
				throw new Error( "The owner of this place don't want to be found." );
			}
			case G_GEO_UNKNOWN_ADDRESS:
			{
				throw new Error( "This place this don't exists. Sorry." );
			}		
			case G_GEO_MISSING_ADDRESS:
			{
				throw new Error( "The address is missing. Sorry" );
			}
			case G_GEO_SERVER_ERROR:
			{
				throw new Error( "Server error. But Who knows why? Neither." );
			}
			case G_GEO_BAD_REQUEST:
			{
				throw new Error( "Server error. Bad Request." );
			}
			case G_GEO_BAD_REQUEST:
			{
				throw new Error( "Server error. Bad Request." );
			}
			default:
			{
				throw new Error( "Something bad happened. This things happens, even with good people." );
			}
		}
	}
	/**
	 * Init the checkpoints of the travel
	 */
	this.initCheckPoints = function()
	{
		switch( this.strType )
		{
			case "car":
			{
				
			      	this.objDirection = new GDirections();
				this.objDirection.loadFromWaypoints(
					[ this.strFrom , this.strTo ],
					{getPolyline:true,getSteps:true}
				);
				GEvent.addListener( this.objDirection ,
					"load", this.onLoadCar.bind(this)
				);
				GEvent.addListener( this.objDirection ,
					"error", this.onError.bind(this)
				);
				break;
			}
			case "plane":
			{
				this.objFlightPlan = new FlightPlan( this );
				this.objFlightPlan.init();
				break;
			}
			default:
			{
				throw new Error( "Unknow vehicle type " + this.strType );
			}
		}
	}

	/**
	 * Init the object loading the attributes as ids and values. 
	 * Just call this method after set all the config attributes
	 */
	this.init = function( fncAfterInit )
	{
		this.initIcon();
		this.initCheckPoints();
	}

	/**
	 * Get the current point
	 */
	this.getCurrentPoint = function()
	{
		if( this.booReady == false || this.booMap == false )
		{
			throw new Error( "casa caiu" );
		}
		if( this.strType == "car" )
		{
			return this.objPoly.GetPointAtDistance( this.intDistance );
		}
		if( this.strType == "plane" )
		{
			return this.objFlightPlan.objCurrentVertex;
		}
	}

	/**
	 * On trip complete
	 */
	this.onTripComplete = function()
	{
		if( this.intOpacity > 0.1 )
		{
                    this.intOpacity /= 2;
                    document.getElementById( this.strCanvasId ).style.opacity = 
                        ( this.intOpacity / 100 );
                    setTimeout( this.onTripComplete.bind(this) , 30 );
		}
		else
		{
                    this.intOpacity = 0;
                    var objCanvas = document.getElementById( this.strCanvasId );
                    if( objCanvas )
                    {
                        objCanvas.parentNode.removeChild( objCanvas );
                    }
                    this.booMap = false;
                    this.booReady = false;
		}
	}
}

/**
 * In this model Planes no need of streets. 
 * They just fly in the line.
 */
function FlightPlan( objPlane )
{
	this.objPlane = objPlane;

	this.strFrom;

	this.objFrom = null;

	this.booWaitingFrom = true;

	this.objTo = null;

	this.booWaitingTo = true;

	this.objGeoCoder = new GClientGeocoder();

	this.objLastVertex;

	this.objCurrentVertex;

	this.intTravelSecondsTime = 0;

	this.arrPath;

	this.intInitialTime;

	this.move = function( intSecondsTime )
	{
		this.intTravelSecondsTime += intSecondsTime;
		this.objPlane.intDistance = ( ( this.objPlane.intSpeed * this.intTravelSecondsTime ) / ( 60 * 60 ) );
		if( this.objPlane.intDistance > this.objPlane.intEndOfLine )
		{
			this.objPlane.intDistance = this.objPlane.intEndOfLine;
		}
		this.objCurrentVertex = this.objPlane.objPoly.GetPointAtDistance( this.objPlane.intDistance );
		
	}

	this.loadFrom = function( objFrom )
	{
		if( ! objFrom )
		{
                    if( typeof this.objPlane.strFrom == "object" )
                    {
                            objFrom = this.objPlane.strFrom;
                    }
                    else
                    {
			throw new Error( this.objPlane.strFrom + " not found" );
                    }
		}
		this.objFrom = objFrom;
		this.booWaitingFrom = false;
	}

	this.loadTo = function( objTo )
	{
		if( ! objTo )
		{
                    if( typeof this.objPlane.strTo  == "object")
                    {
                            objTo  = this.objPlane.strTo ;
                    }
                    else
                    {
			throw new Error( this.objPlane.strTo + " not found" );
                    }
		}
		this.objTo = objTo;
		this.booWaitingTo = false;
	}

	this.initFrom = function()
	{
		if( this.objFrom != null )
		{
			return this.objFrom;
		}

		this.booWaitingFrom = true;
		this.objGeoCoder.getLatLng(
			this.objPlane.strFrom ,
			this.loadFrom.bind( this )
		);
	}

	this.initTo = function()
	{
		if( this.objTo != null )
		{
			return this.objTo;
		}

		this.booWaitingTo = true;
		this.objGeoCoder.getLatLng(
			this.objPlane.strTo ,
			this.loadTo.bind( this )
		);
	}

	this.initSteps = function()
	{
		if( this.booWaitingTo == true || this.booWaitingFrom == true )
		{
			setTimeout( this.initSteps.bind(this) , 10 );
			return;
		}

		if( this.objFrom == null || this.objTo == null )
		{
			throw new Error( "Impossible init steps without the markers from and to" );
		}

		this.objPlane.intEndOfLine = this.objFrom.distanceFrom( this.objTo );

		if( this.objPlane.intEndOfLine == 0 )
		{
			return;
		}


		this.objCurrentVertex = this.objFrom;
		this.objLastVertex = this.objFrom;

		this.objPlane.objPoly = new GPolyline(
			[ this.objFrom , this.objTo ]
		);

                if( this.objPlane.booDrawLineOnRun )
                {
                    this.objPlane.objDrawLinePoly = new GPolyline(
                            [ this.objFrom ]
                    );
                }
                
		this.objPlane.booReady = true;

		this.objPlane.intSpeed = 300;
	}

	this.init = function()
	{
		this.initFrom();
		this.initTo();
		this.initSteps();
	}
}

function test( intQtdCars, intQtdPlanes , booDrawMarkes , booDrawFullPath )
{
	window.objCarImage = new VehicleImage();
	window.objCarImage.loadComplete();

	window.objPlaneImage = new VehicleImage();
	window.objPlaneImage.loadSimple( "plane" );

	var objAnimation = new Animation();
	objAnimation.init();
	objAnimation.objMap.setCenter(new GLatLng(40.891261,-74.558287), 15);
	objAnimation.intFastFoward = 30;

	var bounds = objAnimation.objMap.getBounds();
	window.southWest = bounds.getSouthWest();
	window.northEast = bounds.getNorthEast();
	window.lngSpan = northEast.lng() - southWest.lng();
	window.latSpan = northEast.lat() - southWest.lat();
	window.objAnimation = objAnimation;
	window.intQtdCars = intQtdCars;
	window.intQtdPlanes = intQtdPlanes;
	window.intQtdVehicles = intQtdPlanes + intQtdCars;
        window.booDrawFullPath = booDrawFullPath;
        window.booDrawMarkes = booDrawMarkes;
	loadVehicles();
}

function loadVehicles()
{
	/**
	 * Google maps restrict the number of request by second. This is a workaround to allow us 
	 * to create a animation with many more cars.. 
	 */
	var intMaxSimultaneosCar = 2;
	for( intCount = 0; intCount < intMaxSimultaneosCar && ( window.objAnimation.arrVehicles.length < window.intQtdVehicles ) ; intCount++ )
	{
		var pointFrom = new GLatLng(
			window.southWest.lat() + window.latSpan * Math.random() * 10,
			window.southWest.lng() + window.lngSpan * Math.random() * 10
		);

		var pointTo = new GLatLng(
			window.southWest.lat() + window.latSpan * Math.random() * 10,
			window.southWest.lng() + window.lngSpan * Math.random() * 10
		);

		if( window.objAnimation.arrVehicles.length < window.intQtdCars  )
		{
			var objCar = new Vehicle();
			objCar.strType = "car";
			objCar.strFrom = pointFrom;
			objCar.strTo = pointTo;
			objCar.objVehicleImage = window.objCarImage;
			objCar.init();
			objCar.booDrawStartMarker = window.booDrawMarkes;
			objCar.booDrawEndMarker = window.booDrawMarkes;
			objCar.booDrawMiddleMarker = false;
			objCar.booDrawLineOnRun = false;
                        objCar.booDrawFullPath = window.booDrawFullPath;
			window.objAnimation.addVehicle( objCar );
		}
		else
		{
			var objPlane = new Vehicle();
			objPlane.strType = "plane";
			objPlane.strFrom = pointFrom;
			objPlane.strTo = pointTo;
			objPlane.objVehicleImage = window.objPlaneImage;
			objPlane.init();
			objPlane.booDrawStartMarker = window.booDrawMarkes;
			objPlane.booDrawEndMarker = window.booDrawMarkes;
			objPlane.booDrawMiddleMarker = false;
			objPlane.booDrawLineOnRun = false;
                        objPlane.booDrawFullPath = window.booDrawFullPath;
			window.objAnimation.addVehicle( objPlane );
		}

	}
	if( window.objAnimation.arrVehicles.length < ( window.intQtdVehicles ) )
	{
                window.objAnimation.drawLoadingProgress( Math.round( 100 * window.objAnimation.arrVehicles.length / ( window.intQtdVehicles ) ) );
		setTimeout( "loadVehicles()" , 500 );		
	}
	else
	{
                window.objAnimation.drawLoadingProgress( 100 );
		setTimeout( "waitToBeReady()" , 500 );		
	}
}

function waitToBeReady()
{
	var intLength = window.objAnimation.length();
	if(
		( window.objAnimation.booReady == false )
		||
		( intLength != window.intQtdVehicles )
	)
	{
                window.objAnimation.drawMountingProgress( Math.round( 100 * intLength / window.intQtdVehicles ) );
		setTimeout( "waitToBeReady()" , 500 );		
	}
	else
	{
                window.objAnimation.drawMountingProgress( 100 );
		console.log( "it is time to start!");
		window.objAnimation.run();
	}
}
