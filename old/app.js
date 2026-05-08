/**
 * Traveling in Google Maps — Clean v3 Implementation
 */

let settings = {
    map: {
        center: { lat: -33.8688, lng: 151.2093 },
        zoom: 17,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    },
    vehicles: [
        { from: [-33.8688, 151.2093], to: [-33.9000, 151.2000] },  // CBD to Surry Hills
        { from: [-33.8700, 151.2100], to: [-33.8500, 151.2500] },  // CBD to Double Bay
        { from: [-33.8600, 151.2000], to: [-33.8800, 151.1800] },  // CBD to Pyrmont
    ],
    viewport: {
        padding: { top: 150, bottom: 150, left: 150, right: 150 },
        throttleMs: 1000,
        minThrottleMs: 200,
        includeArrivedVehicles: false,
        maxZoom: 15,
        panDurationMs: 2000,
        defaultZoom: 10
    },
    vehicleSpeed: 150,
    debug: {
        showViewportRect: true,
        showTruckBoundsRect: true
    }
};

class Vehicle {
    constructor(map, directionsService, index) {
        this.map = map;
        this.directionsService = directionsService;
        this.index = index;
        this.running = false;
        this.currentDistance = 0;
        this.totalDistance = 0;
        this.path = [];
        this.speed = settings.vehicleSpeed;
        this.lastTimestamp = 0;
        this.travelledPath = [];
        this.travelledPolyline = null;
        this.marker = null;
        this.canvas = document.createElement('canvas');
        this.canvas.width = 64;
        this.canvas.height = 64;
        this.sprites = []; // Array of {angle, img} objects
        this.spriteAngles = [0, 22.5, 45, 67.5, 90, 135, 180, 225, 270, 292.5, 315, 337.5];
        this.topDownSprite = null;
        this.currentSpriteAngle = null;
        this.ready = false;
    }

