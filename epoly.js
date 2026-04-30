/*********************************************************************\
*                                                                     *
* epolys.js                                          by Mike Williams *
* Migrated to Google Maps API v3                                      *
*                                                                     *
* PolyUtil namespace with standalone geometry functions               *
* Plus prototype adapters on google.maps.Polyline for compatibility   *
*                                                                     *
* PolyUtil.contains(path, point)                                      *
* PolyUtil.area(path)                                                 *
* PolyUtil.distance(path)                                             *
* PolyUtil.bounds(path)                                               *
* PolyUtil.getPointAtDistance(path, metres)                           *
* PolyUtil.getPointsAtDistance(path, metres)                          *
* PolyUtil.getIndexAtDistance(path, metres)                           *
* PolyUtil.bearing(path, v1, v2)                                      *
*                                                                     *
***********************************************************************
*   Original by Mike Williams                                         *
*   Community Church Javascript Team                                  *
*   http://www.bisphamchurch.org.uk/                                  *
*   http://econym.org.uk/gmap/                                        *
*   Creative Commons Licence: http://creativecommons.org/licenses/by/2.0/uk/
\*********************************************************************/

var PolyUtil = {

	// Helper: distance between two LatLng points in metres
	_dist: function( a, b ) {
		return google.maps.geometry.spherical.computeDistanceBetween( a, b );
	},

	// Helper: latitude in radians
	_latRad: function( point ) {
		return point.lat() * Math.PI / 180;
	},

	// Helper: longitude in radians
	_lngRad: function( point ) {
		return point.lng() * Math.PI / 180;
	},

	// Test if a point is inside a polygon
	// Algorithm from http://alienryderflex.com/polygon/
	contains: function( path, point ) {
		var oddNodes = false;
		var j = 0;
		var len = path.getLength();
		var x = point.lng();
		var y = point.lat();
		for ( var i = 0; i < len; i++ ) {
			j++;
			if ( j == len ) { j = 0; }
			var vi = path.getAt( i );
			var vj = path.getAt( j );
			if ( ( ( vi.lat() < y ) && ( vj.lat() >= y ) )
			  || ( ( vj.lat() < y ) && ( vi.lat() >= y ) ) ) {
				if ( vi.lng() + ( y - vi.lat() )
				  /  ( vj.lat() - vi.lat() )
				  *  ( vj.lng() - vi.lng() ) < x ) {
					oddNodes = !oddNodes;
				}
			}
		}
		return oddNodes;
	},

	// Approximate area of a non-intersecting polygon in square metres
	area: function( path ) {
		var a = 0;
		var j = 0;
		var b = this.bounds( path );
		var x0 = b.getSouthWest().lng();
		var y0 = b.getSouthWest().lat();
		var len = path.getLength();
		for ( var i = 0; i < len; i++ ) {
			j++;
			if ( j == len ) { j = 0; }
			var vi = path.getAt( i );
			var vj = path.getAt( j );
			var x1 = this._dist( vi, new google.maps.LatLng( vi.lat(), x0 ) );
			var x2 = this._dist( vj, new google.maps.LatLng( vj.lat(), x0 ) );
			var y1 = this._dist( vi, new google.maps.LatLng( y0, vi.lng() ) );
			var y2 = this._dist( vj, new google.maps.LatLng( y0, vj.lng() ) );
			a += x1 * y2 - x2 * y1;
		}
		return Math.abs( a * 0.5 );
	},

	// Length of a path in metres
	distance: function( path ) {
		var dist = 0;
		var len = path.getLength();
		for ( var i = 1; i < len; i++ ) {
			dist += this._dist( path.getAt( i ), path.getAt( i - 1 ) );
		}
		return dist;
	},

	// LatLngBounds that contains the path
	bounds: function( path ) {
		var bounds = new google.maps.LatLngBounds();
		var len = path.getLength();
		for ( var i = 0; i < len; i++ ) {
			bounds.extend( path.getAt( i ) );
		}
		return bounds;
	},

	// LatLng at a given distance along the path
	// Returns null if the path is shorter than the specified distance
	getPointAtDistance: function( path, metres ) {
		if ( metres == 0 ) return path.getAt( 0 );
		if ( metres < 0 ) return null;

		var dist = 0;
		var olddist = 0;
		var len = path.getLength();
		for ( var i = 1; ( i < len && dist < metres ); i++ ) {
			olddist = dist;
			dist += this._dist( path.getAt( i ), path.getAt( i - 1 ) );
		}
		if ( dist < metres ) { return null; }
		var p1 = path.getAt( i - 2 );
		var p2 = path.getAt( i - 1 );
		var m = ( metres - olddist ) / ( dist - olddist );
		return new google.maps.LatLng(
			p1.lat() + ( p2.lat() - p1.lat() ) * m,
			p1.lng() + ( p2.lng() - p1.lng() ) * m
		);
	},

	// Array of LatLngs at a given interval along the path
	getPointsAtDistance: function( path, metres ) {
		var next = metres;
		var points = [];
		if ( metres <= 0 ) return points;

		var dist = 0;
		var olddist = 0;
		var len = path.getLength();
		for ( var i = 1; i < len; i++ ) {
			olddist = dist;
			dist += this._dist( path.getAt( i ), path.getAt( i - 1 ) );
			while ( dist > next ) {
				var p1 = path.getAt( i - 1 );
				var p2 = path.getAt( i );
				var m = ( next - olddist ) / ( dist - olddist );
				points.push( new google.maps.LatLng(
					p1.lat() + ( p2.lat() - p1.lat() ) * m,
					p1.lng() + ( p2.lng() - p1.lng() ) * m
				));
				next += metres;
			}
		}
		return points;
	},

	// Vertex number at a given distance along the path
	// Returns null if the path is shorter than the specified distance
	getIndexAtDistance: function( path, metres ) {
		if ( metres == 0 ) return 0;
		if ( metres < 0 ) return null;

		var dist = 0;
		var olddist = 0;
		var len = path.getLength();
		for ( var i = 1; ( i < len && dist < metres ); i++ ) {
			olddist = dist;
			dist += this._dist( path.getAt( i ), path.getAt( i - 1 ) );
		}
		if ( dist < metres ) { return null; }
		return i;
	},

	// Bearing between two vertices in degrees (0 to 360)
	bearing: function( path, v1, v2 ) {
		var len = path.getLength();
		if ( v1 == null ) {
			v1 = 0;
			v2 = len - 1;
		} else if ( v2 == null ) {
			v2 = v1 + 1;
		}
		if ( ( v1 < 0 ) || ( v1 >= len ) || ( v2 < 0 ) || ( v2 >= len ) ) {
			return;
		}
		var from = path.getAt( v1 );
		var to = path.getAt( v2 );
		if ( from.equals( to ) ) {
			return 0;
		}
		var lat1 = this._latRad( from );
		var lon1 = this._lngRad( from );
		var lat2 = this._latRad( to );
		var lon2 = this._lngRad( to );
		var angle = - Math.atan2(
			Math.sin( lon1 - lon2 ) * Math.cos( lat2 ),
			Math.cos( lat1 ) * Math.sin( lat2 ) - Math.sin( lat1 ) * Math.cos( lat2 ) * Math.cos( lon1 - lon2 )
		);
		if ( angle < 0.0 ) angle += Math.PI * 2.0;
		angle = angle * 180.0 / Math.PI;
		return parseFloat( angle.toFixed( 1 ) );
	}
};

