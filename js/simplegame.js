var _debug = undefined; // if true, game will read mouse input and draw some extra stuff
var makeGame = function() {
	var server = makeServerState();
	var engine = makeEngine(document.getElementById("example"));
	engine.start();
	var calibrator = undefined;
	var maxTime = 50*1000;
	var score = 0;
	var mousehit = [];
	var debugAmmo = 1;
	var finished = false;
	
	// feature: if clicking game over screen, the game will restart. No recalibration neccesary.
	$("#example").mousedown(function(e){
		if( finished )
		{
			finished=false;
			engine.resume();
			reset();
		}
	});
	if( _debug )
	{
		// if debug, replace server coordinates with mouse coordinates.
		$("#example").mousedown(function(e){
			debugAmmo -= 0.03;
			var x = e.pageX - this.offsetLeft;
			var y = e.pageY - this.offsetTop;
			mousehit = [{x:x,y:y}];
		//	engine.resume();
		});
		$("#example").mouseup(function(){
			mousehit=[];
		});
	}

	// callback for when game ends (ie, when time or ammo runs out)
	var finishedCallback = function() {
		engine.clear(); // clear all drawables from engine
		engine.add( ending( score ) ); // add the ending screen drawable to engine
		engine.pause(); // since the ending screen doesnt change, we can also pause
		finished=true; // flag that mouse-click should restart
	};

// callback for when game starts, this is the MAIN GAME FUNCTION
	var start = function() {
		var drawables = []; // keep track of all the enemies on screen.
		var viewport = makeView(); // The enemies are drawn onto a 2d plane based on 3d coordinates
		var startTime = new Date().getTime();
		
		// add the 2d gui stuff directly to engine	
		engine.add( bar( "Ammo", {x:50,y:30},{x:30,y:200},"green",function(){
				if( _debug )
					return debugAmmo;
			return server.getAmmo()/server.getMaxAmmo();}
		) );
		engine.add( bar( "Time", {x:90,y:30},{x:30,y:200},"blue",function(){
			var timeTaken = new Date().getTime() - startTime ;
			var timeRemaining = maxTime - timeTaken;
			if( timeRemaining < 0 )
				finishedCallback();
			return timeRemaining / maxTime;
		}));
		var lastmark = 0;

		// this is for sorting the list of enemies
		// we want stuff farther away from viewport to be draw first
		// otherwise they will be on top of things closer to the camera, and that is b0rk
		var sortFunction = function(a,b){
			var v1 = b.pos().abs();
			var v2 = a.pos().abs();
			return v1 - v2;
		};

		// this callback controls if a current position and size contains a server coordinate 'hit'
		// ie. is an enemy currently 'shot' by a laser?
		// this will probably have to be changed so that enemies behind other enemies dont register as 'hit'
		var hitCheck = function( x, y, s )
		{
			var hitcoords = _debug ? mousehit : calibrator.getAll(); // gets all transformed screen coordinates
			for( var i in hitcoords )
			{
				var dx = hitcoords[i].x - x;
				var dy = hitcoords[i].y - y;
				var dist = Math.sqrt( dx*dx + dy*dy );
				if( dist < s )
					return true;
			}
			return false;
		};

		// function that 'ticks' every enemy, sorts our makeshift z-buffer and then draws enemies
		var enemies = function( context, width, height, mark, keys ) {
			for( var d in drawables )
				drawables[d].tick( keys, mark, (mark - lastmark) ); // this moves enemy position and maybe velocity
			drawables.sort( sortFunction ); // this sorts the drawables array based on how close to the camera enemies are
			for( var d2 in drawables )
				viewport.draw( context, width,height, drawables[d2], mark ); // and then use the viewport to draw every enemy
			lastmark = mark;
		};
		
		// initialize 10 enemies and add them to the draw-buffer
		for( var i = 0; i < 10; i++ )
		{
			drawables.push( enemy( function(){score++;}, hitCheck ) );
		}

		// add the enemy draw function to the engine
		engine.add( {draw:enemies,id:"aoeu"} );
	};

// When resetting game
	var reset = function() {
		engine.clear(); // clear drawables
		server.reload(); // reload ammo (not currently used)
		start(); // start game
	};

	return {
		// called from html, game must start with recalibration sequence the first time
		recalibrate: function() {
			engine.clear();
			
			// create calibration sequence
			var c = calibrateAction( server.getState, _X, function( id, c ) {
				//This callback will be called when calibration is done
				calibrator = c; // update the calibrator object
				reset(); // start the game
			});
			// and add it to engine
			engine.add( c );
		},
		
		// just in case
		reset: reset
	}
};