    async loadSprites() {
        if (this.topDownSprite && this.sprites.length > 0) return;

        // Load top-down sprite for stopped state
        await new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = 'images/trucks/red-middle.png';
            img.onload = () => {
                this.topDownSprite = img;
                resolve();
            };
        });

        // Load sprites into array with angle & image
        const promises = this.spriteAngles.map(angle => {
            return new Promise((resolve) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.src = `images/trucks/red-${angle}.png`;
                img.onload = () => {
                    this.sprites.push({ angle, img });
                    resolve();
                };
            });
        });

        await Promise.all(promises);
    }

    async fetchRoute(origin, destination) {
        const result = await this.directionsService.route({
            origin: origin,
            destination: destination,
            travelMode: google.maps.TravelMode.DRIVING
        });

        if (!result.routes || result.routes.length === 0) {
            throw new Error('No route found');
        }

        // Build path from all step paths
        this.path = [];
        const steps = result.routes[0].legs[0].steps;
        for (const step of steps) {
            for (const point of step.path) {
                this.path.push(point);
            }
        }

        // Calculate total distance
        this.totalDistance = 0;
        for (let i = 1; i < this.path.length; i++) {
            this.totalDistance += google.maps.geometry.spherical.computeDistanceBetween(
                this.path[i - 1],
                this.path[i]
            );
        }

        // Draw the route (full path)
        new google.maps.Polyline({
            path: this.path,
            strokeColor: '#ff0000',
            strokeOpacity: 1.0,
            strokeWeight: 5,
            map: this.map
        });

        // Draw the travelled path (green, grows as car moves)
        this.travelledPolyline = new google.maps.Polyline({
            path: [],
            strokeColor: '#00cc00',
            strokeOpacity: 1.0,
            strokeWeight: 5,
            map: this.map
        });

        // Initialize travelled path with starting point
        this.travelledPath.push(this.path[0]);
        this.travelledPolyline.setPath(this.travelledPath);

        // Load sprites
        await this.loadSprites();

        // Create initial sprite
        this.updateSprite(0);

        // Create marker
        this.marker = new google.maps.Marker({
            map: this.map,
            position: this.path[0],
            icon: {
                url: this.canvas.toDataURL(),
                scaledSize: new google.maps.Size(64, 64),
                anchor: new google.maps.Point(32, 32)
            }
        });

        this.ready = true;
    }

    updateSprite(bearing) {
        // Normalize bearing to 0-360°
        bearing = (bearing + 360) % 360;

        // Find nearest sprite from array
        let nearestEntry = this.sprites[0];
        let minDiff = 360;

        for (const entry of this.sprites) {
            let diff = Math.abs(bearing - entry.angle);
            if (diff > 180) diff = 360 - diff; // Handle angular wrap
            if (diff < minDiff) {
                minDiff = diff;
                nearestEntry = entry;
            }
        }

        // Only update icon if sprite changed
        if (nearestEntry.angle !== this.currentSpriteAngle) {
            this.currentSpriteAngle = nearestEntry.angle;
        }



        if (!nearestEntry || !nearestEntry.img) return;

        const ctx = this.canvas.getContext('2d');
        ctx.clearRect(0, 0, 64, 64);

        // Sprites are pre-oriented - no rotation needed
        ctx.drawImage(nearestEntry.img, 0, 0, 64, 64);

        // Only update icon if sprite changed
        if (nearestEntry.angle !== this.currentSpriteAngle) {
            this.currentSpriteAngle = nearestEntry.angle;
            if (this.marker) {
                this.marker.setIcon({
                    url: this.canvas.toDataURL(),
                    scaledSize: new google.maps.Size(64, 64),
                    anchor: new google.maps.Point(32, 32)
                });
            }
        }
    }

    getPositionAtDistance(distance) {
        if (distance <= 0) return this.path[0];
        if (distance >= this.totalDistance) return this.path[this.path.length - 1];

        let accumulated = 0;
        for (let i = 1; i < this.path.length; i++) {
            const segmentDist = google.maps.geometry.spherical.computeDistanceBetween(
                this.path[i - 1],
                this.path[i]
            );

            if (accumulated + segmentDist >= distance) {
                const fraction = (distance - accumulated) / segmentDist;
                const lat = this.path[i - 1].lat() + (this.path[i].lat() - this.path[i - 1].lat()) * fraction;
                const lng = this.path[i - 1].lng() + (this.path[i].lng() - this.path[i - 1].lng()) * fraction;
                return new google.maps.LatLng(lat, lng);
            }

            accumulated += segmentDist;
        }

        return this.path[this.path.length - 1];
    }

    getBearingAtDistance(distance) {
        const pos = this.getPositionAtDistance(distance);
        const ahead = this.getPositionAtDistance(Math.min(distance + 10, this.totalDistance));
        return google.maps.geometry.spherical.computeHeading(pos, ahead);
    }

    animate(timestamp) {
        if (!this.running) return;

        if (this.lastTimestamp) {
            const delta = (timestamp - this.lastTimestamp) / 1000;
            this.currentDistance += delta * this.speed;

            if (this.currentDistance >= this.totalDistance) {
                this.currentDistance = this.totalDistance;
                this.running = false;
                return;
            }

            const position = this.getPositionAtDistance(this.currentDistance);
            const bearing = this.getBearingAtDistance(this.currentDistance);

            // Add position to travelled path only if moved enough
            const lastPoint = this.travelledPath[this.travelledPath.length - 1];
            const distFromLast = google.maps.geometry.spherical.computeDistanceBetween(lastPoint, position);
            if (distFromLast > 50) {
                this.travelledPath.push(position);
                this.travelledPolyline.setPath(this.travelledPath);
            }

            // Update sprite (only updates icon when sprite changes)
            this.updateSprite(bearing);
            this.marker.setPosition(position);
        }

        this.lastTimestamp = timestamp;
    }

    start() {
        this.running = true;
        this.lastTimestamp = 0;
    }

    stop() {
        this.running = false;
    }
}

class Fleet {
    constructor(map) {
        this.map = map;
        this.directionsService = new google.maps.DirectionsService();
        this.vehicles = [];
        this.running = false;
        // New state for throttling + debug
        this.lastViewportUpdate = 0;
        this.isPanning = false;
        // Zoom cooldown: prevent zoom in immediately after zoom out
        this.lastZoomInTime = 0;
        this.zoomInCooldownMs = 2000;

        // Blue rectangle: Current visible viewport bounds
        this.viewportBoundsRect = new google.maps.Rectangle({
            strokeColor: '#0000ff',
            strokeWeight: 2,
            fillOpacity: 0,
            map: settings.debug.showViewportRect ? this.map : null
        });
        // Update blue rectangle whenever map viewport changes
        if (settings.debug.showViewportRect) {
            this.map.addListener('bounds_changed', () => {
                const currentBounds = this.map.getBounds();
                if (currentBounds) this.viewportBoundsRect.setBounds(currentBounds);
            });
        }

        // Red rectangle: Bounds containing all trucks
        this.truckBoundsRect = new google.maps.Rectangle({
            strokeColor: '#ff0000',
            strokeWeight: 2,
            fillOpacity: 0,
            map: settings.debug.showTruckBoundsRect ? this.map : null
        });
    }