// Compatibility adapters — attach methods to google.maps.Polyline prototype
// so existing car.js code like objPoly.Distance() continues to work
google.maps.Polyline.prototype.Contains = function( point ) {
	return PolyUtil.contains( this.getPath(), point );
};

google.maps.Polyline.prototype.Area = function() {
	return PolyUtil.area( this.getPath() );
};

google.maps.Polyline.prototype.Distance = function() {
	return PolyUtil.distance( this.getPath() );
};

google.maps.Polyline.prototype.Bounds = function() {
	return PolyUtil.bounds( this.getPath() );
};

google.maps.Polyline.prototype.GetPointAtDistance = function( metres ) {
	return PolyUtil.getPointAtDistance( this.getPath(), metres );
};

google.maps.Polyline.prototype.GetPointsAtDistance = function( metres ) {
	return PolyUtil.getPointsAtDistance( this.getPath(), metres );
};

google.maps.Polyline.prototype.GetIndexAtDistance = function( metres ) {
	return PolyUtil.getIndexAtDistance( this.getPath(), metres );
};

google.maps.Polyline.prototype.Bearing = function( v1, v2 ) {
	return PolyUtil.bearing( this.getPath(), v1, v2 );
};

// Compatibility: v2 getVertex / getVertexCount methods used directly in car.js
google.maps.Polyline.prototype.getVertex = function( index ) {
	return this.getPath().getAt( index );
};

google.maps.Polyline.prototype.getVertexCount = function() {
	return this.getPath().getLength();
};

// Compatibility: insertVertex / deleteVertex used in car.js for draw-line-on-run
google.maps.Polyline.prototype.insertVertex = function( index, vertex ) {
	this.getPath().insertAt( index, vertex );
};

google.maps.Polyline.prototype.deleteVertex = function( index ) {
	this.getPath().removeAt( index );
};
