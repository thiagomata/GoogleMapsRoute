// ELabel.js
// Migrated to Google Maps API v3
//
//   Original by Mike Williams
//   Community Church Javascript Team
//   http://www.bisphamchurch.org.uk/
//   http://econym.org.uk/gmap/
//   Creative Commons Licence: http://creativecommons.org/licenses/by/2.0/uk/
//
// Version 1.9      Migrated from GOverlay to google.maps.OverlayView
// version 1.8      remove the old GMarkerManager support due to clashes with v2.143
// version 1.7      fix .supportsHide()
// version 1.6      added .supportsHide()
// version 1.5      fix positioning bug while label is hidden
// version 1.4      permit .hide and .show to be used before addOverlay()
// version 1.3      add .isHidden()
// version 1.2      Works with GMarkerManager in v2.72, v2.73, v2.74 and v2.75
// version 1.1      Works with GMarkerManager in v2.67, v2.68, v2.69, v2.70 and v2.71
// version 1.0      added .show() .hide() .setContents() .setPoint() .setOpacity() .overlap
// version 0.2      the .copy() parameters were wrong


function ELabel( point, html, classname, pixelOffset, percentOpacity, overlap ) {
	// Mandatory parameters
	this.point = point;
	this.html = html;

	// Optional parameters
	this.classname = classname || "";
	this.pixelOffset = pixelOffset || new google.maps.Size( 0, 0 );
	if ( percentOpacity ) {
		if ( percentOpacity < 0 ) { percentOpacity = 0; }
		if ( percentOpacity > 100 ) { percentOpacity = 100; }
	}
	this.percentOpacity = percentOpacity;
	this.overlap = overlap || false;
	this.hidden = false;
	this.div = null;
	this.map = null;
}

// Extend google.maps.OverlayView
ELabel.prototype = new google.maps.OverlayView();

ELabel.prototype.onAdd = function() {
	var div = document.createElement( "div" );
	div.style.position = "absolute";
	div.style.border = "none";
	div.style.borderWidth = "0px";
	div.innerHTML = '<div class="' + this.classname + '">' + this.html + '</div>';

	var panes = this.getPanes();
	panes.overlayLayer.appendChild( div );

	this.div = div;

	if ( this.percentOpacity ) {
		div.style.opacity = this.percentOpacity / 100;
	}

	if ( this.overlap ) {
		var z = google.maps.OverlayView.getPanes().zIndex;
		// Use lat-based z-index like v2 did
		div.style.zIndex = Math.round( this.point.lat() * 100000 );
	}

	if ( this.hidden ) {
		this.hide();
	}
};

ELabel.prototype.draw = function() {
	var projection = this.getProjection();
	if ( !projection ) return;

	var p = projection.fromLatLngToDivPixel( this.point );
	if ( !p ) return;

	var h = this.div.clientHeight;
	this.div.style.left = ( p.x + this.pixelOffset.width ) + "px";
	this.div.style.top = ( p.y + this.pixelOffset.height - h ) + "px";
};

ELabel.prototype.onRemove = function() {
	if ( this.div ) {
		this.div.parentNode.removeChild( this.div );
		this.div = null;
	}
};

ELabel.prototype.remove = function() {
	// Compatibility alias for v2 API
	if ( this.getMap() ) {
		this.setMap( null );
	}
};

ELabel.prototype.copy = function() {
	return new ELabel( this.point, this.html, this.classname, this.pixelOffset, this.percentOpacity, this.overlap );
};

ELabel.prototype.redraw = function( force ) {
	if ( force ) {
		this.draw();
	}
};

ELabel.prototype.show = function() {
	if ( this.div ) {
		this.div.style.display = "";
		this.redraw( true );
	}
	this.hidden = false;
};

ELabel.prototype.hide = function() {
	if ( this.div ) {
		this.div.style.display = "none";
	}
	this.hidden = true;
};

ELabel.prototype.isHidden = function() {
	return this.hidden;
};

ELabel.prototype.supportsHide = function() {
	return true;
};

ELabel.prototype.setContents = function( html ) {
	this.html = html;
	if ( this.div ) {
		this.div.innerHTML = '<div class="' + this.classname + '">' + this.html + '</div>';
		this.redraw( true );
	}
};

ELabel.prototype.setPoint = function( point ) {
	this.point = point;
	if ( this.overlap ) {
		this.div.style.zIndex = Math.round( point.lat() * 100000 );
	}
	this.redraw( true );
};

ELabel.prototype.setOpacity = function( percentOpacity ) {
	if ( percentOpacity ) {
		if ( percentOpacity < 0 ) { percentOpacity = 0; }
		if ( percentOpacity > 100 ) { percentOpacity = 100; }
	}
	this.percentOpacity = percentOpacity;
	if ( this.div && this.percentOpacity !== undefined ) {
		this.div.style.opacity = this.percentOpacity / 100;
	}
};

ELabel.prototype.getPoint = function() {
	return this.point;
};

// Compatibility: support addOverlay/removeOverlay pattern
// so car.js code like objMap.addOverlay( elabel ) works
google.maps.Map.prototype.addOverlay = function( overlay ) {
	overlay.setMap( this );
};

google.maps.Map.prototype.removeOverlay = function( overlay ) {
	overlay.setMap( null );
};