    getTruckCoverageRatio(truckBounds) {
        const viewportBounds = this.map.getBounds();
        if (!viewportBounds) return 0;

        // Calculate lat/lng spans
        const truckLatSpan = Math.abs(truckBounds.getNorthEast().lat() - truckBounds.getSouthWest().lat());
        const truckLngSpan = Math.abs(truckBounds.getNorthEast().lng() - truckBounds.getSouthWest().lng());

        const viewportLatSpan = Math.abs(viewportBounds.getNorthEast().lat() - viewportBounds.getSouthWest().lat());
        const viewportLngSpan = Math.abs(viewportBounds.getNorthEast().lng() - viewportBounds.getSouthWest().lng());

        // Return max ratio to determine if trucks are too small on screen
        const latRatio = truckLatSpan / viewportLatSpan;
        const lngRatio = truckLngSpan / viewportLngSpan;
        return Math.max(latRatio, lngRatio);
    }

    computeZoomFromBounds(bounds) {
        const TILE_SIZE = 256;
        const mapDiv = this.map.getDiv();
        const padding = settings.viewport.padding;
        const mapWidth = mapDiv.offsetWidth - (padding.left + padding.right);
        const mapHeight = mapDiv.offsetHeight - (padding.top + padding.bottom);
        
        const ne = bounds.getNorthEast();
        const sw = bounds.getSouthWest();
        
        const latFraction = (ne.lat() - sw.lat()) / 180;
        const lngDiff = ne.lng() - sw.lng();
        const lngFraction = ((lngDiff < 0) ? lngDiff + 360 : lngDiff) / 360;
        
        const latZoom = Math.floor(Math.log(mapHeight / TILE_SIZE / latFraction) / Math.LN2);
        const lngZoom = Math.floor(Math.log(mapWidth / TILE_SIZE / lngFraction) / Math.LN2);
        
        return Math.min(latZoom, lngZoom, settings.viewport.maxZoom);
    }

    addVehicle(vehicle) {
        this.vehicles.push(vehicle);
    }

    async createCar(lat1, lng1, lat2, lng2) {
        const vehicle = new Vehicle(this.map, this.directionsService, this.vehicles.length);
        const origin = { lat: lat1, lng: lng1 };
        const destination = { lat: lat2, lng: lng2 };

        try {
            await vehicle.fetchRoute(origin, destination);
            this.addVehicle(vehicle);
        } catch (error) {
            console.error('Failed to create car:', error);
        }
    }

    animate(timestamp) {
        if (!this.running) return;

        let anyRunning = false;
        for (const vehicle of this.vehicles) {
            vehicle.animate(timestamp);
            if (vehicle.running) anyRunning = true;
        }

        // 1. Calculate truck-containing bounds and count active vehicles
        const truckBounds = new google.maps.LatLngBounds();
        let activeVehicles = 0;
        let lastPosition = null;

        for (const vehicle of this.vehicles) {
            if (!settings.viewport.includeArrivedVehicles && !vehicle.running && vehicle.currentDistance >= vehicle.totalDistance) {
                continue;
            }
            const pos = vehicle.getPositionAtDistance(vehicle.currentDistance);
            truckBounds.extend(pos);
            lastPosition = pos;
            activeVehicles++;
        }

        // 2. Update red debug rectangle (throttled)
        if (activeVehicles > 1) {
            this.truckBoundsRect.setBounds(truckBounds);
        }

        // 3. Update viewport (throttled)
        const now = timestamp || performance.now();
        if (now - this.lastViewportUpdate > settings.viewport.throttleMs) {
            if (activeVehicles > 0) {
                const currentBounds = this.map.getBounds();
                // Check if any truck is outside viewport (check all 4 corners of truck bounds)
                const trucksOutsideViewport = currentBounds ? 
                    !currentBounds.contains(truckBounds.getSouthWest()) ||
                    !currentBounds.contains(truckBounds.getNorthEast()) ||
                    !currentBounds.contains(new google.maps.LatLng(truckBounds.getSouthWest().lat(), truckBounds.getNorthEast().lng())) ||
                    !currentBounds.contains(new google.maps.LatLng(truckBounds.getNorthEast().lat(), truckBounds.getSouthWest().lng()))
                    : true;
                const coverageRatio = this.getTruckCoverageRatio(truckBounds);
                
                const targetRatio = 0.5; // Target: trucks should be ~50% of screen
                const hysteresis = 0.1; // Don't zoom if within 10% of target
                
                // Determine if viewport update is needed
                const shouldUpdateViewport = trucksOutsideViewport || 
                    (coverageRatio < (targetRatio - hysteresis) && now - this.lastZoomInTime > this.zoomInCooldownMs);

                if (shouldUpdateViewport) {
                    const targetCenter = truckBounds.getCenter();
                    const targetZoom = this.computeZoomFromBounds(truckBounds);
                    
                    // Smooth pan to center
                    this.map.panTo(targetCenter);
                    
                    // Smooth zoom animation
                    const startZoom = this.map.getZoom();
                    const endZoom = Math.min(targetZoom, settings.viewport.maxZoom);
                    const zoomDiff = endZoom - startZoom;
                    
                    if (Math.abs(zoomDiff) > 0.5) {
                        const duration = settings.viewport.panDurationMs;
                        const startTime = performance.now();
                        
                        const animateZoom = (timestamp) => {
                            const elapsed = timestamp - startTime;
                            const progress = Math.min(elapsed / duration, 1);
                            const easedProgress = progress * (2 - progress); // Ease out
                            const currentZoom = startZoom + (zoomDiff * easedProgress);
                            
                            this.map.setZoom(Math.round(currentZoom));
                            
                            if (progress < 1) {
                                requestAnimationFrame(animateZoom);
                            }
                        };
                        
                        requestAnimationFrame(animateZoom);
                    }
                    
                    this.lastZoomInTime = now;
                }
            }

            this.lastViewportUpdate = now;
        }

        if (anyRunning) {
            requestAnimationFrame(this.animate.bind(this));
        } else {
            this.running = false;
            document.getElementById('status').textContent = 'All vehicles arrived!';
            
            // Zoom to show all arrived vehicles
            const allBounds = new google.maps.LatLngBounds();
            for (const vehicle of this.vehicles) {
                allBounds.extend(vehicle.marker.getPosition());
            }
            this.map.fitBounds(allBounds, settings.viewport.padding);
        }
    }

    start() {
        this.running = true;
        for (const vehicle of this.vehicles) {
            vehicle.start();
        }
        requestAnimationFrame(this.animate.bind(this));
    }

    stop() {
        this.running = false;
    }
}

let fleet;

function initMap() {
    const map = new google.maps.Map(document.getElementById('map'), settings.map);
    fleet = new Fleet(map);
}

async function startDemo() {
    if (fleet) {
        fleet.stop();
        // Clear old debug rectangles
        if (fleet.viewportBoundsRect) fleet.viewportBoundsRect.setMap(null);
        if (fleet.truckBoundsRect) fleet.truckBoundsRect.setMap(null);
    }

    const map = new google.maps.Map(document.getElementById('map'), settings.map);
    fleet = new Fleet(map);

    document.getElementById('status').textContent = 'Loading routes...';

    // Load all routes in parallel from settings
    const promises = settings.vehicles.map((r, i) =>
        fleet.createCar(r.from[0], r.from[1], r.to[0], r.to[1])
            .then(() => console.log(`Car ${i + 1} ready`))
    );

    await Promise.all(promises);

    document.getElementById('status').textContent = `${fleet.vehicles.length} cars loaded`;

    // Set initial view to fit all vehicle start positions
    const startBounds = new google.maps.LatLngBounds();
    for (const vehicle of fleet.vehicles) {
        startBounds.extend(vehicle.path[0]);
    }
    map.fitBounds(startBounds);

    fleet.start();
}
